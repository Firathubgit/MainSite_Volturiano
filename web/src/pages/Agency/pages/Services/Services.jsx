import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeProvider, useTheme } from '../../context/ThemeContext';
import { NavBar } from '../../../../components/NavBar/NavBar';
import { Footer } from '../../components/Footer';
import { PackageCards } from '../../components/PackageCards';
import { usePageTitle } from '../../../../hooks/usePageTitle';
import VisionDump from '../../../../components/VisionDump/VisionDump';
import styles from './Services.module.css';

const PackageDetailItem = ({ title, description, features }) => (
  <div className={styles.detailItem}>
    <h3 className={styles.detailTitle}>{title}</h3>
    <p className={styles.detailDescription}>{description}</p>
    <ul className={styles.featureList}>
      {features.map((feature, index) => (
        <li key={index} className={styles.featureItem}>{feature}</li>
      ))}
    </ul>
  </div>
);

function ServicesContent() {
  const { t } = useTranslation(['agency', 'common']);
  const { theme } = useTheme();
  const [activeDetailIndex, setActiveDetailIndex] = useState(1); // Default to titanium (index 1)
  usePageTitle(`${t('agencyMenu.services')} | Volturiano Agency`);

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
    return () => {
      document.body.removeAttribute('data-theme');
    };
  }, [theme]);


  const openContact = () => {
    document.getElementById('footer')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleActiveIndexChange = (index) => {
    setActiveDetailIndex(index);
  };

  // Extract package data for the details section
  const silverPkg = t('packageCards.packages.silver', { returnObjects: true });
  const titaniumPkg = t('packageCards.packages.titanium', { returnObjects: true });
  const goldPkg = t('packageCards.packages.gold', { returnObjects: true });

  const packages = [
    { ...silverPkg, description: t('services.items.luxury-ui-design.description') },
    { ...titaniumPkg, description: t('services.items.3d-configurators.description') },
    { ...goldPkg, description: t('services.items.fullstack-websites.description') }
  ];

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
            {t('services.title', 'Our Services')}
          </motion.h1>
          <motion.p
            className={styles.subtitle}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
          >
            {t('services.subtitle', 'Comprehensive digital solutions for modern businesses.')}
          </motion.p>
        </div>

        <div className={styles.sectionWrapper}>
          <PackageCards onOpenContact={openContact} onActiveIndexChange={handleActiveIndexChange} />
        </div>

        <div className={styles.detailsContainer}>
          {/* Desktop: Show all items */}
          <div className={styles.detailsGrid}>
            {packages.map((pkg, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className={styles.detailItemWrapper}
              >
                <PackageDetailItem 
                  title={pkg.name}
                  description={pkg.description}
                  features={pkg.features}
                />
              </motion.div>
            ))}
          </div>

          {/* Mobile: Show only active item */}
          <div className={styles.detailsGridMobile}>
            <AnimatePresence mode="wait">
              {packages.map((pkg, index) => 
                index === activeDetailIndex ? (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    style={{ width: '100%' }}
                  >
                    <PackageDetailItem 
                      title={pkg.name}
                      description={pkg.description}
                      features={pkg.features}
                    />
                  </motion.div>
                ) : null
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      <Footer />
      <VisionDump />
    </div>
  );
}

export default function Services() {
  return (
    <ThemeProvider>
      <ServicesContent />
    </ThemeProvider>
  );
}

