-- Add all paint options for Tornado GT
-- This script adds the missing paint colors to the vehicle_options table
-- Run this in Supabase SQL Editor

-- First, check what vehicle ID we're using
-- SELECT id, name, slug FROM vehicles WHERE slug = 'tornado-gt' LIMIT 1;

-- Add paint options (using the vehicle ID from the query above, or use the default UUID)
-- Replace '11111111-1111-1111-1111-111111111111' with your actual vehicle ID if different

INSERT INTO vehicle_options (
  id, 
  vehicle_id, 
  category, 
  code, 
  label, 
  description, 
  price_cents, 
  currency, 
  configurator_visible, 
  configurator_group, 
  configurator_order, 
  configurator_metadata
)
VALUES
  -- Blu Blue (default, no extra cost)
  (
    gen_random_uuid(),
    '11111111-1111-1111-1111-111111111111',
    'exterior',
    'paint_blu-blue',
    'Blu Blue',
    'Signature blue paint',
    0,
    'EUR',
    true,
    'exterior',
    1,
    '{"previewColor": "#060FE7"}'::jsonb
  ),
  -- Nero Black
  (
    gen_random_uuid(),
    '11111111-1111-1111-1111-111111111111',
    'exterior',
    'paint_nero-black',
    'Nero Black',
    'Deep black paint',
    0,
    'EUR',
    true,
    'exterior',
    2,
    '{"previewColor": "#111111"}'::jsonb
  ),
  -- Bianco White
  (
    gen_random_uuid(),
    '11111111-1111-1111-1111-111111111111',
    'exterior',
    'paint_bianco-white',
    'Bianco White',
    'Pure white paint',
    0,
    'EUR',
    true,
    'exterior',
    3,
    '{"previewColor": "#FFFFFF"}'::jsonb
  ),
  -- Rosso Red
  (
    gen_random_uuid(),
    '11111111-1111-1111-1111-111111111111',
    'exterior',
    'paint_rosso-red',
    'Rosso Red',
    'Racing red paint',
    0,
    'EUR',
    true,
    'exterior',
    4,
    '{"previewColor": "#E10600"}'::jsonb
  ),
  -- Orange Fury (update existing to be free if needed, or keep premium pricing)
  (
    gen_random_uuid(),
    '11111111-1111-1111-1111-111111111111',
    'exterior',
    'paint_orange-fury',
    'Orange Fury',
    'Launch edition orange',
    0, -- Changed to 0 to match other colors, or keep 180000 for premium
    'EUR',
    true,
    'exterior',
    5,
    '{"previewColor": "#FF4520"}'::jsonb
  )
ON CONFLICT (vehicle_id, code) DO UPDATE SET
  configurator_visible = true,
  configurator_group = 'exterior',
  configurator_metadata = EXCLUDED.configurator_metadata,
  configurator_order = EXCLUDED.configurator_order;

-- Verify the options were added
SELECT 
  code, 
  label, 
  configurator_visible, 
  configurator_group,
  price_cents
FROM vehicle_options
WHERE vehicle_id = '11111111-1111-1111-1111-111111111111'
  AND code LIKE 'paint_%'
ORDER BY configurator_order;

