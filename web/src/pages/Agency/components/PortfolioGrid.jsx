import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import furGloveThumbnail from '../../../assets/FurGloveThhumnail.png';
import ipadStory from '../../../assets/Gemini_Generated_Image_hca7uhhca7uhhca7 (1).png';
import ipadClarity from '../../../assets/Gemini_Generated_Image_z1w47wz1w47wz1w4 (1).png';
import styles from './PortfolioGrid.module.css';

export function PortfolioGrid() {
  const { t } = useTranslation('agency');
  const [hoveredProject, setHoveredProject] = useState(null);
  
  const projectsData = t('portfolio.projects', { returnObjects: true });
  
  // Enrich projects with images and IDs
  const projects = projectsData.map((p, i) => {
    let image = ipadStory; // Default
    if (p.url && p.url.includes('furglove')) image = furGloveThumbnail;
    else if (i === 1) image = ipadClarity;
    
    return {
      ...p,
      id: i,
      year: '2024',
      image
    };
  });

  const handleProjectClick = (url) => {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <section id="portfolio" className={styles.section}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.label}>{t('portfolio.label')}</h2>
          <div className={styles.separator}></div>
        </div>

        <div className={styles.projectList}>
          {projects.map((project) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0.5 }}
              whileHover={{ opacity: 1, x: 20 }}
              onHoverStart={() => setHoveredProject(project.id)}
              onHoverEnd={() => setHoveredProject(null)}
              className={styles.projectItem}
              onClick={() => project.url && handleProjectClick(project.url)}
            >
              <div className={styles.projectContent}>
                <div>
                  <h3 className={styles.projectTitle}>
                    {project.name}
                  </h3>
                  <span className={styles.projectCategory}>{project.category}</span>
                </div>
                <span className={styles.projectYear}>({project.year})</span>

                {/* Desktop Hover Image Reveal - Positioned absolutely within the content */}
                <AnimatePresence mode="wait">
                  {hoveredProject === project.id && (
                    <motion.div
                      key={project.id}
                      className={styles.revealImageContainer}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ 
                        scale: 1,
                        opacity: 1,
                        rotate: Math.random() * 10 - 5
                      }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                    >
                      <img 
                        src={project.image} 
                        alt={project.name} 
                        className={styles.revealImage}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Mobile Image - Visible only on small screens */}
              <div className={styles.mobileImage}>
                <img 
                  src={project.image} 
                  alt={project.name} 
                  className={styles.mobileImgElement}
                />
              </div>
            </motion.div>
          ))}
        </div>
        
        <div className={styles.footer}>
          <button className={styles.archiveButton}>
            {t('portfolio.viewArchive')}
          </button>
        </div>
      </div>
    </section>
  );
}

