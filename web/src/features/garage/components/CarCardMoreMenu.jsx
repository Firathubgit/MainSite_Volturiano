import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useGarageStore } from '../../../stores/garageStore';
import { getValidTargetStates, isTerminalState } from '../utils/stateTransitions';
import StateChangeDialog from './StateChangeDialog';
import TagSelectorDialog from './TagSelectorDialog';
import PdfExportModal from './PdfExportModal';
import PdfJobStatus from './PdfJobStatus';
import styles from './CarCardMoreMenu.module.css';

/**
 * CarCardMoreMenu - Combined menu for History, Share, Timeline, Ready for Delivery, and State Change
 * @param {Object} props
 * @param {string} props.itemId - Garage item ID
 * @param {string} props.currentState - Current state of the item
 * @param {Function} props.onHistory - Callback for History action
 * @param {Function} props.onShare - Callback for Share action
 * @param {Function} props.onTimeline - Callback for Timeline action
 * @param {Function} props.onReadyForDelivery - Callback for Ready for Delivery action
 */
export default function CarCardMoreMenu({
  itemId,
  currentState,
  onHistory,
  onShare,
  onTimeline,
  onReadyForDelivery
}) {
  const { t } = useTranslation('account');
  const { updateItemState, createPdfExport, pdfExports, pdfJobStatus } = useGarageStore();
  const [isOpen, setIsOpen] = useState(false);
  const [showStateDialog, setShowStateDialog] = useState(false);
  const [showTagDialog, setShowTagDialog] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [currentJobId, setCurrentJobId] = useState(null);
  const [pendingState, setPendingState] = useState(null);
  const [isChanging, setIsChanging] = useState(false);
  const menuRef = useRef(null);
  const buttonRef = useRef(null);
  
  // Get latest PDF job for this item
  const itemExports = pdfExports.get(itemId) || [];
  const latestJob = itemExports.length > 0 ? itemExports[0] : null;
  const jobStatus = latestJob ? pdfJobStatus.get(latestJob.id) || latestJob.status : null;

  const validTargetStates = getValidTargetStates(currentState || '');
  const isTerminal = isTerminalState(currentState || '');

  const getStateLabel = (state) => {
    return t(`garage.stateChange.states.${state}`, state);
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  const handleStateClick = (targetState) => {
    if (targetState === currentState) {
      setIsOpen(false);
      return;
    }

    const needsConfirmation = targetState === 'archived' || targetState === 'purchased';
    
    if (needsConfirmation) {
      setPendingState(targetState);
      setShowStateDialog(true);
      setIsOpen(false);
    } else {
      changeState(targetState);
      setIsOpen(false);
    }
  };

  const changeState = async (newState) => {
    if (!itemId || !newState) return;

    setIsChanging(true);
    try {
      const { error: changeError } = await updateItemState(itemId, newState, {
        source: 'manual'
      });

      if (changeError) {
        throw changeError;
      }
    } catch (err) {
      console.error('[CarCardMoreMenu] Failed to change state:', err);
    } finally {
      setIsChanging(false);
      setPendingState(null);
    }
  };

  const handleDialogConfirm = () => {
    setShowStateDialog(false);
    if (pendingState) {
      changeState(pendingState);
    }
  };

  const handleDialogCancel = () => {
    setShowStateDialog(false);
    setPendingState(null);
  };

  const handleMenuAction = (action) => {
    setIsOpen(false);
    if (action === 'history' && onHistory) {
      onHistory();
    } else if (action === 'share' && onShare) {
      onShare();
    } else if (action === 'ready' && onReadyForDelivery) {
      onReadyForDelivery();
    } else if (action === 'tags') {
      setShowTagDialog(true);
    } else if (action === 'timeline' && onTimeline) {
      onTimeline();
    } else if (action === 'exportPdf') {
      setShowPdfModal(true);
    }
  };

  const handlePdfExport = async (options) => {
    console.log('[CarCardMoreMenu] handlePdfExport called with options:', options);
    setShowPdfModal(false);
    
    try {
      console.log('[CarCardMoreMenu] Calling createPdfExport...');
      const { data, error } = await createPdfExport(itemId, options);
      console.log('[CarCardMoreMenu] createPdfExport returned:', { data, error });
      
      if (error) {
        console.error('[CarCardMoreMenu] Export failed:', error);
        alert(`PDF Export Failed: ${error.message || error}`);
        return;
      }
      
      if (data?.job_id) {
        console.log('[CarCardMoreMenu] Job created successfully, job_id:', data.job_id);
        setCurrentJobId(data.job_id);
      } else {
        console.warn('[CarCardMoreMenu] No job_id returned from export');
        alert('PDF Export started but no job ID received. Please check the logs.');
      }
    } catch (err) {
      console.error('[CarCardMoreMenu] Exception in handlePdfExport:', err);
      alert(`PDF Export Error: ${err.message || err}`);
    }
  };

  const getPdfStatusBadge = () => {
    if (!jobStatus) return null;
    
    switch (jobStatus) {
      case 'processing':
        return ' ⏳';
      case 'completed':
        return ' ✓';
      case 'failed':
        return ' ✗';
      default:
        return null;
    }
  };

  // Calculate menu position relative to button
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });
  
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right
      });
    }
  }, [isOpen]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={styles.moreButton}
        onClick={() => setIsOpen(!isOpen)}
        title={t('garage.actions.more', 'More options')}
      >
        {t('garage.actions.more', 'More...')}
        <span className={styles.arrow}>▼</span>
      </button>

      {isOpen && createPortal(
        <div
          className={styles.overlay}
          onClick={() => setIsOpen(false)}
        >
          <div
            ref={menuRef}
            className={styles.menu}
            style={{
              top: `${menuPosition.top}px`,
              right: `${menuPosition.right}px`
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* History */}
            <button
              type="button"
              className={styles.menuItem}
              onClick={() => handleMenuAction('history')}
            >
              {t('garage.actions.history')}
            </button>

            {/* Share */}
            <button
              type="button"
              className={styles.menuItem}
              onClick={() => handleMenuAction('share')}
            >
              {t('garage.actions.share')}
            </button>

            {/* Timeline */}
            <button
              type="button"
              className={styles.menuItem}
              onClick={() => handleMenuAction('timeline')}
            >
              {t('garage.actions.timeline', 'Timeline')}
            </button>

            {/* Export PDF */}
            <button
              type="button"
              className={styles.menuItem}
              onClick={() => handleMenuAction('exportPdf')}
            >
              {t('garage.pdfExport.exportButton', 'Export PDF')}
              {getPdfStatusBadge()}
            </button>

            {/* Edit Tags */}
            <button
              type="button"
              className={styles.menuItem}
              onClick={() => handleMenuAction('tags')}
            >
              {t('garage.tags.editTags')}
            </button>

            {/* Ready for Delivery */}
            <button
              type="button"
              className={styles.menuItem}
              onClick={() => handleMenuAction('ready')}
            >
              {t('garage.actions.viewReadyCars')}
            </button>

            {/* Divider */}
            {!isTerminal && validTargetStates.length > 0 && (
              <div className={styles.divider} />
            )}

            {/* State Change Options */}
            {!isTerminal && validTargetStates.length > 0 && (
              <>
                <div className={styles.menuSectionLabel}>
                  {t('garage.stateChange.title', 'Change State')}
                </div>
                {validTargetStates.map((state) => (
                  <button
                    key={state}
                    type="button"
                    className={`${styles.menuItem} ${
                      state === currentState ? styles.menuItemActive : ''
                    }`}
                    onClick={() => handleStateClick(state)}
                    disabled={isChanging}
                  >
                    <span className={styles.menuIcon}>
                      {state === currentState ? '✓' : '○'}
                    </span>
                    {getStateLabel(state)}
                  </button>
                ))}
              </>
            )}
          </div>
        </div>,
        document.body
      )}

      <StateChangeDialog
        show={showStateDialog}
        fromState={currentState}
        toState={pendingState}
        onConfirm={handleDialogConfirm}
        onCancel={handleDialogCancel}
      />

      <TagSelectorDialog
        show={showTagDialog}
        itemId={itemId}
        onClose={() => setShowTagDialog(false)}
      />

      <PdfExportModal
        show={showPdfModal}
        itemId={itemId}
        onClose={() => setShowPdfModal(false)}
        onExport={handlePdfExport}
      />

      {currentJobId && (
        <PdfJobStatus
          jobId={currentJobId}
          onClose={() => setCurrentJobId(null)}
        />
      )}
    </>
  );
}

