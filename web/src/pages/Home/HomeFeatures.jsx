import React from 'react';
import { motion } from 'framer-motion';
import styles from './HomeFeatures.module.css';

// Images
import swatchesImg from '../../assets/H1/Swatches.jpeg';
import keyImg from '../../assets/H1/KeyImage.jpeg';
import keyImg2 from '../../assets/H1/KeyImage2.jpeg';
import vrImg from '../../assets/H1/VRGlassesUpcaled.jpeg';

const FeatureGrid = () => {
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
          </motion.button>
        </div>
      </section>

    </div>
  );
};

export default FeatureGrid;

