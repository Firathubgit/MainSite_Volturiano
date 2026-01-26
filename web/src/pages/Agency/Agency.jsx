import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { usePageTitle } from '../../hooks/usePageTitle';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { motion } from 'framer-motion';
import { ArrowDownRight } from 'lucide-react';
import { ClientLogos } from './components/ClientLogos';
import { TechTicker } from './components/TechTicker';
import { ServiceShowcase } from './components/ServiceShowcase';
// import { PortfolioGrid } from './components/PortfolioGrid';
import { SelectedWork } from './components/SelectedWork';
import { DeviceShowcase } from './components/DeviceShowcase';
import { CaseStudy } from './components/CaseStudy';
import { TeamShowcase } from './components/TeamShowcase';
import { AgencyPurpose } from './components/AgencyPurpose';
import { ConceptGrid } from './components/ConceptGrid';
import { PedestalShowcase } from './components/PedestalShowcase';
import { TwoImageSolution } from './components/TwoImageSolution';
import { SystemMetrics } from './components/SystemMetrics';
import { PackageCards } from './components/PackageCards';
import { Footer } from './components/Footer';
import { ContactFormModal } from './components/modals/ContactFormModal';
import { DemoRequestModal } from './components/modals/DemoRequestModal';
import { SERVICES } from './constants';
import { usePreload, usePreloadOnIntersect } from './hooks/usePreload';
import styles from './Agency.module.css';
import heroStyles from './AgencyHero.module.css';

// Import images for preloading
import furGloveThumbnail from '../../assets/FurGloveThhumnail.png';
import euroTaxiThumbnail from '../../assets/EuroTaxi1.png';
import replacementImage from '../../assets/Replacement image.png';
import GoldPackage from '../../assets/Logo/GOLDPackage.png';
import SilverPackage from '../../assets/Logo/SilverPackage.png';
import TitaniumPackage from '../../assets/Logo/TitaniumPackage.png';
import TornadoLogo from '../../assets/Logo/TornadoLogo.png';
import heroVideo from '../../assets/Make_a_video_1080p_202601231618.mp4';

