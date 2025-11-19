import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGarageStore } from '../../../stores/garageStore';
import { useUserStore } from '../../../stores/userStore';
import { createGarageItem } from '../../account/api';
import LoadingOverlay from '../../../components/LoadingOverlay/LoadingOverlay';
import styles from './SharedGarageView.module.css';

/**
 * Shared garage view component for viewing shared configurations
 * Route: /garage/share/:shareCode
 */
export default function SharedGarageView() {
  const { shareCode } = useParams();
  const { t } = useTranslation('account');
  const navigate = useNavigate();
  const fetchSharedItem = useGarageStore((state) => state.fetchSharedItem);
  const session = useUserStore((state) => state.session);

  const [sharedData, setSharedData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const loadSharedItem = async () => {
    console.log('[SharedGarageView] loadSharedItem called with shareCode:', shareCode);
    setLoading(true);
    setError(null);
    const startTime = Date.now();
    try {
      console.log('[SharedGarageView] Calling fetchSharedItem API...');
      const { data, error: fetchError } = await fetchSharedItem(shareCode);
      const duration = Date.now() - startTime;
      console.log('[SharedGarageView] fetchSharedItem completed in', duration, 'ms');
      
      if (fetchError) {
        console.error('[SharedGarageView] Error fetching shared item:', fetchError);
        console.error('[SharedGarageView] Error message:', fetchError.message);
        // Check if it's an expired or not found error
        if (fetchError.message?.includes('expired') || fetchError.message?.includes('not found')) {
          console.log('[SharedGarageView] Link expired or not found');
          setError('expired');
        } else {
          console.log('[SharedGarageView] Other error occurred');
          setError('error');
        }
      } else {
        console.log('[SharedGarageView] Shared item loaded successfully');
        console.log('[SharedGarageView] Item ID:', data?.item?.id);
        console.log('[SharedGarageView] Item title:', data?.item?.title);
        console.log('[SharedGarageView] Share link access count:', data?.share_link?.access_count);
        setSharedData(data);
      }
    } catch (err) {
      console.error('[SharedGarageView] Exception loading shared item:', err);
      console.error('[SharedGarageView] Exception stack:', err.stack);
      setError('error');
    } finally {
      setLoading(false);
      console.log('[SharedGarageView] loadSharedItem finished');
    }
  };

  useEffect(() => {
    console.log('[SharedGarageView] useEffect triggered with shareCode:', shareCode);
    if (shareCode) {
      console.log('[SharedGarageView] Loading shared item...');
      loadSharedItem();
    } else {
      console.warn('[SharedGarageView] No shareCode provided');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shareCode]);

  const handleSaveToGarage = async () => {
    console.log('[SharedGarageView] handleSaveToGarage called');
    console.log('[SharedGarageView] Session:', session ? 'authenticated' : 'not authenticated');
    
    if (!session) {
      console.log('[SharedGarageView] No session, redirecting to login');
      // Redirect to login with return URL
      navigate('/account/login', { state: { returnTo: `/garage/share/${shareCode}` } });
      return;
    }

    if (!sharedData?.item) {
      console.warn('[SharedGarageView] No shared data available to save');
      return;
    }

    console.log('[SharedGarageView] Starting save process...');
    setSaving(true);
    setSaveError(null);
    const startTime = Date.now();

    try {
      // Create a new garage item from the shared configuration
      const payload = {
        title: sharedData.item.title,
        description: sharedData.item.description,
        vehicle_model: sharedData.item.vehicle_model,
        config_payload: sharedData.item.config_payload,
        price_cents: sharedData.item.price_cents,
        currency: sharedData.item.currency || 'EUR'
      };
      
      console.log('[SharedGarageView] Saving payload:', {
        title: payload.title,
        vehicle_model: payload.vehicle_model,
        price_cents: payload.price_cents,
        has_config: !!payload.config_payload
      });

      const { data, error: saveError } = await createGarageItem(payload);
      const duration = Date.now() - startTime;
      console.log('[SharedGarageView] createGarageItem completed in', duration, 'ms');
      
      if (saveError) {
        console.error('[SharedGarageView] Error saving to garage:', saveError);
        setSaveError(saveError);
      } else {
        console.log('[SharedGarageView] Item saved successfully:', data?.id);
        console.log('[SharedGarageView] Navigating to garage page...');
        // Navigate to garage page
        navigate('/garage');
      }
    } catch (err) {
      console.error('[SharedGarageView] Exception saving to garage:', err);
      console.error('[SharedGarageView] Exception stack:', err.stack);
      setSaveError(err);
    } finally {
      setSaving(false);
      console.log('[SharedGarageView] handleSaveToGarage finished');
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <LoadingOverlay show={true} />
        <div className={styles.loadingMessage}>
          <span>{t('garage.shared.loading')}</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.errorContainer}>
          <h1 className={styles.errorTitle}>{t('garage.shared.title')}</h1>
          <p className={styles.errorMessage}>
            {error === 'expired'
              ? t('garage.shared.linkExpired')
              : t('garage.shared.linkNotFound')}
          </p>
          <button
            type="button"
            className={styles.backButton}
            onClick={() => navigate('/')}
          >
            {t('garage.shared.backToHome') || 'Back to Home'}
          </button>
        </div>
      </div>
    );
  }

  if (!sharedData?.item) {
    return (
      <div className={styles.container}>
        <div className={styles.errorContainer}>
          <h1 className={styles.errorTitle}>{t('garage.shared.title')}</h1>
          <p className={styles.errorMessage}>{t('garage.shared.error')}</p>
        </div>
      </div>
    );
  }

  const item = sharedData.item;
  const config = typeof item.config_payload === 'string'
    ? JSON.parse(item.config_payload)
    : item.config_payload;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>{t('garage.shared.title')}</h1>
        <p className={styles.subtitle}>{t('garage.shared.viewingShared')}</p>
      </div>

      <div className={styles.content}>
        <div className={styles.configCard}>
          <h2 className={styles.configTitle}>{item.title || config?.vehicle?.model || 'Configuration'}</h2>
          {item.description && (
            <p className={styles.configDescription}>{item.description}</p>
          )}
          {item.vehicle_model && (
            <p className={styles.configModel}>Model: {item.vehicle_model}</p>
          )}
          {item.price_cents && (
            <p className={styles.configPrice}>
              Price: {(item.price_cents / 100).toLocaleString('sv-SE', {
                style: 'currency',
                currency: item.currency || 'EUR'
              })}
            </p>
          )}

          {/* Configuration details */}
          {config && (
            <div className={styles.configDetails}>
              <h3 className={styles.detailsTitle}>Configuration Details</h3>
              <pre className={styles.configJson}>
                {JSON.stringify(config, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <div className={styles.actions}>
          {saveError && (
            <div className={styles.saveError}>
              <span>{t('garage.shared.error')}: {saveError.message || saveError}</span>
            </div>
          )}
          {session ? (
            <button
              type="button"
              className={styles.saveButton}
              onClick={handleSaveToGarage}
              disabled={saving}
            >
              {saving ? t('garage.save.saving') : t('garage.shared.saveToGarage')}
            </button>
          ) : (
            <div className={styles.loginPrompt}>
              <p className={styles.loginMessage}>{t('garage.shared.loginToSave')}</p>
              <button
                type="button"
                className={styles.loginButton}
                onClick={() => navigate('/account/login', { state: { returnTo: `/garage/share/${shareCode}` } })}
              >
                {t('menu.signIn')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

