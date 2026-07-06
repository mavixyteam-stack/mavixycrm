import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { authorizeAutomation } from '@/lib/automation-auth'
import { sendEmail, buildMorningBriefEmail, type BriefTask } from '@/lib/email'

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
  const dateLabel = today.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const [{ data: profiles }, { data: planItems }, { data: tasks }, { data: clients }] = await Promise.all([
    db.from('profiles').select('*'),
    db.from('plan_items').select('*').eq('month', month).in('status', ['planned', 'in_progress']),
    db.from('tasks').select('*').eq('done', false).lte('due', todayStr),
    db.from('clients').select('id, name'),
  ])

  const clientMap = Object.fromEntries((clients || []).map(c => [c.id, c.name]))

  const results: { email: string; name: string; items: number; status: string }[] = []

  // Send to employees (all roles get a brief but with different content scopes)
  const recipients = (profiles || []).filter(p => p.email)

  for (const person of recipients) {
    const myPlanItems: BriefTask[] = (planItems || [])
      .filter(pi => pi.assignee_id === person.id)
      .map(pi => ({
        title: pi.title,
        client: clientMap[pi.client_id] || 'General',
        type: pi.type,
        brief: pi.brief,
        refs: pi.refs || [],
      }))

    const myTasks: BriefTask[] = (tasks || [])
      .filter(t => t.assignee_id === person.id)
      .map(t => ({
        title: t.title,
        client: clientMap[t.client_id] || '',
        type: t.type,
        due: t.due,
        priority: t.priority,
      }))

    if (myPlanItems.length === 0 && myTasks.length === 0) {
      results.push({ email: person.email, name: person.name, items: 0, status: 'skipped (no items)' })
      continue
    }

    const html = buildMorningBriefEmail({
      name: person.name?.split(' ')[0] || 'there',
      date: dateLabel,
      planItems: myPlanItems,
      tasks: myTasks,
    })

    try {
      await sendEmail(person.email, `☀️ Morning Brief · ${today.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}`, html)
      results.push({ email: person.email, name: person.name, items: myPlanItems.length + myTasks.length, status: 'sent' })
    } catch (e: any) {
      results.push({ email: person.email, name: person.name, items: 0, status: `failed: ${e.message}` })
    }
  }

  return NextResponse.json({ ok: true, sent: results.filter(r => r.status === 'sent').length, results })
}

export const GET = run
export const POST = run
