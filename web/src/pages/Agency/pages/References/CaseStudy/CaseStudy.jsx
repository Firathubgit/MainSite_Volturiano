import React, { useEffect, useLayoutEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { ThemeProvider, useTheme } from '../../../context/ThemeContext';
import { NavBar } from '../../../../../components/NavBar/NavBar';
import { Footer } from '../../../components/Footer';
import { usePageTitle } from '../../../../../hooks/usePageTitle';
import { useUiStore } from '../../../../../stores/uiStore';
import styles from './CaseStudy.module.css';

// Import project images
import scaleIntelligenceThumbnail from '../../../../../assets/ScaleIntelegenceMocup.png';
import europaBageriThumbnail from '../../../../../assets/EuropaBageriMockipadpic.png';
import furgloveThumbnail from '../../../../../assets/FurGloveExample.png';
import euroTaxiThumbnail from '../../../../../assets/EuroTaxiExample.png';
import volturianoAgencyMockup from '../../../../../assets/VolturianoAgencyMockupExample.png';
import solarExampleThumbnail from '../../../../../assets/SolarExample.png';
import mathornanThumbnail from '../../../../../assets/Mathörnan.png';
import chockladThumbnail from '../../../../../assets/Chocklad.png';
import platformThumbnail from '../../../../../assets/114shots_so.png';
import qyvoraClimateThumbnail from '../../../../../assets/87shots_so.png';
import tornadoLogo from '../../../../../assets/Logo/TornadoLogo.png';

// CTA banner background
import ctaBannerBg from '../../../../../assets/AbstractishImage.png';

/* ───────── Project data ───────── */
const ProjectsData = {
  'volturiano': {
    id: 'volturiano',
    thumbnail: volturianoAgencyMockup,
    liveUrl: 'https://volturiano.com/agency',
  },
  'euro-taxi': {
    id: 'euro-taxi',
    thumbnail: euroTaxiThumbnail,
    liveUrl: 'https://www.eurotaxias.no/',
  },
  'furglove-pro': {
    id: 'furglove-pro',
    thumbnail: furgloveThumbnail,
    liveUrl: 'https://furglove-pro.vercel.app/',
  },
  'europa-bageri': {
    id: 'europa-bageri',
    thumbnail: europaBageriThumbnail,
    liveUrl: 'https://europa-bageri-premium.vercel.app/',
  },
  'scale-intelligence': {
    id: 'scale-intelligence',
    thumbnail: scaleIntelligenceThumbnail,
    liveUrl: 'https://wave-form-example-website.vercel.app/?',
  },
  'solar-panel-solutions': {
    id: 'solar-panel-solutions',
    thumbnail: solarExampleThumbnail,
    liveUrl: 'https://solar-example.vercel.app/',
  },
  'mathornan': {
    id: 'mathornan',
    thumbnail: mathornanThumbnail,
    liveUrl: 'https://matcorner.vercel.app/',
  },
  'oompaloompa': {
    id: 'oompaloompa',
    thumbnail: chockladThumbnail,
    liveUrl: 'https://chocolata-mvp-ksrb.vercel.app/',
  },
  'volturiano-platform': {
    id: 'volturiano-platform',
    thumbnail: platformThumbnail,
    liveUrl: '/start',
    isInternal: true,
  },
  'qyvora-climate': {
    id: 'qyvora-climate',
    thumbnail: qyvoraClimateThumbnail,
    liveUrl: 'https://climate-nu-cyan.vercel.app/',
  },
};

/* ───────── Main component ───────── */
function CaseStudyContent() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation(['agency', 'common']);
  const { theme } = useTheme();
  const enterPlatform = useUiStore((state) => state.enterPlatform);

  const project = ProjectsData[projectId];

  // Scroll to top
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);

  // Redirect if unknown project
  useEffect(() => {
    if (!project) {
      navigate('/agency/references', { replace: true });
    }
  }, [project, navigate]);

  // Theme
  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
    return () => document.body.removeAttribute('data-theme');
  }, [theme]);

  // i18n lookups
  const projectTitle = project?.isPlaceholder
    ? t('references.replacementProject', 'Replacement Project')
    : t(`selectedWork.projects.${projectId}.title`, projectId);

  const projectOverview = t(
    `caseStudy.projects.${projectId}.overview`,
    'This project represents a comprehensive digital solution, engineered to meet specific business objectives through design and technology.'
  );

  const purchaseNote = t(`caseStudy.projects.${projectId}.purchaseNote`, '');

  usePageTitle(`${projectTitle || 'Case Study'} | Volturio Studios`);

  if (!project) return null;

  return (
    <div className={styles.page}>
      <NavBar />

      {/* ──── Section 1: Full-bleed Hero ──── */}
      <section className={styles.hero}>
        <motion.img
          src={project.thumbnail}
          alt={projectTitle}
          className={styles.heroImage}
          initial={{ scale: 1.06, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
        <div className={styles.heroGradient} />

        {/* Bottom content */}
        <div className={styles.heroBottom}>
          {/* Left: logo + title + buttons */}
          <div className={styles.heroLeft}>
            <img src={tornadoLogo} alt="Volturio" className={styles.heroLogo} />
            <h1 className={styles.heroTitle}>{projectTitle}</h1>
            <div className={styles.heroButtons}>
              {project.liveUrl && project.isInternal ? (
                <Link
                  to={project.liveUrl}
                  className={styles.pillBtn}
                  onClick={() => { enterPlatform(); window.scrollTo(0, 0); }}
                >
                  Preview
                </Link>
              ) : project.liveUrl ? (
                <a
                  href={project.liveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.pillBtn}
                >
                  Preview
                </a>
              ) : null}
            </div>
          </div>

          {/* Right: description */}
          <div className={styles.heroRight}>
            <p className={styles.heroDesc}>{projectOverview}</p>
            {purchaseNote && (
              <p className={styles.purchaseNote}>{purchaseNote}</p>
            )}
            
            {projectId === 'volturiano-platform' && (
              <a
                href="/documents/Volturiano_Platform_Features.html"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.downloadRow}
              >
                <svg className={styles.downloadIcon} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8 1v9m0 0L5 7m3 3l3-3M2 12v1a2 2 0 002 2h8a2 2 0 002-2v-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className={styles.downloadLabel}>
                  {t(`caseStudy.projects.volturiano-platform.downloadFeatures`, 'Download Feature List')}
                </span>
              </a>
            )}
          </div>
        </div>
      </section>

      {/* ──── Section 2: CTA Banner ──── */}
      <section className={styles.ctaBanner}>
        <img src={ctaBannerBg} alt="" className={styles.ctaBannerBg} aria-hidden="true" />
        <div className={styles.ctaBannerOverlay} />
        <div className={styles.ctaBannerContent}>
          <h2 className={styles.ctaTitle}>{t('caseStudy.ctaTitle', 'Reimagine websites with us')}</h2>
          <p className={styles.ctaSubtitle}>
            {t('caseStudy.ctaSubtitle', 'Premium web experiences for your brand, built by Volturio Studios.')}
          </p>
          <Link to="/agency/booking" className={styles.ctaBtn}>
            {t('caseStudy.ctaButton', 'Unlock Unlimited Access')}
          </Link>
        </div>
      </section>

      {/* ──── Section 3: Footer ──── */}
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
