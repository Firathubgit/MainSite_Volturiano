import React from 'react';
import { useTranslation } from 'react-i18next';
import styles from './SystemMetrics.module.css';

export function SystemMetrics() {
  const { t } = useTranslation('agency');
  
  const metrics = t('systemMetrics.metrics', { 
    returnObjects: true,
    defaultValue: [
      { label: "Global Uptime", value: "99.99%", desc: "Redundant edge network active" },
      { label: "Render Cycles", value: "4.2M+", desc: "Polygons processed daily" },
      { label: "Avg. Latency", value: "<12ms", desc: "Global response time" },
    ]
  });
  
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.grid}>
          {metrics.map((m, i) => (
            <div key={i} className={styles.metricItem}>
              <p className={styles.label}>{m.label}</p>
              <h3 className={styles.value}>{m.value}</h3>
              <p className={styles.description}>{m.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

