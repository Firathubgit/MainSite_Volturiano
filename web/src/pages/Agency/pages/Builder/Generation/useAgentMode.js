/**
 * useAgentMode — React hook for the agentic builder
 * 
 * Manages the SSE connection to /api/agent/message, parses tool events,
 * and provides state/actions that plug into the Generation page's chat system.
 */
import { useState, useCallback, useRef } from 'react';

const API_BASE = import.meta.env?.VITE_API_URL || '';
const MUTATING_TOOLS = new Set(['create_file', 'edit_file', 'replace_file', 'delete_file', 'install_component_bundle']);
const FILE_READ_TOOLS = new Set(['read_file']);
const MAX_VISIBLE_RESPONSE_CHARS = 520;

/**
 * @param {object} options
 * @param {string} options.sandboxId
 * @param {string} options.model
 * @param {string} options.projectId
 * @param {Function} options.addChatMessage — callback to add messages to the Generation chat
 * @param {Function} options.authFetch — authenticated fetch wrapper from Generation
 * @param {Function} options.onTurnComplete — called when the agent finishes a turn, receives metadata for persistence
 */
export function useAgentMode({ sandboxId, sandboxUrl, projectId, model, addChatMessage, authFetch, onTurnComplete }) {
  const [agentActive, setAgentActive] = useState(true);
  const [agentLoading, setAgentLoading] = useState(false);
  const [agentProgressText, setAgentProgressText] = useState('');
  const [canUndo, setCanUndo] = useState(false);
  const abortControllerRef = useRef(null);
  
  // Use a ref for the completion callback to avoid stale closures during long-running agent turns
  const onTurnCompleteRef = useRef(onTurnComplete);
  onTurnCompleteRef.current = onTurnComplete;

  /**
   * Send a message through the agentic loop (SSE streamed).
   * Emits chat messages as tool events arrive.
   */
  const sendAgentMessage = useCallback(async (prompt, options = {}) => {
    const images = Array.isArray(options.images) ? options.images : [];
    const promptText = prompt?.trim() || (images.length > 0 ? 'Use the attached image as the reference for this edit.' : '');
    if (!promptText || agentLoading) return;

    setAgentLoading(true);
    setAgentProgressText('Thinking...');

    // Add user message to chat immediately
    addChatMessage(promptText, 'user', {
      images,
      stagedComponents: options.stagedComponents
    });

    try {
      abortControllerRef.current = new AbortController();

      const fetchFn = authFetch || fetch;
      const response = await fetchFn(`${API_BASE}/api/agent/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptText,
          images,
          sandboxId: sandboxId, // Uses the latest reactive id
          projectId,
          model
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errData.error || `Server error ${response.status}`);
      }

      const turnMeta = await consumeAgentEventStream(response.body, {
        addChatMessage,
        setCanUndo,
        setAgentProgressText
      });

      // Trigger persistence pipeline after the turn completes
      if (onTurnCompleteRef.current) {
        onTurnCompleteRef.current({
          hadMutations: turnMeta.hadMutations,
          mutationCount: turnMeta.mutationCount,
          toolCallCount: turnMeta.toolCallCount,
          response: turnMeta.response,
          buildStatus: turnMeta.buildStatus,
          prompt: promptText,
          sandboxId: sandboxId,
          sandboxUrl: sandboxUrl
        });
      }

    } catch (error) {
      if (error.name !== 'AbortError') {
        addChatMessage(`Agent error: ${error.message}`, 'error');
      }
    } finally {
      setAgentLoading(false);
      setAgentProgressText('');
      abortControllerRef.current = null;
    }
  }, [sandboxId, sandboxUrl, projectId, model, addChatMessage, authFetch, agentLoading]);

  /**
   * Undo the last agent turn.
   */
  const undoLastTurn = useCallback(async () => {
    try {
      const fetchFn = authFetch || fetch;
      const res = await fetchFn(`${API_BASE}/api/agent/undo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sandboxId })
      });
      const data = await res.json();
      if (data.success) {
        addChatMessage(`Undone: "${data.undonePrompt}". ${data.restoredFiles.length} files restored.`, 'system');
        setCanUndo(data.canUndo);
        // Trigger turn complete to refresh iframe (no mutations to persist for undo)
        if (onTurnCompleteRef.current) {
          onTurnCompleteRef.current({ hadMutations: false, isUndo: true, sandboxId, sandboxUrl });
        }
      } else {
        addChatMessage(`Undo failed: ${data.error}`, 'error');
      }
    } catch (e) {
      addChatMessage(`Undo failed: ${e.message}`, 'error');
    }
  }, [sandboxId, sandboxUrl, authFetch, addChatMessage]);

  const hydrateAgentSession = useCallback(async (options = {}) => {
    const activeProjectId = options.projectId || projectId;
    const activeSandboxId = options.sandboxId || sandboxId;
    if (!activeProjectId && !activeSandboxId) return null;

    try {
      const fetchFn = authFetch || fetch;
      const params = new URLSearchParams({ hydrate: '1' });
      if (activeProjectId) params.set('projectId', activeProjectId);
      if (activeSandboxId) params.set('sandboxId', activeSandboxId);
      if (options.limit) params.set('limit', String(options.limit));

      const res = await fetchFn(`${API_BASE}/api/agent/session?${params.toString()}`);
      const data = await res.json();
      if (!data.success) return null;
      if (typeof data.canUndo === 'boolean') setCanUndo(data.canUndo);
      return data;
    } catch (error) {
      console.warn('[AgentMode] Session hydration skipped:', error);
      return null;
    }
  }, [projectId, sandboxId, authFetch]);

  /**
   * Send an initial build prompt through the agent-mode pipeline (SSE streamed).
   * This is the alternative to the legacy startGeneration pipeline.
   * Unlike sendAgentMessage, this does NOT add a user chat message — the caller handles that.
   */
  const sendAgentInitialBuild = useCallback(async (prompt, buildId, options = {}) => {
    if (!prompt?.trim() || agentLoading) return;

    setAgentLoading(true);
    setAgentProgressText('Thinking...');

    const activeSandboxId = options.sandboxId || sandboxId;

    try {
      abortControllerRef.current = new AbortController();

      const fetchFn = authFetch || fetch;
      const response = await fetchFn(`${API_BASE}/api/agent/initial-build`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          sandboxId: activeSandboxId,
          projectId: options.projectId || buildId || projectId,
          buildId,
          model,
          initialComponents: options.initialComponents,
          manualSelectionIds: options.manualSelectionIds,
          images: options.images
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errData.error || `Server error ${response.status}`);
      }

      const turnMeta = await consumeAgentEventStream(response.body, {
        addChatMessage,
        setCanUndo,
        setAgentProgressText
      });

      // Trigger persistence pipeline after the build completes
      if (onTurnCompleteRef.current) {
        onTurnCompleteRef.current({
          hadMutations: turnMeta.hadMutations,
          mutationCount: turnMeta.mutationCount,
          toolCallCount: turnMeta.toolCallCount,
          response: turnMeta.response,
          buildStatus: turnMeta.buildStatus,
          prompt: prompt.trim(),
          isInitialBuild: true,
          sandboxId: activeSandboxId,
          sandboxUrl: options.sandboxUrl || sandboxUrl
        });
      }

    } catch (error) {
      if (error.name !== 'AbortError') {
        addChatMessage(`Agent build error: ${error.message}`, 'error');
      }
    } finally {
      setAgentLoading(false);
      setAgentProgressText('');
      abortControllerRef.current = null;
    }
  }, [sandboxId, sandboxUrl, projectId, model, addChatMessage, authFetch, agentLoading]);

  /**
   * Cancel an in-flight agent request.
   */
  const cancelAgent = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setAgentLoading(false);
      setAgentProgressText('');
    }
  }, []);

  return {
    agentActive,
    setAgentActive,
    agentLoading,
    agentProgressText,
    setAgentProgressText,
    canUndo,
    sendAgentMessage,
    sendAgentInitialBuild,
    hydrateAgentSession,
    undoLastTurn,
    cancelAgent
  };
}

