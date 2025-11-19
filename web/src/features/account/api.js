import { supabase } from '../../lib/supabaseClient';

function ensureClient() {
  if (!supabase) {
    return {
      error: new Error('Supabase client is not initialised. Check environment variables.')
    };
  }
  return { client: supabase };
}

export async function signInWithPassword({ email, password }) {
  const { client, error } = ensureClient();
  if (error) return { error };
  return client.auth.signInWithPassword({ email, password });
}

export async function signUpWithEmail({ email, password, fullName }) {
  const { client, error } = ensureClient();
  if (error) return { error };
  return client.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName ?? ''
      }
    }
  });
}

export async function sendPasswordReset(email) {
  const { client, error } = ensureClient();
  if (error) return { error };
  const redirectTo =
    typeof window !== 'undefined'
      ? `${window.location.origin}/account/reset`
      : undefined;
  return client.auth.resetPasswordForEmail(email, { redirectTo });
}

export async function signOut() {
  const { client, error } = ensureClient();
  if (error) return { error };
  
  // Critical: Close all realtime channels BEFORE signing out
  // This prevents signOut from hanging on active websocket connections
  try {
    // Disconnect realtime completely - this closes all channels
    if (client.realtime) {
      // Try to disconnect realtime connection (closes all channels)
      if (typeof client.realtime.disconnect === 'function') {
        client.realtime.disconnect();
      }
      
      // Also try to remove all channels if channels property exists
      if (client.realtime.channels) {
        const channels = Array.from(client.realtime.channels.values() || []);
        channels.forEach((channel) => {
          try {
            client.removeChannel(channel);
          } catch (err) {
            // Ignore errors when removing channels
          }
        });
      }
    }
  } catch (err) {
    // Continue with signOut even if channel cleanup fails
    console.warn('Error cleaning up realtime channels (non-blocking):', err);
  }
  
  // Use global scope to sign out from all devices/sessions
  // Add timeout to prevent hanging - reduced timeout since channels are closed
  try {
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Sign out timeout')), 2000)
    );
    
    const signOutPromise = client.auth.signOut({ scope: 'global' });
    
    return await Promise.race([signOutPromise, timeoutPromise]);
  } catch (err) {
    // If timeout or error, still return error but don't block UI
    return { error: err };
  }
}

export async function fetchProfile(userId) {
  const { client, error } = ensureClient();
  if (error) return { error };
  if (!userId) {
    return { data: null, error: new Error('Missing user id for profile lookup.') };
  }
  return client
    .from('profiles')
    .select('id, display_name, locale, avatar_url, preferences')
    .eq('id', userId)
    .single();
}

/**
 * Build a Supabase query for garage items with filters
 * @param {Object} filters - Filter options
 * @param {string|null} filters.state - Filter by state (saved, purchased, prototype, wishlist)
 * @param {string|null} filters.model - Filter by vehicle model
 * @param {string} filters.search - Search in title/description
 * @param {Object} pagination - Pagination options
 * @param {number} pagination.page - Page number (1-based)
 * @param {number} pagination.pageSize - Items per page
 * @returns {Object} Supabase query builder
 */
function buildGarageQuery(filters = {}, pagination = {}) {
  const { client, error } = ensureClient();
  if (error) return null;

  const { state = null, model = null, search = '', dateRange = null, dateField = 'created_at', priceMin = null, priceMax = null, tags = null, tagMode = 'OR' } = filters;
  const { page = 1, pageSize = 20 } = pagination;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // Include tags in select query
  let query = client
    .from('garage_items')
    .select('*, garage_item_tags(tag)', { count: 'exact' })
    .is('archived_at', null) // Exclude archived items (use .is() for NULL checks)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (state) {
    query = query.eq('state', state);
  }

  if (model) {
    query = query.eq('vehicle_model', model);
  }

  // Apply date range filter
  if (dateRange && dateRange !== 'all') {
    const now = new Date();
    let startDate;
    
    switch (dateRange) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = null;
    }
    
    if (startDate) {
      // Filter by date field (created_at or updated_at)
      query = query.gte(dateField, startDate.toISOString());
    }
  }

  // Apply price range filter
  if (priceMin !== null && priceMin !== undefined) {
    query = query.gte('price_cents', priceMin);
  }
  
  if (priceMax !== null && priceMax !== undefined) {
    query = query.lte('price_cents', priceMax);
  }

  // Apply tag filtering
  // Note: Tag filtering is handled client-side after fetching for flexibility (AND/OR logic)
  // Server-side filtering would require PostgreSQL functions or views
  // The tags filter is passed through but not applied here

  // Note: Search is handled client-side after fetching to avoid PostgREST or() complexity
  // Tag filtering is also handled client-side for flexibility (AND/OR logic)
  // If you need server-side filtering, consider using PostgreSQL functions or views

  return query;
}

/**
 * Fetch garage items with optional filters and pagination
 * @param {Object} filters - Filter options
 * @param {Object} pagination - Pagination options
 * @returns {Promise<{data: Array, error: Error|null, count: number}>}
 */
export async function fetchGarage(filters = {}, pagination = {}) {
  console.log('[API] fetchGarage called with:', { filters, pagination });
  const { client, error } = ensureClient();
  if (error) {
    console.error('[API] Supabase client error:', error);
    return { data: null, error, count: 0 };
  }
  console.log('[API] Supabase client OK, proceeding...');

  try {
    // Check authentication
    console.log('[API] Checking authentication...');
    const authResult = await client.auth.getUser();
    console.log('[API] Auth result:', authResult);
    
    const {
      data: { user },
      error: authError
    } = authResult;
    
    if (authError || !user) {
      console.error('[API] Not authenticated:', authError);
      console.error('[API] User object:', user);
      return { data: null, error: authError || new Error('Not authenticated'), count: 0 };
    }
    console.log('[API] Authenticated as user:', user.id);
    console.log('[API] Fetching garage for user:', user.id);

    const query = buildGarageQuery(filters, pagination);
    if (!query) {
      return { data: null, error: new Error('Failed to build query'), count: 0 };
    }

    console.log('[API] Executing query with filters:', filters);
    console.log('[API] Query will filter by owner_id =', user.id);
    console.log('[API] Query object:', query);
    
    // Add explicit owner_id filter as backup (RLS should handle this, but explicit is safer)
    const queryWithOwner = query.eq('owner_id', user.id);
    console.log('[API] Executing query with explicit owner_id filter...');
    
    console.log('[API] Awaiting query response...');
    const queryResponse = await queryWithOwner;
    console.log('[API] Query response received:', queryResponse);
    
    const { data, error: queryError, count } = queryResponse;

    if (queryError) {
      console.error('[API] Query error:', queryError);
      console.error('[API] Error details:', JSON.stringify(queryError, null, 2));
      return { data: null, error: queryError, count: 0 };
    }

    console.log('[API] Query successful, returned', data?.length || 0, 'items');
    console.log('[API] Count:', count);
    console.log('[API] Data:', data);
    if (data && data.length > 0) {
      console.log('[API] Sample item owner_id:', data[0].owner_id);
      console.log('[API] Authenticated user_id:', user.id);
      console.log('[API] IDs match?', data[0].owner_id === user.id);
    } else {
      console.warn('[API] No items returned for user:', user.id);
      console.warn('[API] This could mean:');
      console.warn('[API] 1. No items exist for this user in the database');
      console.warn('[API] 2. RLS policies are blocking access');
      console.warn('[API] 3. User ID mismatch between auth and database');
    }

    // Normalize tag data structure
    // Transform garage_item_tags array into tags array on each item
    const normalizedData = (data || []).map(item => {
      const tags = (item.garage_item_tags || []).map(tagRow => tagRow.tag);
      return {
        ...item,
        tags: tags,
        garage_item_tags: undefined // Remove original structure
      };
    });

    return { data: normalizedData, error: null, count: count || 0 };
  } catch (err) {
    console.error('[API] Exception in fetchGarage:', err);
    return { data: null, error: err, count: 0 };
  }
}

