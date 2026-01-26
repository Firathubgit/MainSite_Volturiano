import React, { useEffect, useLayoutEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ThemeProvider } from '../../context/ThemeContext';
import { NavBar } from '../../../../components/NavBar/NavBar';
import { Footer } from '../../components/Footer';
import { usePageTitle } from '../../../../hooks/usePageTitle';
import { motion } from 'framer-motion';
import styles from './Booking.module.css';

// Immediately set dark theme when this module loads (before any React rendering)
if (typeof window !== 'undefined') {
  document.body.setAttribute('data-theme', 'dark');
}

function BookingContent() {
  const { t } = useTranslation('agency');
  const theme = 'dark';

  // Force dark theme on document.body BEFORE paint using useLayoutEffect
  useLayoutEffect(() => {
    document.body.setAttribute('data-theme', 'dark');
    
    return () => {
      // Don't restore - let the next page set its own theme
    };
  }, []);
  
  usePageTitle(`${t('booking.title', { defaultValue: 'Boka möte' })} | Volturio Studios – Webbyrå i Göteborg`);

  // Load Calendly script and inject dark mode styles
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://assets.calendly.com/assets/external/widget.js';
    script.async = true;
    document.body.appendChild(script);

    // Inject CSS to style Calendly widget with black background
    const style = document.createElement('style');
    style.id = 'calendly-custom-styling';
    style.textContent = `
      /* Force black background on all Calendly elements */
      .calendly-inline-widget,
      .calendly-inline-widget *,
      .calendly-inline-widget > div,
      .calendly-inline-widget > div > div,
      .calendly-inline-widget > div > div > div,
      [class*="calendly"],
      [class*="Calendly"] {
        background-color: #000000 !important;
        background: #000000 !important;
        border: none !important;
        border-radius: 0 !important;
        box-shadow: none !important;
        outline: none !important;
      }
      
      /* Remove borders from iframe and set black background */
      .calendly-inline-widget iframe {
        background-color: #000000 !important;
        background: #000000 !important;
        border: none !important;
        border-radius: 0 !important;
        box-shadow: none !important;
        outline: none !important;
      }

      /* Target Calendly's spinner/loading wrapper */
      .calendly-spinner-container,
      .calendly-badge-widget,
      .calendly-overlay,
      .calendly-popup,
      .calendly-popup-content {
        background-color: #000000 !important;
        background: #000000 !important;
        border: none !important;
        border-radius: 0 !important;
        box-shadow: none !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      // Cleanup: remove script and style when component unmounts
      const existingScript = document.querySelector('script[src="https://assets.calendly.com/assets/external/widget.js"]');
      if (existingScript && document.body.contains(existingScript)) {
        document.body.removeChild(existingScript);
      }
      const existingStyle = document.getElementById('calendly-custom-styling');
      if (existingStyle) {
        document.head.removeChild(existingStyle);
      }
    };
  }, []);

  return (
    <div className={styles.page} data-theme="dark">
      <NavBar />
      
      <section className={styles.bookingSection} style={{ backgroundColor: '#000000' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className={styles.bookingContainer}
          style={{ backgroundColor: '#000000' }}
        >
          <div className={styles.calendlyWrapper}>
            <div 
              className="calendly-inline-widget" 
              data-url="https://calendly.com/hello-volturiano/30min?background_color=000000&text_color=ffffff&primary_color=ff4520"
              style={{ minWidth: '320px', height: '100%' }}
            />
          </div>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
}

export default function Booking() {
  // Set dark theme immediately on mount (belt and suspenders approach)
  if (typeof window !== 'undefined') {
    document.body.setAttribute('data-theme', 'dark');
  }
  
  return (
    <ThemeProvider>
      <BookingContent />
    </ThemeProvider>
  );
}
