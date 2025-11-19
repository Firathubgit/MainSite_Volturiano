-- Add order_id link to garage_items for Stripe webhook integration
-- Run this in Supabase SQL Editor

-- Add optional order_id column to garage_items
alter table garage_items
  add column if not exists order_id uuid references orders(id) on delete set null;

-- Add partial index for order lookups (only indexes non-null values)
create index if not exists garage_items_order_idx 
  on garage_items (order_id) 
  where order_id is not null;

-- Add comment for documentation
comment on column garage_items.order_id is 'Optional link to orders table for Stripe payment tracking';

