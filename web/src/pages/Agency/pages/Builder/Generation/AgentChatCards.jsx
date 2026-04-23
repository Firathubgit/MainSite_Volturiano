/**
 * AgentChatCards — UI components for rendering agentic tool calls in the chat panel.
 * 
 * Renders:
 * - Tool call cards (file read, create, edit, search, build check)
 * - Inline diffs for edit operations
 * - Agent summary badges
 * - Agent thinking indicator
 */
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BsFileEarmarkCode, BsSearch, BsCheck2, BsX, BsPencil, BsPlus, BsFiles, BsTerminal, BsArrowRepeat, BsFileEarmarkText } from 'react-icons/bs';
import styles from './AgentChatCards.module.css';

// ─── Helpers ──────────────────────────────────────────

function cleanDiffLine(line) {
  if (!line) return '';
  // Remove leading + or - if the text already contains them (agent common output)
  return line.replace(/^[+-]\s*/, '').trim();
}

// ─── Tool Icon Map ────────────────────────────────────

const TOOL_ICONS = {
  list_files: BsFiles,
  read_file: BsFileEarmarkCode,
  create_file: BsPlus,
  edit_file: BsPencil,
  replace_file: BsArrowRepeat,
  search_files: BsSearch,
  get_build_errors: BsTerminal
};

const TOOL_LABELS = {
  list_files: 'Listing files',
  read_file: 'Reading',
  create_file: 'Creating',
  edit_file: 'Editing',
  replace_file: 'Updating',
  search_files: 'Searching components',
  get_build_errors: 'Checking build',
  browse_components: 'Fetching library',
  fetch_component_bundle: 'Downloading component'
};

// ─── Symbols & Shimmers ────────────────────────────────

const SEARCH_ICON_SVG = (
  <svg xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 -960 960 960" width="18px" fill="currentColor">
    <path d="M784-120 532-372q-30 24-69 38t-83 14q-109 0-184.5-75.5T120-580q0-109 75.5-184.5T380-840q109 0 184.5 75.5T640-580q0 44-14 83t-38 69l252 252-56 56ZM380-400q75 0 127.5-52.5T560-580q0-75-52.5-127.5T380-760q-75 0-127.5 52.5T200-580q0 75 52.5 127.5T380-400Z"/>
  </svg>
);

export const AgentShimmerIcon = ({ type, volturianoLogo }) => {
  if (type === 'search' || type === 'search_files' || type === 'list_files') {
    return <div className={styles.searchIconShimmer}>{SEARCH_ICON_SVG}</div>;
  }
  if (type === 'read' || type === 'read_file') {
    return <div className={styles.fileIconShimmer}><BsFileEarmarkText size={15} /></div>;
  }
  if (type === 'write' || type === 'edit' || type === 'create_file' || type === 'edit_file' || type === 'replace_file') {
    return <div className={styles.writeIconShimmer}><BsPencil size={14} /></div>;
  }
  if (type === 'terminal' || type === 'get_build_errors') {
    return <div className={styles.terminalIconShimmer}><BsTerminal size={14} /></div>;
  }
  if (type === 'browse_components' || type === 'fetch_component_bundle') {
    return <div className={styles.searchIconShimmer}><BsFiles size={14} /></div>;
  }
  
  if (volturianoLogo) {
    return (
      <div 
        className={styles.tornadoLogoShimmer} 
        style={{ 
          width: 20, 
          height: 20, 
          '--logo-url': `url(${volturianoLogo})` 
        }} 
      />
    );
  }

  return <div className={styles.fileIconShimmer}><BsFileEarmarkCode size={14} /></div>;
};

// ─── Tool Call Card ───────────────────────────────────

