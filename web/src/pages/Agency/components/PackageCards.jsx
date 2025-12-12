import React, { useRef, useState } from 'react';
import styles from './PackageCards.module.css';
import GoldPackage from '../../../assets/Logo/GOLDPackage.png';
import SilverPackage from '../../../assets/Logo/SilverPackage.png';
import TitaniumPackage from '../../../assets/Logo/TitaniumPackage.png';

export function PackageCards({ onOpenContact }) {
  const [hoveredCard, setHoveredCard] = useState(null);
  const cardRefs = {
    silver: useRef(null),
    gold: useRef(null),
    titanium: useRef(null),
  };

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

  const packages = [
    {
      id: 'silver',
      name: 'Silver Package',
      image: SilverPackage,
      ref: cardRefs.silver,
    },
    {
      id: 'titanium',
      name: 'Titanium Package',
      image: TitaniumPackage,
      ref: cardRefs.titanium,
    },
    {
      id: 'gold',
      name: 'Gold Package',
      image: GoldPackage,
      ref: cardRefs.gold,
    },
  ];

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.grid}>
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
            >
              <div className={styles.cardInner}>
                <div className={styles.shine} />
                <img 
                  src={pkg.image} 
                  alt={pkg.name}
                  className={styles.cardImage}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

