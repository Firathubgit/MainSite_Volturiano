import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import TimelineItem from './TimelineItem';
import styles from './Timeline.module.css';

/**
 * Timeline component displaying milestones for a garage item
 * 
 * @param {Object} props
 * @param {Array} props.milestones - Array of milestone objects
 * @param {boolean} props.loading - Loading state
 * @param {Error|null} props.error - Error state
 * @param {Function} props.onRetry - Retry handler
 */
export default function Timeline({ milestones = [], loading = false, error = null, onRetry }) {
  const { t } = useTranslation('account');
  const [expandedMilestones, setExpandedMilestones] = useState(new Set());
  
  const handleToggleExpand = (milestoneId) => {
    setExpandedMilestones(prev => {
      const next = new Set(prev);
      if (next.has(milestoneId)) {
        next.delete(milestoneId);
      } else {
        next.add(milestoneId);
      }
      return next;
    });
  };
  
  if (loading) {
    return (
      <div className={styles.timelineContainer}>
        <div className={styles.loading}>
          <div className={styles.loadingSpinner}></div>
          <span>{t('garage.timeline.loading', 'Loading milestones...')}</span>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className={styles.timelineContainer}>
        <div className={styles.error}>
          <p>{t('garage.timeline.error', 'Failed to load milestones')}</p>
          {onRetry && (
            <button
              type="button"
              className={styles.retryButton}
              onClick={onRetry}
            >
              {t('garage.timeline.retry', 'Retry')}
            </button>
          )}
        </div>
      </div>
    );
  }
  
  if (!milestones || milestones.length === 0) {
    return (
      <div className={styles.timelineContainer}>
        <div className={styles.empty}>
          <p>{t('garage.timeline.empty', 'No milestones yet')}</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className={styles.timelineContainer}>
      <div className={styles.timeline}>
        {milestones.map((milestone) => (
          <TimelineItem
            key={milestone.id}
            milestone={milestone}
            isExpanded={expandedMilestones.has(milestone.id)}
            onToggleExpand={() => handleToggleExpand(milestone.id)}
          />
        ))}
      </div>
    </div>
  );
}

