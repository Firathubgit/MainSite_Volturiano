import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';
import {
  fetchGarage,
  createGarageItem as createItemAPI,
  updateGarageState as updateStateAPI,
  updateGarageItem as updateItemAPI,
  deleteGarageItem as deleteItemAPI,
  fetchGarageVersions as fetchVersionsAPI,
  restoreGarageVersion as restoreVersionAPI,
  createShareLink as createShareLinkAPI,
  fetchSharedItem as fetchSharedItemAPI,
  updateShareSettings as updateShareSettingsAPI,
  getShareLinks as getShareLinksAPI,
  deleteShareLink as deleteShareLinkAPI,
  createMilestone as createMilestoneAPI,
  fetchMilestones as fetchMilestonesAPI,
  createActivityLog as createActivityLogAPI,
  fetchActivityLog as fetchActivityLogAPI,
  addTag as addTagAPI,
  removeTag as removeTagAPI,
  getTags as getTagsAPI,
  getAllTags as getAllTagsAPI
} from '../features/account/api';
import { changeItemState } from '../features/garage/services/stateChangeService';
import { autoMigrateConfig } from '../features/garage/utils/migrateConfigs';
import { filterItemsByTags, calculateTagCounts } from '../features/garage/utils/tagUtils';
import { migrateLegacyTags, needsTagMigration } from '../features/garage/utils/migrateTags';

const STORAGE_KEY = 'volturiano_garage_cache';
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Load garage cache from localStorage
 * @returns {Object|null} Cached items or null if expired/missing
 */
function loadCache() {
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (!cached) return null;

    const { items, timestamp } = JSON.parse(cached);
    const age = Date.now() - timestamp;

    if (age > CACHE_EXPIRY_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return items;
  } catch (err) {
    console.warn('Failed to load garage cache:', err);
    return null;
  }
}

/**
 * Save garage items to localStorage
 * @param {Map|Object} items - Items to cache
 */
function saveCache(items) {
  try {
    const serializable =
      items instanceof Map
        ? Object.fromEntries(items)
        : items instanceof Object
          ? items
          : {};

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        items: serializable,
        timestamp: Date.now()
      })
    );
  } catch (err) {
    console.warn('Failed to save garage cache:', err);
  }
}

