-- Seed data for Configurator 3D features

insert into studio_light_presets (id, slug, title, description, hdri_url, key_intensity, fill_intensity, rim_intensity, color_temperature, metadata)
values
  ('10000000-0000-4000-8000-000000000001', 'track-day', 'Track Day', 'High contrast sunlight with warm rim.', 'https://cdn.volturiano.com/hdris/track-day.hdr', 1.2, 0.5, 0.8, 5600, '{"thumbnail":"https://cdn.volturiano.com/hdris/thumbnails/track-day.jpg"}'),
  ('10000000-0000-4000-8000-000000000002', 'night-city', 'Night City', 'Neon reflections and cool ambient fill.', 'https://cdn.volturiano.com/hdris/night-city.hdr', 0.9, 0.8, 0.6, 4200, '{"thumbnail":"https://cdn.volturiano.com/hdris/thumbnails/night-city.jpg"}'),
  ('10000000-0000-4000-8000-000000000003', 'gallery', 'Gallery', 'Soft box lighting with clean highlights.', 'https://cdn.volturiano.com/hdris/gallery.hdr', 1.0, 0.7, 0.4, 6500, '{"thumbnail":"https://cdn.volturiano.com/hdris/thumbnails/gallery.jpg"}')
on conflict (slug) do nothing;

insert into interior_light_profiles (id, slug, name, description, color_hex, intensity, metadata)
values
  ('20000000-0000-4000-8000-000000000001', 'aurora-blue', 'Aurora Blue', 'Cool ambient glow for night drives.', '#3A6DFF', 1.0, '{"preview":"https://cdn.volturiano.com/interior/previews/aurora-blue.png"}'),
  ('20000000-0000-4000-8000-000000000002', 'sunset-amber', 'Sunset Amber', 'Warm lounge feel.', '#FF7A3A', 0.8, '{"preview":"https://cdn.volturiano.com/interior/previews/sunset-amber.png"}'),
  ('20000000-0000-4000-8000-000000000003', 'polar-white', 'Polar White', 'Clean showroom illumination.', '#F5F7FF', 0.9, '{"preview":"https://cdn.volturiano.com/interior/previews/polar-white.png"}')
on conflict (slug) do nothing;

insert into scenario_presets (id, slug, title, subtitle, manifest_slug, lighting_preset, interior_profile, props, audio_cues, metadata)
values
  ('30000000-0000-4000-8000-000000000001', 'track-day', 'Track Day', 'Circuit-ready setup with audience ambience.', 'tornado-gt-launch', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '[{"type":"prop","slug":"pit-wall"},{"type":"prop","slug":"lap-timer"}]', '[{"event":"engine_rev","file":"sfx/engine_rev.wav"}]', '{"thumbnail":"https://cdn.volturiano.com/scenarios/track-day.png"}'),
  ('30000000-0000-4000-8000-000000000002', 'alpine-tour', 'Alpine Touring', 'Snow-capped escape with ambient snow sound.', 'atlas-suv-performance', '10000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000003', '[{"type":"prop","slug":"snowbanks"},{"type":"prop","slug":"ski-rack"}]', '[{"event":"ambient","file":"sfx/wind_snow.wav"}]', '{"thumbnail":"https://cdn.volturiano.com/scenarios/alpine-tour.png"}'),
  ('30000000-0000-4000-8000-000000000003', 'concours', 'Concours', 'Gallery-ready presentation with crowd murmur.', 'tornado-gt-launch', '10000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000002', '[{"type":"prop","slug":"velvet-ropes"}]', '[{"event":"ambient","file":"sfx/crowd_soft.wav"}]', '{"thumbnail":"https://cdn.volturiano.com/scenarios/concours.png"}')
on conflict (slug) do nothing;

insert into render_export_jobs (id, owner_id, config_payload, resolution, watermark, status)
values
  ('40000000-0000-4000-8000-000000000001', '77777777-7777-7777-7777-777777777777', '{"configId":"88888888-8888-8888-8888-888888888888","scenario":"track-day"}', '4k', true, 'completed')
on conflict (id) do nothing;

