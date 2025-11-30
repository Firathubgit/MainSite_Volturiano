import React, { useState } from 'react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { HeroSection } from './components/HeroSection';
import { TechTicker } from './components/TechTicker';
import { ServiceShowcase } from './components/ServiceShowcase';
import { CaseStudy } from './components/CaseStudy';
import { PricingOverview } from './components/PricingOverview';
import { ContactFormModal } from './components/modals/ContactFormModal';
import { DemoRequestModal } from './components/modals/DemoRequestModal';
import { SERVICES } from './constants';
import styles from './Agency.module.css';

export default function Agency() {
  usePageTitle('Volturiano Agency – Premium Software Services');
  
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

      <TechTicker />

      <ServiceShowcase 
        onOpenContact={openContact}
        onOpenDemo={openDemo}
      />

      <CaseStudy />

      <PricingOverview onOpenContact={openContact} />

      <footer className={styles.footer}>
        <div className={styles.footerContainer}>
          <div className={styles.footerGrid}>
            <div className={styles.footerBrand}>
              <a href="#" className={styles.footerLogo}>VOLTURIANO_AGENCY</a>
              <p className={styles.footerDescription}>
                Commissioning the future of digital luxury. Investor-grade assets for forward-thinking brands.
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
              <h4 className={styles.footerTitle}>SERVICES</h4>
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
                      {s.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className={styles.footerColumn}>
              <h4 className={styles.footerTitle}>COMPANY</h4>
              <ul className={styles.footerList}>
                <li><a href="#" className={styles.footerLink}>About</a></li>
                <li><a href="#" className={styles.footerLink}>Careers</a></li>
                <li><a href="#" className={styles.footerLink}>Contact</a></li>
                <li><a href="#" className={styles.footerLink}>Privacy Policy</a></li>
              </ul>
            </div>
          </div>

          <div className={styles.footerBottom}>
            <div className={styles.footerCopyright}>
              © 2024 VOLTURIANO INC. ALL RIGHTS RESERVED.
            </div>
            <div className={styles.footerStatus}>
              <span className={styles.statusDot}></span>
              ALL SYSTEMS OPERATIONAL
            </div>
          </div>
        </div>
      </footer>

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








