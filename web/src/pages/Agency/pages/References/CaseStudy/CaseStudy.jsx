import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { ThemeProvider, useTheme } from '../../../context/ThemeContext';
import { NavBar } from '../../../../../components/NavBar/NavBar';
import { Footer } from '../../../components/Footer';
import { usePageTitle } from '../../../../../hooks/usePageTitle';
import VisionDump from '../../../../../components/VisionDump/VisionDump';
import styles from './CaseStudy.module.css';

// Import project images
import furgloveThumbnail from '../../../../../assets/FurGloveThhumnail.png';
import furglove2 from '../../../../../assets/Furglove2.png';
import furglove3 from '../../../../../assets/Furglove3.png';
import euroTaxi1 from '../../../../../assets/EuroTaxi1.png';
import euroTaxi2 from '../../../../../assets/Eurotaxi2.png';
import euroTaxi3 from '../../../../../assets/EuroTaxi3.png';
import replacementImage from '../../../../../assets/Replacement image.png';

const ProjectsData = {
  'furglove-pro': {
    id: 'furglove-pro',
    thumbnail: furgloveThumbnail,
    images: [furgloveThumbnail, furglove2, furglove3],
    title: 'FurGlove Pro',
    stack: 'React | TypeScript | Next.js | Tailwind CSS',
    liveUrl: 'https://furglove-pro.vercel.app/'
  },
  'euro-taxi': {
    id: 'euro-taxi',
    thumbnail: euroTaxi1,
    images: [euroTaxi1, euroTaxi2, euroTaxi3],
    title: 'Euro Taxi',
    stack: 'React | TypeScript | Next.js | Tailwind CSS | Leaflet',
    liveUrl: 'https://euro-taxi-as.vercel.app/#/'
  },
  'replacement-project-1': {
    id: 'replacement-project-1',
    thumbnail: replacementImage,
    images: [replacementImage],
    title: 'Replacement Project',
    stack: 'Personal Replacement Project Page',
    liveUrl: null
  },
  'replacement-project-2': {
    id: 'replacement-project-2',
    thumbnail: replacementImage,
    images: [replacementImage],
    title: 'Replacement Project',
    stack: 'Personal Replacement Project Page',
    liveUrl: null
  },
};

function CaseStudyContent() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation(['agency', 'common']);
  const { theme } = useTheme();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
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

  usePageTitle(`${project?.title || 'Case Study'} | Volturio Studios – Webbyrå i Göteborg`);

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
    return () => {
      document.body.removeAttribute('data-theme');
    };
  }, [theme]);

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % project.images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + project.images.length) % project.images.length);
  };

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
            ← {t('common:previous', 'Previous')}
          </Link>

          {/* Hero Section */}
          <motion.div
            className={styles.hero}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            {/* Image Carousel */}
            <div className={styles.carouselWrapper}>
              <div className={styles.carouselContainer}>
                <AnimatePresence mode="wait">
                  <motion.img
                    key={currentImageIndex}
                    src={project.images[currentImageIndex]}
                    alt={`${project.title} - Image ${currentImageIndex + 1}`}
                    className={styles.heroImage}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                  />
                </AnimatePresence>
                
                {/* Carousel Controls */}
                {project.images.length > 1 && (
                  <>
                    <button
                      className={styles.carouselButton}
                      onClick={prevImage}
                      aria-label="Previous image"
                    >
                      <ChevronLeft size={24} />
                    </button>
                    <button
                      className={`${styles.carouselButton} ${styles.carouselButtonRight}`}
                      onClick={nextImage}
                      aria-label="Next image"
                    >
                      <ChevronRight size={24} />
                    </button>
                    
                    {/* Carousel Indicators */}
                    <div className={styles.carouselIndicators}>
                      {project.images.map((_, index) => (
                        <button
                          key={index}
                          className={`${styles.indicator} ${index === currentImageIndex ? styles.indicatorActive : ''}`}
                          onClick={() => setCurrentImageIndex(index)}
                          aria-label={`Go to image ${index + 1}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
            
            <div className={styles.heroContent}>
              <h1 className={styles.heroTitle}>
                {project.id.startsWith('replacement-project') 
                  ? t('references.replacementProject', 'Replacement Project')
                  : project.title}
              </h1>
              <p className={styles.heroStack}>
                {project.id.startsWith('replacement-project')
                  ? t('references.replacementProjectPage', 'Personal Replacement Project Page')
                  : project.stack}
              </p>
              
              {/* Live Link Button */}
              {project.liveUrl && (
                <a
                  href={project.liveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.liveLinkButton}
                >
                  <span>{t('caseStudy.viewLive', 'View Live Site')}</span>
                  <ExternalLink size={18} />
                </a>
              )}
            </div>
          </motion.div>

          {/* Project Overview */}
          <motion.section
            className={styles.section}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h2 className={styles.sectionTitle}>
              {t('caseStudy.overview', 'Project Overview')}
            </h2>
            <div className={styles.sectionContent}>
              <p className={styles.text}>
                {t(`caseStudy.projects.${project.id}.overview`, 'This project showcases our expertise in creating innovative digital solutions. We combined cutting-edge technology with thoughtful design to deliver a product that exceeds expectations.')}
              </p>
            </div>
          </motion.section>

          {/* Improvements */}
          <motion.section
            className={styles.section}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <h2 className={styles.sectionTitle}>
              {t('caseStudy.improvements', 'What We Improved')}
            </h2>
            <div className={styles.sectionContent}>
              <ul className={styles.improvementsList}>
                {(t(`caseStudy.projects.${project.id}.improvements`, { returnObjects: true }) || []).map((improvement, index) => (
                  <li key={index} className={styles.improvementItem}>
                    {improvement}
                  </li>
                ))}
              </ul>
            </div>
          </motion.section>

          {/* Done Work */}
          <motion.section
            className={styles.section}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <h2 className={styles.sectionTitle}>
              {t('caseStudy.doneWork', 'Work Completed')}
            </h2>
            <div className={styles.sectionContent}>
              <div className={styles.workGrid}>
                {(t(`caseStudy.projects.${project.id}.doneWork`, { returnObjects: true }) || []).map((work, index) => (
                  <div key={index} className={styles.workItem}>
                    <h3 className={styles.workTitle}>{work.title}</h3>
                    <p className={styles.workDescription}>{work.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.section>
        </div>
      </main>

      <Footer />
      <VisionDump />
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

