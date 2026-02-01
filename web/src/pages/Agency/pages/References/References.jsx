import React, { useEffect, useLayoutEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ThemeProvider, useTheme } from '../../context/ThemeContext';
import { NavBar } from '../../../../components/NavBar/NavBar';
import { Footer } from '../../components/Footer';
import { usePageTitle } from '../../../../hooks/usePageTitle';
import styles from './References.module.css';

// Import project thumbnails
import scaleIntelligenceThumbnail from '../../../../assets/ScaleIntelegenceMocup.png';
import europaBageriThumbnail from '../../../../assets/EuropaBageriMockipadpic.png';
import furgloveThumbnail from '../../../../assets/FurGloveExample.png';
import euroTaxiThumbnail from '../../../../assets/EuroTaxiExample.png';
import volturianoAgencyMockup from '../../../../assets/VolturianoAgencyMockupExample.png';
import solarExampleThumbnail from '../../../../assets/SolarExample.png';
import mathornanThumbnail from '../../../../assets/Mathörnan.png';
import heroVideo from '../../../../assets/BackgroundVid.mp4';
import tornadoLogo from '../../../../assets/Logo/TornadoLogo.png';

function ReferencesContent() {
  const { t } = useTranslation(['agency', 'common']);
  const { theme } = useTheme();
  usePageTitle(`${t('agencyMenu.references')} | Volturio Studios – Webbyrå i Göteborg`);

  // Scroll to top on page enter - use both useLayoutEffect and useEffect to ensure it works
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
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

  // Projects List with direct live links (project-specific pages kept for future use)
  // Order: Scale Intelligence first, then other projects, Volturiano Studios last
  const ProjectsList = [
    {
      id: 'scale-intelligence',
      image: scaleIntelligenceThumbnail,
      link: 'https://wave-form-example-website.vercel.app/?',
      external: true
    },
    {
      id: 'euro-taxi',
      image: euroTaxiThumbnail,
      link: 'https://www.eurotaxias.no/',
      external: true
    },
    {
      id: 'furglove-pro',
      image: furgloveThumbnail,
      link: 'https://furglove-pro.vercel.app/',
      external: true
    },
    {
      id: 'europa-bageri',
      image: europaBageriThumbnail,
      link: 'https://europa-bageri-premium.vercel.app/',
      external: true
    },
    {
      id: 'volturiano',
      image: volturianoAgencyMockup,
      link: '/agency', // Links to home/agency page itself
      external: false
    },
    {
      id: 'solar-panel-solutions',
      image: solarExampleThumbnail,
      link: 'https://solar-example.vercel.app/',
      external: true
    },
    {
      id: 'mathornan',
      image: mathornanThumbnail,
      link: 'https://matcorner.vercel.app/',
      external: true
    }
  ];

  return (
    <div className={styles.page} data-theme={theme}>
      <NavBar />
      
      <main className={styles.main}>
        <div className={styles.heroSection}>
          <video
            className={styles.heroVideo}
            autoPlay
            loop
            muted
            playsInline
          >
            <source src={heroVideo} type="video/mp4" />
          </video>
          <motion.div
            className={styles.heroContent}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h2 className={styles.heroLabel}>{t('selectedWork.title', 'Project exemplar')}</h2>
            <h1 className={styles.heroTitle}>
              {t('references.title', 'Premium')}{' '}
              <img src={tornadoLogo} alt="Volturiano" className={styles.logoImage} />{' '}
              {t('references.titleSuffix', 'websidor,')}
              <br />
              {t('references.titleSuffix2', 'Alla Exemplar')}
            </h1>
          </motion.div>
        </div>

        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>{t('references.allProjects', 'All Projects')}</h2>
            <button 
              onClick={() => {
                const footer = document.getElementById('footer');
                footer?.scrollIntoView({ behavior: 'smooth' });
              }}
              className={styles.createLink}
            >
              {t('references.createYourOwn', '[ CREATE YOUR OWN ]')}
            </button>
          </div>

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

              const content = (
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
              );

              // Use external link for external projects, internal Link for internal/placeholders
              if (project.external) {
                return (
                  <a
                    key={project.id}
                    href={project.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.cardLink}
                  >
                    {content}
                  </a>
                );
              }

              // For placeholders or internal links, use Link or button
              if (project.isPlaceholder) {
                return (
                  <div key={project.id} className={styles.cardLink} style={{ cursor: 'default', pointerEvents: 'none' }}>
                    {content}
                  </div>
                );
              }

              return (
                <Link
                  key={project.id}
                  to={project.link}
                  className={styles.cardLink}
                  onClick={() => window.scrollTo(0, 0)}
                >
                  {content}
                </Link>
              );
            })}
          </div>
        </div>
      </main>

      <Footer />
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
