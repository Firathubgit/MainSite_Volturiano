# Configurator Activation Checklist

## ✅ Database Setup (COMPLETED)
- [x] Schema created (`config_2d_manifests` table exists)
- [x] Manifest seed executed (Tornado GT manifest loaded)
- [x] RLS policies created
- [x] Triggers created

## 🔧 Next Steps to Activate

### Step 1: Verify Vehicle Options Have Configurator Fields

Run this SQL to check if your vehicle options are ready:

```sql
SELECT 
  id, 
  code, 
  label, 
  category,
  configurator_group, 
  configurator_visible, 
  configurator_order,
  configurator_metadata
FROM vehicle_options 
WHERE vehicle_id = '11111111-1111-1111-1111-111111111111' -- Tornado GT ID
LIMIT 20;
```

**If configurator fields are missing**, run this to add them:

```sql
-- Add configurator fields to existing options
UPDATE vehicle_options 
SET 
  configurator_visible = true,
  configurator_group = CASE 
    WHEN category = 'exterior' AND code LIKE 'paint%' THEN 'exterior'
    WHEN category = 'exterior' AND (code LIKE 'wheel%' OR code LIKE 'rim%') THEN 'wheels'
    WHEN category = 'interior' THEN 'interior'
    WHEN category = 'performance' THEN 'performance'
    ELSE 'other'
  END,
  configurator_order = 0,
  configurator_metadata = jsonb_build_object(
    'previewColor', CASE 
      WHEN code = 'paint_orange_fury' THEN '#FF4520'
      WHEN code LIKE 'paint_%' THEN '#000000'
      ELSE NULL
    END
  )
WHERE vehicle_id = '11111111-1111-1111-1111-111111111111'
  AND (configurator_visible IS NULL OR configurator_visible = false);
```

### Step 2: Add Paint and Rim Options (If Missing)

The manifest expects paint and rim options. If they don't exist, add them:

```sql
-- Paint options for Tornado GT
INSERT INTO vehicle_options (id, vehicle_id, category, code, label, description, price_cents, currency, configurator_visible, configurator_group, configurator_order, configurator_metadata)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'exterior', 'paint_blu-blue', 'Blu Blue', 'Signature blue paint', 0, 'EUR', true, 'exterior', 1, '{"previewColor": "#060FE7"}'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'exterior', 'paint_nero-black', 'Nero Black', 'Deep black paint', 0, 'EUR', true, 'exterior', 2, '{"previewColor": "#111111"}'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'exterior', 'paint_bianco-white', 'Bianco White', 'Pure white paint', 0, 'EUR', true, 'exterior', 3, '{"previewColor": "#FFFFFF"}'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '11111111-1111-1111-1111-111111111111', 'exterior', 'paint_rosso-red', 'Rosso Red', 'Racing red paint', 0, 'EUR', true, 'exterior', 4, '{"previewColor": "#E10600"}'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '11111111-1111-1111-1111-111111111111', 'exterior', 'paint_orange-fury', 'Orange Fury', 'Launch edition orange', 180000, 'EUR', true, 'exterior', 5, '{"previewColor": "#FF4520"}')
ON CONFLICT (vehicle_id, code) DO UPDATE SET
  configurator_visible = true,
  configurator_group = 'exterior',
  configurator_metadata = EXCLUDED.configurator_metadata;

-- Rim options for Tornado GT
INSERT INTO vehicle_options (id, vehicle_id, category, code, label, description, price_cents, currency, configurator_visible, configurator_group, configurator_order, configurator_metadata)
VALUES
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', '11111111-1111-1111-1111-111111111111', 'exterior', 'rims_black', 'Black Rims', 'Standard black rims', 0, 'EUR', true, 'wheels', 1, '{}'),
  ('11111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111', 'exterior', 'rims_silver', 'Silver Rims', 'Premium silver rims', 200000, 'EUR', true, 'wheels', 2, '{}'),
  ('22222222-2222-2222-2222-222222222223', '11111111-1111-1111-1111-111111111111', 'exterior', 'rims_bronze', 'Bronze Rims', 'Exclusive bronze rims', 300000, 'EUR', true, 'wheels', 3, '{}')
ON CONFLICT (vehicle_id, code) DO UPDATE SET
  configurator_visible = true,
  configurator_group = 'wheels';
```

### Step 3: Test the Configurator

1. **Start dev server:**
   ```bash
   npm run dev
   ```

2. **Navigate to:** `http://localhost:5173/configurator` (or your dev port)

3. **Check browser console** for any errors

4. **Verify these features:**
   - [ ] Header appears with logo
   - [ ] View mode toggle (2D/3D) visible
   - [ ] Configuration panel opens/closes
   - [ ] Options appear in panel (Paint, Wheels, etc.)
   - [ ] Can select options
   - [ ] Images load when options change
   - [ ] Pricing updates
   - [ ] Camera angle switching works (2D mode)

### Step 4: Troubleshooting

#### Issue: "No vehicle options loaded"
**Check:**
```sql
SELECT COUNT(*) FROM vehicle_options 
WHERE vehicle_id = '11111111-1111-1111-1111-111111111111' 
  AND configurator_visible = true;
```
Should return > 0. If 0, run Step 1 SQL above.

#### Issue: "Manifest not found"
**Check:**
```sql
SELECT slug, status FROM config_2d_manifests WHERE slug = 'tornado-gt-launch';
```
Should return 1 row with status = 'published'

#### Issue: "Images not loading"
- Check browser console Network tab for 404 errors
- Verify asset paths match: `/assets/Configurator/volturiano/{color}_{rim}_{angle}.webp`
- Check files exist in `web/src/assets/Configurator/volturiano/`

#### Issue: "Configurator panel empty"
- Check browser console for errors
- Verify vehicle options have `configurator_group` set
- Check that `get_configurator_options()` RPC function exists

## 🎯 Quick Verification Query

Run this to verify everything is set up:

```sql
-- Check manifest
SELECT 'Manifest' as check_type, COUNT(*) as count 
FROM config_2d_manifests 
WHERE slug = 'tornado-gt-launch' AND status = 'published'

UNION ALL

-- Check vehicle options
SELECT 'Vehicle Options', COUNT(*) 
FROM vehicle_options 
WHERE vehicle_id = '11111111-1111-1111-1111-111111111111' 
  AND configurator_visible = true

UNION ALL

-- Check paint options
SELECT 'Paint Options', COUNT(*) 
FROM vehicle_options 
WHERE vehicle_id = '11111111-1111-1111-1111-111111111111' 
  AND configurator_group = 'exterior' 
  AND code LIKE 'paint%'

UNION ALL

-- Check rim options  
SELECT 'Rim Options', COUNT(*) 
FROM vehicle_options 
WHERE vehicle_id = '11111111-1111-1111-1111-111111111111' 
  AND configurator_group = 'wheels' 
  AND code LIKE 'rim%';
```

Expected results:
- Manifest: 1
- Vehicle Options: 5+ (paint + rims)
- Paint Options: 5
- Rim Options: 3

## ✅ Success Criteria

The configurator is working when:
1. ✅ Page loads without errors
2. ✅ Configuration panel shows options
3. ✅ Selecting paint changes car color
4. ✅ Selecting rims changes wheel appearance
5. ✅ Pricing updates correctly
6. ✅ Images load smoothly

