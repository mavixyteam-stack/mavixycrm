'use client'
import React, { useState } from 'react'
import { useApp, useToast, useUpsertPlanItem, useDeletePlanItem } from '@/lib/store'
import { Plus, X, Sparkle, Spinner, Check } from '@/components/ui/Icon'
import { SERVICE_CATS, TYPE_MAP, EFFORT_LABELS, IDEA_BANK, BRIEF_BANK, STATUS_PIPE } from '@/lib/seed-data'
import { schedule, skillScore, weekOf, calcWorkStart } from '@/lib/scheduler'
import type { PlanItem, ContentCat, ContentStatus, Profile } from '@/types'
import type { ScheduleRow } from '@/lib/scheduler'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const WEEKDAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

function getMonthKey(offset = 0) {
  const d = new Date(); d.setMonth(d.getMonth() + offset)
  return `${d.getFullYear()}-${d.getMonth() + 1}`
}

function parseMonthKey(key: string) {
  const [y, m] = key.split('-').map(Number)
  return { y, m, label: `${MONTHS[m - 1]} ${y}` }
}

function formatDay(day: number | null, monthKey: string): string {
  if (!day) return ''
  const { y, m } = parseMonthKey(monthKey)
  const d = new Date(y, m - 1, day)
  return `${WEEKDAYS[d.getDay()]} ${day}`
}

function clientBadge(items: PlanItem[]) {
  if (items.length === 0) return { label: 'To plan', c: '#6B7280', bg: 'var(--c-fill)' }
  const allAssigned = items.every(i => i.assignee_id && i.day)
  if (allAssigned) return { label: 'Scheduled', c: '#16A34A', bg: '#F0FDF4' }
  const anyAssigned = items.some(i => i.assignee_id)
  if (anyAssigned) return { label: 'Partial', c: '#F59E0B', bg: '#FFFBEB' }
  return { label: 'To push', c: '#FF5C1F', bg: '#FFF1EA' }
}

function scoreBar(score: number) {
  if (score >= 0.9) return { label: 'Ideal match', color: '#10B981', bg: '#ECFDF5' }
  if (score >= 0.65) return { label: 'Good match', color: '#F59E0B', bg: '#FFFBEB' }
  return { label: 'Out of specialty', color: '#EF4444', bg: '#FEF2F2' }
}

interface ModalState {
  open: boolean
  item: Partial<PlanItem> | null
  clientId: string
  cat: ContentCat
}

