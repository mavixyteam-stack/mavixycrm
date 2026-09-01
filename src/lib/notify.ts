import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { NotificationType } from '@/types'
import { sendTelegram } from './telegram'
import { sendEmail, buildNotificationEmail } from './email'

/** Service-role Supabase client — bypasses RLS. Server-only. */
export function adminClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export interface NotifyInput {
  title?: string
  text: string
  type?: NotificationType
  link?: string
}

export interface NotifyChannels {
  email?: boolean     // also email the recipient (default true)
  telegram?: boolean  // also Telegram the recipient if linked (default true)
}

async function insertRows(admin: SupabaseClient, ids: string[], n: NotifyInput): Promise<boolean> {
  let rows: Record<string, unknown>[] = ids.map(user_id => ({
    user_id,
    title: n.title ?? null,
    text: n.text,
    type: n.type ?? 'info',
    link: n.link ?? null,
    read: false,
  }))
  // If a column is missing from the table, strip it and retry so a schema gap
  // degrades (drops that field) instead of losing the notification.
  for (let attempt = 0; attempt < 4; attempt++) {
    const { error } = await admin.from('notifications').insert(rows)
    if (!error) return true
    const missing = error.message?.match(/Could not find the '(.+?)' column/)?.[1]
    if (missing && missing !== 'text' && missing !== 'user_id') {
      rows = rows.map(r => { const c = { ...r }; delete c[missing]; return c })
      continue
    }
    console.error('createNotifications:', error.message)
    return false
  }
  return false
}

/**
 * Create a notification for each user id and fan it out to their channels:
 * always the in-app bell, plus email and Telegram (when linked/enabled).
 * Best-effort on every channel — a failure in one never breaks the others or
 * the main action. Returns the number of in-app rows created.
 */
export async function createNotifications(
  admin: SupabaseClient,
  userIds: (string | null | undefined)[],
  n: NotifyInput,
  channels: NotifyChannels = {},
): Promise<number> {
  const ids = Array.from(new Set(userIds.filter((x): x is string => !!x)))
  if (ids.length === 0) return 0

  const wantEmail = channels.email !== false
  const wantTelegram = channels.telegram !== false

  // 1. In-app bell (always)
  const ok = await insertRows(admin, ids, n)

  // 2. External channels — look up each recipient's contact points
  if (wantEmail || wantTelegram) {
    const { data: profiles } = await admin
      .from('profiles')
      .select('id, name, email, telegram_chat_id')
      .in('id', ids)

    const appUrl = process.env.NEXT_PUBLIC_APP_URL
    const sends: Promise<unknown>[] = []

    for (const p of profiles || []) {
      const firstName = (p.name?.split(' ')[0]) || 'there'
      const line = n.title ? `🔔 ${n.title}\n${n.text}` : `🔔 ${n.text}`

      if (wantTelegram && p.telegram_chat_id) {
        sends.push(sendTelegram(p.telegram_chat_id, line))
      }
      if (wantEmail && p.email) {
        const html = buildNotificationEmail({
          recipientName: firstName,
          title: n.title,
          text: n.text,
          type: n.type,
          actionUrl: appUrl,
        })
        sends.push(sendEmail(p.email, n.title || 'Mavixy notification', html).catch(() => {}))
      }
    }
    await Promise.allSettled(sends)
  }

  return ok ? ids.length : 0
}
