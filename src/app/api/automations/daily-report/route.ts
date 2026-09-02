import { NextRequest, NextResponse } from 'next/server'
import { authorizeAutomation } from '@/lib/automation-auth'
import { adminClient, createNotifications } from '@/lib/notify'
import { sendEmail, buildDailyReportEmail } from '@/lib/email'
import { complete } from '@/lib/groq'

const pad = (n: number) => String(n).padStart(2, '0')

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
// AI text -> lightweight HTML (headings, bullets, paragraphs)
function toHtml(text: string): string {
  return text.split('\n').map(line => {
    const t = line.trim()
    if (!t) return ''
    if (/^#{1,3}\s/.test(t)) return `<div style="font-weight:700;color:#0E0F0C;margin:16px 0 4px;">${esc(t.replace(/^#{1,3}\s/, ''))}</div>`
    if (/^\*\*(.+)\*\*:?$/.test(t)) return `<div style="font-weight:700;color:#0E0F0C;margin:16px 0 4px;">${esc(t.replace(/\*\*/g, '').replace(/:$/, ''))}</div>`
    if (/^[-•*]\s/.test(t)) return `<div style="margin:3px 0 3px 6px;">• ${esc(t.replace(/^[-•*]\s/, ''))}</div>`
    return `<div style="margin:8px 0;">${esc(t)}</div>`
  }).join('')
}

async function run(req: NextRequest) {
  if (!(await authorizeAutomation(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const db = adminClient()
  const now = new Date()
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  const dateLabel = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })

  const [{ data: logs }, { data: attendance }, { data: profiles }, { data: clients }] = await Promise.all([
    db.from('work_logs').select('user_id, note').eq('date', date),
    db.from('attendance').select('user_id, check_in, check_out, break_minutes').eq('date', date),
    db.from('profiles').select('id, name, role, department'),
    db.from('clients').select('id, name'),
  ])

  const pMap = Object.fromEntries((profiles || []).map(p => [p.id, p]))
  const worked = (attendance || []).filter(a => a.check_in)
  const clientNames = (clients || []).map(c => c.name).join(', ')

  // Build the data block for the AI
  const lines: string[] = []
  for (const log of logs || []) {
    const p = pMap[log.user_id]
    if (!p) continue
    lines.push(`${p.name}${p.department ? ` (${p.department})` : ''}: ${log.note.replace(/\n+/g, '; ')}`)
  }
  const noLog = worked.filter(a => !(logs || []).some(l => l.user_id === a.user_id))
    .map(a => pMap[a.user_id]?.name).filter(Boolean)

  const owners = (profiles || []).filter(p => ['owner', 'manager'].includes(p.role))

  // Nothing to report → still tell the owner it was quiet
  let body: string
  if (lines.length === 0) {
    body = 'No end-of-day updates were logged today. Either it was a quiet day or the team needs a nudge to log their work at checkout.'
  } else {
    const prompt = `You are the chief of staff for a creative marketing agency. Write a crisp end-of-day report for the founder based on the team's own updates.

Date: ${dateLabel}
Clients: ${clientNames || 'various'}
Team present today: ${worked.length}

Team updates (name, department: what they did):
${lines.join('\n')}
${noLog.length ? `\nDid not log their day: ${noLog.join(', ')}` : ''}

Write a tight report (max ~200 words) with these sections, using "**Heading**" lines and "•" bullets:
**What moved forward** — group the real progress by department (Creative, Digital Marketing, Sales, etc.), mention clients by name where relevant.
**Watch-outs** — anything that looks stuck, at risk, or anyone who didn't log their day.
**Suggested focus tomorrow** — 2-3 concrete priorities.
Be specific and plain-spoken. No preamble, no sign-off — just the report.`
    try {
      body = await complete(prompt, 'You are a sharp, concise agency chief of staff. Output plain text with ** for headings and • for bullets.')
    } catch {
      body = toPlainFallback(lines, noLog)
    }
  }

  const stats = [
    { label: 'Logged', value: String((logs || []).length) },
    { label: 'Worked', value: String(worked.length) },
    { label: 'Missing', value: String(noLog.length) },
  ]
  const bodyHtml = toHtml(body)

  let emailed = 0
  for (const o of owners) {
    const prof = pMap[o.id]
    const { data: withEmail } = await db.from('profiles').select('email').eq('id', o.id).maybeSingle()
    if (!withEmail?.email) continue
    const html = buildDailyReportEmail({
      recipientName: prof?.name?.split(' ')[0] || 'there',
      date: dateLabel,
      bodyHtml,
      stats,
    })
    try { await sendEmail(withEmail.email, `📊 Daily report · ${dateLabel}`, html); emailed++ } catch { /* best effort */ }
  }

  // Also drop it in the owners' in-app bell (no email dupe)
  await createNotifications(db, owners.map(o => o.id), {
    title: `Daily report · ${dateLabel}`,
    text: `${(logs || []).length} updates logged, ${worked.length} on the clock${noLog.length ? `, ${noLog.length} missing a log` : ''}. Full report in your email.`,
    type: 'info',
    link: 'myday',
  }, { email: false })

  return NextResponse.json({ ok: true, logs: (logs || []).length, emailed })
}

function toPlainFallback(lines: string[], noLog: string[]): string {
  return `**What moved forward**\n${lines.map(l => `• ${l}`).join('\n')}${noLog.length ? `\n\n**Watch-outs**\n• No log from: ${noLog.join(', ')}` : ''}`
}

export const GET = run
export const POST = run
