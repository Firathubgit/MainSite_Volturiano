import React, { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowDownRight } from 'lucide-react';
import styles from './HeroSection.module.css';

export function HeroSection({ onOpenContact, onScrollToServices }) {
  const { t } = useTranslation('agency');
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });
  
  const y = useTransform(scrollYProgress, [0, 0.5], [0, 150]);
  const opacity = useTransform(scrollYProgress, [0, 0.4], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.7]);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    // --- Configuration ---
    const particleCountX = 80;
    const particleCountZ = 50;
    const spacing = 35;
    const speed = 0.002;
    
    // Mouse Interaction Config
    const mouseRadius = 100;
    
    // --- Grid generation ---
    const particles = [];
    for (let i = 0; i < particleCountX; i++) {
      for (let j = 0; j < particleCountZ; j++) {
        particles.push({
          x: (i - particleCountX / 2) * spacing,
          z: (j - particleCountZ / 2) * spacing,
          y: 0
        });
      }
    }

    let time = 0;
    let blobTime = 0;
    
    // Blob animation speed
    const blobSpeed = 0.008;

    // --- Event Listeners ---
    const resize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    };
    window.addEventListener('mousemove', handleMouseMove);

    // --- Animation Loop ---
    const animate = () => {
      time += speed;
      blobTime += blobSpeed;
      
      // 1. Clear & Background
      ctx.fillStyle = '#0B0B0B';
      ctx.fillRect(0, 0, width, height);

      // 2. Abstract Morphing Blob
      ctx.save();
      ctx.filter = 'blur(60px)';
      ctx.globalCompositeOperation = 'screen'; 
      
      const cx = width * 0.8;
      const cy = height * 0.5;

      const offset1x = Math.sin(blobTime) * 40;
      const offset1y = Math.cos(blobTime * 0.8) * 20;
      
      const offset2x = Math.cos(blobTime * 0.5) * 50;
      const offset2y = Math.sin(blobTime * 1.2) * 40;
      
      const offset3x = Math.sin(blobTime * 0.3) * 30;
      const offset3y = Math.cos(blobTime * 0.4) * 40;

      ctx.fillStyle = 'rgba(255, 42, 0, 0.6)'; 

      ctx.beginPath();
      ctx.arc(cx + offset1x, cy + offset1y, 140 + Math.sin(blobTime)*10, 0, Math.PI * 2);
      ctx.arc(cx + offset2x, cy + offset2y, 120 + Math.cos(blobTime)*15, 0, Math.PI * 2);
      ctx.arc(cx - 40 + offset3x, cy + 40 + offset3y, 100, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      // 3. Draw Particles
      const centerX = width / 2;
      const centerY = height / 2 + 100;

      particles.forEach(p => {
        const distFromCenter = Math.sqrt(p.x * p.x + p.z * p.z);
        
        const waveY = 
          Math.sin(p.x * 0.004 + time) * 50 + 
          Math.sin(p.z * 0.007 + time * 0.8) * 50 +
          Math.sin(distFromCenter * 0.002 - time * 1.5) * 30;

        const tiltAngle = 0.4;
        const x3d = p.x;
        const y3d = waveY * Math.cos(tiltAngle) - p.z * Math.sin(tiltAngle) + 150; 
        const z3d = waveY * Math.sin(tiltAngle) + p.z * Math.cos(tiltAngle) + 600; 

        if (z3d > 0) {
           const scale = 700 / z3d; 
           let x2d = centerX + x3d * scale;
           let y2d = centerY + y3d * scale - 200; 

           const dx = x2d - mouseRef.current.x;
           const dy = y2d - mouseRef.current.y;
           const distToMouse = Math.sqrt(dx * dx + dy * dy);
           
           let hoverScale = 1;
           let hoverBrightness = 0;

           if (distToMouse < mouseRadius) {
             const factor = 1 - distToMouse / mouseRadius;
             hoverScale = 1 + factor * 0.15;
             hoverBrightness = factor * 15;
           }

           const alpha = Math.max(0, Math.min(1, (scale * scale))); 
           const fogFactor = Math.max(0, 1 - z3d / 2500);
           
           if (fogFactor > 0 && alpha > 0) {
              ctx.beginPath();
              
              const heightFactor = (waveY + 100) / 200; 
              const hue = 10 + heightFactor * 10; 
              let lightness = 50 + heightFactor * 10;

              lightness = Math.min(90, lightness + hoverBrightness);

              ctx.fillStyle = `hsla(${hue}, 100%, ${lightness}%, ${alpha * fogFactor})`;
              
              const radius = Math.max(0.5, 2.0 * scale * hoverScale);
              ctx.arc(x2d, y2d, radius, 0, Math.PI * 2);
              ctx.fill();
           }
        }
      });

      requestAnimationFrame(animate);
    };

    const animId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animId);
    };
  }, []);
  
  return (
    <section ref={containerRef} className={styles.hero}>
      {/* Canvas Background */}
      <canvas ref={canvasRef} className={styles.canvas} />
      
      {/* Bottom fade */}
      <div className={styles.bottomFade}></div>

      <motion.div 
        className={styles.container}
        style={{ y, opacity, scale }}
      >
        <div className={styles.textWrapper}>
          <motion.h1 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            className={styles.title1}
          >
            Volturiano
          </motion.h1>
        </div>

        <div className={styles.bottomRow}>
          <div className={styles.textWrapper}>
            <motion.h1 
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              transition={{ duration: 1, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              className={styles.title2}
            >
              {t('hero.agencyTitle')}
            </motion.h1>
          </div>

          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className={styles.descriptionContainer}
          >
            <p className={styles.description}>
              {t('hero.description').replace(/<[^>]*>/g, '')}
            </p>
            <a 
              href="#package-cards" 
              onClick={(e) => {
                e.preventDefault();
                onScrollToServices();
              }}
              className={styles.exploreLink}
            >
              {t('hero.exploreServices')}
              <ArrowDownRight className={styles.arrowIcon} />
            </a>
          </motion.div>
        </div>
      </motion.div>

      {/* Spinning SVG Text */}
      <motion.div 
        style={{ opacity }}
        className={styles.spinningText}
      >
        <svg width="120" height="120" viewBox="0 0 100 100">
          <path id="curve" d="M 50 50 m -37 0 a 37 37 0 1 1 74 0 a 37 37 0 1 1 -74 0" fill="transparent" />
          <text className={styles.curveText}>
            <textPath href="#curve">
              {t('hero.spinningText')}
            </textPath>
          </text>
        </svg>
      </motion.div>
    </section>
  );
}

export function MarqueeTicker() {
  const { t } = useTranslation('agency');
  return (
    <div className={styles.marqueeWrapper}>
      <div className={styles.marquee}>
        {Array.from({ length: 10 }).map((_, i) => (
          <span key={i} className={styles.marqueeText}>
            {t('hero.marqueeText')}
          </span>
        ))}
      </div>
    </div>
  );
}

















