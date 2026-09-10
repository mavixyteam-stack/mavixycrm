import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const ALLOWED_TABLES = ['deals', 'tasks', 'clients', 'plan_items', 'attendance', 'attendance_requests', 'profiles', 'journeys', 'proposals', 'invoices']
const SENSITIVE_TABLES = ['invoices']

export async function POST(req: NextRequest) {
  const sb = await createServerClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { table, id } = await req.json()
  if (!ALLOWED_TABLES.includes(table)) {
    return NextResponse.json({ error: 'Invalid table' }, { status: 400 })
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  if (SENSITIVE_TABLES.includes(table)) {
    const { data: prof } = await admin.from('profiles').select('role').eq('id', user.id).single()
    if (!prof || !['owner', 'manager'].includes(prof.role)) {
      return NextResponse.json({ error: 'Owner/manager only' }, { status: 403 })
    }
  }

  const { error } = await admin.from(table).delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
