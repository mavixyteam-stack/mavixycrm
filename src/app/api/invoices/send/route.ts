import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/notify'
import { sendEmail } from '@/lib/email'
import { money, balanceDue } from '@/lib/invoice'
import type { Invoice } from '@/types'

// Owner/manager: email the invoice link (initial send or a payment reminder).
export async function POST(req: NextRequest) {
  const sb = await createServerClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = adminClient()
  const { data: caller } = await admin.from('profiles').select('role, name').eq('id', user.id).single()
  if (!caller || !['owner', 'manager'].includes(caller.role)) {
    return NextResponse.json({ error: 'Owner/manager only' }, { status: 403 })
  }

  const { token, reminder } = await req.json().catch(() => ({}))
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

  const { data: inv } = await admin.from('invoices').select('*').eq('token', token).maybeSingle()
  if (!inv) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (!inv.contact_email) return NextResponse.json({ error: 'No client email on this invoice' }, { status: 400 })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin
  const link = `${appUrl}/invoice/${token}`
  const due = balanceDue(inv as Invoice)
  const cur = inv.currency || 'INR'
  const firstName = (inv.client_name || '').split(' ')[0] || 'there'
  const senderName = caller.name?.split(' ')[0] || 'The Mavixy team'
  const dueDateLabel = inv.due_date ? new Date(inv.due_date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : null

  const heading = reminder ? 'Payment reminder' : `Invoice ${inv.number}`
  const lead = reminder
    ? `A quick nudge — invoice <strong>${inv.number}</strong> for <strong>${money(due, cur)}</strong> is still open${dueDateLabel ? ` (due ${dueDateLabel})` : ''}.`
    : `Here's invoice <strong>${inv.number}</strong>${inv.company ? ` for ${inv.company}` : ''}, totalling <strong>${money(inv.total, cur)}</strong>${dueDateLabel ? `, due ${dueDateLabel}` : ''}.`

  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;margin:0 auto;color:#0F172A">
      <div style="background:#0F172A;border-radius:16px;padding:22px 24px;color:#fff;margin-bottom:20px">
        <div style="font-size:13px;opacity:.7;letter-spacing:.04em">${reminder ? 'REMINDER' : 'INVOICE'}</div>
        <div style="font-size:20px;font-weight:700;margin-top:4px">${heading}</div>
      </div>
      <p style="font-size:15px;line-height:1.6">Hi ${firstName},</p>
      <p style="font-size:15px;line-height:1.6">${lead} You can view it and the payment details here:</p>
      <p style="text-align:center;margin:26px 0">
        <a href="${link}" style="display:inline-block;background:#FF5C1F;color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:13px 26px;border-radius:12px">View invoice</a>
      </p>
      <p style="font-size:13px;color:#64748B;line-height:1.6">Or paste this link into your browser:<br><a href="${link}" style="color:#0EA5E9">${link}</a></p>
      <p style="font-size:15px;line-height:1.6;margin-top:22px">Thank you,<br>${senderName}</p>
    </div>`

  try {
    await sendEmail(inv.contact_email, reminder ? `Reminder: invoice ${inv.number} due` : `Invoice ${inv.number}${inv.company ? ` — ${inv.company}` : ''}`, html)
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Email failed' }, { status: 500 })
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (reminder) patch.last_reminder_at = new Date().toISOString()
  if (inv.status === 'draft') { patch.status = 'sent'; patch.sent_at = new Date().toISOString() }
  await admin.from('invoices').update(patch).eq('id', inv.id)

  return NextResponse.json({ ok: true, link })
}
