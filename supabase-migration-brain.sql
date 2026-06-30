-- Migration: Add client brain fields
-- Run this in your Supabase SQL editor to add onboarding + brain fields to clients table

alter table public.clients
  add column if not exists whatsapp text default '',
  add column if not exists account_owner_id uuid references public.profiles on delete set null,
  add column if not exists posts_per_month integer,
  add column if not exists monthly_retainer integer,
  add column if not exists ai_brief text default '',
  add column if not exists about_business text default '',
  add column if not exists target_audience text default '',
  add column if not exists brand_voice text default '',
  add column if not exists reference_links text default '';
