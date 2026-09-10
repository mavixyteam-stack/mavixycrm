import { NextRequest, NextResponse } from 'next/server'
import { adminClient, createNotifications } from '@/lib/notify'
import { stageIndex } from '@/lib/journey'

// Public: the client e-signs the agreement. We record the signature, push the
// journey to Onboarding, and alert the team.
export async function POST(req: NextRequest) {
  const { token, name } = await req.json().catch(() => ({}))
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })
  if (!name?.trim()) return NextResponse.json({ error: 'A name is required to sign' }, { status: 400 })

  const admin = adminClient()
  const { data: c } = await admin
    .from('contracts')
    .select('id, journey_id, title, company, client_name, status, created_by')
    .eq('token', token)
    .maybeSingle()

  if (!c) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (c.status === 'signed') return NextResponse.json({ ok: true, already: true })

  await admin.from('contracts')
    .update({ status: 'signed', signer_name: name.trim(), signed_at: new Date().toISOString() })
    .eq('id', c.id)

  // Advance the journey to Onboarding (only ever forward).
  if (c.journey_id) {
    const { data: j } = await admin.from('journeys').select('id, stage').eq('id', c.journey_id).maybeSingle()
    if (j && stageIndex(j.stage) < stageIndex('onboarding')) {
      await admin.from('journeys').update({ stage: 'onboarding', probability: 95, updated_at: new Date().toISOString() }).eq('id', j.id)
    }
  }

  const { data: leaders } = await admin.from('profiles').select('id').in('role', ['owner', 'manager'])
  const recipients = Array.from(new Set([c.created_by, ...(leaders || []).map(l => l.id)].filter(Boolean))) as string[]
  if (recipients.length) {
    await createNotifications(admin, recipients, {
      title: 'Agreement signed',
      text: `${name.trim()} signed "${c.title}"${c.company ? ` for ${c.company}` : ''}. It's now in Onboarding — time to kick off.`,
      type: 'success',
      link: 'journey',
    })
  }

  return NextResponse.json({ ok: true })
}
