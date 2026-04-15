import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from '../Agency/pages/Builder/Generation/Generation.module.css';
import volturianoLogo from '../../assets/Logo/TornadoLogo.png';

// Import the ThinkingRow component logic locally or from Generation.jsx if exported
// Since it's not exported, I will replicate it here for the "DevCard" experience
// to allow the user to see exactly how it looks without messy imports.

function ThinkingRow({ status, dots, logoState, volturianoLogo, components = [], isStreaming, boxed = false }) {
  const [activeName, setActiveName] = useState('');
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (components.length === 0 || !boxed) {
      setActiveName(status);
      return;
    }

    const cycle = () => {
      setIndex(prev => (prev + 1) % components.length);
      const nextDelay = Math.random() < 0.7 ? 500 : (Math.random() * 700 + 300);
      return nextDelay;
    };

    let timer;
    const run = () => {
      const delay = cycle();
      timer = setTimeout(run, delay);
    };

    timer = setTimeout(run, 500);
    return () => clearTimeout(timer);
  }, [components, status, boxed]);

  useEffect(() => {
    if (boxed && components.length > 0 && components[index]) {
      setActiveName(`${status === 'Analyzing requirements' ? 'Analyzing' : status}: ${components[index].name}`);
    } else {
      setActiveName(status);
    }
  }, [index, components, status, boxed]);

  if (isStreaming) return null;

  return (
    <div className={styles.chatMsg} style={{ background: 'transparent' }}>
      <div className={boxed ? styles.thinkingBubble : styles.thinkingNormal}>
        <div className={boxed ? styles.thinkingBubbleContent : ''} style={{ display: 'flex', alignItems: 'center', gap: boxed ? '14px' : '12px', flex: 1 }}>
          <div
            className={
              logoState === 1 ? styles.tornadoLogoPulse :
                logoState === 2 ? styles.tornadoLogoTikiTaka :
                  logoState === 3 ? styles.tornadoLogoScanner :
                    styles.tornadoLogoShimmer
            }
            style={{
              width: boxed ? 24 : 18,
              height: boxed ? 24 : 18,
              flexShrink: 0,
              '--logo-url': `url(${volturianoLogo})`,
              backgroundClip: 'initial',
              WebkitBackgroundClip: 'initial',
              WebkitTextFillColor: 'initial',
              color: 'initial'
            }}
          />
          <span className={styles.shimmerText} style={{ fontSize: boxed ? '14px' : '15px', fontWeight: 400, letterSpacing: '0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {activeName}{dots}
          </span>
        </div>
        {boxed && (
          <div className={styles.loadingCircleSegmented}>
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className={styles.segment}
                style={{
                  transform: `rotate(${i * 45}deg) translateY(-6px)`,
                  animationDelay: `${i * 0.125}s`
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const ThinkingRowTest = () => {
  const [dots, setDots] = useState('');
  const [boxed, setBoxed] = useState(true);
  const [status, setStatus] = useState('Searching components');
  const [logoState, setLogoState] = useState(3);

  const mockComponents = [
    { name: 'StickyNavbar' },
    { name: 'GlassHero' },
    { name: 'DynamicFeatures' },
    { name: 'DarkPricing' },
    { name: 'ModernFooter' },
    { name: 'ContactFormV2' },
    { name: 'SocialProof' },
    { name: 'PortfolioGrid' },
    { name: 'CtaBanner' },
    { name: 'FaqAccordion' }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      background: '#050505',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '40px',
      padding: '20px',
      color: 'white',
      fontFamily: 'Inter, sans-serif'
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        alignItems: 'center'
      }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>Thinking Row DevCard</h1>
        <p style={{ opacity: 0.6, fontSize: '14px' }}>Testing the premium boxed vs normal status UI</p>
      </div>

      <div style={{
        width: '100%',
        maxWidth: '500px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '16px',
        padding: '30px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div style={{ padding: '20px', background: 'rgba(0,0,0,0.5)', borderRadius: '12px' }}>
             <ThinkingRow 
                status={status}
                dots={dots}
                logoState={logoState}
                volturianoLogo={volturianoLogo}
                components={mockComponents}
                boxed={boxed}
             />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <button 
                onClick={() => setBoxed(!boxed)}
                style={{
                    padding: '12px',
                    borderRadius: '8px',
                    background: boxed ? '#ffffff' : 'rgba(255,255,255,0.1)',
                    color: boxed ? '#000000' : '#ffffff',
                    border: 'none',
                    fontWeight: 600,
                    cursor: 'pointer'
                }}
            >
                Mode: {boxed ? 'BOXED (Premium)' : 'NORMAL'}
            </button>

            <button 
                onClick={() => setLogoState(prev => (prev + 1) % 4)}
                style={{
                    padding: '12px',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.1)',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 600,
                    cursor: 'pointer'
                }}
            >
                Logo State: {logoState === 0 ? 'Rest' : logoState === 1 ? 'Pulse' : logoState === 2 ? 'TikiTaka' : 'Scanner'}
            </button>
        </div>

        <input 
            type="text"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            style={{
                background: 'rgba(0,0,0,0.5)',
                border: '1px solid rgba(255,255,255,0.2)',
                padding: '12px',
                borderRadius: '8px',
                color: 'white',
                fontSize: '14px'
            }}
            placeholder="Change status text..."
        />
      </div>

      <div style={{ fontSize: '12px', opacity: 0.4, maxWidth: '400px', textAlign: 'center' }}>
        The Boxed state features a 2px white stroke, increased padding, and component cycling as seen in the community component search phase.
      </div>
    </div>
  );
};

export default ThinkingRowTest;
