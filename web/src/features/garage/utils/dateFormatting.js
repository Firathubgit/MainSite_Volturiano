/**
 * Date formatting utilities for garage features
 * 
 * Centralized date formatting with i18n support and relative date formatting
 * 
 * @module features/garage/utils/dateFormatting
 */

/**
 * Format a date for milestone display
 * @param {string|Date} dateValue - Date to format
 * @param {string} format - Format type: 'full', 'short', 'relative'
 * @param {string} locale - Locale code (default: 'sv-SE')
 * @returns {string} Formatted date string
 */
export function formatMilestoneDate(dateValue, format = 'full', locale = 'sv-SE') {
  if (!dateValue) return '';
  
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '';
  
  const now = new Date();
  const isFuture = date > now;
  
  switch (format) {
    case 'relative':
      return formatRelativeDate(date, locale);
    case 'short':
      return date.toLocaleDateString(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    case 'full':
    default:
      return date.toLocaleDateString(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
  }
}

/**
 * Format a date as relative time (e.g., "2 days ago", "in 3 months")
 * @param {string|Date} dateValue - Date to format
 * @param {string} locale - Locale code (default: 'sv-SE')
 * @returns {string} Relative date string
 */
export function formatRelativeDate(dateValue, locale = 'sv-SE') {
  if (!dateValue) return '';
  
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '';
  
  const now = new Date();
  const diffMs = date - now;
  const diffDays = Math.floor(Math.abs(diffMs) / (1000 * 60 * 60 * 24));
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);
  
  const isFuture = diffMs > 0;
  
  // Use Swedish/English patterns based on locale
  if (locale.startsWith('sv')) {
    if (diffDays === 0) {
      return isFuture ? 'Idag' : 'Idag';
    } else if (diffDays === 1) {
      return isFuture ? 'Imorgon' : 'Igår';
    } else if (diffDays < 7) {
      return isFuture ? `Om ${diffDays} dagar` : `För ${diffDays} dagar sedan`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return isFuture ? `Om ${weeks} veckor` : `För ${weeks} veckor sedan`;
    } else if (diffMonths < 12) {
      return isFuture ? `Om ${diffMonths} månader` : `För ${diffMonths} månader sedan`;
    } else {
      return isFuture ? `Om ${diffYears} år` : `För ${diffYears} år sedan`;
    }
  } else {
    // English
    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return isFuture ? 'Tomorrow' : 'Yesterday';
    } else if (diffDays < 7) {
      return isFuture ? `In ${diffDays} days` : `${diffDays} days ago`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return isFuture ? `In ${weeks} weeks` : `${weeks} weeks ago`;
    } else if (diffMonths < 12) {
      return isFuture ? `In ${diffMonths} months` : `${diffMonths} months ago`;
    } else {
      return isFuture ? `In ${diffYears} years` : `${diffYears} years ago`;
    }
  }
}

/**
 * Check if a date is in the future
 * @param {string|Date} dateValue - Date to check
 * @returns {boolean} True if date is in the future
 */
export function isFutureDate(dateValue) {
  if (!dateValue) return false;
  
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return false;
  
  return date > new Date();
}

/**
 * Format date for version history display (backward compatibility)
 * @param {string|Date} dateValue - Date to format
 * @returns {string} Formatted date string
 */
export function formatDate(dateValue) {
  return formatMilestoneDate(dateValue, 'full', 'sv-SE');
}

