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

  // Try to delete from Supabase Auth
  const { error: authError } = await admin.auth.admin.deleteUser(user_id)

  // If auth user doesn't exist (ghost profile — created before service key was configured),
  // fall through and just delete the profile row so it disappears from the UI.
  if (authError && !authError.message.toLowerCase().includes('not found') && !authError.message.toLowerCase().includes('user not found')) {
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  // Always delete the profile row (cascade handles related data)
  await admin.from('profiles').delete().eq('id', user_id)

  return NextResponse.json({ ok: true })
}
