import { NextRequest } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

/**
 * Authorizes an automation request from either:
 *  1. Vercel Cron — sends `Authorization: Bearer ${CRON_SECRET}` automatically
 *     when the CRON_SECRET env var is set.
 *  2. A logged-in user — the "Run now" buttons in the Automations screen,
 *     which carry the browser's Supabase session.
 */
export async function authorizeAutomation(req: NextRequest): Promise<boolean> {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = req.headers.get('authorization')

  // Vercel Cron path
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true

  // Logged-in user path
  try {
    const sb = await createServerClient()
    const { data: { user } } = await sb.auth.getUser()
    return !!user
  } catch {
    return false
  }
}
