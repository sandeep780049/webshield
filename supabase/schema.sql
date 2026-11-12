-- WebShield Supabase schema
-- Run this in the Supabase SQL editor after creating a project.
--
-- The table stores the complete scan document in `payload` (jsonb) plus a few
-- indexed columns used for listing. Row Level Security ensures each user can
-- only read and modify their own scans. Never disable RLS on this table.

create table if not exists public.scans (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  target text not null,
  mode text not null check (mode in ('demo', 'external')),
  status text not null check (status in ('queued', 'running', 'completed', 'failed', 'cancelled')),
  started_at timestamptz not null,
  completed_at timestamptz,
  duration_ms integer,
  sqli_count integer not null default 0,
  xss_count integer not null default 0,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists scans_user_started_idx
  on public.scans (user_id, started_at desc);

alter table public.scans enable row level security;

drop policy if exists "Users can read their own scans" on public.scans;
create policy "Users can read their own scans"
  on public.scans for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own scans" on public.scans;
create policy "Users can insert their own scans"
  on public.scans for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own scans" on public.scans;
create policy "Users can update their own scans"
  on public.scans for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own scans" on public.scans;
create policy "Users can delete their own scans"
  on public.scans for delete
  using (auth.uid() = user_id);
