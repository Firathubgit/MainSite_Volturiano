import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import styles from './TechTicker.module.css';

export function TechTicker() {
  const { t } = useTranslation('agency');
  const techs = t('techTicker.techs', { returnObjects: true });
  
  return (
    <div className={styles.container}>
      <motion.div 
        className={styles.ticker}
        animate={{ x: ["0%", "-50%"] }}
        transition={{ repeat: Infinity, ease: "linear", duration: 20 }}
      >
        {[...techs, ...techs, ...techs].map((tech, i) => (
          <div key={i} className={styles.techItem}>
            <span className={styles.dot} />
            {tech}
          </div>
        ))}
      </motion.div>
    </div>
  );
}

















