-- Migration: Create callback_requests table, indexes, and RLS policies

create table if not exists callback_requests (
    id uuid primary key default gen_random_uuid(),
    quotation_id uuid,
    application_reference text,
    customer_name text,
    phone text,
    email text,
    business_type text,
    quotation_amount numeric,
    status text default 'pending',
    notification_sent boolean default false,
    created_at timestamptz default now()
);

-- Indexes
create index if not exists idx_callback_requests_created_at
on callback_requests(created_at desc);

create index if not exists idx_callback_requests_status
on callback_requests(status);

create index if not exists idx_callback_requests_quotation_id
on callback_requests(quotation_id);

-- Row Level Security
alter table callback_requests enable row level security;

-- Customer Insert Policy
create policy callback_insert
on callback_requests
for insert
to authenticated, anon
with check (true);

-- Admin / General Select Policy
create policy callback_select
on callback_requests
for select
to authenticated, anon
using (true);

-- Admin / General Update Policy
create policy callback_update
on callback_requests
for update
to authenticated, anon
using (true);
