import { supabase } from '../../../lib/supabaseClient';

// Request deduplication cache
const requestCache = new Map();

/**
 * Fetch manifest by slug
 * @param {string} manifestSlug - Manifest slug identifier
 * @returns {Promise<{data: object|null, error: Error|null}>}
 */
export async function fetchManifest(manifestSlug) {
  const cacheKey = `manifest:${manifestSlug}`;
  
  // Check cache
  if (requestCache.has(cacheKey)) {
    return requestCache.get(cacheKey);
  }
  
  const promise = (async () => {
    try {
      const { data, error } = await supabase
        .from('config_2d_manifests')
        .select('*')
        .eq('slug', manifestSlug)
        .eq('status', 'published')
        .single();
      
      if (error) throw error;
      
      return { data: data?.data || null, error: null };
    } catch (error) {
      console.error('[Configurator API] Error fetching manifest:', error);
      return { data: null, error };
    }
  })();
  
  requestCache.set(cacheKey, promise);
  
  // Clear cache after 5 minutes
  setTimeout(() => requestCache.delete(cacheKey), 5 * 60 * 1000);
  
  return promise;
}

/**
 * Fetch published manifest by vehicle slug
 * @param {string} vehicleSlug - Vehicle slug identifier
 * @returns {Promise<{data: object|null, error: Error|null}>}
 */
export async function fetchPublishedManifestByVehicle(vehicleSlug) {
  try {
    // First, find vehicle by slug
    const { data: vehicle, error: vehicleError } = await supabase
      .from('vehicles')
      .select('id, name')
      .eq('slug', vehicleSlug)
      .single();
    
    if (vehicleError) throw vehicleError;
    
    // Find manifest linked to vehicle (by vehicle name or slug in metadata)
    const { data, error } = await supabase
      .from('config_2d_manifests')
      .select('*')
      .eq('status', 'published')
      .or(`data->>'vehicleModel'.eq.${vehicleSlug},data->>'vehicleModel'.eq.${vehicle.name}`)
      .order('version', { ascending: false })
      .limit(1)
      .single();
    
    if (error) throw error;
    
    return { data: data?.data || null, error: null };
  } catch (error) {
    console.error('[Configurator API] Error fetching manifest by vehicle:', error);
    return { data: null, error };
  }
}

/**
 * Fetch vehicle options via RPC
 * @param {string} vehicleId - Vehicle UUID
 * @returns {Promise<{data: Array|null, error: Error|null}>}
 */
export async function fetchVehicleOptions(vehicleId, bypassCache = false) {
  console.log('[Configurator API] ===== FETCHING VEHICLE OPTIONS =====');
  console.log('[Configurator API] Vehicle ID:', vehicleId);
  console.log('[Configurator API] Bypass cache:', bypassCache);
  
  const cacheKey = `options:${vehicleId}`;
  
  if (!bypassCache && requestCache.has(cacheKey)) {
    console.log('[Configurator API] Returning cached options');
    const cached = await requestCache.get(cacheKey);
    console.log('[Configurator API] Cached options count:', cached.data?.length || 0);
    return cached;
  }
  
  if (bypassCache) {
    console.log('[Configurator API] Cache bypassed, clearing cache');
    requestCache.delete(cacheKey);
  }
  
  const promise = (async () => {
    try {
      // Try RPC first
      console.log('[Configurator API] Attempting RPC call: get_configurator_options');
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_configurator_options', {
        p_vehicle_id: vehicleId
      });
      
      console.log('[Configurator API] RPC response:', {
        hasData: !!rpcData,
        dataLength: rpcData?.length || 0,
        error: rpcError,
        data: rpcData
      });
      
      if (!rpcError && rpcData && rpcData.length > 0) {
        console.log('[Configurator API] RPC returned', rpcData.length, 'options');
        console.log('[Configurator API] RPC options:', rpcData.map(o => ({ code: o.code, label: o.label, group: o.configurator_group })));
        return { data: rpcData, error: null };
      }
      
      // Fallback: Query vehicle_options directly
      console.warn('[Configurator API] RPC returned no data or error, falling back to direct query');
      console.log('[Configurator API] Direct query: vehicle_options table');
      console.log('[Configurator API] Query filters: vehicle_id =', vehicleId, ', configurator_visible IS NULL OR configurator_visible = true');
      
      const { data, error } = await supabase
        .from('vehicle_options')
        .select('id, category, code, label, description, price_cents, currency, configurator_group, configurator_order, configurator_metadata, configurator_image_url, configurator_visible')
        .eq('vehicle_id', vehicleId)
        .or('configurator_visible.is.null,configurator_visible.eq.true')
        .order('configurator_group', { ascending: true })
        .order('configurator_order', { ascending: true });
      
      console.log('[Configurator API] Direct query response:', {
        hasData: !!data,
        dataLength: data?.length || 0,
        error: error,
        data: data
      });
      
      if (data && data.length > 0) {
        console.log('[Configurator API] Direct query returned', data.length, 'options');
        console.log('[Configurator API] Direct query options:', data.map(o => ({
          code: o.code,
          label: o.label,
          group: o.configurator_group,
          visible: o.configurator_visible,
          category: o.category
        })));
      }
      
      if (error) {
        console.error('[Configurator API] Direct query error:', error);
        throw error;
      }
      
      return { data: data || [], error: null };
    } catch (error) {
      console.error('[Configurator API] Error fetching vehicle options:', error);
      return { data: null, error };
    }
  })();
  
  requestCache.set(cacheKey, promise);
  setTimeout(() => requestCache.delete(cacheKey), 5 * 60 * 1000);
  
  return promise;
}