// Shared SSE event dispatcher. It keeps UI rendering separate from turn metadata.

export async function consumeAgentEventStream(body, { addChatMessage, setCanUndo = () => {}, setAgentProgressText = () => {} }) {
  if (!body?.getReader) {
    throw new Error('Agent stream is not readable');
  }

  const reader = body.getReader();
  const decoder = new TextDecoder();
  const progressTracker = createAgentProgressTracker({ addChatMessage, setAgentProgressText });
  const turnMeta = {
    hadMutations: false,
    mutationCount: 0,
    toolCallCount: 0,
    response: '',
    visibleResponseShown: false,
    canUndo: false,
    buildStatus: null
  };
  let buffer = '';
  let currentEventType = null;

  const processEvent = (eventType, data) => {
    progressTracker.handle(eventType, data);

    if (eventType === 'tool_result') {
      turnMeta.toolCallCount += 1;
      if (MUTATING_TOOLS.has(data.toolName) && data.success) {
        turnMeta.hadMutations = true;
        turnMeta.mutationCount += 1;
      }
    }

    const eventMeta = handleAgentEvent(eventType, data, addChatMessage, {
      visibleResponseShown: turnMeta.visibleResponseShown,
      response: turnMeta.response
    });

    if (!eventMeta) return;

    if (eventMeta.visibleResponseShown) {
      turnMeta.visibleResponseShown = true;
    }
    if (typeof eventMeta.mutationCount === 'number') {
      turnMeta.mutationCount = eventMeta.mutationCount;
      turnMeta.hadMutations = eventMeta.mutationCount > 0;
    }
    if (typeof eventMeta.toolCallCount === 'number') {
      turnMeta.toolCallCount = eventMeta.toolCallCount;
    }
    if (typeof eventMeta.response === 'string') {
      turnMeta.response = eventMeta.response;
    }
    if (typeof eventMeta.canUndo === 'boolean') {
      turnMeta.canUndo = eventMeta.canUndo;
      setCanUndo(eventMeta.canUndo);
    }
    if (typeof eventMeta.buildStatus === 'string') {
      turnMeta.buildStatus = eventMeta.buildStatus;
    }
  };

  const processLine = (line) => {
    if (line.startsWith('event: ')) {
      currentEventType = line.slice(7).trim();
      return;
    }

    if (line.startsWith('data: ') && currentEventType) {
      try {
        processEvent(currentEventType, JSON.parse(line.slice(6)));
      } catch (e) {
        // Keep streaming even if a single SSE payload is malformed.
      }
      currentEventType = null;
      return;
    }

    if (line.trim() === '') {
      currentEventType = null;
    }
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      processLine(line);
    }
  }

  buffer += decoder.decode();
  if (buffer.trim()) {
    processLine(buffer);
  }

  progressTracker.finish();

  return {
    hadMutations: turnMeta.hadMutations,
    mutationCount: turnMeta.mutationCount,
    toolCallCount: turnMeta.toolCallCount,
    response: turnMeta.response,
    canUndo: turnMeta.canUndo,
    buildStatus: turnMeta.buildStatus
  };
}

