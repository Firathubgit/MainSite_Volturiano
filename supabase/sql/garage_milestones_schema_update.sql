-- Update garage_milestones table to support state transitions and Stripe metadata
-- Run this in Supabase SQL Editor

-- Add columns for state transition tracking
alter table garage_milestones
  add column if not exists from_state text,
  add column if not exists to_state text,
  add column if not exists metadata jsonb;

-- Add index for efficient milestone queries per item
create index if not exists garage_milestones_item_idx 
  on garage_milestones (garage_item_id, occurred_at desc);

-- Add comment for documentation
comment on column garage_milestones.from_state is 'Previous state before transition (null for initial milestones)';
comment on column garage_milestones.to_state is 'New state after transition';
comment on column garage_milestones.metadata is 'Additional data (Stripe order_id, payment_intent_id, amount, etc.)';

