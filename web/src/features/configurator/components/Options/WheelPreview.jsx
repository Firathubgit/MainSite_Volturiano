import React from 'react';
import styles from './WheelPreview.module.css';

/**
 * WheelPreview Component
 * Visual preview for wheel/rim options
 * Shows a stylized wheel design with colors
 */
export default function WheelPreview({ 
  style = 'standard', // 'standard', 'sport', 'luxury'
  color = null, // Optional color override
  index = 0, // Index for color cycling
  id = null 
}) {
  const uniqueId = id || `wheel-${style}`;
  
  // Get color based on index or use provided color
  const getWheelColor = () => {
    if (color) return color;
    
    // Cycle through: black, silver, anodized purple
    const colorCycle = [
      '#000000',      // Black
      '#c0c0c0',      // Silver
      '#8b5cf6'       // Anodized purple
    ];
    
    return colorCycle[index % 3];
  };
  
  const wheelColor = getWheelColor();
  const isAnodizedPurple = wheelColor === '#8b5cf6';
  
  // Convert hex to RGB for gradients
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 74, g: 74, b: 74 };
  };
  
  const rgb = hexToRgb(wheelColor);
  
  // Special handling for anodized purple - more vibrant gradient
  const lighterRgb = isAnodizedPurple ? {
    r: Math.min(255, rgb.r + 60),
    g: Math.min(255, rgb.g + 50),
    b: Math.min(255, rgb.b + 40)
  } : {
    r: Math.min(255, rgb.r + 40),
    g: Math.min(255, rgb.g + 40),
    b: Math.min(255, rgb.b + 40)
  };
  
  const darkerRgb = isAnodizedPurple ? {
    r: Math.max(0, rgb.r - 40),
    g: Math.max(0, rgb.g - 50),
    b: Math.max(0, rgb.b - 60)
  } : {
    r: Math.max(0, rgb.r - 30),
    g: Math.max(0, rgb.g - 30),
    b: Math.max(0, rgb.b - 30)
  };

  return (
    <svg
      className={styles.wheelPreview}
      viewBox="0 0 100 100"
      width="48"
      height="48"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        {/* Wheel gradient with color */}
        <radialGradient id={`wheelGrad-${uniqueId}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={`rgb(${lighterRgb.r}, ${lighterRgb.g}, ${lighterRgb.b})`} />
          <stop offset="70%" stopColor={wheelColor} />
          <stop offset="100%" stopColor={`rgb(${darkerRgb.r}, ${darkerRgb.g}, ${darkerRgb.b})`} />
        </radialGradient>

        {/* Rim highlight with color tint */}
        <radialGradient id={`rimGrad-${uniqueId}`} cx="50%" cy="50%" r="45%">
          <stop offset="0%" stopColor={`rgb(${lighterRgb.r}, ${lighterRgb.g}, ${lighterRgb.b})`} stopOpacity="0.4" />
          <stop offset="50%" stopColor={wheelColor} stopOpacity="0.2" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.3" />
        </radialGradient>

        {/* Spoke pattern based on style */}
        {style === 'sport' && (
          <pattern id={`spokePattern-${uniqueId}`} x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <line x1="10" y1="0" x2="10" y2="20" stroke="#ffffff" strokeWidth="0.5" opacity="0.3" />
            <line x1="0" y1="10" x2="20" y2="10" stroke="#ffffff" strokeWidth="0.5" opacity="0.3" />
          </pattern>
        )}
      </defs>

      {/* Outer rim */}
      <circle
        cx="50"
        cy="50"
        r="48"
        fill={`url(#wheelGrad-${uniqueId})`}
        stroke={wheelColor}
        strokeWidth="1"
        strokeOpacity="0.4"
      />

      {/* Inner rim circle */}
      <circle
        cx="50"
        cy="50"
        r="35"
        fill="none"
        stroke={wheelColor}
        strokeWidth="1.5"
        strokeOpacity="0.3"
      />

      {/* Spokes with color */}
      {style === 'sport' ? (
        <>
          {/* Diagonal spokes */}
          <line x1="50" y1="50" x2="15" y2="15" stroke={wheelColor} strokeWidth="1.5" strokeOpacity="0.6" />
          <line x1="50" y1="50" x2="85" y2="15" stroke={wheelColor} strokeWidth="1.5" strokeOpacity="0.6" />
          <line x1="50" y1="50" x2="15" y2="85" stroke={wheelColor} strokeWidth="1.5" strokeOpacity="0.6" />
          <line x1="50" y1="50" x2="85" y2="85" stroke={wheelColor} strokeWidth="1.5" strokeOpacity="0.6" />
        </>
      ) : style === 'luxury' ? (
        <>
          {/* More spokes for luxury */}
          {[...Array(8)].map((_, i) => {
            const angle = (i * 45) * Math.PI / 180;
            const x1 = 50 + 15 * Math.cos(angle);
            const y1 = 50 + 15 * Math.sin(angle);
            const x2 = 50 + 35 * Math.cos(angle);
            const y2 = 50 + 35 * Math.sin(angle);
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={wheelColor}
                strokeWidth="1"
                strokeOpacity="0.5"
              />
            );
          })}
        </>
      ) : (
        <>
          {/* Standard 5-spoke */}
          {[...Array(5)].map((_, i) => {
            const angle = (i * 72) * Math.PI / 180;
            const x1 = 50 + 15 * Math.cos(angle);
            const y1 = 50 + 15 * Math.sin(angle);
            const x2 = 50 + 35 * Math.cos(angle);
            const y2 = 50 + 35 * Math.sin(angle);
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={wheelColor}
                strokeWidth="1.5"
                strokeOpacity="0.7"
              />
            );
          })}
        </>
      )}

      {/* Center hub */}
      <circle
        cx="50"
        cy="50"
        r="12"
        fill={`url(#rimGrad-${uniqueId})`}
        stroke={wheelColor}
        strokeWidth="1"
        strokeOpacity="0.5"
      />

      {/* Center dot */}
      <circle
        cx="50"
        cy="50"
        r="4"
        fill={wheelColor}
        fillOpacity="0.6"
      />
    </svg>
  );
}

