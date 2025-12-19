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
import { Philosophy } from './components/Philosophy';
import { ConceptGrid } from './components/ConceptGrid';
import { PedestalShowcase } from './components/PedestalShowcase';
import { TwoImageSolution } from './components/TwoImageSolution';
import { SystemMetrics } from './components/SystemMetrics';
import { PackageCards } from './components/PackageCards';
import { Footer } from './components/Footer';
import { ContactFormModal } from './components/modals/ContactFormModal';
import { DemoRequestModal } from './components/modals/DemoRequestModal';
import VisionDump from '../../components/VisionDump/VisionDump';
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
        onScrollToServices={() => scrollToSection('package-cards')}
      />

      <div className={styles.contentWrapper}>
        <MarqueeTicker />

        <ClientLogos />

        <TechTicker />
        <Philosophy />
        <PedestalShowcase />
        <TwoImageSolution />
        {/* <ConceptGrid /> */}
        {/* <DeviceShowcase /> */}
        <PortfolioGrid />

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









        <PackageCards onOpenContact={openContact} />

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

      {/* Vision Dump - Internal Developer Tool */}
      <VisionDump />
    </div>
  );
}

















