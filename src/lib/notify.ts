import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { NotificationType } from '@/types'

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

/**
 * Insert one notification row per user id. Deduplicates ids and skips
 * empties. Returns the number of rows created. Never throws on a bad row —
 * notifications are a side effect and must not break the main action.
 */
export async function createNotifications(
  admin: SupabaseClient,
  userIds: (string | null | undefined)[],
  n: NotifyInput,
): Promise<number> {
  const ids = Array.from(new Set(userIds.filter((x): x is string => !!x)))
  if (ids.length === 0) return 0

  let rows: Record<string, unknown>[] = ids.map(user_id => ({
    user_id,
    title: n.title ?? null,
    text: n.text,
    type: n.type ?? 'info',
    link: n.link ?? null,
    read: false,
  }))

  // Retry loop: if a column is missing from the table, strip it and retry so
  // a schema gap degrades (drops that field) instead of losing the notification.
  for (let attempt = 0; attempt < 4; attempt++) {
    const { error } = await admin.from('notifications').insert(rows)
    if (!error) return rows.length

    const missing = error.message?.match(/Could not find the '(.+?)' column/)?.[1]
    if (missing && missing !== 'text' && missing !== 'user_id') {
      rows = rows.map(r => { const c = { ...r }; delete c[missing]; return c })
      continue
    }
    console.error('createNotifications:', error.message)
    return 0
  }
  return 0
}
