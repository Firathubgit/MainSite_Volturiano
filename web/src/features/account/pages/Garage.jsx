import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGarageStore } from '../../../stores/garageStore';
import { useUserStore } from '../../../stores/userStore';
import GarageLayout from '../../garage/components/GarageLayout';
import styles from '../../garage/styles/garage.module.css';

export default function Garage() {
  const { t } = useTranslation('account');
  const { loadGarage, subscribeRealtime, unsubscribeRealtime, error, items, loading, getItemsByState } = useGarageStore();
  const { session } = useUserStore();
  const [showDebug, setShowDebug] = useState(import.meta.env.DEV);

  // Calculate debug info reactively from store state
  const itemsArray = Array.from(items.values());
  const debugInfo = {
    itemCount: itemsArray.length,
    byState: {
      saved: getItemsByState('saved').length,
      purchased: getItemsByState('purchased').length,
      prototype: getItemsByState('prototype').length,
      wishlist: getItemsByState('wishlist').length
    },
    userId: session?.user?.id,
    hasError: !!error
  };

  useEffect(() => {
    console.log('[Garage] Component mounted, loading garage items...');
    console.log('[Garage] Session:', session ? 'Authenticated' : 'Not authenticated');
    console.log('[Garage] User ID:', session?.user?.id);

    // Load garage items on mount
    loadGarage(true)
      .then(() => {
        const state = useGarageStore.getState();
        const itemsArray = Array.from(state.items.values());
        console.log('[Garage] Loaded items:', itemsArray.length);
        console.log('[Garage] Items by state:', {
          saved: itemsArray.filter((i) => i.state === 'saved').length,
          purchased: itemsArray.filter((i) => i.state === 'purchased').length,
          prototype: itemsArray.filter((i) => i.state === 'prototype').length,
          wishlist: itemsArray.filter((i) => i.state === 'wishlist').length
        });
      })
      .catch((err) => {
        console.error('[Garage] Failed to load garage:', err);
      });

    // Subscribe to real-time changes
    subscribeRealtime();
    console.log('[Garage] Subscribed to real-time updates');

    // Cleanup on unmount
    return () => {
      console.log('[Garage] Component unmounting, unsubscribing...');
      unsubscribeRealtime();
    };
  }, [loadGarage, subscribeRealtime, unsubscribeRealtime, session]);

  useEffect(() => {
    if (error) {
      console.error('[Garage] Error loading garage:', error);
    }
  }, [error]);

  return (
    <div className={styles.garageLayout}>
      {showDebug && (
        <div
          style={{
            marginBottom: '24px',
            padding: '16px',
            background: 'rgba(255, 69, 32, 0.1)',
            border: '1px solid rgba(255, 69, 32, 0.3)',
            borderRadius: '12px',
            fontSize: '12px',
            fontFamily: 'monospace'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <strong style={{ color: '#ff4520' }}>🔍 Debug Info</strong>
            <button
              type="button"
              onClick={() => setShowDebug(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '18px'
              }}
            >
              ×
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
            <div>
              <strong>Status:</strong> {loading ? 'Loading...' : error ? 'Error' : 'Ready'}
            </div>
            <div>
              <strong>Items:</strong> {debugInfo.itemCount}
            </div>
            <div>
              <strong>Saved:</strong> {debugInfo.byState.saved}
            </div>
            <div>
              <strong>Purchased:</strong> {debugInfo.byState.purchased}
            </div>
            <div>
              <strong>Prototype:</strong> {debugInfo.byState.prototype}
            </div>
            <div>
              <strong>Wishlist:</strong> {debugInfo.byState.wishlist}
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <strong>User ID:</strong> {debugInfo.userId || 'Not authenticated'}
            </div>
            {error && (
              <div style={{ gridColumn: '1 / -1', color: '#ff8c7a' }}>
                <strong>Error:</strong> {error.message}
              </div>
            )}
            {!loading && !error && debugInfo.itemCount === 0 && (
              <div style={{ gridColumn: '1 / -1', color: '#ffa500', fontSize: '11px', marginTop: '8px' }}>
                ⚠️ No items found. Check:
                <br />1. User ID matches: {debugInfo.userId}
                <br />2. RLS policies allow access
                <br />3. Items exist in database for this user
              </div>
            )}
          </div>
        </div>
      )}

      {error && (
        <div style={{ color: '#ff8c7a', marginBottom: '24px', padding: '16px', background: 'rgba(255, 140, 122, 0.1)', borderRadius: '12px' }}>
          {t('garage.error.loadFailed')}: {error.message}
          {import.meta.env.DEV && (
            <div style={{ marginTop: '8px', fontSize: '11px', opacity: 0.8 }}>
              Check browser console for detailed error logs.
            </div>
          )}
        </div>
      )}
      <GarageLayout />
    </div>
  );
}

