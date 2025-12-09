import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './ui/Button';
import { ServiceCard } from './ServiceCard';
import { SERVICES } from '../constants';
import styles from './ServiceShowcase.module.css';

export function ServiceShowcase({ onOpenContact, onOpenDemo }) {
  const { t } = useTranslation('agency');
  
  return (
    <section id="services" className={styles.section}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <h2 className={styles.title}>{t('services.title')}</h2>
            <p className={styles.subtitle}>{t('services.subtitle')}</p>
          </div>
          <Button variant="outline" className={styles.consultationButton} onClick={() => onOpenDemo(null)}>
            {t('services.bookConsultation')}
          </Button>
        </div>

        <div className={styles.grid}>
          {SERVICES.map((service, index) => (
            <ServiceCard
              key={service.id}
              service={service}
              index={index}
              onGetQuote={onOpenContact}
              onRequestDemo={onOpenDemo}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

