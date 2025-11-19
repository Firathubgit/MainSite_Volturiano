import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useGarageStore } from '../../../stores/garageStore';
import styles from './PdfJobStatus.module.css';

/**
 * PdfJobStatus - Component for displaying PDF job progress and download
 * @param {Object} props
 * @param {string} props.jobId - Job ID
 * @param {Function} props.onClose - Close callback
 */
export default function PdfJobStatus({ jobId, onClose }) {
  const { t } = useTranslation('account');
  const { getPdfJobStatus, downloadPdf } = useGarageStore();
  const [status, setStatus] = useState('processing');
  const [error, setError] = useState(null);
  const [polling, setPolling] = useState(true);

  useEffect(() => {
    if (!jobId || !polling) return;

    let pollInterval;
    let retryCount = 0;
    const maxRetries = 3;

    const pollStatus = async () => {
      try {
        const { data, error: statusError } = await getPdfJobStatus(jobId);
        
        if (statusError) {
          retryCount++;
          if (retryCount >= maxRetries) {
            setError(statusError);
            setPolling(false);
          }
          return;
        }

        if (data) {
          setStatus(data.status);
          
          if (data.status === 'completed' || data.status === 'failed') {
            setPolling(false);
            if (data.status === 'failed') {
              setError(data.error_message || t('garage.pdfExport.generationFailed'));
            }
          }
        }
      } catch (err) {
        retryCount++;
        if (retryCount >= maxRetries) {
          setError(err);
          setPolling(false);
        }
      }
    };

    // Poll immediately, then every 2 seconds
    pollStatus();
    pollInterval = setInterval(pollStatus, 2000);

    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [jobId, polling, getPdfJobStatus, t]);

  const handleDownload = async () => {
    const { error: downloadError } = await downloadPdf(jobId);
    if (downloadError) {
      setError(downloadError);
    }
  };

  const getStatusMessage = () => {
    switch (status) {
      case 'queued':
        return t('garage.pdfExport.statusQueued');
      case 'processing':
        return t('garage.pdfExport.statusProcessing');
      case 'completed':
        return t('garage.pdfExport.statusCompleted');
      case 'failed':
        return t('garage.pdfExport.statusFailed');
      default:
        return t('garage.pdfExport.statusUnknown');
    }
  };

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.statusCard} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>{t('garage.pdfExport.statusTitle')}</h3>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label={t('common.close')}
          >
            ×
          </button>
        </div>

        <div className={styles.content}>
          <div className={styles.status}>
            <div className={`${styles.statusIndicator} ${styles[`status${status.charAt(0).toUpperCase() + status.slice(1)}`]}`}>
              {status === 'queued' && (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2" fill="none" />
                  <path d="M10 6v4l3 2" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
                </svg>
              )}
              {status === 'processing' && (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2" fill="none" strokeDasharray="12.566" strokeDashoffset="6.283">
                    <animate attributeName="stroke-dashoffset" values="6.283;0;6.283" dur="1.5s" repeatCount="indefinite" />
                  </circle>
                </svg>
              )}
              {status === 'completed' && (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <circle cx="10" cy="10" r="8" fill="currentColor" opacity="0.2" />
                  <path d="M7 10l2 2 4-4" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              {status === 'failed' && (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <circle cx="10" cy="10" r="8" fill="currentColor" opacity="0.2" />
                  <path d="M7 7l6 6M13 7l-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              )}
            </div>
            <span className={styles.statusText}>{getStatusMessage()}</span>
          </div>

          {error && (
            <div className={styles.error}>
              {error.message || error}
            </div>
          )}

          {status === 'completed' && (
            <button
              type="button"
              className={styles.downloadButton}
              onClick={handleDownload}
            >
              {t('garage.pdfExport.download')}
            </button>
          )}

          {status === 'failed' && (
            <button
              type="button"
              className={styles.retryButton}
              onClick={() => {
                setError(null);
                setPolling(true);
                setStatus('processing');
              }}
            >
              {t('garage.pdfExport.retry')}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}


