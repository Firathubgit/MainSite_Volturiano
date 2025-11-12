-- Supabase schema for account settings & profile features

create extension if not exists "pgcrypto";

create table if not exists notification_preferences (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references account_profiles(id) on delete cascade,
  channel text not null, -- email | push | sms (future)
  category text not null, -- garage_updates | events | service | marketing | security
  enabled boolean not null default true,
  metadata jsonb default '{}'::jsonb,
  updated_at timestamptz default now()
);

create table if not exists account_addresses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references account_profiles(id) on delete cascade,
  label text,
  recipient text not null,
  line1 text not null,
  line2 text,
  city text not null,
  region text,
  postal_code text not null,
  country text not null,
  phone text,
  is_primary boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists vehicle_ownerships (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references account_profiles(id) on delete cascade,
  vehicle_model text not null,
  vin text,
  status text not null default 'ordered',
  purchased_at timestamptz,
  delivered_at timestamptz,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists ownership_milestones (
  id uuid primary key default gen_random_uuid(),
  vehicle_ownership_id uuid not null references vehicle_ownerships(id) on delete cascade,
  milestone_type text not null,
  notes text,
  occurred_at timestamptz not null default now()
);

create table if not exists service_plans (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references account_profiles(id) on delete cascade,
  vehicle_ownership_id uuid references vehicle_ownerships(id) on delete cascade,
  plan_name text not null,
  expires_at timestamptz,
  coverage jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists linked_accounts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references account_profiles(id) on delete cascade,
  provider text not null, -- google | apple | alexa | car_os
  provider_uid text not null,
  linked_at timestamptz default now(),
  metadata jsonb default '{}'::jsonb
);

create table if not exists loyalty_status (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references account_profiles(id) on delete cascade,
  tier text not null default 'bronze',
  points integer default 0,
  badges jsonb default '[]'::jsonb,
  updated_at timestamptz default now()
);

create table if not exists impact_preferences (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references account_profiles(id) on delete cascade,
  cause text not null,
  enabled boolean default true,
  metadata jsonb default '{}'::jsonb,
  updated_at timestamptz default now()
);

create table if not exists account_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references account_profiles(id) on delete cascade,
  event_name text not null,
  event_date timestamptz not null,
  location text,
  description text,
  rsvp_status text default 'pending',
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists service_appointments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references account_profiles(id) on delete cascade,
  vehicle_ownership_id uuid references vehicle_ownerships(id) on delete set null,
  scheduled_at timestamptz not null,
  location text,
  status text default 'scheduled',
  notes text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists document_vault (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references account_profiles(id) on delete cascade,
  document_name text not null,
  storage_path text not null,
  document_type text,
  uploaded_at timestamptz default now(),
  metadata jsonb default '{}'::jsonb
);

create table if not exists render_export_jobs -- reused from configurator3d schema if needed
(
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references account_profiles(id) on delete cascade,
  config_payload jsonb not null,
  resolution text not null,
  watermark boolean default true,
  status text not null default 'queued',
  output_url text,
  error_message text,
  created_at timestamptz default now(),
  completed_at timestamptz
) ;

create table if not exists webauthn_credentials (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references account_profiles(id) on delete cascade,
  credential_id text not null,
  public_key text not null,
  counter bigint default 0,
  device_label text,
  created_at timestamptz default now()
);

create table if not exists render_preferences_sync (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references account_profiles(id) on delete cascade,
  last_synced_at timestamptz,
  payload jsonb default '{}'::jsonb,
  status text default 'idle'
);

-- RLS policies
alter table notification_preferences enable row level security;
alter table account_addresses enable row level security;
alter table vehicle_ownerships enable row level security;
alter table ownership_milestones enable row level security;
alter table service_plans enable row level security;
alter table linked_accounts enable row level security;
alter table loyalty_status enable row level security;
alter table impact_preferences enable row level security;
alter table account_events enable row level security;
alter table service_appointments enable row level security;
alter table document_vault enable row level security;
alter table webauthn_credentials enable row level security;
alter table render_preferences_sync enable row level security;

create policy if not exists "owner_access" on notification_preferences
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy if not exists "owner_access" on account_addresses
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy if not exists "owner_access" on vehicle_ownerships
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy if not exists "owner_access" on ownership_milestones
  using (
    exists (
      select 1 from vehicle_ownerships vo
      where vo.id = ownership_milestones.vehicle_ownership_id
        and vo.owner_id = auth.uid()
    )
  );

create policy if not exists "owner_access" on service_plans
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy if not exists "owner_access" on linked_accounts
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy if not exists "owner_access" on loyalty_status
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy if not exists "owner_access" on impact_preferences
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy if not exists "owner_access" on account_events
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy if not exists "owner_access" on service_appointments
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy if not exists "owner_access" on document_vault
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy if not exists "owner_access" on webauthn_credentials
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy if not exists "owner_access" on render_preferences_sync
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- Updated_at triggers
do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'account_addresses_updated_at') then
    create trigger account_addresses_updated_at
      before update on account_addresses
      for each row execute function set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'notification_preferences_updated_at') then
    create trigger notification_preferences_updated_at
      before update on notification_preferences
      for each row execute function set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'loyalty_status_updated_at') then
    create trigger loyalty_status_updated_at
      before update on loyalty_status
      for each row execute function set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'impact_preferences_updated_at') then
    create trigger impact_preferences_updated_at
      before update on impact_preferences
      for each row execute function set_updated_at();
  end if;
end
$$;


