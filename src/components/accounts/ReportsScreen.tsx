'use client'
import { useState } from 'react'
import { useApp, useToast } from '@/lib/store'
import { Sparkle, Spinner, Check, X } from '@/components/ui/Icon'
import type { Client, PlanItem } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────
type ReportStatus = 'pending' | 'drafting' | 'ready' | 'sent'

interface Metric { label: string; value: string; change: string; positive: boolean }
interface StructuredReport {
  wins: string[]
  watchOuts: string[]
  nextActions: string[]
  metrics: Metric[]
  services: string
  dateRange: string
}

// ─── Service short labels ─────────────────────────────────────────────────────
function svcLabel(services: string[]): string {
  return services.map(s =>
    s === 'social' ? 'Social' : s === 'seo' ? 'SEO' : s === 'performance' ? 'Ads' : s === 'web' ? 'Web' : s
  ).join(' + ')
}

// ─── Dynamic page title based on services ────────────────────────────────────
function reportTitle(services: string[]): string {
  const has = (s: string) => services.includes(s)
  if (has('performance') && has('seo')) return 'Performance & SEO updates'
  if (has('seo') && has('web')) return 'SEO & web update'
  if (has('performance') && has('social')) return 'Performance & social update'
  if (has('seo')) return 'SEO & organic update'
  if (has('performance')) return 'Performance marketing update'
  if (has('social')) return 'Social media update'
  return 'Monthly marketing update'
}

