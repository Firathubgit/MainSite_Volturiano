import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './CookieConsent.module.css';

const CONSENT_KEY = 'volturiano_gdpr_consent';
const CONSENT_VERSION = '1.0';

/**
 * CookieConsent banner for GDPR compliance.
 * Blocks non-essential analytics and tracking until consent is given.
 */
const CookieConsent = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState({
    essential: true,
    analytics: false,
    performance: false
  });

  useEffect(() => {
    const saved = localStorage.getItem(CONSENT_KEY);
    if (!saved) {
      // If no consent exists, show banner but wait 1.5s for initial page load animations to settle
      const timer = setTimeout(() => setIsVisible(true), 1500);
      return () => clearTimeout(timer);
    } else {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.version !== CONSENT_VERSION) {
          setIsVisible(true);
        }
      } catch (e) {
        setIsVisible(true);
      }
    }
  }, []);

  const handleSave = (newPrefs) => {
    const payload = {
      ...newPrefs,
      version: CONSENT_VERSION,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem(CONSENT_KEY, JSON.stringify(payload));
    setIsVisible(false);
    
    // Dispatch event so App.jsx or other components can react
    window.dispatchEvent(new CustomEvent('gdpr-consent-updated', { detail: payload }));
    
    // Reload only if consent changed to true for analytics (to fire tracking scripts immediately)
    if (newPrefs.analytics || newPrefs.performance) {
      window.location.reload();
    }
  };

  const handleAcceptAll = () => {
    handleSave({ essential: true, analytics: true, performance: true });
  };

  const handleRejectAll = () => {
    handleSave({ essential: true, analytics: false, performance: false });
  };

  const togglePreference = (key) => {
    if (key === 'essential') return;
    setPreferences(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <div className={styles.overlay}>
          <motion.div
            className={styles.banner}
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          >
            <div className={styles.content}>
              <h3 className={styles.title}>Your Privacy at Volturiano</h3>
              <p className={styles.description}>
                We use cookies to improve your experience and analyze our traffic. 
                Essential cookies are required for core features like authentication. 
                Read our <span className={styles.link} onClick={() => window.open('/privacy', '_blank')}>Privacy Policy</span> for details.
              </p>
            </div>

            {showPreferences && (
              <div className={styles.preferences}>
                <div className={styles.preferenceItem}>
                  <div className={styles.preferenceInfo}>
                    <span className={styles.preferenceLabel}>Essential (Active)</span>
                    <span className={styles.preferenceDesc}>Login and security settings.</span>
                  </div>
                  <label className={styles.toggle}>
                    <input type="checkbox" checked={true} disabled />
                    <span className={styles.slider}></span>
                  </label>
                </div>
                
                <div className={styles.preferenceItem}>
                  <div className={styles.preferenceInfo}>
                    <span className={styles.preferenceLabel}>Usage Analytics</span>
                    <span className={styles.preferenceDesc}>Anonymous data to help us improve.</span>
                  </div>
                  <label className={styles.toggle}>
                    <input 
                      type="checkbox" 
                      checked={preferences.analytics} 
                      onChange={() => togglePreference('analytics')} 
                    />
                    <span className={styles.slider}></span>
                  </label>
                </div>

                <div className={styles.preferenceItem}>
                  <div className={styles.preferenceInfo}>
                    <span className={styles.preferenceLabel}>Performance Logs</span>
                    <span className={styles.preferenceDesc}>Speed insights and error monitoring.</span>
                  </div>
                  <label className={styles.toggle}>
                    <input 
                      type="checkbox" 
                      checked={preferences.performance} 
                      onChange={() => togglePreference('performance')} 
                    />
                    <span className={styles.slider}></span>
                  </label>
                </div>
              </div>
            )}

            <div className={styles.actions}>
              {!showPreferences ? (
                <>
                  <button className={styles.primaryButton} onClick={handleAcceptAll}>
                    Accept All
                  </button>
                  <button className={styles.secondaryButton} onClick={handleRejectAll}>
                    Reject Non-Essential
                  </button>
                  <button className={styles.secondaryButton} onClick={() => setShowPreferences(true)}>
                    Manage Settings
                  </button>
                </>
              ) : (
                <>
                  <button className={styles.primaryButton} onClick={() => handleSave(preferences)}>
                    Save Choices
                  </button>
                  <button className={styles.secondaryButton} onClick={() => setShowPreferences(false)}>
                    Go Back
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CookieConsent;
