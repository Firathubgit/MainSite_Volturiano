import React from 'react';
import { Button } from './ui/Button';
import { ServiceCard } from './ServiceCard';
import { SERVICES } from '../constants';
import styles from './ServiceShowcase.module.css';

export function ServiceShowcase({ onOpenContact, onOpenDemo }) {
  return (
    <section id="services" className={styles.section}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <h2 className={styles.title}>OUR EXPERTISE</h2>
            <p className={styles.subtitle}>Comprehensive technical services tailored for high-performance brands.</p>
          </div>
          <Button variant="outline" className={styles.consultationButton} onClick={() => onOpenDemo(null)}>
            Book a Consultation
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

