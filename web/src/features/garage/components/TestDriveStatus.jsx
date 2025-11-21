import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useGarageStore } from '../../../stores/garageStore';
import styles from './TestDriveStatus.module.css';

/**
 * Test Drive Status Component
 * Displays the latest test drive request status for a garage item
 * @param {Object} props
 * @param {string} props.itemId - Garage item ID
 * @param {boolean} props.compact - Whether to show compact view (default: true)
 */
export default function TestDriveStatus({ itemId, compact = true }) {
  const { t } = useTranslation('account');
  const { fetchTestDriveRequests, getTestDriveRequestForItem } = useGarageStore();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!itemId) {
      setLoading(false);
      return;
    }

    // Check cache first
    const cachedRequest = getTestDriveRequestForItem(itemId);
    if (cachedRequest) {
      setRequest(cachedRequest);
      setLoading(false);
      return;
    }

    // Fetch if not cached
    loadRequest();
  }, [itemId, getTestDriveRequestForItem]);

  const loadRequest = async () => {
    if (!itemId) return;
    
    setLoading(true);
    try {
      const { data, error } = await fetchTestDriveRequests(itemId);
      if (error) {
        console.error('[TestDriveStatus] Failed to fetch requests:', error);
      } else if (data && data.length > 0) {
        // Get the latest request (first in array, sorted by created_at desc)
        setRequest(data[0]);
      }
    } catch (err) {
      console.error('[TestDriveStatus] Exception loading request:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !request) {
    return null;
  }

  const getStatusConfig = (status) => {
    switch (status) {
      case 'pending':
        return {
          label: t('garage.testDrive.status.pending'),
          className: styles.statusPending,
          icon: '⏳'
        };
      case 'confirmed':
        return {
          label: t('garage.testDrive.status.confirmed'),
          className: styles.statusConfirmed,
          icon: '✓'
        };
      case 'completed':
        return {
          label: t('garage.testDrive.status.completed'),
          className: styles.statusCompleted,
          icon: '✓'
        };
      case 'cancelled':
        return {
          label: t('garage.testDrive.status.cancelled'),
          className: styles.statusCancelled,
          icon: '✗'
        };
      default:
        return {
          label: status,
          className: styles.statusDefault,
          icon: '○'
        };
    }
  };

  const statusConfig = getStatusConfig(request.status);
  const showDate = request.status === 'pending' || request.status === 'confirmed';
  const preferredDate = request.preferred_date 
    ? new Date(request.preferred_date).toLocaleDateString()
    : null;

  if (compact) {
    return (
      <div className={styles.compactBadge}>
        <span className={`${styles.statusBadge} ${statusConfig.className}`}>
          <span className={styles.statusIcon}>{statusConfig.icon}</span>
          <span className={styles.statusLabel}>{statusConfig.label}</span>
        </span>
        {showDate && preferredDate && (
          <span className={styles.date}>{preferredDate}</span>
        )}
      </div>
    );
  }

  return (
    <div className={styles.statusCard}>
      <div className={styles.statusHeader}>
        <span className={`${styles.statusBadge} ${statusConfig.className}`}>
          <span className={styles.statusIcon}>{statusConfig.icon}</span>
          <span className={styles.statusLabel}>{statusConfig.label}</span>
        </span>
      </div>
      {showDate && preferredDate && (
        <div className={styles.dateInfo}>
          <span className={styles.dateLabel}>Preferred Date:</span>
          <span className={styles.date}>{preferredDate}</span>
        </div>
      )}
      {request.dealer && (
        <div className={styles.dealerInfo}>
          <span className={styles.dealerLabel}>Dealer:</span>
          <span className={styles.dealerName}>{request.dealer}</span>
        </div>
      )}
    </div>
  );
}