function handleAgentEvent(eventType, data, addChatMessage, options = {}) {
  switch (eventType) {
    case 'agent_start':
      return null;

    case 'agent_thinking':
      return null;

    case 'tool_start':
      return null;

    case 'tool_result':
      return null;

    case 'agent_text':
      // Store streamed text, but render the visible final message from agent_done
      // so the summary/undo metadata lands in the same completed turn.
      if (data.text) {
        return { response: data.text };
      }
      return null;

    case 'agent_done': {
      const { response, toolCallCount, mutationCount, canUndo, buildStatus } = data;
      const finalResponse = response || options.response;
      let visibleResponseShown = options.visibleResponseShown;

      if (finalResponse && !visibleResponseShown) {
        addChatMessage(toConciseAgentResponse(finalResponse), 'ai-narrator', {
          style: 'casual',
          isAgentResponse: true,
          toolCallCount: toolCallCount || 0,
          mutationCount: mutationCount || 0,
          buildStatus: buildStatus || null,
          canUndo: Boolean(canUndo)
        });
        visibleResponseShown = true;
      }
      // Return metadata so the hook can pass it to onTurnComplete.
      return { mutationCount, toolCallCount, response: finalResponse || '', canUndo, buildStatus, visibleResponseShown };
    }

    case 'agent_error':
      addChatMessage(`Agent error: ${data.message}`, 'error');
      return null;

    case 'agent_warning':
      addChatMessage(data.message, 'warning');
      return null;

    default:
      // Unknown event — ignore
      return null;
  }
}

