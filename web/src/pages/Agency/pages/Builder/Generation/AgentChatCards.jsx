/**
 * AgentChatCards — UI components for rendering agentic tool calls in the chat panel.
 * 
 * Renders:
 * - Tool call cards (file read, create, edit, search, build check)
 * - Inline diffs for edit operations
 * - Agent summary badges
 * - Agent thinking indicator
 */
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BsFileEarmarkCode, BsSearch, BsCheck2, BsX, BsPencil, BsPlus, BsFiles, BsTerminal, BsArrowRepeat } from 'react-icons/bs';
import styles from './AgentChatCards.module.css';

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
  replace_file: 'Replacing',
  search_files: 'Searching',
  get_build_errors: 'Checking build'
};

// ─── Tool Call Card ───────────────────────────────────

export const AgentToolCard = ({ toolName, args, status, result, success }) => {
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
        <div className={styles.toolCardIcon}>
          <Icon size={13} />
        </div>
        <span className={styles.toolCardLabel}>{label}</span>
        {fileName && (
          <span className={styles.toolCardFile} title={filePath}>
            {fileName}
          </span>
        )}
        <div className={styles.toolCardStatus}>
          {isRunning ? (
            <div className={styles.toolCardSpinner} />
          ) : success !== false ? (
            <BsCheck2 size={13} className={styles.toolCardSuccess} />
          ) : (
            <BsX size={15} className={styles.toolCardFail} />
          )}
        </div>
      </div>

      {/* Inline diff for edit_file */}
      {toolName === 'edit_file' && result?.diff && (
        <div className={styles.toolCardDiff}>
          <div className={styles.diffRemoved}>
            <span className={styles.diffSign}>−</span>
            <code>{truncate(result.diff.oldPreview, 200)}</code>
          </div>
          <div className={styles.diffAdded}>
            <span className={styles.diffSign}>+</span>
            <code>{truncate(result.diff.newPreview, 200)}</code>
          </div>
        </div>
      )}

      {/* Error message */}
      {!success && result?.error && (
        <div className={styles.toolCardErrorMsg}>
          {result.error}
        </div>
      )}

      {/* Build result */}
      {toolName === 'get_build_errors' && result && (
        <div className={`${styles.toolCardBuild} ${result.buildPassed ? styles.buildPassed : styles.buildFailed}`}>
          {result.buildPassed ? '✓ Build passed' : '✗ Build failed'}
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

// ─── Agent Thinking Pill ──────────────────────────────

export const AgentThinkingPill = () => {
  const [dots, setDots] = React.useState('');

  React.useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={styles.thinkingPill}>
      <div className={styles.thinkingDot} />
      <div className={styles.thinkingDot} style={{ animationDelay: '0.15s' }} />
      <div className={styles.thinkingDot} style={{ animationDelay: '0.3s' }} />
      <span className={styles.thinkingText}>Thinking{dots}</span>
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
