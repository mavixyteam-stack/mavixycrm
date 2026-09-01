import { NextRequest, NextResponse } from 'next/server'
import { adminClient, createNotifications } from '@/lib/notify'
import { proposeWorkEmail, AADHAAR_RE, PAN_RE, IFSC_RE } from '@/lib/onboarding'

// Public: the candidate submits their onboarding details.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body?.token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

  const admin = adminClient()
  const { data: invite } = await admin.from('onboarding_invites').select('*').eq('token', body.token).maybeSingle()
  if (!invite) return NextResponse.json({ error: 'Invalid link' }, { status: 404 })
  if (invite.status !== 'pending') return NextResponse.json({ error: 'This form has already been submitted' }, { status: 409 })

  // Validation
  const errs: string[] = []
  if (!body.full_name?.trim()) errs.push('Full name is required')
  if (!body.personal_email?.trim()) errs.push('Personal email is required')
  if (!body.phone?.trim()) errs.push('Phone number is required')
  if (body.aadhar_number && !AADHAAR_RE.test(body.aadhar_number)) errs.push('Aadhaar must be 12 digits')
  if (body.pan_number && !PAN_RE.test((body.pan_number || '').toUpperCase())) errs.push('PAN format looks invalid (e.g. ABCDE1234F)')
  if (body.bank_ifsc && !IFSC_RE.test((body.bank_ifsc || '').toUpperCase())) errs.push('IFSC format looks invalid')
  if (body.bank_account_number && body.bank_account_number !== body.bank_account_confirm) errs.push('Bank account numbers do not match')
  if (errs.length) return NextResponse.json({ error: errs.join('. ') }, { status: 400 })

  const workEmail = proposeWorkEmail(body.full_name)

  const { error: updErr } = await admin.from('onboarding_invites').update({
    status: 'submitted',
    full_name: body.full_name?.trim(),
    personal_email: body.personal_email?.trim(),
    phone: body.phone?.trim(),
    emergency_phone: body.emergency_phone?.trim() || null,
    aadhar_number: body.aadhar_number || null,
    pan_number: (body.pan_number || '').toUpperCase() || null,
    aadhar_path: body.aadhar_path || null,
    pan_path: body.pan_path || null,
    bank_account_number: body.bank_account_number || null,
    bank_ifsc: (body.bank_ifsc || '').toUpperCase() || null,
    bank_name: body.bank_name || null,
    bank_branch: body.bank_branch || null,
    work_email: workEmail,
    submitted_at: new Date().toISOString(),
  }).eq('id', invite.id)
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

  // Who to alert: the creator + all owners/managers
  const { data: leaders } = await admin.from('profiles').select('id, role').in('role', ['owner', 'manager'])
  const leaderIds = (leaders || []).map(l => l.id)
  const assignee = invite.created_by || leaderIds[0] || null

  // Auto-create the "set up M365 account" task
  if (assignee) {
    await admin.from('tasks').insert({
      title: `Create M365 account for ${body.full_name} (${workEmail})`,
      type: 'Onboarding',
      assignee_id: assignee,
      due: new Date().toISOString().slice(0, 10),
      priority: 'High',
      done: false,
    }).select('id').maybeSingle()
  }

  // Notify the leadership (in-app + email + Telegram)
  await createNotifications(admin, leaderIds, {
    title: 'New onboarding submission',
    text: `${body.full_name} completed their onboarding form. Next step: create their M365 account (${workEmail}), then finish onboarding to send their welcome email.`,
    type: 'request',
    link: 'onboarding',
  })

  return NextResponse.json({ ok: true, work_email: workEmail })
}
