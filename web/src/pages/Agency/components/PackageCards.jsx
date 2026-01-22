import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './PackageCards.module.css';
import GoldPackage from '../../../assets/Logo/GOLDPackage.png';
import SilverPackage from '../../../assets/Logo/SilverPackage.png';
import TitaniumPackage from '../../../assets/Logo/TitaniumPackage.png';

export function PackageCards({ onOpenContact, onActiveIndexChange }) {
  const { t } = useTranslation('agency');
  const [hoveredCard, setHoveredCard] = useState(null);
  const [activeIndex, setActiveIndex] = useState(1); // titanium default
  const [committedIndex, setCommittedIndex] = useState(1);
  const [cardCode, setCardCode] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
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
      name: t('packageCards.packages.silver.name'),
      label: t('packageCards.packages.silver.label'),
      image: SilverPackage,
      ref: cardRefs.silver,
      features: t('packageCards.packages.silver.features', { returnObjects: true }),
    },
    {
      id: 'titanium',
      name: t('packageCards.packages.titanium.name'),
      label: t('packageCards.packages.titanium.label'),
      image: TitaniumPackage,
      ref: cardRefs.titanium,
      features: t('packageCards.packages.titanium.features', { returnObjects: true }),
    },
    {
      id: 'gold',
      name: t('packageCards.packages.gold.name'),
      label: t('packageCards.packages.gold.label'),
      image: GoldPackage,
      ref: cardRefs.gold,
      features: t('packageCards.packages.gold.features', { returnObjects: true }),
    },
  ]), [t]);

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
          if (onActiveIndexChange) {
            onActiveIndexChange(bestIdx);
          }
        }, 50);
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
      // Notify parent of initial active index
      if (onActiveIndexChange) {
        onActiveIndexChange(activeIndex);
      }
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
    if (onActiveIndexChange) {
      onActiveIndexChange(clamped);
    }
    const slides = slideElsRef.current.filter(Boolean);
    const slide = slides[clamped];
    if (!slide) return;
    const target = slide.offsetLeft - (el.clientWidth - slide.clientWidth) / 2;
    el.scrollTo({ left: target, behavior: 'smooth' });
  };

  const activePackage = packages[committedIndex] ?? packages[1];

  const handleRedeem = (e) => {
    e.preventDefault();
    if (cardCode.trim() && businessName.trim()) {
      setShowSuccessModal(true);
      setShowRedeemModal(false);
      setCardCode('');
      setBusinessName('');
    }
  };

  const handleCardClick = (pkg) => {
    setSelectedPackage(pkg);
    setShowRedeemModal(true);
  };

  return (
    <>
    <section id="package-cards" className={styles.section}>
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
              role="presentation"
              tabIndex={-1}
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
          <div className={styles.phoneFrame}>
            {/* Package Card Carousel */}
            <div className={styles.phoneTop}>
              <div className={styles.carousel} ref={carouselRef} aria-label={t('packageCards.redeem.carouselLabel')}>
                {packages.map((pkg, idx) => (
                  <div
                    key={pkg.id}
                    className={`${styles.slide} ${idx === activeIndex ? styles.slideActive : styles.slideInactive}`}
                    ref={(node) => {
                      slideElsRef.current[idx] = node;
                    }}
                  >
                    <div className={styles.mobileCard} role="button" tabIndex={0}>
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
                    aria-label={t('packageCards.redeem.goToPackage', { package: pkg.name })}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>

    {/* Desktop Redeem Modal - Outside container for proper overlay */}
    {showRedeemModal && selectedPackage && (
      <div className={styles.modalOverlay} onClick={() => setShowRedeemModal(false)}>
        <div className={styles.redeemModalContent} onClick={(e) => e.stopPropagation()}>
          <button
            className={styles.modalClose}
            onClick={() => setShowRedeemModal(false)}
            aria-label={t('packageCards.redeem.close')}
          >
            ×
          </button>
          <div className={styles.redeemModalHeader}>
            <h2 className={styles.redeemModalTitle}>{t('packageCards.redeem.modalTitle')}</h2>
          </div>
          <form onSubmit={handleRedeem} className={styles.redeemModalForm}>
            <div className={styles.formGroup}>
              <label htmlFor="desktopCardCode" className={styles.label}>{t('packageCards.redeem.cardCode')}</label>
              <input
                id="desktopCardCode"
                type="text"
                className={styles.input}
                value={cardCode}
                onChange={(e) => setCardCode(e.target.value)}
                placeholder={t('packageCards.redeem.cardCodePlaceholder')}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="desktopBusinessName" className={styles.label}>{t('packageCards.redeem.businessName')}</label>
              <input
                id="desktopBusinessName"
                type="text"
                className={styles.input}
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder={t('packageCards.redeem.businessNamePlaceholder')}
                required
              />
            </div>
            <button type="submit" className={styles.submitButton}>
              {t('packageCards.redeem.submitButton')}
            </button>
          </form>
        </div>
      </div>
    )}

    {/* Success Modal - Outside container */}
    {showSuccessModal && (
      <div className={styles.modalOverlay} onClick={() => setShowSuccessModal(false)}>
        <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
          <button
            className={styles.modalClose}
            onClick={() => setShowSuccessModal(false)}
            aria-label={t('packageCards.redeem.close')}
          >
            ×
          </button>
          <div className={styles.modalIcon}>✓</div>
          <h3 className={styles.modalTitle}>{t('packageCards.success.title')}</h3>
          <p className={styles.modalText}>
            {t('packageCards.success.emailText')} <a href={`mailto:${t('packageCards.success.email')}`} className={styles.modalEmail}>{t('packageCards.success.email')}</a>
          </p>
          <p className={styles.modalText}>
            {t('packageCards.success.instructions')}
          </p>
        </div>
      </div>
    )}
    </>
  );
}

