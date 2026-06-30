import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// Verify the calling user is an owner before creating accounts
async function getCallerRole(): Promise<string | null> {
  const cookieStore = await cookies()
  const sb = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return null
  const { data: profile } = await sb.from('profiles').select('role').eq('id', user.id).single()
  return profile?.role || null
}

export async function POST(req: NextRequest) {
  const callerRole = await getCallerRole()
  if (callerRole !== 'owner') {
    return NextResponse.json({ error: 'Only owners can create accounts' }, { status: 403 })
  }

  const { name, email, password, title, role, color } = await req.json()
  if (!email || !password || !name) {
    return NextResponse.json({ error: 'name, email and password are required' }, { status: 400 })
  }

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, role: role || 'employee', title: title || '', color: color || '#0EA5A4' },
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, user_id: data.user.id })
}
