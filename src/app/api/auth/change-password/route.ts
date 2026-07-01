import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 })
  }

  const cookieStore = await cookies()
  const sb = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { new_password, name, color } = await req.json()

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  )

  if (new_password) {
    if (new_password.length < 6) return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    const { error } = await admin.auth.admin.updateUserById(user.id, { password: new_password })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  }

  const profileUpdate: Record<string, unknown> = {}
  if (name) {
    profileUpdate.name = name
    profileUpdate.initials = name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
  }
  if (color) profileUpdate.color = color

  if (Object.keys(profileUpdate).length > 0) {
    const { error } = await admin.from('profiles').update(profileUpdate).eq('id', user.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
