import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.RESEND_FROM || 'Mavixy <onboarding@resend.dev>'

export async function sendEmail(to: string | string[], subject: string, html: string) {
  const { data, error } = await resend.emails.send({
    from: FROM,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
  })
  if (error) throw new Error(error.message)
  return data
}

// ─── Shared layout wrapper ────────────────────────────────────────────────────

function layout(content: string, preview?: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${preview ? `<meta name="description" content="${preview}">` : ''}
  <title>Mavixy</title>
</head>
<body style="margin:0;padding:0;background:#F5F6F2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#0E0F0C;">
  <div style="max-width:620px;margin:0 auto;padding:28px 16px;">

    <!-- Logo -->
    <div style="margin-bottom:24px;">
      <span style="font-size:22px;font-weight:900;color:#0F172A;letter-spacing:-0.02em;">mavixy<span style="color:#FF5C1F;">.</span></span>
    </div>

    <!-- Card -->
    <div style="background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 1px 2px rgba(16,17,12,.04),0 8px 32px -16px rgba(16,17,12,.16);">
      ${content}
    </div>

    <!-- Footer -->
    <div style="margin-top:24px;text-align:center;color:#9A9E94;font-size:12px;line-height:1.6;">
      Mavixy OS · Agency Command Center<br>
      <span style="color:#B6BAAF;">You're receiving this because you're part of your agency's Mavixy workspace.</span>
    </div>

  </div>
</body>
</html>`
}

// ─── Section helpers ──────────────────────────────────────────────────────────

function header(title: string, subtitle: string, accent = '#FF5C1F') {
  return `<div style="background:#0F172A;padding:28px 32px 24px;">
    <div style="display:inline-block;background:${accent}1A;border-radius:8px;padding:4px 10px;margin-bottom:12px;">
      <span style="font-size:11px;font-weight:700;letter-spacing:.1em;color:${accent};">${title}</span>
    </div>
    <div style="font-size:22px;font-weight:700;color:#fff;line-height:1.3;">${subtitle}</div>
  </div>`
}

function sectionTitle(text: string) {
  return `<div style="padding:20px 28px 8px;font-size:11px;font-weight:700;letter-spacing:.08em;color:#9A9E94;text-transform:uppercase;">${text}</div>`
}

function contentCard(title: string, meta: string, body: string, tag?: { label: string; color: string; bg: string }) {
  return `<div style="margin:0 16px 10px;background:#F5F6F2;border-radius:14px;padding:16px 18px;">
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:6px;">
      <div style="font-size:14.5px;font-weight:700;color:#0E0F0C;line-height:1.3;">${title}</div>
      ${tag ? `<div style="flex-shrink:0;font-size:11px;font-weight:700;color:${tag.color};background:${tag.bg};border-radius:6px;padding:3px 8px;">${tag.label}</div>` : ''}
    </div>
    <div style="font-size:12px;color:#9A9E94;margin-bottom:8px;">${meta}</div>
    ${body ? `<div style="font-size:13.5px;color:#5A5E54;line-height:1.6;">${body}</div>` : ''}
  </div>`
}

function statRow(stats: { label: string; value: string; color?: string }[]) {
  const cells = stats.map(s => `
    <td style="text-align:center;padding:16px 12px;">
      <div style="font-size:24px;font-weight:700;color:${s.color || '#0E0F0C'};">${s.value}</div>
      <div style="font-size:11px;color:#9A9E94;font-weight:600;text-transform:uppercase;letter-spacing:.06em;margin-top:2px;">${s.label}</div>
    </td>`).join(`<td style="width:1px;background:#EEF0EA;"></td>`)
  return `<table style="width:100%;border-collapse:collapse;border-top:1px solid #EEF0EA;border-bottom:1px solid #EEF0EA;margin:12px 0;">
    <tr>${cells}</tr>
  </table>`
}

function cta(text: string, href = '#') {
  return `<div style="padding:20px 28px;">
    <a href="${href}" style="display:inline-block;background:#FF5C1F;color:#fff;font-size:14px;font-weight:700;border-radius:11px;padding:12px 24px;text-decoration:none;">${text}</a>
  </div>`
}

function divider() {
  return `<div style="height:1px;background:#EEF0EA;margin:4px 0;"></div>`
}

// ─── Morning Brief ────────────────────────────────────────────────────────────

export interface BriefTask {
  title: string
  client: string
  type: string
  brief?: string
  refs?: { label: string }[]
  priority?: string
  due?: string
}

export function buildMorningBriefEmail(opts: {
  name: string
  date: string
  tasks: BriefTask[]
  planItems: BriefTask[]
}) {
  const { name, date, tasks, planItems } = opts
  const totalItems = tasks.length + planItems.length

  const planHtml = planItems.length
    ? planItems.map(item => contentCard(
        item.title,
        `${item.client} · ${item.type}`,
        item.brief || '',
        item.refs?.length ? { label: `${item.refs.length} ref${item.refs.length > 1 ? 's' : ''}`, color: '#2563EB', bg: '#EAF1FF' } : undefined
      )).join('')
    : `<div style="padding:12px 28px;color:#9A9E94;font-size:13.5px;">No content planned today — enjoy the breathing room.</div>`

  const taskHtml = tasks.length
    ? tasks.map(t => contentCard(
        t.title,
        `${t.client ? t.client + ' · ' : ''}Due ${t.due || 'today'}`,
        '',
        t.priority === 'High' ? { label: 'High', color: '#EF4444', bg: '#FEE2E2' } : undefined
      )).join('')
    : ''

  const refsBlock = planItems.flatMap(i => i.refs || []).filter(r => r.label?.startsWith('http'))
  const refsHtml = refsBlock.length
    ? `${sectionTitle('Inspiration Links')}
       <div style="padding:4px 28px 16px;">
         ${refsBlock.map(r => `<div style="margin-bottom:6px;"><a href="${r.label}" style="color:#FF5C1F;font-size:13.5px;font-weight:500;">${r.label}</a></div>`).join('')}
       </div>`
    : ''

  const content = `
    ${header('MORNING BRIEF', `Good morning, ${name} 👋`, '#FF5C1F')}
    <div style="padding:20px 28px 12px;">
      <span style="font-size:13.5px;color:#9A9E94;">${date} · </span>
      <span style="font-size:13.5px;font-weight:600;color:#0E0F0C;">${totalItems} item${totalItems !== 1 ? 's' : ''} need your attention today</span>
    </div>
    ${divider()}
    ${planItems.length ? sectionTitle('Content to Create') : ''}
    ${planHtml}
    ${tasks.length ? `${divider()}${sectionTitle('Tasks Due')}${taskHtml}` : ''}
    ${refsHtml ? `${divider()}${refsHtml}` : ''}
    <div style="height:20px;"></div>
  `

  return layout(content, `${totalItems} items need your attention today`)
}

// ─── Lead Follow-up ───────────────────────────────────────────────────────────

export interface FollowUpLead {
  name: string
  company: string
  score?: string
  notes?: string
  phone?: string
  email?: string
  followUpDate: string
  ownerName?: string
}

export function buildLeadFollowupEmail(opts: {
  recipientName: string
  leads: FollowUpLead[]
  date: string
}) {
  const { recipientName, leads, date } = opts
  const scoreColor = (s?: string) => s === 'hot' ? { label: '🔥 Hot', color: '#DC2626', bg: '#FEE2E2' } :
    s === 'warm' ? { label: '🌤 Warm', color: '#C99211', bg: '#FCF3D9' } :
    { label: '❄️ Cold', color: '#2563EB', bg: '#EAF1FF' }

  const leadsHtml = leads.map(l => contentCard(
    l.name,
    `${l.company}${l.ownerName ? ` · Owner: ${l.ownerName}` : ''} · Follow-up: ${l.followUpDate}`,
    [
      l.notes ? `<div style="margin-bottom:6px;">${l.notes}</div>` : '',
      l.email ? `<div style="font-size:12px;color:#5A5E54;">📧 <a href="mailto:${l.email}" style="color:#FF5C1F;">${l.email}</a></div>` : '',
      l.phone ? `<div style="font-size:12px;color:#5A5E54;">📱 ${l.phone}</div>` : '',
    ].filter(Boolean).join(''),
    l.score ? scoreColor(l.score) : undefined
  )).join('')

  const content = `
    ${header('LEAD FOLLOW-UP', `${leads.length} lead${leads.length !== 1 ? 's' : ''} need follow-up today`, '#C99211')}
    <div style="padding:16px 28px 12px;font-size:14px;color:#5A5E54;line-height:1.6;">
      Hey ${recipientName}, here are the leads scheduled for follow-up on <strong>${date}</strong>. Don't let them go cold.
    </div>
    ${divider()}
    ${sectionTitle('Follow-Up Queue')}
    ${leadsHtml}
    <div style="height:20px;"></div>
  `

  return layout(content, `${leads.length} leads scheduled for follow-up today`)
}

// ─── Weekly Digest ────────────────────────────────────────────────────────────

export interface DigestData {
  recipientName: string
  weekLabel: string
  pipeline: { new: number; qualified: number; proposals: number; totalValue: number; wonValue: number }
  content: { total: number; published: number; inProgress: number; overdue: number }
  team: { totalStaff: number; checkedInToday: number }
  topDeals: { name: string; company: string; value: number; stage: string }[]
  overdueItems: { title: string; client: string; daysOverdue: number }[]
}

export function buildWeeklyDigestEmail(opts: DigestData) {
  const { recipientName, weekLabel, pipeline, content, team, topDeals, overdueItems } = opts

  const stageLabel = (s: string) => ({ lead: 'Lead', qualified: 'Qualified', proposal: 'Proposal', negotiation: 'Negotiation', closed: 'Closed' }[s] || s)
  const fmtValue = (v: number) => v >= 100000 ? `₹${(v / 100000).toFixed(1)}L` : v >= 1000 ? `₹${(v / 1000).toFixed(0)}K` : `₹${v}`

  const topDealsHtml = topDeals.length
    ? topDeals.map(d => contentCard(
        d.name, `${d.company} · ${stageLabel(d.stage)}`, '',
        { label: fmtValue(d.value), color: '#0E8C63', bg: '#E7FAF3' }
      )).join('')
    : `<div style="padding:12px 28px;color:#9A9E94;font-size:13.5px;">No active deals this week.</div>`

  const overdueHtml = overdueItems.length
    ? overdueItems.map(o => contentCard(
        o.title, o.client, '',
        { label: `${o.daysOverdue}d overdue`, color: '#EF4444', bg: '#FEE2E2' }
      )).join('')
    : `<div style="padding:12px 28px;color:#0E8C63;font-size:13.5px;">✅ All content on track — no overdue items.</div>`

  const content_ = `
    ${header('WEEKLY DIGEST', `Your week at a glance, ${recipientName}`, '#7C3AED')}
    <div style="padding:16px 28px 4px;font-size:13.5px;color:#9A9E94;">${weekLabel}</div>
    ${statRow([
      { label: 'Pipeline Value', value: fmtValue(pipeline.totalValue), color: '#0E8C63' },
      { label: 'Content Done', value: `${content.published}/${content.total}` },
      { label: 'Team Active', value: `${team.checkedInToday}/${team.totalStaff}` },
    ])}
    ${divider()}
    ${sectionTitle('Pipeline Snapshot')}
    ${statRow([
      { label: 'New Leads', value: String(pipeline.new) },
      { label: 'Qualified', value: String(pipeline.qualified) },
      { label: 'Proposals', value: String(pipeline.proposals), color: '#7C3AED' },
    ])}
    ${sectionTitle('Top Active Deals')}
    ${topDealsHtml}
    ${overdueItems.length ? `${divider()}${sectionTitle('Overdue Content')}${overdueHtml}` : ''}
    ${content.overdue > 0 ? `<div style="padding:8px 28px 16px;font-size:13px;color:#EF4444;font-weight:600;">${content.overdue} content item${content.overdue !== 1 ? 's' : ''} overdue — review with your team.</div>` : ''}
    <div style="height:20px;"></div>
  `

  return layout(content_, `Weekly digest: ${fmtValue(pipeline.totalValue)} pipeline, ${content.published} pieces published`)
}

// ─── Ops Alert ────────────────────────────────────────────────────────────────

export function buildOpsAlertEmail(opts: {
  recipientName: string
  subject: string
  body: string
  items: { label: string; value: string; urgent?: boolean }[]
}) {
  const { recipientName, subject, body, items } = opts

  const itemsHtml = items.map(i => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid #EEF0EA;">
      <span style="font-size:14px;color:#0E0F0C;">${i.label}</span>
      <span style="font-size:13.5px;font-weight:700;color:${i.urgent ? '#EF4444' : '#0E0F0C'};">${i.value}</span>
    </div>`).join('')

  const content_ = `
    ${header('OPS ALERT', subject, '#EF4444')}
    <div style="padding:20px 28px 8px;font-size:14px;color:#5A5E54;line-height:1.6;">Hey ${recipientName}, ${body}</div>
    ${items.length ? `<div style="padding:0 28px 20px;">${itemsHtml}</div>` : ''}
    <div style="height:8px;"></div>
  `

  return layout(content_, subject)
}

