-- Add check_compatibility RPC function for Phase 1
-- This function evaluates compatibility rules against selected options

create or replace function check_compatibility(selected_options jsonb)
returns table (
  rule_id uuid,
  rule_type text,
  primary_option_value_id uuid,
  secondary_option_value_id uuid,
  message text,
  auto_resolve boolean,
  violation_type text -- 'requires_missing' | 'incompatible_selected'
) as $$
begin
  return query
  with selected_values as (
    -- Extract option_value_ids from the selected_options JSONB
    -- Format: {"option_id_1": "value_id_1", "option_id_2": "value_id_2"}
    select value::uuid as option_value_id
    from jsonb_each_text(selected_options)
  ),
  applicable_rules as (
    -- Find all rules where primary option is selected
    select 
      cr.id as rule_id,
      cr.rule_type::text,
      cr.primary_option_value_id,
      cr.secondary_option_value_id,
      cr.message,
      -- Check if secondary is also selected (for 'requires' rules)
      exists(
        select 1 from selected_values sv2
        where sv2.option_value_id = cr.secondary_option_value_id
      ) as secondary_selected
    from compatibility_rules cr
    where cr.primary_option_value_id in (
      select option_value_id from selected_values
    )
  )
  select 
    ar.rule_id,
    ar.rule_type,
    ar.primary_option_value_id,
    ar.secondary_option_value_id,
    ar.message,
    -- Auto-resolve: true for 'requires' rules that can be auto-selected
    case 
      when ar.rule_type = 'requires' and not ar.secondary_selected then true
      else false
    end as auto_resolve,
    -- Violation type
    case
      when ar.rule_type = 'requires' and not ar.secondary_selected then 'requires_missing'
      when ar.rule_type = 'incompatible' and ar.secondary_selected then 'incompatible_selected'
      else null
    end as violation_type
  from applicable_rules ar
  where 
    -- Return violations only
    (ar.rule_type = 'requires' and not ar.secondary_selected) or
    (ar.rule_type = 'incompatible' and ar.secondary_selected);
end;
$$ language plpgsql stable security definer;

grant execute on function check_compatibility(jsonb) to authenticated;

comment on function check_compatibility(jsonb) is 
'Evaluates compatibility rules against selected options. Returns violations where:
- requires: primary is selected but secondary is missing
- incompatible: both primary and secondary are selected';

