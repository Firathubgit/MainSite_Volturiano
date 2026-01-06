import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ArrowUpRight, Star } from 'lucide-react';
import styles from './AgencyPurpose.module.css';

export function AgencyPurpose() {
  const { t } = useTranslation('agency');

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.grid}>
          
          {/* Label - moved outside mainColumn for mobile ordering */}
          <div className={styles.labelContainer}>
            <span className={styles.dot}></span>
            <span className={styles.label}>{t('purpose.label')}</span>
          </div>

          {/* Main Statement Column */}
          <motion.div 
            className={styles.mainColumn}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            viewport={{ once: true }}
          >
            <h2 className={styles.statement}>
              {t('purpose.statement')}
            </h2>
            
            <p className={styles.substatement}>
              {t('purpose.substatement')}
            </p>

            {/* Abstract decorative element */}
            <motion.div 
              className={styles.decorativeElement}
              initial={{ opacity: 0, scaleX: 0 }}
              whileInView={{ opacity: 1, scaleX: 1 }}
              transition={{ duration: 1.2, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
              viewport={{ once: true }}
            >
              <div className={styles.decorativeLine}></div>
            </motion.div>
          </motion.div>

          {/* Stats Column */}
          <motion.div 
            className={styles.statsColumn}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            viewport={{ once: true }}
          >
            <div className={styles.statItem}>
              <span className={styles.statNumber}>4+</span>
              <span className={styles.statLabel}>{t('purpose.stats.projects')}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statNumber}>5+</span>
              <span className={styles.statLabel}>{t('purpose.stats.clients')}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statNumber}>7k</span>
              <span className={styles.statLabel}>{t('purpose.stats.customers')}</span>
            </div>
          </motion.div>
          
        </div>
      </div>
    </section>
  );
}
