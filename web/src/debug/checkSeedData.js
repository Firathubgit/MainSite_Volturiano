/**
 * Quick check to see if seed data exists in Supabase
 * Run this in browser console to verify seed data
 */

import { supabase } from '../lib/supabaseClient';

export async function checkSeedData() {
  console.group('🌱 Seed Data Check');
  
  if (!supabase) {
    console.error('❌ Supabase client not initialized');
    console.groupEnd();
    return;
  }

  try {
    // Check vehicles
    const { data: vehicles, error: vehiclesError } = await supabase
      .from('vehicles')
      .select('id, slug, name, trim, base_price_cents')
      .order('created_at', { ascending: false })
      .limit(10);

    if (vehiclesError) {
      console.error('❌ Error checking vehicles:', vehiclesError);
    } else {
      console.log(`✅ Vehicles: ${vehicles?.length || 0} found`);
      if (vehicles && vehicles.length > 0) {
        console.table(vehicles);
        
        // Check for expected seed vehicles
        const tornadoExists = vehicles.some(v => v.slug === 'tornado-gt' || v.name?.toLowerCase().includes('tornado'));
        const atlasExists = vehicles.some(v => v.slug === 'volturiano-suv' || v.name?.toLowerCase().includes('atlas'));
        
        if (tornadoExists && atlasExists) {
          console.log('✅ Seed vehicles found (Tornado GT and Atlas SUV)');
        } else {
          console.warn('⚠️  Expected seed vehicles not found. Run platform_seed.sql');
        }
      } else {
        console.warn('⚠️  No vehicles found. Run platform_seed.sql to seed data.');
      }
    }

    // Check vehicle options
    const { data: options, error: optionsError } = await supabase
      .from('vehicle_options')
      .select('id, code, label, category, price_cents')
      .order('created_at', { ascending: false })
      .limit(10);

    if (optionsError) {
      console.error('❌ Error checking vehicle_options:', optionsError);
    } else {
      console.log(`✅ Vehicle Options: ${options?.length || 0} found`);
      if (options && options.length > 0) {
        console.table(options);
        
        // Check for expected seed options
        const expectedCodes = ['paint_orange_fury', 'brakes_ceramic', 'seat_alcantara', 'wheel_black_forged'];
        const foundCodes = options.map(o => o.code).filter(code => expectedCodes.includes(code));
        
        if (foundCodes.length >= 2) {
          console.log(`✅ Found ${foundCodes.length}/4 expected seed options`);
        } else {
          console.warn('⚠️  Expected seed options not found. Run platform_seed.sql');
        }
      } else {
        console.warn('⚠️  No vehicle options found. Run platform_seed.sql to seed data.');
      }
    }

    // Summary
    console.group('📊 Summary');
    const hasVehicles = vehicles && vehicles.length > 0;
    const hasOptions = options && options.length > 0;
    
    if (hasVehicles && hasOptions) {
      console.log('✅ Seed data appears to be loaded!');
      console.log(`   - ${vehicles.length} vehicles`);
      console.log(`   - ${options.length} options`);
    } else {
      console.log('❌ Seed data NOT loaded yet');
      console.log('   → Run: supabase/seeds/platform_seed.sql in SQL Editor');
    }
    console.groupEnd();

  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }

  console.groupEnd();
}

