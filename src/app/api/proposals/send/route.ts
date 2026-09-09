import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/notify'
import { sendEmail } from '@/lib/email'
import { money } from '@/lib/proposal'

// Owner/manager: email the proposal link to the client and mark it sent.
export async function POST(req: NextRequest) {
  const sb = await createServerClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = adminClient()
  const { data: caller } = await admin.from('profiles').select('role, name').eq('id', user.id).single()
  if (!caller || !['owner', 'manager'].includes(caller.role)) {
    return NextResponse.json({ error: 'Owner/manager only' }, { status: 403 })
  }

  const { token, email } = await req.json().catch(() => ({}))
  if (!token || !email) return NextResponse.json({ error: 'Missing token or email' }, { status: 400 })

  const { data: p } = await admin
    .from('proposals')
    .select('id, title, company, client_name, total, currency, status')
    .eq('token', token)
    .maybeSingle()
  if (!p) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin
  const link = `${appUrl}/proposal/${token}`
  const firstName = (p.client_name || '').split(' ')[0] || 'there'
  const senderName = caller.name?.split(' ')[0] || 'The Mavixy team'

  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;margin:0 auto;color:#0F172A">
      <div style="background:#0F172A;border-radius:16px;padding:22px 24px;color:#fff;margin-bottom:20px">
        <div style="font-size:13px;opacity:.7;letter-spacing:.04em">PROPOSAL</div>
        <div style="font-size:20px;font-weight:700;margin-top:4px">${p.title}</div>
      </div>
      <p style="font-size:15px;line-height:1.6">Hi ${firstName},</p>
      <p style="font-size:15px;line-height:1.6">Here's the proposal we put together${p.company ? ` for ${p.company}` : ''}. It comes to <strong>${money(p.total, p.currency)}</strong>. Have a read and you can accept it right on the page.</p>
      <p style="text-align:center;margin:26px 0">
        <a href="${link}" style="display:inline-block;background:#FF5C1F;color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:13px 26px;border-radius:12px">View &amp; accept proposal</a>
      </p>
      <p style="font-size:13px;color:#64748B;line-height:1.6">Or paste this link into your browser:<br><a href="${link}" style="color:#0EA5E9">${link}</a></p>
      <p style="font-size:15px;line-height:1.6;margin-top:22px">— ${senderName}</p>
    </div>`

  try {
    await sendEmail(email, `Your proposal${p.company ? ` — ${p.company}` : ''}`, html)
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Email failed' }, { status: 500 })
  }

  // Mark sent (don't downgrade an already-accepted proposal).
  if (p.status !== 'accepted') {
    await admin.from('proposals').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', p.id)
  }

  return NextResponse.json({ ok: true, link })
}
