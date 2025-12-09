import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePageTitle } from '../../hooks/usePageTitle';
import { HeroSection, MarqueeTicker } from './components/HeroSection';
import { ClientLogos } from './components/ClientLogos';
import { TechTicker } from './components/TechTicker';
import { ServiceShowcase } from './components/ServiceShowcase';
import { PortfolioGrid } from './components/PortfolioGrid';
import { DeviceShowcase } from './components/DeviceShowcase';
import { CaseStudy } from './components/CaseStudy';
import { TeamShowcase } from './components/TeamShowcase';
import { PricingOverview } from './components/PricingOverview';
import { ContactFormModal } from './components/modals/ContactFormModal';
import { DemoRequestModal } from './components/modals/DemoRequestModal';
import { SERVICES } from './constants';
import styles from './Agency.module.css';

export default function Agency() {
  const { t } = useTranslation(['agency', 'common']);
  usePageTitle(t('agency:pageTitle'));
  
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

  return (
    <div className={styles.page}>
      <div className={styles.backgroundEffects}>
        <div className={styles.gridPattern} />
        <div className={styles.vignette} />
      </div>

      <HeroSection 
        onOpenContact={openContact}
        onScrollToServices={() => scrollToSection('services')}
      />

      <div className={styles.contentWrapper}>
        <MarqueeTicker />

        <ClientLogos />

        <TechTicker />

        <DeviceShowcase />
        <CaseStudy />

        <TeamShowcase />

        <ServiceShowcase 
          onOpenContact={openContact}
          onOpenDemo={openDemo}
        />

        <PortfolioGrid />







        <PricingOverview onOpenContact={openContact} />

        <footer className={styles.footer}>
        <div className={styles.footerContainer}>
          <div className={styles.footerGrid}>
            <div className={styles.footerBrand}>
              <a href="#" className={styles.footerLogo}>{t('agency:footer.logo')}</a>
              <p className={styles.footerDescription}>
                {t('agency:footer.description')}
              </p>
              <div className={styles.footerSocial}>
                {['Twitter', 'LinkedIn', 'Instagram'].map(social => (
                  <a key={social} href="#" className={styles.socialLink}>
                    {social}
                  </a>
                ))}
              </div>
            </div>
            
            <div className={styles.footerColumn}>
              <h4 className={styles.footerTitle}>{t('agency:footer.servicesTitle')}</h4>
              <ul className={styles.footerList}>
                {SERVICES.map(s => (
                  <li key={s.id}>
                    <a 
                      href="#" 
                      onClick={(e) => { 
                        e.preventDefault(); 
                        openDemo(s.id); 
                      }} 
                      className={styles.footerLink}
                    >
                      {t(`agency:services.items.${s.id}.title`)}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className={styles.footerColumn}>
              <h4 className={styles.footerTitle}>{t('agency:footer.companyTitle')}</h4>
              <ul className={styles.footerList}>
                <li><a href="#" className={styles.footerLink}>{t('agency:footer.links.about')}</a></li>
                <li><a href="#" className={styles.footerLink}>{t('agency:footer.links.careers')}</a></li>
                <li><a href="#" className={styles.footerLink}>{t('agency:footer.links.contact')}</a></li>
                <li><a href="#" className={styles.footerLink}>{t('agency:footer.links.privacyPolicy')}</a></li>
              </ul>
            </div>
          </div>

          <div className={styles.footerBottom}>
            <div className={styles.footerCopyright}>
              {t('agency:footer.copyright')}
            </div>
            <div className={styles.footerStatus}>
              <span className={styles.statusDot}></span>
              {t('agency:footer.status')}
            </div>
          </div>
        </div>
      </footer>
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

















