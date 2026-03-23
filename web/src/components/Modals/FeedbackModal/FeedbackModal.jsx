import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBuilderAuth } from '../../../contexts/BuilderAuthContext';
import { FiMessageCircle } from 'react-icons/fi';
import styles from './FeedbackModal.module.css';
import gradientCorner from '../../../pages/Agency/pages/Builder/Dashboard/Assets/GradientCooorrnerForCard.png';

export default function FeedbackModal({ isOpen, onClose, pageSource }) {
  const { getAccessToken } = useBuilderAuth();
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setContent('');
      setIsSuccess(false);
      setError('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!content.trim()) return;

    setIsSubmitting(true);
    setError('');

    try {
      const token = getAccessToken();
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          content: content.trim(),
          pageSource: pageSource || 'unknown'
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit feedback');
      }

      setIsSuccess(true);
    } catch (err) {
      console.error('[FeedbackModal] Error:', err);
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !isSubmitting) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={styles.overlay}
          onClick={handleBackdropClick}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className={styles.modal}
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            {/* Background Branding */}
            <img src={gradientCorner} className={`${styles.cornerGradient} ${styles.cornerBottomLeft}`} alt="" />

            {isSuccess ? (
              <div className={styles.successState}>
                <FiMessageCircle className={styles.successIcon} />
                <h2 className={styles.successTitle}>Thank You!</h2>
                <p className={styles.successDesc}>Your feedback has been received and will help us improve the platform.</p>
                <button className={styles.closeSuccessBtn} onClick={onClose}>
                  Close
                </button>
              </div>
            ) : (
              <>
                <h2 className={styles.title}>The developers of the MVP Volturiano Plattform Would love to hear your feedback!</h2>
                <p className={styles.subtitle}>
                  Your insights drive our evolution. Tell us about your journey with the Volturiano MVP—what shines, what's missing, or where we can push the boundaries of creative automation.
                </p>

                <textarea
                  className={styles.textarea}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Share your thoughts here..."
                  autoFocus
                />

                {error && <p className={styles.errorText}>{error}</p>}

                <div className={styles.actions}>
                  <button 
                    className={styles.cancelBtn} 
                    onClick={onClose}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button 
                    className={styles.submitBtn} 
                    onClick={handleSubmit}
                    disabled={!content.trim() || isSubmitting}
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
