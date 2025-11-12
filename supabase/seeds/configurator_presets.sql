-- Configurator preset seeds

insert into config_2d_manifests (id, slug, version, status, data, metadata)
values
  ('aaaa1111-0000-4000-8000-000000000001', 'tornado-gt-launch', 1, 'published', '{"schemaVersion":1,"vehicleModel":"tornado-gt","layers":[]}', '{"lighting":["studio","night"]}'),
  ('aaaa1111-0000-4000-8000-000000000002', 'atlas-suv-performance', 1, 'published', '{"schemaVersion":1,"vehicleModel":"volturiano-suv","layers":[]}', '{"lighting":["alpine","urban"]}')
on conflict (slug) do nothing;

insert into configurator_presets (id, slug, manifest_id, title, subtitle, description, thumbnail_url, sort_order, config_payload, is_featured)
values
  ('bbbb2222-0000-4000-8000-000000000001', 'performance-pack', 'aaaa1111-0000-4000-8000-000000000001', 'Performance Pack', 'Track focused setup', 'Carbon ceramic brakes, aero kit, late apex calibration.', 'https://cdn.volturiano.com/presets/performance-pack.png', 1, '{"options":["brakes_ceramic","aero_track"],"lighting":"studio"}', true),
  ('bbbb2222-0000-4000-8000-000000000002', 'winter-pack', 'aaaa1111-0000-4000-8000-000000000002', 'Winter Pack', 'Alpine ready comfort', 'Heated seats, winter wheels, snow mode.', 'https://cdn.volturiano.com/presets/winter-pack.png', 2, '{"options":["wheel_winter","seat_heated"],"lighting":"alpine"}', true),
  ('bbbb2222-0000-4000-8000-000000000003', 'launch-edition', 'aaaa1111-0000-4000-8000-000000000001', 'Launch Edition', 'Signature reveal spec', 'Orange Fury paint with exclusive interior trim.', 'https://cdn.volturiano.com/presets/launch-edition.png', 0, '{"options":["paint_orange_fury","interior_launch"],"lighting":"studio"}', true)
on conflict (slug) do nothing;

insert into variant_inventory (id, manifest_slug, option_code, region, status, quantity, threshold, metadata)
values
  ('cccc3333-0000-4000-8000-000000000001', 'tornado-gt-launch', 'paint_orange_fury', 'global', 'low', 3, 5, '{"messageKey":"configurator.alerts.paint_orange_low"}'),
  ('cccc3333-0000-4000-8000-000000000002', 'atlas-suv-performance', 'wheel_black_forged', 'emea', 'available', 12, 5, null)
on conflict (manifest_slug, option_code, region) do update
  set status = excluded.status,
      quantity = excluded.quantity,
      threshold = excluded.threshold,
      metadata = coalesce(excluded.metadata, variant_inventory.metadata),
      updated_at = now();

