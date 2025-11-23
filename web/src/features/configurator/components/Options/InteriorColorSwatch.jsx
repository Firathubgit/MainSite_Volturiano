import React from 'react';
import styles from './InteriorColorSwatch.module.css';

/**
 * InteriorColorSwatch Component
 * Circular diagonal split color swatch for interior options
 * Supports different color combinations: red/white, black/gray, orange/black
 */
export default function InteriorColorSwatch({ 
  color1, 
  color2, 
  id = null 
}) {
  // Create unique ID for gradients
  const uniqueId = id || `interior-${color1}-${color2}`;
  const diagWhiteId = `diagWhite-${uniqueId}`;
  const diagColor2Id = `diagColor2-${uniqueId}`;
  const color1GradId = `color1Grad-${uniqueId}`;
  const color2GradId = `color2Grad-${uniqueId}`;
  const softSheenId = `softSheen-${uniqueId}`;

  // Default color combinations
  const getColorValues = () => {
    if (color1 === 'red' && color2 === 'white') {
      return {
        color1_1: '#7a0000',
        color1_2: '#ff1f1f',
        color2_1: '#ffffff',
        color2_2: '#dcdcdc'
      };
    } else if (color1 === 'black' && color2 === 'gray') {
      return {
        color1_1: '#000000',
        color1_2: '#1a1a1a',
        color2_1: '#808080',
        color2_2: '#a0a0a0'
      };
    } else if (color1 === 'orange' && color2 === 'black') {
      return {
        color1_1: '#ff6b00',
        color1_2: '#ff8c42',
        color2_1: '#000000',
        color2_2: '#1a1a1a'
      };
    }
    // Default to red/white
    return {
      color1_1: '#7a0000',
      color1_2: '#ff1f1f',
      color2_1: '#ffffff',
      color2_2: '#dcdcdc'
    };
  };

  const colors = getColorValues();

  return (
    <svg
      className={styles.interiorSwatch}
      viewBox="0 0 100 100"
      width="48"
      height="48"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        {/* Diagonal 45° split */}
        <clipPath id={diagWhiteId}>
          <polygon points="0,0 100,0 0,100" />
        </clipPath>
        <clipPath id={diagColor2Id}>
          <polygon points="100,100 100,0 0,100" />
        </clipPath>

        {/* Color 1 gradient */}
        <linearGradient id={color1GradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={colors.color1_1} />
          <stop offset="100%" stopColor={colors.color1_2} />
        </linearGradient>

        {/* Color 2 gradient */}
        <linearGradient id={color2GradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={colors.color2_1} />
          <stop offset="100%" stopColor={colors.color2_2} />
        </linearGradient>

        {/* Stronger clean sheen for "material chip" pop */}
        <radialGradient id={softSheenId} cx="35%" cy="18%" r="90%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.18" />
          <stop offset="55%" stopColor="#ffffff" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.10" />
        </radialGradient>
      </defs>

      {/* Color 2 half (top-left) */}
      <circle
        cx="50"
        cy="50"
        r="46"
        fill={`url(#${color2GradId})`}
        clipPath={`url(#${diagWhiteId})`}
      />

      {/* Color 1 half (bottom-right) */}
      <circle
        cx="50"
        cy="50"
        r="46"
        fill={`url(#${color1GradId})`}
        clipPath={`url(#${diagColor2Id})`}
      />

      {/* Sheen */}
      <circle cx="50" cy="50" r="46" fill={`url(#${softSheenId})`} />

      {/* Minimal outline */}
      <circle
        cx="50"
        cy="50"
        r="46"
        fill="none"
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="2"
      />
    </svg>
  );
}

