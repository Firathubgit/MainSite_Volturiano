import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import ipadClarity from '../../../assets/Gemini_Generated_Image_z1w47wz1w47wz1w4 (1).png';
import ipadExploration from '../../../assets/Gemini_Generated_Image_nbyby9nbyby9nbyb (1).png';
import ipadStory from '../../../assets/Gemini_Generated_Image_hca7uhhca7uhhca7 (1).png';
import styles from './DeviceShowcase.module.css';

export function DeviceShowcase() {
  const { t } = useTranslation('agency');
  const [activeIndex, setActiveIndex] = useState(0);

  const features = [
    {
      image: ipadStory,
      title: t('deviceShowcase.features.0.title'),
      description: t('deviceShowcase.features.0.description'),
    },
    {
      image: ipadClarity,
      title: t('deviceShowcase.features.1.title'),
      description: t('deviceShowcase.features.1.description'),
    },
    {
      image: ipadExploration,
      title: t('deviceShowcase.features.2.title'),
      description: t('deviceShowcase.features.2.description'),
    },
  ];
  
  return (
    <section className={styles.section}>
      {/* Left Column */}
      <div className={styles.leftColumn}>
        <span className={styles.labelLeft}>{t('deviceShowcase.labelLeft')}</span>
        <div className={styles.accordionList}>
        {features.map((feature, index) => (
          <button
            key={index}
            type="button"
            className={`${styles.accordionItem} ${activeIndex === index ? styles.accordionItemActive : ''}`}
            onClick={() => setActiveIndex(index)}
          >
            <div className={styles.accordionHeader}>
              <h3 className={styles.accordionTitle}>{feature.title}</h3>
              <span className={styles.accordionIcon}>{activeIndex === index ? '—' : '+'}</span>
            </div>
            <AnimatePresence>
              {activeIndex === index && (
                <motion.p
                  className={styles.accordionDescription}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {feature.description}
                </motion.p>
              )}
            </AnimatePresence>
            {activeIndex === index && <div className={styles.progressBar} />}
          </button>
        ))}
            </div>
        </div>

      {/* Right Column */}
      <div className={styles.rightColumn}>
        <span className={styles.labelRight}>{t('deviceShowcase.labelRight')}</span>
        <div className={styles.ipadContainer}>
          <div className={styles.ipadWrapper}>
            {features.map((feature, index) => (
              <motion.img
                key={index}
                src={feature.image}
                alt={feature.title}
                className={styles.ipadImage}
                initial={false}
                animate={{ opacity: activeIndex === index ? 1 : 0 }}
                transition={{ duration: 0.4 }}
                style={{ zIndex: activeIndex === index ? 2 : 1 }}
              />
            ))}
          </div>
          </div>
      </div>
    </section>
  );
}