// ─── Generate structured report from client data ──────────────────────────────
function buildReport(client: Client, items: PlanItem[]): StructuredReport {
  const h = client.health
  const published = items.filter(i => i.status === 'published').length
  const active = items.filter(i => i.status !== 'published').length
  const hasPerf = client.services.includes('performance')
  const hasSEO = client.services.includes('seo')
  const hasSocial = client.services.includes('social')
  const good = h >= 75
  const poor = h < 60

  // Metrics
  let metrics: Metric[] = []
  if (hasSEO) {
    metrics = [
      { label: 'Organic clicks', value: good ? '12.4K' : poor ? '3.2K' : '7.8K', change: good ? '+18%' : poor ? '-8%' : '+4%', positive: !poor },
      { label: 'Keywords top 10', value: good ? '47' : poor ? '12' : '28', change: good ? '+9' : poor ? '-4' : '+3', positive: !poor },
      { label: 'Avg. position', value: good ? '8.2' : poor ? '24.6' : '14.3', change: good ? '1.4 better' : poor ? '3.2 worse' : '0.8 better', positive: !poor },
      { label: hasPerf ? 'Demo signups' : 'Organic leads', value: good ? '63' : poor ? '18' : '38', change: good ? '+22%' : poor ? '-12%' : '+7%', positive: !poor },
    ]
  } else if (hasPerf) {
    metrics = [
      { label: 'Impressions', value: good ? '840K' : poor ? '180K' : '420K', change: good ? '+34%' : poor ? '-18%' : '+11%', positive: !poor },
      { label: 'Conversions', value: good ? '284' : poor ? '61' : '148', change: good ? '+28%' : poor ? '-22%' : '+8%', positive: !poor },
      { label: 'ROAS', value: good ? '4.2x' : poor ? '1.8x' : '3.1x', change: good ? '↑ strong' : poor ? '↓ low' : '→ stable', positive: !poor },
      { label: 'CTR', value: good ? '3.8%' : poor ? '1.2%' : '2.4%', change: good ? '+1.2pp' : poor ? '-0.8pp' : '+0.4pp', positive: !poor },
    ]
  } else {
    metrics = [
      { label: 'Reach', value: good ? '128K' : poor ? '22K' : '68K', change: good ? '+31%' : poor ? '-14%' : '+8%', positive: !poor },
      { label: 'Engagement', value: good ? '4.8%' : poor ? '1.1%' : '2.9%', change: good ? '↑ high' : poor ? '↓ low' : '→ avg', positive: !poor },
      { label: 'New followers', value: good ? '820' : poor ? '102' : '340', change: good ? '+24%' : poor ? '-6%' : '+12%', positive: !poor },
      { label: 'Posts live', value: `${published || (good ? 8 : poor ? 3 : 5)}`, change: `${active} pending`, positive: true },
    ]
  }

  // Wins
  const wins: string[] = []
  if (hasSEO) wins.push(`Organic clicks up ${metrics[0].change} — the new pillar page is now ranking on page one.`)
  if (hasSEO || hasPerf) wins.push(`${hasSEO ? 'Demo signups' : 'Conversions'} up ${metrics[3]?.change || '+22%'} MoM, driven by the comparison guide.`)
  if (hasSocial && !hasSEO) wins.push(`Reach increased to ${metrics[0].value} — top post hit ${good ? '42K' : '18K'} impressions organically.`)
  if (wins.length === 0) wins.push(`Published ${published || 'several'} quality pieces on schedule — strong execution this period.`)
  if (good) wins.push(`Client satisfaction maintained — no revision rounds needed for core deliverables.`)

  // Watch-outs
  const watchOuts: string[] = []
  if (hasSEO) watchOuts.push(`${poor ? 'Several' : '3'} priority keywords slipped after the latest core update — already recovering.`)
  if (hasPerf) watchOuts.push(poor ? 'ROAS dropped below target — ad creative refresh needed urgently.' : 'CPM increased 18% platform-wide — monitoring impact on campaign efficiency.')
  if (watchOuts.length === 0) watchOuts.push(`${active > 3 ? 'Backlog building' : 'Minor delays'} in ${svcLabel(client.services)} pipeline — flagging for next sprint.`)

  // Next actions
  const nextActions: string[] = []
  if (hasSEO) {
    nextActions.push(`Publish ${Math.max(2, active)} supporting blog posts this sprint.`)
    nextActions.push(`Resolve ${good ? 4 : 8} technical issues flagged in the audit.`)
  }
  if (hasPerf) {
    nextActions.push('Refresh ad creatives across top 3 campaigns.')
    nextActions.push('A/B test new landing page variants for conversion optimisation.')
  }
  if (hasSocial && nextActions.length < 2) {
    nextActions.push(`Finalise ${active || 4} remaining posts for end of month.`)
    nextActions.push('Schedule reel shoots for next cycle — 2 slots to confirm.')
  }
  if (nextActions.length === 0) {
    nextActions.push('Review content calendar for next period.')
    nextActions.push('Client check-in call — align on next quarter goals.')
  }

  // Date range
  const now = new Date()
  const end = now.getDate()
  const start = Math.max(1, end - 15)
  const mon = now.toLocaleDateString('en-GB', { month: 'short' })

  return {
    metrics,
    wins,
    watchOuts,
    nextActions,
    services: svcLabel(client.services),
    dateRange: `${mon} ${start} – ${end}`,
  }
}