export const useGarageStore = create((set, get) => ({
  // State
  items: new Map(), // Map<id, GarageItem> for O(1) lookups
  filters: {
    state: null, // 'saved' | 'purchased' | 'prototype' | 'wishlist' | null
    model: null,
    search: '',
    dateRange: null, // '7d' | '30d' | '90d' | '1y' | 'all' | null
    dateField: 'created_at', // 'created_at' | 'updated_at'
    priceMin: null, // Minimum price in cents
    priceMax: null, // Maximum price in cents
    tags: [], // Array of selected tag strings
    tagMode: 'OR' // 'AND' | 'OR' - filtering mode
  },
  pagination: {
    page: 1,
    pageSize: 20,
    hasMore: true,
    totalCount: 0
  },
  loading: false,
  initialLoadComplete: false, // Track if we've loaded data at least once
  error: null,
  selectedItemId: null,
  realtimeChannel: null,
  versions: new Map(), // Map<itemId, Array<Version>> - Cache version data per item
  shareLinks: new Map(), // Map<itemId, Array<ShareLink>> - Cache share links per item
  milestones: new Map(), // Map<itemId, Array<Milestone>> - Cache milestones per item
  tagCounts: new Map(), // Map<tag, count> - Cache tag usage counts

  // Actions
  /**
   * Load garage items from API
   * @param {boolean} useCache - Whether to use cached data first
   */
  loadGarage: async (useCache = true) => {
    const state = get();
    if (state.loading) {
      console.warn('[GarageStore] Already loading, skipping duplicate call');
      return Promise.resolve();
    }

    console.log('[GarageStore] Starting loadGarage, useCache:', useCache);
    set({ loading: true, error: null });

    // Try cache first if enabled (but only if no filters are active)
    const currentFilters = get().filters;
    const hasActiveFilters = currentFilters.state || currentFilters.model || currentFilters.search;
    
    if (useCache && !hasActiveFilters) {
      const cached = loadCache();
      if (cached && Object.keys(cached).length > 0) {
        console.log('[GarageStore] Using cached items:', Object.keys(cached).length);
        set({
          items: new Map(Object.entries(cached)),
          loading: false,
          initialLoadComplete: true // Mark as loaded even from cache
        });
        // Still fetch fresh data in background, but don't block UI
      }
    }

    try {
      const filtersToUse = get().filters;
      console.log('[GarageStore] Fetching garage items with filters:', filtersToUse);
      
      const result = await fetchGarage(filtersToUse, get().pagination);
      console.log('[GarageStore] fetchGarage returned:', result);
      
      const { data, error, count } = result;

      if (error) {
        console.error('[GarageStore] Error fetching garage items:', error);
        set({ loading: false, error });
        return Promise.reject(error);
      }

      console.log('[GarageStore] Fetched', data?.length || 0, 'items from Supabase');

      // Update items map with auto-migration
      const itemsMap = new Map();
      const migrationPromises = [];
      
      data.forEach((item) => {
        // Auto-migrate legacy configs
        if (item.config_payload) {
          try {
            item.config_payload = autoMigrateConfig(item.config_payload);
          } catch (migrationError) {
            console.warn('[GarageStore] Migration failed for item', item.id, migrationError);
            // Continue with original config if migration fails
          }
        }
        
        // Migrate legacy tags if needed (async, don't block)
        if (needsTagMigration(item)) {
          migrationPromises.push(
            migrateLegacyTags(item).then((migrated) => {
              if (migrated) {
                console.log('[GarageStore] Migrated tags for item', item.id);
                // Reload tags for this item after migration
                // The item will be updated via real-time subscription or next load
              }
            }).catch((err) => {
              console.warn('[GarageStore] Tag migration failed for item', item.id, err);
            })
          );
        }
        
        itemsMap.set(item.id, item);
      });
      
      // Run migrations in background (don't block UI)
      if (migrationPromises.length > 0) {
        Promise.all(migrationPromises).catch((err) => {
          console.warn('[GarageStore] Some tag migrations failed:', err);
        });
      }

      // Only merge with existing items if no filters are active (for pagination)
      // If filters are active, replace items completely
      const finalFilters = get().filters;
      const hasFilters = finalFilters.state || finalFilters.model || finalFilters.search;
      
      if (!hasFilters) {
        // Merge with existing items (for pagination when no filters)
        const existingItems = get().items;
        existingItems.forEach((item, id) => {
          if (!itemsMap.has(id)) {
            itemsMap.set(id, item);
          }
        });
      }

      console.log('[GarageStore] Setting items, total:', itemsMap.size);
      set({
        items: itemsMap,
        loading: false,
        initialLoadComplete: true, // Mark that we've loaded data at least once
        error: null,
        pagination: {
          ...get().pagination,
          hasMore: data.length === get().pagination.pageSize,
          totalCount: count || 0
        }
      });

      // Save to cache (only if no filters)
      if (!hasFilters) {
        saveCache(itemsMap);
      }
      return Promise.resolve();
    } catch (err) {
      console.error('[GarageStore] Exception in loadGarage:', err);
      set({ loading: false, error: err });
      return Promise.reject(err);
    }
  },

  /**
   * Add a new garage item (optimistic)
   * @param {Object} itemData - Item data
   */
  addItem: async (itemData) => {
    const state = get();
    const tempId = `temp-${Date.now()}`;

    // Optimistic add
    const optimisticItem = {
      ...itemData,
      id: tempId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const newItems = new Map(state.items);
    newItems.set(tempId, optimisticItem);
    set({ items: newItems });
    saveCache(newItems);

    try {
      const { data, error } = await createItemAPI(itemData);

      if (error) {
        // Rollback optimistic update
        const rolledBack = new Map(state.items);
        rolledBack.delete(tempId);
        set({ items: rolledBack, error });
        saveCache(rolledBack);
        return { error };
      }

      // Replace temp item with real one
      const finalItems = new Map(state.items);
      finalItems.delete(tempId);
      finalItems.set(data.id, data);
      set({ items: finalItems });
      saveCache(finalItems);

      return { data, error: null };
    } catch (err) {
      // Rollback
      const rolledBack = new Map(state.items);
      rolledBack.delete(tempId);
      set({ items: rolledBack, error: err });
      saveCache(rolledBack);
      return { error: err };
    }
  },

  /**
   * Update an item (optimistic)
   * @param {string} itemId - Item ID
   * @param {Object} updates - Fields to update
   */
  updateItem: async (itemId, updates) => {
    const state = get();
    const item = state.items.get(itemId);
    if (!item) {
      return { error: new Error('Item not found') };
    }

    // Optimistic update
    const updatedItem = { ...item, ...updates, updated_at: new Date().toISOString() };
    const newItems = new Map(state.items);
    newItems.set(itemId, updatedItem);
    set({ items: newItems });
    saveCache(newItems);

    try {
      const { data, error } = await updateItemAPI(itemId, updates);

      if (error) {
        // Rollback
        set({ items: state.items, error });
        saveCache(state.items);
        return { error };
      }

      // Update with server response
      const finalItems = new Map(state.items);
      finalItems.set(itemId, data);
      set({ items: finalItems });
      saveCache(finalItems);

      return { data, error: null };
    } catch (err) {
      // Rollback
      set({ items: state.items, error: err });
      saveCache(state.items);
      return { error: err };
    }
  },

  /**
   * Update item state (moves between lanes)
   * Uses centralized stateChangeService for validation and logging
   * @param {string} itemId - Item ID
   * @param {string} newState - New state
   * @param {Object} options - Optional options (source, reason, metadata)
   */
  updateItemState: async (itemId, newState, options = {}) => {
    console.log('[GarageStore] updateItemState called');
    console.log('[GarageStore] Parameters:', { itemId, newState, options });
    const state = get();
    const item = state.items.get(itemId);
    if (!item) {
      return { error: new Error('Item not found') };
    }

    const fromState = item.state;
    console.log('[GarageStore] Current state:', fromState, '→ Target state:', newState);

    // Optimistic update
    const updatedItem = { ...item, state: newState, updated_at: new Date().toISOString() };
    const newItems = new Map(state.items);
    newItems.set(itemId, updatedItem);
    set({ items: newItems });
    saveCache(newItems);

    try {
      // Use centralized service with manual source
      const serviceOptions = {
        source: 'manual',
        ...options
      };
      const { data, error } = await changeItemState(itemId, newState, serviceOptions);

      if (error) {
        // Rollback
        console.error('[GarageStore] State change failed, rolling back:', error);
        set({ items: state.items });
        saveCache(state.items);
        return { error };
      }

      // Update with server response
      const finalItems = new Map(state.items);
      finalItems.set(itemId, data);
      set({ items: finalItems });
      saveCache(finalItems);

      console.log('[GarageStore] State changed successfully:', fromState, '→', newState);
      return { data, error: null };
    } catch (err) {
      // Rollback
      console.error('[GarageStore] Exception changing state, rolling back:', err);
      set({ items: state.items });
      saveCache(state.items);
      return { error: err };
    }
  },

  /**
   * Delete an item (optimistic)
   * @param {string} itemId - Item ID
   */
  deleteItem: async (itemId) => {
    console.log('[GarageStore] deleteItem called with:', itemId);
    const state = get();
    const item = state.items.get(itemId);
    if (!item) {
      console.error('[GarageStore] Item not found:', itemId);
      return { error: new Error('Item not found') };
    }

    // Save original state for rollback
    const originalItems = new Map(state.items);

    console.log('[GarageStore] Item found, performing optimistic delete');
    // Optimistic delete
    const newItems = new Map(state.items);
    newItems.delete(itemId);
    set({ items: newItems });
    saveCache(newItems);

    try {
      console.log('[GarageStore] Calling deleteItemAPI...');
      const { data, error } = await deleteItemAPI(itemId);
      console.log('[GarageStore] deleteItemAPI response:', { data, error });

      if (error) {
        console.error('[GarageStore] Delete API error, rolling back:', error);
        // Rollback - restore original items
        set({ items: originalItems, error });
        saveCache(originalItems);
        return { error };
      }

      // Verify the item is actually gone from the store
      const currentItems = get().items;
      if (currentItems.has(itemId)) {
        console.warn('[GarageStore] Item still in store after delete, removing...');
        const cleanedItems = new Map(currentItems);
        cleanedItems.delete(itemId);
        set({ items: cleanedItems });
        saveCache(cleanedItems);
      }

      console.log('[GarageStore] Delete successful, item removed from store');
      return { data, error: null };
    } catch (err) {
      console.error('[GarageStore] Delete exception, rolling back:', err);
      // Rollback - restore original items
      set({ items: originalItems, error: err });
      saveCache(originalItems);
      return { error: err };
    }
  },

  /**
   * Set filters and reload
   * @param {Object} newFilters - Filter object
   */
  setFilters: (newFilters) => {
    const currentState = get();
    console.log('[GarageStore] setFilters called with:', newFilters);
    console.log('[GarageStore] Current filters:', currentState.filters);
    
    // Don't update if filters haven't changed
    const newFilterState = { ...currentState.filters, ...newFilters };
    
    // Normalize tags array for comparison
    const tagsEqual = (a, b) => {
      if (!Array.isArray(a) || !Array.isArray(b)) return a === b;
      if (a.length !== b.length) return false;
      const sortedA = [...a].sort();
      const sortedB = [...b].sort();
      return sortedA.every((val, idx) => val === sortedB[idx]);
    };
    
    const filtersChanged = 
      newFilterState.state !== currentState.filters.state ||
      newFilterState.model !== currentState.filters.model ||
      newFilterState.search !== currentState.filters.search ||
      newFilterState.dateRange !== currentState.filters.dateRange ||
      newFilterState.dateField !== currentState.filters.dateField ||
      newFilterState.priceMin !== currentState.filters.priceMin ||
      newFilterState.priceMax !== currentState.filters.priceMax ||
      !tagsEqual(newFilterState.tags, currentState.filters.tags) ||
      newFilterState.tagMode !== currentState.filters.tagMode;
    
    if (!filtersChanged) {
      console.log('[GarageStore] Filters unchanged, skipping reload');
      return;
    }
    
    // Check if only client-side filters changed (search, tags, price) - no API reload needed
    const onlyClientSideChanged = 
      (newFilterState.search !== currentState.filters.search ||
       !tagsEqual(newFilterState.tags, currentState.filters.tags) ||
       newFilterState.tagMode !== currentState.filters.tagMode ||
       newFilterState.priceMin !== currentState.filters.priceMin ||
       newFilterState.priceMax !== currentState.filters.priceMax) &&
      newFilterState.state === currentState.filters.state &&
      newFilterState.model === currentState.filters.model &&
      newFilterState.dateRange === currentState.filters.dateRange &&
      newFilterState.dateField === currentState.filters.dateField;
    
    // Update filters (this will trigger re-render with filtered items)
    set({
      filters: newFilterState,
      pagination: { ...currentState.pagination, page: 1 } // Reset to first page
    });
    
    // Only reload from API if server-side filters changed (not client-side only)
    if (!onlyClientSideChanged) {
      // Clear any existing loading state before setting new filters
      if (currentState.loading) {
        console.warn('[GarageStore] Already loading, clearing loading state first');
        set({ loading: false });
      }
      
      // Small delay to ensure state is updated before loading
      setTimeout(() => {
        // Reload without cache
        get().loadGarage(false).catch((err) => {
          console.error('[GarageStore] Error loading garage after filter change:', err);
          set({ loading: false, error: err });
        });
      }, 0);
    } else {
      console.log('[GarageStore] Only search changed, filtering client-side (no API reload)');
    }
  },

  /**
   * Set selected item (for detail view)
   * @param {string|null} itemId - Item ID or null to deselect
   */
  setSelectedItem: (itemId) => {
    set({ selectedItemId: itemId });
  },

  /**
   * Get items filtered by state (for lanes)
   * @param {string} state - State filter
   * @returns {Array} Filtered items
   */
  getItemsByState: (state) => {
    const storeState = get();
    const items = Array.from(storeState.items.values());
    let filtered = items.filter((item) => item.state === state && !item.archived_at);
    
    // Apply search filter client-side (searches title, description, and vehicle model)
    if (storeState.filters.search && storeState.filters.search.trim()) {
      const searchTerm = storeState.filters.search.trim().toLowerCase();
      filtered = filtered.filter((item) => {
        const titleMatch = item.title?.toLowerCase().includes(searchTerm) || false;
        const descMatch = item.description?.toLowerCase().includes(searchTerm) || false;
        const modelMatch = item.vehicle_model?.toLowerCase().includes(searchTerm) || false;
        return titleMatch || descMatch || modelMatch;
      });
    }
    
    // Apply price filters client-side (for already-loaded items)
    if (storeState.filters.priceMin !== null && storeState.filters.priceMin !== undefined) {
      filtered = filtered.filter((item) => {
        const itemPrice = item.price_cents || 0;
        return itemPrice >= storeState.filters.priceMin;
      });
    }
    
    if (storeState.filters.priceMax !== null && storeState.filters.priceMax !== undefined) {
      filtered = filtered.filter((item) => {
        const itemPrice = item.price_cents || 0;
        return itemPrice <= storeState.filters.priceMax;
      });
    }
    
    // Apply tag filtering client-side
    if (storeState.filters.tags && Array.isArray(storeState.filters.tags) && storeState.filters.tags.length > 0) {
      filtered = filterItemsByTags(
        filtered,
        storeState.filters.tags,
        storeState.filters.tagMode || 'OR'
      );
    }
    
    return filtered;
  },

  /**
   * Subscribe to real-time changes
   */
  subscribeRealtime: () => {
    const state = get();
    if (state.realtimeChannel) {
      return; // Already subscribed
    }

    const channel = supabase
      .channel('garage_changes')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'garage_items',
          filter: `archived_at=is.null`
        },
        (payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload;

          if (eventType === 'INSERT' && newRecord) {
            // Add new item
            const items = new Map(get().items);
            // Normalize tags if present
            if (newRecord.garage_item_tags) {
              newRecord.tags = (newRecord.garage_item_tags || []).map(tagRow => tagRow.tag);
              delete newRecord.garage_item_tags;
            }
            items.set(newRecord.id, newRecord);
            set({ items });
            saveCache(items);
            
            // Invalidate tag counts cache when new items are added
            set({ tagCounts: new Map() });
          } else if (eventType === 'UPDATE' && newRecord) {
            // Update existing item
            const items = new Map(get().items);
            if (newRecord.archived_at) {
              items.delete(newRecord.id);
            } else {
              // Ensure tags are normalized (from join query)
              if (newRecord.garage_item_tags) {
                newRecord.tags = (newRecord.garage_item_tags || []).map(tagRow => tagRow.tag);
                delete newRecord.garage_item_tags;
              }
              items.set(newRecord.id, newRecord);
            }
            set({ items });
            saveCache(items);
            
            // Invalidate tag counts cache when items change
            set({ tagCounts: new Map() });
          } else if (eventType === 'DELETE' && oldRecord) {
            // Remove item
            const items = new Map(get().items);
            items.delete(oldRecord.id);
            set({ items });
            saveCache(items);
            
            // Invalidate tag counts cache when items are deleted
            set({ tagCounts: new Map() });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'garage_item_tags'
        },
        (payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload;
          
          // Invalidate tag counts cache when tags change
          set({ tagCounts: new Map() });
          
          // Update item tags if item is in store
          // Note: We'll reload tags on next item fetch or when item is updated
          // Real-time tag changes will be reflected when garage_items table is updated
          // For now, we just invalidate the cache to force a refresh
        }
      )
      .subscribe();

    set({ realtimeChannel: channel });
  },

  /**
   * Unsubscribe from real-time changes
   */
  unsubscribeRealtime: () => {
    const state = get();
    if (state.realtimeChannel) {
      supabase.removeChannel(state.realtimeChannel);
      set({ realtimeChannel: null });
    }
  },

  /**
   * Load version history for a garage item
   * @param {string} itemId - Item ID
   * @returns {Promise<{data: Array, error: Error|null}>}
   */
  loadVersions: async (itemId, forceRefresh = false) => {
    console.log('[GarageStore] loadVersions called:', { itemId, forceRefresh });
    const state = get();
    
    // Check cache first (unless forcing refresh)
    if (!forceRefresh && state.versions.has(itemId)) {
      const cached = state.versions.get(itemId);
      console.log('[GarageStore] Returning cached versions:', cached?.length || 0, 'versions');
      // Return cached data immediately, but refresh in background
      fetchVersionsAPI(itemId).then(({ data, error }) => {
        if (!error && data) {
          console.log('[GarageStore] Background refresh completed, updating cache');
          // Auto-migrate version snapshots
          const migratedVersions = (data || []).map(version => {
            if (version.snapshot) {
              try {
                version.snapshot = autoMigrateConfig(version.snapshot);
              } catch (migrationError) {
                console.warn('[GarageStore] Migration failed for version', version.id, migrationError);
              }
            }
            return version;
          });
          // Update cache
          set((currentState) => {
            const newVersions = new Map(currentState.versions);
            newVersions.set(itemId, migratedVersions);
            return { versions: newVersions };
          });
          console.log('[GarageStore] Cache updated with fresh data');
        }
      }).catch((err) => {
        console.warn('[GarageStore] Background refresh failed:', err);
      });
      return { data: cached, error: null };
    }

    if (forceRefresh) {
      console.log('[GarageStore] Force refresh requested, bypassing cache');
    } else {
      console.log('[GarageStore] No cache found for itemId:', itemId);
    }

    try {
      console.log('[GarageStore] Calling fetchVersionsAPI...');
      const startTime = Date.now();
      // Fetch from Supabase
      const { data, error } = await fetchVersionsAPI(itemId);
      const duration = Date.now() - startTime;
      console.log('[GarageStore] fetchVersionsAPI completed in', duration, 'ms');
      
      if (error) {
        console.error('[GarageStore] API returned error:', error);
        return { data: null, error };
      }

      console.log('[GarageStore] API returned', data?.length || 0, 'versions');

      // Auto-migrate version snapshots
      console.log('[GarageStore] Auto-migrating version snapshots...');
      const migratedVersions = (data || []).map(version => {
        if (version.snapshot) {
          try {
            version.snapshot = autoMigrateConfig(version.snapshot);
          } catch (migrationError) {
            console.warn('[GarageStore] Migration failed for version', version.id, migrationError);
          }
        }
        return version;
      });
      console.log('[GarageStore] Migration complete');

      // Cache versions
      const newVersions = new Map(state.versions);
      newVersions.set(itemId, migratedVersions);
      set({ versions: newVersions });
      console.log('[GarageStore] Versions cached for itemId:', itemId);

      return { data: migratedVersions, error: null };
    } catch (err) {
      console.error('[GarageStore] Exception loading versions:', err);
      console.error('[GarageStore] Error stack:', err.stack);
      return { data: null, error: err };
    }
  },

  /**
   * Restore a garage item to a specific version
   * Creates a new version from the restored state
   * @param {string} itemId - Item ID
   * @param {number} versionNumber - Version number to restore
   * @returns {Promise<{data: Object, error: Error|null}>}
   */
  restoreVersion: async (itemId, versionNumber) => {
    const state = get();
    const item = state.items.get(itemId);
    
    if (!item) {
      return { error: new Error('Item not found') };
    }

    // Optimistic update: update item in store immediately
    // We'll update with the restored config once we get it
    const originalItem = { ...item };

    try {
      const { data: restoredItem, error } = await restoreVersionAPI(itemId, versionNumber);

      if (error) {
        return { error };
      }

      // Update item in store
      const newItems = new Map(state.items);
      newItems.set(itemId, restoredItem);
      
      // Invalidate versions cache since we just created a new version
      const newVersions = new Map(state.versions);
      newVersions.delete(itemId);
      
      set({ items: newItems, versions: newVersions });
      saveCache(newItems);
      console.log('[GarageStore] Versions cache invalidated for item:', itemId);

      return { data: restoredItem, error: null };
    } catch (err) {
      console.error('[GarageStore] Error restoring version:', err);
      // Rollback not needed since we didn't optimistically update
      return { error: err };
    }
  },

  /**
   * Create a share link for a garage item
   * @param {string} itemId - Item ID
   * @param {Object} options - Share options
   * @returns {Promise<{data: Object, error: Error|null}>}
   */
  createShareLink: async (itemId, options = {}) => {
    console.log('[GarageStore] createShareLink called');
    console.log('[GarageStore] Parameters:', { itemId, options });
    const startTime = Date.now();
    try {
      const { data, error } = await createShareLinkAPI(itemId, options);
      const duration = Date.now() - startTime;
      
      if (error) {
        console.error('[GarageStore] Create share link error:', error);
        console.log('[GarageStore] createShareLink failed in', duration, 'ms');
        return { data: null, error };
      }
      
      // Invalidate cache for this item
      set((state) => {
        const newShareLinks = new Map(state.shareLinks);
        newShareLinks.delete(itemId);
        return { shareLinks: newShareLinks };
      });
      console.log('[GarageStore] Cache invalidated for item:', itemId);
      
      console.log('[GarageStore] Share link created successfully');
      console.log('[GarageStore] Share code:', data?.share_code);
      console.log('[GarageStore] createShareLink completed in', duration, 'ms');
      return { data, error: null };
    } catch (err) {
      const duration = Date.now() - startTime;
      console.error('[GarageStore] Exception creating share link:', err);
      console.error('[GarageStore] Exception stack:', err.stack);
      console.log('[GarageStore] createShareLink failed after', duration, 'ms');
      return { data: null, error: err };
    }
  },

  /**
   * Fetch a shared garage item by share code (public access, no auth required)
   * @param {string} shareCode - Share code
   * @returns {Promise<{data: Object, error: Error|null}>}
   */
  fetchSharedItem: async (shareCode) => {
    console.log('[GarageStore] fetchSharedItem called');
    console.log('[GarageStore] Share code:', shareCode);
    const startTime = Date.now();
    try {
      const { data, error } = await fetchSharedItemAPI(shareCode);
      const duration = Date.now() - startTime;
      
      if (error) {
        console.error('[GarageStore] Fetch shared item error:', error);
        console.log('[GarageStore] fetchSharedItem failed in', duration, 'ms');
        return { data: null, error };
      }
      console.log('[GarageStore] Shared item fetched successfully');
      console.log('[GarageStore] Item ID:', data?.item?.id);
      console.log('[GarageStore] Access count:', data?.share_link?.access_count);
      console.log('[GarageStore] fetchSharedItem completed in', duration, 'ms');
      return { data, error: null };
    } catch (err) {
      const duration = Date.now() - startTime;
      console.error('[GarageStore] Exception fetching shared item:', err);
      console.error('[GarageStore] Exception stack:', err.stack);
      console.log('[GarageStore] fetchSharedItem failed after', duration, 'ms');
      return { data: null, error: err };
    }
  },

  /**
   * Update share link settings
   * @param {string} shareLinkId - Share link ID
   * @param {Object} settings - Settings to update
   * @returns {Promise<{data: Object, error: Error|null}>}
   */
  updateShareSettings: async (shareLinkId, settings) => {
    console.log('[GarageStore] updateShareSettings called');
    console.log('[GarageStore] Parameters:', { shareLinkId, settings });
    const startTime = Date.now();
    try {
      const { data, error } = await updateShareSettingsAPI(shareLinkId, settings);
      const duration = Date.now() - startTime;
      
      if (error) {
        console.error('[GarageStore] Update share settings error:', error);
        console.log('[GarageStore] updateShareSettings failed in', duration, 'ms');
        return { data: null, error };
      }
      
      // Find which item this share link belongs to and invalidate cache
      // We need to find the itemId from the share link data
      if (data?.garage_item_id) {
        set((state) => {
          const newShareLinks = new Map(state.shareLinks);
          newShareLinks.delete(data.garage_item_id);
          return { shareLinks: newShareLinks };
        });
        console.log('[GarageStore] Cache invalidated for item:', data.garage_item_id);
      }
      
      console.log('[GarageStore] Share settings updated successfully');
      console.log('[GarageStore] Updated privacy:', data?.privacy);
      console.log('[GarageStore] updateShareSettings completed in', duration, 'ms');
      return { data, error: null };
    } catch (err) {
      const duration = Date.now() - startTime;
      console.error('[GarageStore] Exception updating share settings:', err);
      console.error('[GarageStore] Exception stack:', err.stack);
      console.log('[GarageStore] updateShareSettings failed after', duration, 'ms');
      return { data: null, error: err };
    }
  },

  /**
   * Get all share links for a garage item
   * @param {string} itemId - Item ID
   * @returns {Promise<{data: Array, error: Error|null}>}
   */
  getShareLinks: async (itemId, forceRefresh = false) => {
    console.log('[GarageStore] getShareLinks called');
    console.log('[GarageStore] Item ID:', itemId, 'forceRefresh:', forceRefresh);
    
    // Check cache first (unless forcing refresh)
    if (!forceRefresh) {
      const cached = get().shareLinks.get(itemId);
      if (cached) {
        console.log('[GarageStore] Returning cached share links:', cached.length, 'links');
        // Return cached data immediately, but refresh in background
        getShareLinksAPI(itemId).then(({ data, error }) => {
          if (!error && data) {
            console.log('[GarageStore] Background refresh completed, updating cache');
            set((state) => {
              const newShareLinks = new Map(state.shareLinks);
              newShareLinks.set(itemId, data);
              return { shareLinks: newShareLinks };
            });
          }
        }).catch((err) => {
          console.warn('[GarageStore] Background refresh failed:', err);
        });
        return { data: cached, error: null };
      }
    }
    
    const startTime = Date.now();
    try {
      const { data, error } = await getShareLinksAPI(itemId);
      const duration = Date.now() - startTime;
      
      if (error) {
        console.error('[GarageStore] Get share links error:', error);
        console.log('[GarageStore] getShareLinks failed in', duration, 'ms');
        return { data: null, error };
      }
      
      // Update cache
      set((state) => {
        const newShareLinks = new Map(state.shareLinks);
        newShareLinks.set(itemId, data || []);
        return { shareLinks: newShareLinks };
      });
      
      console.log('[GarageStore] Share links fetched:', data?.length || 0, 'links');
      if (data && data.length > 0) {
        console.log('[GarageStore] Share codes:', data.map(l => l.share_code));
      }
      console.log('[GarageStore] getShareLinks completed in', duration, 'ms');
      return { data: data || [], error: null };
    } catch (err) {
      const duration = Date.now() - startTime;
      console.error('[GarageStore] Exception getting share links:', err);
      console.error('[GarageStore] Exception stack:', err.stack);
      console.log('[GarageStore] getShareLinks failed after', duration, 'ms');
      return { data: null, error: err };
    }
  },

  /**
   * Delete a share link
   * @param {string} shareLinkId - Share link ID
   * @returns {Promise<{data: Object, error: Error|null}>}
   */
  deleteShareLink: async (shareLinkId) => {
    console.log('[GarageStore] deleteShareLink called');
    console.log('[GarageStore] Share link ID:', shareLinkId);
    const startTime = Date.now();
    try {
      const { data, error } = await deleteShareLinkAPI(shareLinkId);
      const duration = Date.now() - startTime;
      
      if (error) {
        console.error('[GarageStore] Delete share link error:', error);
        console.log('[GarageStore] deleteShareLink failed in', duration, 'ms');
        return { data: null, error };
      }
      
      // Find which item this share link belongs to and invalidate cache
      // We need to find the itemId - check if we have it cached
      let itemIdToInvalidate = null;
      get().shareLinks.forEach((links, itemId) => {
        if (links.some(link => link.id === shareLinkId)) {
          itemIdToInvalidate = itemId;
        }
      });
      
      if (itemIdToInvalidate) {
        set((state) => {
          const newShareLinks = new Map(state.shareLinks);
          newShareLinks.delete(itemIdToInvalidate);
          return { shareLinks: newShareLinks };
        });
        console.log('[GarageStore] Cache invalidated for item:', itemIdToInvalidate);
      }
      
      console.log('[GarageStore] Share link deleted successfully');
      console.log('[GarageStore] Deleted share code:', data?.share_code);
      console.log('[GarageStore] deleteShareLink completed in', duration, 'ms');
      return { data, error: null };
    } catch (err) {
      const duration = Date.now() - startTime;
      console.error('[GarageStore] Exception deleting share link:', err);
      console.error('[GarageStore] Exception stack:', err.stack);
      console.log('[GarageStore] deleteShareLink failed after', duration, 'ms');
      return { data: null, error: err };
    }
  },

  /**
   * Load milestones for a garage item
   * @param {string} itemId - Item ID
   * @param {Object} options - Load options
   * @param {boolean} options.forceRefresh - Force refresh even if cached
   * @param {string} options.order - Order direction: 'asc' or 'desc', default: 'desc'
   * @param {string|null} options.type - Filter by milestone type, default: null
   * @returns {Promise<{data: Array, error: Error|null}>}
   */
  loadMilestones: async (itemId, options = {}) => {
    const { forceRefresh = false, order = 'desc', type = null } = options;
    console.log('[GarageStore] loadMilestones called');
    console.log('[GarageStore] Item ID:', itemId, 'Options:', { forceRefresh, order, type });
    
    // Check cache first (unless forcing refresh)
    if (!forceRefresh) {
      const cached = get().milestones.get(itemId);
      if (cached) {
        console.log('[GarageStore] Returning cached milestones:', cached.length, 'milestones');
        // Return cached data immediately, but refresh in background
        fetchMilestonesAPI(itemId, { order, type }).then(({ data, error }) => {
          if (!error && data) {
            console.log('[GarageStore] Background refresh completed, updating cache');
            set((state) => {
              const newMilestones = new Map(state.milestones);
              newMilestones.set(itemId, data);
              return { milestones: newMilestones };
            });
          }
        }).catch((err) => {
          console.warn('[GarageStore] Background refresh failed:', err);
        });
        return { data: cached, error: null };
      }
    }
    
    const startTime = Date.now();
    try {
      const { data, error } = await fetchMilestonesAPI(itemId, { order, type });
      const duration = Date.now() - startTime;
      
      if (error) {
        console.error('[GarageStore] Load milestones error:', error);
        console.log('[GarageStore] loadMilestones failed in', duration, 'ms');
        return { data: null, error };
      }
      
      // Update cache
      set((state) => {
        const newMilestones = new Map(state.milestones);
        newMilestones.set(itemId, data || []);
        return { milestones: newMilestones };
      });
      
      console.log('[GarageStore] Milestones fetched:', data?.length || 0, 'milestones');
      console.log('[GarageStore] loadMilestones completed in', duration, 'ms');
      return { data: data || [], error: null };
    } catch (err) {
      const duration = Date.now() - startTime;
      console.error('[GarageStore] Exception loading milestones:', err);
      console.error('[GarageStore] Exception stack:', err.stack);
      console.log('[GarageStore] loadMilestones failed after', duration, 'ms');
      return { data: null, error: err };
    }
  },

  /**
   * Get milestones filtered by type
   * @param {string} itemId - Item ID
   * @param {string} type - Milestone type to filter by
   * @returns {Array} Filtered milestones array
   */
  getMilestonesByType: (itemId, type) => {
    const milestones = get().milestones.get(itemId) || [];
    return milestones.filter(m => m.milestone_type === type);
  },

  /**
   * Create a milestone for a garage item
   * @param {string} itemId - Item ID
   * @param {Object} milestoneData - Milestone data
   * @returns {Promise<{data: Object, error: Error|null}>}
   */
  createMilestone: async (itemId, milestoneData) => {
    console.log('[GarageStore] createMilestone called');
    console.log('[GarageStore] Parameters:', { itemId, milestoneData });
    const startTime = Date.now();
    try {
      const { data, error } = await createMilestoneAPI(itemId, milestoneData);
      const duration = Date.now() - startTime;
      
      if (error) {
        console.error('[GarageStore] Create milestone error:', error);
        console.log('[GarageStore] createMilestone failed in', duration, 'ms');
        return { data: null, error };
      }
      
      // Invalidate cache for this item
      set((state) => {
        const newMilestones = new Map(state.milestones);
        newMilestones.delete(itemId);
        return { milestones: newMilestones };
      });
      console.log('[GarageStore] Cache invalidated for item:', itemId);
      
      console.log('[GarageStore] Milestone created successfully');
      console.log('[GarageStore] Milestone ID:', data?.id);
      console.log('[GarageStore] createMilestone completed in', duration, 'ms');
      return { data, error: null };
    } catch (err) {
      const duration = Date.now() - startTime;
      console.error('[GarageStore] Exception creating milestone:', err);
      console.error('[GarageStore] Exception stack:', err.stack);
      console.log('[GarageStore] createMilestone failed after', duration, 'ms');
      return { data: null, error: err };
    }
  },

  /**
   * Load activity log for a garage item
   * @param {string} itemId - Item ID
   * @param {number} limit - Maximum entries (default: 50)
   * @returns {Promise<{data: Array, error: Error|null}>}
   */
  loadActivityLog: async (itemId, limit = 50) => {
    console.log('[GarageStore] loadActivityLog called');
    console.log('[GarageStore] Parameters:', { itemId, limit });
    const startTime = Date.now();
    try {
      const { data, error } = await fetchActivityLogAPI(itemId, limit);
      const duration = Date.now() - startTime;
      
      if (error) {
        console.error('[GarageStore] Load activity log error:', error);
        console.log('[GarageStore] loadActivityLog failed in', duration, 'ms');
        return { data: null, error };
      }
      
      console.log('[GarageStore] Activity log fetched:', data?.length || 0, 'entries');
      console.log('[GarageStore] loadActivityLog completed in', duration, 'ms');
      return { data: data || [], error: null };
    } catch (err) {
      const duration = Date.now() - startTime;
      console.error('[GarageStore] Exception loading activity log:', err);
      console.error('[GarageStore] Exception stack:', err.stack);
      console.log('[GarageStore] loadActivityLog failed after', duration, 'ms');
      return { data: null, error: err };
    }
  },

  /**
   * Create an activity log entry
   * @param {string} itemId - Item ID (optional)
   * @param {string} action - Action type
   * @param {Object} metadata - Optional metadata
   * @returns {Promise<{data: Object, error: Error|null}>}
   */
  createActivityLog: async (itemId, action, metadata = {}) => {
    console.log('[GarageStore] createActivityLog called');
    console.log('[GarageStore] Parameters:', { itemId, action, metadata });
    const startTime = Date.now();
    try {
      const { data, error } = await createActivityLogAPI(itemId, action, metadata);
      const duration = Date.now() - startTime;
      
      if (error) {
        console.error('[GarageStore] Create activity log error:', error);
        console.log('[GarageStore] createActivityLog failed in', duration, 'ms');
        return { data: null, error };
      }
      
      console.log('[GarageStore] Activity log created successfully');
      console.log('[GarageStore] Activity ID:', data?.id);
      console.log('[GarageStore] createActivityLog completed in', duration, 'ms');
      return { data, error: null };
    } catch (err) {
      const duration = Date.now() - startTime;
      console.error('[GarageStore] Exception creating activity log:', err);
      console.error('[GarageStore] Exception stack:', err.stack);
      console.log('[GarageStore] createActivityLog failed after', duration, 'ms');
      return { data: null, error: err };
    }
  },

  /**
   * Add a tag to a garage item (optimistic)
   * @param {string} itemId - Item ID
   * @param {string} tag - Tag to add
   * @returns {Promise<{data: Object, error: Error|null}>}
   */
  addTag: async (itemId, tag) => {
    const state = get();
    const item = state.items.get(itemId);
    if (!item) {
      return { error: new Error('Item not found') };
    }

    // Optimistic update
    const currentTags = item.tags || [];
    const updatedTags = [...currentTags, tag];
    const updatedItem = { ...item, tags: updatedTags };
    const newItems = new Map(state.items);
    newItems.set(itemId, updatedItem);
    set({ items: newItems });
    saveCache(newItems);

    try {
      const { data, error } = await addTagAPI(itemId, tag);

      if (error) {
        // Rollback
        set({ items: state.items });
        saveCache(state.items);
        return { error };
      }

      // Update tag counts cache
      const newTagCounts = new Map(state.tagCounts);
      const currentCount = newTagCounts.get(tag) || 0;
      newTagCounts.set(tag, currentCount + 1);
      set({ tagCounts: newTagCounts });

      return { data, error: null };
    } catch (err) {
      // Rollback
      set({ items: state.items });
      saveCache(state.items);
      return { error: err };
    }
  },

  /**
   * Remove a tag from a garage item (optimistic)
   * @param {string} itemId - Item ID
   * @param {string} tag - Tag to remove
   * @returns {Promise<{data: Object, error: Error|null}>}
   */
  removeTag: async (itemId, tag) => {
    const state = get();
    const item = state.items.get(itemId);
    if (!item) {
      return { error: new Error('Item not found') };
    }

    // Optimistic update
    const currentTags = item.tags || [];
    const updatedTags = currentTags.filter(t => t !== tag);
    const updatedItem = { ...item, tags: updatedTags };
    const newItems = new Map(state.items);
    newItems.set(itemId, updatedItem);
    set({ items: newItems });
    saveCache(newItems);

    try {
      const { data, error } = await removeTagAPI(itemId, tag);

      if (error) {
        // Rollback
        set({ items: state.items });
        saveCache(state.items);
        return { error };
      }

      // Update tag counts cache
      const newTagCounts = new Map(state.tagCounts);
      const currentCount = newTagCounts.get(tag) || 0;
      if (currentCount > 0) {
        newTagCounts.set(tag, currentCount - 1);
      }
      set({ tagCounts: newTagCounts });

      return { data, error: null };
    } catch (err) {
      // Rollback
      set({ items: state.items });
      saveCache(state.items);
      return { error: err };
    }
  },

  /**
   * Set tags for a garage item (bulk update)
   * @param {string} itemId - Item ID
   * @param {string[]} tags - Array of tags
   * @returns {Promise<{data: Object, error: Error|null}>}
   */
  setItemTags: async (itemId, tags) => {
    const state = get();
    const item = state.items.get(itemId);
    if (!item) {
      return { error: new Error('Item not found') };
    }

    // Optimistic update
    const updatedItem = { ...item, tags: tags || [] };
    const newItems = new Map(state.items);
    newItems.set(itemId, updatedItem);
    set({ items: newItems });
    saveCache(newItems);

    try {
      const { data, error } = await updateItemAPI(itemId, { tags });

      if (error) {
        // Rollback
        set({ items: state.items });
        saveCache(state.items);
        return { error };
      }

      // Update with server response
      const finalItems = new Map(state.items);
      finalItems.set(itemId, data);
      set({ items: finalItems });
      saveCache(finalItems);

      // Invalidate tag counts cache
      set({ tagCounts: new Map() });

      return { data, error: null };
    } catch (err) {
      // Rollback
      set({ items: state.items });
      saveCache(state.items);
      return { error: err };
    }
  },

  /**
   * Load tag counts for filtering UI
   * @returns {Promise<{data: Map<string, number>, error: Error|null}>}
   */
  loadTagCounts: async () => {
    const state = get();
    
    // Use cache if available
    if (state.tagCounts.size > 0) {
      return { data: state.tagCounts, error: null };
    }

    try {
      const { data, error } = await getAllTagsAPI();

      if (error) {
        return { data: null, error };
      }

      // Convert to Map
      const tagCountsMap = new Map();
      (data || []).forEach(({ tag, count }) => {
        tagCountsMap.set(tag, count);
      });

      set({ tagCounts: tagCountsMap });
      return { data: tagCountsMap, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  },

  /**
   * Reset store to initial state
   */
  reset: () => {
    set({
      items: new Map(),
      filters: { state: null, model: null, search: '', tags: [], tagMode: 'OR' },
      pagination: { page: 1, pageSize: 20, hasMore: true, totalCount: 0 },
      loading: false,
      initialLoadComplete: false,
      error: null,
      selectedItemId: null,
      versions: new Map(),
      shareLinks: new Map(),
      milestones: new Map(),
      tagCounts: new Map()
    });
    get().unsubscribeRealtime();
    localStorage.removeItem(STORAGE_KEY);
  }
}));

