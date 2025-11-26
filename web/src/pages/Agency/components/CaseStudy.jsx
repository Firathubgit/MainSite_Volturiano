import React from 'react';
import { motion } from 'framer-motion';
import { Button } from './ui/Button';
import styles from './CaseStudy.module.css';

export function CaseStudy() {
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
                <h4 className={styles.label}>SELECTED WORK</h4>
                <h2 className={styles.title}>VOLTURIANO<br />CONFIGURATOR</h2>
                <p className={styles.description}>
                  A zero-latency 3D customization engine built to replace physical showrooms.
                </p>
              </div>
              
              <div className={styles.stats}>
                <div className={styles.stat}>
                  <div className={styles.statValue}>60FPS</div>
                  <div className={styles.statLabel}>Ray-traced Performance</div>
                </div>
                <div className={styles.stat}>
                  <div className={styles.statValue}>&lt;100ms</div>
                  <div className={styles.statLabel}>Database Latency</div>
                </div>
              </div>

              <Button className={styles.ctaButton} onClick={handleLaunchExperience}>
                Launch Experience
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
                    <div className={styles.mockupTitle}>VOLTURIANO_ENGINE_V2.0</div>
                  </div>
                  <div className={styles.mockupContent}>
                    <div className={styles.mockupGrid}>
                      {Array.from({length: 144}).map((_, i) => (
                        <div key={i} className={styles.mockupGridCell} />
                      ))}
                    </div>
                    <div className={styles.mockupCenter}>
                      <div className={styles.mockupSpinner} />
                      <div className={styles.mockupCenterText}>RENDERING</div>
                    </div>
                  </div>
                  <div className={styles.mockupFooter}>
                    {['PAINT', 'WHEELS', 'INTERIOR', 'CARBON'].map(opt => (
                      <div key={opt} className={styles.mockupFooterItem}>{opt}</div>
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

