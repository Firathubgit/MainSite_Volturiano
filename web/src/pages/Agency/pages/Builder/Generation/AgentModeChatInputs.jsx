import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BsSearch, BsFileEarmarkCode, BsTerminal, BsLightningCharge, BsCodeSlash } from 'react-icons/bs';
import styles from './AgentModeChatInputs.module.css';

/**
 * AgentModeChatInputs — Specialized quick-action buttons for Agent Mode.
 * These appear above the chat input to give the user quick access to agentic triggers
 * or to indicate available specialized "skills".
 */
const AgentModeChatInputs = ({ active, onAction }) => {
  const ACTIONS = [
    { id: 'search', label: 'Search Files', icon: BsSearch, color: '#818cf8' },
    { id: 'read', label: 'Read File', icon: BsFileEarmarkCode, color: '#2dd4bf' },
    { id: 'check', label: 'Check Build', icon: BsTerminal, color: '#fbbf24' },
    { id: 'refactor', label: 'Refactor', icon: BsCodeSlash, color: '#f472b6' },
  ];

  return (
    <AnimatePresence>
      {active && (
        <motion.div 
          className={styles.container}
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className={styles.header}>
            <div className={styles.headerDot} />
            <span className={styles.headerText}>Agent Capabilities</span>
            <BsLightningCharge className={styles.headerIcon} />
          </div>
          
          <div className={styles.actionsGrid}>
            {ACTIONS.map((action) => (
              <motion.button
                key={action.id}
                className={styles.actionBtn}
                onClick={() => onAction && onAction(action.id)}
                whileHover={{ scale: 1.02, backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                whileTap={{ scale: 0.98 }}
                style={{ '--action-color': action.color }}
              >
                <div className={styles.iconWrapper}>
                  <action.icon size={14} />
                </div>
                <span className={styles.actionLabel}>{action.label}</span>
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AgentModeChatInputs;