/**
 * Fetch a single garage item by ID
 * @param {string} itemId - Garage item ID
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function fetchGarageItemById(itemId) {
  const { client, error } = ensureClient();
  if (error) {
    return { data: null, error };
  }

  if (!itemId) {
    return { data: null, error: new Error('Item ID is required') };
  }

  try {
    // Verify authentication
    const {
      data: { user },
      error: authError
    } = await client.auth.getUser();
    
    if (authError || !user) {
      return { data: null, error: authError || new Error('Not authenticated') };
    }

    // Fetch garage item with tags
    const { data, error: queryError } = await client
      .from('garage_items')
      .select('*, garage_item_tags(tag)')
      .eq('id', itemId)
      .eq('owner_id', user.id) // Explicit owner check (RLS will enforce, but explicit is safer)
      .is('archived_at', null) // Exclude archived items
      .single();

    if (queryError) {
      // Check if it's a "not found" error
      if (queryError.code === 'PGRST116') {
        return { data: null, error: new Error('Item not found') };
      }
      return { data: null, error: queryError };
    }

    if (!data) {
      return { data: null, error: new Error('Item not found') };
    }

    // Normalize tag data structure
    const tags = (data.garage_item_tags || []).map(tagRow => tagRow.tag);
    const normalizedData = {
      ...data,
      tags: tags,
      garage_item_tags: undefined // Remove original structure
    };

    return { data: normalizedData, error: null };
  } catch (err) {
    console.error('[API] Exception in fetchGarageItemById:', err);
    return { data: null, error: err };
  }
}

/**
 * Create a new garage item
 * @param {Object} payload - Garage item data
 * @param {string} payload.title - Item title
 * @param {string} payload.description - Optional description
 * @param {string} payload.vehicle_model - Vehicle model name
 * @param {string} payload.state - State (saved, purchased, prototype, wishlist)
 * @param {Object} payload.config_payload - Full configuration JSON
 * @param {number} payload.price_cents - Price in cents
 * @param {string} payload.currency - Currency code (default: EUR)
 * @param {string} payload.thumbnail_url - Optional thumbnail URL
 * @returns {Promise<{data: Object, error: Error|null}>}
 */
export async function createGarageItem(payload) {
  const { client, error } = ensureClient();
  if (error) return { data: null, error };

  const {
    title,
    description = null,
    vehicle_model,
    state = 'wishlist',
    config_payload,
    price_cents = null,
    currency = 'EUR',
    thumbnail_url = null,
    tags = []
  } = payload;

  if (!title || !vehicle_model || !config_payload) {
    return {
      data: null,
      error: new Error('Missing required fields: title, vehicle_model, config_payload')
    };
  }

  try {
    // Get current user ID
    const {
      data: { user },
      error: authError
    } = await client.auth.getUser();
    if (authError || !user) {
      return { data: null, error: authError || new Error('Not authenticated') };
    }

    // Auto-detect and normalize configurator type
    let normalizedConfig = config_payload;
    try {
      const { detectConfiguratorType, normalizeConfiguratorMetadata } = await import('../../features/garage/utils/configuratorType');
      const detectedType = detectConfiguratorType(config_payload);
      normalizedConfig = normalizeConfiguratorMetadata(config_payload, { detectedType });
    } catch (importError) {
      console.warn('[API] Failed to import configurator type utilities:', importError);
      // Continue without normalization if import fails
    }

    // Insert garage item
    const { data, error: insertError } = await client
      .from('garage_items')
      .insert({
        owner_id: user.id,
        title,
        description,
        vehicle_model,
        state,
        config_payload: normalizedConfig,
        schema_version: normalizedConfig.schemaVersion || 1,
        price_cents,
        currency,
        thumbnail_url
      })
      .select()
      .single();

    if (insertError) {
      return { data: null, error: insertError };
    }

    // Create initial version entry
    if (data) {
      await client.from('garage_versions').insert({
        garage_item_id: data.id,
        version_number: 1,
        snapshot: normalizedConfig,
        diff_summary: []
      });

      // Insert tags if provided
      if (Array.isArray(tags) && tags.length > 0) {
        try {
          const { normalizeTag, isValidTag } = await import('../../features/garage/utils/tagConstants');
          const normalizedTags = tags
            .map(tag => normalizeTag(tag))
            .filter(tag => tag && isValidTag(tag));
          
          if (normalizedTags.length > 0) {
            const tagInserts = normalizedTags.map(tag => ({
              garage_item_id: data.id,
              tag: tag
            }));
            
            const { error: tagError } = await client
              .from('garage_item_tags')
              .insert(tagInserts);
            
            if (tagError) {
              console.warn('[API] Failed to insert tags:', tagError);
              // Don't fail the entire operation if tags fail
            } else {
              // Add tags to returned data
              data.tags = normalizedTags;
            }
          }
        } catch (tagImportError) {
          console.warn('[API] Failed to import tag utilities:', tagImportError);
          // Continue without tags
        }
      }
    }

    return { data, error: null };
  } catch (err) {
    console.error('[API] Error creating garage item:', err);
    return { data: null, error: err };
  }
}

/**
 * Update garage item state
 * @param {string} itemId - Garage item ID
 * @param {string} newState - New state (saved, purchased, prototype, wishlist)
 * @returns {Promise<{data: Object, error: Error|null}>}
 */
/**
 * Update garage item state
 * @param {string} itemId - Garage item ID
 * @param {string} newState - New state (saved, purchased, prototype, wishlist, archived)
 * @returns {Promise<{data: Object, error: Error|null}>}
 */
