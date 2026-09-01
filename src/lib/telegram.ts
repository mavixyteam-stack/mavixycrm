// Free push via a Telegram bot. Set TELEGRAM_BOT_TOKEN (from @BotFather) in
// the environment. Each user links their account by tapping Start on the bot
// deep-link, which stores their chat_id on their profile.

const TOKEN = process.env.TELEGRAM_BOT_TOKEN
const API = TOKEN ? `https://api.telegram.org/bot${TOKEN}` : null

export function telegramConfigured(): boolean {
  return !!TOKEN
}

/** Send a plain-text message to a chat. Best-effort — never throws. */
export async function sendTelegram(chatId: string | number, text: string): Promise<boolean> {
  if (!API) return false
  try {
    const res = await fetch(`${API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
    })
    return res.ok
  } catch {
    return false
  }
}

/** Fetch the bot's own info (used to resolve its @username for deep-links). */
export async function getBotInfo(): Promise<{ id: number; username: string } | null> {
  if (!API) return null
  try {
    const res = await fetch(`${API}/getMe`)
    const body = await res.json()
    return body.ok ? { id: body.result.id, username: body.result.username } : null
  } catch {
    return null
  }
}

/** Point Telegram's webhook at our endpoint so /start messages reach us. */
export async function setWebhook(url: string): Promise<{ ok: boolean; description?: string }> {
  if (!API) return { ok: false, description: 'TELEGRAM_BOT_TOKEN not set' }
  try {
    const res = await fetch(`${API}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, allowed_updates: ['message'] }),
    })
    const body = await res.json()
    return { ok: !!body.ok, description: body.description }
  } catch (e) {
    return { ok: false, description: e instanceof Error ? e.message : 'setWebhook failed' }
  }
}
