-- Seed data for Supabase platform schema
-- This seeds vehicles and options (public data)
-- Configurations and orders require real users - see optional section at bottom

-- Vehicles
insert into vehicles (id, slug, name, trim, year, base_price_cents, currency, hero_image_url)
values
  ('11111111-1111-1111-1111-111111111111', 'tornado-gt', 'Volturiano Tornado', 'GT Launch', 2025, 18000000, 'EUR', 'https://cdn.volturiano.com/vehicles/tornado-gt.png'),
  ('22222222-2222-2222-2222-222222222222', 'volturiano-suv', 'Volturiano Atlas', 'Performance SUV', 2025, 14500000, 'EUR', 'https://cdn.volturiano.com/vehicles/atlas-suv.png')
on conflict (slug) do nothing;

-- Vehicle Options
insert into vehicle_options (id, vehicle_id, category, code, label, description, price_cents, currency, media_url)
values
  ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'exterior', 'paint_orange_fury', 'Orange Fury', 'Signature launch paint', 180000, 'EUR', 'https://cdn.volturiano.com/options/paint_orange_fury.png'),
  ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'performance', 'brakes_ceramic', 'Carbon Ceramic Brakes', 'Track-ready braking system', 650000, 'EUR', 'https://cdn.volturiano.com/options/brakes_ceramic.png'),
  ('55555555-5555-5555-5555-555555555555', '22222222-2222-2222-2222-222222222222', 'interior', 'seat_alcantara', 'Alcantara Comfort Seats', null, 250000, 'EUR', 'https://cdn.volturiano.com/options/seat_alcantara.png'),
  ('66666666-6666-6666-6666-666666666666', '22222222-2222-2222-2222-222222222222', 'exterior', 'wheel_black_forged', 'Black Forged Wheels', null, 320000, 'EUR', 'https://cdn.volturiano.com/options/wheel_black_forged.png')
on conflict (vehicle_id, code) do nothing;

-- ============================================================================
-- Demo Configurations & Orders
-- Automatically uses the first user in auth.users
-- ============================================================================

DO $$
DECLARE
  demo_user_id uuid;
BEGIN
  -- Use first user in auth.users (or you can specify by email)
  SELECT id INTO demo_user_id FROM auth.users ORDER BY created_at LIMIT 1;
  
  -- If no user found, skip this section
  IF demo_user_id IS NULL THEN
    RAISE NOTICE 'No users found. Skipping demo configurations/orders. Create a user first.';
    RETURN;
  END IF;

  -- Create profile if it doesn't exist
  INSERT INTO profiles (id, display_name, locale)
  VALUES (demo_user_id, 'Demo Driver', 'en')
  ON CONFLICT (id) DO UPDATE SET display_name = 'Demo Driver';

  -- Demo configurations
  INSERT INTO configurations (id, owner_id, vehicle_id, title, notes, pricing_summary)
  VALUES
    ('88888888-8888-8888-8888-888888888888', demo_user_id, '11111111-1111-1111-1111-111111111111', 'Geneva Launch Spec', 'Configured for the Geneva reveal stream.', '{"base":18000000,"options":830000,"currency":"EUR"}'),
    ('99999999-9999-9999-9999-999999999999', demo_user_id, '22222222-2222-2222-2222-222222222222', 'Alpine Family Cruiser', 'Winter-ready SUV spec.', '{"base":14500000,"options":570000,"currency":"EUR"}')
  ON CONFLICT (id) DO NOTHING;

  -- Configuration options
  INSERT INTO configuration_options (configuration_id, option_id, quantity)
  VALUES
    ('88888888-8888-8888-8888-888888888888', '33333333-3333-3333-3333-333333333333', 1),
    ('88888888-8888-8888-8888-888888888888', '44444444-4444-4444-4444-444444444444', 1),
    ('99999999-9999-9999-9999-999999999999', '55555555-5555-5555-5555-555555555555', 1),
    ('99999999-9999-9999-9999-999999999999', '66666666-6666-6666-6666-666666666666', 1)
  ON CONFLICT DO NOTHING;

  -- Demo orders
  INSERT INTO orders (id, owner_id, configuration_id, status, subtotal_cents, tax_cents, discount_cents, total_cents, currency, placed_at)
  VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', demo_user_id, '88888888-8888-8888-8888-888888888888', 'pending', 18830000, 470750, 0, 19300750, 'EUR', now()),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', demo_user_id, '99999999-9999-9999-9999-999999999999', 'cart', 15070000, 0, 0, 15070000, 'EUR', null)
  ON CONFLICT (id) DO NOTHING;

  -- Order items
  INSERT INTO order_items (id, order_id, label, kind, amount_cents)
  VALUES
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Base Vehicle', 'base_price', 18000000),
    ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Options', 'option', 830000),
    ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'VAT 2.5%', 'tax', 470750),
    ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Base Vehicle', 'base_price', 14500000),
    ('abababab-abab-abab-abab-abababababab', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Options', 'option', 570000)
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE 'Demo configurations and orders created for user: %', demo_user_id;
END $$;


