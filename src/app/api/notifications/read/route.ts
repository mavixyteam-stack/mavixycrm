import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/notify'

/** Mark one notification (by id) or all of the current user's notifications as read. */
export async function POST(req: NextRequest) {
  const sb = await createServerClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, all } = await req.json().catch(() => ({}))
  const admin = adminClient()

  // Always scope to the current user so nobody can flip someone else's rows.
  let q = admin.from('notifications').update({ read: true }).eq('user_id', user.id)
  if (!all) {
    if (!id) return NextResponse.json({ error: 'id or all required' }, { status: 400 })
    q = q.eq('id', id)
  }

  const { error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
