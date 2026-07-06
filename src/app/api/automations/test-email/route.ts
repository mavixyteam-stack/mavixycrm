import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  const sb = await createServerClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { to } = await req.json()
  const recipient = to || user.email
  if (!recipient) return NextResponse.json({ error: 'No recipient email' }, { status: 400 })

  const html = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:32px;background:#F5F6F2;font-family:-apple-system,Helvetica,Arial,sans-serif;">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 8px 32px -16px rgba(16,17,12,.16);">
    <div style="background:#0F172A;padding:28px 32px;">
      <div style="font-size:22px;font-weight:900;color:#fff;">mavixy<span style="color:#FF5C1F;">.</span></div>
    </div>
    <div style="padding:28px 32px;">
      <h2 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#0E0F0C;">Email is working ✅</h2>
      <p style="margin:0;font-size:14px;color:#5A5E54;line-height:1.6;">
        Your Resend integration is configured correctly. Automations are ready to send.
      </p>
    </div>
  </div>
</body>
</html>`

  try {
    await sendEmail(recipient, '✅ Mavixy Email Test', html)
    return NextResponse.json({ ok: true, sent_to: recipient })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
