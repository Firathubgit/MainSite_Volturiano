import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ThemeProvider, useTheme } from '../../context/ThemeContext';
import { NavBar } from '../../../../components/NavBar/NavBar';
import { Footer } from '../../components/Footer';
import { usePageTitle } from '../../../../hooks/usePageTitle';
import VisionDump from '../../../../components/VisionDump/VisionDump';
import styles from './References.module.css';

// Import project thumbnails
import furgloveThumbnail from '../../../../assets/FurGloveExample.png';
import euroTaxiThumbnail from '../../../../assets/EuroTaxiExample.png';
import volturianoAgencyMockup from '../../../../assets/VolturianoAgencyMockupExample.png';
import replacementImage from '../../../../assets/Replacement image.png';

function ReferencesContent() {
  const { t } = useTranslation(['agency', 'common']);
  const { theme } = useTheme();
  usePageTitle(`${t('agencyMenu.references')} | Volturio Studios – Webbyrå i Göteborg`);

  // Scroll to top on page enter
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Set theme on body
  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
    return () => {
      document.body.removeAttribute('data-theme');
    };
  }, [theme]);

  // Projects List matching SelectedWork structure
  const ProjectsList = [
    {
      id: 'volturiano',
      image: volturianoAgencyMockup,
      link: '/agency/references/volturiano',
    },
    {
      id: 'euro-taxi',
      image: euroTaxiThumbnail,
      link: '/agency/references/euro-taxi',
    },
    {
      id: 'furglove-pro',
      image: furgloveThumbnail,
      link: '/agency/references/furglove-pro',
    },
    {
      id: 'replacement-project-1',
      image: replacementImage,
      link: '/agency/references/replacement-project-1',
      isPlaceholder: true
    },
    {
      id: 'replacement-project-2',
      image: replacementImage,
      link: '/agency/references/replacement-project-2',
      isPlaceholder: true
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
            {ProjectsList.map((project, index) => {
              // Determine keys. For placeholders, fall back or use specific logic if needed.
              // We'll try to look up in selectedWork first, then fall back to generic.
              const isRealProject = !project.isPlaceholder;
              
              let title, category;
              
              if (isRealProject) {
                 title = t(`selectedWork.projects.${project.id}.title`, project.id);
                 category = t(`selectedWork.projects.${project.id}.category`, '');
              } else {
                 title = t('references.replacementProject', 'Replacement Project');
                 category = t('references.replacementProjectPage', 'Concept');
              }

              return (
                <Link
                  key={project.id}
                  to={project.link}
                  className={styles.cardLink}
                  onClick={() => window.scrollTo(0, 0)}
                >
                  <motion.div 
                    className={styles.card}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                  >
                    <div className={styles.imageContainer}>
                      <img 
                        src={project.image} 
                        alt={title} 
                        className={styles.image}
                      />
                    </div>

                    <div className={styles.info}>
                      <h3 className={styles.projectTitle}>{title}</h3>
                      <span className={styles.projectCategory}>{category}</span>
                    </div>
                  </motion.div>
                </Link>
              );
            })}
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
