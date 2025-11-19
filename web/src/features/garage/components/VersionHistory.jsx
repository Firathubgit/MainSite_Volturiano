import React, { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useGarageStore } from '../../../stores/garageStore';
import RestoreVersionDialog from './RestoreVersionDialog';
import ConfigDiff from './ConfigDiff';
import ConfiguratorTypeBadge from './ConfiguratorTypeBadge';
import { getDiffSummary } from '../utils/diffConfig';
import { detectConfiguratorType } from '../utils/configuratorType';
import styles from './VersionHistory.module.css';

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
 * Version history component displaying timeline of versions for a garage item
 * @param {Object} props
 * @param {boolean} props.show - Whether to show the modal
 * @param {string} props.itemId - Garage item ID
 * @param {Function} props.onClose - Callback when modal is closed
 */
export default function VersionHistory({ show, itemId, onClose }) {
  const { t } = useTranslation('account');
  const loadVersions = useGarageStore((state) => state.loadVersions);
  const restoreVersion = useGarageStore((state) => state.restoreVersion);
  const items = useGarageStore((state) => state.items);
  const versionsCache = useGarageStore((state) => state.versions);
  
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedVersion, setExpandedVersion] = useState(null);
  const [restoreDialog, setRestoreDialog] = useState(null);
  const [restoring, setRestoring] = useState(false);
  
  // Use ref to prevent race conditions
  const loadingRef = useRef(false);
  const currentItemIdRef = useRef(null);

  const currentItem = itemId ? items.get(itemId) : null;
  const currentConfig = currentItem?.config_payload;

  // Load versions function with proper cache handling
  const loadVersionsData = useCallback(async (targetItemId, forceRefresh = false) => {
    console.log('[VersionHistory] loadVersionsData called with itemId:', targetItemId, 'forceRefresh:', forceRefresh);
    
    // Prevent concurrent loads
    if (loadingRef.current && currentItemIdRef.current === targetItemId && !forceRefresh) {
      console.log('[VersionHistory] Already loading, skipping duplicate request');
      return;
    }

    // Check cache first (unless forcing refresh)
    const cachedVersions = versionsCache.get(targetItemId);
    const hasCachedData = cachedVersions && cachedVersions.length > 0 && !forceRefresh;
    console.log('[VersionHistory] Cache check:', hasCachedData ? `${cachedVersions.length} cached versions` : 'no cache');
    
    if (hasCachedData) {
      console.log('[VersionHistory] Using cached data, showing immediately');
      // Use cached data immediately - show it right away
      setVersions(cachedVersions);
      setError(null);
      // Don't show loading overlay when we have cached data - it's instant!
      setLoading(false);
      
      // Fetch fresh data in background (loadVersions will handle this automatically)
      console.log('[VersionHistory] Background refresh will happen automatically via loadVersions');
      loadingRef.current = true;
      currentItemIdRef.current = targetItemId;
      
      try {
        console.log('[VersionHistory] Background refresh starting...');
        const refreshStartTime = Date.now();
        const { data, error: loadError } = await loadVersions(targetItemId, false); // Will use cache and refresh in background
        const refreshDuration = Date.now() - refreshStartTime;
        console.log('[VersionHistory] Background refresh completed in', refreshDuration, 'ms');
        
        if (!loadError && data) {
          console.log('[VersionHistory] Background refresh successful, updating versions:', data.length);
          setVersions(data);
        } else if (loadError) {
          // Keep showing cached data even if refresh fails
          console.warn('[VersionHistory] Background refresh failed:', loadError);
        }
      } catch (err) {
        console.warn('[VersionHistory] Background refresh exception:', err);
        // Keep cached data visible
      } finally {
        loadingRef.current = false;
      }
      return;
    }

    // No cache, show loading overlay and fetch
    console.log('[VersionHistory] No cache, fetching from API...');
    loadingRef.current = true;
    currentItemIdRef.current = targetItemId;
    setLoading(true);
    setError(null);
    
    try {
      const fetchStartTime = Date.now();
      console.log('[VersionHistory] Calling loadVersions...');
      const { data, error: loadError } = await loadVersions(targetItemId, forceRefresh);
      const fetchDuration = Date.now() - fetchStartTime;
      console.log('[VersionHistory] loadVersions completed in', fetchDuration, 'ms');
      
      if (loadError) {
        console.error('[VersionHistory] Load error received:', loadError);
        setError(loadError);
        setVersions([]);
      } else {
        console.log('[VersionHistory] Load successful, received', data?.length || 0, 'versions');
        setVersions(data || []);
      }
    } catch (err) {
      console.error('[VersionHistory] Load exception:', err);
      console.error('[VersionHistory] Exception stack:', err.stack);
      setError(err);
      setVersions([]);
    } finally {
      console.log('[VersionHistory] Load finished, hiding loading overlay');
      setLoading(false);
      loadingRef.current = false;
    }
  }, [loadVersions, versionsCache]);

  // Load versions when modal opens
  useEffect(() => {
    console.log('[VersionHistory] useEffect triggered:', { show, itemId });
    if (show && itemId) {
      console.log('[VersionHistory] Modal opened, loading versions for itemId:', itemId);
      // Load with cache first (fast), then refresh in background
      loadVersionsData(itemId, false);
    } else if (!show) {
      console.log('[VersionHistory] Modal closed, clearing error state');
      // Don't clear versions immediately - keep them for smooth re-opening
      setExpandedVersion(null);
      setRestoreDialog(null);
      setError(null);
      setLoading(false);
      loadingRef.current = false;
      currentItemIdRef.current = null;
    }
  }, [show, itemId, loadVersionsData]);

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

  const handleRestore = async (version) => {
    setRestoring(true);
    try {
      const { error: restoreError } = await restoreVersion(itemId, version.version_number);
      if (restoreError) {
        console.error('[VersionHistory] Restore failed:', restoreError);
        alert(t('garage.restore.error') || `Failed to restore: ${restoreError.message}`);
      } else {
        // Close dialogs
        setRestoreDialog(null);
        // Reload versions to show the new version created by restore
        // Invalidate cache by clearing loading ref
        loadingRef.current = false;
        await loadVersionsData(itemId);
      }
    } catch (err) {
      console.error('[VersionHistory] Restore exception:', err);
      alert(t('garage.restore.error') || `Failed to restore: ${err.message}`);
    } finally {
      setRestoring(false);
    }
  };

  const handleExpandVersion = (versionNumber) => {
    setExpandedVersion(expandedVersion === versionNumber ? null : versionNumber);
  };

  // Use portal to render outside DOM hierarchy (prevents z-index and positioning issues)
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!show || !mounted) {
    return null;
  }

  // Render modal content using portal to document.body
  const modalContent = (
    <>
      <AnimatePresence>
        {show && (
          <motion.div
            className={styles.overlay}
            role="dialog"
            aria-modal="true"
            aria-labelledby="version-history-title"
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
                <h2 id="version-history-title" className={styles.title}>
                  {t('garage.versionHistory.title')}
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
                {/* Loading overlay - shown on top of content */}
                {loading && (
                  <div className={styles.loadingOverlay}>
                    <div className={styles.loadingSpinner}>
                      <span>{t('garage.versionHistory.loading')}</span>
                    </div>
                  </div>
                )}

                {/* Error message */}
                {error && (
                  <div className={styles.error}>
                    <span>{t('garage.versionHistory.error')}: {error.message}</span>
                  </div>
                )}

                {/* Empty state - only show when not loading and no versions */}
                {!loading && !error && versions.length === 0 && (
                  <div className={styles.empty}>
                    <span>{t('garage.versionHistory.empty')}</span>
                  </div>
                )}

                {/* Timeline - always render if we have versions, even during loading */}
                {versions.length > 0 && (
                  <div className={styles.timeline}>
                    {versions.map((version, index) => {
                      const isExpanded = expandedVersion === version.version_number;
                      const isLatest = index === 0;
                      const previousVersion = index < versions.length - 1 ? versions[index + 1] : null;
                      const versionType = version.snapshot ? detectConfiguratorType(version.snapshot) : null;
                      const previousType = previousVersion?.snapshot ? detectConfiguratorType(previousVersion.snapshot) : null;
                      const typeChanged = versionType && previousType && versionType !== previousType;

                      return (
                        <div
                          key={version.id}
                          className={`${styles.timelineItem} ${isLatest ? styles.latest : ''} ${typeChanged ? styles.typeChanged : ''}`}
                        >
                          <div className={styles.timelineMarker} />
                          <div className={styles.timelineContent}>
                            <div className={styles.versionHeader}>
                              <div className={styles.versionInfo}>
                                <div className={styles.versionNumberRow}>
                                  <span className={styles.versionNumber}>
                                    {t('garage.versionHistory.version')} {version.version_number}
                                  </span>
                                  {versionType && (
                                    <ConfiguratorTypeBadge type={versionType} size="small" />
                                  )}
                                  {typeChanged && (
                                    <span className={styles.typeChangeIndicator} title={t('garage.versionHistory.configuratorTypeChanged')}>
                                      🔄
                                    </span>
                                  )}
                                </div>
                                <span className={styles.versionDate}>
                                  {formatDate(version.created_at)}
                                </span>
                              </div>
                              {isLatest && (
                                <span className={styles.latestBadge}>
                                  {t('garage.versionHistory.current')}
                                </span>
                              )}
                            </div>

                            {version.diff_summary && version.diff_summary.length > 0 && (
                              <div className={styles.diffSummary}>
                                {getDiffSummary(version.diff_summary)}
                              </div>
                            )}

                            <div className={styles.versionActions}>
                              <button
                                type="button"
                                className={styles.viewButton}
                                onClick={() => handleExpandVersion(version.version_number)}
                              >
                                {isExpanded
                                  ? t('garage.versionHistory.hideSnapshot')
                                  : t('garage.versionHistory.viewSnapshot')}
                              </button>
                              {!isLatest && (
                                <button
                                  type="button"
                                  className={styles.restoreButton}
                                  onClick={() => setRestoreDialog(version)}
                                >
                                  {t('garage.versionHistory.restore')}
                                </button>
                              )}
                            </div>

                            {isExpanded && (
                              <div className={styles.expandedContent}>
                                {previousVersion ? (
                                  <ConfigDiff
                                    oldConfig={previousVersion.snapshot}
                                    newConfig={version.snapshot}
                                    diffSummary={version.diff_summary}
                                  />
                                ) : (
                                  <div className={styles.snapshotInfo}>
                                    <span>{t('garage.versionHistory.initialVersion')}</span>
                                    {versionType && (
                                      <div className={styles.snapshotType}>
                                        <ConfiguratorTypeBadge type={versionType} size="small" />
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <RestoreVersionDialog
        show={!!restoreDialog}
        version={restoreDialog}
        currentConfig={currentConfig}
        onConfirm={() => handleRestore(restoreDialog)}
        onCancel={() => setRestoreDialog(null)}
        loading={restoring}
      />
    </>
  );

  // Render modal content in portal to document.body (outside any card/container)
  // This prevents z-index and positioning issues from parent containers
  return createPortal(modalContent, document.body);
}


