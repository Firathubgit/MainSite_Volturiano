/**
 * useAgentMode — React hook for the agentic builder
 * 
 * Manages the SSE connection to /api/agent/message, parses tool events,
 * and provides state/actions that plug into the Generation page's chat system.
 */
import { useState, useCallback, useRef } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || '';

/**
 * @param {object} options
 * @param {string} options.sandboxId
 * @param {string} options.model
 * @param {Function} options.addChatMessage — callback to add messages to the Generation chat
 * @param {Function} options.authFetch — authenticated fetch wrapper from Generation
 * @param {Function} options.onTurnComplete — called when the agent finishes a turn, receives metadata for persistence
 */
export function useAgentMode({ sandboxId, sandboxUrl, model, addChatMessage, authFetch, onTurnComplete }) {
  const [agentActive, setAgentActive] = useState(false);
  const [agentLoading, setAgentLoading] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const abortControllerRef = useRef(null);
  
  // Use a ref for the completion callback to avoid stale closures during long-running agent turns
  const onTurnCompleteRef = useRef(onTurnComplete);
  onTurnCompleteRef.current = onTurnComplete;

  /**
   * Send a message through the agentic loop (SSE streamed).
   * Emits chat messages as tool events arrive.
   */
  const sendAgentMessage = useCallback(async (prompt) => {
    if (!prompt?.trim() || agentLoading) return;

    setAgentLoading(true);

    // Add user message to chat immediately
    addChatMessage(prompt, 'user');

    // Track turn metadata for persistence
    let hadMutations = false;
    let turnMutationCount = 0;
    let turnToolCallCount = 0;
    let turnResponse = '';

    try {
      abortControllerRef.current = new AbortController();

      const fetchFn = authFetch || fetch;
      const response = await fetchFn(`${API_BASE}/api/agent/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          sandboxId: sandboxId, // Uses the latest reactive id
          model
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errData.error || `Server error ${response.status}`);
      }

      // Parse SSE stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        let currentEventType = null;
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEventType = line.slice(7).trim();
          } else if (line.startsWith('data: ') && currentEventType) {
            try {
              const data = JSON.parse(line.slice(6));
              
              // Track mutations for persistence
              if (currentEventType === 'tool_result') {
                turnToolCallCount++;
                if (['create_file', 'edit_file', 'replace_file'].includes(data.toolName) && data.success) {
                  hadMutations = true;
                  turnMutationCount++;
                }
              }

              const eventMeta = handleAgentEvent(currentEventType, data, addChatMessage, () => {
                hadMutations = true;
                turnMutationCount++;
              });
              // Accumulate metadata from agent_done event
              if (eventMeta) {
                if (eventMeta.mutationCount) turnMutationCount = eventMeta.mutationCount;
                if (eventMeta.toolCallCount) turnToolCallCount = eventMeta.toolCallCount;
                if (eventMeta.response) turnResponse = eventMeta.response;
              }
            } catch (e) {
              // Skip malformed JSON
            }
            currentEventType = null;
          } else if (line.trim() === '') {
            currentEventType = null;
          }
        }
      }

      // Trigger persistence pipeline after the turn completes
      if (onTurnCompleteRef.current) {
        onTurnCompleteRef.current({
          hadMutations,
          mutationCount: turnMutationCount,
          toolCallCount: turnToolCallCount,
          response: turnResponse,
          prompt: prompt.trim(),
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
      abortControllerRef.current = null;
    }
  }, [sandboxId, model, addChatMessage, authFetch, agentLoading]);

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
  }, [sandboxId, authFetch, addChatMessage]);

  /**
   * Send an initial build prompt through the agent-mode pipeline (SSE streamed).
   * This is the alternative to the legacy startGeneration pipeline.
   * Unlike sendAgentMessage, this does NOT add a user chat message — the caller handles that.
   */
  const sendAgentInitialBuild = useCallback(async (prompt, buildId, options = {}) => {
    if (!prompt?.trim() || agentLoading) return;

    setAgentLoading(true);

    let hadMutations = false;
    let turnMutationCount = 0;
    let turnToolCallCount = 0;
    let turnResponse = '';
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

      // Stream SSE events — exact same parsing as sendAgentMessage
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let currentEventType = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEventType = line.slice(7).trim();
          } else if (line.startsWith('data: ') && currentEventType) {
            try {
              const data = JSON.parse(line.slice(6));

              // Track mutations for persistence
              if (currentEventType === 'tool_result') {
                turnToolCallCount++;
                if (['create_file', 'edit_file', 'replace_file'].includes(data.toolName) && data.success) {
                  hadMutations = true;
                  turnMutationCount++;
                }
              }

              const eventMeta = handleAgentEvent(currentEventType, data, addChatMessage, () => {
                hadMutations = true;
                turnMutationCount++;
              });

              if (eventMeta) {
                if (eventMeta.mutationCount) turnMutationCount = eventMeta.mutationCount;
                if (eventMeta.toolCallCount) turnToolCallCount = eventMeta.toolCallCount;
                if (eventMeta.response) turnResponse = eventMeta.response;
              }
            } catch (e) {
              // Skip malformed JSON
            }
            currentEventType = null;
          } else if (line.trim() === '') {
            currentEventType = null;
          }
        }
      }

      // Trigger persistence pipeline after the build completes
      if (onTurnCompleteRef.current) {
        onTurnCompleteRef.current({
          hadMutations,
          mutationCount: turnMutationCount,
          toolCallCount: turnToolCallCount,
          response: turnResponse,
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
      abortControllerRef.current = null;
    }
  }, [sandboxId, model, addChatMessage, authFetch, agentLoading, onTurnComplete]);

  /**
   * Cancel an in-flight agent request.
   */
  const cancelAgent = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setAgentLoading(false);
    }
  }, []);

  return {
    agentActive,
    setAgentActive,
    agentLoading,
    canUndo,
    sendAgentMessage,
    sendAgentInitialBuild,
    undoLastTurn,
    cancelAgent
  };
}

// ─── SSE Event Dispatcher ─────────────────────────────
// Returns metadata from agent_done events so the caller can accumulate turn stats.

function handleAgentEvent(eventType, data, addChatMessage, onMutationDetected) {
  switch (eventType) {
    case 'agent_start':
      addChatMessage(null, 'agent-thinking', { stage: 'analyzing' });
      return null;

    case 'agent_thinking':
      // Update thinking indicator (handled by thinking pill in chat)
      return null;

    case 'tool_start': {
      const { toolName, args } = data;
      // Show tool call card in chat
      addChatMessage(null, 'agent-tool', {
        toolName,
        args,
        status: 'running'
      });
      return null;
    }

    case 'tool_result': {
      const { toolName, result, success } = data;
      // Update the last tool card (or add result)
      addChatMessage(null, 'agent-tool-result', {
        toolName,
        result,
        success
      });

      // Detect mutations
      if (['create_file', 'edit_file', 'replace_file'].includes(toolName) && success) {
        onMutationDetected();
      }
      return null;
    }

    case 'agent_text':
      // Agent's text response — show as AI message
      if (data.text) {
        addChatMessage(data.text, 'ai-narrator', { style: 'casual', isAgentResponse: true });
      }
      return null;

    case 'agent_done': {
      const { response, toolCallCount, mutationCount, canUndo } = data;
      // Final response if not already sent via agent_text
      if (response && !data.text) {
        addChatMessage(response, 'ai-narrator', { style: 'casual', isAgentResponse: true });
      }
      // Return metadata so the hook can pass it to onTurnComplete
      return { mutationCount, toolCallCount, response };
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

export default useAgentMode;
