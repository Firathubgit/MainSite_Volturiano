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
    
    // Scroll to top immediately
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    
    return () => {
      // Don't restore - let the next page set its own theme
    };
  }, []);
  
  usePageTitle(`${t('booking.title', { defaultValue: 'Boka möte' })} | Volturio Studios – Webbyrå i Göteborg`);

  // Scroll to top on page enter - ensure it happens after render too
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);

  // Load Calendly with fallback to data-url method
  useEffect(() => {
    // Inject CSS for transparent/black background
    const style = document.createElement('style');
    style.id = 'calendly-custom-styling';
    style.textContent = `
      /* Transparent wrapper */
      .calendly-inline-widget {
        background: transparent !important;
      }
      
      /* Force iframe to respect transparency */
      .calendly-inline-widget > iframe {
        color-scheme: light;
        background: transparent !important;
        border: none !important;
        border-radius: 16px !important;
      }

      /* Loading spinner area */
      .calendly-spinner-container {
        background: transparent !important;
      }
    `;
    document.head.appendChild(style);

    const container = document.getElementById('calendly-embed');
    if (!container) return;

    // Check if script already exists
    const existingScript = document.querySelector('script[src="https://assets.calendly.com/assets/external/widget.js"]');
    
    if (existingScript) {
      // Script already loaded, initialize immediately
      initializeCalendly();
    } else {
      // Load Calendly script
      const script = document.createElement('script');
      script.src = 'https://assets.calendly.com/assets/external/widget.js';
      script.async = true;
      
      script.onload = () => {
        initializeCalendly();
      };
      
      script.onerror = () => {
        console.error('Failed to load Calendly script');
        // Fallback: use data-url method
        container.setAttribute('data-url', 'https://calendly.com/hello-volturiano/30min?hide_gdpr_banner=1&background_color=000000&text_color=ffffff&primary_color=ff4520');
      };
      
      document.body.appendChild(script);
    }

    function initializeCalendly() {
      // Wait a bit for Calendly to be fully ready
      setTimeout(() => {
        const container = document.getElementById('calendly-embed');
        if (!container) return;

        try {
          if (window.Calendly && typeof window.Calendly.initInlineWidget === 'function') {
            window.Calendly.initInlineWidget({
              url: 'https://calendly.com/hello-volturiano/30min?hide_gdpr_banner=1&background_color=000000&text_color=ffffff&primary_color=ff4520',
              parentElement: container,
              prefill: {},
              utm: {}
            });

            // Force iframe background after widget loads
            const forceTransparent = () => {
              const iframe = container.querySelector('iframe');
              if (iframe) {
                iframe.style.background = 'transparent';
                iframe.style.colorScheme = 'light';
              }
            };
            
            // Try multiple times as Calendly can be slow to inject iframe
            setTimeout(forceTransparent, 500);
            setTimeout(forceTransparent, 1000);
            setTimeout(forceTransparent, 2000);
          } else {
            // Fallback: use data-url method if API not available
            container.setAttribute('data-url', 'https://calendly.com/hello-volturiano/30min?hide_gdpr_banner=1&background_color=000000&text_color=ffffff&primary_color=ff4520');
          }
        } catch (error) {
          console.error('Error initializing Calendly:', error);
          // Fallback: use data-url method
          container.setAttribute('data-url', 'https://calendly.com/hello-volturiano/30min?hide_gdpr_banner=1&background_color=000000&text_color=ffffff&primary_color=ff4520');
        }
      }, 100);
    }

    return () => {
      // Cleanup
      const existingScript = document.querySelector('script[src="https://assets.calendly.com/assets/external/widget.js"]');
      if (existingScript && document.body.contains(existingScript) && !existingScript.hasAttribute('data-keep')) {
        // Only remove if we added it (not if it was already there)
        try {
          document.body.removeChild(existingScript);
        } catch (e) {
          // Script might already be removed
        }
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
          {/* Hero Header Section */}
          <motion.div
            className={styles.heroHeader}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
          >
            <h1 className={styles.heroTitle}>
              {t('booking.heroTitle', 'Boka ett möte med oss!')}
            </h1>
            <p className={styles.heroDescription}>
              {t('booking.heroDescription', 'Boka ett snabbt 30-minuters möte för att diskutera ditt projekt och behov. Vi hjälper dig att ta nästa steg mot din digitala lösning.')}
            </p>
          </motion.div>

          <div className={styles.calendlyWrapper}>
            <div 
              id="calendly-embed"
              className="calendly-inline-widget"
              data-url="https://calendly.com/hello-volturiano/30min?hide_gdpr_banner=1&background_color=000000&text_color=ffffff&primary_color=ff4520"
              style={{ minWidth: '320px', height: '100%', background: 'transparent' }}
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
