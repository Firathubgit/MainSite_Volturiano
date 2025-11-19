/**
 * Placeholder milestone utilities
 * 
 * Handles logic for placeholder milestones (future delivery dates, etc.)
 * This is a preparation for future Edge Function integration.
 * 
 * @module features/garage/utils/placeholderMilestones
 */

import { MILESTONE_TYPES } from './milestoneTypes';
import { isFutureDate } from './dateFormatting';

/**
 * Check if a milestone is a placeholder (future date)
 * @param {Object} milestone - Milestone object
 * @returns {boolean} True if milestone is a placeholder
 */
export function isPlaceholderMilestone(milestone) {
  if (!milestone || !milestone.occurred_at) return false;
  return isFutureDate(milestone.occurred_at);
}

/**
 * Calculate estimated delivery date for a purchased item
 * This is a placeholder calculation - actual logic will be in Edge Function
 * 
 * @param {Object} item - Garage item object
 * @param {Date} purchaseDate - Date when item was purchased
 * @returns {Date|null} Estimated delivery date or null
 */
export function calculateEstimatedDeliveryDate(item, purchaseDate) {
  if (!item || !purchaseDate) return null;
  
  // Placeholder logic: 3 months from purchase date
  // In production, this would consider:
  // - Vehicle model
  // - Custom options
  // - Production queue
  // - Dealer location
  const estimatedDate = new Date(purchaseDate);
  estimatedDate.setMonth(estimatedDate.getMonth() + 3);
  
  return estimatedDate;
}

/**
 * Check if an item needs a delivery placeholder milestone
 * @param {Object} item - Garage item object
 * @param {Array} milestones - Existing milestones for the item
 * @returns {boolean} True if delivery placeholder should be added
 */
export function needsDeliveryPlaceholder(item, milestones = []) {
  // Only purchased items need delivery placeholders
  if (item.state !== 'purchased') return false;
  
  // Check if delivery milestone already exists
  const hasDeliveryMilestone = milestones.some(
    m => m.milestone_type === MILESTONE_TYPES.DELIVERED
  );
  
  if (hasDeliveryMilestone) return false;
  
  // Check if placeholder delivery milestone exists
  const hasPlaceholderDelivery = milestones.some(
    m => m.milestone_type === MILESTONE_TYPES.DELIVERED && isPlaceholderMilestone(m)
  );
  
  return !hasPlaceholderDelivery;
}

/**
 * Create placeholder delivery milestone data
 * @param {Object} item - Garage item object
 * @param {Date} estimatedDate - Estimated delivery date
 * @returns {Object} Milestone data object
 */
export function createDeliveryPlaceholderData(item, estimatedDate) {
  return {
    milestone_type: MILESTONE_TYPES.DELIVERED,
    note: 'Estimated delivery date (placeholder)',
    occurred_at: estimatedDate.toISOString(),
    metadata: {
      source: 'system',
      placeholder: true,
      estimated: true
    }
  };
}

/**
 * Batch process items to add delivery placeholders
 * This function will be called by Edge Function in the future
 * 
 * @param {Array} items - Array of garage items
 * @param {Function} createMilestoneFn - Function to create milestones
 * @returns {Promise<{created: number, errors: Array}>}
 */
export async function addDeliveryPlaceholders(items, createMilestoneFn) {
  const results = {
    created: 0,
    errors: []
  };
  
  for (const item of items) {
    try {
      // This would fetch milestones in production
      // For now, assume empty array
      const milestones = [];
      
      if (needsDeliveryPlaceholder(item, milestones)) {
        // Find purchase milestone to get purchase date
        const purchaseMilestone = milestones.find(
          m => m.milestone_type === MILESTONE_TYPES.PURCHASED
        );
        
        const purchaseDate = purchaseMilestone
          ? new Date(purchaseMilestone.occurred_at)
          : new Date(item.updated_at || item.created_at);
        
        const estimatedDate = calculateEstimatedDeliveryDate(item, purchaseDate);
        
        if (estimatedDate) {
          const milestoneData = createDeliveryPlaceholderData(item, estimatedDate);
          await createMilestoneFn(item.id, milestoneData);
          results.created++;
        }
      }
    } catch (err) {
      results.errors.push({
        itemId: item.id,
        error: err
      });
    }
  }
  
  return results;
}

