import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/notify'
import { makeInviteToken } from '@/lib/onboarding'
import { sendEmail, buildOnboardingInviteEmail } from '@/lib/email'

// Owner/manager creates an onboarding invite; the link is emailed to the
// candidate automatically (and also returned for manual copy).
export async function POST(req: NextRequest) {
  const sb = await createServerClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = adminClient()
  const { data: caller } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (!caller || !['owner', 'manager'].includes(caller.role)) {
    return NextResponse.json({ error: 'Only owners or managers can start onboarding' }, { status: 403 })
  }

  const { title, department, personal_email } = await req.json()
  if (!personal_email?.trim()) {
    return NextResponse.json({ error: "The candidate's personal email is required" }, { status: 400 })
  }
  const token = makeInviteToken()

  // System permission role is derived from the department (owner can change
  // it later in Team & Permissions). "Role" on the form is the job title.
  const dept = (department || '').toLowerCase()
  const role = dept === 'management' ? 'manager' : dept === 'sales' ? 'sales' : 'employee'

  const { data, error } = await admin.from('onboarding_invites')
    .insert({
      token,
      role,
      title: title?.trim() || null,
      department: department?.trim() || null,
      personal_email: personal_email.trim(),
      status: 'pending',
      created_by: user.id,
    })
    .select('id, token')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const origin = new URL(req.url).origin
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || origin
  const link = `${appUrl}/onboard/${data.token}`

  // Auto-send the invite to the candidate (best-effort; needs a verified
  // Resend domain to reach external inboxes)
  let emailed = false
  try {
    await sendEmail(personal_email.trim(), 'Welcome to Mavixy — complete your onboarding', buildOnboardingInviteEmail({ link, roleText: title, department }))
    emailed = true
  } catch (e) {
    console.error('onboarding invite email:', e)
  }

  return NextResponse.json({ ok: true, id: data.id, token: data.token, link, emailed })
}