function createAgentProgressTracker({ addChatMessage, setAgentProgressText }) {
  const state = {
    categoriesRead: 0,
    filesRead: new Set(),
    filesScanned: 0,
    filesEdited: new Set(),
    filesDeleted: new Set(),
    linesAdded: 0,
    linesRemoved: 0,
    linesRemovedByDelete: 0,
    lastReadText: '',
    readCommitted: false,
    editCommitted: false,
    deleteCommitted: false,
    buildTimer: null
  };

  const setLive = (text) => {
    if (typeof setAgentProgressText === 'function') {
      setAgentProgressText(text);
    }
  };

  const addProgress = (content, metadata = {}) => {
    if (!content) return;
    addChatMessage(content, 'agent-progress', metadata);
  };

  const commitReadProgress = () => {
    const readText = formatReadProgress({
      categories: state.categoriesRead,
      files: getTotalFilesRead(state)
    });
    if (!readText || readText === state.lastReadText) return;
    state.readCommitted = true;
    state.lastReadText = readText;
    addProgress(readText, {
      kind: 'read',
      categories: state.categoriesRead,
      files: getTotalFilesRead(state),
      replaceProgressKind: 'read'
    });
  };

  const commitEditProgress = () => {
    if (state.editCommitted || state.filesEdited.size === 0) return;
    state.editCommitted = true;
    addProgress(formatEditedProgress(state.filesEdited.size), {
      kind: 'edit',
      files: state.filesEdited.size,
      linesAdded: state.linesAdded,
      linesRemoved: state.linesRemoved
    });
  };

  const commitDeleteProgress = () => {
    if (state.deleteCommitted || state.filesDeleted.size === 0) return;
    state.deleteCommitted = true;
    addProgress(formatDeletedProgress(state.filesDeleted.size), {
      kind: 'delete',
      files: state.filesDeleted.size,
      linesAdded: 0,
      linesRemoved: state.linesRemovedByDelete
    });
  };

  const clearBuildTimer = () => {
    if (state.buildTimer) {
      clearTimeout(state.buildTimer);
      state.buildTimer = null;
    }
  };

  const handleBuildResult = (data = {}) => {
    const buildPassed = Boolean(data.result?.buildPassed);
    clearBuildTimer();

    if (buildPassed) {
      setLive('Build completed');
      return;
    }

    setLive('Build failed...');
    state.buildTimer = setTimeout(() => {
      setLive('Thinking...');
      state.buildTimer = null;
    }, 4000);
  };

  return {
    handle(eventType, data = {}) {
      if (eventType === 'agent_start') {
        setLive('Thinking...');
        return;
      }

      if (eventType === 'agent_thinking') {
        const step = String(data.step || '').replace(/_/g, ' ').trim();
        if (step && !/processing tool results/i.test(step)) {
          setLive(`${capitalize(step)}...`);
        }
        return;
      }

      if (eventType === 'tool_start') {
        const toolName = data.toolName;
        const args = data.args || {};

        if (toolName === 'browse_components') {
          setLive(formatReadingLive(state.categoriesRead + 1, getTotalFilesRead(state)));
          return;
        }

        if (toolName === 'fetch_component_bundle') {
          setLive(formatReadingLive(state.categoriesRead, getTotalFilesRead(state) + 1));
          return;
        }

        if (FILE_READ_TOOLS.has(toolName)) {
          const fileName = getFileName(args.path || args.filePath);
          setLive(fileName ? `Reading ${fileName} file...` : formatReadingLive(state.categoriesRead, getTotalFilesRead(state) + 1));
          return;
        }

        if (toolName === 'search_files') {
          setLive(formatReadingLive(state.categoriesRead, getTotalFilesRead(state)));
          return;
        }

        if (MUTATING_TOOLS.has(toolName)) {
          commitReadProgress();
          if (toolName === 'install_component_bundle') {
            setLive('Installing component...');
            return;
          }
          if (toolName === 'delete_file') {
            const fileName = getFileName(args.path || args.filePath);
            setLive(fileName ? `Deleting ${fileName} file...` : 'Deleting file...');
            return;
          }
          const fileName = getFileName(args.path || args.filePath);
          setLive(fileName ? `Editing ${fileName} file...` : 'Editing file...');
          return;
        }

        if (toolName === 'get_build_errors') {
          commitReadProgress();
          commitEditProgress();
          clearBuildTimer();
          setLive('Building...');
          return;
        }

        setLive('Thinking...');
        return;
      }

      if (eventType === 'tool_result') {
        const toolName = data.toolName;
        if (!data.success) return;

        if (toolName === 'browse_components') {
          state.categoriesRead += 1;
          setLive(formatReadingLive(state.categoriesRead, getTotalFilesRead(state)));
          if (state.readCommitted) commitReadProgress();
          return;
        }

        if (toolName === 'fetch_component_bundle') {
          const files = getCatalogBundleFileCount(data.result);
          if (files > 0) {
            state.filesScanned += files;
          }
          setLive(formatReadingLive(state.categoriesRead, getTotalFilesRead(state)));
          if (state.readCommitted) commitReadProgress();
          return;
        }

        if (FILE_READ_TOOLS.has(toolName)) {
          const filePath = data.result?.filePath || data.args?.path || data.args?.filePath;
          if (filePath) state.filesRead.add(filePath);
          setLive(formatReadingLive(state.categoriesRead, getTotalFilesRead(state)));
          if (state.readCommitted) commitReadProgress();
          return;
        }

        if (toolName === 'search_files') {
          const files = Number(data.result?.totalFiles || 0);
          if (Number.isFinite(files) && files > 0) {
            state.filesScanned += files;
          }
          setLive(formatReadingLive(state.categoriesRead, getTotalFilesRead(state)));
          if (state.readCommitted) commitReadProgress();
          return;
        }

        if (MUTATING_TOOLS.has(toolName)) {
          const filePaths = getMutationFilePaths(toolName, data.result, data.args);
          if (toolName === 'delete_file') {
            for (const filePath of filePaths) {
              state.filesDeleted.add(filePath || `delete_file:${state.filesDeleted.size + 1}`);
            }
            const stats = getMutationLineStats(toolName, data.result);
            state.linesRemovedByDelete += stats.removed;
            setLive(formatDeletingProgress(state.filesDeleted.size));
            return;
          }
          for (const filePath of filePaths) {
            state.filesEdited.add(filePath || `${toolName}:${state.filesEdited.size + 1}`);
          }
          addMutationLineStats(state, toolName, data.result);
          setLive(formatEditingProgress(state.filesEdited.size));
          return;
        }

        if (toolName === 'get_build_errors') {
          handleBuildResult(data);
        }
      }

      if (eventType === 'agent_done') {
        commitReadProgress();
        commitEditProgress();
        commitDeleteProgress();
        clearBuildTimer();
        setLive('');
      }

      if (eventType === 'agent_error') {
        clearBuildTimer();
        setLive('');
      }
    },

    finish() {
      clearBuildTimer();
      setLive('');
    }
  };
}