/**
 * Fetch compatibility rules for a vehicle
 * @param {string} vehicleId - Vehicle UUID
 * @returns {Promise<{data: Array|null, error: Error|null}>}
 */
export async function fetchCompatibilityRules(vehicleId) {
  try {
    // Get all option values for this vehicle
    const { data: options, error: optionsError } = await supabase
      .from('vehicle_options')
      .select('id')
      .eq('vehicle_id', vehicleId);
    
    if (optionsError) throw optionsError;
    
    const optionIds = options.map(opt => opt.id);
    
    // Fetch compatibility rules
    const { data, error } = await supabase
      .from('compatibility_rules')
      .select('*')
      .in('primary_option_value_id', optionIds)
      .or(`secondary_option_value_id.in.(${optionIds.join(',')})`);
    
    if (error) throw error;
    
    return { data: data || [], error: null };
  } catch (error) {
    console.error('[Configurator API] Error fetching compatibility rules:', error);
    return { data: null, error };
  }
}

/**
 * Calculate configuration totals
 * @param {object} selectedOptions - Selected options {optionId: valueId}
 * @param {string} vehicleId - Vehicle UUID
 * @returns {Promise<{data: object|null, error: Error|null}>}
 */
export async function calculateConfigurationTotals(selectedOptions, vehicleId) {
  try {
    // First, create a temporary configuration or use RPC
    // For now, calculate client-side from vehicle_options
    const { data: vehicle, error: vehicleError } = await supabase
      .from('vehicles')
      .select('base_price_cents, currency')
      .eq('id', vehicleId)
      .single();
    
    if (vehicleError) throw vehicleError;
    
    // Get option prices
    const optionIds = Object.keys(selectedOptions);
    const { data: options, error: optionsError } = await supabase
      .from('vehicle_options')
      .select('id, price_cents')
      .in('id', optionIds);
    
    if (optionsError) throw optionsError;
    
    const optionsTotal = options.reduce((sum, opt) => {
      return sum + (opt.price_cents || 0);
    }, 0);
    
    const baseCents = vehicle.base_price_cents || 0;
    const totalCents = baseCents + optionsTotal;
    
    return {
      data: {
        base: baseCents / 100,
        options: optionsTotal / 100,
        taxes: 0,
        incentives: 0,
        total: totalCents / 100,
        currency: vehicle.currency || 'EUR'
      },
      error: null
    };
  } catch (error) {
    console.error('[Configurator API] Error calculating totals:', error);
    return { data: null, error };
  }
}

/**
 * Check compatibility of selected options
 * @param {object} selectedOptions - Selected options {optionId: valueId}
 * @param {string} vehicleId - Vehicle UUID (optional, for context)
 * @returns {Promise<{data: Array|null, error: Error|null}>}
 */
export async function checkCompatibility(selectedOptions, vehicleId) {
  try {
    const { data, error } = await supabase.rpc('check_compatibility', {
      selected_options: selectedOptions
    });
    
    if (error) throw error;
    
    return { data: data || [], error: null };
  } catch (error) {
    console.error('[Configurator API] Error checking compatibility:', error);
    return { data: null, error };
  }
}

/**
 * Save configuration to database
 * @param {object} payload - Configuration payload
 * @param {string} userId - User UUID
 * @returns {Promise<{data: string|null, error: Error|null}>} - Returns config ID
 */
export async function saveConfiguration(payload, userId) {
  try {
    const { data, error } = await supabase
      .from('configurations')
      .insert({
        user_id: userId,
        vehicle_id: payload.vehicleId,
        configurator_payload: payload,
        state: 'draft'
      })
      .select('id')
      .single();
    
    if (error) throw error;
    
    return { data: data.id, error: null };
  } catch (error) {
    console.error('[Configurator API] Error saving configuration:', error);
    return { data: null, error };
  }
}

/**
 * Load configuration by ID
 * @param {string} configId - Configuration UUID
 * @returns {Promise<{data: object|null, error: Error|null}>}
 */
export async function loadConfiguration(configId) {
  try {
    const { data, error } = await supabase
      .from('configurations')
      .select('configurator_payload, vehicle_id')
      .eq('id', configId)
      .single();
    
    if (error) throw error;
    
    return { data: data?.configurator_payload || null, error: null };
  } catch (error) {
    console.error('[Configurator API] Error loading configuration:', error);
    return { data: null, error };
  }
}

/**
 * Fetch presets for a vehicle
 * @param {string} vehicleId - Vehicle UUID
 * @returns {Promise<{data: Array|null, error: Error|null}>}
 */
export async function fetchPresets(vehicleId) {
  try {
    // Find manifest for vehicle
    const { data: vehicle } = await supabase
      .from('vehicles')
      .select('slug, name')
      .eq('id', vehicleId)
      .single();
    
    if (!vehicle) {
      return { data: [], error: null };
    }
    
    // Find presets linked to manifests for this vehicle
    const { data: manifests } = await supabase
      .from('config_2d_manifests')
      .select('id')
      .eq('status', 'published')
      .or(`data->>'vehicleModel'.eq.${vehicle.slug},data->>'vehicleModel'.eq.${vehicle.name}`)
      .limit(1);
    
    if (!manifests || manifests.length === 0) {
      return { data: [], error: null };
    }
    
    const manifestId = manifests[0].id;
    
    const { data, error } = await supabase
      .from('configurator_presets')
      .select('*')
      .eq('manifest_id', manifestId)
      .order('sort_order', { ascending: true });
    
    if (error) throw error;
    
    return { data: data || [], error: null };
  } catch (error) {
    console.error('[Configurator API] Error fetching presets:', error);
    return { data: null, error };
  }
}

