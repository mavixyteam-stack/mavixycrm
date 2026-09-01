import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/notify'
import { sendTelegram } from '@/lib/telegram'

// Telegram POSTs updates here. We only care about the /start <userId> message
// a person sends by tapping the bot deep-link — that's how we learn their
// chat_id and link it to their Mavixy profile.
export async function POST(req: NextRequest) {
  let update: any
  try { update = await req.json() } catch { return NextResponse.json({ ok: true }) }

  const msg = update?.message
  const text: string = msg?.text || ''
  const chatId = msg?.chat?.id

  if (!chatId) return NextResponse.json({ ok: true })

  const startMatch = text.match(/^\/start\s+(\S+)/)
  if (startMatch) {
    const userId = startMatch[1]
    const admin = adminClient()
    const { data: profile } = await admin.from('profiles').select('id, name').eq('id', userId).maybeSingle()

    if (profile) {
      await admin.from('profiles').update({ telegram_chat_id: String(chatId) }).eq('id', userId)
      await sendTelegram(chatId, `✅ Connected to Mavixy, ${profile.name?.split(' ')[0] || 'there'}! You'll get your notifications here from now on.`)
    } else {
      await sendTelegram(chatId, `Hmm, I couldn't match that link to a Mavixy account. Try the "Connect Telegram" button in the app again.`)
    }
    return NextResponse.json({ ok: true })
  }

  if (text.startsWith('/start')) {
    await sendTelegram(chatId, `👋 This is the Mavixy notifications bot. Open Mavixy → the bell menu → "Connect Telegram" to link your account.`)
  }
  return NextResponse.json({ ok: true })
}
