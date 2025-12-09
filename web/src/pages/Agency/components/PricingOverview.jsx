import React from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2 } from 'lucide-react';
import { Button } from './ui/Button';
import styles from './PricingOverview.module.css';

export function PricingOverview({ onOpenContact }) {
  const { t } = useTranslation('agency');
  
  const plans = [
    { 
      id: 'prototype',
      name: t('pricing.plans.prototype.name'), 
      price: t('pricing.plans.prototype.price'), 
      desc: t('pricing.plans.prototype.desc'), 
      features: t('pricing.plans.prototype.features', { returnObjects: true })
    },
    { 
      id: 'growth',
      name: t('pricing.plans.growth.name'), 
      price: t('pricing.plans.growth.price'), 
      desc: t('pricing.plans.growth.desc'), 
      features: t('pricing.plans.growth.features', { returnObjects: true }),
      featured: true 
    },
    { 
      id: 'enterprise',
      name: t('pricing.plans.enterprise.name'), 
      price: t('pricing.plans.enterprise.price'), 
      desc: t('pricing.plans.enterprise.desc'), 
      features: t('pricing.plans.enterprise.features', { returnObjects: true })
    }
  ];

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>{t('pricing.title')}</h2>
          <p className={styles.subtitle}>
            {t('pricing.subtitle')}
          </p>
        </div>

        <div className={styles.grid}>
          {plans.map((plan, i) => (
            <div key={i} className={`${styles.card} ${plan.featured ? styles.cardFeatured : ''}`}>
              {plan.featured && (
                <div className={styles.featuredBadge}>{t('pricing.recommended')}</div>
              )}
              
              <h3 className={styles.planName}>{plan.name}</h3>
              <div className={styles.priceContainer}>
                <span className={styles.price}>
                  {plan.id === 'enterprise' ? '' : t('pricing.from')}{plan.price}
                </span>
              </div>
              <p className={styles.planDesc}>{plan.desc}</p>

              <ul className={styles.features}>
                {plan.features.map((f, idx) => (
                  <li key={idx} className={styles.feature}>
                    <CheckCircle2 size={14} className={styles.featureIcon} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <Button 
                variant={plan.featured ? 'primary' : 'outline'} 
                fullWidth 
                className={plan.featured ? styles.featuredButton : styles.button}
                onClick={() => onOpenContact(null)}
              >
                {t('pricing.inquireNow')}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}


