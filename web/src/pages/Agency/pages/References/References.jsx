import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ThemeProvider, useTheme } from '../../context/ThemeContext';
import { NavBar } from '../../../../components/NavBar/NavBar';
import { Footer } from '../../components/Footer';
import { ContactFormModal } from '../../components/modals/ContactFormModal';
import { DemoRequestModal } from '../../components/modals/DemoRequestModal';
import { usePageTitle } from '../../../../hooks/usePageTitle';
import VisionDump from '../../../../components/VisionDump/VisionDump';
import styles from './References.module.css';

// Import project thumbnails
import furgloveThumbnail from '../../../../assets/FurGloveThhumnail.png';
import euroTaxiThumbnail from '../../../../assets/EuroTaxi1.png';
import replacementImage from '../../../../assets/Replacement image.png';

function ReferencesContent() {
  const { t } = useTranslation(['agency', 'common']);
  const { theme } = useTheme();
  usePageTitle(`${t('agencyMenu.references')} | Volturio Studios – Webbyrå i Göteborg`);

  // Scroll to top on page enter - use immediate scroll
  useEffect(() => {
    window.scrollTo(0, 0);
    // Also reset scroll position immediately
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);

  // Set theme on body
  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
    return () => {
      document.body.removeAttribute('data-theme');
    };
  }, [theme]);

  // Handle learn more button click - scroll to top immediately
  const handleLearnMoreClick = (e) => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };

  // Build projects list with Euro Taxi first, then Furglove, then placeholders
  const ProjectsList = [
    {
      id: 'euro-taxi',
      image: euroTaxiThumbnail,
      title: 'Euro Taxi',
      stack: 'React | TypeScript | Next.js | Tailwind CSS | Leaflet',
      link: '/agency/references/euro-taxi',
      liveUrl: 'https://euro-taxi-as.vercel.app/#/',
      isPlaceholder: false
    },
    {
      id: 'furglove-pro',
      image: furgloveThumbnail,
      title: 'FurGlove Pro',
      stack: 'React | TypeScript | Next.js | Tailwind CSS',
      link: '/agency/references/furglove-pro',
      liveUrl: 'https://furglove-pro.vercel.app/',
      isPlaceholder: false
    },
    {
      id: 'replacement-project-1',
      image: replacementImage,
      title: t('references.replacementProject', 'Replacement Project'),
      stack: t('references.replacementProjectPage', 'Personal Replacement Project Page'),
      link: '/agency/references/replacement-project-1',
      isPlaceholder: true
    },
    {
      id: 'replacement-project-2',
      image: replacementImage,
      title: t('references.replacementProject', 'Replacement Project'),
      stack: t('references.replacementProjectPage', 'Personal Replacement Project Page'),
      link: '/agency/references/replacement-project-2',
      isPlaceholder: true
    },
    {
      id: 'empty-card-1',
      image: null,
      title: '',
      stack: '',
      link: null,
      isPlaceholder: true,
      isEmpty: true
    },
    {
      id: 'empty-card-2',
      image: null,
      title: '',
      stack: '',
      link: null,
      isPlaceholder: true,
      isEmpty: true
    }
  ];

  return (
    <div className={styles.page} data-theme={theme}>
      <div className={styles.backgroundEffects}>
        <div className={styles.gridPattern} />
        <div className={styles.vignette} />
      </div>

      <NavBar />
      
      <main className={styles.main}>
        <div className={styles.container}>
          <motion.h1 
            className={styles.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            {t('references.title', 'Some of our work')}
          </motion.h1>

          <div className={styles.grid}>
            {ProjectsList.map((project, index) => (
              <motion.div 
                key={project.id}
                className={styles.projectItem}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                {project.isEmpty ? (
                  // Empty card - just show empty card styling
                  <div className={styles.projectImageWrapper}>
                    <div className={styles.gradientOverlay}></div>
                  </div>
                ) : (
                  <>
                    <div className={styles.projectImageWrapper}>
                      {project.image ? (
                        <img src={project.image} alt={project.title} className={styles.projectImage} />
                      ) : (
                        <div className={styles.projectImage} style={{ backgroundColor: '#1a1a1a' }}></div>
                      )}
                      <div className={styles.gradientOverlay}></div>
                    </div>

                    <div className={styles.projectContent}>
                      <h3 className={styles.projectTitle}>{project.title}</h3>
                      <p className={styles.projectStack}>{project.stack}</p>
                      {project.link ? (
                        <Link 
                          to={project.link} 
                          className={styles.learnMoreButton}
                          onClick={handleLearnMoreClick}
                        >
                          <span>{t('common:learnMore', 'Learn more')}</span>
                        </Link>
                      ) : null}
                    </div>
                  </>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
      <VisionDump />
    </div>
  );
}

export default function References() {
  return (
    <ThemeProvider>
      <ReferencesContent />
    </ThemeProvider>
  );
}

