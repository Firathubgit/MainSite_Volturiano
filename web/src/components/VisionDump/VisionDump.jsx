import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, X, ChevronDown, ChevronRight, Code2, Car, UtensilsCrossed, Presentation, Search, BarChart3, Eye, Megaphone, Layers, Shield } from 'lucide-react';

const VISION_DATA = {
  agencyOverview: {
    title: "Volturiano Agency",
    description: "Allmänn agency som specialiserar sig inom Bilindustrin och Hotell & Restaurang.",
    specializations: [
      {
        name: "Bilindustrin",
        icon: Car,
        description: "Specialized solutions for the automotive industry"
      },
      {
        name: "Hotell och Restaurang",
        icon: UtensilsCrossed,
        description: "Specialized solutions for hotels and restaurants"
      }
    ],
    team: "UI/UX professionals",
    generalDescription: "What we do - comprehensive digital solutions for premium brands"
  },
  solutions: {
    carIndustry: {
      title: "Bilindustrin Lösningar",
      items: [
        "Car Dealership Package med Inventory System",
        "Full-fledged Car Ecosystem",
        "Car Configurators",
        "Wrapshops",
        "Simple Mechanic Websites",
        "E-commerce (ready-made, specifically for car industry)"
      ]
    },
    hotelRestaurant: {
      title: "Hotell & Restaurang Lösningar",
      items: [
        "Menu fixes/management systems",
        "Booking Systems",
        "Contact systems",
        "Mobile-first design emphasis"
      ]
    }
  },
  additionalServices: [
    { name: "Investor Presentations", description: "For mega clients", icon: Presentation },
    { name: "Google Search Optimization", icon: Search },
    { name: "Media Analysis & Help", icon: BarChart3 },
    { name: "Online Visibility", icon: Eye },
    { name: "PR Media", icon: Megaphone }
  ],
  volturianoSystems: {
    title: "VolturianoSystems",
    description: "Group name for incredibly well-set-up underlying engines/architecture",
    features: [
      "Car Dealership Solutions with Inventory System",
      "Reliable, proven, well-architected backend systems",
      "Standard Hotel & Restaurant Systems",
      "Creates illusion of super polished, high-quality customized fork",
      "Admin Dashboards",
      "Role-based Systems",
      "All that good stuff"
    ]
  },
  pageStructure: {
    mainPage: {
      title: "Main Agency Page Structure",
      sections: [
        "General agency overview",
        "UI/UX professionals section",
        "What we do content"
      ]
    },
    subSections: {
      losningar: {
        title: "Lösningar (Solutions)",
        description: "Button/accordion that expands to show more options",
        type: "accordion"
      },
      brancher: {
        title: "Brancher (Branches)",
        description: "Slide-out/dropdown showing all alternatives",
        type: "slideout"
      },
      contact: {
        title: "Kontakta oss",
        description: "Contact section"
      }
    }
  }
};

