import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import styles from './ServiceCard.module.css';

export function ServiceCard({ service, index, onGetQuote, onRequestDemo }) {
  const getBentoClass = (idx) => {
    switch(idx) {
      case 0: return styles.bentoLarge; // Large Featured (Luxury UI)
      case 1: return styles.bentoTall; // Tall (Fullstack)
      case 2: return styles.bentoWide; // Wide (3D Config)
      case 3: return styles.bentoStandard; // Standard (Admin)
      default: return styles.bentoFull; // Full Width (Supabase)
    }
  };

  const IconComponent = service.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.05 }}
      className={`${styles.card} ${getBentoClass(index)}`}
    >
      <div className={styles.hoverGradient} />
      
      <div className={styles.content}>
        <div className={styles.iconContainer}>
          <IconComponent size={22} />
        </div>
        <h3 className={styles.title}>{service.title}</h3>
        <p className={styles.description}>
          {service.description}
        </p>
      </div>

      <div className={styles.footer}>
        <div className={styles.features}>
          {service.features.slice(0, 3).map((f, i) => (
            <span key={i} className={styles.featureTag}>
              {f}
            </span>
          ))}
        </div>

        <div className={styles.actions}>
          <button 
            onClick={() => onGetQuote(service.id)}
            className={styles.getQuoteButton}
          >
            Get Quote
          </button>
          <button 
            onClick={() => onRequestDemo(service.id)}
            className={styles.demoButton}
          >
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}











