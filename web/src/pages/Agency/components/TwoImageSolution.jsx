import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import abstractImage1 from '../../../assets/AbowStract.png';
import abstractImage2 from '../../../assets/Abstractish.png';
import styles from './TwoImageSolution.module.css';

export function TwoImageSolution() {
  const { t } = useTranslation('agency');
  
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        
        {/* Image 1 - Left */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          viewport={{ once: true }}
          className={styles.imageWrapper}
        >
          <img 
            src={abstractImage1}
            alt={t('twoImageSolution.image1.alt', { defaultValue: 'Volturiano Atmosphere I' })}
            className={styles.image}
          />
          
          {/* Overlays */}
          <div className={styles.gradientOverlay}></div>
          <div className={styles.textureOverlay}></div>

          {/* Caption */}
          <div className={styles.caption}>
            <p className={styles.figureLabel}>
              {t('twoImageSolution.image1.figure', { defaultValue: 'Fig. 01' })}
            </p>
            <p className={styles.captionText}>
              {t('twoImageSolution.image1.caption', { defaultValue: 'Quiet power.' })}
            </p>
          </div>
        </motion.div>

        {/* Image 2 - Right */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          viewport={{ once: true }}
          className={`${styles.imageWrapper} ${styles.imageWrapperOffset}`}
        >
          <img 
            src={abstractImage2}
            alt={t('twoImageSolution.image2.alt', { defaultValue: 'Volturiano Atmosphere II' })}
            className={styles.image}
          />

          {/* Overlays */}
          <div className={styles.gradientOverlay}></div>
          <div className={styles.textureOverlay}></div>

          {/* Caption */}
          <div className={styles.caption}>
            <p className={styles.figureLabel}>
              {t('twoImageSolution.image2.figure', { defaultValue: 'Fig. 02' })}
            </p>
            <p className={styles.captionText}>
              {t('twoImageSolution.image2.caption', { defaultValue: 'Controlled chaos.' })}
            </p>
          </div>
        </motion.div>

      </div>
    </section>
  );
}

