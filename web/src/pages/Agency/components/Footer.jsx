import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import styles from './Footer.module.css';

export function Footer() {
  const { t } = useTranslation('agency');
  
  return (
    <footer className={styles.footer}>
      
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
            href="mailto:create@volturiano.agency" 
            className={styles.emailLink}
          >
            create@volturiano.agency
            <ArrowUpRight className={styles.emailIcon} />
          </a>
        </motion.div>
      </div>

      {/* Grid Info */}
      <div className={styles.infoGrid}>
        
        <div className={styles.infoColumn}>
          <p className={styles.infoTitle}>
            {t('footer.designStudio.title', { defaultValue: 'Design Studio' })}
          </p>
          <p>{t('footer.designStudio.address1', { defaultValue: 'Via Emilia Centro, 42' })}</p>
          <p>{t('footer.designStudio.address2', { defaultValue: 'Modena, Italy' })}</p>
        </div>

        <div className={styles.infoColumn}>
          <p className={styles.infoTitle}>
            {t('footer.engineeringLab.title', { defaultValue: 'Engineering Lab' })}
          </p>
          <p>{t('footer.engineeringLab.address1', { defaultValue: '543 Howard St' })}</p>
          <p>{t('footer.engineeringLab.address2', { defaultValue: 'San Francisco, CA' })}</p>
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
          <p>{t('footer.copyright', { defaultValue: '© 2024 Volturiano Agency.' })}</p>
          <p className={styles.tagline}>
            {t('footer.tagline', { defaultValue: 'Engineered for the future.' })}
          </p>
        </div>

      </div>
    </footer>
  );
}

