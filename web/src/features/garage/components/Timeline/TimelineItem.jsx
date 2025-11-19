import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import MilestoneIcon from './MilestoneIcon';
import { formatMilestoneDate, isFutureDate } from '../../utils/dateFormatting';
import { mapLegacyMilestoneType, getMilestoneLabelKey } from '../../utils/milestoneTypes';
import styles from './Timeline.module.css';

/**
 * Individual milestone item component
 * 
 * @param {Object} props
 * @param {Object} props.milestone - Milestone object
 * @param {boolean} props.isExpanded - Whether details are expanded
 * @param {Function} props.onToggleExpand - Toggle expand handler
 */
export default function TimelineItem({ milestone, isExpanded, onToggleExpand }) {
  const { t } = useTranslation('account');
  const [isHovered, setIsHovered] = useState(false);
  
  if (!milestone) return null;
  
  const milestoneType = mapLegacyMilestoneType(milestone.milestone_type);
  const isFuture = isFutureDate(milestone.occurred_at);
  const hasDetails = milestone.metadata && Object.keys(milestone.metadata).length > 0;
  const hasNote = milestone.note && milestone.note.trim().length > 0;
  const canExpand = hasDetails || (milestone.from_state && milestone.to_state);
  
  const handleClick = () => {
    if (canExpand) {
      onToggleExpand();
    }
  };
  
  return (
    <div 
      className={`${styles.timelineItem} ${isFuture ? styles.future : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={styles.timelineMarker}>
        <MilestoneIcon type={milestoneType} isFuture={isFuture} />
      </div>
      
      <div 
        className={`${styles.timelineContent} ${canExpand ? styles.expandable : ''} ${isExpanded ? styles.expanded : ''}`}
        onClick={handleClick}
        role={canExpand ? 'button' : undefined}
        tabIndex={canExpand ? 0 : undefined}
        onKeyDown={(e) => {
          if (canExpand && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onToggleExpand();
          }
        }}
        aria-expanded={canExpand ? isExpanded : undefined}
      >
        <div className={styles.milestoneHeader}>
          <div className={styles.milestoneInfo}>
            <div className={styles.milestoneTypeRow}>
              <span className={styles.milestoneType}>
                {t(getMilestoneLabelKey(milestoneType), milestoneType)}
              </span>
              {isFuture && (
                <span className={styles.futureBadge} title={t('garage.timeline.futureMilestone', 'Future milestone')}>
                  {t('garage.timeline.future', 'Future')}
                </span>
              )}
            </div>
            <span className={styles.milestoneDate}>
              {formatMilestoneDate(milestone.occurred_at, 'full')}
            </span>
          </div>
          {canExpand && (
            <button
              type="button"
              className={styles.expandButton}
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand();
              }}
              aria-label={isExpanded ? t('garage.timeline.details.collapse', 'Hide Details') : t('garage.timeline.details.expand', 'Show Details')}
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          )}
        </div>
        
        {hasNote && (
          <div className={styles.milestoneNote}>
            {milestone.note}
          </div>
        )}
        
        {isExpanded && canExpand && (
          <div className={styles.milestoneDetails}>
            {(milestone.from_state || milestone.to_state) && (
              <div className={styles.stateTransition}>
                <span className={styles.stateLabel}>
                  {t('garage.timeline.stateChange', 'State Change')}:
                </span>
                {milestone.from_state ? (
                  <span className={styles.stateChange}>
                    {milestone.from_state} → {milestone.to_state || milestone.from_state}
                  </span>
                ) : (
                  <span className={styles.stateChange}>
                    {milestone.to_state}
                  </span>
                )}
              </div>
            )}
            
            {hasDetails && (
              <div className={styles.metadata}>
                <span className={styles.metadataLabel}>
                  {t('garage.timeline.details.metadata', 'Additional Information')}:
                </span>
                <pre className={styles.metadataContent}>
                  {JSON.stringify(milestone.metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

