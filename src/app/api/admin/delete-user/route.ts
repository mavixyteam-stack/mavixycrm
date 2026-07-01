import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

async function getCallerAndRole(): Promise<{ callerId: string | null; role: string | null }> {
  const cookieStore = await cookies()
  const sb = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return { callerId: null, role: null }
  const { data: profile } = await sb.from('profiles').select('role').eq('id', user.id).single()
  return { callerId: user.id, role: profile?.role || null }
}

export async function POST(req: NextRequest) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is not set. Add it to your Vercel environment variables.' }, { status: 500 })
  }

  const { callerId, role } = await getCallerAndRole()
  if (role !== 'owner') {
    return NextResponse.json({ error: 'Only owners can delete accounts' }, { status: 403 })
  }

  const { user_id } = await req.json()
  if (!user_id) return NextResponse.json({ error: 'user_id required' }, { status: 400 })
  if (user_id === callerId) return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 })

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  )

  // Best-effort: remove from Supabase Auth. Ghost profiles won't be there — that's fine.
  await admin.auth.admin.deleteUser(user_id)

  // Unassign from any plan_items and tasks before deleting the profile
  // (FK constraints prevent profile deletion while references exist)
  await admin.from('plan_items').update({ assignee_id: null }).eq('assignee_id', user_id)
  await admin.from('tasks').update({ assignee_id: null }).eq('assignee_id', user_id)

  // Authoritative delete — remove the profile row
  const { error: profileError } = await admin.from('profiles').delete().eq('id', user_id)
  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
