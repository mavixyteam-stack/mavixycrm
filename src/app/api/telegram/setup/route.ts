import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/notify'
import { getBotInfo, setWebhook, telegramConfigured } from '@/lib/telegram'

// One-time setup, owner-only. Points Telegram's webhook at our endpoint and
// returns the bot @username needed for the "Connect Telegram" deep-link.
// Open /api/telegram/setup in the browser while logged in as the owner.
export async function GET(req: NextRequest) {
  const sb = await createServerClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

  const admin = adminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['owner', 'manager'].includes(profile.role)) {
    return NextResponse.json({ error: 'Owner/manager only' }, { status: 403 })
  }

  if (!telegramConfigured()) {
    return NextResponse.json({
      ok: false,
      error: 'TELEGRAM_BOT_TOKEN is not set. Create a bot with @BotFather, then add TELEGRAM_BOT_TOKEN to your environment and redeploy.',
    })
  }

  const bot = await getBotInfo()
  if (!bot) return NextResponse.json({ ok: false, error: 'Could not reach Telegram — check the bot token.' })

  const origin = new URL(req.url).origin
  const webhookUrl = `${origin}/api/telegram/webhook`
  const hook = await setWebhook(webhookUrl)

  return NextResponse.json({
    ok: hook.ok,
    bot_username: bot.username,
    webhook: webhookUrl,
    webhook_result: hook.description || 'set',
    next: hook.ok
      ? `Add NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=${bot.username} to your environment and redeploy, then each person can tap "Connect Telegram" in the app.`
      : 'Webhook setup failed — see webhook_result.',
  })
}
