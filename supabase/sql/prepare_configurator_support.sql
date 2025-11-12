-- Prepare database schema for Phase 3 Configurator support
-- This enhances existing tables to support configurator editing without building Phase 3
-- Run this after platform_schema.sql

-- ============================================================================
-- 1. Enhance vehicles table for configurator support
-- ============================================================================

-- Add configurator-specific fields to vehicles
alter table vehicles
  add column if not exists configurator_enabled boolean default true,
  add column if not exists configurator_manifest_id uuid, -- Reference to configurator manifest (Phase 3)
  add column if not exists configurator_preview_url text, -- Preview image for configurator
  add column if not exists configurator_metadata jsonb default '{}'::jsonb; -- Flexible metadata for configurator

-- Add index for configurator-enabled vehicles
create index if not exists vehicles_configurator_enabled_idx 
  on vehicles (configurator_enabled) 
  where configurator_enabled = true;

-- ============================================================================
-- 2. Enhance vehicle_options for configurator support
-- ============================================================================

-- Add configurator-specific fields to vehicle_options
alter table vehicle_options
  add column if not exists configurator_group text, -- Which group in configurator UI (exterior, interior, performance)
  add column if not exists configurator_order integer default 0, -- Display order within group
  add column if not exists configurator_visible boolean default true, -- Show in configurator
  add column if not exists configurator_metadata jsonb default '{}'::jsonb, -- Layer IDs, material IDs, etc.
  add column if not exists configurator_image_url text, -- Swatch/preview image
  add column if not exists configurator_3d_material_id uuid; -- Reference to 3D material (Phase 4)

-- Add index for configurator queries
create index if not exists vehicle_options_configurator_idx 
  on vehicle_options (vehicle_id, configurator_group, configurator_order)
  where configurator_visible = true;

-- ============================================================================
-- 3. Enhance configurations table for configurator JSON support
-- ============================================================================

-- Add configurator-specific fields to configurations
alter table configurations
  add column if not exists configurator_payload jsonb, -- Full configurator state JSON (matches garage_items.config_payload structure)
  add column if not exists configurator_schema_version integer default 1, -- Schema version for migrations
  add column if not exists configurator_manifest_id uuid, -- Which manifest was used
  add column if not exists configurator_render_url text, -- Generated render URL
  add column if not exists configurator_last_edited_at timestamptz; -- Track when configurator was last opened

-- Add GIN index for JSONB queries (fast searching within configurator_payload)
create index if not exists configurations_configurator_payload_gin_idx 
  on configurations using gin (configurator_payload);

-- Add index for configurator queries
create index if not exists configurations_configurator_manifest_idx 
  on configurations (configurator_manifest_id)
  where configurator_manifest_id is not null;

-- ============================================================================
-- 4. Add helper function to validate configurator payload structure
-- ============================================================================

create or replace function validate_configurator_payload(payload jsonb)
returns boolean as $$
begin
  -- Basic validation: check for required top-level keys
  return (
    payload ? 'schemaVersion' and
    payload ? 'vehicle' and
    payload ? 'options' and
    payload ? 'pricing'
  );
end;
$$ language plpgsql immutable;

comment on function validate_configurator_payload(jsonb) is 
'Validates that configurator payload has required structure. Returns true if valid.';

-- ============================================================================
-- 5. Add helper function to extract vehicle model from configurator payload
-- ============================================================================

create or replace function extract_vehicle_model_from_payload(payload jsonb)
returns text as $$
begin
  return payload->'vehicle'->>'model';
end;
$$ language plpgsql immutable;

comment on function extract_vehicle_model_from_payload(jsonb) is 
'Extracts vehicle model name from configurator payload JSON. Used for denormalization.';

-- ============================================================================
-- 6. Add trigger to sync configurator_payload -> vehicle_model denormalization
-- ============================================================================

-- Function to update vehicle_model from configurator_payload
create or replace function sync_configuration_vehicle_model()
returns trigger as $$
begin
  if new.configurator_payload is not null then
    -- Extract vehicle model from payload and update denormalized field
    -- Note: configurations table doesn't have vehicle_model, but garage_items does
    -- This is for future use when configurations table might need it
    return new;
  end if;
  return new;
end;
$$ language plpgsql;

-- ============================================================================
-- 7. Add helper function to get configurator-ready vehicle options
-- ============================================================================

