import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Calendar, Video, Phone, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { Button } from '../ui/Button';
import { Input, Select, TextArea } from '../ui/Input';
import { SERVICES } from '../../constants';
import { supabase } from '../../../../lib/supabaseClient';
import styles from './DemoRequestModal.module.css';

export function DemoRequestModal({ isOpen, onClose, initialServiceId }) {
  const { t } = useTranslation('agency');
  
  const meetingTypes = [
    { id: 'video', label: t('demoModal.form.meetingTypes.video'), icon: Video },
    { id: 'phone', label: t('demoModal.form.meetingTypes.phone'), icon: Phone },
    { id: 'in-person', label: t('demoModal.form.meetingTypes.inPerson'), icon: Users },
  ];
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    preferred_service: '',
    preferred_date: '',
    preferred_time: '',
    timezone: '',
    meeting_type: 'video',
    additional_notes: '',
  });

  useEffect(() => {
    if (isOpen) {
      if (initialServiceId) {
        setFormData(prev => ({ ...prev, preferred_service: initialServiceId }));
      }
      setError(null);
      setSuccess(false);
    }
  }, [isOpen, initialServiceId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    // Validate date is in the future
    if (formData.preferred_date && formData.preferred_time) {
      const selectedDateTime = new Date(`${formData.preferred_date}T${formData.preferred_time}`);
      const now = new Date();
      if (selectedDateTime <= now) {
        setLoading(false);
        setError(t('demoModal.form.errors.futureDateTime'));
        return;
      }
    }
    
    try {
      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }

      // Combine date and time into ISO 8601 datetime string
      const datetime = formData.preferred_date && formData.preferred_time
        ? new Date(`${formData.preferred_date}T${formData.preferred_time}`).toISOString()
        : null;

      if (!datetime) {
        throw new Error(t('demoModal.form.errors.dateTimeRequired'));
      }

      const { data, error: apiError } = await supabase.functions.invoke('schedule-demo', {
        body: {
          name: formData.name,
          email: formData.email,
          company: formData.company || null,
          preferred_service: formData.preferred_service,
          preferred_datetime: datetime,
          timezone: formData.timezone,
          meeting_type: formData.meeting_type,
          additional_notes: formData.additional_notes || null
        }
      });

      if (apiError) {
        throw apiError;
      }

      if (data && !data.success) {
        throw new Error(data.error || 'Failed to submit demo request');
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
          preferred_service: '',
          preferred_date: '',
          preferred_time: '',
          timezone: '',
          meeting_type: 'video',
          additional_notes: '',
        });
      }, 2000);
    } catch (err) {
      console.error('[DemoRequestModal] Submission error:', err);
      setLoading(false);
      setError(err.message || 'Failed to submit demo request. Please try again.');
    }
  };

  const notesLength = formData.additional_notes?.length || 0;
  const maxNotesLength = 1000;

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
                      <Calendar className={styles.successIconInner} size={32} />
                    </div>
                    <h3 className={styles.successTitle}>{t('demoModal.success.title')}</h3>
                    <p className={styles.successMessage}>{t('demoModal.success.message')}</p>
                  </div>
                ) : (
                  <>
                    <h2 className={styles.title}>{t('demoModal.title')}</h2>
                    <p className={styles.subtitle}>{t('demoModal.subtitle')}</p>

                    {error && (
                      <div className={styles.errorMessage}>
                        {error}
                      </div>
                    )}

                    <form onSubmit={handleSubmit} className={styles.form}>
                      <div className={styles.formRow}>
                        <Input 
                          label={t('demoModal.form.name')} 
                          required 
                          value={formData.name}
                          onChange={e => setFormData({...formData, name: e.target.value})}
                          placeholder={t('demoModal.form.namePlaceholder')}
                        />
                        <Input 
                          label={t('demoModal.form.email')} 
                          type="email" 
                          required 
                          value={formData.email}
                          onChange={e => setFormData({...formData, email: e.target.value})}
                          placeholder={t('demoModal.form.emailPlaceholder')}
                        />
                      </div>

                      <Input 
                        label={t('demoModal.form.company')} 
                        value={formData.company}
                        onChange={e => setFormData({...formData, company: e.target.value})}
                        placeholder={t('demoModal.form.companyPlaceholder')}
                      />

                      <div className={styles.selectContainer}>
                        <label className={styles.selectLabel}>{t('demoModal.form.serviceFocus')}</label>
                        <select 
                          className={styles.serviceSelect}
                          required
                          value={formData.preferred_service}
                          onChange={e => setFormData({...formData, preferred_service: e.target.value})}
                        >
                          <option value="" disabled>{t('demoModal.form.serviceFocusPlaceholder')}</option>
                          {SERVICES.map(s => (
                            <option key={s.id} value={s.id}>{t(`services.items.${s.id}.title`)}</option>
                          ))}
                        </select>
                      </div>

                      <div className={styles.datetimeRow}>
                        <Input 
                          label={t('demoModal.form.date')} 
                          type="date"
                          required
                          min={new Date().toISOString().split('T')[0]}
                          value={formData.preferred_date}
                          onChange={e => setFormData({...formData, preferred_date: e.target.value})}
                        />
                        <Input 
                          label={t('demoModal.form.time')} 
                          type="time"
                          required
                          value={formData.preferred_time}
                          onChange={e => setFormData({...formData, preferred_time: e.target.value})}
                        />
                        <Select 
                          label={t('demoModal.form.timezone')}
                          options={t('demoModal.timezones', { returnObjects: true })}
                          required
                          value={formData.timezone}
                          onChange={e => setFormData({...formData, timezone: e.target.value})}
                          placeholder={t('demoModal.form.timezonePlaceholder')}
                        />
                      </div>

                      <div className={styles.meetingTypeContainer}>
                        <label className={styles.meetingTypeLabel}>{t('demoModal.form.preference')}</label>
                        <div className={styles.meetingTypeGrid}>
                          {meetingTypes.map(type => {
                            const IconComponent = type.icon;
                            return (
                              <button
                                type="button"
                                key={type.id}
                                onClick={() => setFormData({...formData, meeting_type: type.id})}
                                className={`${styles.meetingTypeButton} ${
                                  formData.meeting_type === type.id
                                    ? styles.meetingTypeButtonActive
                                    : ''
                                }`}
                              >
                                <IconComponent size={20} />
                                <span className={styles.meetingTypeLabel}>{type.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className={styles.textareaContainer}>
                        <TextArea 
                          label={t('demoModal.form.topics')}
                          maxLength={maxNotesLength}
                          placeholder={t('demoModal.form.topicsPlaceholder')}
                          value={formData.additional_notes}
                          onChange={e => setFormData({...formData, additional_notes: e.target.value})}
                        />
                        <div className={styles.charCounter}>
                          {notesLength} / {maxNotesLength}
                        </div>
                      </div>

                      <div className={styles.formActions}>
                        <Button type="button" variant="ghost" onClick={onClose}>{t('demoModal.form.cancel')}</Button>
                        <Button type="submit" disabled={loading}>
                          {loading ? t('demoModal.form.processing') : t('demoModal.form.submit')}
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

