-- Seed data for account settings features

-- Notification preferences
insert into notification_preferences (id, owner_id, channel, category, enabled)
values
  ('50000000-0000-4000-8000-000000000001', '77777777-7777-7777-7777-777777777777', 'email', 'garage_updates', true),
  ('50000000-0000-4000-8000-000000000002', '77777777-7777-7777-7777-777777777777', 'email', 'events', true),
  ('50000000-0000-4000-8000-000000000003', '77777777-7777-7777-7777-777777777777', 'email', 'marketing', false)
on conflict do nothing;

-- Addresses
insert into account_addresses (id, owner_id, label, recipient, line1, city, region, postal_code, country, is_primary)
values
  ('51000000-0000-4000-8000-000000000001', '77777777-7777-7777-7777-777777777777', 'Home', 'Demo Driver', '123 Aurora Blvd', 'Stockholm', 'Stockholm', '11453', 'SE', true),
  ('51000000-0000-4000-8000-000000000002', '77777777-7777-7777-7777-777777777777', 'Track HQ', 'Demo Driver', '1 Circuit Way', 'Monza', 'Monza', '20900', 'IT', false)
on conflict do nothing;

-- Vehicle ownership
insert into vehicle_ownerships (id, owner_id, vehicle_model, vin, status, purchased_at, delivered_at, metadata)
values
  ('52000000-0000-4000-8000-000000000001', '77777777-7777-7777-7777-777777777777', 'tornado-gt', 'VOLTGT25DEMO001', 'delivered', now() - interval '180 days', now() - interval '160 days', '{"color":"Orange Fury"}')
on conflict do nothing;

insert into ownership_milestones (id, vehicle_ownership_id, milestone_type, notes, occurred_at)
values
  ('52000000-0000-4000-8000-000000000002', '52000000-0000-4000-8000-000000000001', 'order_submitted', 'Placed during Geneva reveal.', now() - interval '200 days'),
  ('52000000-0000-4000-8000-000000000003', '52000000-0000-4000-8000-000000000001', 'delivery', 'Delivered to Stockholm Experience Center.', now() - interval '160 days'),
  ('52000000-0000-4000-8000-000000000004', '52000000-0000-4000-8000-000000000001', 'service_completed', '1,000 km complimentary service.', now() - interval '120 days')
on conflict do nothing;

insert into service_plans (id, owner_id, vehicle_ownership_id, plan_name, expires_at, coverage)
values
  ('53000000-0000-4000-8000-000000000001', '77777777-7777-7777-7777-777777777777', '52000000-0000-4000-8000-000000000001', 'Volturiano Care+', now() + interval '2 years', '{"visits":4,"roadside":true}')
on conflict do nothing;

-- Linked accounts
insert into linked_accounts (id, owner_id, provider, provider_uid, metadata)
values
  ('54000000-0000-4000-8000-000000000001', '77777777-7777-7777-7777-777777777777', 'google', 'demo@gmail.com', '{"linked_at":"2025-01-10"}')
on conflict do nothing;

-- Loyalty status
insert into loyalty_status (id, owner_id, tier, points, badges)
values
  ('55000000-0000-4000-8000-000000000001', '77777777-7777-7777-7777-777777777777', 'silver', 4200, '["first_delivery","track_day"]')
on conflict do nothing;

-- Impact preferences
insert into impact_preferences (id, owner_id, cause, enabled)
values
  ('56000000-0000-4000-8000-000000000001', '77777777-7777-7777-7777-777777777777', 'sustainability', true),
  ('56000000-0000-4000-8000-000000000002', '77777777-7777-7777-7777-777777777777', 'education', false)
on conflict do nothing;

-- Account events
insert into account_events (id, owner_id, event_name, event_date, location, description, rsvp_status, metadata)
values
  ('57000000-0000-4000-8000-000000000001', '77777777-7777-7777-7777-777777777777', 'Volturiano Track Day', now() + interval '45 days', 'Ascari Circuit', 'Invite-only track experience.', 'confirmed', '{"dressCode":"smart casual"}'),
  ('57000000-0000-4000-8000-000000000002', '77777777-7777-7777-7777-777777777777', 'Winter Concierge Briefing', now() + interval '90 days', 'Virtual', 'Prepare your Tornado GT for winter touring.', 'pending', null)
on conflict do nothing;

-- Service appointments
insert into service_appointments (id, owner_id, vehicle_ownership_id, scheduled_at, location, status, notes)
values
  ('58000000-0000-4000-8000-000000000001', '77777777-7777-7777-7777-777777777777', '52000000-0000-4000-8000-000000000001', now() + interval '30 days', 'Volturiano Stockholm Service', 'scheduled', 'Seasonal wheel swap & diagnostics.')
on conflict do nothing;

-- Document vault
insert into document_vault (id, owner_id, document_name, storage_path, document_type, metadata)
values
  ('59000000-0000-4000-8000-000000000001', '77777777-7777-7777-7777-777777777777', 'Purchase Agreement', 'documents/77777777/purchase-agreement.pdf', 'agreement', '{"size":"1.2MB"}')
on conflict do nothing;

-- WebAuthn credentials (placeholder)
insert into webauthn_credentials (id, owner_id, credential_id, public_key, counter, device_label)
values
  ('5a000000-0000-4000-8000-000000000001', '77777777-7777-7777-7777-777777777777', 'credential-demo-123', 'PUBLIC_KEY_PLACEHOLDER', 0, 'MacBook Pro')
on conflict do nothing;

-- Preference sync placeholder
insert into render_preferences_sync (id, owner_id, last_synced_at, payload, status)
values
  ('5b000000-0000-4000-8000-000000000001', '77777777-7777-7777-7777-777777777777', now() - interval '3 days', '{"lighting":"track-day","audio":"muted"}', 'success')
on conflict do nothing;

