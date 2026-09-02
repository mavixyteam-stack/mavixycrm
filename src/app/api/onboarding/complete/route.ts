import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { adminClient, createNotifications } from '@/lib/notify'
import { sendEmail, buildWelcomeEmail } from '@/lib/email'

const COLORS = ['#0EA5A4', '#7C3AED', '#FF5C1F', '#2563EB', '#DB2777', '#16A34A', '#D97706']

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || 'MX'
}

// Owner/manager finishes onboarding: creates the Mavixy account (login = work
// email) and emails the welcome pack to the candidate's personal email.
export async function POST(req: NextRequest) {
  const sb = await createServerClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = adminClient()
  const { data: caller } = await admin.from('profiles').select('role, name').eq('id', user.id).single()
  if (!caller || !['owner', 'manager'].includes(caller.role)) {
    return NextResponse.json({ error: 'Only owners or managers can finish onboarding' }, { status: 403 })
  }

  const { token, m365_email, m365_password, buddy_id } = await req.json()
  if (!token || !m365_email || !m365_password) {
    return NextResponse.json({ error: 'token, m365_email and m365_password are required' }, { status: 400 })
  }
  if (String(m365_password).length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  const { data: invite } = await admin.from('onboarding_invites').select('*').eq('token', token).maybeSingle()
  if (!invite) return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
  // Allow re-running on a completed invite to repair a half-created account.
  if (!['submitted', 'completed'].includes(invite.status)) {
    return NextResponse.json({ error: `Onboarding is '${invite.status}', expected 'submitted'` }, { status: 409 })
  }

  const name = invite.full_name || 'New teammate'
  const color = COLORS[Math.floor(Math.random() * COLORS.length)]
  const meta = { name, role: invite.role, title: invite.title || '', color }

  // 1. Create the auth user — or reuse+update it if the email already exists
  //    (so a re-run repairs rather than errors).
  let newUserId: string
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: m365_email,
    password: m365_password,
    email_confirm: true,
    user_metadata: meta,
  })
  if (created?.user) {
    newUserId = created.user.id
  } else if (createErr && /registered|already|exists|duplicate/i.test(createErr.message)) {
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
    const existing = list?.users?.find(u => (u.email || '').toLowerCase() === m365_email.toLowerCase())
    if (!existing) return NextResponse.json({ error: createErr.message }, { status: 400 })
    newUserId = existing.id
    await admin.auth.admin.updateUserById(newUserId, { password: m365_password, email_confirm: true, user_metadata: meta })
  } else {
    return NextResponse.json({ error: createErr?.message || 'Could not create the account' }, { status: 400 })
  }

  // 2. Ensure the profile row exists with the right details, surfacing errors.
  const profileRow: Record<string, unknown> = {
    id: newUserId, email: m365_email, name, role: invite.role,
    title: invite.title || '', color, initials: initials(name), permissions: [],
  }
  let row = { ...profileRow }
  let profileErr: string | null = null
  for (let i = 0; i < 4; i++) {
    const { error } = await admin.from('profiles').upsert(row)
    if (!error) { profileErr = null; break }
    const missing = error.message?.match(/Could not find the '(.+?)' column/)?.[1]
    if (missing && !['id', 'email', 'name', 'role'].includes(missing)) { delete row[missing]; continue }
    profileErr = error.message
    break
  }
  // Verify the profile is actually readable now
  const { data: check } = await admin.from('profiles').select('id').eq('id', newUserId).maybeSingle()
  if (!check) {
    return NextResponse.json({
      error: `Account auth was created but the profile was not: ${profileErr || 'unknown error'}. The user id is ${newUserId}.`,
    }, { status: 500 })
  }

  // 3. Mark the invite complete
  await admin.from('onboarding_invites').update({
    status: 'completed',
    m365_email,
    buddy_id: buddy_id || null,
    created_profile_id: newUserId,
    completed_at: new Date().toISOString(),
  }).eq('id', invite.id)

  // 4. Welcome email to the candidate's personal email
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin
  let buddy: { name: string; email?: string | null } | null = null
  if (buddy_id) {
    const { data: b } = await admin.from('profiles').select('name, email').eq('id', buddy_id).maybeSingle()
    if (b) buddy = { name: b.name, email: b.email }
  }
  if (invite.personal_email) {
    const html = buildWelcomeEmail({
      name,
      workEmail: m365_email,
      password: m365_password,
      appUrl,
      buddy,
    })
    try { await sendEmail(invite.personal_email, 'Welcome to Mavixy — your account is ready 🎉', html) }
    catch (e) { console.error('welcome email:', e) }
  }

  // 5. Tell leadership it's done
  const { data: leaders } = await admin.from('profiles').select('id').in('role', ['owner', 'manager'])
  await createNotifications(admin, (leaders || []).map(l => l.id).filter(id => id !== newUserId), {
    title: 'Onboarding complete',
    text: `${name}'s Mavixy account is live (${m365_email}) and their welcome email has been sent.`,
    type: 'success',
    link: 'team',
  }, { email: false })

  return NextResponse.json({ ok: true, user_id: newUserId, work_email: m365_email })
}
