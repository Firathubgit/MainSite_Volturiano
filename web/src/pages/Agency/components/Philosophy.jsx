import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import styles from './Philosophy.module.css';

export function Philosophy() {
  const { t } = useTranslation('agency');
  
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.grid}>
          
          {/* Sticky Label */}
          <div className={styles.labelColumn}>
            <div className={styles.stickyLabel}>
              <div className={styles.labelContainer}>
                <span className={styles.dot}></span>
                <span className={styles.label}>
                  {t('philosophy.label', { defaultValue: 'Mission' })}
                </span>
              </div>
            </div>
          </div>

          {/* Content - Massive Typography */}
          <div className={styles.contentColumn}>
            <motion.h3 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              viewport={{ once: true }}
              className={styles.title}
            >
              <span className={styles.grayText}>
                {t('philosophy.title.part1', { defaultValue: 'Digital presence is the new horsepower.' })}
              </span>{' '}
              {t('philosophy.title.part2', { defaultValue: 'We fuse' })}{' '}
              <span className={styles.whiteText}>
                {t('philosophy.title.highlight1', { defaultValue: 'automotive DNA' })}
              </span>{' '}
              {t('philosophy.title.part3', { defaultValue: 'with' })}{' '}
              <span className={styles.whiteText}>
                {t('philosophy.title.highlight2', { defaultValue: 'software engineering' })}
              </span>{' '}
              {t('philosophy.title.part4', { defaultValue: "to build brands that don't just exist—they dominate." })}
            </motion.h3>
            
            <motion.div 
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.4 }}
              viewport={{ once: true }}
              className={styles.featuresGrid}
            >
              <div className={styles.feature}>
                <h4 className={styles.featureTitle}>
                  {t('philosophy.feature1.title', { defaultValue: 'Precision Engineering' })}
                </h4>
                <p className={styles.featureDescription}>
                  {t('philosophy.feature1.description', { 
                    defaultValue: 'We apply the same rigor to code as engineers do to chassis dynamics. Every interaction is calculated, every pixel weighed.' 
                  })}
                </p>
              </div>
              <div className={styles.feature}>
                <h4 className={styles.featureTitle}>
                  {t('philosophy.feature2.title', { defaultValue: 'Cinematic Immersion' })}
                </h4>
                <p className={styles.featureDescription}>
                  {t('philosophy.feature2.description', { 
                    defaultValue: 'Motion, sound, and visual fidelity combined to create digital experiences that rival the feeling of being behind the wheel.' 
                  })}
                </p>
              </div>
            </motion.div>
          </div>

        </div>
      </div>
    </section>
  );
}