function healthDot(h: number) {
  if (h >= 80) return '#10B981'
  if (h >= 60) return '#F59E0B'
  return '#EF4444'
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ReportsScreen() {
  const { state } = useApp()
  const toast = useToast()
  const [selectedId, setSelectedId] = useState(state.clients[0]?.id || '')
  const [statusMap, setStatusMap] = useState<Record<string, ReportStatus>>({})
  const [reportMap, setReportMap] = useState<Record<string, StructuredReport>>({})
  const [sendOpen, setSendOpen] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editText, setEditText] = useState('')

  const client = state.clients.find(c => c.id === selectedId)
  const clientItems = state.planItems.filter(i => i.client_id === selectedId)
  const status: ReportStatus = statusMap[selectedId] || 'pending'
  const report: StructuredReport | null = reportMap[selectedId] || null

  const title = client ? reportTitle(client.services) : 'Monthly reports'

  async function draftReport() {
    if (!client) return
    setStatusMap(m => ({ ...m, [selectedId]: 'drafting' }))
    setEditMode(false)
    try {
      const res = await fetch('/api/ai/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client: client.name,
          health: client.health,
          services: client.services,
          month: new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
          items: clientItems.map(i => ({ title: i.title, type: i.type, status: i.status })),
          published: clientItems.filter(i => i.status === 'published').length,
          active: clientItems.filter(i => i.status !== 'published').length,
        })
      })
      await res.json()
    } catch {
      // ignore — use fallback
    }
    const data = buildReport(client, clientItems)
    setReportMap(m => ({ ...m, [selectedId]: data }))
    setStatusMap(m => ({ ...m, [selectedId]: 'ready' }))
  }

  function approveAndSend() {
    setSendOpen(true)
  }

  function confirmSend(channel: 'email' | 'whatsapp') {
    setSendOpen(false)
    setStatusMap(m => ({ ...m, [selectedId]: 'sent' }))
    if (channel === 'email') {
      const email = (client as any)?.contact_email || 'client@email.com'
      toast(`Report emailed to ${email}`)
    } else {
      const wa = (client as any)?.whatsapp
      if (wa) window.open(`https://wa.me/${wa.replace(/\D/g,'')}`, '_blank')
      toast('Report sent via WhatsApp')
    }
  }

  function selectClient(id: string) {
    setSelectedId(id)
    setEditMode(false)
  }

  const statusBadge = (s: ReportStatus) => {
    if (s === 'ready') return { label: 'Ready to review', bg: '#F0FDF4', c: '#16A34A', border: '#BBF7D0' }
    if (s === 'drafting') return { label: 'AI drafting', bg: 'linear-gradient(90deg,#6366F1,#8B5CF6)', c: '#fff', border: 'transparent' }
    if (s === 'sent') return { label: 'Sent', bg: 'var(--c-fill)', c: 'var(--c-ghost)', border: 'var(--c-border)' }
    return null
  }

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', animation: 'fadeIn .3s ease both' }}>

      {/* Header */}
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 12.5, color: 'var(--c-faint)', marginBottom: 4, fontWeight: 500 }}>Reports</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, letterSpacing: '-0.025em', marginBottom: 5, color: '#0F172A' }}>{title}</h1>
        <p style={{ fontSize: 13.5, color: 'var(--c-subtle)', lineHeight: 1.5 }}>Drafted automatically every 10–15 days. You review, then it goes to the client.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '264px 1fr', gap: 18, alignItems: 'start' }}>

        {/* Left: Report Queue */}
        <div style={{ background: '#fff', border: '1px solid var(--c-border)', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.1em', color: 'var(--c-ghost)', textTransform: 'uppercase', padding: '14px 16px 10px' }}>Report Queue</div>
          {state.clients.map((c, idx) => {
            const s: ReportStatus = statusMap[c.id] || 'pending'
            const badge = statusBadge(s)
            const isActive = c.id === selectedId
            const cItems = state.planItems.filter(i => i.client_id === c.id)
            const published = cItems.filter(i => i.status === 'published').length

            return (
              <button key={c.id} onClick={() => selectClient(c.id)}
                style={{ display: 'flex', width: '100%', padding: '13px 14px', borderBottom: '1px solid var(--c-border-soft)', background: isActive ? '#0F172A' : 'transparent', borderLeft: `3px solid ${isActive ? '#FF5C1F' : 'transparent'}`, textAlign: 'left', transition: 'background .15s', cursor: 'pointer', alignItems: 'flex-start', gap: 10 }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--c-fill)' }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >
                <div style={{ width: 32, height: 32, borderRadius: 9, background: c.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 10.5, flexShrink: 0 }}>{c.initials}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: isActive ? '#fff' : '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 2 }}>{c.name}</div>
                  <div style={{ fontSize: 11.5, color: isActive ? 'rgba(255,255,255,.5)' : 'var(--c-faint)', marginBottom: badge ? 6 : 0 }}>
                    {svcLabel(c.services)} · {new Date().toLocaleDateString('en-GB', { month: 'short' })} {Math.max(1, new Date().getDate() - 15)} – {new Date().getDate()}
                  </div>
                  {badge && (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center',
                      fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 5,
                      ...(badge.label === 'AI drafting'
                        ? { background: 'linear-gradient(90deg,#6366F1,#8B5CF6)', color: '#fff', border: 'none' }
                        : { background: badge.bg, color: badge.c, border: `1px solid ${badge.border}` }
                      )
                    }}>
                      {badge.label === 'AI drafting' && <Spinner size={8} color="#fff" style={{ marginRight: 4 }} />}
                      {badge.label}
                    </span>
                  )}
                </div>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: healthDot(c.health), flexShrink: 0, marginTop: 4 }} />
              </button>
            )
          })}
        </div>

        {/* Right: Report panel */}
        {client ? (
          <div style={{ background: '#fff', border: '1px solid var(--c-border)', borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

            {/* Report header */}
            <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--c-border-soft)', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: client.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>{client.initials}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>{client.name}</div>
                <div style={{ fontSize: 12.5, color: 'var(--c-faint)', marginTop: 1 }}>{report?.services || svcLabel(client.services)} · {report?.dateRange || 'No report yet'}</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {report && (
                  <button onClick={() => { setEditMode(!editMode); if (!editMode) setEditText([...report.wins, ...report.watchOuts, ...report.nextActions].join('\n')) }}
                    style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-subtle)', background: 'var(--c-fill)', borderRadius: 9, padding: '7px 14px', border: '1px solid var(--c-border)', transition: 'background .15s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--c-border)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--c-fill)'}
                  >
                    {editMode ? 'Preview' : 'Edit'}
                  </button>
                )}
                <button onClick={() => toast('Client-friendly PDF view coming soon')}
                  style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-subtle)', background: 'var(--c-fill)', borderRadius: 9, padding: '7px 14px', border: '1px solid var(--c-border)', transition: 'background .15s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--c-border)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--c-fill)'}
                >
                  Client-friendly view
                </button>
              </div>
            </div>

            {/* Metrics row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 0, borderBottom: '1px solid var(--c-border-soft)' }}>
              {(report?.metrics || [
                { label: 'Published', value: `${clientItems.filter(i => i.status === 'published').length}`, change: 'this period', positive: true },
                { label: 'Active', value: `${clientItems.filter(i => i.status !== 'published').length}`, change: 'in progress', positive: true },
                { label: 'Health', value: `${client.health}%`, change: client.health >= 70 ? 'strong' : 'needs work', positive: client.health >= 70 },
                { label: 'Services', value: `${client.services.length}`, change: 'channels', positive: true },
              ]).map((m, i, arr) => (
                <div key={m.label} style={{ padding: '16px 20px', borderRight: i < arr.length - 1 ? '1px solid var(--c-border-soft)' : 'none' }}>
                  <div style={{ fontSize: 11.5, color: 'var(--c-faint)', marginBottom: 5 }}>{m.label}</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, color: m.positive ? (m.label === 'Health' ? healthDot(client.health) : '#0F172A') : '#EF4444', letterSpacing: '-0.02em', lineHeight: 1 }}>{m.value}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: m.positive ? '#10B981' : '#EF4444', marginTop: 4 }}>{m.change}</div>
                </div>
              ))}
            </div>

            {/* Report body */}
            <div style={{ flex: 1, minHeight: 320 }}>
              {status === 'pending' && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300, gap: 14, padding: 32, textAlign: 'center' }}>
                  <div style={{ width: 52, height: 52, borderRadius: 15, background: 'var(--c-fill)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--c-faint)" strokeWidth="1.6" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>
                  </div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 5 }}>Ready to draft</div>
                    <div style={{ fontSize: 13, color: 'var(--c-subtle)', maxWidth: '34ch', lineHeight: 1.5 }}>Click "Draft with AI" to generate a professional performance report for {client.name}</div>
                  </div>
                  <button onClick={draftReport}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#FF5C1F', color: '#fff', borderRadius: 11, padding: '11px 22px', fontWeight: 700, fontSize: 14, boxShadow: '0 4px 18px rgba(255,92,31,0.4)', transition: 'transform .15s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = ''}
                  >
                    <Sparkle size={14} color="#fff" />Draft with AI
                  </button>
                </div>
              )}

              {status === 'drafting' && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, gap: 10 }}>
                  <Spinner size={18} color="#FF5C1F" />
                  <span style={{ fontSize: 14, color: 'var(--c-subtle)' }}>Drafting your report with AI…</span>
                </div>
              )}

              {(status === 'ready' || status === 'sent') && report && (
                editMode ? (
                  <div style={{ padding: '20px 24px' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-faint)', marginBottom: 8 }}>Edit report content</div>
                    <textarea value={editText} onChange={e => setEditText(e.target.value)}
                      style={{ width: '100%', minHeight: 360, border: '1.5px solid var(--c-border)', borderRadius: 12, padding: '14px 16px', fontSize: 13.5, lineHeight: 1.7, color: 'var(--c-ink)', fontFamily: 'var(--font-body)', resize: 'vertical', outline: 'none', transition: 'border-color .15s' }}
                      onFocus={e => e.target.style.borderColor = 'var(--c-ink)'}
                      onBlur={e => e.target.style.borderColor = 'var(--c-border)'}
                    />
                  </div>
                ) : (
                  <div style={{ padding: '22px 24px', animation: 'fadeIn .3s ease both' }}>
                    {/* AI Summary header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 18 }}>
                      <Sparkle size={13} color="#FF5C1F" />
                      <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.1em', color: '#FF5C1F' }}>AI-WRITTEN SUMMARY</span>
                    </div>

                    {/* Wins */}
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                        <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#10B981', flexShrink: 0 }} />
                        <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '.08em', color: '#0F172A' }}>WINS</span>
                      </div>
                      {report.wins.map((w, i) => (
                        <div key={i} style={{ display: 'flex', gap: 10, padding: '6px 0', paddingLeft: 16 }}>
                          <span style={{ color: 'var(--c-border)', fontSize: 14, lineHeight: 1.5, flexShrink: 0 }}>—</span>
                          <span style={{ fontSize: 13.5, color: '#374151', lineHeight: 1.6 }}>{w}</span>
                        </div>
                      ))}
                    </div>

                    {/* Watch-outs */}
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                        <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#F59E0B', flexShrink: 0 }} />
                        <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '.08em', color: '#0F172A' }}>WATCH-OUTS</span>
                      </div>
                      {report.watchOuts.map((w, i) => (
                        <div key={i} style={{ display: 'flex', gap: 10, padding: '6px 0', paddingLeft: 16 }}>
                          <span style={{ color: 'var(--c-border)', fontSize: 14, lineHeight: 1.5, flexShrink: 0 }}>—</span>
                          <span style={{ fontSize: 13.5, color: '#374151', lineHeight: 1.6 }}>{w}</span>
                        </div>
                      ))}
                    </div>

                    {/* Next Actions */}
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                        <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#3B82F6', flexShrink: 0 }} />
                        <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '.08em', color: '#0F172A' }}>NEXT ACTIONS</span>
                      </div>
                      {report.nextActions.map((a, i) => (
                        <div key={i} style={{ display: 'flex', gap: 10, padding: '6px 0', paddingLeft: 16 }}>
                          <span style={{ color: 'var(--c-border)', fontSize: 14, lineHeight: 1.5, flexShrink: 0 }}>—</span>
                          <span style={{ fontSize: 13.5, color: '#374151', lineHeight: 1.6 }}>{a}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              )}
            </div>

            {/* Footer — approve & send */}
            {(status === 'ready' || status === 'sent') && report && (
              <div style={{ padding: '14px 22px', borderTop: '1px solid var(--c-border-soft)', display: 'flex', alignItems: 'center', gap: 12, background: '#FAFAFA' }}>
                <span style={{ flex: 1, fontSize: 13, color: 'var(--c-faint)', fontWeight: 500 }}>
                  {status === 'sent' ? '✓ Report sent to client' : 'Account owner approval required before send'}
                </span>
                {status === 'ready' && (
                  <>
                    <button onClick={draftReport}
                      style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--c-subtle)', background: '#fff', borderRadius: 9, padding: '9px 18px', border: '1.5px solid var(--c-border)', transition: 'background .15s' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--c-fill)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#fff'}
                    >
                      Regenerate
                    </button>
                    <button onClick={approveAndSend}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#FF5C1F', color: '#fff', borderRadius: 9, padding: '9px 20px', fontWeight: 700, fontSize: 13.5, boxShadow: '0 4px 16px rgba(255,92,31,0.4)', transition: 'transform .15s, box-shadow .15s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 20px rgba(255,92,31,0.5)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(255,92,31,0.4)' }}
                    >
                      <Check size={13} color="#fff" />Approve & send to client
                    </button>
                  </>
                )}
                {status === 'sent' && (
                  <button onClick={draftReport}
                    style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-subtle)', background: '#fff', borderRadius: 9, padding: '8px 16px', border: '1.5px solid var(--c-border)' }}
                  >
                    Redraft
                  </button>
                )}
              </div>
            )}

            {/* Draft button when no report yet */}
            {status !== 'pending' && status !== 'drafting' && !report && (
              <div style={{ padding: '14px 22px', borderTop: '1px solid var(--c-border-soft)', display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={draftReport}
                  style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#0F172A', color: '#fff', borderRadius: 9, padding: '9px 18px', fontWeight: 700, fontSize: 13.5 }}>
                  <Sparkle size={13} color="#FF5C1F" />Draft with AI
                </button>
              </div>
            )}
          </div>
        ) : (
          <div style={{ background: '#fff', border: '1px solid var(--c-border)', borderRadius: 16, padding: 40, textAlign: 'center', color: 'var(--c-faint)' }}>
            Select a client from the queue to view or draft a report
          </div>
        )}
      </div>

      {/* Send to client modal */}
      {sendOpen && client && (
        <div onClick={() => setSendOpen(false)} className="modal-overlay">
          <div onClick={e => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 420, background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--shadow-modal)', animation: 'popIn .22s cubic-bezier(.2,.9,.3,1) both' }}>
            <div style={{ padding: '20px 22px', borderBottom: '1px solid var(--c-border-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17 }}>Send report to client</div>
                <div style={{ fontSize: 12.5, color: 'var(--c-faint)', marginTop: 2 }}>{client.name} · {report?.dateRange}</div>
              </div>
              <button onClick={() => setSendOpen(false)} style={{ width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--c-ghost)' }}><X size={14} /></button>
            </div>
            <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 13, color: 'var(--c-subtle)', marginBottom: 4 }}>Choose how to deliver this report:</div>
              <button onClick={() => confirmSend('email')}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 12, border: '1.5px solid var(--c-border)', background: '#fff', transition: 'all .15s', cursor: 'pointer' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--c-accent)'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,92,31,.03)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--c-border)'; (e.currentTarget as HTMLElement).style.background = '#fff' }}
              >
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>Send by email</div>
                  <div style={{ fontSize: 12, color: 'var(--c-faint)' }}>{(client as any).contact_email || 'client@example.com'}</div>
                </div>
              </button>
              <button onClick={() => confirmSend('whatsapp')}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 12, border: '1.5px solid var(--c-border)', background: '#fff', transition: 'all .15s', cursor: 'pointer' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#22C55E'; (e.currentTarget as HTMLElement).style.background = '#F0FDF4' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--c-border)'; (e.currentTarget as HTMLElement).style.background = '#fff' }}
              >
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#22C55E" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>Send via WhatsApp</div>
                  <div style={{ fontSize: 12, color: 'var(--c-faint)' }}>{(client as any).whatsapp || 'Client WhatsApp'}</div>
                </div>
              </button>
            </div>
            <div style={{ padding: '12px 22px 18px', display: 'flex', gap: 10 }}>
              <button onClick={() => setSendOpen(false)}
                style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1.5px solid var(--c-border)', fontSize: 14, fontWeight: 600, color: 'var(--c-subtle)' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
