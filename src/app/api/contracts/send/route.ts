import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/notify'
import { sendEmail } from '@/lib/email'

// Owner/manager: email the agreement link to the client for signature.
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

  const { data: c } = await admin.from('contracts').select('id, title, company, client_name, status').eq('token', token).maybeSingle()
  if (!c) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin
  const link = `${appUrl}/contract/${token}`
  const firstName = (c.client_name || '').split(' ')[0] || 'there'
  const senderName = caller.name?.split(' ')[0] || 'The Mavixy team'

  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;margin:0 auto;color:#0F172A">
      <div style="background:#0F172A;border-radius:16px;padding:22px 24px;color:#fff;margin-bottom:20px">
        <div style="font-size:13px;opacity:.7;letter-spacing:.04em">AGREEMENT</div>
        <div style="font-size:20px;font-weight:700;margin-top:4px">${c.title}</div>
      </div>
      <p style="font-size:15px;line-height:1.6">Hi ${firstName},</p>
      <p style="font-size:15px;line-height:1.6">Here's the service agreement${c.company ? ` for ${c.company}` : ''}. Please give it a read — you can sign it right on the page.</p>
      <p style="text-align:center;margin:26px 0">
        <a href="${link}" style="display:inline-block;background:#FF5C1F;color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:13px 26px;border-radius:12px">Review &amp; sign</a>
      </p>
      <p style="font-size:13px;color:#64748B;line-height:1.6">Or paste this link into your browser:<br><a href="${link}" style="color:#0EA5E9">${link}</a></p>
      <p style="font-size:15px;line-height:1.6;margin-top:22px">— ${senderName}</p>
    </div>`

  try {
    await sendEmail(email, `Agreement to sign${c.company ? ` — ${c.company}` : ''}`, html)
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Email failed' }, { status: 500 })
  }

  if (c.status !== 'signed') {
    await admin.from('contracts').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', c.id)
  }

  return NextResponse.json({ ok: true, link })
}
