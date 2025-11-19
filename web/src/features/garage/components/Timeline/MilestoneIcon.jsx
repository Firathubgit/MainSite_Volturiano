import React from 'react';
import { MILESTONE_TYPES, mapLegacyMilestoneType } from '../../utils/milestoneTypes';
import styles from './MilestoneIcon.module.css';

/**
 * Milestone icon component
 * Displays appropriate icon for each milestone type
 * 
 * @param {Object} props
 * @param {string} props.type - Milestone type
 * @param {boolean} props.isFuture - Whether this is a future/placeholder milestone
 * @param {string} props.className - Additional CSS classes
 */
export default function MilestoneIcon({ type, isFuture = false, className = '' }) {
  const normalizedType = mapLegacyMilestoneType(type);
  const iconClass = `${styles.icon} ${styles[normalizedType]} ${isFuture ? styles.future : ''} ${className}`.trim();
  
  const getIcon = () => {
    switch (normalizedType) {
      case MILESTONE_TYPES.CREATED:
        return (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" fill="none" />
            <path d="M8 4V8M8 8V12M8 8H12M8 8H4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        );
      case MILESTONE_TYPES.UPDATED:
        return (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M11.5 2.5L13.5 4.5L8 10L4.5 6.5L6.5 4.5L8 6L11.5 2.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <path d="M2 8C2 10.7614 4.23858 13 7 13H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        );
      case MILESTONE_TYPES.PURCHASED:
        return (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M3 4L5 2H11L13 4M3 4V12C3 13.1046 3.89543 14 5 14H11C12.1046 14 13 13.1046 13 12V4M3 4H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <path d="M6 7L7 8L10 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        );
      case MILESTONE_TYPES.DELIVERED:
        return (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M2 6L8 2L14 6V12C14 13.1046 13.1046 14 12 14H4C2.89543 14 2 13.1046 2 12V6Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <path d="M6 8L7 9L10 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        );
      case MILESTONE_TYPES.CUSTOM:
      default:
        return (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M8 2C4.68629 2 2 4.68629 2 8C2 11.3137 4.68629 14 8 14C11.3137 14 14 11.3137 14 8C14 4.68629 11.3137 2 8 2Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
            <path d="M8 6V8M8 10H8.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        );
    }
  };
  
  return (
    <span className={iconClass} aria-label={`Milestone type: ${normalizedType}`}>
      {getIcon()}
    </span>
  );
}