// ─── Single notification ──────────────────────────────────────────────────────

const NOTIF_ACCENT: Record<string, string> = {
  success: '#0E8C63', warning: '#E5484D', reminder: '#FF5C1F', request: '#7C3AED', info: '#2563EB',
}

export function buildNotificationEmail(opts: {
  recipientName: string
  title?: string | null
  text: string
  type?: string
  actionUrl?: string
}) {
  const { recipientName, title, text, type = 'info', actionUrl } = opts
  const accent = NOTIF_ACCENT[type] || '#FF5C1F'

  const content = `
    ${header('MAVIXY', title || 'New notification', accent)}
    <div style="padding:24px 28px 12px;">
      <div style="font-size:14px;color:#9A9E94;margin-bottom:10px;">Hi ${recipientName},</div>
      <div style="font-size:16px;line-height:1.6;color:#0E0F0C;">${text}</div>
    </div>
    ${actionUrl ? `<div style="padding:8px 28px 24px;">
      <a href="${actionUrl}" style="display:inline-block;background:${accent};color:#fff;font-size:14px;font-weight:700;border-radius:11px;padding:12px 24px;text-decoration:none;">Open in Mavixy</a>
    </div>` : '<div style="height:14px;"></div>'}
  `
  return layout(content, title || text)
}

