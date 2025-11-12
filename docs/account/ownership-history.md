## Vehicle Ownership & Service History

### Tables

1. `vehicle_ownerships`
   - `id uuid pk`
   - `owner_id uuid references account_profiles`
   - `vehicle_model text`
   - `vin text`
   - `status text` (ordered | delivered | in_service | sold)
   - `purchased_at timestamptz`
   - `delivered_at timestamptz`
   - `metadata jsonb` (color, configuration ID)
2. `service_plans`
   - `id uuid pk`
   - `owner_id uuid references account_profiles`
   - `vehicle_ownership_id uuid references vehicle_ownerships`
   - `plan_name text`
  - `expires_at timestamptz`
   - `coverage jsonb`
3. `ownership_milestones`
   - `id uuid pk`
   - `vehicle_ownership_id uuid`
   - `type text` (order_submitted, delivery, service_booked, service_completed, track_day, retrofit)
   - `notes text`
   - `occurred_at timestamptz`

### UI

- Timeline component showing milestones with icon per type.
- Detail drawer with VIN, configuration snapshot, and service plan status.
- Import placeholder for admin to upload VIN data (future).

### Integration

- When user saves configuration and marks as purchased, create ownership record.
- Service appointments should append milestones automatically.
- Data accessible only to owner (`auth.uid()` policy) and admin via SECURITY DEFINER RPC.


