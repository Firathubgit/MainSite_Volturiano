import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiLock, FiArrowRight } from 'react-icons/fi';
import styles from './AuthGateModal.module.css';

const AuthGateModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className={styles.overlay} onClick={onClose}>
        <motion.div
          className={styles.modal}
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={styles.gridOverlay} />
          
          <button className={styles.closeButton} onClick={onClose}>
            <FiX size={20} />
          </button>

          <div className={styles.iconWrapper}>
            <FiLock size={32} color="#ffffff" />
          </div>

          <h2 className={styles.title}>Unlock Full Access</h2>
          <p className={styles.description}>
            Create a free account to generate websites, use premium components, and publish your work live.
          </p>

          <div className={styles.buttonGroup}>
            <button 
              className={styles.primaryButton}
              onClick={() => navigate('/builder/login')}
            >
              Sign up free
              <FiArrowRight size={18} />
            </button>
            <button 
              className={styles.secondaryButton}
              onClick={() => navigate('/builder/login')}
            >
              Log in to your account
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default AuthGateModal;