export async function updateGarageState(itemId, newState) {
  console.log('[API] updateGarageState called');
  console.log('[API] Parameters:', { itemId, newState });
  const startTime = Date.now();
  
  const { client, error } = ensureClient();
  if (error) {
    console.error('[API] Supabase client error:', error);
    return { data: null, error };
  }

  // Import validation (dynamic to avoid circular dependencies)
  let validateTransition;
  try {
    const stateTransitions = await import('../../features/garage/utils/stateTransitions');
    validateTransition = stateTransitions.validateTransition;
  } catch (importError) {
    console.warn('[API] Failed to import stateTransitions, using basic validation:', importError);
    // Fallback to basic validation
    const validStates = ['saved', 'purchased', 'prototype', 'wishlist', 'archived'];
    if (!validStates.includes(newState)) {
      return { data: null, error: new Error(`Invalid state: ${newState}`) };
    }
  }

  try {
    // If we have validation, fetch current state and validate transition
    if (validateTransition) {
      const { data: currentItem, error: fetchError } = await client
        .from('garage_items')
        .select('state')
        .eq('id', itemId)
        .single();

      if (fetchError) {
        console.error('[API] Failed to fetch current state:', fetchError);
        return { data: null, error: fetchError };
      }

      try {
        validateTransition(currentItem.state, newState);
        console.log('[API] Transition validated:', currentItem.state, '→', newState);
      } catch (validationError) {
        console.error('[API] Invalid transition:', validationError);
        return { data: null, error: validationError };
      }
    }

    const { data, error: updateError } = await client
      .from('garage_items')
      .update({ state: newState, updated_at: new Date().toISOString() })
      .eq('id', itemId)
      .select()
      .single();
    const duration = Date.now() - startTime;

    if (updateError) {
      console.error('[API] Update error:', updateError);
      console.log('[API] updateGarageState failed in', duration, 'ms');
      return { data: null, error: updateError };
    }

    console.log('[API] State updated successfully');
    console.log('[API] updateGarageState completed in', duration, 'ms');
    return { data, error: null };
  } catch (err) {
    const duration = Date.now() - startTime;
    console.error('[API] Exception updating state:', err);
    console.error('[API] Exception stack:', err.stack);
    console.log('[API] updateGarageState failed after', duration, 'ms');
    return { data: null, error: err };
  }
}

/**
 * Update garage item (title, description, etc.)
 * Automatically creates version snapshot if config_payload changes
 * @param {string} itemId - Garage item ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<{data: Object, error: Error|null}>}
 */
export async function updateGarageItem(itemId, updates) {
  const { client, error } = ensureClient();
  if (error) return { data: null, error };

  try {
    // Get current user for owner verification
    const {
      data: { user },
      error: authError
    } = await client.auth.getUser();
    if (authError || !user) {
      return { data: null, error: authError || new Error('Not authenticated') };
    }

    // Fetch current item to compare config_payload and tags
    const { data: currentItem, error: fetchError } = await client
      .from('garage_items')
      .select('config_payload')
      .eq('id', itemId)
      .eq('owner_id', user.id) // Explicit owner filter
      .is('archived_at', null)
      .single();

    if (fetchError) {
      return { data: null, error: fetchError };
    }

    // Fetch current tags if tags are being updated
    let currentTags = [];
    if (updates.tags !== undefined) {
      const { data: tagData, error: tagFetchError } = await client
        .from('garage_item_tags')
        .select('tag')
        .eq('garage_item_id', itemId);
      
      if (!tagFetchError && tagData) {
        currentTags = tagData.map(row => row.tag);
      }
    }

    // Extract tags from updates (don't update garage_items table with tags)
    const { tags: newTags, ...updatesWithoutTags } = updates;
    
    // Normalize config_payload if it's being updated
    let normalizedUpdates = { ...updatesWithoutTags };
    if (updates.config_payload) {
      try {
        const { detectConfiguratorType, normalizeConfiguratorMetadata } = await import('../../features/garage/utils/configuratorType');
        const detectedType = detectConfiguratorType(updates.config_payload);
        normalizedUpdates.config_payload = normalizeConfiguratorMetadata(updates.config_payload, { detectedType });
      } catch (importError) {
        console.warn('[API] Failed to import configurator type utilities:', importError);
        // Continue without normalization if import fails
      }
    }

    // Check if config_payload is being updated
    const configChanged = normalizedUpdates.config_payload && 
      JSON.stringify(currentItem.config_payload) !== JSON.stringify(normalizedUpdates.config_payload);

    // Detect configurator type change
    let configuratorTypeChanged = false;
    if (configChanged) {
      try {
        const { detectConfiguratorType } = await import('../../features/garage/utils/configuratorType');
        const oldType = detectConfiguratorType(currentItem.config_payload);
        const newType = detectConfiguratorType(normalizedUpdates.config_payload);
        configuratorTypeChanged = oldType !== newType && oldType !== 'unknown' && newType !== 'unknown';
      } catch (importError) {
        // Ignore if import fails
      }
    }

    // Update the item
    const { data, error: updateError } = await client
      .from('garage_items')
      .update({ ...normalizedUpdates, updated_at: new Date().toISOString() })
      .eq('id', itemId)
      .eq('owner_id', user.id) // Explicit owner filter
      .select()
      .single();

    if (updateError) {
      return { data: null, error: updateError };
    }

    // If config changed, create version snapshot
    if (configChanged && data) {
      // Import diff utility dynamically to avoid circular dependencies
      const { diffConfig } = await import('../../features/garage/utils/diffConfig');

      // Get latest version number
      const { data: versions, error: versionsError } = await client
        .from('garage_versions')
        .select('version_number')
        .eq('garage_item_id', itemId)
        .order('version_number', { ascending: false })
        .limit(1);

      const nextVersionNumber = versions && versions.length > 0
        ? versions[0].version_number + 1
        : 1;

      // Calculate diff
      const diffSummary = diffConfig(currentItem.config_payload, normalizedUpdates.config_payload);

      // Add conversion note if configurator type changed
      if (configuratorTypeChanged && diffSummary.length > 0) {
        const typeChangeDiff = diffSummary.find(d => d.path === 'configurator.type');
        if (typeChangeDiff && typeChangeDiff.conversionNote) {
          // Note is already in diff summary from diffConfig
        }
      }

      // Create version entry
      const { error: versionError } = await client
        .from('garage_versions')
        .insert({
          garage_item_id: itemId,
          version_number: nextVersionNumber,
          snapshot: normalizedUpdates.config_payload,
          diff_summary: diffSummary
        });

      if (versionError) {
        console.warn('[API] Failed to create version snapshot:', versionError);
        // Don't fail the update if version creation fails
      }
    }

    // Sync tags if provided
    if (newTags !== undefined && data) {
      try {
        const { normalizeTag, isValidTag } = await import('../../features/garage/utils/tagConstants');
        const { getTagDiff } = await import('../../features/garage/utils/tagUtils');
        
        const normalizedNewTags = Array.isArray(newTags)
          ? newTags.map(tag => normalizeTag(tag)).filter(tag => tag && isValidTag(tag))
          : [];
        
        const { toAdd, toRemove } = getTagDiff(currentTags, normalizedNewTags);
        
        // Remove tags
        if (toRemove.length > 0) {
          for (const tag of toRemove) {
            await client
              .from('garage_item_tags')
              .delete()
              .eq('garage_item_id', itemId)
              .eq('tag', tag);
          }
        }
        
        // Add tags
        if (toAdd.length > 0) {
          const tagInserts = toAdd.map(tag => ({
            garage_item_id: itemId,
            tag: tag
          }));
          
          await client
            .from('garage_item_tags')
            .insert(tagInserts);
        }
        
        // Add tags to returned data
        data.tags = normalizedNewTags;
        
        // Create activity log entry if tags changed
        if (toAdd.length > 0 || toRemove.length > 0) {
          try {
            const { createActivityLog } = await import('./api');
            await createActivityLog(itemId, 'tags_updated', {
              added: toAdd,
              removed: toRemove
            });
          } catch (activityError) {
            console.warn('[API] Failed to create activity log for tag changes:', activityError);
            // Don't fail the update if activity log fails
          }
        }
      } catch (tagError) {
        console.warn('[API] Failed to sync tags:', tagError);
        // Don't fail the update if tag sync fails
      }
    }

    return { data, error: null };
  } catch (err) {
    console.error('[API] Error updating garage item:', err);
    return { data: null, error: err };
  }
}