export default function ContentPlanner() {
  const { state } = useApp()
  const toast = useToast()
  const upsertPlanItem = useUpsertPlanItem()
  const deletePlanItem = useDeletePlanItem()
  const [monthOff, setMonthOff] = useState(0)
  const [monthAutoSet, setMonthAutoSet] = useState(false)
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [modal, setModal] = useState<ModalState>({ open: false, item: null, clientId: '', cat: 'social' })
  const [aiLoading, setAiLoading] = useState(false)
  const [ideaIdx, setIdeaIdx] = useState(0)
  const [refInput, setRefInput] = useState('')

  // Smart schedule state
  const [schedOpen, setSchedOpen] = useState(false)
  const [schedRows, setSchedRows] = useState<ScheduleRow[]>([])
  const [schedScope, setSchedScope] = useState<'all' | 'client'>('client')
  const [schedSaving, setSchedSaving] = useState(false)

  React.useEffect(() => {
    if (monthAutoSet || state.planItems.length === 0) return
    const cur = getMonthKey(0), prev = getMonthKey(-1)
    if (!state.planItems.some(i => i.month === cur) && state.planItems.some(i => i.month === prev)) setMonthOff(-1)
    setMonthAutoSet(true)
  }, [state.planItems, monthAutoSet])

  const monthKey = getMonthKey(monthOff)
  const { label: monthLabel } = parseMonthKey(monthKey)
  const items = state.planItems.filter(it => it.month === monthKey)

  const activeClientId = selectedClientId || state.clients[0]?.id || null
  const activeClient = state.clients.find(c => c.id === activeClientId)
  const activeItems = items.filter(it => it.client_id === activeClientId)
  const activeCats = activeClient ? SERVICE_CATS.filter(c => activeClient.services.includes(c.key)) : []

  const totalEffort = items.reduce((s, i) => s + i.effort, 0)
  const unassigned = items.filter(i => !i.assignee_id || !i.day).length
  const assigned = items.filter(i => i.assignee_id && i.day).length

  // ── Open smart schedule modal ──────────────────────────────────────────────
  function openScheduler(scope: 'all' | 'client') {
    const target = scope === 'client'
      ? activeItems.filter(i => !i.assignee_id || !i.day)
      : items.filter(i => !i.assignee_id || !i.day)

    if (target.length === 0) { toast('All items are already scheduled!'); return }

    const rows = schedule(target, state.users, monthKey)
    setSchedRows(rows)
    setSchedScope(scope)
    setSchedOpen(true)
  }

  // Override a single row's assignee in the preview
  function overrideAssignee(rowIdx: number, user: Profile) {
    setSchedRows(rows => rows.map((r, i) => {
      if (i !== rowIdx) return r
      const { score, reason } = skillScore(r.item.type, user.title || '')
      const workStart = calcWorkStart(r.postingDay, r.item.effort)
      const weekNum = weekOf(workStart)
      const postWeek = weekOf(r.postingDay)
      return {
        ...r,
        assignee: user,
        skillScore: score,
        skillReason: reason,
        workStartDay: workStart,
        weekLabel: weekNum !== postWeek ? `Week ${weekNum} → Week ${postWeek}` : `Week ${postWeek}`,
        overrides: true,
      }
    }))
  }

  // Override posting day in preview
  function overridePostDay(rowIdx: number, day: number) {
    setSchedRows(rows => rows.map((r, i) => {
      if (i !== rowIdx) return r
      const workStart = calcWorkStart(day, r.item.effort)
      const weekNum = weekOf(workStart)
      const postWeek = weekOf(day)
      return {
        ...r,
        postingDay: day,
        deadlineDay: Math.max(workStart, day - 2),
        workStartDay: workStart,
        weekLabel: weekNum !== postWeek ? `Week ${weekNum} → Week ${postWeek}` : `Week ${postWeek}`,
        overrides: true,
      }
    }))
  }

  async function confirmSchedule() {
    setSchedSaving(true)
    for (const row of schedRows) {
      await upsertPlanItem({
        ...row.item,
        assignee_id: row.assignee.id,
        day: row.postingDay,
        status: 'planned',
      })
    }
    setSchedSaving(false)
    setSchedOpen(false)
    toast(`Scheduled ${schedRows.length} deliverable${schedRows.length !== 1 ? 's' : ''} — team is notified`)
  }

  // ── Add / Edit ─────────────────────────────────────────────────────────────
  function openAdd(clientId: string, cat: ContentCat) {
    setModal({ open: true, item: { client_id: clientId, cat, type: TYPE_MAP[cat][0], title: '', brief: BRIEF_BANK[cat], effort: 3, day: null, status: 'planned', refs: [] }, clientId, cat })
  }
  function openEdit(item: PlanItem) {
    setModal({ open: true, item: { ...item }, clientId: item.client_id, cat: item.cat })
  }
  function closeModal() { setModal(m => ({ ...m, open: false, item: null })) }

  async function saveItem() {
    if (!modal.item?.title?.trim()) return
    const item: PlanItem = {
      id: modal.item!.id || crypto.randomUUID(),
      month: monthKey,
      client_id: modal.clientId,
      cat: modal.cat,
      type: modal.item!.type || TYPE_MAP[modal.cat][0],
      title: modal.item!.title || '',
      brief: modal.item!.brief || '',
      refs: modal.item!.refs || [],
      assignee_id: modal.item!.assignee_id || '',
      effort: (modal.item!.effort || 3) as 1|2|3|4|5,
      day: modal.item!.day || null,
      status: modal.item!.status || 'planned',
      created_at: modal.item!.created_at || new Date().toISOString(),
    }
    await upsertPlanItem(item)
    toast(modal.item!.id ? 'Deliverable updated' : 'Deliverable added')
    closeModal()
  }

  function deleteItem(id: string) { deletePlanItem(id); toast('Deleted') }

  async function aiQuickSuggest() {
    if (!modal.item) return
    setAiLoading(true)
    try {
      const ideas = IDEA_BANK[modal.cat]?.[modal.item!.type || ''] || []
      const idea = ideas[ideaIdx % Math.max(ideas.length, 1)] || 'Creative content idea for your brand'
      setIdeaIdx(i => i + 1)
      const clientName = state.clients.find(c => c.id === modal.clientId)?.name || 'Client'
      setModal(m => ({ ...m, item: { ...m.item!, title: idea.replace('{brand}', clientName), brief: BRIEF_BANK[modal.cat] } }))
    } finally { setAiLoading(false) }
  }

  async function aiDeepSuggest() {
    if (!modal.item) return
    setAiLoading(true)
    try {
      const res = await fetch('/api/ai/suggest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client: state.clients.find(c => c.id === modal.clientId)?.name, cat: modal.cat, type: modal.item!.type, existing: items.filter(it => it.client_id === modal.clientId).map(it => it.title) }) })
      const { title, brief } = await res.json()
      setModal(m => ({ ...m, item: { ...m.item!, title: title || m.item!.title, brief: brief || m.item!.brief } }))
    } catch { toast('AI suggestion unavailable') } finally { setAiLoading(false) }
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', animation: 'fadeIn .4s ease both' }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, color: 'var(--c-faint)', marginBottom: 4 }}>Content Planner · plan, then push to the team</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em' }}>Plan the month</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 2, background: '#fff', border: '1px solid var(--c-border)', borderRadius: 10, padding: '5px 8px' }}>
              <button onClick={() => setMonthOff(o => o - 1)} style={{ width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, color: 'var(--c-subtle)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              <span style={{ fontSize: 14, fontWeight: 600, minWidth: 92, textAlign: 'center' }}>{monthLabel}</span>
              <button onClick={() => setMonthOff(o => o + 1)} style={{ width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, color: 'var(--c-subtle)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            </div>
            <button onClick={() => openScheduler('all')} disabled={unassigned === 0}
              style={{ display: 'flex', alignItems: 'center', gap: 8, background: unassigned > 0 ? '#FF5C1F' : '#10B981', color: '#fff', borderRadius: 10, padding: '10px 18px', fontWeight: 700, fontSize: 13.5, transition: 'transform .15s, background .2s', opacity: unassigned === 0 ? 0.85 : 1 }}
              onMouseEnter={e => { if (unassigned > 0) (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)' }}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = ''}>
              {unassigned === 0
                ? <><Check size={14} color="#fff" />All scheduled</>
                : <><Sparkle size={14} color="#fff" />Smart schedule · {unassigned}</>
              }
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 22 }}>
        {[
          { label: 'Clients planned', value: `${new Set(items.map(i => i.client_id)).size} / ${state.clients.length}`, color: 'var(--c-ink)' },
          { label: 'Deliverables', value: items.length, color: '#7C3AED' },
          { label: 'Effort points', value: totalEffort, color: '#FF5C1F' },
          { label: assigned > 0 ? 'Scheduled' : 'To schedule', value: assigned > 0 ? `${assigned} / ${items.length}` : unassigned, color: unassigned > 0 ? '#FF5C1F' : '#16A34A' },
        ].map((s, i) => (
          <div key={i} style={{ background: '#fff', border: '1px solid var(--c-border)', borderRadius: 14, padding: '16px 18px' }}>
            <div style={{ fontSize: 12.5, color: 'var(--c-faint)', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color: s.color }}>
              {typeof s.value === 'string' ? (
                <>{s.value.split('/')[0]}<span style={{ fontSize: 18, color: 'var(--c-ghost)', fontWeight: 500 }}>/ {s.value.split('/')[1]}</span></>
              ) : s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Two-panel */}
      <div style={{ display: 'grid', gridTemplateColumns: '256px 1fr', gap: 16, alignItems: 'start' }}>

        {/* Left: client list */}
        <div style={{ background: '#fff', border: '1px solid var(--c-border)', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--c-ghost)', textTransform: 'uppercase', letterSpacing: '.08em', padding: '14px 16px 10px' }}>Clients</div>
          {state.clients.map(client => {
            const cItems = items.filter(it => it.client_id === client.id)
            const badge = clientBadge(cItems)
            const isActive = client.id === activeClientId
            return (
              <button key={client.id} onClick={() => setSelectedClientId(client.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '11px 14px', background: isActive ? 'rgba(255,92,31,.04)' : 'transparent', borderLeft: `3px solid ${isActive ? 'var(--c-accent)' : 'transparent'}`, borderBottom: '1px solid var(--c-border-soft)', transition: 'background .15s', textAlign: 'left' }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: client.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 11, flexShrink: 0 }}>{client.initials}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: isActive ? 'var(--c-ink)' : 'var(--c-ink-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{client.name}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--c-faint)', marginTop: 1 }}>{cItems.length > 0 ? `${cItems.length} items · ${cItems.reduce((s,i) => s+i.effort,0)} pts` : 'No work yet'}</div>
                </div>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: badge.c, background: badge.bg, borderRadius: 6, padding: '3px 7px', whiteSpace: 'nowrap', flexShrink: 0 }}>{badge.label}</span>
              </button>
            )
          })}
        </div>

        {/* Right: active client content */}
        {activeClient ? (
          <div>
            {/* Client header */}
            <div style={{ background: '#fff', border: '1px solid var(--c-border)', borderRadius: 16, padding: '18px 22px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: activeClient.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, flexShrink: 0 }}>{activeClient.initials}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, marginBottom: 6 }}>{activeClient.name}</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {activeCats.map(cat => (
                    <span key={cat.key} style={{ fontSize: 12, fontWeight: 600, color: cat.color, background: cat.bg, borderRadius: 7, padding: '3px 9px' }}>{cat.label}</span>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                {activeItems.filter(i => !i.assignee_id || !i.day).length > 0 && (
                  <button onClick={() => openScheduler('client')}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,92,31,.1)', color: 'var(--c-accent)', borderRadius: 9, padding: '8px 14px', fontWeight: 700, fontSize: 13, border: '1.5px solid rgba(255,92,31,.2)', transition: 'all .15s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,92,31,.15)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,92,31,.1)' }}>
                    <Sparkle size={13} color="#FF5C1F" />Schedule this client
                  </button>
                )}
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700 }}>{activeItems.reduce((s,i) => s+i.effort, 0)}</div>
                  <div style={{ fontSize: 12, color: 'var(--c-faint)' }}>effort pts</div>
                </div>
              </div>
            </div>

            {/* AI Copilot banner */}
            <div style={{ background: '#0F172A', borderRadius: 14, padding: '13px 18px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
              <Sparkle size={16} color="#FF5C1F" style={{ flexShrink: 0 }} />
              <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.8)', lineHeight: 1.5 }}>
                Copilot can <strong style={{ color: '#fff' }}>draft briefs & auto-schedule the full month</strong> — it matches tasks to the right person, schedules work in the week before posting, and leaves approval time.
              </div>
            </div>

            {/* Content sections */}
            {activeCats.map(cat => {
              const catItems = activeItems.filter(it => it.cat === cat.key)
              return (
                <div key={cat.key} style={{ background: '#fff', border: '1px solid var(--c-border)', borderRadius: 16, marginBottom: 14, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: catItems.length > 0 ? '1px solid var(--c-border-soft)' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: cat.color }}>{cat.label}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-ghost)', background: 'var(--c-fill)', borderRadius: 20, padding: '1px 8px' }}>{catItems.length}</span>
                    </div>
                    <button onClick={() => openAdd(activeClient.id, cat.key as ContentCat)}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 700, color: '#fff', background: 'var(--c-ink)', padding: '7px 13px', borderRadius: 8 }}>
                      <Plus size={12} />Add
                    </button>
                  </div>
                  <div style={{ padding: catItems.length > 0 ? '12px 14px 14px' : '14px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {catItems.length === 0 ? (
                      <div style={{ fontSize: 13.5, color: 'var(--c-ghost)', fontStyle: 'italic' }}>No deliverables yet</div>
                    ) : catItems.map(item => {
                      const st = STATUS_PIPE.find(s => s.key === item.status)!
                      const assignee = state.users.find(u => u.id === item.assignee_id)
                      const effortColor = item.effort >= 4 ? '#FF5C1F' : item.effort >= 3 ? '#F4B740' : '#0EA5A4'
                      const isScheduled = !!(item.assignee_id && item.day)

                      return (
                        <div key={item.id} style={{ borderRadius: 12, border: `1px solid ${isScheduled ? 'var(--c-border-soft)' : 'rgba(255,92,31,.15)'}`, borderLeft: `3px solid ${cat.color}`, padding: '14px 14px 12px', background: isScheduled ? '#fff' : 'rgba(255,92,31,.02)', transition: 'box-shadow .15s' }}
                          onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,.07)'}
                          onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
                          {/* Badges */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 9 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: '#1E293B', borderRadius: 6, padding: '3px 8px' }}>{item.type}</span>
                            {item.day && (
                              <span style={{ fontSize: 11.5, color: 'var(--c-faint)', display: 'flex', alignItems: 'center', gap: 3 }}>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                                Posts {formatDay(item.day, monthKey)}
                              </span>
                            )}
                            <span style={{ fontSize: 11, fontWeight: 700, color: st.c, background: st.bg, borderRadius: 6, padding: '3px 8px' }}>{st.label}</span>
                            <div style={{ flex: 1 }} />
                            {assignee && (
                              <div title={`${assignee.name} · ${assignee.title}`} style={{ width: 26, height: 26, borderRadius: '50%', background: assignee.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, flexShrink: 0 }}>{assignee.initials}</div>
                            )}
                            <button onClick={() => openEdit(item)} style={{ width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 7, color: 'var(--c-ghost)' }}
                              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--c-fill)'; (e.currentTarget as HTMLElement).style.color = 'var(--c-subtle)' }}
                              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--c-ghost)' }}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>
                            </button>
                            <button onClick={() => deleteItem(item.id)} style={{ width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 7, color: 'var(--c-ghost)' }}
                              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--c-red-bg)'; (e.currentTarget as HTMLElement).style.color = 'var(--c-red)' }}
                              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--c-ghost)' }}>
                              <X size={12} />
                            </button>
                          </div>
                          <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.3, marginBottom: item.brief ? 6 : 0 }}>{item.title}</div>
                          {item.brief && (
                            <div style={{ fontSize: 13, color: 'var(--c-subtle)', lineHeight: 1.55, marginBottom: 10, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as React.CSSProperties}>{item.brief}</div>
                          )}
                          {item.refs && item.refs.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
                              {item.refs.map((r, i) => (
                                <span key={i} style={{ fontSize: 12, color: 'var(--c-subtle)', background: 'var(--c-fill)', borderRadius: 7, padding: '3px 9px' }}>{r.label}</span>
                              ))}
                            </div>
                          )}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', gap: 3 }}>
                              {[1,2,3,4,5].map(n => (
                                <div key={n} style={{ width: 11, height: 11, borderRadius: 3, background: n <= item.effort ? effortColor : '#E5E7EB' }} />
                              ))}
                            </div>
                            {!isScheduled && (
                              <button onClick={() => openScheduler('client')}
                                style={{ fontSize: 12, fontWeight: 700, color: '#fff', background: 'var(--c-accent)', borderRadius: 7, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Sparkle size={10} color="#fff" />Smart assign
                              </button>
                            )}
                            {isScheduled && assignee && (
                              <span style={{ fontSize: 12, color: 'var(--c-green)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Check size={11} color="#10B981" />{assignee.name.split(' ')[0]} · starts day {calcWorkStart(item.day!, item.effort)}
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div style={{ background: '#fff', border: '1px solid var(--c-border)', borderRadius: 16, padding: 40, textAlign: 'center', color: 'var(--c-faint)' }}>Select a client to view and plan deliverables</div>
        )}
      </div>

      {/* ── Add / Edit Modal ─────────────────────────────────────────────────── */}
      {modal.open && modal.item && (
        <div onClick={closeModal} className="modal-overlay">
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 540, background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--shadow-modal)', animation: 'popIn .22s cubic-bezier(.2,.9,.3,1) both' }}>
            <div style={{ padding: '20px 22px', borderBottom: '1px solid var(--c-border-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>{modal.item!.id ? 'Edit Deliverable' : 'Add Deliverable'}</div>
                <div style={{ fontSize: 12.5, color: 'var(--c-faint)', marginTop: 2 }}>{state.clients.find(c => c.id === modal.clientId)?.name} · {SERVICE_CATS.find(c => c.key === modal.cat)?.label}</div>
              </div>
              <button onClick={closeModal} style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 9, color: 'var(--c-ghost)' }}><X size={15} /></button>
            </div>
            <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 14, maxHeight: '70vh', overflowY: 'auto' }}>
              {/* AI bar */}
              <div style={{ display: 'flex', gap: 8, padding: '10px 12px', background: 'rgba(255,92,31,.05)', borderRadius: 10, border: '1px solid rgba(255,92,31,.15)' }}>
                <Sparkle size={14} color="#FF5C1F" style={{ marginTop: 1, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--c-ink)', marginBottom: 6 }}>AI Copilot</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={aiQuickSuggest} disabled={aiLoading} style={{ fontSize: 12, fontWeight: 600, color: '#FF5C1F', background: '#fff', border: '1px solid rgba(255,92,31,.25)', borderRadius: 7, padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 5 }}>
                      {aiLoading ? <Spinner size={11} color="#FF5C1F" /> : <Sparkle size={11} color="#FF5C1F" />}Quick idea
                    </button>
                    <button onClick={aiDeepSuggest} disabled={aiLoading} style={{ fontSize: 12, fontWeight: 600, color: '#FF5C1F', background: '#fff', border: '1px solid rgba(255,92,31,.25)', borderRadius: 7, padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Sparkle size={11} color="#FF5C1F" />Deep suggest
                    </button>
                  </div>
                </div>
              </div>
              {/* Type */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 5 }}>Type</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {TYPE_MAP[modal.cat].map(t => (
                    <button key={t} onClick={() => setModal(m => ({ ...m, item: { ...m.item!, type: t } }))}
                      style={{ fontSize: 12.5, fontWeight: 600, padding: '5px 11px', borderRadius: 8, border: '1.5px solid', borderColor: modal.item!.type === t ? 'var(--c-accent)' : 'var(--c-border)', color: modal.item!.type === t ? 'var(--c-accent)' : 'var(--c-muted)', background: modal.item!.type === t ? 'rgba(255,92,31,.06)' : '#fff' }}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Assign to */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 7 }}>Assign to</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {/* Unassigned option */}
                  <button
                    onClick={() => setModal(m => ({ ...m, item: { ...m.item!, assignee_id: '' } }))}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 20, border: `1.5px solid ${!modal.item!.assignee_id ? 'var(--c-accent)' : 'var(--c-border)'}`, background: !modal.item!.assignee_id ? 'rgba(255,92,31,.06)' : '#fff', cursor: 'pointer', transition: 'all .12s' }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--c-fill)', border: '1.5px dashed var(--c-rule)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--c-ghost)" strokeWidth="2.5" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    </div>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: !modal.item!.assignee_id ? 'var(--c-accent)' : 'var(--c-muted)' }}>Unassigned</span>
                  </button>
                  {state.users.map(u => {
                    const isSelected = modal.item!.assignee_id === u.id
                    return (
                      <button key={u.id}
                        onClick={() => setModal(m => ({ ...m, item: { ...m.item!, assignee_id: u.id } }))}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 20, border: `1.5px solid ${isSelected ? 'var(--c-accent)' : 'var(--c-border)'}`, background: isSelected ? 'rgba(255,92,31,.06)' : '#fff', cursor: 'pointer', transition: 'all .12s' }}
                        onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'var(--c-fill)' }}
                        onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = '#fff' }}>
                        <div style={{ width: 22, height: 22, borderRadius: '50%', background: u.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, flexShrink: 0 }}>{u.initials}</div>
                        <span style={{ fontSize: 12.5, fontWeight: isSelected ? 700 : 500, color: isSelected ? 'var(--c-accent)' : 'var(--c-ink)', whiteSpace: 'nowrap' }}>{u.name.split(' ')[0]}</span>
                        {u.title && <span style={{ fontSize: 11, color: 'var(--c-faint)', whiteSpace: 'nowrap' }}>· {u.title}</span>}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Title */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 5 }}>Title</label>
                <input value={modal.item!.title || ''} onChange={e => setModal(m => ({ ...m, item: { ...m.item!, title: e.target.value } }))} placeholder="e.g. Glow ritual — 3-step routine"
                  style={{ width: '100%', border: '1.5px solid var(--c-border)', borderRadius: 10, padding: '10px 12px', fontSize: 14 }}
                  onFocus={e => e.target.style.borderColor = 'var(--c-ink)'} onBlur={e => e.target.style.borderColor = 'var(--c-border)'} />
              </div>

              {/* Brief */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 5 }}>Brief</label>
                <textarea value={modal.item!.brief || ''} onChange={e => setModal(m => ({ ...m, item: { ...m.item!, brief: e.target.value } }))}
                  rows={3} placeholder="Describe the content direction, references, key elements..."
                  style={{ width: '100%', border: '1.5px solid var(--c-border)', borderRadius: 10, padding: '10px 12px', fontSize: 13.5, resize: 'vertical' }}
                  onFocus={e => e.target.style.borderColor = 'var(--c-ink)'} onBlur={e => e.target.style.borderColor = 'var(--c-border)'} />
              </div>

              {/* Inspiration links */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 7 }}>Inspiration links</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    value={refInput}
                    onChange={e => setRefInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && refInput.trim()) {
                        e.preventDefault()
                        setModal(m => ({ ...m, item: { ...m.item!, refs: [...(m.item!.refs || []), { label: refInput.trim() }] } }))
                        setRefInput('')
                      }
                    }}
                    placeholder="Paste a link or note (e.g. Glossier routine reel)"
                    style={{ flex: 1, border: '1.5px solid var(--c-border)', borderRadius: 10, padding: '9px 12px', fontSize: 13.5, outline: 'none' }}
                    onFocus={e => e.target.style.borderColor = 'var(--c-ink)'}
                    onBlur={e => e.target.style.borderColor = 'var(--c-border)'}
                  />
                  <button
                    onClick={() => {
                      if (!refInput.trim()) return
                      setModal(m => ({ ...m, item: { ...m.item!, refs: [...(m.item!.refs || []), { label: refInput.trim() }] } }))
                      setRefInput('')
                    }}
                    style={{ padding: '9px 16px', borderRadius: 10, background: 'var(--c-ink)', color: '#fff', fontSize: 13.5, fontWeight: 700, flexShrink: 0 }}>
                    Add
                  </button>
                </div>
                {(modal.item!.refs || []).length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                    {(modal.item!.refs || []).map((r, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--c-fill)', border: '1px solid var(--c-border)', borderRadius: 20, padding: '4px 10px 4px 8px', fontSize: 12.5 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--c-accent)" strokeWidth="2" strokeLinecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                        <span style={{ color: 'var(--c-ink-2)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.label}</span>
                        <button onClick={() => setModal(m => ({ ...m, item: { ...m.item!, refs: (m.item!.refs || []).filter((_, j) => j !== i) } }))}
                          style={{ color: 'var(--c-ghost)', display: 'flex', alignItems: 'center', lineHeight: 1, marginLeft: 2 }}>
                          <X size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 5 }}>Effort</label>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[1,2,3,4,5].map(n => (
                      <button key={n} onClick={() => setModal(m => ({ ...m, item: { ...m.item!, effort: n as any } }))}
                        style={{ flex: 1, padding: '6px 0', borderRadius: 7, fontSize: 11, fontWeight: 600, border: '1.5px solid', borderColor: modal.item!.effort === n ? 'var(--c-accent)' : 'var(--c-border)', color: modal.item!.effort === n ? 'var(--c-accent)' : 'var(--c-muted)', background: modal.item!.effort === n ? 'rgba(255,92,31,.06)' : '#fff' }}>
                        {n}
                      </button>
                    ))}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--c-faint)', marginTop: 4, textAlign: 'center' }}>{EFFORT_LABELS[modal.item!.effort || 3]}</div>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 5 }}>Post day (optional)</label>
                  <input type="number" min={1} max={31} value={modal.item!.day || ''} onChange={e => setModal(m => ({ ...m, item: { ...m.item!, day: e.target.value ? Number(e.target.value) : null } }))}
                    placeholder="e.g. 14" style={{ width: '100%', border: '1.5px solid var(--c-border)', borderRadius: 10, padding: '10px 12px', fontSize: 14 }} />
                  {modal.item!.day && modal.item!.effort && (
                    <div style={{ fontSize: 11, color: 'var(--c-accent)', marginTop: 4 }}>
                      Work starts day {calcWorkStart(modal.item!.day!, modal.item!.effort! as number)}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 5 }}>Status</label>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {STATUS_PIPE.map(s => (
                    <button key={s.key} onClick={() => setModal(m => ({ ...m, item: { ...m.item!, status: s.key as ContentStatus } }))}
                      style={{ fontSize: 12.5, fontWeight: 600, padding: '5px 11px', borderRadius: 8, border: '1.5px solid', borderColor: modal.item!.status === s.key ? s.c : 'var(--c-border)', color: modal.item!.status === s.key ? s.c : 'var(--c-muted)', background: modal.item!.status === s.key ? s.bg : '#fff' }}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ padding: '14px 22px', borderTop: '1px solid var(--c-border-soft)', display: 'flex', gap: 10 }}>
              <button onClick={closeModal} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1.5px solid var(--c-border)', fontSize: 14, fontWeight: 600, color: 'var(--c-subtle)' }}>Cancel</button>
              <button onClick={saveItem} style={{ flex: 2, padding: '10px', borderRadius: 10, background: 'var(--c-ink)', color: '#fff', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                <Check size={14} color="#fff" />{modal.item!.id ? 'Update' : 'Add deliverable'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Smart Schedule Modal ─────────────────────────────────────────────── */}
      {schedOpen && (
        <div onClick={() => !schedSaving && setSchedOpen(false)} className="modal-overlay">
          <div onClick={e => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 740, background: '#fff', borderRadius: 22, overflow: 'hidden', boxShadow: 'var(--shadow-modal)', animation: 'popIn .25s cubic-bezier(.2,.9,.3,1) both', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>

            {/* Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--c-border-soft)', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 11, background: 'var(--c-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Sparkle size={18} color="#FF5C1F" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, marginBottom: 3 }}>Smart Schedule</div>
                <div style={{ fontSize: 13, color: 'var(--c-faint)' }}>
                  {schedRows.length} deliverable{schedRows.length !== 1 ? 's' : ''} · {schedScope === 'client' ? activeClient?.name : 'All clients'} · {monthLabel}
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--c-faint)', background: 'var(--c-fill)', borderRadius: 8, padding: '5px 10px', textAlign: 'right', lineHeight: 1.4 }}>
                <div style={{ fontWeight: 700, color: 'var(--c-ink)', fontSize: 13 }}>How it works</div>
                <div>Week N posts → Week N−1 work</div>
                <div>Effort × days · approval buffer</div>
              </div>
              {!schedSaving && <button onClick={() => setSchedOpen(false)} style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--c-fill)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><X size={14} color="var(--c-muted)" /></button>}
            </div>

            {/* Legend */}
            <div style={{ padding: '10px 24px', background: 'var(--c-fill-soft)', borderBottom: '1px solid var(--c-border-soft)', display: 'flex', gap: 16 }}>
              {[
                { dot: '#10B981', label: 'Ideal match — in specialty' },
                { dot: '#F59E0B', label: 'Good match — partial' },
                { dot: '#EF4444', label: 'Out of specialty — consider reassigning' },
              ].map(l => (
                <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: 'var(--c-subtle)' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: l.dot }} />{l.label}
                </div>
              ))}
            </div>

            {/* Rows */}
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {schedRows.map((row, idx) => {
                const sb = scoreBar(row.skillScore)
                const client = state.clients.find(c => c.id === row.item.client_id)
                return (
                  <div key={row.item.id}
                    style={{ padding: '14px 24px', borderBottom: idx < schedRows.length - 1 ? '1px solid var(--c-border-soft)' : 'none', animation: `fadeUp .3s ease ${idx * 0.03}s both` }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px 200px', gap: 16, alignItems: 'center' }}>

                      {/* Item info */}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                          {client && (
                            <div style={{ width: 20, height: 20, borderRadius: 6, background: client.color, color: '#fff', fontSize: 8, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{client.initials}</div>
                          )}
                          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-ghost)', background: 'var(--c-fill)', borderRadius: 5, padding: '2px 7px' }}>{row.item.type}</span>
                          <div style={{ width: 7, height: 7, borderRadius: '50%', background: sb.color }} title={row.skillReason} />
                          <span style={{ fontSize: 11, fontWeight: 600, color: sb.color, background: sb.bg, borderRadius: 5, padding: '2px 7px' }}>{sb.label}</span>
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.3, marginBottom: 3 }}>{row.item.title}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          {[1,2,3,4,5].map(n => (
                            <div key={n} style={{ width: 8, height: 8, borderRadius: 2, background: n <= row.item.effort ? (row.item.effort >= 4 ? '#FF5C1F' : '#F4B740') : '#E5E7EB' }} />
                          ))}
                          <span style={{ fontSize: 11.5, color: 'var(--c-faint)', marginLeft: 3 }}>{EFFORT_LABELS[row.item.effort]}</span>
                        </div>
                      </div>

                      {/* Timeline */}
                      <div style={{ background: 'var(--c-fill)', borderRadius: 10, padding: '10px 12px' }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--c-ghost)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Timeline · {row.weekLabel}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                          <div style={{ flex: 1, textAlign: 'center' }}>
                            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--c-ink)', fontFamily: 'var(--font-display)' }}>{row.workStartDay}</div>
                            <div style={{ fontSize: 10, color: 'var(--c-faint)' }}>Start</div>
                          </div>
                          <svg width="28" height="12" viewBox="0 0 28 12"><path d="M2 6h20M18 2l6 4-6 4" stroke="var(--c-rule)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
                          <div style={{ flex: 1, textAlign: 'center' }}>
                            <div style={{ fontSize: 17, fontWeight: 700, color: '#F59E0B', fontFamily: 'var(--font-display)' }}>{row.deadlineDay}</div>
                            <div style={{ fontSize: 10, color: 'var(--c-faint)' }}>Done by</div>
                          </div>
                          <svg width="28" height="12" viewBox="0 0 28 12"><path d="M2 6h20M18 2l6 4-6 4" stroke="var(--c-rule)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
                          <div style={{ flex: 1, textAlign: 'center' }}>
                            <div style={{ fontSize: 17, fontWeight: 700, color: '#10B981', fontFamily: 'var(--font-display)' }}>{row.postingDay}</div>
                            <div style={{ fontSize: 10, color: 'var(--c-faint)' }}>Post</div>
                          </div>
                        </div>
                        {/* Allow overriding post day */}
                        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ fontSize: 10.5, color: 'var(--c-faint)' }}>Post day:</span>
                          <input type="number" min={1} max={31} value={row.postingDay}
                            onChange={e => overridePostDay(idx, Number(e.target.value))}
                            style={{ width: 48, border: '1px solid var(--c-border)', borderRadius: 6, padding: '2px 6px', fontSize: 12, textAlign: 'center' }} />
                        </div>
                      </div>

                      {/* Assignee picker */}
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--c-ghost)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Assigned to</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {state.users.map(u => {
                            const { score } = skillScore(row.item.type, u.title || '')
                            const isSelected = u.id === row.assignee.id
                            const matchColor = score >= 0.9 ? '#10B981' : score >= 0.65 ? '#F59E0B' : '#EF4444'
                            return (
                              <button key={u.id} onClick={() => overrideAssignee(idx, u)}
                                style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 8px', borderRadius: 8, border: `1.5px solid ${isSelected ? 'var(--c-accent)' : 'var(--c-border)'}`, background: isSelected ? 'rgba(255,92,31,.05)' : '#fff', transition: 'all .12s', cursor: 'pointer' }}>
                                <div style={{ width: 24, height: 24, borderRadius: '50%', background: u.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, flexShrink: 0 }}>{u.initials}</div>
                                <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
                                  <div style={{ fontSize: 12.5, fontWeight: isSelected ? 700 : 500, color: isSelected ? 'var(--c-accent)' : 'var(--c-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name.split(' ')[0]}</div>
                                  <div style={{ fontSize: 10.5, color: 'var(--c-faint)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.title || u.role}</div>
                                </div>
                                <div style={{ width: 7, height: 7, borderRadius: '50%', background: matchColor, flexShrink: 0 }} title={`Skill score: ${Math.round(score * 100)}%`} />
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Footer */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--c-border-soft)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12.5, color: 'var(--c-faint)' }}>
                  {schedRows.filter(r => r.skillScore >= 0.9).length} ideal · {schedRows.filter(r => r.skillScore >= 0.65 && r.skillScore < 0.9).length} good · {schedRows.filter(r => r.skillScore < 0.65).length} out of specialty
                </div>
              </div>
              <button onClick={() => setSchedOpen(false)} disabled={schedSaving}
                style={{ padding: '11px 20px', borderRadius: 11, border: '1.5px solid var(--c-border)', fontSize: 14, fontWeight: 600, color: 'var(--c-subtle)', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={confirmSchedule} disabled={schedSaving}
                style={{ padding: '11px 24px', borderRadius: 11, background: schedSaving ? '#6B7280' : 'var(--c-ink)', color: '#fff', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', transition: 'transform .15s' }}
                onMouseEnter={e => { if (!schedSaving) (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)' }}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = ''}>
                {schedSaving ? <Spinner size={14} color="#fff" /> : <Check size={14} color="#fff" />}
                {schedSaving ? 'Scheduling…' : `Confirm & push ${schedRows.length} items`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
