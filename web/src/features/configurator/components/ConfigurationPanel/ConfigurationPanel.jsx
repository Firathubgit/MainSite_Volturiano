import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useConfigStore } from '../../../../stores/configStore';
import OptionCard from '../Options/OptionCard';
import PaintSwatchButton from '../Options/PaintSwatchButton';
import TrimCard from '../Options/TrimCard';
import PricingFooter from '../PricingFooter/PricingFooter';
import SaveToGarageButton from '../../../../features/garage/components/SaveToGarageButton';
import styles from './ConfigurationPanel.module.css';

// Inline SVG icons
const ChevronDown = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M6 9l6 6 6-6" />
  </svg>
);

const ChevronRight = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 18l6-6-6-6" />
  </svg>
);

/**
 * ConfigurationPanel Component
 * Sidebar panel with expandable sections for configuring the vehicle
 */
export default function ConfigurationPanel({ garageItemId = null }) {
  const { t } = useTranslation('configurator');
  const vehicleOptions = useConfigStore((state) => state.vehicleOptions);
  const selectedOptions = useConfigStore((state) => state.selectedOptions);
  const selectOption = useConfigStore((state) => state.selectOption);
  const pricing = useConfigStore((state) => state.pricing);
  const manifest = useConfigStore((state) => state.manifest);
  const vehicleId = useConfigStore((state) => state.vehicleId);
  const setAngle = useConfigStore((state) => state.setAngle);
  const currentAngle = useConfigStore((state) => state.currentAngle);
  
  // Navigation items matching Fiverr design - with translations
  const NAV_ITEMS = useMemo(() => [
    { id: 'trim', label: t('categories.trim'), icon: '🚗' },
    { id: 'exterior', label: t('categories.exterior'), icon: '🎨' },
    { id: 'wheels', label: t('categories.wheels'), icon: '⚙️' },
    { id: 'interior', label: t('categories.interior'), icon: '🪑' },
    { id: 'performance', label: t('categories.performance'), icon: '⚡' },
  ], [t]);

  // Auto-expand first section with options
  const [expandedSection, setExpandedSection] = useState(null);
  
  // Active category for Fiverr-style navigation
  const [activeCategory, setActiveCategory] = useState('trim');
  
  // Panel visibility state - start closed
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  
  // Auto-switch camera angle based on expanded section
  useEffect(() => {
    if (!expandedSection) return;
    
    let targetAngle = currentAngle;
    
    if (expandedSection === 'Paint') {
      targetAngle = 'front-3q';
      console.log('[ConfigurationPanel] Paint section expanded → switching to front-3q angle');
    } else if (expandedSection === 'Wheels') {
      targetAngle = 'rim';
      console.log('[ConfigurationPanel] Wheels section expanded → switching to rim angle');
    } else if (expandedSection === 'Performance') {
      targetAngle = 'rear-3q';
      console.log('[ConfigurationPanel] Performance section expanded → switching to rear-3q angle');
    } else if (expandedSection === 'Interior') {
      targetAngle = 'front-3q'; // or 'interior' if you have that angle
      console.log('[ConfigurationPanel] Interior section expanded → switching to front-3q angle');
    }
    
    if (targetAngle !== currentAngle) {
      setAngle(targetAngle);
    }
  }, [expandedSection, currentAngle, setAngle]);

  // Group options intelligently
  const groupedOptions = useMemo(() => {
    console.log('[ConfigurationPanel] ===== GROUPING OPTIONS =====');
    console.log('[ConfigurationPanel] Total vehicleOptions:', vehicleOptions.length);
    console.log('[ConfigurationPanel] Raw vehicleOptions:', vehicleOptions.map(opt => ({
      id: opt.id,
      code: opt.code,
      label: opt.label,
      category: opt.category,
      configurator_group: opt.configurator_group,
      configurator_visible: opt.configurator_visible
    })));
    
    const groups = {
      trim: [],
      exterior: [],
      wheels: [],
      interior: [],
      performance: [],
      other: []
    };
    
    vehicleOptions.forEach((option, index) => {
      const code = (option.code || '').toLowerCase();
      let group = option.configurator_group;
      
      console.log(`[ConfigurationPanel] Processing option ${index + 1}/${vehicleOptions.length}:`, {
        code: option.code,
        label: option.label,
        category: option.category,
        configurator_group: option.configurator_group,
        code_lowercase: code
      });
      
      // Infer group from code if not set
      if (!group) {
        if (code.includes('trim') || code.includes('model')) {
          group = 'trim';
          console.log(`[ConfigurationPanel]   → Inferred group: trim (from code)`);
        } else if (code.startsWith('paint_') || code.includes('paint')) {
          group = 'exterior';
          console.log(`[ConfigurationPanel]   → Inferred group: exterior (from paint code)`);
        } else if (code.startsWith('rim') || code.startsWith('wheel') || code.includes('rim') || code.includes('wheel')) {
          group = 'wheels';
          console.log(`[ConfigurationPanel]   → Inferred group: wheels (from rim/wheel code)`);
        } else if (code.startsWith('seat') || code.includes('interior') || option.category === 'interior') {
          group = 'interior';
          console.log(`[ConfigurationPanel]   → Inferred group: interior`);
        } else if (code.startsWith('engine') || code.startsWith('brake') || code.includes('performance') || option.category === 'performance') {
          group = 'performance';
          console.log(`[ConfigurationPanel]   → Inferred group: performance (from brake/engine code)`);
        } else if (option.category === 'exterior') {
          group = 'exterior';
          console.log(`[ConfigurationPanel]   → Inferred group: exterior (from category)`);
        } else {
          group = 'other';
          console.log(`[ConfigurationPanel]   → Inferred group: other (fallback)`);
        }
      } else {
        console.log(`[ConfigurationPanel]   → Using existing group: ${group}`);
      }
      
      // Normalize group name
      const normalizedGroup = (group || '').toLowerCase();
      console.log(`[ConfigurationPanel]   → Normalized group: ${normalizedGroup}`);
      
      if (normalizedGroup === 'exterior' || normalizedGroup === 'paint') {
        groups.exterior.push(option);
        console.log(`[ConfigurationPanel]   → Added to exterior group`);
      } else if (normalizedGroup === 'wheels' || normalizedGroup === 'rims') {
        groups.wheels.push(option);
        console.log(`[ConfigurationPanel]   → Added to wheels group`);
      } else if (normalizedGroup === 'interior') {
        groups.interior.push(option);
        console.log(`[ConfigurationPanel]   → Added to interior group`);
      } else if (normalizedGroup === 'performance' || normalizedGroup === 'engine' || normalizedGroup === 'brakes') {
        groups.performance.push(option);
        console.log(`[ConfigurationPanel]   → Added to performance group`);
      } else if (normalizedGroup === 'trim' || normalizedGroup === 'model') {
        groups.trim.push(option);
        console.log(`[ConfigurationPanel]   → Added to trim group`);
      } else {
        groups.other.push(option);
        console.log(`[ConfigurationPanel]   → Added to other group`);
      }
    });
    
    console.log('[ConfigurationPanel] ===== GROUPING RESULTS =====');
    console.log('[ConfigurationPanel] Group counts:', {
      trim: groups.trim.length,
      exterior: groups.exterior.length,
      wheels: groups.wheels.length,
      interior: groups.interior.length,
      performance: groups.performance.length,
      other: groups.other.length,
      total: vehicleOptions.length
    });
    console.log('[ConfigurationPanel] Exterior group options:', groups.exterior.map(o => ({ code: o.code, label: o.label })));
    console.log('[ConfigurationPanel] Performance group options:', groups.performance.map(o => ({ code: o.code, label: o.label })));
    console.log('[ConfigurationPanel] Other group options:', groups.other.map(o => ({ code: o.code, label: o.label })));
    
    return groups;
  }, [vehicleOptions]);

  // Auto-expand first section with options
  useEffect(() => {
    if (expandedSection === null && vehicleOptions.length > 0) {
      if (groupedOptions.trim.length > 0) {
        setExpandedSection('Trims');
        setActiveCategory('trim');
      } else if (groupedOptions.exterior.length > 0) {
        setExpandedSection('Paint');
        setActiveCategory('exterior');
      } else if (groupedOptions.wheels.length > 0) {
        setExpandedSection('Wheels');
        setActiveCategory('wheels');
      } else if (groupedOptions.interior.length > 0) {
        setExpandedSection('Interior');
        setActiveCategory('interior');
      } else if (groupedOptions.performance.length > 0) {
        setExpandedSection('Performance');
        setActiveCategory('performance');
      } else if (groupedOptions.other.length > 0) {
        setExpandedSection('Other');
      }
    }
  }, [expandedSection, vehicleOptions.length, groupedOptions]);
  
  // Sync active category with expanded section
  useEffect(() => {
    if (expandedSection === 'Trims') setActiveCategory('trim');
    else if (expandedSection === 'Paint') setActiveCategory('exterior');
    else if (expandedSection === 'Wheels') setActiveCategory('wheels');
    else if (expandedSection === 'Interior') setActiveCategory('interior');
    else if (expandedSection === 'Performance') setActiveCategory('performance');
  }, [expandedSection]);

  const handleOptionSelect = (optionId, valueId, priceDelta = 0, optionGroup = null) => {
    selectOption(optionId, valueId, priceDelta, optionGroup);
  };

  const toggleSection = (sectionId) => {
    setExpandedSection(expandedSection === sectionId ? null : sectionId);
  };
  
  const handleCategoryClick = (categoryId) => {
    // If clicking the active category, toggle panel visibility
    if (categoryId === activeCategory) {
      setIsPanelOpen(!isPanelOpen);
      return;
    }
    
    // If clicking a different category, open panel and switch to it
    setActiveCategory(categoryId);
    setIsPanelOpen(true);
    
    // Map category to section
    const categoryToSection = {
      'trim': 'Trims',
      'exterior': 'Paint',
      'wheels': 'Wheels',
      'interior': 'Interior',
      'performance': 'Performance'
    };
    const targetSection = categoryToSection[categoryId];
    if (targetSection) {
      setExpandedSection(targetSection);
    }
  };
  
  // Render options based on active category (Fiverr style)
  const renderCategoryOptions = () => {
    switch (activeCategory) {
      case 'trim':
        return groupedOptions.trim.length > 0 ? (
          <div className={styles.categoryContent}>
            <h3 className={styles.categoryLabel}>{t('categoryLabels.modelTrim')}</h3>
            <div className={styles.optionsGrid}>
              {groupedOptions.trim.map((option, index) => (
                <TrimCard
                  key={option.id}
                  option={option}
                  index={index}
                  isSelected={selectedOptions[option.id] === option.id}
                  onSelect={() => handleOptionSelect(option.id, option.id, (option.price_cents || 0) / 100, 'trim')}
                />
              ))}
            </div>
          </div>
        ) : null;
        
      case 'exterior':
        return groupedOptions.exterior.length > 0 ? (
          <div className={styles.categoryContent}>
            <h3 className={styles.categoryLabel}>{t('categoryLabels.paintFinish')}</h3>
            <div className={styles.paintGrid}>
              {groupedOptions.exterior.map((option) => (
                <PaintSwatchButton
                  key={option.id}
                  option={option}
                  isSelected={selectedOptions[option.id] === option.id}
                  onSelect={() => handleOptionSelect(option.id, option.id, (option.price_cents || 0) / 100, 'exterior')}
                />
              ))}
            </div>
          </div>
        ) : null;
        
      case 'wheels':
        return groupedOptions.wheels.length > 0 ? (
          <div className={styles.categoryContent}>
            <h3 className={styles.categoryLabel}>{t('categoryLabels.rimSelection')}</h3>
            <div className={styles.optionsGrid}>
              {groupedOptions.wheels.map((option, index) => (
                <OptionCard
                  key={option.id}
                  option={option}
                  index={index}
                  isSelected={selectedOptions[option.id] === option.id}
                  onSelect={() => handleOptionSelect(option.id, option.id, (option.price_cents || 0) / 100, 'wheels')}
                />
              ))}
            </div>
          </div>
        ) : null;
        
      case 'interior':
        return groupedOptions.interior.length > 0 ? (
          <div className={styles.categoryContent}>
            <h3 className={styles.categoryLabel}>{t('categoryLabels.trimUpholstery')}</h3>
            <div className={styles.optionsGrid}>
              {groupedOptions.interior.map((option, index) => (
                <OptionCard
                  key={option.id}
                  option={option}
                  index={index}
                  isSelected={selectedOptions[option.id] === option.id}
                  onSelect={() => handleOptionSelect(option.id, option.id, (option.price_cents || 0) / 100, 'interior')}
                />
              ))}
            </div>
          </div>
        ) : null;
        
      case 'performance':
        return groupedOptions.performance.length > 0 ? (
          <div className={styles.categoryContent}>
            <h3 className={styles.categoryLabel}>{t('categoryLabels.powertrain')}</h3>
            <div className={styles.optionsGrid}>
              {groupedOptions.performance.map((option, index) => (
                <OptionCard
                  key={option.id}
                  option={option}
                  index={index}
                  isSelected={selectedOptions[option.id] === option.id}
                  onSelect={() => handleOptionSelect(option.id, option.id, (option.price_cents || 0) / 100, 'performance')}
                />
              ))}
            </div>
          </div>
        ) : null;
        
      default:
        return null;
    }
  };

  // Get selected option name for a group
  const getSelectedOptionName = (groupKey) => {
    const groupOptions = groupedOptions[groupKey] || [];
    const selected = groupOptions.find(opt => selectedOptions[opt.id]);
    return selected?.label || '';
  };

  // Build configuration payload for saving
  const buildConfigurationPayload = () => {
    const selectedOptionsArray = Object.keys(selectedOptions).map(optionId => {
      const option = vehicleOptions.find(opt => opt.id === optionId);
      if (option) {
        return {
          id: option.id,
          code: option.code,
          label: option.label,
          price: (option.price_cents || 0) / 100,
          category: option.category,
          group: option.configurator_group
        };
      }
      return null;
    }).filter(Boolean);

    const configPayload = {
      schemaVersion: 1,
      vehicle: {
        id: vehicleId,
        model: manifest?.vehicleModel || 'Unknown Model',
        trim: 'GT Launch',
        year: 2025,
        basePrice: pricing.base,
        slug: manifest?.vehicleModel?.toLowerCase().replace(/\s+/g, '-') || 'unknown-model'
      },
      options: {
        exterior: selectedOptionsArray.filter(opt => opt.category === 'exterior' || opt.code?.startsWith('paint_') || opt.code?.includes('paint')),
        interior: selectedOptionsArray.filter(opt => opt.category === 'interior' || opt.code?.startsWith('seat_')),
        performance: selectedOptionsArray.filter(opt => opt.category === 'performance' || opt.code?.startsWith('engine_') || opt.code?.startsWith('brake_')),
      },
      pricing: {
        basePriceCents: pricing.base * 100,
        optionsTotalCents: pricing.options * 100,
        discountCents: pricing.incentives * 100,
        totalPriceCents: pricing.total * 100,
        currency: pricing.currency
      },
      media: {
        heroImage: null,
        gallery: []
      },
      history: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        source: 'configurator',
        configuratorType: '2d',
        configuratorVersion: '1.0',
        manifestId: manifest?.id || null,
        cameraAngle: useConfigStore.getState().currentAngle,
        notes: 'Saved from 2D configurator'
      },
      metadata: {
        configurator: {
          type: '2d',
          manifestId: manifest?.id || null,
          cameraAngle: useConfigStore.getState().currentAngle,
        }
      }
    };
    return configPayload;
  };

  return (
    <div className={styles.overlayPanel}>
      {/* Vertical Navigation Sidebar */}
      <nav className={styles.navSidebar}>
        {NAV_ITEMS.map((item) => {
          const hasOptions = 
            (item.id === 'trim' && groupedOptions.trim.length > 0) ||
            (item.id === 'exterior' && groupedOptions.exterior.length > 0) ||
            (item.id === 'wheels' && groupedOptions.wheels.length > 0) ||
            (item.id === 'interior' && groupedOptions.interior.length > 0) ||
            (item.id === 'performance' && groupedOptions.performance.length > 0);
          
          if (!hasOptions) return null;
          
          return (
            <button
              key={item.id}
              onClick={() => handleCategoryClick(item.id)}
              className={`${styles.navButton} ${activeCategory === item.id ? styles.navButtonActive : ''}`}
              title={item.label}
            >
              <div className={`${styles.navDot} ${activeCategory === item.id ? styles.navDotActive : ''}`} />
            </button>
                      );
                    })}
      </nav>

      {/* Active Category Panel */}
      {isPanelOpen && (
        <div className={styles.categoryPanel}>
          <div className={styles.categoryHeader}>
            <h2 className={styles.categoryTitle}>
              {NAV_ITEMS.find(n => n.id === activeCategory)?.label || t('categories.exterior')}
            </h2>
            <span className={styles.categoryNumber}>
              0{NAV_ITEMS.findIndex(n => n.id === activeCategory) + 1} / 05
                  </span>
          </div>
          <div className={`${styles.categoryBody} custom-scrollbar`}>
            {vehicleOptions.length === 0 ? (
              <div className={styles.loadingState}>
                <p>{t('states.loadingOptions')}</p>
              </div>
            ) : renderCategoryOptions() || (
              <div className={styles.emptyState}>
                <p>{t('states.noOptions')}</p>
              </div>
            )}
          </div>
          </div>
        )}
    </div>
  );
}
