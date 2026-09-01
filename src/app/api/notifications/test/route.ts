import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { adminClient, createNotifications } from '@/lib/notify'
import { telegramConfigured } from '@/lib/telegram'

/**
 * Diagnostic: open /api/notifications/test in the browser while logged in.
 * It tests every step of the notification pipeline and reports exactly
 * where it breaks. Safe to run repeatedly (it inserts one test row).
 */
export async function GET() {
  const result: Record<string, unknown> = { steps: {} }
  const steps = result.steps as Record<string, unknown>

  try {
    const sb = await createServerClient()
    const { data: { user }, error: authErr } = await sb.auth.getUser()
    result.authUser = user?.id ?? null
    result.authEmail = user?.email ?? null
    if (authErr) result.authError = authErr.message
    if (!user) {
      result.verdict = 'NOT LOGGED IN — open this URL in the same browser where you are logged into the app.'
      return NextResponse.json(result, { status: 401 })
    }

    // Env presence (values hidden)
    result.env = {
      url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      anon: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      service: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    }

    // 1. Read as the logged-in user (RLS-scoped) — exactly like the app does
    const r1 = await sb.from('notifications').select('id', { count: 'exact' }).eq('user_id', user.id).limit(1)
    steps.rlsRead = { ok: !r1.error, error: r1.error?.message, count: r1.count }

    // 2. Insert via service role (how the app creates notifications)
    const admin = adminClient()
    const ins = await admin.from('notifications')
      .insert({ user_id: user.id, title: 'Diagnostic', text: 'Test from /api/notifications/test', type: 'info', read: false })
      .select('id')
    steps.serviceInsert = { ok: !ins.error, error: ins.error?.message, insertedId: ins.data?.[0]?.id ?? null }

    // 3. Service-role read (bypasses RLS) — proves rows physically exist
    const r3 = await admin.from('notifications').select('id', { count: 'exact' }).eq('user_id', user.id).limit(1)
    steps.serviceRead = { ok: !r3.error, error: r3.error?.message, count: r3.count }

    // 4. Read again as the user (RLS) — should now see the inserted row
    const r4 = await sb.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(3)
    steps.rlsReadAfter = { ok: !r4.error, error: r4.error?.message, count: r4.data?.length ?? 0, newest: r4.data?.[0] ?? null }

    // 5. Telegram/email status for THIS user, and fire a full-pipeline test
    const { data: me } = await admin.from('profiles').select('telegram_chat_id, email, name').eq('id', user.id).maybeSingle()
    const linked = !!me?.telegram_chat_id
    steps.channels = {
      telegramBotConfigured: telegramConfigured(),
      yourTelegramLinked: linked,
      yourEmail: me?.email ?? null,
      note: linked
        ? 'Telegram is linked — a test message should arrive in your Telegram now.'
        : (telegramConfigured()
          ? 'Your account is NOT linked to Telegram yet. Open the app → bell → Connect Telegram → tap Start.'
          : 'TELEGRAM_BOT_TOKEN is not set in the environment.'),
    }
    // This goes through the real pipeline, so it also sends Telegram + email if configured.
    await createNotifications(admin, [user.id], {
      title: 'Diagnostic ping',
      text: 'If you see this in Telegram or email, external delivery works.',
      type: 'info',
    })

    // Verdict
    const inserted = (steps.serviceInsert as { ok: boolean }).ok
    const serviceSees = ((steps.serviceRead as { count: number | null }).count ?? 0) > 0
    const userSees = ((steps.rlsReadAfter as { count: number }).count ?? 0) > 0
    if (!inserted) result.verdict = 'INSERT FAILED — the notifications table is missing or has a column problem. See steps.serviceInsert.error.'
    else if (serviceSees && !userSees) result.verdict = 'RLS IS BLOCKING READS — rows exist but the logged-in user cannot read them. The RLS policy needs fixing.'
    else if (userSees) result.verdict = 'PIPELINE OK — insert + read both work. If the bell is still empty, the issue is client refresh/realtime, not the database.'
    else result.verdict = 'UNEXPECTED — see steps for details.'

    return NextResponse.json(result)
  } catch (e) {
    result.fatal = e instanceof Error ? e.message : String(e)
    return NextResponse.json(result, { status: 500 })
  }
}
