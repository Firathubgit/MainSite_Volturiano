/**
 * Tag migration utility
 * 
 * Migrates legacy goalTags from config.metadata.goalTags to garage_item_tags table.
 * This is a one-time migration that runs when items are loaded.
 */

import { normalizeTag, isValidTag } from './tagConstants';
import { addTag as addTagAPI } from '../../account/api';

/**
 * Migrate legacy tags from config metadata to database
 * Only migrates if tags don't already exist in database
 * 
 * @param {Object} item - Garage item with config_payload
 * @returns {Promise<boolean>} True if migration was performed, false otherwise
 */
export async function migrateLegacyTags(item) {
  if (!item || !item.id) {
    return false;
  }

  // Check if item already has tags in database
  if (item.tags && Array.isArray(item.tags) && item.tags.length > 0) {
    // Already migrated, skip
    return false;
  }

  // Extract tags from config metadata
  let config = item.config_payload;
  if (typeof config === 'string') {
    try {
      config = JSON.parse(config);
    } catch (err) {
      console.warn('[migrateTags] Failed to parse config_payload:', err);
      return false;
    }
  }

  if (!config || !config.metadata || !Array.isArray(config.metadata.goalTags)) {
    // No legacy tags to migrate
    return false;
  }

  const legacyTags = config.metadata.goalTags;
  if (legacyTags.length === 0) {
    return false;
  }

  // Normalize and validate tags
  const tagsToMigrate = legacyTags
    .map(tag => normalizeTag(tag))
    .filter(tag => tag && isValidTag(tag));

  if (tagsToMigrate.length === 0) {
    return false;
  }

  // Migrate tags to database
  let migrated = false;
  for (const tag of tagsToMigrate) {
    try {
      const { error } = await addTagAPI(item.id, tag);
      if (!error) {
        migrated = true;
      } else if (error.code !== '23505') {
        // Ignore duplicate key errors (tag already exists)
        console.warn('[migrateTags] Failed to migrate tag:', tag, error);
      }
    } catch (err) {
      console.warn('[migrateTags] Exception migrating tag:', tag, err);
    }
  }

  return migrated;
}

/**
 * Check if item needs tag migration
 * @param {Object} item - Garage item
 * @returns {boolean} True if migration is needed
 */
export function needsTagMigration(item) {
  if (!item || !item.id) {
    return false;
  }

  // Already has tags in database
  if (item.tags && Array.isArray(item.tags) && item.tags.length > 0) {
    return false;
  }

  // Check for legacy tags in config
  let config = item.config_payload;
  if (typeof config === 'string') {
    try {
      config = JSON.parse(config);
    } catch (err) {
      return false;
    }
  }

  return config?.metadata?.goalTags && Array.isArray(config.metadata.goalTags) && config.metadata.goalTags.length > 0;
}

