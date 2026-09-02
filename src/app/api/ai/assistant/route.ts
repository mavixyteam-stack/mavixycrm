import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { adminClient, createNotifications } from '@/lib/notify'
import { completeJSON } from '@/lib/groq'

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

  const todayLabel = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const teamNames = (profiles || []).map(p => p.name).join(', ')
  const clientList = (clients || []).map(c => c.name).join(', ')

  const system = `You are Mavixy — the AI chief of staff for a creative marketing agency, speaking to ${caller.name?.split(' ')[0] || 'the founder'} (the ${caller.role}). Today is ${todayLabel} (${today}).

You do two things:
1) ANSWER questions about the company using ONLY the live snapshot below — specific, names people/clients/numbers, sharp and concise, ₹ for money.
2) CREATE A TASK when the owner tells you to assign work (e.g. "let Jigar make a video for Lumio by tomorrow", "assign an SEO audit to Rahul").

You MUST reply as a single JSON object with this exact shape:
{
  "reply": "<your short message to the owner>",
  "action": null OR {
    "type": "create_task",
    "assignee": "<exact full name from the TEAM list>",
    "title": "<clear task title>",
    "client": "<exact client name from CLIENTS, or null>",
    "due": "<YYYY-MM-DD, or null>",
    "priority": "Low" | "Medium" | "High",
    "department": "Creative" | "Digital Marketing" | "Sales" | "General"
  }
}
Rules for actions: use an EXACT name from TEAM for "assignee" (team: ${teamNames}); use an EXACT name from CLIENTS for "client" or null (clients: ${clientList}); resolve relative dates yourself (tomorrow = the day after ${today}); pick department from the work (a video/reel/post = Creative; SEO/ads/analytics = Digital Marketing). If you can't tell who to assign, set "action" to null and ask who in "reply". For pure questions, set "action" to null and put the answer in "reply".

=== LIVE COMPANY SNAPSHOT ===
${snapshot}
=== END SNAPSHOT ===`

  const prompt = `${historyText ? `Recent conversation:\n${historyText}\n\n` : ''}Owner: ${question.trim()}\n\nRespond with the JSON object.`

  let parsed: { reply?: string; action?: { type?: string; assignee?: string; title?: string; client?: string | null; due?: string | null; priority?: string; department?: string } | null }
  try {
    const raw = await completeJSON(prompt, system)
    parsed = JSON.parse(raw)
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'AI unavailable' }, { status: 500 })
  }

  let reply = parsed.reply || ''
  let created = false

  const a = parsed.action
  if (a && a.type === 'create_task' && a.title) {
    // Resolve the assignee by name (exact, then first-name, then contains)
    const want = (a.assignee || '').trim().toLowerCase()
    const assignee = (profiles || []).find(p => p.name?.toLowerCase() === want)
      || (profiles || []).find(p => p.name?.toLowerCase().split(' ')[0] === want.split(' ')[0] && want)
      || (profiles || []).find(p => want && p.name?.toLowerCase().includes(want))

    if (!assignee) {
      reply = reply || `I couldn't tell who "${a.assignee || 'that'}" is on the team. Who should I assign it to?`
    } else {
      const client = a.client ? (clients || []).find(c => c.name?.toLowerCase() === a.client!.toLowerCase()) : null
      const dept = a.department && ['Creative', 'Digital Marketing', 'Sales', 'General'].includes(a.department) ? a.department : (assignee.department || 'Creative')
      const due = a.due && /^\d{4}-\d{2}-\d{2}$/.test(a.due) ? a.due : null

      const { error } = await db.from('tasks').insert({
        title: a.title,
        client_id: client?.id || null,
        assignee_id: assignee.id,
        type: dept,
        department: dept,
        priority: ['Low', 'Medium', 'High'].includes(a.priority || '') ? a.priority : 'Medium',
        due,
        done: false,
        status: 'todo',
        refs: [],   // refs is NOT NULL in the tasks table
      })

      if (error) {
        reply = `I hit a snag creating that task: ${error.message}`
      } else {
        created = true
        await createNotifications(db, [assignee.id], {
          title: 'New task assigned',
          text: `${caller.name?.split(' ')[0] || 'The owner'} assigned you a task${client ? ` for ${client.name}` : ''}: ${a.title}${due ? ` (due ${due})` : ''}`,
          type: 'info',
          link: dept === 'Digital Marketing' ? 'dmboard' : 'myday',
        })
        const first = assignee.name.split(' ')[0]
        reply = `✅ Done — created "${a.title}"${client ? ` for ${client.name}` : ''} for ${first}${due ? `, due ${due}` : ''}. ${first} has been notified.`
      }
    }
  }

  return NextResponse.json({ ok: true, answer: reply || 'Done.', created })
}