function formatReadingLive(categories, files) {
  const text = formatReadProgress({ categories, files, progressive: true });
  return text ? `${text}...` : 'Reading...';
}

function formatReadProgress({ categories = 0, files = 0, progressive = false } = {}) {
  const parts = [];
  if (categories > 0) parts.push(`through ${categories} ${pluralize('category', categories)}`);
  if (files > 0) parts.push(`${files} ${pluralize('file', files)}`);
  if (parts.length === 0) return '';
  return `${progressive ? 'Reading' : 'Read'} ${parts.join(', ')}`;
}

function formatEditedProgress(count) {
  return `Edited ${count} ${pluralize('file', count)}`;
}

function formatEditingProgress(count) {
  return `Editing ${count} ${pluralize('file', count)}...`;
}

function formatDeletedProgress(count) {
  return `Deleted ${count} ${pluralize('file', count)}`;
}

function formatDeletingProgress(count) {
  return `Deleting ${count} ${pluralize('file', count)}...`;
}

function getCatalogBundleFileCount(result = {}) {
  const count = Number(result.fileCount || result.totalFiles || 0);
  if (Number.isFinite(count) && count > 0) return count;
  if (Array.isArray(result.files)) return result.files.length;
  return 0;
}

function addMutationLineStats(state, toolName, result = {}) {
  const stats = getMutationLineStats(toolName, result);
  state.linesAdded += stats.added;
  state.linesRemoved += stats.removed;
}

