import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { ThemeProvider, useTheme } from '../../context/ThemeContext';
import { NavBar } from '../../../../components/NavBar/NavBar';
import { Footer } from '../../components/Footer';
import { TeamShowcase } from '../../components/TeamShowcase';
import { usePageTitle } from '../../../../hooks/usePageTitle';
import VisionDump from '../../../../components/VisionDump/VisionDump';
import styles from './About.module.css';

// Using a placeholder image for the story section if needed, or just clean typography
import officeImage from '../../../../assets/H1/Rectangle 11.png';

function AboutContent() {
  const { t } = useTranslation(['agency', 'common']);
  const { theme } = useTheme();
  usePageTitle(`${t('agencyMenu.about')} | Volturiano Agency`);

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
    return () => {
      document.body.removeAttribute('data-theme');
    };
  }, [theme]);

  return (
    <div className={styles.page} data-theme={theme}>
      <div className={styles.backgroundEffects}>
        <div className={styles.gridPattern} />
        <div className={styles.vignette} />
      </div>

      <NavBar />
      
      <main className={styles.main}>
        <div className={styles.headerContainer}>
          <motion.h1 
            className={styles.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            {t('about.title', 'About Volturiano')}
          </motion.h1>
          <motion.p
            className={styles.subtitle}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
          >
            {t('about.subtitle', 'Digital craftsmanship based in Gothenburg.')}
          </motion.p>
        </div>

        {/* Clean Story Section - Terra Hutton Inspired */}
        <div className={styles.storySection}>
          <div className={styles.storyContainer}>
             <div className={styles.storyImageWrapper}>
                <img src={officeImage} alt="Volturiano Office" className={styles.storyImage} />
             </div>
             <div className={styles.storyContent}>
                <h2 className={styles.storyTitle}>{t('about.storyTitle', 'Our Story')}</h2>
                <div className={styles.storyText}>
                  <p>
                    {t('about.storyText', 'Volturiano started with a simple mission: to build digital experiences that matter. We combine technical excellence with artistic vision to help brands stand out in a crowded digital landscape.')}
                  </p>
                  <p>
                    {t('about.philosophy', 'We believe in clean code, bold design, and user-centric strategies. Every pixel has a purpose, every interaction is crafted with care.')}
                  </p>
                </div>
             </div>
          </div>
        </div>

        {/* Team Section - Replaces Purpose */}
        <div className={styles.sectionWrapper}>
          <TeamShowcase />
        </div>
      </main>

      <Footer />
      <VisionDump />
    </div>
  );
}

export default function About() {
  return (
    <ThemeProvider>
      <AboutContent />
    </ThemeProvider>
  );
}

