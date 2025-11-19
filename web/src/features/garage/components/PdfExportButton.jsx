import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGarageStore } from '../../../stores/garageStore';
import PdfExportModal from './PdfExportModal';
import PdfJobStatus from './PdfJobStatus';
import styles from './PdfExportButton.module.css';

/**
 * PdfExportButton - Button to trigger PDF export with status indicator
 * @param {Object} props
 * @param {string} props.itemId - Garage item ID
 */
export default function PdfExportButton({ itemId }) {
  const { t } = useTranslation('account');
  const { createPdfExport, pdfExports, pdfJobStatus } = useGarageStore();
  const [showModal, setShowModal] = useState(false);
  const [currentJobId, setCurrentJobId] = useState(null);

  // Get latest job for this item
  const itemExports = pdfExports.get(itemId) || [];
  const latestJob = itemExports.length > 0 ? itemExports[0] : null;
  const jobStatus = latestJob ? pdfJobStatus.get(latestJob.id) || latestJob.status : null;

  const handleExport = async (options) => {
    console.log('[PdfExportButton] handleExport called with options:', options);
    setShowModal(false);
    
    try {
      console.log('[PdfExportButton] Calling createPdfExport...');
      const { data, error } = await createPdfExport(itemId, options);
      console.log('[PdfExportButton] createPdfExport returned:', { data, error });
      
      if (error) {
        console.error('[PdfExportButton] Export failed:', error);
        console.error('[PdfExportButton] Error details:', {
          message: error.message,
          name: error.name,
          stack: error.stack
        });
        // Show error to user
        alert(`PDF Export Failed: ${error.message || error}`);
        return;
      }
      
      if (data?.job_id) {
        console.log('[PdfExportButton] Job created successfully, job_id:', data.job_id);
        setCurrentJobId(data.job_id);
      } else {
        console.warn('[PdfExportButton] No job_id returned from export');
        console.warn('[PdfExportButton] Response data:', data);
        alert('PDF Export started but no job ID received. Please check the logs.');
      }
    } catch (err) {
      console.error('[PdfExportButton] Exception in handleExport:', err);
      console.error('[PdfExportButton] Exception stack:', err.stack);
      alert(`PDF Export Error: ${err.message || err}`);
    }
  };

  const getStatusBadge = () => {
    if (!jobStatus) return null;
    
    switch (jobStatus) {
      case 'processing':
        return <span className={styles.badgeProcessing}>{t('garage.pdfExport.processing')}</span>;
      case 'completed':
        return <span className={styles.badgeCompleted}>{t('garage.pdfExport.ready')}</span>;
      case 'failed':
        return <span className={styles.badgeFailed}>{t('garage.pdfExport.failed')}</span>;
      default:
        return null;
    }
  };

  return (
    <>
      <button
        type="button"
        className={styles.exportButton}
        onClick={() => setShowModal(true)}
        title={t('garage.pdfExport.exportButton')}
      >
        {t('garage.pdfExport.exportButton')}
        {getStatusBadge()}
      </button>

      <PdfExportModal
        show={showModal}
        itemId={itemId}
        onClose={() => setShowModal(false)}
        onExport={handleExport}
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

