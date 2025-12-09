import React from 'react';
import { motion } from 'framer-motion';
import styles from './ClientLogos.module.css';

// Import logos
import logo212 from '../../../assets/LogoIpsums/logoipsum-212.svg';
import logo323 from '../../../assets/LogoIpsums/logoipsum-323.svg';
import logo331 from '../../../assets/LogoIpsums/logoipsum-331.svg';
import logo335 from '../../../assets/LogoIpsums/logoipsum-335.svg';
import logo344 from '../../../assets/LogoIpsums/logoipsum-344.svg';
import logo345 from '../../../assets/LogoIpsums/logoipsum-345.svg';
import logo358 from '../../../assets/LogoIpsums/logoipsum-358.svg';
import logo375 from '../../../assets/LogoIpsums/logoipsum-375.svg';
import logo378 from '../../../assets/LogoIpsums/logoipsum-378.svg';

const logos = [
  logo212, logo323, logo331, logo335, logo344, logo345, logo358, logo375, logo378
];

export function ClientLogos() {
  
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <motion.div 
          className={styles.ticker}
          animate={{ x: ["0%", "-50%"] }}
          transition={{ repeat: Infinity, ease: "linear", duration: 40 }}
        >
          {/* Duplicate list multiple times for seamless loop */}
          {[...logos, ...logos, ...logos, ...logos].map((logo, i) => (
            <div key={i} className={styles.logoItem}>
              <img src={logo} alt={`Client logo ${i}`} className={styles.logoImage} />
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

