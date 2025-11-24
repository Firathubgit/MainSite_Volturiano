import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, X } from 'lucide-react';
import AdminModal from '../ui/AdminModal';
import AdminButton from '../ui/AdminButton';
import AdminInput from '../ui/AdminInput';
import { validateManifest, publishManifest } from '../../api/manifests';
import styles from './PublishWorkflow.module.css';

export default function PublishWorkflow({ manifest, isOpen, onClose, onPublished }) {
  const [step, setStep] = useState(1);
  const [validationResults, setValidationResults] = useState(null);
  const [version, setVersion] = useState('');
  const [archiveOld, setArchiveOld] = useState(true);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    if (isOpen && manifest) {
      setStep(1);
      setVersion(manifest.version ? (manifest.version + 1).toString() : '1');
      setArchiveOld(true);
      validateManifest(manifest).then(result => {
        setValidationResults(result);
      });
    }
  }, [isOpen, manifest]);

  const handlePublish = async () => {
    if (!manifest) return;
    
    setPublishing(true);
    try {
      await publishManifest(manifest.id);
      if (onPublished) onPublished();
      onClose();
    } catch (err) {
      console.error('Publish failed:', err);
      alert('Publish failed: ' + err.message);
    } finally {
      setPublishing(false);
    }
  };

  if (!isOpen || !manifest) return null;

  return (
    <AdminModal
      open={isOpen}
      onClose={onClose}
      title="Publish Manifest"
      size="lg"
      closeOnOverlayClick={false}
    >
      <div className={styles.container}>
        {step === 1 && (
          <div className={styles.step}>
            <h3 className={styles.stepTitle}>Validation</h3>
            <p className={styles.stepDescription}>Checking manifest for errors...</p>
            
            {validationResults ? (
              <div className={styles.validationResults}>
                {validationResults.valid ? (
                  <div className={styles.success}>
                    <CheckCircle size={20} className={styles.icon} />
                    <div>
                      <p className={styles.successTitle}>Validation Passed</p>
                      <p className={styles.successText}>Manifest is ready to publish.</p>
                    </div>
                  </div>
                ) : (
                  <div className={styles.errors}>
                    <AlertCircle size={20} className={styles.errorIcon} />
                    <div>
                      <p className={styles.errorTitle}>Validation Failed</p>
                      <ul className={styles.errorList}>
                        {validationResults.errors.map((error, i) => (
                          <li key={i}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className={styles.loading}>Validating...</div>
            )}

            <div className={styles.actions}>
              <AdminButton variant="secondary" onClick={onClose}>Cancel</AdminButton>
              {validationResults && validationResults.valid && (
                <AdminButton variant="primary" onClick={() => setStep(2)}>Continue</AdminButton>
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className={styles.step}>
            <h3 className={styles.stepTitle}>Version & Archive</h3>
            <p className={styles.stepDescription}>Configure version and archive settings.</p>
            
            <div className={styles.form}>
              <AdminInput
                label="New Version"
                type="number"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                required
              />
              
              <div className={styles.checkboxRow}>
                <input
                  type="checkbox"
                  id="archiveOld"
                  checked={archiveOld}
                  onChange={(e) => setArchiveOld(e.target.checked)}
                  className={styles.checkbox}
                />
                <label htmlFor="archiveOld" className={styles.checkboxLabel}>
                  Archive previous published version
                </label>
              </div>
            </div>

            <div className={styles.actions}>
              <AdminButton variant="secondary" onClick={() => setStep(1)}>Back</AdminButton>
              <AdminButton variant="primary" onClick={handlePublish} loading={publishing}>
                Publish
              </AdminButton>
            </div>
          </div>
        )}
      </div>
    </AdminModal>
  );
}

