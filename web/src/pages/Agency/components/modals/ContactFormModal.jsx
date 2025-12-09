import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { Button } from '../ui/Button';
import { Input, Select, TextArea } from '../ui/Input';
import { SERVICES } from '../../constants';
import { supabase } from '../../../../lib/supabaseClient';
import styles from './ContactFormModal.module.css';

export function ContactFormModal({ isOpen, onClose, initialServiceId }) {
  const { t } = useTranslation('agency');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    service_interests: [],
    budget_range: '',
    project_timeline: '',
    message: '',
    privacy_consent: false,
  });

  useEffect(() => {
    if (isOpen) {
      if (initialServiceId) {
        const serviceName = SERVICES.find(s => s.id === initialServiceId)?.title;
        if (serviceName) {
          setFormData(prev => ({ ...prev, service_interests: [serviceName] }));
        }
      } else {
        setFormData(prev => ({ ...prev, service_interests: [] }));
      }
      setError(null);
      setSuccess(false);
    }
  }, [isOpen, initialServiceId]);

  const toggleService = (service) => {
    setFormData(prev => {
      const exists = prev.service_interests.includes(service);
      if (exists) {
        return { ...prev, service_interests: prev.service_interests.filter(s => s !== service) };
      }
      return { ...prev, service_interests: [...prev.service_interests, service] };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.service_interests.length === 0) {
      setError(t('contactModal.form.errors.selectService'));
      return;
    }
    
    if (!formData.privacy_consent) {
      setError(t('contactModal.form.errors.privacyConsent'));
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }

      const { data, error: apiError } = await supabase.functions.invoke('send-agency-inquiry', {
        body: {
          name: formData.name,
          email: formData.email,
          company: formData.company || null,
          service_interests: formData.service_interests,
          budget_range: formData.budget_range,
          project_timeline: formData.project_timeline,
          message: formData.message || null
        }
      });

      if (apiError) {
        throw apiError;
      }

      if (data && !data.success) {
        throw new Error(data.error || 'Failed to submit inquiry');
      }

      setLoading(false);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
        // Reset form
        setFormData({
          name: '',
          email: '',
          company: '',
          service_interests: [],
          budget_range: '',
          project_timeline: '',
          message: '',
          privacy_consent: false,
        });
      }, 2000);
    } catch (err) {
      console.error('[ContactFormModal] Submission error:', err);
      setLoading(false);
      setError(err.message || 'Failed to submit inquiry. Please try again.');
    }
  };

  const messageLength = formData.message?.length || 0;
  const maxMessageLength = 2000;

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className={styles.overlay}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={styles.modalContainer}
          >
            <div className={styles.modal}>
              <div className={styles.content}>
                <button 
                  onClick={onClose}
                  className={styles.closeButton}
                  aria-label="Close modal"
                >
                  <X size={24} />
                </button>

                {success ? (
                  <div className={styles.successContainer}>
                    <div className={styles.successIcon}>
                      <Check className={styles.successCheck} size={32} />
                    </div>
                    <h3 className={styles.successTitle}>{t('contactModal.success.title')}</h3>
                    <p className={styles.successMessage}>{t('contactModal.success.message')}</p>
                  </div>
                ) : (
                  <>
                    <h2 className={styles.title}>{t('contactModal.title')}</h2>
                    <p className={styles.subtitle}>{t('contactModal.subtitle')}</p>

                    {error && (
                      <div className={styles.errorMessage}>
                        {error}
                      </div>
                    )}

                    <form onSubmit={handleSubmit} className={styles.form}>
                      <div className={styles.formRow}>
                        <Input 
                          label={t('contactModal.form.name')} 
                          required 
                          value={formData.name}
                          onChange={e => setFormData({...formData, name: e.target.value})}
                          placeholder={t('contactModal.form.namePlaceholder')}
                          error={error && !formData.name ? t('contactModal.form.errors.nameRequired') : null}
                        />
                        <Input 
                          label={t('contactModal.form.email')} 
                          type="email" 
                          required 
                          value={formData.email}
                          onChange={e => setFormData({...formData, email: e.target.value})}
                          placeholder={t('contactModal.form.emailPlaceholder')}
                          error={error && !formData.email ? t('contactModal.form.errors.emailRequired') : null}
                        />
                      </div>
                      
                      <Input 
                        label={t('contactModal.form.company')} 
                        value={formData.company}
                        onChange={e => setFormData({...formData, company: e.target.value})}
                        placeholder={t('contactModal.form.companyPlaceholder')}
                      />

                      <div className={styles.serviceInterestContainer}>
                        <label className={styles.serviceInterestLabel}>{t('contactModal.form.serviceInterest')}</label>
                        <div className={styles.serviceGrid}>
                          {SERVICES.map(service => (
                            <button
                              type="button"
                              key={service.id}
                              onClick={() => toggleService(t(`services.items.${service.id}.title`))}
                              className={`${styles.serviceButton} ${
                                formData.service_interests.includes(t(`services.items.${service.id}.title`))
                                  ? styles.serviceButtonActive
                                  : ''
                              }`}
                            >
                              {t(`services.items.${service.id}.title`)}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className={styles.formRow}>
                        <Select 
                          label={t('contactModal.form.budgetRange')} 
                          options={t('contactModal.budgetRanges', { returnObjects: true })}
                          required
                          value={formData.budget_range}
                          onChange={e => setFormData({...formData, budget_range: e.target.value})}
                          placeholder={t('contactModal.form.budgetPlaceholder')}
                        />
                        <Select 
                          label={t('contactModal.form.timeline')} 
                          options={t('contactModal.timelines', { returnObjects: true })}
                          required
                          value={formData.project_timeline}
                          onChange={e => setFormData({...formData, project_timeline: e.target.value})}
                          placeholder={t('contactModal.form.timelinePlaceholder')}
                        />
                      </div>

                      <div className={styles.textareaContainer}>
                        <TextArea 
                          label={t('contactModal.form.brief')}
                          maxLength={maxMessageLength}
                          placeholder={t('contactModal.form.briefPlaceholder')}
                          value={formData.message}
                          onChange={e => setFormData({...formData, message: e.target.value})}
                        />
                        <div className={styles.charCounter}>
                          {messageLength} / {maxMessageLength}
                        </div>
                      </div>

                      <div className={styles.checkboxContainer}>
                        <input 
                          type="checkbox" 
                          id="privacy"
                          required
                          checked={formData.privacy_consent}
                          onChange={e => setFormData({...formData, privacy_consent: e.target.checked})}
                          className={styles.checkbox}
                        />
                        <label htmlFor="privacy" className={styles.checkboxLabel}>
                          {t('contactModal.form.privacyConsent')}
                        </label>
                      </div>

                      <div className={styles.formActions}>
                        <Button type="button" variant="ghost" onClick={onClose}>{t('contactModal.form.cancel')}</Button>
                        <Button type="submit" disabled={loading}>
                          {loading ? t('contactModal.form.processing') : t('contactModal.form.submit')}
                        </Button>
                      </div>
                    </form>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}

