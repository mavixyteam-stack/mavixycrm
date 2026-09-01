import { NextRequest, NextResponse } from 'next/server'
import { authorizeAutomation } from '@/lib/automation-auth'
import { adminClient, createNotifications } from '@/lib/notify'
import { sendEmail, buildOpsAlertEmail } from '@/lib/email'

// Runs once daily. Because it runs once per day, each open item produces at
// most one reminder per day based on its current stage — no dedupe column
// needed. Stages: due tomorrow (heads-up), due today, overdue (escalates).

function dateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

interface DueItem {
  title: string
  assigneeId: string | null
  due: string           // YYYY-MM-DD
  clientName: string
  kind: 'task' | 'content'
}

async function run(req: NextRequest) {
  if (!(await authorizeAutomation(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = adminClient()
  const now = new Date()
  const today = dateStr(now)
  const tomorrow = dateStr(new Date(now.getTime() + 86400000))

  const [{ data: tasks }, { data: planItems }, { data: profiles }, { data: clients }] = await Promise.all([
    db.from('tasks').select('*').eq('done', false),
    db.from('plan_items').select('*').in('status', ['planned', 'in_progress', 'review']),
    db.from('profiles').select('id, name, role, email'),
    db.from('clients').select('id, name'),
  ])

  const clientMap = Object.fromEntries((clients || []).map(c => [c.id, c.name]))
  const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]))
  const ownerIds = (profiles || []).filter(p => ['owner', 'manager'].includes(p.role)).map(p => p.id)

  // Collect all items that have a due date
  const items: DueItem[] = []
  for (const t of tasks || []) {
    if (!t.due) continue
    items.push({ title: t.title, assigneeId: t.assignee_id, due: String(t.due).slice(0, 10), clientName: clientMap[t.client_id] || '', kind: 'task' })
  }
  for (const p of planItems || []) {
    if (!p.day || !p.month) continue
    const due = `${p.month}-${String(p.day).padStart(2, '0')}`
    items.push({ title: p.title, assigneeId: p.assignee_id, due, clientName: clientMap[p.client_id] || '', kind: 'content' })
  }

  // Bucket per assignee
  const perAssignee = new Map<string, { soon: DueItem[]; today: DueItem[]; overdue: DueItem[] }>()
  const allOverdue: DueItem[] = []

  for (const it of items) {
    let stage: 'soon' | 'today' | 'overdue' | null = null
    if (it.due === tomorrow) stage = 'soon'
    else if (it.due === today) stage = 'today'
    else if (it.due < today) stage = 'overdue'
    if (!stage) continue

    if (stage === 'overdue') allOverdue.push(it)

    if (it.assigneeId) {
      if (!perAssignee.has(it.assigneeId)) perAssignee.set(it.assigneeId, { soon: [], today: [], overdue: [] })
      perAssignee.get(it.assigneeId)![stage].push(it)
    }
  }

  // 1. One digest notification per assignee
  const admin = db
  let notified = 0
  for (const [assigneeId, b] of perAssignee) {
    const parts: string[] = []
    if (b.overdue.length) parts.push(`${b.overdue.length} overdue`)
    if (b.today.length) parts.push(`${b.today.length} due today`)
    if (b.soon.length) parts.push(`${b.soon.length} due tomorrow`)
    if (parts.length === 0) continue

    const type = b.overdue.length ? 'warning' : 'reminder'
    const lead = b.overdue.length ? '⚠️ ' : ''
    await createNotifications(admin, [assigneeId], {
      title: `${lead}Your work${b.overdue.length ? ' needs attention' : ' for today'}`,
      text: `You have ${parts.join(', ')}. Open My Day to get ahead of it.`,
      type,
      link: 'myday',
    })
    notified++
  }

  // 2. Escalate overdue work to owners/managers (in-app + one email)
  let emailed = 0
  if (allOverdue.length > 0 && ownerIds.length > 0) {
    const summary = allOverdue.slice(0, 20).map(it => {
      const who = it.assigneeId ? (profileMap[it.assigneeId]?.name?.split(' ')[0] || 'Unassigned') : 'Unassigned'
      return `${it.title}${it.clientName ? ` · ${it.clientName}` : ''} — ${who} (due ${it.due})`
    })

    await createNotifications(admin, ownerIds, {
      title: `⚠️ ${allOverdue.length} overdue item${allOverdue.length !== 1 ? 's' : ''} across the team`,
      text: summary.slice(0, 3).join(' · ') + (allOverdue.length > 3 ? ` · +${allOverdue.length - 3} more` : ''),
      type: 'warning',
      link: 'myday',
    })

    // One escalation email to each owner/manager with an address
    const leaders = (profiles || []).filter(p => ['owner', 'manager'].includes(p.role) && p.email)
    for (const leader of leaders) {
      const html = buildOpsAlertEmail({
        recipientName: leader.name?.split(' ')[0] || 'there',
        subject: `${allOverdue.length} overdue item${allOverdue.length !== 1 ? 's' : ''} need attention`,
        body: `here's what's slipped past its due date across the team. Nudge the owners or reassign.`,
        items: allOverdue.slice(0, 15).map(it => ({
          label: `${it.title}${it.clientName ? ` · ${it.clientName}` : ''}`,
          value: `${it.assigneeId ? (profileMap[it.assigneeId]?.name?.split(' ')[0] || '—') : 'Unassigned'} · ${it.due}`,
          urgent: true,
        })),
      })
      try {
        await sendEmail(leader.email, `⚠️ ${allOverdue.length} overdue item${allOverdue.length !== 1 ? 's' : ''} — Mavixy`, html)
        emailed++
      } catch { /* email is best-effort */ }
    }
  }

  return NextResponse.json({
    ok: true,
    assigneesNotified: notified,
    overdue: allOverdue.length,
    ownersEmailed: emailed,
  })
}

export const GET = run
export const POST = run