function getMutationFilePaths(toolName, result = {}, args = {}) {
  if (toolName === 'install_component_bundle' && Array.isArray(result.installedFiles)) {
    const paths = result.installedFiles.map((file) => file.path || file.filePath).filter(Boolean);
    if (paths.length > 0) return paths;
  }
  return [result.filePath || args.path || args.filePath].filter(Boolean);
}

function getMutationLineStats(toolName, result = {}) {
  const diff = result.diff || {};
  const diffAdded = toSafeCount(diff.linesAdded);
  const diffRemoved = toSafeCount(diff.linesRemoved);

  if (diffAdded > 0 || diffRemoved > 0) {
    return { added: diffAdded, removed: diffRemoved };
  }

  if (toolName === 'create_file') {
    return { added: toSafeCount(result.lineCount), removed: 0 };
  }

  if (toolName === 'replace_file') {
    return {
      added: toSafeCount(result.newLineCount || result.lineCount),
      removed: toSafeCount(result.oldLineCount)
    };
  }

  if (toolName === 'delete_file') {
    return { added: 0, removed: toSafeCount(result.lineCount) };
  }

  return { added: 0, removed: 0 };
}

function toSafeCount(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function getTotalFilesRead(state) {
  return state.filesRead.size + state.filesScanned;
}

function getFileName(path) {
  const clean = String(path || '').trim();
  if (!clean) return '';
  return clean.split(/[\\/]/).pop();
}

function pluralize(word, count) {
  if (word === 'category') return count === 1 ? 'category' : 'categories';
  return count === 1 ? word : `${word}s`;
}

function capitalize(text) {
  const clean = String(text || '').trim();
  return clean ? clean.charAt(0).toUpperCase() + clean.slice(1) : clean;
}

export function toConciseAgentResponse(text) {
  const clean = String(text || '').replace(/\r\n/g, '\n').trim();
  if (!clean) return '';

  const rawLines = clean
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const rawBulletCount = rawLines.filter((line) => /^([-*]|[0-9]+[.)])\s+/.test(line)).length;

  if (clean.length <= MAX_VISIBLE_RESPONSE_CHARS && sentenceCount(clean) <= 4 && rawBulletCount <= 3 && rawLines.length <= 4) {
    return clean;
  }

  const meaningfulLines = rawLines
    .filter(Boolean)
    .filter((line) => !/^#+\s*/.test(line))
    .filter((line) => !/^(summary|changes made|what changed|files changed):?$/i.test(line));

  const bulletLines = meaningfulLines
    .filter((line) => /^([-*]|[0-9]+[.)])\s+/.test(line))
    .map((line) => line.replace(/^([-*]|[0-9]+[.)])\s+/, '').trim())
    .filter(Boolean);

  const hasProblem = /\b(error|failed|failing|issue|unable|couldn'?t|cannot|blocked)\b/i.test(clean);
  const lead = hasProblem ? 'I hit an issue:' : 'Done:';

  if (bulletLines.length > 0) {
    return [
      lead,
      ...bulletLines.slice(0, 3).map((line) => `- ${trimToLength(line, 150)}`)
    ].join('\n');
  }

  const sentences = extractSentences(clean)
    .map((sentence) => sentence.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const summary = sentences.slice(0, hasProblem ? 2 : 3).join(' ');
  const compact = summary || meaningfulLines.slice(0, 2).join(' ');

  return `${lead} ${trimToLength(compact, MAX_VISIBLE_RESPONSE_CHARS - lead.length - 1)}`;
}

function extractSentences(text) {
  return text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [];
}

function sentenceCount(text) {
  return extractSentences(text).length;
}

function trimToLength(text, maxLength) {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 3)).trim()}...`;
}

export default useAgentMode;