export const AgentToolCard = ({ toolName, args, status, result, success, hideStatus = false }) => {
  const Icon = TOOL_ICONS[toolName] || BsFileEarmarkCode;
  const label = TOOL_LABELS[toolName] || toolName;
  const filePath = args?.path;
  const fileName = filePath?.split('/').pop();

  const isRunning = status === 'running';
  const isMutation = ['create_file', 'edit_file', 'replace_file'].includes(toolName);

  return (
    <motion.div
      className={`${styles.toolCard} ${isMutation ? styles.toolCardMutation : ''} ${!success && result ? styles.toolCardError : ''}`}
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className={styles.toolCardHeader}>
        <AgentShimmerIcon type={toolName} />
        <span className={`${styles.toolCardLabel} ${styles.shimmerText}`}>{label}</span>
        {fileName && (
          <span className={`${styles.toolCardFile} ${styles.boldText}`} title={filePath}>
            {fileName}
          </span>
        )}
        {!hideStatus && (
          <div className={styles.toolCardStatus}>
            {isRunning ? (
              <div className={styles.toolCardSpinner} />
            ) : success !== false ? (
              <BsCheck2 size={13} className={styles.toolCardSuccess} />
            ) : (
              <BsX size={15} className={styles.toolCardFail} />
            )}
          </div>
        )}
      </div>

      {/* Inline diff for edit_file */}
      {toolName === 'edit_file' && result?.diff && (
        <div className={styles.toolCardDiff}>
          <div className={styles.diffRemoved}>
            <span className={styles.diffSign}>−</span>
            <code>{cleanDiffLine(result.diff.oldPreview)}</code>
          </div>
          <div className={styles.diffAdded}>
            <span className={styles.diffSign}>+</span>
            <code>{cleanDiffLine(result.diff.newPreview)}</code>
          </div>
        </div>
      )}

      {/* Error message */}
      {!success && result?.error && (
        <div className={`${styles.toolCardErrorMsg} ${styles.diffRemoved}`}>
          <span className={styles.diffSign}>!</span>
          <code className={styles.shimmerText}>{result.error}</code>
        </div>
      )}

      {/* Build result */}
      {toolName === 'get_build_errors' && result && (
        <div className={`${styles.toolCardBuild} ${result.buildPassed ? styles.buildPassed : styles.buildFailed}`}>
          <span className={styles.diffSign}>{result.buildPassed ? '✓' : '✗'}</span>
          <span className={styles.shimmerText}>
            {result.buildPassed ? 'Build passed' : 'Build failed'}
          </span>
        </div>
      )}

      {/* Search results summary */}
      {toolName === 'search_files' && result?.totalMatches !== undefined && (
        <div className={styles.toolCardMeta}>
          {result.totalMatches} match{result.totalMatches !== 1 ? 'es' : ''} in {result.totalFiles} file{result.totalFiles !== 1 ? 's' : ''}
        </div>
      )}

      {/* File info for reads */}
      {toolName === 'read_file' && result?.totalLines && (
        <div className={styles.toolCardMeta}>
          {result.totalLines} lines · {formatBytes(result.sizeBytes)}
        </div>
      )}

      {/* Create/replace info */}
      {(toolName === 'create_file' || toolName === 'replace_file') && result?.lineCount && (
        <div className={styles.toolCardMeta}>
          {result.lineCount} lines written
        </div>
      )}
    </motion.div>
  );
};

// ─── Agent Summary Badge ──────────────────────────────

export const AgentSummaryBadge = ({ toolCallCount, mutationCount, canUndo, onUndo }) => {
  if (!mutationCount) return null;

  return (
    <motion.div
      className={styles.summaryBadge}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className={styles.summaryContent}>
        <span className={styles.summaryIcon}>⚡</span>
        <span className={styles.summaryText}>
          {mutationCount} file{mutationCount !== 1 ? 's' : ''} changed
          {toolCallCount > mutationCount && ` · ${toolCallCount} total operations`}
        </span>
      </div>
      {canUndo && onUndo && (
        <button className={styles.undoBtn} onClick={onUndo} title="Undo all changes from this turn">
          <svg xmlns="http://www.w3.org/2000/svg" height="14" viewBox="0 -960 960 960" width="14" fill="currentColor">
            <path d="M280-200v-80h284q63 0 109.5-40T720-420q0-60-46.5-100T564-560H312l104 104-56 56-200-200 200-200 56 56-104 104h252q97 0 166.5 63T800-420q0 94-69.5 157T564-200H280Z" />
          </svg>
          Undo
        </button>
      )}
    </motion.div>
  );
};


