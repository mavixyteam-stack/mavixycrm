import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { adminClient, createNotifications } from '@/lib/notify'

export async function POST(req: NextRequest) {
  const sb = await createServerClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { user_ids, title, text, type, link } = await req.json()
  if (!text || !Array.isArray(user_ids)) {
    return NextResponse.json({ error: 'user_ids[] and text are required' }, { status: 400 })
  }

  const created = await createNotifications(adminClient(), user_ids, { title, text, type, link })
  return NextResponse.json({ ok: true, created })
}