// ─── Onboarding welcome ───────────────────────────────────────────────────────

export function buildWelcomeEmail(opts: {
  name: string
  workEmail: string
  password: string
  appUrl: string
}) {
  const { name, workEmail, password, appUrl } = opts
  const first = name.split(' ')[0] || name

  const cred = (label: string, value: string) => `
    <tr>
      <td style="padding:10px 0;font-size:13px;color:#9A9E94;width:130px;">${label}</td>
      <td style="padding:10px 0;font-size:14px;font-weight:700;color:#0E0F0C;font-family:'SF Mono',Menlo,monospace;">${value}</td>
    </tr>`

  const content = `
    ${header('WELCOME ABOARD', `Welcome to the team, ${first} 🎉`, '#0E8C63')}
    <div style="padding:24px 28px 8px;font-size:15px;line-height:1.65;color:#3A3E33;">
      We're thrilled to have you at Mavixy. Your accounts are set up and ready — here are your login details.
    </div>

    <div style="margin:12px 28px;background:#F5F6F2;border-radius:14px;padding:18px 20px;">
      <div style="font-size:11px;font-weight:700;letter-spacing:.08em;color:#9A9E94;text-transform:uppercase;margin-bottom:6px;">Your login</div>
      <table style="width:100%;border-collapse:collapse;">
        ${cred('Email / ID', workEmail)}
        ${cred('Password', password)}
      </table>
      <div style="font-size:12.5px;color:#B07E0C;background:#FBF1D6;border-radius:9px;padding:9px 12px;margin-top:12px;">
        🔒 Please change this password after your first sign-in.
      </div>
    </div>

    <div style="padding:8px 28px 4px;font-size:14px;line-height:1.6;color:#5A5E54;">
      Use the same email and password for both <strong>Microsoft 365</strong> and <strong>Mavixy OS</strong>.
    </div>
    <div style="padding:12px 28px 26px;">
      <a href="${appUrl}" style="display:inline-block;background:#FF5C1F;color:#fff;font-size:14px;font-weight:700;border-radius:11px;padding:13px 26px;text-decoration:none;">Sign in to Mavixy OS →</a>
    </div>
  `
  return layout(content, `Welcome to Mavixy, ${first} — your account is ready`)
}
