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

  const { state = null, model = null, search = '', dateRange = null, dateField = 'created_at', priceMin = null, priceMax = null } = filters;
  const { page = 1, pageSize = 20 } = pagination;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = client
    .from('garage_items')
    .select('*', { count: 'exact' })
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

  // Note: Search is handled client-side after fetching to avoid PostgREST or() complexity
  // If you need server-side search, consider using PostgreSQL full-text search or a computed column

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
    return { data: data || [], error: null, count: count || 0 };
  } catch (err) {
    console.error('[API] Exception in fetchGarage:', err);
    return { data: null, error: err, count: 0 };
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
    thumbnail_url = null
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

    // Insert garage item
    const { data, error: insertError } = await client
      .from('garage_items')
      .insert({
        owner_id: user.id,
        title,
        description,
        vehicle_model,
        state,
        config_payload,
        schema_version: config_payload.schemaVersion || 1,
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
        snapshot: config_payload,
        diff_summary: []
      });
    }

    return { data, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

/**
 * Update garage item state
 * @param {string} itemId - Garage item ID
 * @param {string} newState - New state (saved, purchased, prototype, wishlist)
 * @returns {Promise<{data: Object, error: Error|null}>}
 */
export async function updateGarageState(itemId, newState) {
  const { client, error } = ensureClient();
  if (error) return { data: null, error };

  const validStates = ['saved', 'purchased', 'prototype', 'wishlist'];
  if (!validStates.includes(newState)) {
    return { data: null, error: new Error(`Invalid state: ${newState}`) };
  }

  try {
    const { data, error: updateError } = await client
      .from('garage_items')
      .update({ state: newState, updated_at: new Date().toISOString() })
      .eq('id', itemId)
      .select()
      .single();

    if (updateError) {
      return { data: null, error: updateError };
    }

    return { data, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

/**
 * Update garage item (title, description, etc.)
 * @param {string} itemId - Garage item ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<{data: Object, error: Error|null}>}
 */
export async function updateGarageItem(itemId, updates) {
  const { client, error } = ensureClient();
  if (error) return { data: null, error };

  try {
    const { data, error: updateError } = await client
      .from('garage_items')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', itemId)
      .select()
      .single();

    if (updateError) {
      return { data: null, error: updateError };
    }

    return { data, error: null };
  } catch (err) {
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
 * Fetch version history for a garage item
 * @param {string} itemId - Garage item ID
 * @returns {Promise<{data: Array, error: Error|null}>}
 */
export async function fetchGarageVersions(itemId) {
  const { client, error } = ensureClient();
  if (error) return { data: null, error };

  try {
    const { data, error: queryError } = await client
      .from('garage_versions')
      .select('*')
      .eq('garage_item_id', itemId)
      .order('version_number', { ascending: false });

    if (queryError) {
      return { data: null, error: queryError };
    }

    return { data: data || [], error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

