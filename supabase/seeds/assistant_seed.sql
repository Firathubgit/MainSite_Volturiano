-- Seed AI assistant data

insert into assistant_intents (id, intent_key, label, description, route, metadata)
values
  ('60000000-0000-4000-8000-000000000001', 'schedule_test_drive', 'Schedule Test Drive', 'Guide user to book a track or city drive.', '/events/test-drive', '{"cta":"Schedule now"}'),
  ('60000000-0000-4000-8000-000000000002', 'finance_options', 'Finance Options', 'Explain available finance projections.', '/finance', '{"rpc":"get_finance_estimate"}'),
  ('60000000-0000-4000-8000-000000000003', 'inventory_alerts', 'Inventory Alerts', 'Show limited-availability models.', '/models?filter=limited', '{"rpc":"list_inventory_alerts"}'),
  ('60000000-0000-4000-8000-000000000004', 'experience_invites', 'Experience Invites', 'Highlight upcoming experiences.', '/experiences', '{"rpc":"list_experiences"}')
on conflict (intent_key) do nothing;

-- Demo session with messages
insert into assistant_sessions (id, owner_id, started_at, locale, summary)
values
  ('61000000-0000-4000-8000-000000000001', '77777777-7777-7777-7777-777777777777', now() - interval '1 day', 'en', 'Discussed winter wheels and test drive booking.')
on conflict do nothing;

insert into assistant_messages (id, session_id, role, content, created_at)
values
  ('62000000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000001', 'user', 'Can you help me schedule a winter test drive?', now() - interval '1 day'),
  ('62000000-0000-4000-8000-000000000002', '61000000-0000-4000-8000-000000000001', 'assistant', 'Absolutely. I can guide you to our test drive scheduler—would you like a track or city session?', now() - interval '1 day' + interval '30 seconds')
on conflict do nothing;

insert into assistant_events (id, session_id, owner_id, event_type, payload, created_at)
values
  ('63000000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000001', '77777777-7777-7777-7777-777777777777', 'redirect_clicked', '{"route":"/events/test-drive"}', now() - interval '23 hours')
on conflict do nothing;


