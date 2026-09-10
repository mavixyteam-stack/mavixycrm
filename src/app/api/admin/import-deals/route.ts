import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/notify'
import { STAGE_PROBABILITY } from '@/lib/journey'
import type { JourneyStage } from '@/types'

// One-time (idempotent) import of the old `deals` records into `journeys`, so
// Leads + Pipeline collapse into the single Client Journey. Re-running is safe:
// each journey keeps the deal's id, so a second run just upserts the same rows.
const STAGE_MAP: Record<string, JourneyStage> = {
  lead: 'lead',
  qualified: 'prospect',
  proposal: 'proposal',
  negotiation: 'contract',
  closed: 'active',
}

export async function POST(req: NextRequest) {
  const sb = await createServerClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = adminClient()
  const { data: caller } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (!caller || !['owner', 'manager'].includes(caller.role)) {
    return NextResponse.json({ error: 'Owner/manager only' }, { status: 403 })
  }

  const { data: deals } = await admin.from('deals').select('*')
  if (!deals || deals.length === 0) return NextResponse.json({ ok: true, imported: 0 })

  const { data: existing } = await admin.from('journeys').select('id')
  const have = new Set((existing || []).map(j => j.id))

  const rows = deals
    .filter(d => !have.has(d.id))   // never clobber a journey already worked on
    .map(d => {
      const stage = STAGE_MAP[d.stage] || 'lead'
      return {
        id: d.id,
        name: d.name || '',
        company: d.company || '',
        contact_email: d.email || null,
        contact_phone: d.phone || null,
        stage,
        value: d.value || 0,
        source: d.source || null,
        service: d.service || null,
        owner_id: d.owner_id || null,
        probability: d.probability ?? STAGE_PROBABILITY[stage],
        notes: d.notes || null,
        next_step_date: d.follow_up_date || null,
        score: d.score || null,
        lead_status: d.lead_status || null,
        budget_text: d.budget_text || null,
        created_at: d.created_at || new Date().toISOString(),
      }
    })

  if (rows.length === 0) return NextResponse.json({ ok: true, imported: 0 })

  const { error } = await admin.from('journeys').upsert(rows)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, imported: rows.length })
}