/**
 * Delete (archive) a garage item
 * @param {string} itemId - Garage item ID
 * @returns {Promise<{data: Object, error: Error|null}>}
 */
export async function deleteGarageItem(itemId) {
  console.log('[API] deleteGarageItem called with:', itemId);
  const { client, error } = ensureClient();
  if (error) {
    console.error('[API] Supabase client error:', error);
    return { data: null, error };
  }

  try {
    // Check authentication
    const {
      data: { user },
      error: authError
    } = await client.auth.getUser();
    if (authError || !user) {
      console.error('[API] Not authenticated for delete:', authError);
      return { data: null, error: authError || new Error('Not authenticated') };
    }

    console.log('[API] Archiving item:', itemId, 'for user:', user.id);
    const { data, error: deleteError } = await client
      .from('garage_items')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', itemId)
      .eq('owner_id', user.id) // Ensure user owns the item
      .select()
      .single();

    if (deleteError) {
      console.error('[API] Delete error:', deleteError);
      return { data: null, error: deleteError };
    }

    console.log('[API] Item archived successfully:', data);
    return { data, error: null };
  } catch (err) {
    console.error('[API] Delete exception:', err);
    return { data: null, error: err };
  }
}

/**
 * Fetch version history for a garage item from Supabase
 * 
 * Fetches all versions for a garage item from the garage_versions table in Supabase.
 * Includes ownership verification to ensure users can only access their own versions.
 * 
 * @param {string} itemId - Garage item ID
 * @returns {Promise<{data: Array, error: Error|null}>}
 * 
 * Data source: Supabase `garage_versions` table
 */
export async function fetchGarageVersions(itemId) {
  console.log('[API] fetchGarageVersions called with itemId:', itemId);
  const { client, error } = ensureClient();
  if (error) {
    console.error('[API] Supabase client error:', error);
    return { data: null, error };
  }

  try {
    console.log('[API] Checking authentication...');
    // Verify ownership through garage_items table
    const {
      data: { user },
      error: authError
    } = await client.auth.getUser();
    if (authError || !user) {
      console.error('[API] Auth check failed:', authError, 'User:', user);
      return { data: null, error: authError || new Error('Not authenticated') };
    }
    console.log('[API] Authenticated user:', user.id);

    // Verify item ownership
    console.log('[API] Verifying item ownership for itemId:', itemId);
    const { data: item, error: itemError } = await client
      .from('garage_items')
      .select('id')
      .eq('id', itemId)
      .eq('owner_id', user.id)
      .is('archived_at', null)
      .single();

    if (itemError || !item) {
      console.error('[API] Item ownership check failed:', itemError, 'Item:', item);
      return { data: null, error: itemError || new Error('Item not found or access denied') };
    }
    console.log('[API] Item ownership verified:', item.id);

    console.log('[API] Fetching versions from garage_versions table...');
    const { data, error: queryError } = await client
      .from('garage_versions')
      .select('*')
      .eq('garage_item_id', itemId)
      .order('version_number', { ascending: false });

    if (queryError) {
      console.error('[API] Query error:', queryError);
      return { data: null, error: queryError };
    }

    console.log('[API] Successfully fetched versions:', data?.length || 0, 'versions');
    if (data && data.length > 0) {
      console.log('[API] Version numbers:', data.map(v => v.version_number));
    }
    return { data: data || [], error: null };
  } catch (err) {
    console.error('[API] Exception fetching garage versions:', err);
    return { data: null, error: err };
  }
}

/**
 * Restore a garage item to a specific version
 * Creates a new version from the restored state
 * @param {string} itemId - Garage item ID
 * @param {number} versionNumber - Version number to restore
 * @returns {Promise<{data: Object, error: Error|null}>}
 */
export async function restoreGarageVersion(itemId, versionNumber) {
  const { client, error } = ensureClient();
  if (error) return { data: null, error };

  try {
    // Get current user for owner verification
    const {
      data: { user },
      error: authError
    } = await client.auth.getUser();
    if (authError || !user) {
      return { data: null, error: authError || new Error('Not authenticated') };
    }

    // Verify item ownership
    const { data: item, error: itemError } = await client
      .from('garage_items')
      .select('id, config_payload')
      .eq('id', itemId)
      .eq('owner_id', user.id) // Explicit owner filter
      .is('archived_at', null)
      .single();

    if (itemError || !item) {
      return { data: null, error: itemError || new Error('Item not found or access denied') };
    }

    // Fetch the version to restore
    const { data: version, error: versionError } = await client
      .from('garage_versions')
      .select('snapshot, version_number')
      .eq('garage_item_id', itemId)
      .eq('version_number', versionNumber)
      .single();

    if (versionError || !version) {
      return { data: null, error: versionError || new Error('Version not found') };
    }

    // Auto-migrate version snapshot if needed
    let restoredSnapshot = version.snapshot;
    try {
      const { autoMigrateConfig } = await import('../../features/garage/utils/migrateConfigs');
      restoredSnapshot = autoMigrateConfig(version.snapshot);
    } catch (migrationError) {
      console.warn('[API] Migration failed for restored version:', migrationError);
      // Continue with original snapshot if migration fails
    }

    // Normalize configurator metadata in restored snapshot
    try {
      const { detectConfiguratorType, normalizeConfiguratorMetadata } = await import('../../features/garage/utils/configuratorType');
      const detectedType = detectConfiguratorType(restoredSnapshot);
      restoredSnapshot = normalizeConfiguratorMetadata(restoredSnapshot, { detectedType });
    } catch (importError) {
      console.warn('[API] Failed to normalize restored snapshot:', importError);
    }

    // Import diff utility
    const { diffConfig } = await import('../../features/garage/utils/diffConfig');

    // Calculate diff between current and restored config
    const diffSummary = diffConfig(item.config_payload, restoredSnapshot);

    // Get next version number
    const { data: versions, error: versionsError } = await client
      .from('garage_versions')
      .select('version_number')
      .eq('garage_item_id', itemId)
      .order('version_number', { ascending: false })
      .limit(1);

    const nextVersionNumber = versions && versions.length > 0
      ? versions[0].version_number + 1
      : 1;

    // Update garage item with restored config (use normalized snapshot)
    const { data: updatedItem, error: updateError } = await client
      .from('garage_items')
      .update({
        config_payload: restoredSnapshot,
        updated_at: new Date().toISOString()
      })
      .eq('id', itemId)
      .eq('owner_id', user.id) // Explicit owner filter
      .select()
      .single();

    if (updateError) {
      return { data: null, error: updateError };
    }

    // Create new version entry for the restore (use normalized snapshot)
    const { error: versionCreateError } = await client
      .from('garage_versions')
      .insert({
        garage_item_id: itemId,
        version_number: nextVersionNumber,
        snapshot: restoredSnapshot,
        diff_summary: diffSummary
      });

    if (versionCreateError) {
      console.warn('[API] Failed to create version snapshot for restore:', versionCreateError);
      // Don't fail the restore if version creation fails
    }

    return { data: updatedItem, error: null };
  } catch (err) {
    console.error('[API] Error restoring garage version:', err);
    return { data: null, error: err };
  }
}

