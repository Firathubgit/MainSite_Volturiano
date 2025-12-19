import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import abstractImage from '../../../assets/AbstractishImage.png';
import styles from './PedestalShowcase.module.css';

export function PedestalShowcase() {
  const { t } = useTranslation('agency');
  
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
          viewport={{ once: true }}
          className={styles.imageContainer}
        >
          {/* The Image - Treated as Art, not Data */}
          <img 
            src={abstractImage}
            alt={t('pedestalShowcase.imageAlt', { defaultValue: 'Volturiano Atmosphere' })}
            className={styles.image}
          />
          
          {/* Minimalist Floating Text - Pure Vibe */}
          <div className={styles.textContainer}>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 1 }}
              className={styles.text}
            >
              {t('pedestalShowcase.text', { defaultValue: 'Quiet power.' })}
            </motion.p>
          </div>

        </motion.div>

      </div>
    </section>
  );
}

