import React from 'react';
import styles from './MaterialSwatch.module.css';

/**
 * MaterialSwatch Component
 * SVG-based material swatch for paint/body color selection
 * Features realistic paint material with gloss, depth, and highlights
 */
export default function MaterialSwatch({ 
  color, 
  color2 = null, 
  isSelected = false,
  ringColor = '#ffffff',
  id = null
}) {
  // Use color2 if provided, otherwise use color for gradient
  const swatchColor = color || '#1e242e';
  const swatchColor2 = color2 || swatchColor;
  
  // Calculate mid color for metallic gradient
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };
  
  const rgbToHex = (r, g, b) => {
    return "#" + [r, g, b].map(x => {
      const hex = Math.max(0, Math.min(255, Math.round(x))).toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    }).join("");
  };
  
  const getMidColor = (color1, color2) => {
    const rgb1 = hexToRgb(color1);
    const rgb2 = hexToRgb(color2);
    if (!rgb1 || !rgb2) return color1;
    return rgbToHex(
      (rgb1.r + rgb2.r) / 2,
      (rgb1.g + rgb2.g) / 2,
      (rgb1.b + rgb2.b) / 2
    );
  };
  
  const swatchMid = getMidColor(swatchColor, swatchColor2);
  
  // Create unique ID for gradients using color hash or provided id
  const uniqueId = id || `swatch-${swatchColor.replace(/#/g, '')}`;
  const baseMetalId = `baseMetal-${uniqueId}`;
  const sheenId = `sheen-${uniqueId}`;
  const topGlowId = `topGlow-${uniqueId}`;
  const bottomShadeId = `bottomShade-${uniqueId}`;
  const vignetteId = `vignette-${uniqueId}`;

  return (
    <svg
      className={`${styles.materialSwatch} ${isSelected ? styles.active : ''} ${styles.cleanMetal}`}
      viewBox="0 0 120 72"
      preserveAspectRatio="xMidYMid meet"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{
        '--swatch': swatchColor,
        '--swatchMid': swatchMid,
        '--swatch2': swatchColor2,
        '--ring': ringColor
      }}
    >
      <defs>
        {/* Clean metallic base */}
        <linearGradient id={baseMetalId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={swatchColor} />
          <stop offset="45%" stopColor={swatchMid} />
          <stop offset="100%" stopColor={swatchColor2} />
        </linearGradient>

        {/* Sharp metallic sheen (no grain) */}
        <linearGradient id={sheenId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0" />
          <stop offset="30%" stopColor="#fff" stopOpacity="0.06" />
          <stop offset="48%" stopColor="#fff" stopOpacity="0.22" />
          <stop offset="56%" stopColor="#fff" stopOpacity="0.10" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>

        {/* Soft top highlight */}
        <linearGradient id={topGlowId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.10" />
          <stop offset="60%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>

        {/* Bottom depth */}
        <linearGradient id={bottomShadeId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.28" />
        </linearGradient>

        {/* Very subtle inner vignette to feel "3D" */}
        <radialGradient id={vignetteId} cx="50%" cy="0%" r="140%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.04" />
          <stop offset="70%" stopColor="#fff" stopOpacity="0.00" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.14" />
        </radialGradient>
      </defs>

      {/* Base rectangle (straight edges) */}
      <rect x="0" y="0" width="120" height="72" fill={`url(#${baseMetalId})`} />

      {/* Clean metallic lighting */}
      <rect x="0" y="0" width="120" height="72" fill={`url(#${topGlowId})`} />
      <rect x="0" y="0" width="120" height="72" fill={`url(#${sheenId})`} />
      <rect x="0" y="0" width="120" height="72" fill={`url(#${vignetteId})`} />
      <rect x="0" y="38" width="120" height="34" fill={`url(#${bottomShadeId})`} />

      {/* Minimal border (optional) */}
      <rect
        className={styles.swatchBorder}
        x="0.75" y="0.75" width="118.5" height="70.5"
        fill="none"
        stroke="rgba(255,255,255,0.14)"
        strokeWidth="1.5"
      />

      {/* Active ring (enable with .active) */}
      <rect
        className={styles.swatchSelected}
        x="0" y="0" width="120" height="72"
        fill="none"
        stroke={ringColor}
        strokeWidth="3"
        opacity={isSelected ? "1" : "0"}
      />
    </svg>
  );
}

