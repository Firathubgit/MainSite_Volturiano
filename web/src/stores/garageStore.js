import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';
import {
  fetchGarage,
  createGarageItem as createItemAPI,
  updateGarageState as updateStateAPI,
  updateGarageItem as updateItemAPI,
  deleteGarageItem as deleteItemAPI
} from '../features/account/api';

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
    priceMax: null // Maximum price in cents
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

      // Update items map
      const itemsMap = new Map();
      data.forEach((item) => {
        itemsMap.set(item.id, item);
      });

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
   * @param {string} itemId - Item ID
   * @param {string} newState - New state
   */
  updateItemState: async (itemId, newState) => {
    return get().updateItem(itemId, { state: newState });
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
    const filtersChanged = 
      newFilterState.state !== currentState.filters.state ||
      newFilterState.model !== currentState.filters.model ||
      newFilterState.search !== currentState.filters.search ||
      newFilterState.dateRange !== currentState.filters.dateRange ||
      newFilterState.dateField !== currentState.filters.dateField ||
      newFilterState.priceMin !== currentState.filters.priceMin ||
      newFilterState.priceMax !== currentState.filters.priceMax;
    
    if (!filtersChanged) {
      console.log('[GarageStore] Filters unchanged, skipping reload');
      return;
    }
    
    // Check if only search changed (client-side filter, no API reload needed)
    const onlySearchChanged = 
      newFilterState.search !== currentState.filters.search &&
      newFilterState.state === currentState.filters.state &&
      newFilterState.model === currentState.filters.model &&
      newFilterState.dateRange === currentState.filters.dateRange &&
      newFilterState.dateField === currentState.filters.dateField &&
      newFilterState.priceMin === currentState.filters.priceMin &&
      newFilterState.priceMax === currentState.filters.priceMax;
    
    // Update filters (this will trigger re-render with filtered items)
    set({
      filters: newFilterState,
      pagination: { ...currentState.pagination, page: 1 } // Reset to first page
    });
    
    // Only reload from API if state or model changed (not search-only)
    if (!onlySearchChanged) {
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
            items.set(newRecord.id, newRecord);
            set({ items });
            saveCache(items);
          } else if (eventType === 'UPDATE' && newRecord) {
            // Update existing item
            const items = new Map(get().items);
            if (newRecord.archived_at) {
              items.delete(newRecord.id);
            } else {
              items.set(newRecord.id, newRecord);
            }
            set({ items });
            saveCache(items);
          } else if (eventType === 'DELETE' && oldRecord) {
            // Remove item
            const items = new Map(get().items);
            items.delete(oldRecord.id);
            set({ items });
            saveCache(items);
          }
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
   * Reset store to initial state
   */
  reset: () => {
    set({
      items: new Map(),
      filters: { state: null, model: null, search: '' },
      pagination: { page: 1, pageSize: 20, hasMore: true, totalCount: 0 },
      loading: false,
      initialLoadComplete: false,
      error: null,
      selectedItemId: null
    });
    get().unsubscribeRealtime();
    localStorage.removeItem(STORAGE_KEY);
  }
}));

