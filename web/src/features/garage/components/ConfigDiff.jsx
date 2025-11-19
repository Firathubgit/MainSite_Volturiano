import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  diffConfig, 
  calculatePriceDelta, 
  getDiffSummary, 
  getConfiguratorTypeChange,
  filterDiffByCategory 
} from '../utils/diffConfig';
import { detectConfiguratorType } from '../utils/configuratorType';
import ConfiguratorTypeBadge from './ConfiguratorTypeBadge';
import styles from './ConfigDiff.module.css';

/**
 * Visualize differences between two configuration payloads
 * @param {Object} props
 * @param {Object} props.oldConfig - Old configuration payload
 * @param {Object} props.newConfig - New configuration payload
 * @param {Array} props.diffSummary - Optional pre-calculated diff summary
 */
export default function ConfigDiff({ oldConfig, newConfig, diffSummary: providedDiffSummary }) {
  const { t } = useTranslation('account');

  // Calculate diff if not provided
  const diffSummary = useMemo(() => {
    if (providedDiffSummary) {
      return providedDiffSummary;
    }
    if (!oldConfig || !newConfig) {
      return [];
    }
    return diffConfig(oldConfig, newConfig);
  }, [oldConfig, newConfig, providedDiffSummary]);

  const priceDelta = useMemo(() => {
    if (!oldConfig || !newConfig) return 0;
    return calculatePriceDelta(oldConfig, newConfig);
  }, [oldConfig, newConfig]);

  // Detect configurator types
  const oldType = useMemo(() => oldConfig ? detectConfiguratorType(oldConfig) : null, [oldConfig]);
  const newType = useMemo(() => newConfig ? detectConfiguratorType(newConfig) : null, [newConfig]);
  const configuratorTypeChange = useMemo(() => getConfiguratorTypeChange(diffSummary), [diffSummary]);
  const configuratorDiffs = useMemo(() => filterDiffByCategory(diffSummary, 'configurator'), [diffSummary]);

  // Group diffs by category
  const groupedDiffs = useMemo(() => {
    const groups = {
      configurator: [],
      exterior: [],
      interior: [],
      performance: [],
      vehicle: [],
      pricing: [],
      metadata: [],
      other: []
    };

    diffSummary.forEach((diff) => {
      if (diff.category === 'configurator') {
        groups.configurator.push(diff);
      } else if (diff.path.startsWith('options.exterior')) {
        groups.exterior.push(diff);
      } else if (diff.path.startsWith('options.interior')) {
        groups.interior.push(diff);
      } else if (diff.path.startsWith('options.performance')) {
        groups.performance.push(diff);
      } else if (diff.path.startsWith('vehicle')) {
        groups.vehicle.push(diff);
      } else if (diff.path.startsWith('pricing')) {
        groups.pricing.push(diff);
      } else if (diff.path.startsWith('metadata') && diff.category !== 'configurator') {
        groups.metadata.push(diff);
      } else {
        groups.other.push(diff);
      }
    });

    return groups;
  }, [diffSummary]);

  if (!oldConfig && !newConfig) {
    return (
      <div className={styles.empty}>
        <span>{t('garage.diff.noChanges')}</span>
      </div>
    );
  }

  if (diffSummary.length === 0) {
    return (
      <div className={styles.empty}>
        <span>{t('garage.diff.noChanges')}</span>
      </div>
    );
  }

  const formatOptionId = (id) => {
    if (!id) return '';
    // Convert snake_case to readable format
    return id.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const renderDiffEntry = (diff) => {
    const isAdded = diff.type === 'added';
    const isRemoved = diff.type === 'removed';
    const isChanged = diff.type === 'changed';
    const isConfiguratorChange = diff.category === 'configurator';
    const hasDisplayLabel = diff.displayLabel;

    return (
      <div
        key={diff.path}
        className={`${styles.diffEntry} ${
          isAdded ? styles.added :
          isRemoved ? styles.removed :
          isChanged ? styles.changed : ''
        } ${isConfiguratorChange ? styles.configuratorChange : ''}`}
      >
        <div className={styles.diffPath}>
          {hasDisplayLabel ? diff.displayLabel : diff.path}
        </div>
        {diff.conversionNote && (
          <div className={styles.conversionNote}>
            {diff.conversionNote}
          </div>
        )}
        <div className={styles.diffValues}>
          {isRemoved && (
            <span className={styles.removedValue}>
              {formatOptionId(diff.from)} →
            </span>
          )}
          {isChanged && (
            <>
              <span className={styles.oldValue}>
                {formatOptionId(diff.from)}
              </span>
              <span className={styles.arrow}> → </span>
            </>
          )}
          {(isAdded || isChanged) && (
            <span className={styles.newValue}>
              {formatOptionId(diff.to)}
            </span>
          )}
        </div>
      </div>
    );
  };

  const renderGroup = (title, diffs, categoryKey) => {
    if (diffs.length === 0) return null;

    // Sort diffs by importance (high first)
    const sortedDiffs = [...diffs].sort((a, b) => {
      const importanceOrder = { high: 0, medium: 1, low: 2 };
      const aImportance = importanceOrder[a.importance] ?? 2;
      const bImportance = importanceOrder[b.importance] ?? 2;
      return aImportance - bImportance;
    });

    return (
      <div key={categoryKey} className={styles.diffGroup}>
        <h4 className={styles.groupTitle}>
          {t(`garage.diff.categories.${categoryKey}`, title)}
        </h4>
        <div className={styles.diffList}>
          {sortedDiffs.map(renderDiffEntry)}
        </div>
      </div>
    );
  };

  return (
    <div className={styles.diffContainer}>
      {/* Configurator type badges */}
      {(oldType || newType) && (
        <div className={styles.configuratorTypeHeader}>
          {oldType && (
            <div className={styles.typeBadgeWrapper}>
              <span className={styles.typeLabel}>{t('garage.diff.from')}:</span>
              <ConfiguratorTypeBadge type={oldType} size="small" />
            </div>
          )}
          {oldType && newType && oldType !== newType && (
            <span className={styles.typeArrow}>→</span>
          )}
          {newType && (
            <div className={styles.typeBadgeWrapper}>
              <span className={styles.typeLabel}>{t('garage.diff.to')}:</span>
              <ConfiguratorTypeBadge type={newType} size="small" />
            </div>
          )}
        </div>
      )}

      {/* Configurator type change notice */}
      {configuratorTypeChange && configuratorTypeChange.conversionNote && (
        <div className={styles.conversionNotice}>
          <span className={styles.conversionIcon}>🔄</span>
          <span>{configuratorTypeChange.conversionNote}</span>
        </div>
      )}

      {priceDelta !== 0 && (
        <div className={styles.priceDelta}>
          <span className={styles.priceLabel}>
            {t('garage.diff.priceDelta')}:
          </span>
          <span className={priceDelta > 0 ? styles.priceIncrease : styles.priceDecrease}>
            {priceDelta > 0 ? '+' : ''}
            {(priceDelta / 100).toLocaleString('sv-SE', {
              style: 'currency',
              currency: oldConfig?.pricing?.currency || newConfig?.pricing?.currency || 'EUR'
            })}
          </span>
        </div>
      )}

      <div className={styles.diffSummary}>
        <span>{getDiffSummary(diffSummary)}</span>
      </div>

      <div className={styles.diffGroups}>
        {/* Configurator changes first (most important) */}
        {renderGroup('Configurator', groupedDiffs.configurator, 'configurator')}
        {renderGroup('Exterior', groupedDiffs.exterior, 'exterior')}
        {renderGroup('Interior', groupedDiffs.interior, 'interior')}
        {renderGroup('Performance', groupedDiffs.performance, 'performance')}
        {renderGroup('Vehicle', groupedDiffs.vehicle, 'vehicle')}
        {renderGroup('Pricing', groupedDiffs.pricing, 'pricing')}
        {renderGroup('Metadata', groupedDiffs.metadata, 'metadata')}
        {renderGroup('Other', groupedDiffs.other, 'other')}
      </div>
    </div>
  );
}