// ─── Agent Thinking & Searching Indicators ────────────

export const AgentThinkingPill = ({ stage = 'Thinking', volturianoLogo, type = 'thinking', fileName }) => {
  const [dots, setDots] = React.useState('');

  React.useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const renderText = () => {
    if ((type === 'read' || type === 'write' || type === 'edit') && fileName) {
      const label = type === 'read' ? 'Reading' : (type === 'write' ? 'Writing' : 'Editing');
      return (
        <span className={styles.shimmerText}>
          {label} <span className={styles.boldText}>{fileName}</span>{dots}
        </span>
      );
    }
    return (
      <span className={styles.shimmerText}>
        {stage}{dots}
      </span>
    );
  };

  return (
    <div className={styles.agentThinkingRow}>
      <AgentShimmerIcon type={type} volturianoLogo={volturianoLogo} />
      {renderText()}
    </div>
  );
};

// ─── Agent Activity Stack (New clustered UI) ──────────

export const AgentActivityRow = ({ 
  status, 
  volturianoLogo, 
  messages = [], 
  isLive = false 
}) => {
  const [visibleMessages, setVisibleMessages] = useState([]);
  const [vanishedCount, setVanishedCount] = useState(0);
  const timerRef = useRef(null);
  const lastCountRef = useRef(0);

  // Auto-vanishing logic for tool list: 2s window
  useEffect(() => {
    if (messages.length > lastCountRef.current) {
      // New message arrived - show only items that haven't vanished yet
      setVisibleMessages(messages.slice(vanishedCount));
      lastCountRef.current = messages.length;

      if (timerRef.current) clearTimeout(timerRef.current);
      
      timerRef.current = setTimeout(() => {
        setVanishedCount(messages.length);
        setVisibleMessages([]);
      }, 3000);
    }
  }, [messages, vanishedCount]);

  const [dots, setDots] = useState('');
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={styles.activityContainer}>
      {/* Main Thinking Row */}
      <div className={styles.activityHeader}>
        <AgentShimmerIcon volturianoLogo={volturianoLogo} />
        <span className={styles.activityHeaderText}>
          {status}{dots}
        </span>
      </div>

      {/* Dynamic Activity Stack */}
      <div className={styles.activityStack}>
        <AnimatePresence>
          {visibleMessages.map((m, idx) => {
            const msg = m.msg;
            const content = msg.content || '';
            const toolName = msg.metadata?.toolName;
            
            // Format labels for the compact list
            let label = TOOL_LABELS[toolName] || 'Thinking';
            
            if (msg.type === 'agent-thinking') {
              label = content;
            } else if (['read_file', 'edit_file', 'replace_file', 'create_file', 'fetch_component_bundle'].includes(toolName)) {
              const path = msg.metadata?.args?.path || msg.metadata?.args?.componentName || msg.metadata?.args?.component_id || '';
              const fileName = path.split('/').pop() || '';
              if (fileName) label = `${label} ${fileName}`;
            } else if (toolName === 'search_files' || toolName === 'browse_components') {
              const query = msg.metadata?.args?.query || msg.metadata?.args?.keywords || '';
              if (query) label = `${label}: ${query}`;
            }

            return (
              <motion.div
                key={`${m.index}-${idx}`}
                className={styles.activityEntry}
                initial={{ opacity: 0, x: -10, height: 0 }}
                animate={{ opacity: 1, x: 0, height: 'auto' }}
                exit={{ opacity: 0, x: 10, height: 0, transition: { duration: 0.3 } }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                <AgentShimmerIcon type={toolName} volturianoLogo={volturianoLogo} />
                <span className={styles.activityEntryText}>{label}</span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};

// ─── Helpers ──────────────────────────────────────────

function truncate(str, maxLen) {
  if (!str) return '';
  return str.length > maxLen ? str.slice(0, maxLen) + '…' : str;
}

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  return (bytes / 1024).toFixed(1) + ' KB';
}
