import { NextResponse } from 'next/server'

export const SQL = `-- Run this once in Supabase → SQL Editor
ALTER TABLE deals ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS service TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS budget_text TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS score TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS lead_status TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS initials TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS color TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS follow_up_date DATE;

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS idea TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS hook TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS format TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS refs JSONB;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS channel TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS goal TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE tasks ALTER COLUMN refs DROP NOT NULL;

ALTER TABLE clients ADD COLUMN IF NOT EXISTS connections JSONB DEFAULT '{}'::jsonb;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS ai_brief TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS about_business TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS target_audience TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS brand_voice TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS reference_links TEXT;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT;

-- Notifications (in-app notification center)
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT,
  text TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  link TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications (user_id, created_at DESC);
-- Heal a pre-existing notifications table that lacks the newer columns
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS link TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'info';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read BOOLEAN NOT NULL DEFAULT false;

-- Row Level Security (allow all authenticated users to read/write)
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mavixy_deals" ON deals;
CREATE POLICY "mavixy_deals" ON deals FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "mavixy_clients" ON clients;
CREATE POLICY "mavixy_clients" ON clients FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "mavixy_tasks" ON tasks;
CREATE POLICY "mavixy_tasks" ON tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "mavixy_plan_items" ON plan_items;
CREATE POLICY "mavixy_plan_items" ON plan_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "mavixy_attendance" ON attendance;
CREATE POLICY "mavixy_attendance" ON attendance FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "mavixy_att_req" ON attendance_requests;
CREATE POLICY "mavixy_att_req" ON attendance_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "mavixy_profiles" ON profiles;
CREATE POLICY "mavixy_profiles" ON profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "mavixy_notifications" ON notifications;
CREATE POLICY "mavixy_notifications" ON notifications FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Enable Realtime for instant notification delivery (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  END IF;
END $$;

-- Employee onboarding pipeline
CREATE TABLE IF NOT EXISTS onboarding_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'employee',
  title TEXT,
  work_email TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_by UUID,
  full_name TEXT,
  personal_email TEXT,
  phone TEXT,
  emergency_phone TEXT,
  aadhar_number TEXT,
  pan_number TEXT,
  aadhar_path TEXT,
  pan_path TEXT,
  bank_account_number TEXT,
  bank_ifsc TEXT,
  bank_name TEXT,
  bank_branch TEXT,
  submitted_at TIMESTAMPTZ,
  m365_email TEXT,
  created_profile_id UUID,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE onboarding_invites ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE onboarding_invites ADD COLUMN IF NOT EXISTS buddy_id UUID;

-- Sensitive PII (Aadhaar/PAN/bank): RLS on with NO permissive policy, so
-- regular clients can't read it. All access goes through owner-checked,
-- service-role server routes.
ALTER TABLE onboarding_invites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mavixy_onboarding" ON onboarding_invites;

-- Private storage bucket for onboarding documents (Aadhaar/PAN)
INSERT INTO storage.buckets (id, name, public)
VALUES ('onboarding-docs', 'onboarding-docs', false)
ON CONFLICT (id) DO NOTHING;

-- Department on profiles (discipline: Creative / Digital Marketing / Sales …)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS department TEXT;

-- End-of-day work logs (what each person got done, captured at checkout)
CREATE TABLE IF NOT EXISTS work_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS work_logs_user_date_idx ON work_logs (user_id, date);
ALTER TABLE work_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mavixy_work_logs" ON work_logs;
CREATE POLICY "mavixy_work_logs" ON work_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);`

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const ref = url?.replace('https://', '').split('.')[0]
  const token = process.env.SUPABASE_ACCESS_TOKEN

  const results: { sql: string; ok: boolean; error?: string }[] = []
  let autoRan = false

  // Try Supabase Management API if access token is available
  if (token && ref) {
    autoRan = true
    for (const line of SQL.split('\n').filter(l => l.trim() && !l.startsWith('--'))) {
      const sql = line.replace(/;$/, '').trim()
      if (!sql) continue
      try {
        const r = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ query: sql }),
        })
        const body = await r.json().catch(() => ({}))
        results.push({ sql, ok: r.ok, error: r.ok ? undefined : (body?.message || r.statusText) })
      } catch (e: any) {
        results.push({ sql, ok: false, error: e.message })
      }
    }
  }

  const allOk = autoRan && results.every(r => r.ok)

  return NextResponse.json({
    ok: allOk,
    autoRan,
    results: autoRan ? results : undefined,
    message: allOk
      ? 'All migrations applied automatically.'
      : autoRan
        ? 'Some migrations failed — run the SQL below manually in Supabase → SQL Editor.'
        : 'SUPABASE_ACCESS_TOKEN not set — run the SQL below manually in Supabase → SQL Editor.',
    sql: SQL,
    supabaseUrl: url ? `${url.replace('https://', 'https://app.supabase.com/project/')}/sql/new` : null,
  })
}
