import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const ALLOWED_TABLES = ['deals', 'tasks', 'clients', 'plan_items', 'attendance', 'attendance_requests', 'profiles', 'work_logs', 'journeys', 'proposals', 'invoices', 'contracts']
// Financial tables: writes require owner/manager, enforced server-side.
const SENSITIVE_TABLES = ['invoices']

export async function POST(req: NextRequest) {
  const sb = await createServerClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { table, row } = await req.json()
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

  // Retry loop: strip unknown columns and retry until success
  let currentRow = { ...row }
  const strippedCols: string[] = []
  const maxRetries = Object.keys(row).length

  for (let i = 0; i <= maxRetries; i++) {
    const { error } = await admin.from(table).upsert(currentRow)
    if (!error) {
      return NextResponse.json({ ok: true, strippedCols: strippedCols.length ? strippedCols : undefined })
    }

    // If the error is about a missing column, remove it and retry
    const match = error.message?.match(/Could not find the '(.+?)' column/)
    if (match) {
      const col = match[1]
      strippedCols.push(col)
      delete currentRow[col]
      continue
    }

    // Any other error — fail immediately
    console.error(`upsert ${table}:`, error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ error: 'Could not resolve schema mismatch', strippedCols }, { status: 500 })
}
