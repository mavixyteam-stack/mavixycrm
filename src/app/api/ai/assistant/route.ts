import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/notify'
import { complete } from '@/lib/groq'

const pad = (n: number) => String(n).padStart(2, '0')
function ymd(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }

// JARVIS — the owner's AI. Gathers a compact snapshot of the whole company
// and answers the owner's question grounded in that live data.
export async function POST(req: NextRequest) {
  const sb = await createServerClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = adminClient()
  const { data: caller } = await db.from('profiles').select('role, name').eq('id', user.id).single()
  if (!caller || !['owner', 'manager'].includes(caller.role)) {
    return NextResponse.json({ error: 'Owner/manager only' }, { status: 403 })
  }

  const { question, history } = await req.json()
  if (!question?.trim()) return NextResponse.json({ error: 'Ask a question' }, { status: 400 })

  const now = new Date()
  const today = ymd(now)
  const weekAgo = ymd(new Date(now.getTime() - 7 * 86400000))
  const month = today.slice(0, 7)

  const [
    { data: profiles }, { data: tasks }, { data: planItems },
    { data: deals }, { data: clients }, { data: attendance }, { data: logs },
  ] = await Promise.all([
    db.from('profiles').select('id, name, role, department, title'),
    db.from('tasks').select('title, assignee_id, client_id, due, priority, done, department'),
    db.from('plan_items').select('title, assignee_id, client_id, status, day, month, cat').eq('month', month),
    db.from('deals').select('name, company, value, stage, owner_id, score, follow_up_date'),
    db.from('clients').select('id, name, health, services'),
    db.from('attendance').select('user_id, date, check_in, check_out, break_minutes').gte('date', weekAgo),
    db.from('work_logs').select('user_id, date, note').gte('date', weekAgo),
  ])

  const pMap = Object.fromEntries((profiles || []).map(p => [p.id, p]))
  const cMap = Object.fromEntries((clients || []).map(c => [c.id, c.name]))
  const nameOf = (id: string | null) => (id && pMap[id]?.name) || 'Unassigned'

  // ── Build a compact, human-readable snapshot ────────────────────────────────
  const S: string[] = []

  S.push(`# TEAM (${(profiles || []).length})`)
  for (const p of profiles || []) {
    const openTasks = (tasks || []).filter(t => t.assignee_id === p.id && !t.done)
    const openContent = (planItems || []).filter(i => i.assignee_id === p.id && i.status !== 'published')
    const todayAtt = (attendance || []).find(a => a.user_id === p.id && a.date === today)
    const todayLog = (logs || []).find(l => l.user_id === p.id && l.date === today)
    const daysWorked = new Set((attendance || []).filter(a => a.user_id === p.id && a.check_in).map(a => a.date)).size
    S.push(`- ${p.name} (${p.department || p.role}${p.title ? `, ${p.title}` : ''}): ${openTasks.length} open tasks, ${openContent.length} open content. This week worked ${daysWorked} day(s). Today: ${todayAtt?.check_in ? (todayAtt.check_out ? 'checked out' : 'still working') : 'not in'}${todayLog ? `; logged: "${todayLog.note.replace(/\n+/g, '; ').slice(0, 200)}"` : (todayAtt?.check_in ? '; NO log yet' : '')}.`)
  }

  const overdueTasks = (tasks || []).filter(t => !t.done && t.due && String(t.due).slice(0, 10) < today)
  const overdueContent = (planItems || []).filter(i => i.status !== 'published' && i.day && `${i.month}-${pad(i.day)}` < today)
  S.push(`\n# OVERDUE (${overdueTasks.length + overdueContent.length})`)
  for (const t of overdueTasks.slice(0, 15)) S.push(`- Task "${t.title}" — ${nameOf(t.assignee_id)}${t.client_id ? ` for ${cMap[t.client_id] || ''}` : ''} (due ${String(t.due).slice(0, 10)})`)
  for (const i of overdueContent.slice(0, 15)) S.push(`- Content "${i.title}" — ${nameOf(i.assignee_id)} for ${cMap[i.client_id] || ''} (post ${i.month}-${pad(i.day!)})`)

  S.push(`\n# CLIENTS (${(clients || []).length})`)
  for (const c of clients || []) {
    const items = (planItems || []).filter(i => i.client_id === c.id)
    const pub = items.filter(i => i.status === 'published').length
    S.push(`- ${c.name}: health ${c.health}/100, services ${(c.services || []).join('/')}, this month ${pub}/${items.length} content published.`)
  }

  const stages = ['lead', 'qualified', 'proposal', 'negotiation', 'closed']
  const openDeals = (deals || []).filter(d => d.stage !== 'closed')
  const pipelineValue = openDeals.reduce((s, d) => s + (d.value || 0), 0)
  const followToday = (deals || []).filter(d => d.follow_up_date === today)
  S.push(`\n# SALES PIPELINE`)
  S.push(`- Open value: ₹${pipelineValue}. By stage: ${stages.map(st => `${st}: ${(deals || []).filter(d => d.stage === st).length}`).join(', ')}.`)
  if (followToday.length) S.push(`- Follow-ups due today: ${followToday.map(d => `${d.name} (${d.company})`).join(', ')}.`)

  const snapshot = S.join('\n')

  const historyText = Array.isArray(history)
    ? history.slice(-6).map((h: { role: string; text: string }) => `${h.role === 'user' ? 'Owner' : 'You'}: ${h.text}`).join('\n')
    : ''

  const system = `You are Mavixy — the AI chief of staff for a creative marketing agency, speaking to ${caller.name?.split(' ')[0] || 'the founder'} (the ${caller.role}).
You have a live snapshot of the whole company below. Answer the owner's question using ONLY this data — be specific, name people, clients and numbers. If the data doesn't cover something, say so briefly. Be sharp and concise (a few sentences or a short bulleted list), like a trusted operator giving a straight answer. Use ₹ for money. Today is ${now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}.

=== LIVE COMPANY SNAPSHOT ===
${snapshot}
=== END SNAPSHOT ===`

  const prompt = `${historyText ? `Recent conversation:\n${historyText}\n\n` : ''}Owner's question: ${question.trim()}`

  try {
    const answer = await complete(prompt, system)
    return NextResponse.json({ ok: true, answer })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'AI unavailable' }, { status: 500 })
  }
}
