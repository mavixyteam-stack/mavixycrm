import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

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
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is not set. Add it to your Vercel environment variables.' }, { status: 500 })
  }

  const callerRole = await getCallerRole()
  if (callerRole !== 'owner') {
    return NextResponse.json({ error: 'Only owners can update accounts' }, { status: 403 })
  }

  const { user_id, name, title, role, color, department, new_password } = await req.json()
  if (!user_id) return NextResponse.json({ error: 'user_id required' }, { status: 400 })

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  )

  // Update auth user (password + metadata) if needed
  const authUpdate: Record<string, unknown> = {}
  if (new_password) authUpdate.password = new_password
  if (name || role || color || title) {
    authUpdate.user_metadata = { name, role, title, color }
  }
  if (Object.keys(authUpdate).length > 0) {
    const { error } = await admin.auth.admin.updateUserById(user_id, authUpdate)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // Update profiles table
  const profileUpdate: Record<string, unknown> = {}
  if (name !== undefined) {
    profileUpdate.name = name
    profileUpdate.initials = name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
  }
  if (title !== undefined) profileUpdate.title = title
  if (role !== undefined) profileUpdate.role = role
  if (color !== undefined) profileUpdate.color = color
  if (department !== undefined) profileUpdate.department = department

  if (Object.keys(profileUpdate).length > 0) {
    const { error } = await admin.from('profiles').update(profileUpdate).eq('id', user_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