/**
 * Create a share link for a garage item
 * @param {string} itemId - Garage item ID
 * @param {Object} options - Share options
 * @param {string} options.privacy - Privacy level: 'public', 'private', 'unlisted'
 * @param {Date} options.expiresAt - Optional expiry date
 * @returns {Promise<{data: Object, error: Error|null}>}
 */
export async function createShareLink(itemId, options = {}) {
  console.log('[API] createShareLink called');
  console.log('[API] Parameters:', { itemId, options });
  const startTime = Date.now();
  
  const { client, error } = ensureClient();
  if (error) {
    console.error('[API] Supabase client error:', error);
    return { data: null, error };
  }

  try {
    const rpcParams = {
      p_garage_item_id: itemId,
      p_privacy: options.privacy || 'unlisted',
      p_expires_at: options.expiresAt || null
    };
    console.log('[API] Calling RPC create_share_link with params:', rpcParams);
    
    const { data, error: rpcError } = await client.rpc('create_share_link', rpcParams);
    const duration = Date.now() - startTime;

    if (rpcError) {
      console.error('[API] create_share_link RPC error:', rpcError);
      console.error('[API] RPC error details:', {
        message: rpcError.message,
        details: rpcError.details,
        hint: rpcError.hint,
        code: rpcError.code
      });
      console.log('[API] createShareLink failed in', duration, 'ms');
      return { data: null, error: rpcError };
    }

    console.log('[API] Share link created successfully');
    console.log('[API] Response data:', {
      id: data?.id,
      share_code: data?.share_code,
      privacy: data?.privacy,
      expires_at: data?.expires_at
    });
    console.log('[API] createShareLink completed in', duration, 'ms');
    return { data, error: null };
  } catch (err) {
    const duration = Date.now() - startTime;
    console.error('[API] Exception creating share link:', err);
    console.error('[API] Exception stack:', err.stack);
    console.log('[API] createShareLink failed after', duration, 'ms');
    return { data: null, error: err };
  }
}

/**
 * Fetch a shared garage item by share code (public access)
 * @param {string} shareCode - Share code
 * @returns {Promise<{data: Object, error: Error|null}>}
 */
export async function fetchSharedItem(shareCode) {
  console.log('[API] fetchSharedItem called');
  console.log('[API] Share code:', shareCode);
  const startTime = Date.now();
  
  const { client, error } = ensureClient();
  if (error) {
    console.error('[API] Supabase client error:', error);
    return { data: null, error };
  }

  try {
    console.log('[API] Calling RPC get_shared_item...');
    const { data, error: rpcError } = await client.rpc('get_shared_item', {
      p_share_code: shareCode
    });
    const duration = Date.now() - startTime;

    if (rpcError) {
      console.error('[API] get_shared_item RPC error:', rpcError);
      console.error('[API] RPC error details:', {
        message: rpcError.message,
        details: rpcError.details,
        hint: rpcError.hint,
        code: rpcError.code
      });
      console.log('[API] fetchSharedItem failed in', duration, 'ms');
      return { data: null, error: rpcError };
    }

    console.log('[API] Shared item fetched successfully');
    console.log('[API] Response data:', {
      item_id: data?.item?.id,
      item_title: data?.item?.title,
      share_code: data?.share_link?.share_code,
      access_count: data?.share_link?.access_count,
      privacy: data?.share_link?.privacy
    });
    console.log('[API] fetchSharedItem completed in', duration, 'ms');
    return { data, error: null };
  } catch (err) {
    const duration = Date.now() - startTime;
    console.error('[API] Exception fetching shared item:', err);
    console.error('[API] Exception stack:', err.stack);
    console.log('[API] fetchSharedItem failed after', duration, 'ms');
    return { data: null, error: err };
  }
}

/**
 * Update share link settings (privacy, expiry)
 * @param {string} shareLinkId - Share link ID
 * @param {Object} settings - Settings to update
 * @param {string} settings.privacy - Privacy level
 * @param {Date} settings.expiresAt - Expiry date (null to remove expiry)
 * @returns {Promise<{data: Object, error: Error|null}>}
 */
export async function updateShareSettings(shareLinkId, settings) {
  console.log('[API] updateShareSettings called');
  console.log('[API] Parameters:', { shareLinkId, settings });
  const startTime = Date.now();
  
  const { client, error } = ensureClient();
  if (error) {
    console.error('[API] Supabase client error:', error);
    return { data: null, error };
  }

  try {
    const rpcParams = {
      p_share_link_id: shareLinkId,
      p_privacy: settings.privacy || null,
      p_expires_at: settings.expiresAt !== undefined ? settings.expiresAt : null
    };
    console.log('[API] Calling RPC update_share_settings with params:', rpcParams);
    
    const { data, error: rpcError } = await client.rpc('update_share_settings', rpcParams);
    const duration = Date.now() - startTime;

    if (rpcError) {
      console.error('[API] update_share_settings RPC error:', rpcError);
      console.error('[API] RPC error details:', {
        message: rpcError.message,
        details: rpcError.details,
        hint: rpcError.hint,
        code: rpcError.code
      });
      console.log('[API] updateShareSettings failed in', duration, 'ms');
      return { data: null, error: rpcError };
    }

    console.log('[API] Share settings updated successfully');
    console.log('[API] Updated data:', {
      id: data?.id,
      privacy: data?.privacy,
      expires_at: data?.expires_at
    });
    console.log('[API] updateShareSettings completed in', duration, 'ms');
    return { data, error: null };
  } catch (err) {
    const duration = Date.now() - startTime;
    console.error('[API] Exception updating share settings:', err);
    console.error('[API] Exception stack:', err.stack);
    console.log('[API] updateShareSettings failed after', duration, 'ms');
    return { data: null, error: err };
  }
}

/**
 * Get all share links for a garage item
 * @param {string} itemId - Garage item ID
 * @returns {Promise<{data: Array, error: Error|null}>}
 */
