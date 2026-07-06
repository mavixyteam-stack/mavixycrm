import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { authorizeAutomation } from '@/lib/automation-auth'
import { sendEmail, buildWeeklyDigestEmail } from '@/lib/email'

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
  const month = todayStr.slice(0, 7)

  // Week label
  const startOfWeek = new Date(today)
  startOfWeek.setDate(today.getDate() - today.getDay())
  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 6)
  const weekLabel = `${startOfWeek.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – ${endOfWeek.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`

  const [{ data: deals }, { data: planItems }, { data: profiles }, { data: clients }] = await Promise.all([
    db.from('deals').select('*'),
    db.from('plan_items').select('*').eq('month', month),
    db.from('profiles').select('*'),
    db.from('clients').select('id, name'),
  ])

  const clientMap = Object.fromEntries((clients || []).map(c => [c.id, c.name]))

  // Pipeline stats
  const allDeals = deals || []
  const pipeline = {
    new: allDeals.filter(d => d.stage === 'lead').length,
    qualified: allDeals.filter(d => d.stage === 'qualified').length,
    proposals: allDeals.filter(d => d.stage === 'proposal').length,
    totalValue: allDeals.filter(d => d.stage !== 'closed').reduce((s, d) => s + (d.value || 0), 0),
    wonValue: allDeals.filter(d => d.stage === 'closed').reduce((s, d) => s + (d.value || 0), 0),
  }

  // Content stats
  const allPlan = planItems || []
  const today7 = new Date(today)
  today7.setDate(today.getDate() - 7)
  const overdueCutoff = today7.toISOString().slice(0, 10)
  const overdueItems = allPlan
    .filter(pi => ['planned', 'in_progress'].includes(pi.status) && pi.day && `${month}-${String(pi.day).padStart(2, '0')}` < todayStr)
    .map(pi => ({
      title: pi.title,
      client: clientMap[pi.client_id] || '',
      daysOverdue: Math.max(1, Math.floor((today.getTime() - new Date(`${month}-${String(pi.day).padStart(2, '0')}`).getTime()) / 86400000)),
    }))
    .slice(0, 5)

  const content = {
    total: allPlan.length,
    published: allPlan.filter(p => p.status === 'published').length,
    inProgress: allPlan.filter(p => p.status === 'in_progress').length,
    overdue: overdueItems.length,
  }

  // Team
  const team = {
    totalStaff: (profiles || []).length,
    checkedInToday: 0, // Would need attendance table; leaving as 0
  }

  // Top deals
  const topDeals = allDeals
    .filter(d => ['qualified', 'proposal', 'negotiation'].includes(d.stage))
    .sort((a, b) => (b.value || 0) - (a.value || 0))
    .slice(0, 4)
    .map(d => ({ name: d.name, company: d.company, value: d.value || 0, stage: d.stage }))

  // Send to owners and managers only
  const leaders = (profiles || []).filter(p => ['owner', 'manager'].includes(p.role) && p.email)
  const results: { email: string; status: string }[] = []

  for (const person of leaders) {
    const html = buildWeeklyDigestEmail({
      recipientName: person.name?.split(' ')[0] || 'there',
      weekLabel,
      pipeline,
      content,
      team,
      topDeals,
      overdueItems,
    })

    try {
      await sendEmail(person.email, `📊 Weekly Digest · ${weekLabel}`, html)
      results.push({ email: person.email, status: 'sent' })
    } catch (e: any) {
      results.push({ email: person.email, status: `failed: ${e.message}` })
    }
  }

  return NextResponse.json({ ok: true, sent: results.filter(r => r.status === 'sent').length, results })
}

export const GET = run
export const POST = run
