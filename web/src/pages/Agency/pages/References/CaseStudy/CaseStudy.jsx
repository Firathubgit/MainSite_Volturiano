import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink, ArrowLeft } from 'lucide-react';
import { ThemeProvider, useTheme } from '../../../context/ThemeContext';
import { NavBar } from '../../../../../components/NavBar/NavBar';
import { Footer } from '../../../components/Footer';
import { usePageTitle } from '../../../../../hooks/usePageTitle';
import styles from './CaseStudy.module.css';

// Import project images
import furgloveThumbnail from '../../../../../assets/FurGloveExample.png';
import euroTaxiThumbnail from '../../../../../assets/EuroTaxiExample.png';
import volturianoAgencyMockup from '../../../../../assets/VolturianoAgencyMockupExample.png';
import replacementImage from '../../../../../assets/Replacement image.png';

// Fallback images if needed, though we seem to have one main image per project now in the examples
// I'll use the example images as the main hero images.

const ProjectsData = {
  'volturiano': {
    id: 'volturiano',
    thumbnail: volturianoAgencyMockup,
    images: [volturianoAgencyMockup],
    // Title/Stack will be pulled from i18n
    liveUrl: 'https://volturiano.com/agency'
  },
  'furglove-pro': {
    id: 'furglove-pro',
    thumbnail: furgloveThumbnail,
    images: [furgloveThumbnail],
    liveUrl: 'https://furglove-pro.vercel.app/'
  },
  'euro-taxi': {
    id: 'euro-taxi',
    thumbnail: euroTaxiThumbnail,
    images: [euroTaxiThumbnail],
    liveUrl: 'https://euro-taxi-as.vercel.app/#/'
  },
  'replacement-project-1': {
    id: 'replacement-project-1',
    thumbnail: replacementImage,
    images: [replacementImage],
    liveUrl: null,
    isPlaceholder: true
  },
  'replacement-project-2': {
    id: 'replacement-project-2',
    thumbnail: replacementImage,
    images: [replacementImage],
    liveUrl: null,
    isPlaceholder: true
  },
};

function CaseStudyContent() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation(['agency', 'common']);
  const { theme } = useTheme();
  
  const project = ProjectsData[projectId];

  // Scroll to top on page enter
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (!project) {
      navigate('/agency/references', { replace: true });
      return;
    }
  }, [project, navigate]);

  // Get project details from i18n
  // Use selectedWork keys for title/category (stack)
  // Use caseStudy keys for overview/improvements/doneWork
  const projectTitle = project?.isPlaceholder 
    ? t('references.replacementProject', 'Replacement Project')
    : t(`selectedWork.projects.${projectId}.title`, project?.title);
    
  const projectStack = project?.isPlaceholder
    ? t('references.replacementProjectPage', 'Concept')
    : t(`selectedWork.projects.${projectId}.category`, project?.stack);

  usePageTitle(`${projectTitle || 'Case Study'} | Volturio Studios`);

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
    return () => {
      document.body.removeAttribute('data-theme');
    };
  }, [theme]);

  if (!project) {
    return null;
  }

  return (
    <div className={styles.page} data-theme={theme}>
      <div className={styles.backgroundEffects}>
        <div className={styles.gridPattern} />
        <div className={styles.vignette} />
      </div>

      <NavBar />
      
      <main className={styles.main}>
        <div className={styles.container}>
          {/* Back Button */}
          <Link to="/agency/references" className={styles.backButton}>
            <ArrowLeft size={16} />
            <span>{t('common:backToArchive', 'Back to Archive')}</span>
          </Link>

          {/* Hero Section */}
          <motion.div
            className={styles.hero}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className={styles.heroHeader}>
              <h1 className={styles.heroTitle}>
                {projectTitle}
              </h1>
              
              <div className={styles.heroMeta}>
                <span className={styles.projectStack}>{projectStack}</span>
                
                {/* Live Link Button - PREVIEW style */}
                {project.liveUrl && (
                  <a
                    href={project.liveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.liveLinkButton}
                  >
                    <span>{t('caseStudy.viewLive', 'PREVIEW')}</span>
                  </a>
                )}
              </div>
            </div>

            {/* Hero Image with Orange Gradient Background */}
            <div className={styles.heroImageContainer}>
              <motion.img
                src={project.images[0]}
                alt={projectTitle}
                className={styles.heroImage}
                initial={{ scale: 1.05, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 1.2, ease: "easeOut" }}
              />
            </div>
          </motion.div>

          {/* Project Overview */}
          <div className={styles.contentGrid}>
            <h2 className={styles.sectionTitle}>
              {t('caseStudy.overview', 'Overview')}
            </h2>
            <div className={styles.sectionContent}>
              <p className={styles.text}>
                {t(`caseStudy.projects.${projectId}.overview`, 'This project represents a comprehensive digital solution, engineered to meet specific business objectives through design and technology.')}
              </p>
            </div>
          </div>

          {/* Improvements */}
          <div className={styles.contentGrid}>
            <h2 className={styles.sectionTitle}>
              {t('caseStudy.improvements', 'Key Features')}
            </h2>
            <div className={styles.sectionContent}>
              <ul className={styles.improvementsList}>
                {(t(`caseStudy.projects.${projectId}.improvements`, { returnObjects: true }) || []).map((improvement, index) => (
                  <li key={index} className={styles.improvementItem}>
                    {improvement}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Done Work */}
          <div className={styles.contentGrid}>
            <h2 className={styles.sectionTitle}>
              {t('caseStudy.doneWork', 'Deliverables')}
            </h2>
            <div className={styles.sectionContent}>
              <div className={styles.workGrid}>
                {(t(`caseStudy.projects.${projectId}.doneWork`, { returnObjects: true }) || []).map((work, index) => (
                  <div key={index} className={styles.workItem}>
                    <h3 className={styles.workTitle}>{work.title}</h3>
                    <p className={styles.workDescription}>{work.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function CaseStudy() {
  return (
    <ThemeProvider>
      <CaseStudyContent />
    </ThemeProvider>
  );
}