export async function getShareLinks(itemId) {
  console.log('[API] getShareLinks called');
  console.log('[API] Item ID:', itemId);
  const startTime = Date.now();
  
  const { client, error } = ensureClient();
  if (error) {
    console.error('[API] Supabase client error:', error);
    return { data: null, error };
  }

  try {
    // Verify ownership
    console.log('[API] Verifying authentication...');
    const {
      data: { user },
      error: authError
    } = await client.auth.getUser();
    if (authError || !user) {
      console.error('[API] Authentication failed:', authError || 'No user');
      return { data: null, error: authError || new Error('Not authenticated') };
    }
    console.log('[API] User authenticated:', user.id);

    // Get share links for this item
    console.log('[API] Querying garage_share_links table...');
    const { data, error: queryError } = await client
      .from('garage_share_links')
      .select('*')
      .eq('garage_item_id', itemId)
      .order('created_at', { ascending: false });
    const duration = Date.now() - startTime;

    if (queryError) {
      console.error('[API] Query error:', queryError);
      console.error('[API] Query error details:', {
        message: queryError.message,
        details: queryError.details,
        hint: queryError.hint,
        code: queryError.code
      });
      console.log('[API] getShareLinks failed in', duration, 'ms');
      return { data: null, error: queryError };
    }

    console.log('[API] Share links fetched:', data?.length || 0, 'links');
    if (data && data.length > 0) {
      console.log('[API] Share codes:', data.map(l => l.share_code));
    }
    console.log('[API] getShareLinks completed in', duration, 'ms');
    return { data: data || [], error: null };
  } catch (err) {
    const duration = Date.now() - startTime;
    console.error('[API] Exception getting share links:', err);
    console.error('[API] Exception stack:', err.stack);
    console.log('[API] getShareLinks failed after', duration, 'ms');
    return { data: null, error: err };
  }
}

/**
 * Delete a share link
 * @param {string} shareLinkId - Share link ID
 * @returns {Promise<{data: Object, error: Error|null}>}
 */
export async function deleteShareLink(shareLinkId) {
  console.log('[API] deleteShareLink called');
  console.log('[API] Share link ID:', shareLinkId);
  const startTime = Date.now();
  
  const { client, error } = ensureClient();
  if (error) {
    console.error('[API] Supabase client error:', error);
    return { data: null, error };
  }

  try {
    // Verify ownership through RLS policy
    console.log('[API] Deleting share link from garage_share_links...');
    const { data, error: deleteError } = await client
      .from('garage_share_links')
      .delete()
      .eq('id', shareLinkId)
      .select();
    const duration = Date.now() - startTime;

    if (deleteError) {
      console.error('[API] Delete error:', deleteError);
      console.error('[API] Delete error details:', {
        message: deleteError.message,
        details: deleteError.details,
        hint: deleteError.hint,
        code: deleteError.code
      });
      console.log('[API] deleteShareLink failed in', duration, 'ms');
      return { data: null, error: deleteError };
    }

    console.log('[API] Share link deleted successfully');
    console.log('[API] Deleted link:', {
      id: data?.[0]?.id,
      share_code: data?.[0]?.share_code
    });
    console.log('[API] deleteShareLink completed in', duration, 'ms');
    return { data: data?.[0] || null, error: null };
  } catch (err) {
    const duration = Date.now() - startTime;
    console.error('[API] Exception deleting share link:', err);
    console.error('[API] Exception stack:', err.stack);
    console.log('[API] deleteShareLink failed after', duration, 'ms');
    return { data: null, error: err };
  }
}

/**
 * Create a milestone for a garage item
 * @param {string} itemId - Garage item ID
 * @param {Object} milestoneData - Milestone data
 * @param {string} milestoneData.milestone_type - Type of milestone ('created', 'state_change', 'payment', etc.)
 * @param {string} milestoneData.from_state - Previous state (optional)
 * @param {string} milestoneData.to_state - New state (optional)
 * @param {string} milestoneData.note - Optional note
 * @param {Object} milestoneData.metadata - Optional metadata (jsonb)
 * @returns {Promise<{data: Object, error: Error|null}>}
 */
export async function createMilestone(itemId, milestoneData) {
  console.log('[API] createMilestone called');
  console.log('[API] Parameters:', { itemId, milestoneData });
  const startTime = Date.now();
  
  const { client, error } = ensureClient();
  if (error) {
    console.error('[API] Supabase client error:', error);
    return { data: null, error };
  }

  try {
    // Verify authentication
    const {
      data: { user },
      error: authError
    } = await client.auth.getUser();
    if (authError || !user) {
      console.error('[API] Authentication failed:', authError || 'No user');
      return { data: null, error: authError || new Error('Not authenticated') };
    }

    // Verify ownership via RLS (will be enforced by policy)
    const { data, error: insertError } = await client
      .from('garage_milestones')
      .insert({
        garage_item_id: itemId,
        milestone_type: milestoneData.milestone_type,
        from_state: milestoneData.from_state || null,
        to_state: milestoneData.to_state || null,
        note: milestoneData.note || null,
        metadata: milestoneData.metadata || null,
        occurred_at: milestoneData.occurred_at || new Date().toISOString()
      })
      .select()
      .single();
    const duration = Date.now() - startTime;

    if (insertError) {
      console.error('[API] Insert error:', insertError);
      console.error('[API] Insert error details:', {
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        code: insertError.code
      });
      console.log('[API] createMilestone failed in', duration, 'ms');
      return { data: null, error: insertError };
    }

    console.log('[API] Milestone created successfully');
    console.log('[API] Milestone ID:', data?.id);
    console.log('[API] createMilestone completed in', duration, 'ms');
    return { data, error: null };
  } catch (err) {
    const duration = Date.now() - startTime;
    console.error('[API] Exception creating milestone:', err);
    console.error('[API] Exception stack:', err.stack);
    console.log('[API] createMilestone failed after', duration, 'ms');
    return { data: null, error: err };
  }
}

/**
 * Fetch milestones for a garage item
 * @param {string} itemId - Garage item ID
 * @param {Object} options - Fetch options
 * @param {string} options.order - Order direction: 'asc' (oldest first) or 'desc' (newest first), default: 'desc'
 * @param {string|null} options.type - Filter by milestone type, default: null (all types)
 * @returns {Promise<{data: Array, error: Error|null}>}
 */