export default function VisionDump() {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState(new Set());

  // Debug: Log when component renders
  useEffect(() => {
    console.log('VisionDump component mounted');
  }, []);

  // Load persisted state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('visionDumpOpen');
    if (saved === 'true') {
      setIsOpen(true);
    }
  }, []);

  // Persist state to localStorage
  useEffect(() => {
    localStorage.setItem('visionDumpOpen', isOpen.toString());
  }, [isOpen]);

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <>
      {/* Floating Toggle Button */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        style={{ 
          position: 'fixed',
          bottom: '32px',
          right: '32px',
          zIndex: 99998, // Below cursor but above most content
          width: '64px',
          height: '64px',
          pointerEvents: 'auto'
        }}
      >
        <button
          onClick={() => {
            console.log('VisionDump button clicked, isOpen:', isOpen);
            setIsOpen(!isOpen);
          }}
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            background: isOpen 
              ? 'linear-gradient(135deg, #ff4520 0%, #ff6b4a 100%)' 
              : 'linear-gradient(135deg, rgba(15, 15, 15, 0.95) 0%, rgba(25, 25, 25, 0.95) 100%)',
            border: isOpen ? '2px solid #ff4520' : '2px solid rgba(255, 255, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: isOpen 
              ? '0 8px 32px rgba(255, 69, 32, 0.4), 0 0 0 4px rgba(255, 69, 32, 0.1)' 
              : '0 8px 24px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            backdropFilter: 'blur(12px)',
            position: 'relative',
            overflow: 'visible'
          }}
          onMouseEnter={(e) => {
            if (!isOpen) {
              e.target.style.background = 'linear-gradient(135deg, rgba(255, 69, 32, 0.2) 0%, rgba(255, 69, 32, 0.1) 100%)';
              e.target.style.borderColor = 'rgba(255, 69, 32, 0.5)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isOpen) {
              e.target.style.background = 'linear-gradient(135deg, rgba(15, 15, 15, 0.95) 0%, rgba(25, 25, 25, 0.95) 100%)';
              e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            }
          }}
          aria-label="Toggle Vision Dump"
          aria-expanded={isOpen}
        >
          <BookOpen 
            size={22} 
            style={{ 
              color: isOpen ? 'white' : 'rgba(255, 255, 255, 0.8)',
              transition: 'color 0.3s'
            }}
          />
          <span style={{
            position: 'absolute',
            top: '-6px',
            right: '-6px',
            fontSize: '9px',
            fontWeight: '700',
            color: isOpen ? '#ff4520' : 'rgba(255, 69, 32, 0.9)',
            background: 'white',
            border: '1.5px solid',
            borderColor: isOpen ? '#ff4520' : 'rgba(255, 69, 32, 0.3)',
            padding: '3px 7px',
            borderRadius: '6px',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
            transition: 'all 0.3s'
          }}>
            DEV
          </span>
        </button>
      </motion.div>

      {/* Expandable Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.4)',
                backdropFilter: 'blur(4px)',
                zIndex: 99997 // Below cursor (99999) and button (99998)
              }}
              aria-hidden="true"
            />
            
            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, x: 100, y: 100, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, y: 100, scale: 0.9 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              style={{
                position: 'fixed',
                bottom: '32px',
                right: '32px',
                zIndex: 99998, // Below cursor but above backdrop
                width: '100%',
                maxWidth: '520px', // Reduced from 672px
                maxHeight: '75vh', // Reduced from 85vh
                background: 'rgba(15, 15, 15, 0.98)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '20px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 69, 32, 0.1)',
                backdropFilter: 'blur(20px)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
              }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="vision-dump-title"
            >
              {/* Header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '20px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'rgba(10, 10, 10, 0.5)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background: 'rgba(255, 69, 32, 0.15)',
                    border: '1px solid rgba(255, 69, 32, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Code2 size={18} style={{ color: '#ff4520' }} />
                  </div>
                  <div>
                    <h2 id="vision-dump-title" style={{
                      fontSize: '18px',
                      fontWeight: 'bold',
                      color: 'white',
                      letterSpacing: '-0.02em',
                      margin: 0,
                      lineHeight: '1.2'
                    }}>
                      Vision Dump
                    </h2>
                    <p style={{
                      fontSize: '10px',
                      color: 'rgba(255, 255, 255, 0.5)',
                      fontFamily: 'monospace',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      margin: 0,
                      marginTop: '2px'
                    }}>
                      Internal Dev Reference
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  style={{
                    color: 'rgba(255, 255, 255, 0.5)',
                    background: 'transparent',
                    border: 'none',
                    padding: '8px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.color = 'white';
                    e.target.style.background = 'rgba(255, 255, 255, 0.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.color = 'rgba(255, 255, 255, 0.5)';
                    e.target.style.background = 'transparent';
                  }}
                  aria-label="Close Vision Dump"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Scrollable Content */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '24px'
              }}>
                {/* Agency Overview */}
                <section>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <Layers size={16} style={{ color: '#ff4520' }} />
                    <h3 style={{
                      fontSize: '16px',
                      fontWeight: 'bold',
                      color: 'white',
                      margin: 0
                    }}>Agency Overview</h3>
                  </div>
                  <div style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <p style={{
                      color: 'rgba(255, 255, 255, 0.7)',
                      fontSize: '14px',
                      lineHeight: '1.6',
                      margin: 0
                    }}>
                      {VISION_DATA.agencyOverview.description}
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {VISION_DATA.agencyOverview.specializations.map((spec, idx) => {
                        const SpecIcon = spec.icon;
                        return (
                          <div key={idx} style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '12px',
                            padding: '12px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            borderRadius: '8px',
                            border: '1px solid rgba(255, 255, 255, 0.05)'
                          }}>
                            <SpecIcon size={18} style={{ color: '#ff4520', marginTop: '2px' }} />
                            <div>
                              <div style={{
                                fontWeight: 500,
                                color: 'white',
                                fontSize: '14px'
                              }}>{spec.name}</div>
                              <div style={{
                                color: 'rgba(255, 255, 255, 0.5)',
                                fontSize: '12px',
                                marginTop: '4px'
                              }}>{spec.description}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ paddingTop: '8px' }}>
                      <p style={{
                        color: 'rgba(255, 255, 255, 0.7)',
                        fontSize: '14px',
                        margin: 0
                      }}>
                        <span style={{ color: 'white', fontWeight: 500 }}>Team:</span> {VISION_DATA.agencyOverview.team}
                      </p>
                      <p style={{
                        color: 'rgba(255, 255, 255, 0.7)',
                        fontSize: '14px',
                        marginTop: '8px',
                        marginBottom: 0
                      }}>
                        {VISION_DATA.agencyOverview.generalDescription}
                      </p>
                    </div>
                  </div>
                </section>

                {/* Solutions */}
                <section>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <ChevronDown size={16} style={{ color: '#ff4520' }} />
                    <h3 style={{
                      fontSize: '16px',
                      fontWeight: 'bold',
                      color: 'white',
                      margin: 0
                    }}>Solutions (Lösningar)</h3>
                  </div>
                  <div style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {/* Car Industry Solutions */}
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      padding: '16px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <Car size={16} style={{ color: '#ff4520' }} />
                        <h4 style={{
                          fontWeight: 600,
                          color: 'white',
                          fontSize: '14px',
                          margin: 0
                        }}>
                          {VISION_DATA.solutions.carIndustry.title}
                        </h4>
                      </div>
                      <ul style={{
                        listStyle: 'none',
                        padding: 0,
                        margin: 0,
                        marginLeft: '24px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}>
                        {VISION_DATA.solutions.carIndustry.items.map((item, idx) => (
                          <li key={idx} style={{
                            color: 'rgba(255, 255, 255, 0.7)',
                            fontSize: '14px',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '8px'
                          }}>
                            <span style={{ color: '#ff4520', marginTop: '4px' }}>•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Hotel & Restaurant Solutions */}
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      padding: '16px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <UtensilsCrossed size={16} style={{ color: '#ff4520' }} />
                        <h4 style={{
                          fontWeight: 600,
                          color: 'white',
                          fontSize: '14px',
                          margin: 0
                        }}>
                          {VISION_DATA.solutions.hotelRestaurant.title}
                        </h4>
                      </div>
                      <ul style={{
                        listStyle: 'none',
                        padding: 0,
                        margin: 0,
                        marginLeft: '24px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}>
                        {VISION_DATA.solutions.hotelRestaurant.items.map((item, idx) => (
                          <li key={idx} style={{
                            color: 'rgba(255, 255, 255, 0.7)',
                            fontSize: '14px',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '8px'
                          }}>
                            <span style={{ color: '#ff4520', marginTop: '4px' }}>•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </section>

                {/* Additional Services */}
                <section>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <Megaphone size={16} style={{ color: '#ff4520' }} />
                    <h3 style={{
                      fontSize: '16px',
                      fontWeight: 'bold',
                      color: 'white',
                      margin: 0
                    }}>Additional Services</h3>
                  </div>
                  <div style={{
                    paddingLeft: '20px',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '10px'
                  }}>
                    {VISION_DATA.additionalServices.map((service, idx) => {
                      const ServiceIcon = service.icon;
                      return (
                        <div key={idx} style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '12px',
                          padding: '12px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          borderRadius: '8px',
                          border: '1px solid rgba(255, 255, 255, 0.05)'
                        }}>
                          <ServiceIcon size={16} style={{ color: '#ff4520', marginTop: '2px', flexShrink: 0 }} />
                          <div>
                            <div style={{
                              fontWeight: 500,
                              color: 'white',
                              fontSize: '14px'
                            }}>{service.name}</div>
                            {service.description && (
                              <div style={{
                                color: 'rgba(255, 255, 255, 0.5)',
                                fontSize: '12px',
                                marginTop: '4px'
                              }}>{service.description}</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                {/* VolturianoSystems */}
                <section>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <Shield size={16} style={{ color: '#ff4520' }} />
                    <h3 style={{
                      fontSize: '16px',
                      fontWeight: 'bold',
                      color: 'white',
                      margin: 0
                    }}>{VISION_DATA.volturianoSystems.title}</h3>
                  </div>
                  <div style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <p style={{
                      color: 'rgba(255, 255, 255, 0.7)',
                      fontSize: '14px',
                      lineHeight: '1.6',
                      margin: 0
                    }}>
                      {VISION_DATA.volturianoSystems.description}
                    </p>
                    <ul style={{
                      listStyle: 'none',
                      padding: 0,
                      margin: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}>
                      {VISION_DATA.volturianoSystems.features.map((feature, idx) => (
                        <li key={idx} style={{
                          color: 'rgba(255, 255, 255, 0.7)',
                          fontSize: '14px',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '8px'
                        }}>
                          <span style={{ color: '#ff4520', marginTop: '4px' }}>•</span>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </section>

                {/* Page Structure */}
                <section>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <Layers size={16} style={{ color: '#ff4520' }} />
                    <h3 style={{
                      fontSize: '16px',
                      fontWeight: 'bold',
                      color: 'white',
                      margin: 0
                    }}>Main Agency Page Structure</h3>
                  </div>
                  <div style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <h4 style={{
                        fontWeight: 600,
                        color: 'white',
                        fontSize: '14px',
                        marginBottom: '8px',
                        marginTop: 0
                      }}>Main Page Sections:</h4>
                      <ul style={{
                        listStyle: 'none',
                        padding: 0,
                        margin: 0,
                        marginLeft: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px'
                      }}>
                        {VISION_DATA.pageStructure.mainPage.sections.map((section, idx) => (
                          <li key={idx} style={{
                            color: 'rgba(255, 255, 255, 0.7)',
                            fontSize: '14px',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '8px'
                          }}>
                            <span style={{ color: '#ff4520', marginTop: '4px' }}>•</span>
                            <span>{section}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 style={{
                        fontWeight: 600,
                        color: 'white',
                        fontSize: '14px',
                        marginBottom: '8px',
                        marginTop: 0
                      }}>Sub-sections:</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginLeft: '16px' }}>
                        <div style={{
                          padding: '12px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          borderRadius: '8px',
                          border: '1px solid rgba(255, 255, 255, 0.05)'
                        }}>
                          <div style={{
                            fontWeight: 500,
                            color: 'white',
                            fontSize: '14px',
                            marginBottom: '4px'
                          }}>
                            {VISION_DATA.pageStructure.subSections.losningar.title}
                          </div>
                          <div style={{
                            color: 'rgba(255, 255, 255, 0.5)',
                            fontSize: '12px'
                          }}>
                            {VISION_DATA.pageStructure.subSections.losningar.description} ({VISION_DATA.pageStructure.subSections.losningar.type})
                          </div>
                        </div>
                        <div style={{
                          padding: '12px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          borderRadius: '8px',
                          border: '1px solid rgba(255, 255, 255, 0.05)'
                        }}>
                          <div style={{
                            fontWeight: 500,
                            color: 'white',
                            fontSize: '14px',
                            marginBottom: '4px'
                          }}>
                            {VISION_DATA.pageStructure.subSections.brancher.title}
                          </div>
                          <div style={{
                            color: 'rgba(255, 255, 255, 0.5)',
                            fontSize: '12px'
                          }}>
                            {VISION_DATA.pageStructure.subSections.brancher.description} ({VISION_DATA.pageStructure.subSections.brancher.type})
                          </div>
                        </div>
                        <div style={{
                          padding: '12px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          borderRadius: '8px',
                          border: '1px solid rgba(255, 255, 255, 0.05)'
                        }}>
                          <div style={{
                            fontWeight: 500,
                            color: 'white',
                            fontSize: '14px',
                            marginBottom: '4px'
                          }}>
                            {VISION_DATA.pageStructure.subSections.contact.title}
                          </div>
                          <div style={{
                            color: 'rgba(255, 255, 255, 0.5)',
                            fontSize: '12px'
                          }}>
                            {VISION_DATA.pageStructure.subSections.contact.description}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              </div>

              {/* Footer */}
              <div style={{
                padding: '12px 20px',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'rgba(10, 10, 10, 0.5)'
              }}>
                <p style={{
                  fontSize: '11px',
                  color: 'rgba(255, 255, 255, 0.5)',
                  textAlign: 'center',
                  fontFamily: 'monospace',
                  margin: 0
                }}>
                  Press ESC to close • Internal dev tool
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

