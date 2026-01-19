import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ThemeToggle } from './ThemeToggle';
import tornadoLogo from '../../../assets/Logo/TornadoLogo.png';
import styles from './Footer.module.css';

export function Footer() {
  const { t } = useTranslation('agency');
  
  return (
    <footer id="footer" className={styles.footer}>
      
      {/* Main CTA */}
      <div className={styles.ctaSection}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <p className={styles.ctaLabel}>
            {t('footer.ctaLabel', { defaultValue: 'Ready to make a change?' })}
          </p>
          <h2 className={styles.ctaTitle}>
            {t('footer.ctaTitle', { defaultValue: 'START YOUR\nPROJECT' }).split('\n').map((line, i) => (
              <React.Fragment key={i}>
                {i > 0 && <br />}
                {line}
              </React.Fragment>
            ))}
          </h2>
          
          <a 
            href="mailto:create@volturiano.com" 
            className={styles.emailLink}
          >
            create@volturiano.com
            <ArrowUpRight className={styles.emailIcon} />
          </a>
        </motion.div>
      </div>

      {/* Grid Info */}
      <div className={styles.infoGrid}>
        
        <div className={styles.infoColumn}>
          <p className={styles.infoTitle}>
            {t('footer.designStudio.title', { defaultValue: 'Headquarters' })}
          </p>
          <p>{t('footer.designStudio.address1', { defaultValue: 'Gothenburg, Sweden' })}</p>
          <p>{t('footer.designStudio.address2', { defaultValue: 'Nordic Innovation' })}</p>
        </div>

        <div className={styles.infoColumn}>
          <p className={styles.infoTitle}>
            {t('footer.engineeringLab.title', { defaultValue: 'Studio' })}
          </p>
          <p>{t('footer.engineeringLab.address1', { defaultValue: 'Digital Ecosystem' })}</p>
          <p>{t('footer.engineeringLab.address2', { defaultValue: 'Global Reach' })}</p>
        </div>

        <div className={styles.infoColumn}>
          <a href="#" className={styles.socialLink}>
            {t('footer.social.linkedin', { defaultValue: 'LinkedIn' })}
          </a>
          <a href="#" className={styles.socialLink}>
            {t('footer.social.twitter', { defaultValue: 'Twitter / X' })}
          </a>
          <a href="#" className={styles.socialLink}>
            {t('footer.social.instagram', { defaultValue: 'Instagram' })}
          </a>
        </div>

        <div className={`${styles.infoColumn} ${styles.infoColumnRight}`}>
          <p>{t('footer.copyright', { defaultValue: '© 2026 Volturio Web Agency.' })}</p>
          <p className={styles.tagline}>
            {t('footer.tagline', { defaultValue: 'Engineered for the future.' })}
          </p>
          
          {/* Volturiano Stamp - Expand on Hover */}
          <a 
            href="https://volturiano.com" 
            target="_blank" 
            rel="noopener noreferrer" 
            className={styles.volturianoStamp}
          >
            <div className={styles.stampContent}>
              <span className={styles.stampText}>POWERED BY</span>
              <div className={styles.stampSeparator} />
            </div>
            <img 
              src={tornadoLogo} 
              alt="Volturiano" 
              className={styles.stampLogo} 
            />
          </a>

          <div className={styles.themeToggleWrapper}>
            <ThemeToggle />
          </div>
        </div>

      </div>
    </footer>
  );
}
