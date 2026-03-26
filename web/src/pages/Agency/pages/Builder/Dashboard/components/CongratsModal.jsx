import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX } from 'react-icons/fi';
import styles from './CongratsModal.module.css';
import congratsImg from '../Assets/Congratss.png';

export default function CongratsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className={styles.overlay} onClick={onClose}>
        <motion.div 
          className={styles.modal}
          initial={{ opacity: 0, scale: 0.8, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 40 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Section */}
          <div className={styles.header}>
            <h1 className={styles.title}>
              Congratulations , You get 5 Premium Credits as a sign on Bonus! 😎 🎉
            </h1>
            <p className={styles.subtitle}>
              Do what ever you want with these! We Dont Care, Its yours! 🥳
            </p>
          </div>

          {/* Image Section with Branded Border */}
          <div className={styles.imageContainer}>
             <img src={congratsImg} alt="Congrats Bonus" className={styles.congratsImage} />
             <div className={styles.imageBorder} />
          </div>

          {/* Action Button */}
          <button className={styles.closeButton} onClick={onClose}>
            Let's Go!
          </button>

          {/* Absolute X Close */}
          <button className={styles.xButton} onClick={onClose}>
            <FiX size={24} />
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
