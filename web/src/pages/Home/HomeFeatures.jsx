import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import styles from './HomeFeatures.module.css';

// Images
import swatchesImg from '../../assets/H1/Swatches.jpeg';
import keyImg from '../../assets/H1/KeyImage.jpeg';
import keyImg2 from '../../assets/H1/KeyImage2.jpeg';
import vrImg from '../../assets/H1/VRGlassesUpcaled.jpeg';
import exteriorIcon from '../../assets/Logo/ExteriorButtonIcon.png';
import interiorIcon from '../../assets/Logo/InteriorButtonIcon.png';
import languageIcon from '../../assets/Logo/ChangeLanguageicon.png';

const FeatureGrid = () => {
  // Add touch handling for scroll fix in feature sections
  useEffect(() => {
    const preventScrollLock = (e) => {
      e.stopPropagation();
    };
    
    // Find all scrollable elements in this component
    const elements = document.querySelectorAll(`.${styles.gridItem}, .${styles.vrSection}`);
    
    elements.forEach(el => {
      el.addEventListener('touchmove', preventScrollLock, { passive: true });
    });
    
    return () => {
      elements.forEach(el => {
        el.removeEventListener('touchmove', preventScrollLock);
      });
    };
  }, []);

  const features = [
    {
      id: 1,
      title: "Bespoke Materials",
      desc: "Hand-selected leathers and sustainable fabrics for your unique interior.",
      image: swatchesImg,
    },
    {
      id: 2,
      title: "Signature Keys",
      desc: "Crafted from carbon fiber and precious metals. Your access to power.",
      image: keyImg,
    },
    {
      id: 3,
      title: "Personalization",
      desc: "Every detail tailored to your exact specifications.",
      image: keyImg2,
    }
  ];

  return (
    <div className={styles.featuresContainer}>
      
      {/* Customization Grid */}
      <section className={styles.gridSection}>
        <motion.h2 
          className={styles.gridTitle}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          Aggressive Luxury
        </motion.h2>
        
        <div className={styles.gridContainer}>
          {features.map((feature, index) => (
            <motion.div 
              key={feature.id} 
              className={styles.gridItem}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <img src={feature.image} alt={feature.title} className={styles.gridImage} />
              <div className={styles.gridOverlay}>
                <h3 className={styles.itemTitle}>{feature.title}</h3>
                <p className={styles.itemDesc}>{feature.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>
      
      {/* Additional Brand Elements - "Additional Components" */}
      <section className={styles.brandElements}>
        <div className={styles.brandIcons}>
           <div className={styles.brandIconItem}>
             <img src={exteriorIcon} alt="Exterior" />
             <span>Exterior Design</span>
           </div>
           <div className={styles.brandIconItem}>
             <img src={interiorIcon} alt="Interior" />
             <span>Interior Comfort</span>
           </div>
           <div className={styles.brandIconItem}>
             <img src={languageIcon} alt="Global" />
             <span>Global Presence</span>
           </div>
        </div>
      </section>

      {/* VR Section */}
      <section className={styles.vrSection}>
        <img src={vrImg} alt="Volturiano VR" className={styles.vrImage} />
        <div className={styles.vrOverlay}>
          <motion.h2 
            className={styles.vrTitle}
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            Volturiano VR
          </motion.h2>
          <motion.p 
            className={styles.vrSubtitle}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            viewport={{ once: true }}
          >
            Experience your configuration in immersive virtual reality. 
            Step inside your vehicle before it's even built.
          </motion.p>
          <motion.button 
            className={styles.vrButton}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            viewport={{ once: true }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Explore Feature
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14"></path>
              <path d="M12 5l7 7-7 7"></path>
            </svg>
          </motion.button>
        </div>
      </section>

    </div>
  );
};

export default FeatureGrid;

