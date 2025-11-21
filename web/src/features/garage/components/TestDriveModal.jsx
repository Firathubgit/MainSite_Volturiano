import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useGarageStore } from '../../../stores/garageStore';
import { useUserStore } from '../../../stores/userStore';
import styles from './TestDriveModal.module.css';

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
 * Test Drive Modal Component
 * @param {Object} props
 * @param {boolean} props.show - Whether to show the modal
 * @param {string} props.itemId - Garage item ID (optional)
 * @param {string} props.vehicleModel - Vehicle model (optional, pre-filled)
 * @param {Function} props.onClose - Callback when modal closes
 */
export default function TestDriveModal({ show, itemId, vehicleModel, onClose }) {
  const { t } = useTranslation('account');
  const { fetchDealers, createTestDriveRequest } = useGarageStore();
  const profile = useUserStore((state) => state.profile);
  const session = useUserStore((state) => state.session);

  const [dealers, setDealers] = useState([]);
  const [dealersLoading, setDealersLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    vehicle_model: vehicleModel || '',
    preferred_date: '',
    dealer_id: '',
    dealer: '',
    contact_name: profile?.display_name || session?.user?.email?.split('@')[0] || '',
    contact_email: session?.user?.email || '',
    contact_phone: '',
    notes: ''
  });

  // Fetch dealers on mount
  useEffect(() => {
    if (show) {
      loadDealers();
      // Reset form when modal opens
      setFormData({
        vehicle_model: vehicleModel || '',
        preferred_date: '',
        dealer_id: '',
        dealer: '',
        contact_name: profile?.display_name || session?.user?.email?.split('@')[0] || '',
        contact_email: session?.user?.email || '',
        contact_phone: '',
        notes: ''
      });
      setError(null);
      setSuccess(false);
    }
  }, [show, vehicleModel, profile, session]);

  const loadDealers = async () => {
    setDealersLoading(true);
    setError(null);
    try {
      const { data, error: dealersError } = await fetchDealers();
      if (dealersError) {
        console.error('[TestDriveModal] Failed to fetch dealers:', dealersError);
        const errorMessage = dealersError.message || 'Failed to load dealers';
        setError(errorMessage);
        // Still allow form submission even if dealers fail to load
        // User can manually enter dealer name
      } else {
        setDealers(data || []);
        // Auto-select if only one dealer
        if (data && data.length === 1) {
          setFormData(prev => ({
            ...prev,
            dealer_id: data[0].id,
            dealer: data[0].name
          }));
        }
      }
    } catch (err) {
      console.error('[TestDriveModal] Exception loading dealers:', err);
      setError(err.message || 'Failed to load dealers');
    } finally {
      setDealersLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleDealerChange = (dealerId) => {
    const selectedDealer = dealers.find(d => d.id === dealerId);
    setFormData(prev => ({
      ...prev,
      dealer_id: dealerId || '',
      dealer: selectedDealer?.name || ''
    }));
  };

  const validateForm = () => {
    if (!formData.vehicle_model.trim()) {
      setError('Vehicle model is required');
      return false;
    }
    if (!formData.preferred_date) {
      setError('Preferred date is required');
      return false;
    }
    const selectedDate = new Date(formData.preferred_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate < today) {
      setError('Preferred date must be in the future');
      return false;
    }
    // Dealer is required - either dealer_id (from select) or dealer (manual entry)
    if (!formData.dealer_id && !formData.dealer?.trim()) {
      setError('Dealer is required');
      return false;
    }
    if (!formData.contact_name.trim()) {
      setError('Contact name is required');
      return false;
    }
    if (!formData.contact_email.trim()) {
      setError('Contact email is required');
      return false;
    }
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.contact_email)) {
      setError('Please enter a valid email address');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    try {
      const { data, error: submitError } = await createTestDriveRequest(itemId, formData);
      
      if (submitError) {
        setError(submitError.message || 'Failed to submit request');
        return;
      }

      setSuccess(true);
      // Close modal after 2 seconds
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 2000);
    } catch (err) {
      console.error('[TestDriveModal] Exception submitting request:', err);
      setError(err.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate minimum date (tomorrow)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  // Determine dealer selector UI
  const showDealerSelector = dealers.length > 0 || dealersLoading;
  const singleDealer = dealers.length === 1;
  const multipleDealers = dealers.length > 1;

  if (!show) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        className={styles.overlay}
        variants={overlayVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        onClick={onClose}
      >
        <motion.div
          className={styles.panel}
          variants={panelVariants}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={styles.header}>
            <h2 className={styles.title}>{t('garage.testDrive.modal.title')}</h2>
            <button
              type="button"
              className={styles.closeButton}
              onClick={onClose}
              aria-label={t('common.close')}
            >
              ×
            </button>
          </div>

          {success ? (
            <div className={styles.successMessage}>
              <span className={styles.successIcon}>✓</span>
              <p>{t('garage.testDrive.modal.success')}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className={styles.form}>
              {/* Vehicle Model */}
              <div className={styles.field}>
                <label className={styles.label}>
                  {t('garage.testDrive.modal.vehicleModel')}
                </label>
                <input
                  type="text"
                  className={styles.input}
                  value={formData.vehicle_model}
                  onChange={(e) => handleInputChange('vehicle_model', e.target.value)}
                  required
                  disabled={!!vehicleModel}
                />
              </div>

              {/* Preferred Date */}
              <div className={styles.field}>
                <label className={styles.label}>
                  {t('garage.testDrive.modal.preferredDate')}
                </label>
                <input
                  type="date"
                  className={styles.input}
                  value={formData.preferred_date}
                  onChange={(e) => handleInputChange('preferred_date', e.target.value)}
                  min={minDate}
                  required
                />
              </div>

              {/* Dealer Selector */}
              <div className={styles.field}>
                <label className={styles.label}>
                  {t('garage.testDrive.modal.dealer')}
                </label>
                {dealersLoading ? (
                  <div className={styles.loading}>Loading dealers...</div>
                ) : singleDealer ? (
                  <div className={styles.dealerDisplay}>
                    <div className={styles.dealerName}>{dealers[0].name}</div>
                    {dealers[0].location && (
                      <div className={styles.dealerLocation}>{dealers[0].location}</div>
                    )}
                  </div>
                ) : multipleDealers ? (
                  <select
                    className={styles.select}
                    value={formData.dealer_id}
                    onChange={(e) => handleDealerChange(e.target.value)}
                    required
                  >
                    <option value="">Select a dealer</option>
                    {dealers.map((dealer) => (
                      <option key={dealer.id} value={dealer.id}>
                        {dealer.name} {dealer.location ? `- ${dealer.location}` : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="Enter dealer name"
                      value={formData.dealer}
                      onChange={(e) => handleInputChange('dealer', e.target.value)}
                      required
                    />
                    {error && error.includes('dealers') && (
                      <div className={styles.fieldHint}>
                        Dealers could not be loaded. Please enter dealer name manually.
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Contact Information */}
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>
                  {t('garage.testDrive.modal.contactInfo')}
                </h3>

                <div className={styles.field}>
                  <label className={styles.label}>
                    {t('garage.testDrive.modal.name')}
                  </label>
                  <input
                    type="text"
                    className={styles.input}
                    value={formData.contact_name}
                    onChange={(e) => handleInputChange('contact_name', e.target.value)}
                    required
                  />
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>
                    {t('garage.testDrive.modal.email')}
                  </label>
                  <input
                    type="email"
                    className={styles.input}
                    value={formData.contact_email}
                    onChange={(e) => handleInputChange('contact_email', e.target.value)}
                    required
                  />
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>
                    {t('garage.testDrive.modal.phone')}
                  </label>
                  <input
                    type="tel"
                    className={styles.input}
                    value={formData.contact_phone}
                    onChange={(e) => handleInputChange('contact_phone', e.target.value)}
                  />
                </div>
              </div>

              {/* Notes */}
              <div className={styles.field}>
                <label className={styles.label}>
                  {t('garage.testDrive.modal.notes')}
                </label>
                <textarea
                  className={styles.textarea}
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  rows={4}
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className={styles.errorMessage} role="alert">
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={onClose}
                  disabled={submitting}
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className={styles.submitButton}
                  disabled={submitting}
                >
                  {submitting ? t('garage.testDrive.modal.submitting') : t('garage.testDrive.modal.submit')}
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}

