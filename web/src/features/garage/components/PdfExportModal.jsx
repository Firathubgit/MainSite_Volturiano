import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import styles from './PdfExportModal.module.css';

/**
 * PdfExportModal - Modal for PDF export options
 * @param {Object} props
 * @param {boolean} props.show - Whether modal is visible
 * @param {string} props.itemId - Garage item ID
 * @param {Function} props.onClose - Close callback
 * @param {Function} props.onExport - Export callback with options
 */
export default function PdfExportModal({ show, itemId, onClose, onExport }) {
  const { t } = useTranslation('account');
  const [watermark, setWatermark] = useState(false);
  const [includeQR, setIncludeQR] = useState(true);

  if (!show) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onExport({
      watermark,
      include_qr: includeQR,
      template: 'default'
    });
  };

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>{t('garage.pdfExport.modalTitle')}</h2>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label={t('common.close')}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.options}>
            <label className={styles.option}>
              <input
                type="checkbox"
                checked={watermark}
                onChange={(e) => setWatermark(e.target.checked)}
              />
              <span>{t('garage.pdfExport.watermark')}</span>
            </label>

            <label className={styles.option}>
              <input
                type="checkbox"
                checked={includeQR}
                onChange={(e) => setIncludeQR(e.target.checked)}
              />
              <span>{t('garage.pdfExport.includeQR')}</span>
            </label>
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={onClose}
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className={styles.exportButton}
            >
              {t('garage.pdfExport.generate')}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}


