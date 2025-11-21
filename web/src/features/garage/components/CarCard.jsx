import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { supabase } from '../../../lib/supabaseClient';
import { useGarageStore } from '../../../stores/garageStore';
import VersionHistory from './VersionHistory';
import ShareModal from './ShareModal';
import TimelineModal from './Timeline/TimelineModal';
import CarCardMoreMenu from './CarCardMoreMenu';
import TagDisplay from './TagDisplay';
import { getConfiguratorImageUrl } from '../utils/getConfiguratorImage';
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
  const setFilters = useGarageStore((state) => state.setFilters);
  const [showHistory, setShowHistory] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);

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

  // Get configurator front angle image based on configuration
  const configuratorImageUrl = useMemo(() => {
    if (config) {
      return getConfiguratorImageUrl(config);
    }
    return null;
  }, [config]);

  const imageUrl =
    configuratorImageUrl ||
    vehicleHeroImage ||
    item?.thumbnail_url ||
    config?.media?.heroImage ||
    (Array.isArray(config?.media?.gallery) ? config.media.gallery[0] : null) ||
    showroomPlaceholder;

  const packageLabel =
    config?.metadata?.primaryPackage ||
    config?.vehicle?.trim ||
    config?.vehicle?.model ||
    item?.vehicle_model ||
    'Sport Package';

  // Get tags from database (preferred) or fallback to legacy config metadata
  const tags = item?.tags || (Array.isArray(config?.metadata?.goalTags) ? config.metadata.goalTags : []) || [];
  
  const description =
    item?.description ||
    config?.history?.notes ||
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
    } else if (item?.id) {
      navigate(`/configurator/${item.id}`);
    }
  };

  const handleViewReady = () => {
    if (typeof onViewReady === 'function') {
      onViewReady(item);
    } else {
      navigate('/world');
    }
  };


  const imageVariants = {
    hidden: { opacity: 0, scale: 1.1 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: [0.25, 0.1, 0.25, 1]
      }
    }
  };

  const contentVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 5 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3,
        ease: [0.25, 0.1, 0.25, 1]
      }
    }
  };

  return (
    <motion.div
      className={styles.card}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
    >
      <div className={styles.cardTop}>
        <motion.div
          className={styles.cardImageWrapper}
          variants={imageVariants}
          initial="hidden"
          animate="visible"
        >
          <img
            src={imageUrl || showroomPlaceholder}
            alt={title}
            className={styles.cardImage}
            loading="lazy"
          />
        </motion.div>
      </div>
      <motion.div
        className={styles.cardBottom}
        variants={contentVariants}
        initial="hidden"
        animate="visible"
      >
        {dateLabel && (
          <motion.span className={styles.cardDate} variants={itemVariants}>
            {dateLabel}
          </motion.span>
        )}
        <motion.h3 className={styles.cardTitle} variants={itemVariants}>
          {title}
        </motion.h3>
        <motion.p className={styles.cardPackage} variants={itemVariants}>
          {packageLabel}
        </motion.p>
        {description && (
          <motion.p className={styles.cardText} variants={itemVariants}>
            {description}
          </motion.p>
        )}
        <motion.div
          className={styles.cardDivider}
          variants={itemVariants}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        />
        <motion.div className={styles.cardActions} variants={itemVariants}>
          <motion.button
            type="button"
            className={styles.cardAction}
            onClick={handleConfigure}
            whileHover={{ opacity: 0.8, x: 2 }}
            whileTap={{ scale: 0.95 }}
            transition={{ duration: 0.15 }}
          >
            {configureLabel || t('garage.actions.configure')}
          </motion.button>
          <CarCardMoreMenu
            itemId={item?.id}
            currentState={item?.state}
            vehicleModel={item?.vehicle_model}
            onHistory={() => setShowHistory(true)}
            onShare={() => setShowShare(true)}
            onTimeline={() => setShowTimeline(true)}
            onReadyForDelivery={handleViewReady}
          />
          {tags.length > 0 && (
            <motion.div className={styles.cardTags} variants={itemVariants}>
              <TagDisplay
                tags={tags}
                onTagClick={(tag) => setFilters({ tags: [tag] })}
                maxVisible={2}
                variant="compact"
              />
            </motion.div>
          )}
        </motion.div>
      </motion.div>

      <VersionHistory
        show={showHistory}
        itemId={item?.id}
        onClose={() => setShowHistory(false)}
      />

      <ShareModal
        show={showShare}
        itemId={item?.id}
        onClose={() => setShowShare(false)}
      />

      {showTimeline && (
        <TimelineModal
          show={showTimeline}
          itemId={item?.id}
          onClose={() => setShowTimeline(false)}
        />
      )}
    </motion.div>
  );
}

