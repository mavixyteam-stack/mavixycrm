import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { authorizeAutomation } from '@/lib/automation-auth'
import { sendEmail, buildLeadFollowupEmail, type FollowUpLead } from '@/lib/email'

const admin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

async function run(req: NextRequest) {
  if (!(await authorizeAutomation(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = admin()
  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)
  const dateLabel = today.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })

  const [{ data: deals }, { data: profiles }] = await Promise.all([
    db.from('deals').select('*').eq('follow_up_date', todayStr),
    db.from('profiles').select('*'),
  ])

  const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]))

  const leads: FollowUpLead[] = (deals || []).map(d => ({
    name: d.name,
    company: d.company,
    score: d.score,
    notes: d.notes,
    phone: d.phone,
    email: d.email,
    followUpDate: dateLabel,
    ownerName: d.owner_id ? profileMap[d.owner_id]?.name : undefined,
  }))

  if (leads.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, message: 'No leads scheduled for follow-up today' })
  }

  // Send to sales team + owners
  const salesTeam = (profiles || []).filter(p => ['sales', 'owner', 'manager'].includes(p.role) && p.email)

  const results: { email: string; status: string }[] = []

  for (const person of salesTeam) {
    const html = buildLeadFollowupEmail({
      recipientName: person.name?.split(' ')[0] || 'there',
      leads,
      date: dateLabel,
    })

    try {
      await sendEmail(person.email, `📋 ${leads.length} lead${leads.length !== 1 ? 's' : ''} need follow-up today`, html)
      results.push({ email: person.email, status: 'sent' })
    } catch (e: any) {
      results.push({ email: person.email, status: `failed: ${e.message}` })
    }
  }

  return NextResponse.json({ ok: true, sent: results.filter(r => r.status === 'sent').length, leads: leads.length, results })
}

export const GET = run
export const POST = run