create or replace function get_configurator_options(p_vehicle_id uuid)
returns table (
  id uuid,
  category text,
  code text,
  label text,
  description text,
  price_cents bigint,
  currency char(3),
  configurator_group text,
  configurator_order integer,
  configurator_metadata jsonb,
  configurator_image_url text
) as $$
begin
  return query
  select 
    vo.id,
    vo.category,
    vo.code,
    vo.label,
    vo.description,
    vo.price_cents,
    vo.currency,
    vo.configurator_group,
    vo.configurator_order,
    vo.configurator_metadata,
    vo.configurator_image_url
  from vehicle_options vo
  where vo.vehicle_id = p_vehicle_id
    and vo.configurator_visible = true
  order by vo.configurator_group, vo.configurator_order;
end;
$$ language plpgsql stable;

grant execute on function get_configurator_options(uuid) to authenticated;

comment on function get_configurator_options(uuid) is 
'Returns all configurator-visible options for a vehicle, ordered by group and display order.';

-- ============================================================================
-- 8. Add helper function to convert configuration to configurator payload format
-- ============================================================================

create or replace function configuration_to_configurator_payload(
  p_config_id uuid,
  p_schema_version integer default 1
)
returns jsonb as $$
declare
  v_config configurations%rowtype;
  v_vehicle vehicles%rowtype;
  v_options jsonb;
  v_payload jsonb;
begin
  -- Get configuration
  select * into v_config from configurations where id = p_config_id;
  if not found then
    return null;
  end if;

  -- Get vehicle
  select * into v_vehicle from vehicles where id = v_config.vehicle_id;
  if not found then
    return null;
  end if;

  -- Build options array from configuration_options
  select jsonb_agg(
    jsonb_build_object(
      'id', vo.code,
      'label', vo.label,
      'price', vo.price_cents / 100.0,
      'category', vo.category
    )
  ) into v_options
  from configuration_options co
  join vehicle_options vo on co.option_id = vo.id
  where co.configuration_id = p_config_id;

  -- Build full payload matching garage_items.config_payload structure
  v_payload := jsonb_build_object(
    'schemaVersion', p_schema_version,
    'vehicle', jsonb_build_object(
      'model', v_vehicle.name,
      'trim', v_vehicle.trim,
      'year', v_vehicle.year,
      'vin', null
    ),
    'options', jsonb_build_object(
      'exterior', coalesce(
        (select jsonb_agg(opt) from jsonb_array_elements(v_options) opt 
         where opt->>'category' = 'exterior'),
        '[]'::jsonb
      ),
      'interior', coalesce(
        (select jsonb_agg(opt) from jsonb_array_elements(v_options) opt 
         where opt->>'category' = 'interior'),
        '[]'::jsonb
      ),
      'performance', coalesce(
        (select jsonb_agg(opt) from jsonb_array_elements(v_options) opt 
         where opt->>'category' = 'performance'),
        '[]'::jsonb
      )
    ),
    'pricing', jsonb_build_object(
      'basePriceCents', v_vehicle.base_price_cents,
      'optionsTotalCents', coalesce((v_config.pricing_summary->>'options')::bigint, 0),
      'discountCents', coalesce((v_config.pricing_summary->>'discount')::bigint, 0),
      'currency', coalesce(v_vehicle.currency, 'EUR')
    ),
    'media', jsonb_build_object(
      'heroImage', v_vehicle.hero_image_url,
      'gallery', '[]'::jsonb
    ),
    'history', jsonb_build_object(
      'createdAt', v_config.created_at,
      'updatedAt', v_config.updated_at,
      'source', 'configurator',
      'notes', v_config.notes
    ),
    'metadata', jsonb_build_object(
      'goalTags', '[]'::jsonb,
      'locale', 'en',
      'isPrototype', false,
      'relatedShowcaseId', null
    )
  );

  return v_payload;
end;
$$ language plpgsql stable;

grant execute on function configuration_to_configurator_payload(uuid, integer) to authenticated;

comment on function configuration_to_configurator_payload(uuid, integer) is 
'Converts a configuration record to configurator payload JSON format. Used for editing configurations in configurator.';

-- ============================================================================
-- 9. Add helper function to update configuration from configurator payload
-- ============================================================================

create or replace function update_configuration_from_payload(
  p_config_id uuid,
  p_payload jsonb
)
returns configurations as $$
declare
  v_config configurations%rowtype;
  v_vehicle_id uuid;
  v_options jsonb;
  v_option_record jsonb;