export async function fetchMilestones(itemId, options = {}) {
  const { order = 'desc', type = null } = options;
  console.log('[API] fetchMilestones called');
  console.log('[API] Item ID:', itemId, 'Options:', { order, type });
  const startTime = Date.now();
  
  const { client, error } = ensureClient();
  if (error) {
    console.error('[API] Supabase client error:', error);
    return { data: null, error };
  }

  try {
    // Verify authentication
    const {
      data: { user },
      error: authError
    } = await client.auth.getUser();
    if (authError || !user) {
      console.error('[API] Authentication failed:', authError || 'No user');
      return { data: null, error: authError || new Error('Not authenticated') };
    }

    // Build query
    let query = client
      .from('garage_milestones')
      .select('*')
      .eq('garage_item_id', itemId);
    
    // Apply type filter if provided
    if (type) {
      query = query.eq('milestone_type', type);
    }
    
    // Apply ordering
    query = query.order('occurred_at', { ascending: order === 'asc' });
    
    const { data, error: queryError } = await query;
    const duration = Date.now() - startTime;

    if (queryError) {
      console.error('[API] Query error:', queryError);
      console.error('[API] Query error details:', {
        message: queryError.message,
        details: queryError.details,
        hint: queryError.hint,
        code: queryError.code
      });
      console.log('[API] fetchMilestones failed in', duration, 'ms');
      return { data: null, error: queryError };
    }

    console.log('[API] Milestones fetched:', data?.length || 0, 'milestones');
    console.log('[API] fetchMilestones completed in', duration, 'ms');
    return { data: data || [], error: null };
  } catch (err) {
    const duration = Date.now() - startTime;
    console.error('[API] Exception fetching milestones:', err);
    console.error('[API] Exception stack:', err.stack);
    console.log('[API] fetchMilestones failed after', duration, 'ms');
    return { data: null, error: err };
  }
}

/**
 * Create an activity log entry for a garage item
 * @param {string} itemId - Garage item ID (optional, can be null for global activities)
 * @param {string} action - Action type ('created', 'updated', 'deleted', 'state_changed', 'shared', etc.)
 * @param {Object} metadata - Optional metadata (jsonb)
 * @returns {Promise<{data: Object, error: Error|null}>}
 */
export async function createActivityLog(itemId, action, metadata = {}) {
  console.log('[API] createActivityLog called');
  console.log('[API] Parameters:', { itemId, action, metadata });
  const startTime = Date.now();
  
  const { client, error } = ensureClient();
  if (error) {
    console.error('[API] Supabase client error:', error);
    return { data: null, error };
  }

  try {
    // Verify authentication
    const {
      data: { user },
      error: authError
    } = await client.auth.getUser();
    if (authError || !user) {
      console.error('[API] Authentication failed:', authError || 'No user');
      return { data: null, error: authError || new Error('Not authenticated') };
    }

    // Insert activity log (RLS will enforce ownership if itemId provided)
    const { data, error: insertError } = await client
      .from('garage_activity')
      .insert({
        garage_item_id: itemId || null,
        actor_id: user.id,
        action,
        metadata: metadata || null
      })
      .select()
      .single();
    const duration = Date.now() - startTime;

    if (insertError) {
      console.error('[API] Insert error:', insertError);
      console.error('[API] Insert error details:', {
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        code: insertError.code
      });
      console.log('[API] createActivityLog failed in', duration, 'ms');
      return { data: null, error: insertError };
    }

    console.log('[API] Activity log created successfully');
    console.log('[API] Activity ID:', data?.id);
    console.log('[API] createActivityLog completed in', duration, 'ms');
    return { data, error: null };
  } catch (err) {
    const duration = Date.now() - startTime;
    console.error('[API] Exception creating activity log:', err);
    console.error('[API] Exception stack:', err.stack);
    console.log('[API] createActivityLog failed after', duration, 'ms');
    return { data: null, error: err };
  }
}

/**
 * Fetch activity log for a garage item
 * @param {string} itemId - Garage item ID
 * @param {number} limit - Maximum number of entries to return (default: 50)
 * @returns {Promise<{data: Array, error: Error|null}>}
 */
export async function fetchActivityLog(itemId, limit = 50) {
  console.log('[API] fetchActivityLog called');
  console.log('[API] Parameters:', { itemId, limit });
  const startTime = Date.now();
  
  const { client, error } = ensureClient();
  if (error) {
    console.error('[API] Supabase client error:', error);
    return { data: null, error };
  }

  try {
    // Verify authentication
    const {
      data: { user },
      error: authError
    } = await client.auth.getUser();
    if (authError || !user) {
      console.error('[API] Authentication failed:', authError || 'No user');
      return { data: null, error: authError || new Error('Not authenticated') };
    }

    // Fetch activity log (RLS will enforce ownership)
    const { data, error: queryError } = await client
      .from('garage_activity')
      .select('*')
      .eq('garage_item_id', itemId)
      .order('created_at', { ascending: false })
      .limit(limit);
    const duration = Date.now() - startTime;

    if (queryError) {
      console.error('[API] Query error:', queryError);
      console.error('[API] Query error details:', {
        message: queryError.message,
        details: queryError.details,
        hint: queryError.hint,
        code: queryError.code
      });
      console.log('[API] fetchActivityLog failed in', duration, 'ms');
      return { data: null, error: queryError };
    }

    console.log('[API] Activity log fetched:', data?.length || 0, 'entries');
    console.log('[API] fetchActivityLog completed in', duration, 'ms');
    return { data: data || [], error: null };
  } catch (err) {
    const duration = Date.now() - startTime;
    console.error('[API] Exception fetching activity log:', err);
    console.error('[API] Exception stack:', err.stack);
    console.log('[API] fetchActivityLog failed after', duration, 'ms');
    return { data: null, error: err };
  }
}

/**
 * Add a tag to a garage item
 * @param {string} itemId - Garage item ID
 * @param {string} tag - Tag to add
 * @returns {Promise<{data: Object, error: Error|null}>}
 */
export async function addTag(itemId, tag) {
  console.log('[API] addTag called');
  console.log('[API] Parameters:', { itemId, tag });
  const startTime = Date.now();
  
  const { client, error } = ensureClient();
  if (error) {
    console.error('[API] Supabase client error:', error);
    return { data: null, error };
  }

  try {
    // Import tag utilities
    const { normalizeTag, isValidTag } = await import('../../features/garage/utils/tagConstants');
    
    // Normalize and validate tag
    const normalizedTag = normalizeTag(tag);
    if (!normalizedTag) {
      return { data: null, error: new Error('Invalid tag format') };
    }
    
    if (!isValidTag(normalizedTag)) {
      return { data: null, error: new Error(`Tag "${normalizedTag}" is not a valid predefined tag`) };
    }

    // Verify authentication
    const {
      data: { user },
      error: authError
    } = await client.auth.getUser();
    if (authError || !user) {
      console.error('[API] Authentication failed:', authError || 'No user');
      return { data: null, error: authError || new Error('Not authenticated') };
    }

    // Verify item ownership (RLS will enforce, but explicit check is safer)
    const { data: item, error: itemError } = await client
      .from('garage_items')
      .select('id')
      .eq('id', itemId)
      .eq('owner_id', user.id)
      .is('archived_at', null)
      .single();

    if (itemError || !item) {
      console.error('[API] Item ownership check failed:', itemError);
      return { data: null, error: itemError || new Error('Item not found or access denied') };
    }

    // Insert tag (duplicate will be prevented by primary key constraint)
    const { data, error: insertError } = await client
      .from('garage_item_tags')
      .insert({
        garage_item_id: itemId,
        tag: normalizedTag
      })
      .select()
      .single();
    const duration = Date.now() - startTime;

    if (insertError) {
      // Check if it's a duplicate key error (23505 is PostgreSQL unique violation)
      if (insertError.code === '23505') {
        console.log('[API] Tag already exists (non-error)');
        // Return success since tag already exists
        return { data: { garage_item_id: itemId, tag: normalizedTag }, error: null };
      }
      console.error('[API] Insert error:', insertError);
      console.log('[API] addTag failed in', duration, 'ms');
      return { data: null, error: insertError };
    }

    console.log('[API] Tag added successfully');
    console.log('[API] addTag completed in', duration, 'ms');
    return { data, error: null };
  } catch (err) {
    const duration = Date.now() - startTime;
    console.error('[API] Exception adding tag:', err);
    console.log('[API] addTag failed after', duration, 'ms');
    return { data: null, error: err };
  }
}

