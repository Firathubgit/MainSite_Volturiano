-- Add Rims, Interior, and Trim options for Tornado GT
-- Run this in Supabase SQL Editor after adding paint options

-- Rim/Wheel options
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
  -- Black Rims (default, included)
  (
    gen_random_uuid(),
    '11111111-1111-1111-1111-111111111111',
    'exterior',
    'rims_black',
    'Black Rims',
    'Standard black rims',
    0,
    'EUR',
    true,
    'wheels',
    1,
    '{}'::jsonb
  ),
  -- Silver Rims
  (
    gen_random_uuid(),
    '11111111-1111-1111-1111-111111111111',
    'exterior',
    'rims_silver',
    'Silver Rims',
    'Premium silver rims',
    200000,
    'EUR',
    true,
    'wheels',
    2,
    '{}'::jsonb
  ),
  -- Bronze Rims
  (
    gen_random_uuid(),
    '11111111-1111-1111-1111-111111111111',
    'exterior',
    'rims_bronze',
    'Bronze Rims',
    'Exclusive bronze rims',
    300000,
    'EUR',
    true,
    'wheels',
    3,
    '{}'::jsonb
  )
ON CONFLICT (vehicle_id, code) DO UPDATE SET
  configurator_visible = true,
  configurator_group = 'wheels',
  configurator_order = EXCLUDED.configurator_order;

-- Interior options
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
  -- Standard Interior (default, included)
  (
    gen_random_uuid(),
    '11111111-1111-1111-1111-111111111111',
    'interior',
    'seat_standard',
    'Standard Interior',
    'Premium standard interior',
    0,
    'EUR',
    true,
    'interior',
    1,
    '{}'::jsonb
  ),
  -- Racing Custom Interior
  (
    gen_random_uuid(),
    '11111111-1111-1111-1111-111111111111',
    'interior',
    'seat_racing_custom',
    'Racing Custom Interior',
    'Custom racing seats with carbon fiber accents',
    1500000,
    'EUR',
    true,
    'interior',
    2,
    '{}'::jsonb
  ),
  -- Luxury Interior
  (
    gen_random_uuid(),
    '11111111-1111-1111-1111-111111111111',
    'interior',
    'seat_luxury',
    'Luxury Interior',
    'Premium leather interior with extended comfort features',
    2500000,
    'EUR',
    true,
    'interior',
    3,
    '{}'::jsonb
  )
ON CONFLICT (vehicle_id, code) DO UPDATE SET
  configurator_visible = true,
  configurator_group = 'interior',
  configurator_order = EXCLUDED.configurator_order;

-- Trim/Model options
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
  -- GT Launch (default trim)
  (
    gen_random_uuid(),
    '11111111-1111-1111-1111-111111111111',
    'exterior',
    'trim_gt_launch',
    'GT Launch',
    'Launch edition trim',
    0,
    'EUR',
    true,
    'trim',
    1,
    '{}'::jsonb
  ),
  -- GT Performance
  (
    gen_random_uuid(),
    '11111111-1111-1111-1111-111111111111',
    'exterior',
    'trim_gt_performance',
    'GT Performance',
    'Performance-focused trim with enhanced aerodynamics',
    5000000,
    'EUR',
    true,
    'trim',
    2,
    '{}'::jsonb
  )
ON CONFLICT (vehicle_id, code) DO UPDATE SET
  configurator_visible = true,
  configurator_group = 'trim',
  configurator_order = EXCLUDED.configurator_order;

-- Verify all options were added
SELECT 
  configurator_group,
  COUNT(*) as count,
  STRING_AGG(code, ', ' ORDER BY configurator_order) as codes
FROM vehicle_options
WHERE vehicle_id = '11111111-1111-1111-1111-111111111111'
  AND configurator_visible = true
GROUP BY configurator_group
ORDER BY configurator_group;

