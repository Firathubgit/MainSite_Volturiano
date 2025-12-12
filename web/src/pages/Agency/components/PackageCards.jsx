import React, { useEffect, useMemo, useRef, useState } from 'react';
import styles from './PackageCards.module.css';
import GoldPackage from '../../../assets/Logo/GOLDPackage.png';
import SilverPackage from '../../../assets/Logo/SilverPackage.png';
import TitaniumPackage from '../../../assets/Logo/TitaniumPackage.png';

export function PackageCards({ onOpenContact }) {
  const [hoveredCard, setHoveredCard] = useState(null);
  const [activeIndex, setActiveIndex] = useState(1); // titanium default
  const [committedIndex, setCommittedIndex] = useState(1); // drives sheet content (no twitch)
  const [sheetCollapsed, setSheetCollapsed] = useState(false);
  const carouselRef = useRef(null);
  const slideElsRef = useRef([]);
  const scrollEndTimerRef = useRef(null);
  const cardRefs = {
    silver: useRef(null),
    gold: useRef(null),
    titanium: useRef(null),
  };

  const packages = useMemo(() => ([
    {
      id: 'silver',
      name: 'Silver Package',
      label: 'Web Presence',
      image: SilverPackage,
      ref: cardRefs.silver,
      features: [
        'Lyxig UI-design (premium UX/UI)',
        'Mörkt läge estetik',
        'WCAG-tillgänglighet',
        'SEO-optimerad leverans',
      ],
    },
    {
      id: 'titanium',
      name: 'Titanium Package',
      label: 'Immersive 3D',
      image: TitaniumPackage,
      ref: cardRefs.titanium,
      features: [
        'Realtids WebGL-rendering',
        'Mobilresponsiv 3D-upplevelse',
        'Anpassade integrationer',
        'Optimerad för prestanda',
      ],
    },
    {
      id: 'gold',
      name: 'Gold Package',
      label: 'SaaS & Scaling',
      image: GoldPackage,
      ref: cardRefs.gold,
      features: [
        'Fullstack (React/Next.js)',
        'Supabase backend-integration',
        'Adminpanel / instrumentpanel',
        'Skalbar arkitektur & SEO',
      ],
    },
  ]), []);

  const handleMouseMove = (e, cardId) => {
    const card = cardRefs[cardId].current;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -10;
    const rotateY = ((x - centerX) / centerX) * 10;

    card.style.setProperty('--rotate-x', `${rotateX}deg`);
    card.style.setProperty('--rotate-y', `${rotateY}deg`);
    card.style.setProperty('--mouse-x', `${x}px`);
    card.style.setProperty('--mouse-y', `${y}px`);
  };

  const handleMouseLeave = (cardId) => {
    const card = cardRefs[cardId].current;
    if (!card) return;

    card.style.setProperty('--rotate-x', '0deg');
    card.style.setProperty('--rotate-y', '0deg');
    setHoveredCard(null);
  };

  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;

    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const slides = slideElsRef.current.filter(Boolean);
        if (!slides.length) return;

        const viewportCenter = el.scrollLeft + el.clientWidth / 2;
        let bestIdx = 0;
        let bestDist = Number.POSITIVE_INFINITY;

        slides.forEach((slide, idx) => {
          const slideCenter = slide.offsetLeft + slide.clientWidth / 2;
          const dist = Math.abs(slideCenter - viewportCenter);
          if (dist < bestDist) {
            bestDist = dist;
            bestIdx = idx;
          }
        });

        setActiveIndex(bestIdx);

        // Commit the selection only after scroll settles, to avoid text "twitching"
        if (scrollEndTimerRef.current) window.clearTimeout(scrollEndTimerRef.current);
        scrollEndTimerRef.current = window.setTimeout(() => {
          setCommittedIndex(bestIdx);
        }, 140);
      });
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    // Ensure we start centered on Titanium (index 1)
    requestAnimationFrame(() => {
      const slides = slideElsRef.current.filter(Boolean);
      const slide = slides[activeIndex];
      if (!slide) return;
      const target = slide.offsetLeft - (el.clientWidth - slide.clientWidth) / 2;
      el.scrollTo({ left: target, behavior: 'auto' });
    });

    return () => {
      cancelAnimationFrame(raf);
      if (scrollEndTimerRef.current) window.clearTimeout(scrollEndTimerRef.current);
      el.removeEventListener('scroll', onScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scrollToIndex = (idx) => {
    const el = carouselRef.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(packages.length - 1, idx));
    setActiveIndex(clamped);
    setCommittedIndex(clamped);
    const slides = slideElsRef.current.filter(Boolean);
    const slide = slides[clamped];
    if (!slide) return;
    const target = slide.offsetLeft - (el.clientWidth - slide.clientWidth) / 2;
    el.scrollTo({ left: target, behavior: 'smooth' });
  };

  const activePackage = packages[committedIndex] ?? packages[1];

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        {/* Desktop layout */}
        <div className={styles.desktopGrid}>
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              ref={pkg.ref}
              className={`${styles.card} ${pkg.id === 'titanium' ? styles.cardPrimary : ''} ${hoveredCard === pkg.id ? styles.cardHovered : ''}`}
              onMouseMove={(e) => {
                setHoveredCard(pkg.id);
                handleMouseMove(e, pkg.id);
              }}
              onMouseLeave={() => handleMouseLeave(pkg.id)}
              onClick={() => onOpenContact && onOpenContact(null)}
              role="button"
              tabIndex={0}
            >
              <div className={styles.cardInner}>
                <div className={styles.shine} />
                <img
                  src={pkg.image}
                  alt={pkg.name}
                  className={styles.cardImage}
                  draggable="false"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Mobile layout (iPhone-style) */}
        <div className={styles.mobilePhone}>
          <div className={`${styles.phoneFrame} ${sheetCollapsed ? styles.phoneCollapsed : ''}`}>
            <div className={styles.phoneTop}>
              <div className={styles.carousel} ref={carouselRef} aria-label="Package carousel">
                {packages.map((pkg, idx) => (
                  <div
                    key={pkg.id}
                    className={`${styles.slide} ${idx === activeIndex ? styles.slideActive : styles.slideInactive}`}
                    ref={(node) => {
                      slideElsRef.current[idx] = node;
                    }}
                  >
                    <div className={styles.mobileCard} onClick={() => onOpenContact && onOpenContact(null)} role="button" tabIndex={0}>
                      <img src={pkg.image} alt={pkg.name} className={styles.mobileCardImage} draggable="false" />
                    </div>
                  </div>
                ))}
              </div>

              <div className={styles.indicator} aria-hidden="true">
                {packages.map((pkg, idx) => (
                  <button
                    key={pkg.id}
                    type="button"
                    className={`${styles.dot} ${idx === activeIndex ? styles.dotActive : ''}`}
                    onClick={() => scrollToIndex(idx)}
                    aria-label={`Go to ${pkg.name}`}
                  />
                ))}
              </div>
            </div>

            <div className={`${styles.sheet} ${sheetCollapsed ? styles.sheetCollapsed : ''}`}>
              <button
                type="button"
                className={styles.sheetToggle}
                onClick={() => setSheetCollapsed((v) => !v)}
                aria-expanded={!sheetCollapsed}
              >
                <span className={styles.sheetHandle} />
              </button>

              <div className={styles.sheetContent}>
                <div className={styles.sheetHeader}>
                  <div className={styles.sheetMeta}>
                    <div className={styles.sheetLabel}>{activePackage.label}</div>
                    <div className={styles.sheetTitle}>{activePackage.name}</div>
                  </div>
                  <button type="button" className={styles.sheetCta} onClick={() => onOpenContact && onOpenContact(null)}>
                    Få Offer
                  </button>
                </div>

                <ul className={styles.featureList}>
                  {activePackage.features.map((f) => (
                    <li key={f} className={styles.featureItem}>
                      <span className={styles.featureBullet} />
                      <span className={styles.featureText}>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

