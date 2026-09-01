import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/notify'

// Owner/manager: list all onboarding invites with signed document links.
export async function GET() {
  const sb = await createServerClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = adminClient()
  const { data: caller } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (!caller || !['owner', 'manager'].includes(caller.role)) {
    return NextResponse.json({ error: 'Only owners or managers can view onboarding' }, { status: 403 })
  }

  const { data, error } = await admin.from('onboarding_invites').select('*').order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Sign the private document paths so the owner can view them (1 hour)
  const invites = await Promise.all((data || []).map(async inv => {
    const sign = async (path: string | null) => {
      if (!path) return null
      const { data: s } = await admin.storage.from('onboarding-docs').createSignedUrl(path, 3600)
      return s?.signedUrl || null
    }
    return { ...inv, aadhar_url: await sign(inv.aadhar_path), pan_url: await sign(inv.pan_path) }
  }))

  return NextResponse.json({ ok: true, invites })
}