function AgencyContent() {
  const { t } = useTranslation(['agency', 'common']);
  usePageTitle(t('agency:pageTitle'));
  
  // SEO Meta Description and Open Graph tags
  useEffect(() => {
    const isSwedish = t('common:language', { defaultValue: 'sv' }) === 'sv' || 
                      document.documentElement.lang === 'sv' ||
                      localStorage.getItem('volt_language') === 'sv';
    
    const description = isSwedish 
      ? 'Vi bygger avancerade webblösningar, från 3D-konfiguratorer till kundportaler. Paket från 30k till 100k för företag som vill växa.'
      : 'We build advanced web solutions, from 3D configurators to customer portals. Packages from 30k to 100k for businesses that want to grow.';
    
    const title = isSwedish
      ? 'Volturio Studios | Premium Webbyrå i Göteborg – Skräddarsydda system'
      : 'Volturio Studios | Premium Web Agency in Gothenburg – Custom Systems';
    
    // Meta description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', description);
    } else {
      metaDescription = document.createElement('meta');
      metaDescription.name = 'description';
      metaDescription.content = description;
      document.head.appendChild(metaDescription);
    }
    
    // Open Graph description
    let ogDescription = document.querySelector('meta[property="og:description"]');
    if (ogDescription) {
      ogDescription.setAttribute('content', description);
    } else {
      ogDescription = document.createElement('meta');
      ogDescription.setAttribute('property', 'og:description');
      ogDescription.content = description;
      document.head.appendChild(ogDescription);
    }
    
    // Open Graph title
    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) {
      ogTitle.setAttribute('content', title);
    } else {
      ogTitle = document.createElement('meta');
      ogTitle.setAttribute('property', 'og:title');
      ogTitle.content = title;
      document.head.appendChild(ogTitle);
    }
    
    // Open Graph URL
    let ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) {
      ogUrl.setAttribute('content', 'https://volturiano.com/agency');
    } else {
      ogUrl = document.createElement('meta');
      ogUrl.setAttribute('property', 'og:url');
      ogUrl.content = 'https://volturiano.com/agency';
      document.head.appendChild(ogUrl);
    }
    
    // Set canonical URL
    let canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) {
      canonical.setAttribute('href', 'https://volturiano.com/agency');
    } else {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      canonical.href = 'https://volturiano.com/agency';
      document.head.appendChild(canonical);
    }
    
    // Add Schema.org LocalBusiness structured data for local SEO
    let schemaScript = document.querySelector('script[type="application/ld+json"][data-agency-schema]');
    if (!schemaScript) {
      const schema = {
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        "@id": "https://volturiano.com/agency",
        "name": "Volturio Studios",
        "alternateName": "Volturiano Agency",
        "description": isSwedish 
          ? "Premium webbyrå i Göteborg som bygger avancerade webblösningar, från 3D-konfiguratorer till kundportaler. Skräddarsydda system för företag som vill växa."
          : "Premium web agency in Gothenburg building advanced web solutions, from 3D configurators to customer portals. Custom systems for businesses that want to grow.",
        "url": "https://volturiano.com/agency",
        "logo": "https://volturiano.com/logo.png",
        "image": "https://volturiano.com/og-image.jpg",
        "address": {
          "@type": "PostalAddress",
          "addressLocality": "Göteborg",
          "addressRegion": "Västra Götaland",
          "addressCountry": "SE"
        },
        "geo": {
          "@type": "GeoCoordinates",
          "latitude": "57.7089",
          "longitude": "11.9746"
        },
        "areaServed": {
          "@type": "City",
          "name": "Göteborg"
        },
        "priceRange": "30000-100000 SEK",
        "serviceType": [
          "Webbutveckling",
          "Webbyrå",
          "E-handel",
          "3D-konfiguratorer",
          "Kundportaler",
          "Webblösningar"
        ],
        "sameAs": [
          "https://www.linkedin.com/company/volturiano",
          "https://github.com/volturiano"
        ]
      };
      
      schemaScript = document.createElement('script');
      schemaScript.type = 'application/ld+json';
      schemaScript.setAttribute('data-agency-schema', 'true');
      schemaScript.textContent = JSON.stringify(schema);
      document.head.appendChild(schemaScript);
    }
  }, [t]);
  
  const [activeModal, setActiveModal] = useState(null);
  const [selectedServiceId, setSelectedServiceId] = useState(null);

  const openContact = (serviceId = null) => {
    setSelectedServiceId(serviceId);
    setActiveModal('contact');
  };

  const openDemo = (serviceId = null) => {
    setSelectedServiceId(serviceId);
    setActiveModal('demo');
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedServiceId(null);
  };

  const scrollToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const { theme } = useTheme();

  // Refs for intersection-based preloading
  const portfolioRef = useRef(null);
  const packageCardsRef = useRef(null);

  // Preload images immediately (high priority)
  usePreload(
    [
      TornadoLogo, // Footer logo - always visible
    ],
    { delay: 100, priority: 1 }
  );

  // Preload images when user scrolls near components (medium priority)
  usePreload(
    [
      GoldPackage,
      SilverPackage,
      TitaniumPackage,
    ],
    { delay: 500, priority: 2 }
  );

  // Preload portfolio images when near viewport
  usePreloadOnIntersect(
    portfolioRef,
    [
      furGloveThumbnail,
      euroTaxiThumbnail,
      replacementImage,
    ],
    { rootMargin: '300px', delay: 0 }
  );

  // Preload package images when near viewport
  usePreloadOnIntersect(
    packageCardsRef,
    [
      GoldPackage,
      SilverPackage,
      TitaniumPackage,
    ],
    { rootMargin: '400px', delay: 0 }
  );

  // Set data-theme on body so NavBar can access it
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

      {/* Hero Section with Video */}
      <section className={heroStyles.heroSection}>
        <video
          className={heroStyles.heroVideo}
          autoPlay
          loop
          muted
          playsInline
        >
          <source src={heroVideo} type="video/mp4" />
        </video>
        <motion.div
          className={heroStyles.heroContent}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className={heroStyles.textWrapper}>
            <motion.h1 
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
              className={heroStyles.title1}
            >
              Volturio Studios
            </motion.h1>
          </div>

          <div className={heroStyles.textWrapper}>
            <motion.h1 
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              transition={{ duration: 1, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              className={heroStyles.title2}
            >
              {(() => {
                const titleText = t('hero.agencyTitle', 'AGENCY.');
                // Split text to make "WEBBYRO" (or "WEB BYRO") always hovered
                // Match "WEB BYRO" with space, or "WEBBYRO" without space
                const match = titleText.match(/(WEB\s*BYRO|WEBBYRO)/i);
                if (match) {
                  const parts = titleText.split(new RegExp(`(${match[0]})`, 'i'));
                  return parts.map((part, index) => {
                    const normalizedPart = part.toUpperCase().replace(/\s+/g, '');
                    if (normalizedPart === 'WEBBYRO' || part.toUpperCase().trim() === 'WEB BYRO') {
                      return <span key={index} className={heroStyles.webbyroAlwaysHover}>{part}</span>;
                    }
                    return part;
                  });
                }
                return titleText;
              })()}
            </motion.h1>
          </div>

          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className={heroStyles.descriptionContainer}
          >
            <p className={heroStyles.description}>
              <span className={heroStyles.desktopText}>
                {t('hero.description', { defaultValue: 'We help Businesses Grow through Professional Websites that are visible, functional, and bring in new Customers.' }).replace(/<[^>]*>/g, '')}
              </span>
              <span className={heroStyles.mobileText}>
                {t('hero.descriptionMobile', { defaultValue: 'Vi hjälper företag att växa genom premium Webbplatser' })}
              </span>
            </p>
            <a 
              href="#footer" 
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('footer')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className={heroStyles.exploreLink}
            >
              {t('hero.exploreServices', 'STARTA DITT PROJEKT')}
              <ArrowDownRight className={heroStyles.arrowIcon} />
            </a>
          </motion.div>
        </motion.div>
      </section>

      <div className={styles.contentWrapper}>
        {/* Project Examples - First after hero */}
        <div ref={portfolioRef}>
          <SelectedWork />
        </div>

        {/* Vårt Syfte */}
        <AgencyPurpose />

        {/* Package Cards */}
        <div ref={packageCardsRef}>
          <PackageCards onOpenContact={openContact} />
        </div>

        {/* <ClientLogos /> */}
        {/* <TechTicker /> */}
        {/* <PedestalShowcase /> */}
        {/* <TwoImageSolution /> */}
        {/* <ConceptGrid /> */}
        {/* <DeviceShowcase /> */}
        {/* <PortfolioGrid /> */}
        {/* TeamShowcase - Commented out for now... */}
        {/* <TeamShowcase /> */}
        {/* CaseStudy - Commented out for now... */}
        {/* <CaseStudy /> */}
        {/* <SystemMetrics /> */}
        {/* ServiceShowcase - Commented out for now... */}
        {/* <ServiceShowcase 
          onOpenContact={openContact}
          onOpenDemo={openDemo}
        /> */}


        <Footer />
      </div>

      <ContactFormModal 
        isOpen={activeModal === 'contact'} 
        onClose={closeModal}
        initialServiceId={selectedServiceId}
      />
      <DemoRequestModal 
        isOpen={activeModal === 'demo'} 
        onClose={closeModal}
        initialServiceId={selectedServiceId}
      />

    </div>
  );
}

export default function Agency() {
  return (
    <ThemeProvider>
      <AgencyContent />
    </ThemeProvider>
  );
}

















