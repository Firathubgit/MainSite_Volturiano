import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ThemeProvider, useTheme } from '../../context/ThemeContext';
import { NavBar } from '../../../../components/NavBar/NavBar';
import { Footer } from '../../components/Footer';
import { usePageTitle } from '../../../../hooks/usePageTitle';
import styles from './About.module.css';

// Countdown Component styled like the requested design
const Countdown = () => {
  const { t } = useTranslation('agency');
  const [timeLeft, setTimeLeft] = useState({
    days: 14,
    hours: 12,
    minutes: 45,
    seconds: 30
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        if (prev.days > 0) return { ...prev, days: prev.days - 1, hours: 23, minutes: 59, seconds: 59 };
        return prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className={styles.timerContainer}>
      <div className={styles.timerInner}>
        <div className={styles.timerGroup}>
          <div className={styles.timeUnit}>
            <span className={styles.timeValue}>{String(timeLeft.days).padStart(2, '0')}</span>
            <span className={styles.timeLabel}>{t('about.timer.days')}</span>
          </div>
          
          <span className={styles.separator}>:</span>
          
          <div className={styles.timeUnit}>
            <span className={styles.timeValue}>{String(timeLeft.hours).padStart(2, '0')}</span>
            <span className={styles.timeLabel}>{t('about.timer.hours')}</span>
          </div>
          
          <span className={styles.separator}>:</span>
          
          <div className={styles.timeUnit}>
            <span className={styles.timeValue}>{String(timeLeft.minutes).padStart(2, '0')}</span>
            <span className={styles.timeLabel}>{t('about.timer.minutes')}</span>
          </div>
          
          <span className={styles.separator}>:</span>
          
          <div className={styles.timeUnit}>
            <span className={styles.timeValue}>{String(timeLeft.seconds).padStart(2, '0')}</span>
            <span className={styles.timeLabel}>{t('about.timer.seconds')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

function AboutContent() {
  const { t } = useTranslation(['agency', 'common']);
  const { theme } = useTheme();
  usePageTitle(`${t('agencyMenu.about')} | Volturio Studios – Webbyrå i Göteborg`);

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
    return () => {
      document.body.removeAttribute('data-theme');
    };
  }, [theme]);

  return (
    <div className={styles.page} data-theme={theme}>
      <div className={styles.backgroundEffects}>
        <div className={styles.gridPattern} />
        <div className={styles.vignette} />
      </div>

      <NavBar />
      
      <main className={styles.main}>
        <div className={styles.contentWrapper}>
          
          {/* Coming Soon Heading */}
          <h1 className={styles.comingSoonTitle}>
            {t('about.comingSoon')}
          </h1>
          
          {/* Timer */}
          <Countdown />
          
          {/* Tagline */}
          <p className={styles.tagline}>
            {t('about.comingSoonTagline')}
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function About() {
  return (
    <ThemeProvider>
      <AboutContent />
    </ThemeProvider>
  );
}
