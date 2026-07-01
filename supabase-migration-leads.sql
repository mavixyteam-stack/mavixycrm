-- Migration: extend deals table with lead-specific fields
-- Run this in Supabase SQL editor

ALTER TABLE deals
  ADD COLUMN IF NOT EXISTS email       text,
  ADD COLUMN IF NOT EXISTS phone       text,
  ADD COLUMN IF NOT EXISTS source      text,
  ADD COLUMN IF NOT EXISTS service     text,
  ADD COLUMN IF NOT EXISTS budget_text text,
  ADD COLUMN IF NOT EXISTS score       text,
  ADD COLUMN IF NOT EXISTS lead_status text,
  ADD COLUMN IF NOT EXISTS notes       text,
  ADD COLUMN IF NOT EXISTS initials    text,
  ADD COLUMN IF NOT EXISTS color       text;
