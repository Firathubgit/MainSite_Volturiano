/**
 * Configuration migration utilities
 * 
 * Handles migration of legacy configurations to new schema versions
 * and infers configurator types for older configs that don't have type information.
 * 
 * @module features/garage/utils/migrateConfigs
 */

import { detectConfiguratorType, normalizeConfiguratorMetadata } from './configuratorType';

/**
 * Migrate legacy configuration (no configurator type) to new format
 * Infers configurator type from existing data and adds configurator metadata
 * 
 * @param {Object} config - Legacy configuration payload
 * @returns {Object} Migrated configuration payload
 */
export function migrateLegacyConfig(config) {
  if (!config || typeof config !== 'object') {
    return config;
  }

  // Check if already migrated (has configurator type)
  const existingType = config.metadata?.configurator?.type || 
                      config.history?.configuratorType;
  
  if (existingType && ['2d', '3d', 'hybrid'].includes(existingType)) {
    // Already migrated, just normalize
    return normalizeConfiguratorMetadata(config);
  }

  // Clone config to avoid mutations
  const migrated = JSON.parse(JSON.stringify(config));

  // Detect configurator type from existing data
  const detectedType = detectConfiguratorType(migrated);

  // Normalize configurator metadata
  return normalizeConfiguratorMetadata(migrated, { detectedType });
}

/**
 * Migrate configuration schema version
 * Handles migrations between different schema versions
 * 
 * @param {Object} config - Configuration payload
 * @param {number} fromVersion - Source schema version
 * @param {number} toVersion - Target schema version
 * @returns {Object} Migrated configuration payload
 */
export function migrateConfigSchema(config, fromVersion, toVersion) {
  if (!config || typeof config !== 'object') {
    return config;
  }

  if (fromVersion === toVersion) {
    return config; // No migration needed
  }

  // Clone config
  let migrated = JSON.parse(JSON.stringify(config));

  // Apply migrations in order
  for (let version = fromVersion + 1; version <= toVersion; version++) {
    migrated = applySchemaMigration(migrated, version - 1, version);
  }

  // Update schema version
  migrated.schemaVersion = toVersion;

  // Ensure configurator metadata is normalized after migration
  return normalizeConfiguratorMetadata(migrated);
}

/**
 * Apply migration from one schema version to the next
 * @param {Object} config - Configuration payload
 * @param {number} fromVersion - Source version
 * @param {number} toVersion - Target version
 * @returns {Object} Migrated configuration
 */
function applySchemaMigration(config, fromVersion, toVersion) {
  // Schema version 1 → 2: Add configurator type support
  if (fromVersion === 1 && toVersion === 2) {
    return migrateToV2(config);
  }

  // Add more migrations as schema evolves
  // Schema version 2 → 3: ...
  
  return config;
}

/**
 * Migrate to schema version 2 (add configurator type support)
 * @param {Object} config - Configuration payload
 * @returns {Object} Migrated configuration
 */
function migrateToV2(config) {
  const migrated = JSON.parse(JSON.stringify(config));

  // Ensure metadata exists
  if (!migrated.metadata) {
    migrated.metadata = {};
  }

  // Ensure history exists
  if (!migrated.history) {
    migrated.history = {};
  }

  // Detect and set configurator type
  const detectedType = detectConfiguratorType(migrated);
  
  if (!migrated.metadata.configurator) {
    migrated.metadata.configurator = {};
  }
  
  migrated.metadata.configurator.type = detectedType;
  migrated.history.configuratorType = detectedType;
  migrated.history.configuratorVersion = '1.0';

  // Normalize configurator metadata
  return normalizeConfiguratorMetadata(migrated, { detectedType });
}

/**
 * Check if configuration needs migration
 * @param {Object} config - Configuration payload
 * @returns {Object} { needsMigration: boolean, currentVersion: number, targetVersion: number }
 */
export function checkMigrationNeeded(config) {
  if (!config || typeof config !== 'object') {
    return { needsMigration: false, currentVersion: null, targetVersion: null };
  }

  const currentVersion = config.schemaVersion || 1;
  const targetVersion = 2; // Current target schema version

  // Check if configurator type is missing (legacy config)
  const hasConfiguratorType = config.metadata?.configurator?.type || 
                              config.history?.configuratorType;

  const needsTypeMigration = !hasConfiguratorType;
  const needsVersionMigration = currentVersion < targetVersion;

  return {
    needsMigration: needsTypeMigration || needsVersionMigration,
    currentVersion,
    targetVersion,
    needsTypeMigration,
    needsVersionMigration
  };
}

/**
 * Auto-migrate configuration if needed
 * @param {Object} config - Configuration payload
 * @returns {Object} Migrated configuration (or original if no migration needed)
 */
export function autoMigrateConfig(config) {
  if (!config || typeof config !== 'object') {
    return config;
  }

  const migrationCheck = checkMigrationNeeded(config);

  if (!migrationCheck.needsMigration) {
    return config;
  }

  let migrated = JSON.parse(JSON.stringify(config));

  // Migrate legacy config (add configurator type)
  if (migrationCheck.needsTypeMigration) {
    migrated = migrateLegacyConfig(migrated);
  }

  // Migrate schema version
  if (migrationCheck.needsVersionMigration) {
    migrated = migrateConfigSchema(
      migrated,
      migrationCheck.currentVersion,
      migrationCheck.targetVersion
    );
  }

  return migrated;
}

/**
 * Batch migrate multiple configurations
 * @param {Array<Object>} configs - Array of configuration payloads
 * @returns {Array<Object>} Array of migrated configurations
 */
export function batchMigrateConfigs(configs) {
  if (!Array.isArray(configs)) {
    return [];
  }

  return configs.map(config => autoMigrateConfig(config));
}

