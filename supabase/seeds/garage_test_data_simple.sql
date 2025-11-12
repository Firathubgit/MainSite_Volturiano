-- SIMPLE VERSION: Test data for garage feature
-- 
-- STEP 1: Find your user ID by running this first:
--   SELECT id, email FROM auth.users;
--
-- STEP 2: Replace 'YOUR_USER_ID_HERE' below with your UUID from step 1
-- STEP 3: Run this entire script

-- Replace this with your actual user ID (UUID format)
\set user_id 'YOUR_USER_ID_HERE'

-- If the above doesn't work, uncomment and use this instead (replace with your email):
-- SELECT id INTO user_uuid FROM auth.users WHERE email = 'your-email@example.com';

-- Sample garage items
INSERT INTO garage_items (
  owner_id,
  title,
  description,
  vehicle_model,
  state,
  config_payload,
  schema_version,
  price_cents,
  currency,
  thumbnail_url,
  created_at,
  updated_at
) VALUES
-- Saved Build
(
  :'user_id'::uuid,
  'My Dream GT',
  'Fully configured Tornado GT with all premium options',
  'Tornado GT',
  'saved',
  '{"schemaVersion":1,"vehicle":{"model":"Tornado GT","trim":"Launch Edition","year":2025,"vin":null},"options":{"exterior":[{"id":"paint_orange_fury","label":"Orange Fury","price":1800}],"interior":[{"id":"seat_carbon","label":"Carbon Bucket Seats"}],"performance":[{"id":"brakes_ceramic","label":"Carbon Ceramic Brakes","price":6500}]},"pricing":{"basePriceCents":18000000,"optionsTotalCents":830000,"discountCents":0,"currency":"EUR"},"media":{"heroImage":null,"gallery":[]},"history":{"createdAt":"2025-01-15T10:30:00.000Z","updatedAt":"2025-01-15T10:30:00.000Z","source":"configurator","notes":"My first saved configuration"},"metadata":{"goalTags":["track","daily"],"locale":"en","isPrototype":false,"relatedShowcaseId":null}}'::jsonb,
  1,
  18830000,
  'EUR',
  null,
  NOW() - INTERVAL '5 days',
  NOW() - INTERVAL '2 days'
),
-- Purchased Item
(
  :'user_id'::uuid,
  'My Volturiano',
  'Ordered and confirmed - delivery expected Q2 2025',
  'Tornado GT',
  'purchased',
  '{"schemaVersion":1,"vehicle":{"model":"Tornado GT","trim":"Launch Edition","year":2025,"vin":"VT2025001234"},"options":{"exterior":[{"id":"paint_metallic_black","label":"Metallic Black","price":2200}],"interior":[{"id":"seat_leather_custom","label":"Custom Leather Interior","price":4500}],"performance":[{"id":"brakes_ceramic","label":"Carbon Ceramic Brakes","price":6500},{"id":"suspension_track","label":"Track Suspension","price":3200}]},"pricing":{"basePriceCents":18000000,"optionsTotalCents":16400000,"discountCents":500000,"currency":"EUR"},"media":{"heroImage":null,"gallery":[]},"history":{"createdAt":"2024-12-01T14:20:00.000Z","updatedAt":"2025-01-10T09:15:00.000Z","source":"order","notes":"Order confirmed - production started"},"metadata":{"goalTags":["luxury","performance"],"locale":"en","isPrototype":false,"relatedShowcaseId":null}}'::jsonb,
  1,
  33900000,
  'EUR',
  null,
  NOW() - INTERVAL '45 days',
  NOW() - INTERVAL '10 days'
),
-- Prototype
(
  :'user_id'::uuid,
  'Future Concept Build',
  'Experimental configuration for future model',
  'Tornado GT',
  'prototype',
  '{"schemaVersion":1,"vehicle":{"model":"Tornado GT","trim":"Concept","year":2026,"vin":null},"options":{"exterior":[{"id":"paint_custom_chrome","label":"Custom Chrome Finish","price":15000}],"interior":[{"id":"seat_racing_custom","label":"Racing Custom Seats","price":8000}],"performance":[{"id":"engine_turbo_plus","label":"Turbo Plus Package","price":12000}]},"pricing":{"basePriceCents":20000000,"optionsTotalCents":35000000,"discountCents":0,"currency":"EUR"},"media":{"heroImage":null,"gallery":[]},"history":{"createdAt":"2025-01-20T16:45:00.000Z","updatedAt":"2025-01-20T16:45:00.000Z","source":"configurator","notes":"Concept build - not available for order"},"metadata":{"goalTags":["concept","experimental"],"locale":"en","isPrototype":true,"relatedShowcaseId":null}}'::jsonb,
  1,
  55000000,
  'EUR',
  null,
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '1 day'
),
-- Wishlist Item 1
(
  :'user_id'::uuid,
  'Weekend Track Car',
  'Considering for track days and weekend drives',
  'Tornado GT',
  'wishlist',
  '{"schemaVersion":1,"vehicle":{"model":"Tornado GT","trim":"Track Edition","year":2025,"vin":null},"options":{"exterior":[{"id":"paint_racing_red","label":"Racing Red","price":2000}],"interior":[{"id":"seat_racing","label":"Racing Seats","price":3500}],"performance":[{"id":"brakes_ceramic","label":"Carbon Ceramic Brakes","price":6500},{"id":"suspension_track","label":"Track Suspension","price":3200},{"id":"aero_package","label":"Aero Package","price":5500}]},"pricing":{"basePriceCents":19000000,"optionsTotalCents":20700000,"discountCents":0,"currency":"EUR"},"media":{"heroImage":null,"gallery":[]},"history":{"createdAt":"2025-01-18T11:20:00.000Z","updatedAt":"2025-01-18T11:20:00.000Z","source":"configurator","notes":"Considering for purchase"},"metadata":{"goalTags":["track","weekend"],"locale":"en","isPrototype":false,"relatedShowcaseId":null}}'::jsonb,
  1,
  39700000,
  'EUR',
  null,
  NOW() - INTERVAL '3 days',
  NOW() - INTERVAL '3 days'
),
-- Wishlist Item 2
(
  :'user_id'::uuid,
  'Luxury Daily Driver',
  'Comfort-focused configuration for daily use',
  'Tornado GT',
  'wishlist',
  '{"schemaVersion":1,"vehicle":{"model":"Tornado GT","trim":"Luxury Edition","year":2025,"vin":null},"options":{"exterior":[{"id":"paint_pearl_white","label":"Pearl White","price":1800}],"interior":[{"id":"seat_leather_premium","label":"Premium Leather","price":5000},{"id":"interior_wood","label":"Wood Trim","price":2800}],"performance":[{"id":"suspension_comfort","label":"Comfort Suspension","price":1500}]},"pricing":{"basePriceCents":18000000,"optionsTotalCents":11100000,"discountCents":0,"currency":"EUR"},"media":{"heroImage":null,"gallery":[]},"history":{"createdAt":"2025-01-12T09:10:00.000Z","updatedAt":"2025-01-12T09:10:00.000Z","source":"configurator","notes":"Comfort-focused build"},"metadata":{"goalTags":["luxury","daily"],"locale":"en","isPrototype":false,"relatedShowcaseId":null}}'::jsonb,
  1,
  29100000,
  'EUR',
  null,
  NOW() - INTERVAL '9 days',
  NOW() - INTERVAL '9 days'
)
ON CONFLICT DO NOTHING;

-- Create initial versions
INSERT INTO garage_versions (garage_item_id, version_number, snapshot, diff_summary)
SELECT 
  id,
  1,
  config_payload,
  '[]'::jsonb
FROM garage_items
WHERE owner_id = :'user_id'::uuid
ON CONFLICT DO NOTHING;

-- Verify (replace user_id in this query too)
SELECT 
  id,
  title,
  vehicle_model,
  state,
  price_cents,
  created_at
FROM garage_items
WHERE owner_id = :'user_id'::uuid
ORDER BY created_at DESC;

