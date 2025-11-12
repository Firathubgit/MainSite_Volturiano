-- Supabase schema for AI Assistant features

create extension if not exists "pgcrypto";

create table if not exists assistant_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references account_profiles(id) on delete cascade,
  started_at timestamptz default now(),
  ended_at timestamptz,
  locale text default 'en',
  summary text,
  metadata jsonb default '{}'::jsonb
);

create table if not exists assistant_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references assistant_sessions(id) on delete cascade,
  role text not null, -- user | assistant | system
  content text not null,
  content_json jsonb,
  created_at timestamptz default now()
);

create table if not exists assistant_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references assistant_sessions(id) on delete cascade,
  owner_id uuid references account_profiles(id) on delete set null,
  event_type text not null, -- message_sent | redirect_clicked | handoff_requested | voice_started | voice_stopped
  payload jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists assistant_handoff_requests (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references account_profiles(id) on delete set null,
  name text,
  contact_method text, -- phone | email
  contact_value text,
  intent text,
  session_id uuid references assistant_sessions(id) on delete set null,
  payload jsonb default '{}'::jsonb,
  status text default 'pending',
  created_at timestamptz default now(),
  resolved_at timestamptz
);

create table if not exists assistant_intents (
  id uuid primary key default gen_random_uuid(),
  intent_key text not null unique,
  label text,
  description text,
  route text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- RLS
alter table assistant_sessions enable row level security;
alter table assistant_messages enable row level security;
alter table assistant_events enable row level security;
alter table assistant_handoff_requests enable row level security;
alter table assistant_intents enable row level security;

create policy if not exists "assistant_sessions_owner" on assistant_sessions
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy if not exists "assistant_messages_owner" on assistant_messages
  using (
    exists (
      select 1 from assistant_sessions s
      where s.id = assistant_messages.session_id
        and s.owner_id = auth.uid()
    )
  );

create policy if not exists "assistant_events_owner" on assistant_events
  using (
    owner_id = auth.uid() or
    exists (
      select 1 from assistant_sessions s
      where s.id = assistant_events.session_id
        and s.owner_id = auth.uid()
    )
  );

create policy if not exists "assistant_handoff_owner" on assistant_handoff_requests
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy if not exists "assistant_intents_public" on assistant_intents
  for select using (true);

-- Service role bypass for analytics/admin
create policy if not exists "assistant_service_role" on assistant_sessions
  for all using (current_setting('request.jwt.claims', true)::json ->> 'role' = 'service_role')
  with check (current_setting('request.jwt.claims', true)::json ->> 'role' = 'service_role');

create policy if not exists "assistant_messages_service_role" on assistant_messages
  for all using (current_setting('request.jwt.claims', true)::json ->> 'role' = 'service_role')
  with check (current_setting('request.jwt.claims', true)::json ->> 'role' = 'service_role');

create policy if not exists "assistant_events_service_role" on assistant_events
  for all using (current_setting('request.jwt.claims', true)::json ->> 'role' = 'service_role')
  with check (current_setting('request.jwt.claims', true)::json ->> 'role' = 'service_role');

create policy if not exists "assistant_handoff_service_role" on assistant_handoff_requests
  for all using (current_setting('request.jwt.claims', true)::json ->> 'role' = 'service_role')
  with check (current_setting('request.jwt.claims', true)::json ->> 'role' = 'service_role');

-- Trigger to timestamp message insert
create or replace function set_session_updated_at() returns trigger as $$
begin
  update assistant_sessions set ended_at = now() where id = new.session_id;
  return new;
end;
$$ language plpgsql;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'assistant_messages_session_touch') then
    create trigger assistant_messages_session_touch
      after insert on assistant_messages
      for each row execute function set_session_updated_at();
  end if;
end
$$;

