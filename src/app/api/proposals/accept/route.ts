import { NextRequest, NextResponse } from 'next/server'
import { adminClient, createNotifications } from '@/lib/notify'
import { money } from '@/lib/proposal'
import { stageIndex } from '@/lib/journey'

// Public: the client accepts a proposal from the shared link. We record the
// acceptance, push the journey forward to Contract, and alert the team.
export async function POST(req: NextRequest) {
  const { token, name } = await req.json().catch(() => ({}))
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

  const admin = adminClient()
  const { data: p } = await admin
    .from('proposals')
    .select('id, journey_id, title, company, client_name, total, currency, status, created_by')
    .eq('token', token)
    .maybeSingle()

  if (!p) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (p.status === 'accepted') return NextResponse.json({ ok: true, already: true })

  await admin.from('proposals')
    .update({ status: 'accepted', accepted_at: new Date().toISOString(), client_name: name || p.client_name })
    .eq('id', p.id)

  // Advance the linked journey to Contract (only ever move it forward).
  if (p.journey_id) {
    const { data: j } = await admin.from('journeys').select('id, stage').eq('id', p.journey_id).maybeSingle()
    if (j && stageIndex(j.stage) < stageIndex('contract')) {
      await admin.from('journeys').update({ stage: 'contract', probability: 80, updated_at: new Date().toISOString() }).eq('id', j.id)
    }
  }

  // Notify the proposal owner + all leadership.
  const { data: leaders } = await admin.from('profiles').select('id').in('role', ['owner', 'manager'])
  const recipients = Array.from(new Set([p.created_by, ...(leaders || []).map(l => l.id)].filter(Boolean))) as string[]
  if (recipients.length) {
    await createNotifications(admin, recipients, {
      title: 'Proposal accepted',
      text: `${p.company || p.client_name || 'A client'} accepted the proposal "${p.title}" (${money(p.total, p.currency)}). It's now in Contract.`,
      type: 'success',
      link: 'journey',
    })
  }

  return NextResponse.json({ ok: true })
}