/**
 * Remove a tag from a garage item
 * @param {string} itemId - Garage item ID
 * @param {string} tag - Tag to remove
 * @returns {Promise<{data: Object, error: Error|null}>}
 */
export async function removeTag(itemId, tag) {
  console.log('[API] removeTag called');
  console.log('[API] Parameters:', { itemId, tag });
  const startTime = Date.now();
  
  const { client, error } = ensureClient();
  if (error) {
    console.error('[API] Supabase client error:', error);
    return { data: null, error };
  }

  try {
    // Import tag utilities
    const { normalizeTag } = await import('../../features/garage/utils/tagConstants');
    
    // Normalize tag
    const normalizedTag = normalizeTag(tag);
    if (!normalizedTag) {
      return { data: null, error: new Error('Invalid tag format') };
    }

    // Verify authentication
    const {
      data: { user },
      error: authError
    } = await client.auth.getUser();
    if (authError || !user) {
      console.error('[API] Authentication failed:', authError || 'No user');
      return { data: null, error: authError || new Error('Not authenticated') };
    }

    // Verify item ownership through join (RLS will enforce)
    const { data: deleted, error: deleteError } = await client
      .from('garage_item_tags')
      .delete()
      .eq('garage_item_id', itemId)
      .eq('tag', normalizedTag)
      .select();
    const duration = Date.now() - startTime;

    if (deleteError) {
      console.error('[API] Delete error:', deleteError);
      console.log('[API] removeTag failed in', duration, 'ms');
      return { data: null, error: deleteError };
    }

    console.log('[API] Tag removed successfully');
    console.log('[API] removeTag completed in', duration, 'ms');
    return { data: deleted?.[0] || null, error: null };
  } catch (err) {
    const duration = Date.now() - startTime;
    console.error('[API] Exception removing tag:', err);
    console.log('[API] removeTag failed after', duration, 'ms');
    return { data: null, error: err };
  }
}

/**
 * Get all tags for a garage item
 * @param {string} itemId - Garage item ID
 * @returns {Promise<{data: string[], error: Error|null}>}
 */
export async function getTags(itemId) {
  console.log('[API] getTags called');
  console.log('[API] Item ID:', itemId);
  const startTime = Date.now();
  
  const { client, error } = ensureClient();
  if (error) {
    console.error('[API] Supabase client error:', error);
    return { data: null, error };
  }

  try {
    // Verify authentication
    const {
      data: { user },
      error: authError
    } = await client.auth.getUser();
    if (authError || !user) {
      console.error('[API] Authentication failed:', authError || 'No user');
      return { data: null, error: authError || new Error('Not authenticated') };
    }

    // Verify item ownership
    const { data: item, error: itemError } = await client
      .from('garage_items')
      .select('id')
      .eq('id', itemId)
      .eq('owner_id', user.id)
      .is('archived_at', null)
      .single();

    if (itemError || !item) {
      console.error('[API] Item ownership check failed:', itemError);
      return { data: null, error: itemError || new Error('Item not found or access denied') };
    }

    // Fetch tags
    const { data, error: queryError } = await client
      .from('garage_item_tags')
      .select('tag')
      .eq('garage_item_id', itemId);
    const duration = Date.now() - startTime;

    if (queryError) {
      console.error('[API] Query error:', queryError);
      console.log('[API] getTags failed in', duration, 'ms');
      return { data: null, error: queryError };
    }

    // Extract tag strings from response
    const tags = (data || []).map(row => row.tag);
    console.log('[API] Tags fetched:', tags.length, 'tags');
    console.log('[API] getTags completed in', duration, 'ms');
    return { data: tags, error: null };
  } catch (err) {
    const duration = Date.now() - startTime;
    console.error('[API] Exception fetching tags:', err);
    console.log('[API] getTags failed after', duration, 'ms');
    return { data: null, error: err };
  }
}

/**
 * Get all unique tags across user's garage items with counts
 * @returns {Promise<{data: Array<{tag: string, count: number}>, error: Error|null}>}
 */
export async function getAllTags() {
  console.log('[API] getAllTags called');
  const startTime = Date.now();
  
  const { client, error } = ensureClient();
  if (error) {
    console.error('[API] Supabase client error:', error);
    return { data: null, error };
  }

  try {
    // Verify authentication
    const {
      data: { user },
      error: authError
    } = await client.auth.getUser();
    if (authError || !user) {
      console.error('[API] Authentication failed:', authError || 'No user');
      return { data: null, error: authError || new Error('Not authenticated') };
    }

    // Fetch all tags for user's items
    // First get all user's item IDs, then get tags for those items
    const { data: userItems, error: itemsError } = await client
      .from('garage_items')
      .select('id')
      .eq('owner_id', user.id)
      .is('archived_at', null);
    
    if (itemsError) {
      console.error('[API] Failed to fetch user items:', itemsError);
      const duration = Date.now() - startTime;
      console.log('[API] getAllTags failed in', duration, 'ms');
      return { data: null, error: itemsError };
    }
    
    const itemIds = (userItems || []).map(item => item.id);
    
    if (itemIds.length === 0) {
      const duration = Date.now() - startTime;
      console.log('[API] No items found, returning empty tags');
      console.log('[API] getAllTags completed in', duration, 'ms');
      return { data: [], error: null };
    }
    
    // Fetch tags for user's items
    const { data, error: queryError } = await client
      .from('garage_item_tags')
      .select('tag')
      .in('garage_item_id', itemIds);
    const duration = Date.now() - startTime;

    if (queryError) {
      console.error('[API] Query error:', queryError);
      console.log('[API] getAllTags failed in', duration, 'ms');
      return { data: null, error: queryError };
    }

    // Count tags
    const tagCounts = new Map();
    (data || []).forEach(row => {
      const tag = row.tag;
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    });

    // Convert to array format
    const result = Array.from(tagCounts.entries()).map(([tag, count]) => ({
      tag,
      count
    })).sort((a, b) => b.count - a.count); // Sort by count descending

    console.log('[API] Tag counts fetched:', result.length, 'unique tags');
    console.log('[API] getAllTags completed in', duration, 'ms');
    return { data: result, error: null };
  } catch (err) {
    const duration = Date.now() - startTime;
    console.error('[API] Exception fetching all tags:', err);
    console.log('[API] getAllTags failed after', duration, 'ms');
    return { data: null, error: err };
  }
}

