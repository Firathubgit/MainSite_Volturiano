import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import styles from './SelectedWork.module.css';

// Import the specific assets requested
import projectRocket from '../../../assets/VolturianoAgencyMockupExample.png';
import projectSaas from '../../../assets/EuroTaxiExample.png';
import projectStrat from '../../../assets/FurGloveExample.png';

export function SelectedWork() {
  const { t } = useTranslation('agency');

  // Projects with direct live links
  const selectedProjects = [
    {
      id: 'volturiano',
      image: projectRocket,
      link: '/agency', // Links to home/agency page itself
      external: false
    },
    {
      id: 'euro-taxi',
      image: projectSaas,
      link: 'https://euro-taxi-as.vercel.app/#/',
      external: true
    },
    {
      id: 'furglove-pro',
      image: projectStrat,
      link: 'https://furglove-pro.vercel.app/',
      external: true
    }
  ];

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.label}>{t('selectedWork.title', 'Case Studies')}</h2>
          <Link to="/agency/references" className={styles.actionLink}>
            {t('selectedWork.showAll', '[ SHOW-ALL ]')}
          </Link>
        </div>

        <div className={styles.grid}>
          {selectedProjects.map((project, index) => {
            const titleKey = `selectedWork.projects.${project.id}.title`;
            const categoryKey = `selectedWork.projects.${project.id}.category`;
            
            const content = (
              <motion.div
                className={styles.card}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <div className={styles.imageContainer}>
                  <img 
                    src={project.image} 
                    alt={t(titleKey, project.id)} 
                    className={styles.image}
                  />
                </div>
                <div className={styles.info}>
                  <h3 className={styles.title}>
                    {t(titleKey, project.id)}
                  </h3>
                  <span className={styles.category}>
                    {t(categoryKey, '')}
                  </span>
                </div>
              </motion.div>
            );

            if (project.external) {
              return (
                <a
                  key={project.id}
                  href={project.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.cardLink}
                >
                  {content}
                </a>
              );
            }

            return (
              <Link
                key={project.id}
                to={project.link}
                className={styles.cardLink}
              >
                {content}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
