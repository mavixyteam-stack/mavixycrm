import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { action, creds, to, message, template_name, template_params } = await req.json()

  if (action === 'test') {
    // Verify the phone number ID is valid
    try {
      const url = `https://graph.facebook.com/v19.0/${creds.wa_phone_number_id}?access_token=${creds.wa_access_token}`
      const res = await fetch(url)
      const data = await res.json()
      if (data.error) return NextResponse.json({ ok: false, error: data.error.message })
      return NextResponse.json({ ok: true, phone_number: data.display_phone_number || data.verified_name })
    } catch (e: any) {
      return NextResponse.json({ ok: false, error: e.message })
    }
  }

  if (action === 'send_text') {
    // Send a free-form text message
    try {
      const url = `https://graph.facebook.com/v19.0/${creds.wa_phone_number_id}/messages`
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${creds.wa_access_token}` },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { body: message },
        }),
      })
      const data = await res.json()
      if (data.error) return NextResponse.json({ ok: false, error: data.error.message })
      return NextResponse.json({ ok: true, message_id: data.messages?.[0]?.id })
    } catch (e: any) {
      return NextResponse.json({ ok: false, error: e.message })
    }
  }

  if (action === 'send_reminder') {
    // Send a content deadline reminder
    const reminderMsg = message || `📋 *Content reminder*\n\nYou have a deliverable due soon. Check Mavixy OS for details.`
    try {
      const url = `https://graph.facebook.com/v19.0/${creds.wa_phone_number_id}/messages`
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${creds.wa_access_token}` },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { body: reminderMsg },
        }),
      })
      const data = await res.json()
      if (data.error) return NextResponse.json({ ok: false, error: data.error.message })
      return NextResponse.json({ ok: true, message_id: data.messages?.[0]?.id })
    } catch (e: any) {
      return NextResponse.json({ ok: false, error: e.message })
    }
  }

  return NextResponse.json({ ok: false, error: 'Unknown action' })
}
