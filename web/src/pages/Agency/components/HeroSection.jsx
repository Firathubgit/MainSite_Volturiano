import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Button } from './ui/Button';
import styles from './HeroSection.module.css';

export function HeroSection({ onOpenContact, onScrollToServices }) {
  return (
    <section className={styles.hero}>
      <div className={styles.container}>
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className={styles.content}
        >
          <div className={styles.badge}>
            <span className={styles.badgeDot}>
              <span className={styles.badgePing}></span>
              <span className={styles.badgeDotInner}></span>
            </span>
            AVAILABLE FOR NEW COMMISSIONS
          </div>

          <h1 className={styles.title}>
            DIGITAL<br />
            <span className={styles.titleGradient}>ATELIER.</span>
          </h1>
          
          <p className={styles.description}>
            We don't just build software. We engineer <span className={styles.descriptionHighlight}>investor-grade digital assets</span> that redefine premium automotive and luxury experiences.
          </p>

          <div className={styles.ctaContainer}>
            <Button onClick={() => onOpenContact(null)} className={styles.primaryButton}>
              Start Project
            </Button>
            <button 
              onClick={onScrollToServices}
              className={styles.secondaryButton}
            >
              <div className={styles.secondaryButtonIcon}>
                <ArrowRight size={18} />
              </div>
              <span className={styles.secondaryButtonText}>EXPLORE SERVICES</span>
            </button>
          </div>
        </motion.div>
      </div>
      
      <div className={styles.backgroundElement}></div>
    </section>
  );
}











