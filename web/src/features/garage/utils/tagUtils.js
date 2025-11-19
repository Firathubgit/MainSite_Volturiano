/**
 * Tag utility functions for garage items
 * 
 * Provides utilities for normalizing, merging, counting, and filtering tags.
 */

import { normalizeTag, PREDEFINED_TAGS } from './tagConstants';

/**
 * Normalize an array of tags
 * Removes duplicates and invalid tags
 * 
 * @param {string[]} tags - Array of tag strings
 * @returns {string[]} Normalized array of unique tags
 */
export function normalizeTags(tags) {
  if (!Array.isArray(tags)) {
    return [];
  }
  
  const normalized = tags
    .map(tag => normalizeTag(tag))
    .filter(tag => tag.length > 0);
  
  // Remove duplicates
  return [...new Set(normalized)];
}

/**
 * Merge two tag arrays
 * Combines tags, removes duplicates, and normalizes
 * 
 * @param {string[]} oldTags - Existing tags
 * @param {string[]} newTags - New tags to merge
 * @returns {string[]} Merged and normalized tags
 */
export function mergeTags(oldTags = [], newTags = []) {
  const allTags = [...oldTags, ...newTags];
  return normalizeTags(allTags);
}

/**
 * Calculate tag usage counts from items
 * Returns a map of tag -> count for filtering UI
 * 
 * @param {Array} items - Array of garage items
 * @returns {Map<string, number>} Map of tag to count
 */
export function calculateTagCounts(items) {
  const counts = new Map();
  
  if (!Array.isArray(items)) {
    return counts;
  }
  
  items.forEach(item => {
    const tags = item.tags || [];
    tags.forEach(tag => {
      const normalized = normalizeTag(tag);
      if (normalized) {
        counts.set(normalized, (counts.get(normalized) || 0) + 1);
      }
    });
  });
  
  return counts;
}

/**
 * Filter items by tags
 * Supports both AND and OR logic
 * 
 * @param {Array} items - Array of garage items to filter
 * @param {string[]} selectedTags - Tags to filter by
 * @param {string} mode - 'AND' | 'OR' (default: 'OR')
 * @returns {Array} Filtered items
 */
export function filterItemsByTags(items, selectedTags = [], mode = 'OR') {
  if (!Array.isArray(items) || !Array.isArray(selectedTags) || selectedTags.length === 0) {
    return items;
  }
  
  const normalizedSelected = normalizeTags(selectedTags);
  
  if (normalizedSelected.length === 0) {
    return items;
  }
  
  return items.filter(item => {
    const itemTags = normalizeTags(item.tags || []);
    
    if (mode === 'AND') {
      // Item must have ALL selected tags
      return normalizedSelected.every(tag => itemTags.includes(tag));
    } else {
      // Item must have AT LEAST ONE selected tag (OR)
      return normalizedSelected.some(tag => itemTags.includes(tag));
    }
  });
}

/**
 * Get unique tags from items
 * Returns all unique tags found in the items array
 * 
 * @param {Array} items - Array of garage items
 * @returns {string[]} Array of unique normalized tags
 */
export function getUniqueTags(items) {
  if (!Array.isArray(items)) {
    return [];
  }
  
  const tagSet = new Set();
  
  items.forEach(item => {
    const tags = item.tags || [];
    tags.forEach(tag => {
      const normalized = normalizeTag(tag);
      if (normalized) {
        tagSet.add(normalized);
      }
    });
  });
  
  return Array.from(tagSet).sort();
}

/**
 * Compare two tag arrays
 * Returns true if arrays contain the same tags (order-independent)
 * 
 * @param {string[]} tags1 - First tag array
 * @param {string[]} tags2 - Second tag array
 * @returns {boolean} True if arrays contain same tags
 */
export function tagsEqual(tags1, tags2) {
  const normalized1 = normalizeTags(tags1 || []);
  const normalized2 = normalizeTags(tags2 || []);
  
  if (normalized1.length !== normalized2.length) {
    return false;
  }
  
  const set1 = new Set(normalized1);
  const set2 = new Set(normalized2);
  
  return normalized1.every(tag => set2.has(tag)) &&
         normalized2.every(tag => set1.has(tag));
}

/**
 * Get tags to add and remove when updating
 * Compares old and new tag arrays
 * 
 * @param {string[]} oldTags - Current tags
 * @param {string[]} newTags - Desired tags
 * @returns {Object} { toAdd: string[], toRemove: string[] }
 */
export function getTagDiff(oldTags = [], newTags = []) {
  const normalizedOld = normalizeTags(oldTags);
  const normalizedNew = normalizeTags(newTags);
  
  const oldSet = new Set(normalizedOld);
  const newSet = new Set(normalizedNew);
  
  const toAdd = normalizedNew.filter(tag => !oldSet.has(tag));
  const toRemove = normalizedOld.filter(tag => !newSet.has(tag));
  
  return { toAdd, toRemove };
}

