import React from 'react';
import ColorSwatch from './ColorSwatch';
import MaterialSwatch from './MaterialSwatch';
import InteriorColorSwatch from './InteriorColorSwatch';
import WheelPreview from './WheelPreview';
import OptionImage from './OptionImage';
import styles from './OptionCard.module.css';

/**
 * OptionCard Component
 * Card for selecting an option (paint, wheels, interior)
 * Uses MaterialSwatch for paint/exterior options for a cleaner visual design
 */
export default function OptionCard({ option, isSelected, onSelect, index = 0 }) {
  const hasColor = option.configurator_metadata?.previewColor;
  const hasImage = option.configurator_image_url && !hasColor;
  
  // Check if this is a wheel/rim option FIRST (before paint check)
  const isWheelOption = 
    option.configurator_group === 'wheels' ||
    option.category === 'wheels' ||
    option.code?.startsWith('rim') ||
    option.code?.startsWith('wheel');
  
  // Check if this is a paint/exterior option (but not wheels)
  const isPaintOption = 
    !isWheelOption && (
      option.code?.startsWith('paint_') || 
      option.configurator_group === 'exterior' ||
      option.category === 'exterior'
    );
  
  // Check if this is an interior option
  const isInteriorOption = 
    option.configurator_group === 'interior' ||
    option.category === 'interior';
  
  const paintColor = option.configurator_metadata?.previewColor || option.configurator_metadata?.color;
  const paintColor2 = option.configurator_metadata?.previewColor2 || paintColor;
  
  // Get interior color combination from metadata or assign based on index
  // Cycle through: red/white, black/gray, orange/black
  const getInteriorColors = () => {
    // Check if colors are specified in metadata
    if (option.configurator_metadata?.interiorColor1 && option.configurator_metadata?.interiorColor2) {
      return {
        color1: option.configurator_metadata.interiorColor1,
        color2: option.configurator_metadata.interiorColor2
      };
    }
    
    // Assign colors based on index, cycling through the three combinations
    const colorCombinations = [
      { color1: 'red', color2: 'white' },
      { color1: 'black', color2: 'gray' },
      { color1: 'orange', color2: 'black' }
    ];
    
    return colorCombinations[index % 3];
  };
  
  const interiorColors = getInteriorColors();
  const interiorColor1 = interiorColors.color1;
  const interiorColor2 = interiorColors.color2;

  return (
    <div
      className={`${styles.card} ${isSelected ? styles.selected : ''} ${isPaintOption ? styles.paintCard : ''}`}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      <div className={styles.preview}>
        {isPaintOption && paintColor ? (
          <MaterialSwatch 
            color={paintColor} 
            color2={paintColor2}
            isSelected={isSelected}
            ringColor="#ff4520"
            id={option.id}
          />
        ) : isInteriorOption ? (
          <InteriorColorSwatch 
            color1={interiorColor1}
            color2={interiorColor2}
            id={option.id}
          />
        ) : isWheelOption ? (
          <WheelPreview 
            style={option.configurator_metadata?.wheelStyle || (index % 3 === 0 ? 'standard' : index % 3 === 1 ? 'sport' : 'luxury')}
            color={option.configurator_metadata?.wheelColor}
            index={index}
            id={option.id}
          />
        ) : hasColor ? (
          <ColorSwatch color={paintColor} />
        ) : hasImage ? (
          <OptionImage src={option.configurator_image_url} alt={option.label} />
        ) : (
          <div className={styles.placeholder} />
        )}
        {isSelected && !isPaintOption && (
          <div className={styles.checkmark}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
        )}
      </div>
      
      {/* Show text for all non-paint options (wheels, interior, performance) */}
      {!isPaintOption && (
        <>
          <div className={styles.info}>
            <p className={styles.name}>{option.label || option.name || 'Option'}</p>
            {(option.description || option.configurator_metadata?.description) && (
              <p className={styles.description}>
                {option.description || option.configurator_metadata?.description}
              </p>
            )}
          </div>
          <span className={`${styles.price} ${option.price_cents === 0 ? styles.included : ''}`}>
            {option.price_cents === 0 
              ? 'INCLUDED' 
              : `+$${(option.price_cents / 100).toLocaleString()}`}
          </span>
        </>
      )}
    </div>
  );
}

