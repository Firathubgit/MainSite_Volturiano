import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { useGarageStore } from '../../../stores/garageStore';
import styles from './ShareModal.module.css';

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 }
};

const panelVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.95, y: 20 }
};

/**
 * Share modal component for garage items
 * @param {Object} props
 * @param {boolean} props.show - Whether to show the modal
 * @param {string} props.itemId - Garage item ID
 * @param {Function} props.onClose - Callback when modal closes
 */
export default function ShareModal({ show, itemId, onClose }) {
  const { t } = useTranslation('account');
  const createShareLink = useGarageStore((state) => state.createShareLink);
  const getShareLinks = useGarageStore((state) => state.getShareLinks);
  const updateShareSettings = useGarageStore((state) => state.updateShareSettings);
  const deleteShareLink = useGarageStore((state) => state.deleteShareLink);

  const [shareLinks, setShareLinks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);
  const [copiedLink, setCopiedLink] = useState(null);
  const [privacy, setPrivacy] = useState('unlisted');
  const [expiresAt, setExpiresAt] = useState(null);
  const [showExpiry, setShowExpiry] = useState(false);

  // Use portal to render outside DOM hierarchy
  const [mounted, setMounted] = useState(false);
  
  // Ref to track current share links for callback closure
  const shareLinksRef = useRef([]);
  
  // Keep ref in sync with state
  useEffect(() => {
    shareLinksRef.current = shareLinks;
  }, [shareLinks]);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const loadShareLinks = useCallback(async (forceRefresh = false) => {
    console.log('[ShareModal] loadShareLinks called for itemId:', itemId, 'forceRefresh:', forceRefresh);
    
    // Only show loading if we don't have cached data or forcing refresh
    const currentLinks = shareLinksRef.current;
    const hasCachedData = currentLinks.length > 0 && !forceRefresh;
    if (!hasCachedData) {
      setLoading(true);
    }
    setError(null);
    const startTime = Date.now();
    try {
      console.log('[ShareModal] Calling getShareLinks API...');
      const { data, error: loadError } = await getShareLinks(itemId, forceRefresh);
      const duration = Date.now() - startTime;
      console.log('[ShareModal] getShareLinks completed in', duration, 'ms');
      
      if (loadError) {
        console.error('[ShareModal] Error loading share links:', loadError);
        setError(loadError);
        // Don't clear existing links on error if we have cached data
        if (!hasCachedData) {
          setShareLinks([]);
        }
      } else {
        console.log('[ShareModal] Share links loaded:', data?.length || 0, 'links');
        if (data && data.length > 0) {
          console.log('[ShareModal] Share codes:', data.map(l => l.share_code));
        }
        setShareLinks(data || []);
      }
    } catch (err) {
      console.error('[ShareModal] Exception loading share links:', err);
      setError(err);
      // Don't clear existing links on error if we have cached data
      if (!hasCachedData) {
        setShareLinks([]);
      }
    } finally {
      setLoading(false);
      console.log('[ShareModal] loadShareLinks finished');
    }
  }, [itemId, getShareLinks]);

  // Load share links when modal opens
  useEffect(() => {
    console.log('[ShareModal] useEffect triggered:', { show, itemId, mounted });
    if (show && itemId && mounted) {
      console.log('[ShareModal] Modal opened, loading share links...');
      // Load with cache first (fast), then refresh in background
      loadShareLinks(false);
    } else if (!show) {
      console.log('[ShareModal] Modal closed, clearing error state');
      // Don't clear shareLinks immediately - keep them for smooth re-opening
      setError(null);
    }
  }, [show, itemId, mounted, loadShareLinks]);

  const handleCreateLink = async () => {
    console.log('[ShareModal] handleCreateLink called');
    console.log('[ShareModal] Options:', { privacy, expiresAt, showExpiry });
    setCreating(true);
    setError(null);
    const startTime = Date.now();
    try {
      const options = {
        privacy,
        expiresAt: showExpiry && expiresAt ? new Date(expiresAt) : null
      };
      console.log('[ShareModal] Creating share link with options:', options);
      const { data, error: createError } = await createShareLink(itemId, options);
      const duration = Date.now() - startTime;
      console.log('[ShareModal] createShareLink completed in', duration, 'ms');
      
      if (createError) {
        console.error('[ShareModal] Error creating share link:', createError);
        setError(createError);
      } else {
        console.log('[ShareModal] Share link created successfully:', data);
        console.log('[ShareModal] Share code:', data?.share_code);
        console.log('[ShareModal] Share URL:', `${window.location.origin}/garage/share/${data?.share_code}`);
        // Reload share links (force refresh since we just created one)
        await loadShareLinks(true);
        // Reset form
        setPrivacy('unlisted');
        setExpiresAt(null);
        setShowExpiry(false);
      }
    } catch (err) {
      console.error('[ShareModal] Exception creating share link:', err);
      setError(err);
    } finally {
      setCreating(false);
      console.log('[ShareModal] handleCreateLink finished');
    }
  };

  const handleCopyLink = (shareCode) => {
    const shareUrl = `${window.location.origin}/garage/share/${shareCode}`;
    console.log('[ShareModal] Copying link to clipboard:', shareUrl);
    navigator.clipboard.writeText(shareUrl).then(() => {
      console.log('[ShareModal] Link copied successfully');
      setCopiedLink(shareCode);
      setTimeout(() => {
        setCopiedLink(null);
        console.log('[ShareModal] Copy feedback cleared');
      }, 2000);
    }).catch((err) => {
      console.error('[ShareModal] Failed to copy link:', err);
      setError(new Error('Failed to copy link'));
    });
  };

  const handleUpdatePrivacy = async (shareLinkId, newPrivacy) => {
    console.log('[ShareModal] handleUpdatePrivacy called:', { shareLinkId, newPrivacy });
    const startTime = Date.now();
    try {
      const { data, error: updateError } = await updateShareSettings(shareLinkId, {
        privacy: newPrivacy
      });
      const duration = Date.now() - startTime;
      console.log('[ShareModal] updateShareSettings completed in', duration, 'ms');
      
      if (updateError) {
        console.error('[ShareModal] Error updating privacy:', updateError);
        setError(updateError);
      } else {
        console.log('[ShareModal] Privacy updated successfully:', data);
        await loadShareLinks(true);
      }
    } catch (err) {
      console.error('[ShareModal] Exception updating privacy:', err);
      setError(err);
    }
  };

  const handleDeleteLink = async (shareLinkId) => {
    console.log('[ShareModal] handleDeleteLink called for shareLinkId:', shareLinkId);
    if (!window.confirm(t('garage.share.confirmDelete'))) {
      console.log('[ShareModal] Delete cancelled by user');
      return;
    }
    const startTime = Date.now();
    try {
      console.log('[ShareModal] Deleting share link...');
      const { error: deleteError } = await deleteShareLink(shareLinkId);
      const duration = Date.now() - startTime;
      console.log('[ShareModal] deleteShareLink completed in', duration, 'ms');
      
      if (deleteError) {
        console.error('[ShareModal] Error deleting share link:', deleteError);
        setError(deleteError);
      } else {
        console.log('[ShareModal] Share link deleted successfully');
        await loadShareLinks(true);
      }
    } catch (err) {
      console.error('[ShareModal] Exception deleting share link:', err);
      setError(err);
    }
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return '';
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('sv-SE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getShareUrl = (shareCode) => {
    return `${window.location.origin}/garage/share/${shareCode}`;
  };

  if (!show || !mounted) {
    return null;
  }

  const modalContent = (
    <AnimatePresence>
      {show && (
        <motion.div
          className={styles.overlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="share-modal-title"
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              onClose();
            }
          }}
        >
          <motion.div
            className={styles.panel}
            variants={panelVariants}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.header}>
              <h2 id="share-modal-title" className={styles.title}>
                {t('garage.share.title')}
              </h2>
              <motion.button
                type="button"
                className={styles.closeButton}
                onClick={onClose}
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                transition={{ duration: 0.2 }}
                aria-label={t('garage.overlay.close')}
              >
                ×
              </motion.button>
            </div>

            <div className={styles.content}>
              {error && (
                <div className={styles.error}>
                  <span>{t('garage.share.error')}: {error.message || error}</span>
                </div>
              )}

              {/* Create new share link */}
              <div className={styles.createSection}>
                <h3 className={styles.sectionTitle}>{t('garage.share.createLink')}</h3>
                <div className={styles.form}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>{t('garage.share.privacy')}</label>
                    <select
                      className={styles.select}
                      value={privacy}
                      onChange={(e) => setPrivacy(e.target.value)}
                    >
                      <option value="unlisted">{t('garage.share.privacyUnlisted')}</option>
                      <option value="public">{t('garage.share.privacyPublic')}</option>
                      <option value="private">{t('garage.share.privacyPrivate')}</option>
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={showExpiry}
                        onChange={(e) => setShowExpiry(e.target.checked)}
                      />
                      {t('garage.share.setExpiry')}
                    </label>
                    {showExpiry && (
                      <input
                        type="datetime-local"
                        className={styles.input}
                        value={expiresAt || ''}
                        onChange={(e) => setExpiresAt(e.target.value)}
                      />
                    )}
                  </div>

                  <motion.button
                    type="button"
                    className={styles.createButton}
                    onClick={handleCreateLink}
                    disabled={creating}
                    whileHover={{ opacity: 0.9 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {creating ? t('garage.share.creating') : t('garage.share.createLink')}
                  </motion.button>
                </div>
              </div>

              {/* Existing share links */}
              {loading ? (
                <div className={styles.loading}>
                  <span>{t('garage.share.loading')}</span>
                </div>
              ) : shareLinks.length > 0 ? (
                <div className={styles.linksSection}>
                  <h3 className={styles.sectionTitle}>{t('garage.share.existingLinks')}</h3>
                  {shareLinks.map((link) => {
                    const shareUrl = getShareUrl(link.share_code);
                    const isExpired = link.expires_at && new Date(link.expires_at) < new Date();
                    return (
                      <div key={link.id} className={styles.linkCard}>
                        <div className={styles.linkInfo}>
                          <div className={styles.linkCode}>{link.share_code}</div>
                          <div className={styles.linkMeta}>
                            <span className={styles.privacyBadge}>{link.privacy}</span>
                            {link.expires_at && (
                              <span className={isExpired ? styles.expired : styles.expiry}>
                                {isExpired ? t('garage.share.expired') : formatDate(link.expires_at)}
                              </span>
                            )}
                            <span className={styles.accessCount}>
                              {t('garage.share.accessCount')}: {link.access_count || 0}
                            </span>
                          </div>
                        </div>

                        <div className={styles.linkActions}>
                          <motion.button
                            type="button"
                            className={styles.copyButton}
                            onClick={() => handleCopyLink(link.share_code)}
                            whileHover={{ opacity: 0.8 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            {copiedLink === link.share_code
                              ? t('garage.share.copied')
                              : t('garage.share.copyLink')}
                          </motion.button>

                          <select
                            className={styles.privacySelect}
                            value={link.privacy}
                            onChange={(e) => handleUpdatePrivacy(link.id, e.target.value)}
                          >
                            <option value="unlisted">{t('garage.share.privacyUnlisted')}</option>
                            <option value="public">{t('garage.share.privacyPublic')}</option>
                            <option value="private">{t('garage.share.privacyPrivate')}</option>
                          </select>

                          <motion.button
                            type="button"
                            className={styles.deleteButton}
                            onClick={() => handleDeleteLink(link.id)}
                            whileHover={{ opacity: 0.8 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            {t('garage.share.delete')}
                          </motion.button>
                        </div>

                        {/* QR Code */}
                        <div className={styles.qrCode}>
                          <QRCodeSVG value={shareUrl} size={128} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : loading ? (
                <div className={styles.loading}>
                  <span>{t('garage.share.loading')}</span>
                </div>
              ) : (
                <div className={styles.empty}>
                  <span>{t('garage.share.noLinks')}</span>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}

