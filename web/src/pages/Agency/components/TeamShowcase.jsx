import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Plus, Share2 } from 'lucide-react';
import silhouetteImage from '../../../assets/ImageSiluatePerson.png';
import styles from './TeamShowcase.module.css';

export function TeamShowcase() {
  const { t } = useTranslation('agency');
  const teamMembersData = t('team.members', { returnObjects: true });
  const [activeId, setActiveId] = useState(null); // No default active state
  
  // Enrich team members with additional data
  const teamMembers = teamMembersData.map((member, index) => {
    const codes = ['SYS_ADMIN', 'PX_WITCH', '10X_Dev_mf', 'MIND_MAP', 'FPS_LORD'];
    const bios = [
      'Constructing digital realities from the void up. Obsessed with the space between pixels.',
      'Turning abstract concepts into retinal candy. Reality is just a suggestion.',
      'Speaking the languages machines dream in. Optimizing the fabric of the web.',
      'Mapping the user psyche. Predicting trends before they manifest in this dimension.',
      'Breathing life into static voids. Physics is optional.'
    ];
    const statsOptions = [
      [{ label: 'Vision', value: 98 }, { label: 'Chaos', value: 45 }],
      [{ label: 'Aesthetics', value: 100 }, { label: 'Reality', value: 12 }],
      [{ label: 'Logic', value: 99 }, { label: 'Bugs', value: 0 }],
      [{ label: 'Insight', value: 95 }, { label: 'Empathy', value: 90 }],
      [{ label: 'Timing', value: 97 }, { label: 'Smoothness', value: 100 }]
    ];
    
    return {
      ...member,
      id: String(index + 1).padStart(2, '0'),
      code: codes[index] || 'UNKNOWN',
      bio: bios[index] || 'Crafting digital excellence.',
      image: silhouetteImage,
      stats: statsOptions[index] || [{ label: 'Skill', value: 85 }, { label: 'Experience', value: 90 }]
    };
  });

  return (
    <section id="team" className={styles.section}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.label}>{t('team.label')}</h2>
          <h3 className={styles.title}>Operatives</h3>
        </div>
        <div className={styles.statusContainer}>
          <p className={styles.status}>
            STATUS: <span className={styles.statusOnline}>ONLINE</span>
          </p>
          <p className={styles.location}>
            Loc: Sector 7G
          </p>
        </div>
      </div>

      <div className={styles.teamContainer}>
        {teamMembers.map((member) => (
          <motion.div
            key={member.id}
            onHoverStart={() => setActiveId(member.id)}
            onHoverEnd={() => setActiveId(null)}
            className={`${styles.memberCard} ${activeId && activeId !== member.id ? styles.inactive : ''}`}
            animate={{
              flex: activeId === member.id ? 3 : 1
            }}
            transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
          >
            {/* Background Image */}
            <div className={styles.backgroundImage}>
              <img 
                src={member.image} 
                alt={member.name}
                className={styles.bgImageElement}
              />
            </div>

            {/* Red Overlay Gradient */}
            <div className={styles.redOverlay} />

            {/* Content Container */}
            <div className={styles.contentContainer}>
              {/* Header (ID & Code) */}
              <div className={styles.headerInfo}>
                <span>{member.id}</span>
                <span className={styles.code}>[{member.code}]</span>
              </div>

              {/* Main Content Info */}
              <div className={styles.mainContent}>
                {/* Collapsed Vertical Name (Desktop Only) */}
                <div className={styles.verticalName}>
                  <h3 className={styles.verticalNameText}>
                    {member.name}
                  </h3>
                </div>

                {/* Expanded Content */}
                <motion.div 
                  initial={false}
                  animate={{ 
                    y: activeId === member.id ? 0 : 20,
                    opacity: activeId === member.id ? 1 : 0
                  }}
                  className={styles.expandedContent}
                >
                  <h3 className={styles.expandedName}>
                    {member.name}
                  </h3>
                  <p className={styles.expandedRole}>
                    {member.role}
                  </p>
                  <p className={styles.expandedBio}>
                    {member.bio}
                  </p>

                  {/* Stats */}
                  <div className={styles.stats}>
                    {member.stats.map(stat => (
                      <div key={stat.label} className={styles.statItem}>
                        <div className={styles.statHeader}>
                          <span>{stat.label}</span>
                          <span>{stat.value}%</span>
                        </div>
                        <div className={styles.statBar}>
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: activeId === member.id ? `${stat.value}%` : 0 }}
                            transition={{ duration: 1, delay: 0.2 }}
                            className={styles.statBarFill}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>

                {/* Mobile Only View */}
                <div className={styles.mobileView}>
                  <h3 className={styles.mobileName}>
                    {member.name}
                  </h3>
                  <p className={styles.mobileRole}>
                    {member.role}
                  </p>
                </div>
              </div>

              {/* Bottom Icons */}
              <div className={styles.bottomIcons}>
                <Plus className={styles.plusIcon} />
                <button className={styles.shareButton}>
                  <Share2 className={styles.shareIcon} />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

