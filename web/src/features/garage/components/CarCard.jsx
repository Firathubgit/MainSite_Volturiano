import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../../lib/supabaseClient';
import styles from '../styles/garage.module.css';
import showroomPlaceholder from '../../../assets/Garage/ShowroomCarVOLTURIANO1.png';

const vehicleImageCache = new Map();
const vehicleImagePromiseCache = new Map();

async function loadVehicleHeroImage(modelName) {
  if (!modelName) return null;
  if (vehicleImageCache.has(modelName)) {
    return vehicleImageCache.get(modelName);
  }
  if (!supabase) {
    vehicleImageCache.set(modelName, null);
    return null;
  }
  if (!vehicleImagePromiseCache.has(modelName)) {
    const promise = supabase
      .from('vehicles')
      .select('hero_image_url')
      .eq('name', modelName)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          console.warn('[CarCard] Failed to fetch hero image for model', modelName, error);
          vehicleImageCache.set(modelName, null);
          return null;
        }
        const heroUrl = data?.hero_image_url || null;
        vehicleImageCache.set(modelName, heroUrl);
        return heroUrl;
      })
      .finally(() => {
        vehicleImagePromiseCache.delete(modelName);
      });
    vehicleImagePromiseCache.set(modelName, promise);
  }
  return vehicleImagePromiseCache.get(modelName);
}

function parseConfigPayload(payload) {
  if (!payload) return null;
  if (typeof payload === 'object') return payload;
  try {
    return JSON.parse(payload);
  } catch (error) {
    console.warn('[CarCard] Failed to parse config payload', error);
    return null;
  }
}

function formatDate(dateValue) {
  if (!dateValue) return '';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('sv-SE');
}

export default function CarCard({
  item,
  onConfigure,
  onViewReady,
  configureLabel,
  readyLabel
}) {
  const { t } = useTranslation('account');
  const navigate = useNavigate();

  const config = useMemo(() => parseConfigPayload(item?.config_payload), [item]);
  const modelName = item?.vehicle_model || config?.vehicle?.model || null;
  const [vehicleHeroImage, setVehicleHeroImage] = useState(
    modelName && vehicleImageCache.has(modelName) ? vehicleImageCache.get(modelName) : undefined
  );

  useEffect(() => {
    let active = true;
    if (!modelName) {
      setVehicleHeroImage(null);
      return () => {
        active = false;
      };
    }

    if (vehicleImageCache.has(modelName)) {
      setVehicleHeroImage(vehicleImageCache.get(modelName));
      return () => {
        active = false;
      };
    }

    loadVehicleHeroImage(modelName).then((url) => {
      if (active) {
        setVehicleHeroImage(url ?? null);
      }
    });

    return () => {
      active = false;
    };
  }, [modelName]);

  const imageUrl =
    vehicleHeroImage ||
    item?.thumbnail_url ||
    config?.media?.heroImage ||
    (Array.isArray(config?.media?.gallery) ? config.media.gallery[0] : null) ||
    null;

  const packageLabel =
    config?.metadata?.primaryPackage ||
    config?.vehicle?.trim ||
    config?.vehicle?.model ||
    item?.vehicle_model ||
    'Sport Package';

  const description =
    item?.description ||
    config?.history?.notes ||
    (Array.isArray(config?.metadata?.goalTags)
      ? config.metadata.goalTags.join(' • ')
      : '') ||
    '';

  const dateLabel = formatDate(item?.created_at || item?.updated_at);
  const title = item?.title || config?.vehicle?.model || 'Volturiano 1';
  const fallbackText =
    (item?.vehicle_model || title || 'VT')
      .toString()
      .slice(0, 3)
      .toUpperCase() || 'VT';

  const handleConfigure = () => {
    if (typeof onConfigure === 'function') {
      onConfigure(item);
    } else {
      navigate('/configurator', { state: { garageItemId: item?.id } });
    }
  };

  const handleViewReady = () => {
    if (typeof onViewReady === 'function') {
      onViewReady(item);
    } else {
      navigate('/world');
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.cardTop}>
        <div className={styles.cardImageWrapper}>
          <img
            src={imageUrl || showroomPlaceholder}
            alt={title}
            className={styles.cardImage}
            loading="lazy"
          />
        </div>
      </div>
      <div className={styles.cardBottom}>
        {dateLabel && <span className={styles.cardDate}>{dateLabel}</span>}
        <h3 className={styles.cardTitle}>{title}</h3>
        <p className={styles.cardPackage}>{packageLabel}</p>
        {description && <p className={styles.cardText}>{description}</p>}
        <div className={styles.cardDivider} />
        <div className={styles.cardActions}>
          <button type="button" className={styles.cardAction} onClick={handleConfigure}>
            {configureLabel || t('garage.actions.configure')}
          </button>
          <button type="button" className={styles.cardAction} onClick={handleViewReady}>
            {readyLabel || t('garage.actions.viewReadyCars')}
          </button>
        </div>
      </div>
    </div>
  );
}

