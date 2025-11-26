import React from 'react';
import { motion } from 'framer-motion';
import styles from './TechTicker.module.css';

const techs = ["REACT", "THREE.JS", "WEBGL", "SUPABASE", "NEXT.JS", "TYPESCRIPT", "TAILWIND", "FRAMER MOTION", "POSTGRESQL"];

export function TechTicker() {
  return (
    <div className={styles.container}>
      <motion.div 
        className={styles.ticker}
        animate={{ x: ["0%", "-50%"] }}
        transition={{ repeat: Infinity, ease: "linear", duration: 20 }}
      >
        {[...techs, ...techs, ...techs].map((tech, i) => (
          <div key={i} className={styles.techItem}>
            <span className={styles.dot} />
            {tech}
          </div>
        ))}
      </motion.div>
    </div>
  );
}

