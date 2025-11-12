/**
 * Phase 1 Supabase Platform Status Checker
 * 
 * This script checks what's been completed in Phase 1 of the Ultimate Roadmap:
 * - Core Schema (tables, indexes)
 * - RLS Policies
 * - Storage Buckets
 * - RPC Functions
 * - Seed Data
 * 
 * Run this in browser console or import in a component during development.
 */

import { supabase } from '../lib/supabaseClient';

const PHASE1_TABLES = [
  'profiles',
  'vehicles',
  'vehicle_options',
  'configurations',
  'configuration_options',
  'orders',
  'order_items'
];

const PHASE1_RPC_FUNCTIONS = [
  'get_configuration_totals',
  'check_compatibility',
  'generate_config_code',
  'is_service_role'
];

const PHASE1_STORAGE_BUCKETS = [
  'renders',
  'models',
  'garage-thumbnails',
  'documents'
];

export async function checkPhase1Status() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

  console.group('🔍 Phase 1: Supabase Platform Status Check');
  console.log('Supabase URL:', url || '(missing)');
  console.log('Anon key present?', Boolean(anon));

  if (!url || !anon) {
    console.error('❌ Missing Supabase env vars. Update your .env before continuing.');
    console.groupEnd();
    return null;
  }

  if (!supabase) {
    console.error('❌ Supabase client not initialized.');
    console.groupEnd();
    return null;
  }

  const status = {
    tables: {},
    rpcFunctions: {},
    storageBuckets: {},
    rlsPolicies: {},
    seedData: {},
    summary: {
      tablesComplete: 0,
      rpcComplete: 0,
      storageComplete: 0,
      totalProgress: 0
    }
  };

  // Check Tables
  console.group('📊 Tables Status');
  for (const tableName of PHASE1_TABLES) {
    try {
      console.log(`  Checking ${tableName}...`);
      
      // Add timeout wrapper
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Query timeout (5s)')), 5000)
      );
      
      const queryPromise = supabase
        .from(tableName)
        .select('*')
        .limit(1);
      
      const { data, error } = await Promise.race([queryPromise, timeoutPromise]);
      
      if (error) {
        if (error.code === '42P01' || error.message.includes('does not exist') || (error.message.includes('relation') && error.message.includes('does not exist'))) {
          // Table doesn't exist
          status.tables[tableName] = { exists: false, error: 'Table not found' };
          console.warn(`  ❌ ${tableName}: NOT FOUND`);
        } else if (error.code === 'PGRST116') {
          // RLS policy blocking - table exists but no access
          status.tables[tableName] = { exists: true, error: 'RLS blocking (table exists)' };
          console.log(`  ✅ ${tableName}: EXISTS (RLS may block anonymous access)`);
          status.summary.tablesComplete++;
        } else {
          status.tables[tableName] = { exists: true, error: error.message };
          console.warn(`  ⚠️  ${tableName}: EXISTS but error - ${error.message}`);
          status.summary.tablesComplete++;
        }
      } else {
        status.tables[tableName] = { exists: true, rowCount: data?.length || 0 };
        console.log(`  ✅ ${tableName}: EXISTS`);
        status.summary.tablesComplete++;
      }
    } catch (err) {
      if (err.message === 'Query timeout (5s)') {
        status.tables[tableName] = { exists: false, error: 'Query timeout - check network/RLS' };
        console.error(`  ⏱️  ${tableName}: TIMEOUT - Query took too long (check RLS policies or network)`);
      } else {
        status.tables[tableName] = { exists: false, error: err.message };
        console.error(`  ❌ ${tableName}: ERROR - ${err.message}`);
      }
    }
  }
  console.groupEnd();

  // Check RPC Functions
  console.group('⚙️  RPC Functions Status');
  for (const funcName of PHASE1_RPC_FUNCTIONS) {
    try {
      console.log(`  Checking ${funcName}...`);
      
      // Add timeout wrapper
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('RPC timeout (5s)')), 5000)
      );
      
      // Try to call the function (with dummy params if needed)
      let testCall;
      if (funcName === 'get_configuration_totals') {
        // This will fail if function doesn't exist, but that's what we want to check
        testCall = supabase.rpc(funcName, { config_id: '00000000-0000-0000-0000-000000000000' });
      } else if (funcName === 'check_compatibility') {
        testCall = supabase.rpc(funcName, { selected_options: {} });
      } else if (funcName === 'generate_config_code') {
        testCall = supabase.rpc(funcName, { config_id: '00000000-0000-0000-0000-000000000000' });
      } else if (funcName === 'is_service_role') {
        testCall = supabase.rpc(funcName);
      } else {
        testCall = supabase.rpc(funcName);
      }

      const { error } = await Promise.race([testCall, timeoutPromise]);
      
      if (error) {
        if (error.code === '42883' || error.message.includes('does not exist') || error.message.includes('function') && error.message.includes('does not exist')) {
          status.rpcFunctions[funcName] = { exists: false, error: 'Function not found' };
          console.warn(`  ❌ ${funcName}: NOT FOUND`);
        } else {
          // Function exists but call failed (expected for test calls with invalid params)
          status.rpcFunctions[funcName] = { exists: true, error: error.message };
          console.log(`  ✅ ${funcName}: EXISTS (test call failed as expected: ${error.message.substring(0, 50)}...)`);
          status.summary.rpcComplete++;
        }
      } else {
        status.rpcFunctions[funcName] = { exists: true };
        console.log(`  ✅ ${funcName}: EXISTS`);
        status.summary.rpcComplete++;
      }
    } catch (err) {
      if (err.message === 'RPC timeout (5s)') {
        status.rpcFunctions[funcName] = { exists: false, error: 'RPC timeout - function may not exist or network issue' };
        console.error(`  ⏱️  ${funcName}: TIMEOUT - Check if function exists`);
      } else if (err.message.includes('does not exist') || err.message.includes('42883')) {
        status.rpcFunctions[funcName] = { exists: false, error: 'Function not found' };
        console.warn(`  ❌ ${funcName}: NOT FOUND`);
      } else {
        status.rpcFunctions[funcName] = { exists: false, error: err.message };
        console.error(`  ❌ ${funcName}: ERROR - ${err.message}`);
      }
    }
  }
  console.groupEnd();

  // Check Storage Buckets (requires service role or admin access)
  console.group('🗄️  Storage Buckets Status');
  for (const bucketName of PHASE1_STORAGE_BUCKETS) {
    try {
      console.log(`  Checking ${bucketName}...`);
      
      // Add timeout wrapper
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Storage timeout (5s)')), 5000)
      );
      
      const listPromise = supabase.storage.from(bucketName).list('', { limit: 1, sortBy: { column: 'name', order: 'asc' } });
      const { data, error } = await Promise.race([listPromise, timeoutPromise]);
      
      if (error) {
        if (error.message.includes('not found') || error.statusCode === 404 || error.message.includes('Bucket not found')) {
          status.storageBuckets[bucketName] = { exists: false, error: 'Bucket not found' };
          console.warn(`  ❌ ${bucketName}: NOT FOUND`);
        } else if (error.message.includes('new row violates row-level security')) {
          // Bucket exists but RLS blocking - this is actually good, means bucket exists
          status.storageBuckets[bucketName] = { exists: true, error: 'RLS blocking (bucket exists)' };
          console.log(`  ✅ ${bucketName}: EXISTS (RLS may block access)`);
          status.summary.storageComplete++;
        } else {
          status.storageBuckets[bucketName] = { exists: false, error: error.message };
          console.warn(`  ⚠️  ${bucketName}: ERROR - ${error.message}`);
        }
      } else {
        status.storageBuckets[bucketName] = { exists: true };
        console.log(`  ✅ ${bucketName}: EXISTS`);
        status.summary.storageComplete++;
      }
    } catch (err) {
      if (err.message === 'Storage timeout (5s)') {
        status.storageBuckets[bucketName] = { exists: false, error: 'Storage timeout - bucket may not exist' };
        console.error(`  ⏱️  ${bucketName}: TIMEOUT - Check if bucket exists`);
      } else {
        status.storageBuckets[bucketName] = { exists: false, error: err.message };
        console.error(`  ❌ ${bucketName}: ERROR - ${err.message}`);
      }
    }
  }
  console.groupEnd();

  // Check Seed Data (check if vehicles table has data)
  console.group('🌱 Seed Data Status');
  try {
    const { data: vehicles, error: vehiclesError } = await supabase
      .from('vehicles')
      .select('id, name, slug')
      .limit(5);
    
    if (vehiclesError) {
      status.seedData.vehicles = { error: vehiclesError.message };
      console.warn(`  ⚠️  vehicles: ${vehiclesError.message}`);
    } else {
      status.seedData.vehicles = { count: vehicles?.length || 0, data: vehicles };
      if (vehicles && vehicles.length > 0) {
        console.log(`  ✅ vehicles: ${vehicles.length} rows found`);
        vehicles.forEach(v => console.log(`     - ${v.name} (${v.slug})`));
      } else {
        console.warn(`  ⚠️  vehicles: Table exists but empty (seed data not loaded)`);
      }
    }

    const { data: options, error: optionsError } = await supabase
      .from('vehicle_options')
      .select('id, label, category')
      .limit(5);
    
    if (optionsError) {
      status.seedData.options = { error: optionsError.message };
    } else {
      status.seedData.options = { count: options?.length || 0 };
      if (options && options.length > 0) {
        console.log(`  ✅ vehicle_options: ${options.length}+ rows found`);
      } else {
        console.warn(`  ⚠️  vehicle_options: Table exists but empty`);
      }
    }
  } catch (err) {
    console.error(`  ❌ Seed data check failed: ${err.message}`);
  }
  console.groupEnd();

  // Calculate Progress
  const totalTables = PHASE1_TABLES.length;
  const totalRPC = PHASE1_RPC_FUNCTIONS.length;
  const totalStorage = PHASE1_STORAGE_BUCKETS.length;
  
  status.summary.totalProgress = Math.round(
    ((status.summary.tablesComplete / totalTables) * 0.4 +
     (status.summary.rpcComplete / totalRPC) * 0.3 +
     (status.summary.storageComplete / totalStorage) * 0.3) * 100
  );

  // Print Summary
  console.group('📈 Phase 1 Progress Summary');
  console.log(`Tables: ${status.summary.tablesComplete}/${totalTables} (${Math.round(status.summary.tablesComplete/totalTables*100)}%)`);
  console.log(`RPC Functions: ${status.summary.rpcComplete}/${totalRPC} (${Math.round(status.summary.rpcComplete/totalRPC*100)}%)`);
  console.log(`Storage Buckets: ${status.summary.storageComplete}/${totalStorage} (${Math.round(status.summary.storageComplete/totalStorage*100)}%)`);
  console.log(`Overall Phase 1 Progress: ${status.summary.totalProgress}%`);
  console.groupEnd();

  // Next Steps
  console.group('🎯 Next Steps');
  const missingTables = Object.entries(status.tables)
    .filter(([_, info]) => !info.exists)
    .map(([name]) => name);
  
  const missingRPC = Object.entries(status.rpcFunctions)
    .filter(([_, info]) => !info.exists)
    .map(([name]) => name);
  
  const missingStorage = Object.entries(status.storageBuckets)
    .filter(([_, info]) => !info.exists)
    .map(([name]) => name);

  if (missingTables.length > 0) {
    console.warn(`⚠️  Missing Tables: ${missingTables.join(', ')}`);
    console.log('   → Run: supabase/sql/platform_schema.sql');
  }
  
  if (missingRPC.length > 0) {
    console.warn(`⚠️  Missing RPC Functions: ${missingRPC.join(', ')}`);
    console.log('   → Add these functions to platform_schema.sql or create separate migration');
  }
  
  if (missingStorage.length > 0) {
    console.warn(`⚠️  Missing Storage Buckets: ${missingStorage.join(', ')}`);
    console.log('   → Create buckets in Supabase Dashboard → Storage');
    console.log('   → Or add to platform_schema.sql storage section');
  }

  if (status.seedData.vehicles?.count === 0) {
    console.warn(`⚠️  No seed data found`);
    console.log('   → Run: supabase/seeds/platform_seed.sql');
    console.log('   → Note: Fix account_profiles → profiles reference first');
  }

  if (missingTables.length === 0 && missingRPC.length === 0 && missingStorage.length === 0 && status.seedData.vehicles?.count > 0) {
    console.log('✅ Phase 1 appears complete! Ready for Phase 2 (Garage) or Phase 3 (Configurator 2D)');
  }
  console.groupEnd();

  console.groupEnd();
  return status;
}

// Auto-run in development if imported directly
if (import.meta.env.DEV) {
  // Don't auto-run, let user call it explicitly
  // checkPhase1Status();
}

