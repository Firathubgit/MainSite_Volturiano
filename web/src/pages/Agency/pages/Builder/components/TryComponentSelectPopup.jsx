import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MousePointerClick, ArrowRight } from 'lucide-react';
import styles from './TryComponentSelectPopup.module.css';

// Using the provided video
import popupVideo from '../Dashboard/Assets/LowQualityVidOpenScreen.mp4';

const TryComponentSelectPopup = ({ isOpen, onClose, onOpenCommunity, onProceedWithout }) => {
    // Basic effect to block scrolling if needed
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className={styles.backdrop} onClick={onClose}>
                <motion.div 
                    className={styles.modalContainer}
                    onClick={(e) => e.stopPropagation()}
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                >
                    <div className={styles.mediaContainer}>
                        <video 
                            src={popupVideo} 
                            className={styles.video} 
                            autoPlay 
                            loop 
                            muted 
                            playsInline 
                        />
                    </div>
                    
                    <div className={styles.contentContainer}>
                        <div className={styles.titleRow}>
                            <h2 className={styles.title}>Add community components</h2>
                            <div className={styles.iconWrapper}>
                                <MousePointerClick size={16} />
                            </div>
                        </div>
                        
                        <p className={styles.description}>
                            Pick pre-built sections from the community — headers, heroes, footers & more. The AI weaves them directly into your website.
                        </p>
                        
                        <div className={styles.buttonRow}>
                            <button className={styles.secondaryButton} onClick={onClose}>
                                Skip for now
                            </button>
                            <button className={styles.primaryButton} onClick={onOpenCommunity}>
                                Browse Components <ArrowRight size={16} />
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default TryComponentSelectPopup;
