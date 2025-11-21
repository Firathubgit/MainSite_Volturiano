import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useConfigStore } from '../../../../stores/configStore';
import OptionCard from '../Options/OptionCard';
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
  const vehicleOptions = useConfigStore((state) => state.vehicleOptions);
  const selectedOptions = useConfigStore((state) => state.selectedOptions);
  const selectOption = useConfigStore((state) => state.selectOption);
  const pricing = useConfigStore((state) => state.pricing);
  const manifest = useConfigStore((state) => state.manifest);
  const vehicleId = useConfigStore((state) => state.vehicleId);
  const setAngle = useConfigStore((state) => state.setAngle);
  const currentAngle = useConfigStore((state) => state.currentAngle);

  // Auto-expand first section with options
  const [expandedSection, setExpandedSection] = useState(null);
  
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
      if (groupedOptions.exterior.length > 0) {
        setExpandedSection('Paint');
      } else if (groupedOptions.wheels.length > 0) {
        setExpandedSection('Wheels');
      } else if (groupedOptions.trim.length > 0) {
        setExpandedSection('Trims');
      } else if (groupedOptions.interior.length > 0) {
        setExpandedSection('Interior');
      } else if (groupedOptions.performance.length > 0) {
        setExpandedSection('Performance');
      } else if (groupedOptions.other.length > 0) {
        setExpandedSection('Other');
      }
    }
  }, [expandedSection, vehicleOptions.length, groupedOptions]);

  const handleOptionSelect = (optionId, valueId, priceDelta = 0, optionGroup = null) => {
    selectOption(optionId, valueId, priceDelta, optionGroup);
  };

  const toggleSection = (sectionId) => {
    setExpandedSection(expandedSection === sectionId ? null : sectionId);
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
    <div className={styles.panel}>
      {/* Header */}
      <div className={styles.header}>
        <h2 className={styles.title}>
          Configure Your <span className={styles.accent}>Volturiano</span>
        </h2>
        <p className={styles.delivery}>Estimated Delivery: Late 2025</p>
      </div>

      {/* Scrollable Content */}
      <div className={`${styles.content} custom-scrollbar`}>
        {/* Debug info */}
        {vehicleOptions.length === 0 && (
          <div style={{ padding: '2rem', color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem' }}>
            <p>Loading options...</p>
          </div>
        )}

        {vehicleOptions.length > 0 && Object.values(groupedOptions).every(g => g.length === 0) && (
          <div style={{ padding: '2rem', color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem' }}>
            <p>No options found. Total loaded: {vehicleOptions.length}</p>
            <p style={{ fontSize: '0.75rem', marginTop: '0.5rem', opacity: 0.7 }}>
              Options: {vehicleOptions.map(o => o.code || o.label).join(', ')}
            </p>
          </div>
        )}

        {/* Trims Section */}
        {groupedOptions.trim.length > 0 && (
          <div className={styles.section}>
            <button
              type="button"
              className={styles.sectionHeader}
              onClick={() => toggleSection('Trims')}
            >
              <span className={styles.sectionTitle}>Model Trim</span>
              {expandedSection === 'Trims' ? (
                <ChevronDown size={20} />
              ) : (
                <ChevronRight size={20} />
              )}
            </button>

            {expandedSection === 'Trims' && (
              <div className={styles.sectionContent}>
                {groupedOptions.trim.map((option) => (
                  <TrimCard
                    key={option.id}
                    option={option}
                    isSelected={selectedOptions[option.id] === option.id}
                    onSelect={() => handleOptionSelect(option.id, option.id, (option.price_cents || 0) / 100, 'trim')}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Paint Section */}
        {groupedOptions.exterior.length > 0 && (
          <div className={styles.section}>
            <button
              type="button"
              className={styles.sectionHeader}
              onClick={() => {
                console.log('[ConfigurationPanel] Paint section clicked, expandedSection:', expandedSection);
                console.log('[ConfigurationPanel] Exterior options to render:', groupedOptions.exterior.map(o => ({ code: o.code, label: o.label })));
                toggleSection('Paint');
              }}
            >
              <div className={styles.sectionHeaderContent}>
                <span className={styles.sectionTitle}>Paint</span>
                {getSelectedOptionName('exterior') && (
                  <span className={styles.selectedBadge}>
                    {getSelectedOptionName('exterior')}
                  </span>
                )}
              </div>
              {expandedSection === 'Paint' ? (
                <ChevronDown size={20} />
              ) : (
                <ChevronRight size={20} />
              )}
            </button>

            <AnimatePresence>
              {expandedSection === 'Paint' && (
                <motion.div 
                  className={styles.sectionContent}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ 
                    height: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] },
                    opacity: { duration: 0.2, ease: 'easeOut' }
                  }}
                  style={{ overflow: 'hidden' }}
                >
                  {console.log('[ConfigurationPanel] Rendering Paint section with', groupedOptions.exterior.length, 'options')}
                  {console.log('[ConfigurationPanel] Paint options details:', groupedOptions.exterior)}
                  <motion.div 
                    className={styles.optionsGrid}
                    initial="hidden"
                    animate="visible"
                    variants={{
                      hidden: { opacity: 0 },
                      visible: {
                        opacity: 1,
                        transition: {
                          staggerChildren: 0.05,
                          delayChildren: 0.1
                        }
                      }
                    }}
                  >
                    {groupedOptions.exterior.map((option, index) => {
                      console.log(`[ConfigurationPanel] Rendering paint option ${index + 1}:`, option.code, option.label);
                      return (
                        <motion.div
                          key={option.id}
                          variants={{
                            hidden: { opacity: 0, y: 10 },
                            visible: { 
                              opacity: 1, 
                              y: 0,
                              transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }
                            }
                          }}
                        >
                          <OptionCard
                            option={option}
                            isSelected={selectedOptions[option.id] === option.id}
                            onSelect={() => {
                              console.log('[ConfigurationPanel] Paint option selected:', option.code, option.label);
                              handleOptionSelect(option.id, option.id, (option.price_cents || 0) / 100, 'exterior');
                            }}
                          />
                        </motion.div>
                      );
                    })}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Wheels Section */}
        {groupedOptions.wheels.length > 0 && (
          <div className={styles.section}>
            <button
              type="button"
              className={styles.sectionHeader}
              onClick={() => toggleSection('Wheels')}
            >
              <div className={styles.sectionHeaderContent}>
                <span className={styles.sectionTitle}>Wheels</span>
                {getSelectedOptionName('wheels') && (
                  <span className={styles.selectedBadge}>
                    {getSelectedOptionName('wheels')}
                  </span>
                )}
              </div>
              {expandedSection === 'Wheels' ? (
                <ChevronDown size={20} />
              ) : (
                <ChevronRight size={20} />
              )}
            </button>

            <AnimatePresence>
              {expandedSection === 'Wheels' && (
                <motion.div 
                  className={styles.sectionContent}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ 
                    height: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] },
                    opacity: { duration: 0.2, ease: 'easeOut' }
                  }}
                  style={{ overflow: 'hidden' }}
                >
                  <motion.div 
                    className={styles.optionsGrid}
                    initial="hidden"
                    animate="visible"
                    variants={{
                      hidden: { opacity: 0 },
                      visible: {
                        opacity: 1,
                        transition: {
                          staggerChildren: 0.05,
                          delayChildren: 0.1
                        }
                      }
                    }}
                  >
                    {groupedOptions.wheels.map((option) => (
                      <motion.div
                        key={option.id}
                        variants={{
                          hidden: { opacity: 0, y: 10 },
                          visible: { 
                            opacity: 1, 
                            y: 0,
                            transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }
                          }
                        }}
                      >
                        <OptionCard
                          option={option}
                          isSelected={selectedOptions[option.id] === option.id}
                          onSelect={() => handleOptionSelect(option.id, option.id, (option.price_cents || 0) / 100, 'wheels')}
                        />
                      </motion.div>
                    ))}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Interior Section */}
        {groupedOptions.interior.length > 0 && (
          <div className={styles.section}>
            <button
              type="button"
              className={styles.sectionHeader}
              onClick={() => toggleSection('Interior')}
            >
              <div className={styles.sectionHeaderContent}>
                <span className={styles.sectionTitle}>Interior</span>
                {getSelectedOptionName('interior') && (
                  <span className={styles.selectedBadge}>
                    {getSelectedOptionName('interior')}
                  </span>
                )}
              </div>
              {expandedSection === 'Interior' ? (
                <ChevronDown size={20} />
              ) : (
                <ChevronRight size={20} />
              )}
            </button>

            {expandedSection === 'Interior' && (
              <div className={styles.sectionContent}>
                <div className={styles.optionsGrid}>
                  {groupedOptions.interior.map((option) => (
                    <OptionCard
                      key={option.id}
                      option={option}
                      isSelected={selectedOptions[option.id] === option.id}
                      onSelect={() => handleOptionSelect(option.id, option.id, (option.price_cents || 0) / 100, 'interior')}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Performance Section */}
        {groupedOptions.performance.length > 0 && (
          <div className={styles.section}>
            <button
              type="button"
              className={styles.sectionHeader}
              onClick={() => toggleSection('Performance')}
            >
              <div className={styles.sectionHeaderContent}>
                <span className={styles.sectionTitle}>Performance</span>
                {getSelectedOptionName('performance') && (
                  <span className={styles.selectedBadge}>
                    {getSelectedOptionName('performance')}
                  </span>
                )}
              </div>
              {expandedSection === 'Performance' ? (
                <ChevronDown size={20} />
              ) : (
                <ChevronRight size={20} />
              )}
            </button>

            <AnimatePresence>
              {expandedSection === 'Performance' && (
                <motion.div 
                  className={styles.sectionContent}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ 
                    height: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] },
                    opacity: { duration: 0.2, ease: 'easeOut' }
                  }}
                  style={{ overflow: 'hidden' }}
                >
                  <motion.div 
                    className={styles.optionsGrid}
                    initial="hidden"
                    animate="visible"
                    variants={{
                      hidden: { opacity: 0 },
                      visible: {
                        opacity: 1,
                        transition: {
                          staggerChildren: 0.05,
                          delayChildren: 0.1
                        }
                      }
                    }}
                  >
                    {groupedOptions.performance.map((option) => (
                      <motion.div
                        key={option.id}
                        variants={{
                          hidden: { opacity: 0, y: 10 },
                          visible: { 
                            opacity: 1, 
                            y: 0,
                            transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }
                          }
                        }}
                      >
                        <OptionCard
                          option={option}
                          isSelected={selectedOptions[option.id] === option.id}
                          onSelect={() => handleOptionSelect(option.id, option.id, (option.price_cents || 0) / 100, 'performance')}
                        />
                      </motion.div>
                    ))}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Other Options Section */}
        {groupedOptions.other.length > 0 && (
          <div className={styles.section}>
            <button
              type="button"
              className={styles.sectionHeader}
              onClick={() => toggleSection('Other')}
            >
              <div className={styles.sectionHeaderContent}>
                <span className={styles.sectionTitle}>Other Options</span>
                {getSelectedOptionName('other') && (
                  <span className={styles.selectedBadge}>
                    {getSelectedOptionName('other')}
                  </span>
                )}
              </div>
              {expandedSection === 'Other' ? (
                <ChevronDown size={20} />
              ) : (
                <ChevronRight size={20} />
              )}
            </button>

            {expandedSection === 'Other' && (
              <div className={styles.sectionContent}>
                <div className={styles.optionsGrid}>
                  {groupedOptions.other.map((option) => (
                    <OptionCard
                      key={option.id}
                      option={option}
                      isSelected={selectedOptions[option.id] === option.id}
                      onSelect={() => handleOptionSelect(option.id, option.id, (option.price_cents || 0) / 100)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <PricingFooter garageItemId={garageItemId} />
    </div>
  );
}
