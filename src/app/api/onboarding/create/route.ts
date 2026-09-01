import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/notify'
import { makeInviteToken } from '@/lib/onboarding'

// Owner/manager creates an onboarding invite and gets a shareable link.
export async function POST(req: NextRequest) {
  const sb = await createServerClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = adminClient()
  const { data: caller } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (!caller || !['owner', 'manager'].includes(caller.role)) {
    return NextResponse.json({ error: 'Only owners or managers can start onboarding' }, { status: 403 })
  }

  const { role, title } = await req.json()
  const token = makeInviteToken()

  const { data, error } = await admin.from('onboarding_invites')
    .insert({ token, role: role || 'employee', title: title || null, status: 'pending', created_by: user.id })
    .select('id, token')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const origin = new URL(req.url).origin
  return NextResponse.json({ ok: true, id: data.id, token: data.token, link: `${origin}/onboard/${data.token}` })
}
