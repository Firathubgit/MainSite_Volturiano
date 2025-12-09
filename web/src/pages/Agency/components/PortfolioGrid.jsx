import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import furGloveThumbnail from '../../../assets/FurGloveThhumnail.png';
import styles from './PortfolioGrid.module.css';

export function PortfolioGrid() {
  const { t } = useTranslation('agency');
  const projects = t('portfolio.projects', { returnObjects: true });
  
  const handleProjectClick = (url) => {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <section id="portfolio" className={styles.section}>
      <div className={styles.gradient} />
      
      <div className={styles.container}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className={styles.header}
        >
          <h4 className={styles.label}>{t('portfolio.label')}</h4>
          <h2 className={styles.title}>{t('portfolio.title')}</h2>
          <p className={styles.description}>{t('portfolio.description')}</p>
        </motion.div>

        <div className={styles.grid}>
          {projects.map((project, index) => {
            const isFurGlove = project.url && project.url.includes('furglove');
            const projectImage = isFurGlove ? furGloveThumbnail : null;
            
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={styles.projectCard}
                data-clickable={!!project.url}
                onClick={() => project.url && handleProjectClick(project.url)}
              >
                <div className={styles.projectImage}>
                  {projectImage ? (
                    <img 
                      src={projectImage} 
                      alt={project.name}
                      className={styles.projectThumbnail}
                    />
                  ) : (
                    <div className={styles.imagePlaceholder}>
                      <div className={styles.imagePattern} />
                    </div>
                  )}
                  <div className={styles.projectOverlay}>
                    {/* View Button - Only visible if clickable */}
                    {project.url ? (
                      <button 
                        className={styles.viewButton}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleProjectClick(project.url);
                        }}
                      >
                        <ArrowUpRight size={24} />
                      </button>
                    ) : (
                      <div className={styles.comingSoonBadge}>Coming Soon</div>
                    )}

                    <div className={styles.projectInfo}>
                      <h3 className={styles.projectTitle}>{project.name}</h3>
                      <div className={styles.projectCategory}>{project.category}</div>
                      {/* Tags hidden via CSS */}
                      <div className={styles.projectTags}>
                        {project.tags.map((tag, i) => (
                          <span key={i} className={styles.tag}>{tag}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

