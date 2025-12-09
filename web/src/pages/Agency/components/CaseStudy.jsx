import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Button } from './ui/Button';
import styles from './CaseStudy.module.css';

export function CaseStudy() {
  const { t } = useTranslation('agency');
  
  const handleLaunchExperience = () => {
    window.location.href = '/configurator';
  };

  return (
    <section id="case-study" className={styles.section}>
      <div className={styles.gradient} />
      
      <div className={styles.container}>
        <div className={styles.grid}>
          <div className={styles.content}>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className={styles.contentInner}
            >
              <div>
                <h4 className={styles.label}>{t('caseStudy.label')}</h4>
                <h2 className={styles.title}>
                  {t('caseStudy.title').split('\n').map((line, i) => (
                    <React.Fragment key={i}>
                      {i > 0 && <br />}
                      {line}
                    </React.Fragment>
                  ))}
                </h2>
                <p className={styles.description}>
                  {t('caseStudy.description')}
                </p>
              </div>
              
              <div className={styles.stats}>
                <div className={styles.stat}>
                  <div className={styles.statValue}>{t('caseStudy.stats.fps.value')}</div>
                  <div className={styles.statLabel}>{t('caseStudy.stats.fps.label')}</div>
                </div>
                <div className={styles.stat}>
                  <div className={styles.statValue}>{t('caseStudy.stats.latency.value')}</div>
                  <div className={styles.statLabel}>{t('caseStudy.stats.latency.label')}</div>
                </div>
              </div>

              <Button className={styles.ctaButton} onClick={handleLaunchExperience}>
                {t('caseStudy.launchExperience')}
              </Button>
            </motion.div>
          </div>

          <div className={styles.visual}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9, rotate: -2 }}
              whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className={styles.visualContainer}
            >
              <div className={styles.visualBackground}>
                <div className={styles.shimmer} />
                
                <div className={styles.mockup}>
                  <div className={styles.mockupHeader}>
                    <div className={styles.mockupDots}>
                      <div className={styles.mockupDotRed} />
                      <div className={styles.mockupDotYellow} />
                    </div>
                    <div className={styles.mockupTitle}>{t('caseStudy.mockup.title')}</div>
                  </div>
                  <div className={styles.mockupContent}>
                    <div className={styles.mockupGrid}>
                      {Array.from({length: 144}).map((_, i) => (
                        <div key={i} className={styles.mockupGridCell} />
                      ))}
                    </div>
                    <div className={styles.mockupCenter}>
                      <div className={styles.mockupSpinner} />
                      <div className={styles.mockupCenterText}>{t('caseStudy.mockup.rendering')}</div>
                    </div>
                  </div>
                  <div className={styles.mockupFooter}>
                    {t('caseStudy.mockup.options', { returnObjects: true }).map((opt, idx) => (
                      <div key={idx} className={styles.mockupFooterItem}>{opt}</div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

