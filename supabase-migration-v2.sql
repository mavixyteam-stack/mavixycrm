-- ─── Migration v2: attendance_requests + client connections ──────────────────
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)

-- 1. Add connections column to clients (stores per-platform link state)
alter table public.clients
  add column if not exists connections jsonb not null default '{}';

-- 2. Create attendance_requests table
create table if not exists public.attendance_requests (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles on delete cascade not null,
  type text not null default 'correction' check (type in ('correction', 'leave')),
  date date not null,
  leave_end date,
  leave_type text check (leave_type in ('sick', 'casual', 'annual', 'wfh')),
  check_in text,   -- HH:MM format for correction requests
  check_out text,  -- HH:MM format for correction requests
  reason text not null default '',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.profiles on delete set null,
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz default now()
);

alter table public.attendance_requests enable row level security;

create policy "Users can read own requests" on public.attendance_requests
  for select using (auth.uid() = user_id);

create policy "Owners and managers can read all requests" on public.attendance_requests
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('owner', 'manager'))
  );

create policy "Users can insert own requests" on public.attendance_requests
  for insert with check (auth.uid() = user_id);

create policy "Owners and managers can update requests" on public.attendance_requests
  for update using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('owner', 'manager'))
  );

create policy "Users can update own requests" on public.attendance_requests
  for update using (auth.uid() = user_id);
