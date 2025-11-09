import React, { useEffect, useRef, useState } from 'react';
import styles from './Home.module.css';
import PageTransition from '../../components/PageTransition/PageTransition';
import heroVideo from '../../assets/H1/Cinematic_Car_Website_Intro_Video.mp4';
import slowZoom from '../../assets/H1/Video_Generation_Slow_Zoom_On_Rim.mp4';
import heroBg from '../../assets/H1/BackgroundVolturiano.png';
import Showroom from '../../components/Showroom/Showroom';

export default function Home() {
  const sources = [heroVideo, slowZoom]; // A then B then loop
  const videoARef = useRef(null);
  const videoBRef = useRef(null);
  const [active, setActive] = useState('A'); // which layer is visible
  const ENABLE_HERO_VIDEO = false; // temporary: disable videos and show background image only

  useEffect(() => {
    if (!ENABLE_HERO_VIDEO) return;
    const a = videoARef.current;
    const b = videoBRef.current;
    if (!a || !b) return;
    a.src = sources[0];
    b.src = sources[1];
    a.preload = 'auto';
    b.preload = 'auto';
    const playA = () => { a.play().catch(() => {}); };
    a.addEventListener('canplaythrough', playA, { once: true });
    a.load();
    b.load(); // buffer second video for seamless switch
    return () => {
      a.removeEventListener('canplaythrough', playA);
    };
  }, []);

  const handleEndedA = () => {
    if (!ENABLE_HERO_VIDEO) return;
    const a = videoARef.current, b = videoBRef.current;
    if (!a || !b) return;
    b.currentTime = 0;
    b.play().catch(() => {});
    setActive('B');
    a.pause();
    a.currentTime = 0;
  };

  const handleEndedB = () => {
    if (!ENABLE_HERO_VIDEO) return;
    const a = videoARef.current, b = videoBRef.current;
    if (!a || !b) return;
    a.currentTime = 0;
    a.play().catch(() => {});
    setActive('A');
    b.pause();
    b.currentTime = 0;
  };

  return (
    <PageTransition>
      <section
        className={styles.hero}
        style={{
          backgroundImage: `url(${heroBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        {ENABLE_HERO_VIDEO && (
          <>
            <video
              className={`${styles.video} ${active === 'A' ? styles.videoVisible : styles.videoHidden}`}
              ref={videoARef}
              autoPlay
              muted
              playsInline
              onEnded={handleEndedA}
            />
            <video
              className={`${styles.video} ${active === 'B' ? styles.videoVisible : styles.videoHidden}`}
              ref={videoBRef}
              muted
              playsInline
              onEnded={handleEndedB}
            />
          </>
        )}

        <div className={styles.copy}>
          <h1 className={styles.title}>VOLTURIANO</h1>
          <p className={styles.subtitle}>Commission your vision</p>
        </div>
      </section>

      <Showroom />
    </PageTransition>
  );
}

