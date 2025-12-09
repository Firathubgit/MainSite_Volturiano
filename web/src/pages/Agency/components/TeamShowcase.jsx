import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import silhouetteImage from '../../../assets/ImageSiluatePerson.png';
import styles from './TeamShowcase.module.css';

export function TeamShowcase() {
  const { t } = useTranslation('agency');
  const teamMembers = t('team.members', { returnObjects: true });
  const [hoveredIndex, setHoveredIndex] = useState(null);
  
  return (
    <section id="team" className={styles.section}>
      <div className={styles.gradient} />
      
      <div className={styles.container}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className={styles.header}
        >
          <h4 className={styles.label}>{t('team.label')}</h4>
          <h2 className={styles.title}>{t('team.title')}</h2>
          <p className={styles.description}>{t('team.description')}</p>
        </motion.div>

        <div className={styles.grid}>
          {teamMembers.map((member, index) => {
            // Stepped effect: Each card moves down slightly more than the last
            const yOffset = index * 35; 
            
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }} // Animate to 0 relative to the transform below
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
                className={styles.memberCard}
                style={{ 
                  marginTop: `${yOffset}px`, // Use margin for static layout offset
                }}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <div className={styles.rectangleContainer}>
                  <div className={styles.rectangle}>
                    <div className={styles.rectanglePattern} />
                  </div>
                  <motion.div
                    className={styles.hoverImage}
                    initial={{ opacity: 0 }}
                    animate={{ 
                      opacity: hoveredIndex === index ? 1 : 0,
                    }}
                    transition={{ duration: 0.4 }}
                  >
                    <img 
                      src={silhouetteImage} 
                      alt={member.name}
                      className={styles.silhouetteImage}
                    />
                  </motion.div>
                  <div className={styles.glow} />
                </div>
                <div className={styles.memberInfo}>
                  <h3 className={styles.memberName}>{member.name}</h3>
                  <p className={styles.memberRole}>{member.role}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

