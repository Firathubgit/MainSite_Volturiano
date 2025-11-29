import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Button } from './ui/Button';
import styles from './PricingOverview.module.css';

const plans = [
  { 
    name: "PROTOTYPE", 
    price: "$15k", 
    desc: "For validation", 
    features: ["Core MVP Features", "Standard UI System", "2 Weeks Sprint"] 
  },
  { 
    name: "GROWTH", 
    price: "$50k", 
    desc: "For scaling", 
    features: ["Full Platform", "Custom Design Language", "Admin Dashboard", "3 Months Support"], 
    featured: true 
  },
  { 
    name: "ENTERPRISE", 
    price: "CUSTOM", 
    desc: "For dominance", 
    features: ["Bespoke Architecture", "Dedicated Team", "SLA Support", "Unlimited Revision"] 
  }
];

export function PricingOverview({ onOpenContact }) {
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>INVESTMENT</h2>
          <p className={styles.subtitle}>
            Clear pricing structures for premium deliverables. We don't do hidden fees or scope creep.
          </p>
        </div>

        <div className={styles.grid}>
          {plans.map((plan, i) => (
            <div key={i} className={`${styles.card} ${plan.featured ? styles.cardFeatured : ''}`}>
              {plan.featured && (
                <div className={styles.featuredBadge}>Recommended</div>
              )}
              
              <h3 className={styles.planName}>{plan.name}</h3>
              <div className={styles.priceContainer}>
                <span className={styles.price}>
                  {plan.name === 'ENTERPRISE' ? '' : 'from '}{plan.price}
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
                Inquire Now
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}


