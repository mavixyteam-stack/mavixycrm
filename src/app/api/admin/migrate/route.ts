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

ALTER TABLE clients ADD COLUMN IF NOT EXISTS connections JSONB DEFAULT '{}'::jsonb;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS ai_brief TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS about_business TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS target_audience TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS brand_voice TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS reference_links TEXT;

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
END $$;`

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
