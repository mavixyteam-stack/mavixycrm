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

  const rows = ids.map(user_id => ({
    user_id,
    title: n.title ?? null,
    text: n.text,
    type: n.type ?? 'info',
    link: n.link ?? null,
    read: false,
  }))

  const { error, count } = await admin.from('notifications').insert(rows, { count: 'exact' })
  if (error) {
    console.error('createNotifications:', error.message)
    return 0
  }
  return count ?? rows.length
}
