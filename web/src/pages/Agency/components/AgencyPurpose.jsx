import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import styles from './AgencyPurpose.module.css';

export function AgencyPurpose() {
  const { t } = useTranslation('agency');
  const [activeIndex, setActiveIndex] = useState(0);

  const stats = [
    { 
      value: "4+", 
      label: t('purpose.stats.projects'), 
      desc: t('purpose.stats.projectsDesc', 'Levererade med precision.') 
    },
    { 
      value: "5+", 
      label: t('purpose.stats.clients'), 
      desc: t('purpose.stats.clientsDesc', 'Långsiktiga partnerskap.') 
    },
    { 
      value: "7k", 
      label: t('purpose.stats.customers'), 
      desc: t('purpose.stats.customersDesc', 'Organisk trafikväxt.') 
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((current) => (current + 1) % stats.length);
    }, 4000); // 4 seconds for a calmer, slower pace
    return () => clearInterval(interval);
  }, [stats.length]);

  return (
    <section id="about" className={styles.section}>
      {/* Background Ambience */}
      <div className={styles.backgroundAmbience} />

      <div className={styles.container}>
        <div className={styles.grid}>
          
          {/* LEFT COLUMN: Narrative (Headline + Description) */}
          <div className={styles.leftColumn}>
            
            {/* Label */}
            <div className={styles.labelContainer}>
              <span className={styles.labelLine}></span>
              <span className={styles.label}>{t('purpose.label')}</span>
            </div>
            
            {/* Headline */}
            <h1 className={styles.headline}>
              {t('purpose.statement').includes('Göteborg') ? (
                <>
                  Vi bygger webbsidor till <br />
                  företag i{' '}
                  <span className={styles.gradientText}>
                    Göteborg.
                  </span>
                </>
              ) : (
                <>
                  We build websites for <br />
                  businesses in{' '}
                  <span className={styles.gradientText}>
                    Gothenburg.
                  </span>
                </>
              )}
            </h1>

            {/* Description */}
            <p className={styles.description}>
              {t('purpose.substatement')}
            </p>
          </div>

          {/* RIGHT COLUMN: Technical Specs (Stats Sidebar) - Auto Carousel */}
          <div className={styles.rightColumn}>
            <div className={styles.statsGrid}>
              
              {stats.map((stat, index) => {
                const isActive = index === activeIndex;
                
                return (
                  <div key={index} className={styles.statItem}>
                    {/* Number: Soft focus effect */}
                    <div className={styles.statNumberContainer}>
                      <span className={`${styles.statNumber} ${isActive ? styles.statNumberActive : styles.statNumberInactive}`}>
                        {stat.value}
                      </span>
                    </div>
                    
                    {/* Line: Gentle expansion and color shift */}
                    <div className={`${styles.statLine} ${isActive ? styles.statLineActive : styles.statLineInactive}`}></div>
                    
                    <h3 className={`${styles.statLabel} ${isActive ? styles.statLabelActive : styles.statLabelInactive}`}>
                      {stat.label}
                    </h3>
                    
                    {/* Description: Slow fade in */}
                    <p className={`${styles.statDesc} ${isActive ? styles.statDescActive : styles.statDescInactive}`}>
                      {stat.desc}
                    </p>
                  </div>
                );
              })}

            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
