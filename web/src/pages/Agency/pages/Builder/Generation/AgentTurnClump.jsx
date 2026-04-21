/**
 * AgentTurnClump — Antigravity-style collapsible container for completed agent turns.
 *
 * After the agent finishes a turn, all the tool-call / thinking messages from that
 * turn are clumped into a single collapsed row showing "Worked for Xs".
 * Clicking the row expands to reveal the individual tool call details.
 *
 * While the agent is still running, the clump stays expanded (live mode).
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BsChevronRight } from 'react-icons/bs';
import styles from './AgentTurnClump.module.css';

function formatDuration(ms) {
  if (!ms || ms < 0) return '0s';
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
}

/**
 * @param {object} props
 * @param {React.ReactNode[]} props.children — The tool call / thinking rows to clump
 * @param {number} props.durationMs — How long the agent turn took
 * @param {number} props.toolCallCount — Number of tool calls in this turn
 * @param {number} props.mutationCount — Number of file mutations
 * @param {boolean} props.isLive — If true, the turn is still running (stay expanded)
 */
const AgentTurnClump = ({ children, durationMs, toolCallCount = 0, mutationCount = 0, isLive = false }) => {
  const [expanded, setExpanded] = useState(false);

  // While live, show children directly without clumping
  if (isLive) {
    return <>{children}</>;
  }

  const childCount = React.Children.count(children);
  if (childCount === 0) return null;

  const duration = formatDuration(durationMs);

  // Build summary text
  let summary = `Worked for ${duration}`;
  if (toolCallCount > 0) {
    summary += ` · ${toolCallCount} action${toolCallCount !== 1 ? 's' : ''}`;
  }
  if (mutationCount > 0) {
    summary += ` · ${mutationCount} file${mutationCount !== 1 ? 's' : ''} changed`;
  }

  return (
    <div className={styles.clumpContainer}>
      <button
        className={`${styles.clumpHeader} ${expanded ? styles.clumpHeaderExpanded : ''}`}
        onClick={() => setExpanded(prev => !prev)}
        aria-expanded={expanded}
      >
        <motion.div
          className={styles.chevron}
          animate={{ rotate: expanded ? 90 : 0 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          <BsChevronRight size={10} />
        </motion.div>
        <span className={styles.clumpText}>{summary}</span>
        <div className={styles.clumpLine} />
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            className={styles.clumpBody}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className={styles.clumpBodyInner}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AgentTurnClump;