begin
  -- Get existing configuration
  select * into v_config from configurations where id = p_config_id;
  if not found then
    raise exception 'Configuration not found: %', p_config_id;
  end if;

  -- Validate payload
  if not validate_configurator_payload(p_payload) then
    raise exception 'Invalid configurator payload structure';
  end if;

  -- Extract vehicle_id from payload (match by model name)
  select id into v_vehicle_id
  from vehicles
  where name = p_payload->'vehicle'->>'model'
  limit 1;

  if v_vehicle_id is null then
    raise exception 'Vehicle not found: %', p_payload->'vehicle'->>'model';
  end if;

  -- Update configuration with payload data
  update configurations
  set
    vehicle_id = v_vehicle_id,
    configurator_payload = p_payload,
    configurator_schema_version = (p_payload->>'schemaVersion')::integer,
    configurator_last_edited_at = now(),
    updated_at = now(),
    title = coalesce(title, p_payload->'vehicle'->>'model'),
    pricing_summary = jsonb_build_object(
      'base', (p_payload->'pricing'->>'basePriceCents')::bigint,
      'options', (p_payload->'pricing'->>'optionsTotalCents')::bigint,
      'discount', (p_payload->'pricing'->>'discountCents')::bigint,
      'currency', p_payload->'pricing'->>'currency'
    )
  where id = p_config_id
  returning * into v_config;

  -- Clear existing configuration_options
  delete from configuration_options where configuration_id = p_config_id;

  -- Rebuild configuration_options from payload
  v_options := p_payload->'options';
  
  -- Process exterior options
  for v_option_record in select * from jsonb_array_elements(v_options->'exterior')
  loop
    insert into configuration_options (configuration_id, option_id, quantity)
    select p_config_id, vo.id, 1
    from vehicle_options vo
    where vo.vehicle_id = v_vehicle_id
      and vo.code = v_option_record->>'id'
      and vo.category = 'exterior'
    limit 1;
  end loop;

  -- Process interior options
  for v_option_record in select * from jsonb_array_elements(v_options->'interior')
  loop
    insert into configuration_options (configuration_id, option_id, quantity)
    select p_config_id, vo.id, 1
    from vehicle_options vo
    where vo.vehicle_id = v_vehicle_id
      and vo.code = v_option_record->>'id'
      and vo.category = 'interior'
    limit 1;
  end loop;

  -- Process performance options
  for v_option_record in select * from jsonb_array_elements(v_options->'performance')
  loop
    insert into configuration_options (configuration_id, option_id, quantity)
    select p_config_id, vo.id, 1
    from vehicle_options vo
    where vo.vehicle_id = v_vehicle_id
      and vo.code = v_option_record->>'id'
      and vo.category = 'performance'
    limit 1;
  end loop;

  return v_config;
end;
$$ language plpgsql;

grant execute on function update_configuration_from_payload(uuid, jsonb) to authenticated;

comment on function update_configuration_from_payload(uuid, jsonb) is 
'Updates a configuration from configurator payload JSON. Rebuilds configuration_options and updates all related fields.';

-- ============================================================================
-- 10. Add check constraint to ensure configurator_payload structure
-- ============================================================================

-- Note: PostgreSQL check constraints on JSONB are limited, so we rely on the validation function
-- For now, we'll add a comment documenting the expected structure

comment on column configurations.configurator_payload is 
'Full configurator state JSON matching garage_items.config_payload structure. Use validate_configurator_payload() to validate.';

-- ============================================================================
-- Summary
-- ============================================================================

-- This script prepares the database for Phase 3 Configurator by:
-- 1. Adding configurator-specific fields to vehicles and vehicle_options
-- 2. Adding configurator_payload support to configurations table
-- 3. Creating helper functions for payload conversion and validation
-- 4. Adding indexes for fast configurator queries
-- 5. Enabling seamless editing of configurations via configurator

-- ⚠️ IMPORTANT FOR FUTURE DEVELOPERS:
-- This script has been run and is part of the production schema.
-- When building Phase 3 (Configurator 2D Pipeline), use these functions:
--   - get_configurator_options(vehicle_id) - Load options for UI
--   - configuration_to_configurator_payload(config_id) - Load config for editing
--   - update_configuration_from_payload(config_id, payload) - Save edits
--
-- See: docs/development/configurator-preparation.md for complete guide

-- Next steps (Phase 3):
-- - Build configurator UI components
-- - Create manifest authoring tool
-- - Implement layer composition engine
-- - Add render export functionality

