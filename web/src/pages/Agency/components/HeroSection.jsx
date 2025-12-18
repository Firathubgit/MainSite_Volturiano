import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowDownRight } from 'lucide-react';
import styles from './HeroSection.module.css';

export function HeroSection({ onOpenContact, onScrollToServices }) {
  const { t } = useTranslation('agency');
  const containerRef = useRef(null);
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });
  
  const y = useTransform(scrollYProgress, [0, 0.5], [0, 150]);
  const opacity = useTransform(scrollYProgress, [0, 0.4], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.7]);
  const bgY = useTransform(scrollYProgress, [0, 0.5], [0, 100]);
  
  return (
    <section ref={containerRef} className={styles.hero}>
      {/* Abstract Background Elements */}
      <motion.div 
        style={{ y: bgY }}
        className={styles.backgroundWrapper}
      >
        <motion.div 
          className={styles.backgroundBlob1}
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className={styles.backgroundBlob2}
          animate={{ x: [0, 50, 0], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>

      <motion.div 
        className={styles.container}
        style={{ y, opacity, scale }}
      >
        <div className={styles.textWrapper}>
          <motion.h1 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            className={styles.title1}
          >
            Volturiano
          </motion.h1>
        </div>

        <div className={styles.bottomRow}>
          <div className={styles.textWrapper}>
            <motion.h1 
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              transition={{ duration: 1, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              className={styles.title2}
            >
              {t('hero.agencyTitle')}
            </motion.h1>
          </div>

          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className={styles.descriptionContainer}
          >
            <p className={styles.description}>
              {t('hero.description').replace(/<[^>]*>/g, '')}
            </p>
            <a 
              href="#package-cards" 
              onClick={(e) => {
                e.preventDefault();
                onScrollToServices();
              }}
              className={styles.exploreLink}
            >
              {t('hero.exploreServices')}
              <ArrowDownRight className={styles.arrowIcon} />
            </a>
          </motion.div>
        </div>
      </motion.div>

      {/* Spinning SVG Text */}
      <motion.div 
        style={{ opacity }}
        className={styles.spinningText}
      >
        <svg width="120" height="120" viewBox="0 0 100 100">
          <path id="curve" d="M 50 50 m -37 0 a 37 37 0 1 1 74 0 a 37 37 0 1 1 -74 0" fill="transparent" />
          <text className={styles.curveText}>
            <textPath href="#curve">
              {t('hero.spinningText')}
            </textPath>
          </text>
        </svg>
      </motion.div>
    </section>
  );
}

export function MarqueeTicker() {
  const { t } = useTranslation('agency');
  return (
    <div className={styles.marqueeWrapper}>
      <div className={styles.marquee}>
        {Array.from({ length: 10 }).map((_, i) => (
          <span key={i} className={styles.marqueeText}>
            {t('hero.marqueeText')}
          </span>
        ))}
      </div>
    </div>
  );
}

















