'use client'
import { useState } from 'react'
import { useApp, useToast } from '@/lib/store'
import { Plus, X, Sparkle, Spinner, Check } from '@/components/ui/Icon'
import { SERVICE_CATS, TYPE_MAP, EFFORT_LABELS, IDEA_BANK, BRIEF_BANK, STATUS_PIPE } from '@/lib/seed-data'
import type { PlanItem, ContentCat, ContentStatus } from '@/types'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const WEEKDAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

function getMonthKey(offset = 0) {
  const d = new Date()
  d.setMonth(d.getMonth() + offset)
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
  return `${WEEKDAYS[d.getDay()]} ${MONTHS[m - 1]} ${day}`
}

function clientBadge(items: PlanItem[]) {
  if (items.length === 0) return { label: 'To plan', c: '#6B7280', bg: 'var(--c-fill)' }
  const allAssigned = items.every(i => i.assignee_id)
  if (allAssigned) return { label: 'Scheduled', c: '#16A34A', bg: '#F0FDF4' }
  return { label: 'To push', c: '#FF5C1F', bg: '#FFF1EA' }
}

interface ModalState {
  open: boolean
  item: Partial<PlanItem> | null
  clientId: string
  cat: ContentCat
}

export default function ContentPlanner() {
  const { state, dispatch } = useApp()
  const toast = useToast()
  const [monthOff, setMonthOff] = useState(0)
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [modal, setModal] = useState<ModalState>({ open: false, item: null, clientId: '', cat: 'social' })
  const [pushItem, setPushItem] = useState<PlanItem | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [ideaIdx, setIdeaIdx] = useState(0)

  const monthKey = getMonthKey(monthOff)
  const { label: monthLabel } = parseMonthKey(monthKey)
  const items = state.planItems.filter(it => it.month === monthKey)

  const activeClientId = selectedClientId || state.clients[0]?.id || null
  const activeClient = state.clients.find(c => c.id === activeClientId)

  const totalEffort = items.reduce((s, i) => s + i.effort, 0)
  const unassigned = items.filter(i => !i.assignee_id).length
  const assigned = items.filter(i => i.assignee_id).length
  const clientsWithItems = new Set(items.map(i => i.client_id)).size

  const activeItems = items.filter(it => it.client_id === activeClientId)
  const activeEffort = activeItems.reduce((s, i) => s + i.effort, 0)
  const activeCats = activeClient ? SERVICE_CATS.filter(c => activeClient.services.includes(c.key)) : []

  function openAdd(clientId: string, cat: ContentCat) {
    setModal({ open: true, item: { client_id: clientId, cat, type: TYPE_MAP[cat][0], title: '', brief: BRIEF_BANK[cat], effort: 3, day: null, status: 'planned', refs: [] }, clientId, cat })
  }

  function openEdit(item: PlanItem) {
    setModal({ open: true, item: { ...item }, clientId: item.client_id, cat: item.cat })
  }

  function closeModal() { setModal(m => ({ ...m, open: false, item: null })) }

  function saveItem() {
    if (!modal.item?.title?.trim()) return
    const item: PlanItem = {
      id: modal.item!.id || `item-${Date.now()}`,
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
    dispatch({ type: 'UPSERT_PLAN_ITEM', item })
    toast(modal.item!.id ? 'Deliverable updated' : 'Deliverable added')
    closeModal()
  }

  function deleteItem(id: string) { dispatch({ type: 'DELETE_PLAN_ITEM', id }); toast('Deleted') }

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

  function assignItem(assignee_id: string) {
    if (!pushItem) return
    dispatch({ type: 'UPSERT_PLAN_ITEM', item: { ...pushItem, assignee_id, status: 'planned' as ContentStatus } })
    setPushItem(null)
    toast(`Assigned to ${state.users.find(u => u.id === assignee_id)?.name || 'teammate'}`)
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
            <button
              style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#FF5C1F', color: '#fff', borderRadius: 10, padding: '10px 18px', fontWeight: 700, fontSize: 13.5, transition: 'transform .15s', opacity: unassigned === 0 ? 0.5 : 1 }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = ''}
              onClick={() => { const first = items.find(i => !i.assignee_id); if (first) setPushItem(first) }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/></svg>
              Push & assign · {unassigned}
            </button>
          </div>
        </div>
      </div>

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 22 }}>
        {[
          { label: 'Clients planned', value: `${clientsWithItems} / ${state.clients.length}`, valueStyle: { fontSize: 26, fontWeight: 700, fontFamily: 'var(--font-display)' } },
          { label: 'Deliverables', value: items.length, color: '#7C3AED' },
          { label: 'Effort points', value: totalEffort, color: '#FF5C1F' },
          { label: 'To assign', value: unassigned, color: unassigned > 0 ? '#FF5C1F' : '#16A34A', sub: assigned > 0 ? `${assigned} already scheduled` : undefined },
        ].map((s, i) => (
          <div key={i} style={{ background: '#fff', border: '1px solid var(--c-border)', borderRadius: 14, padding: '16px 18px' }}>
            <div style={{ fontSize: 12.5, color: 'var(--c-faint)', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color: (s as any).color || 'var(--c-ink)' }}>
              {typeof s.value === 'string' ? (
                <>
                  <span>{s.value.split('/')[0]}</span>
                  <span style={{ fontSize: 18, color: 'var(--c-ghost)', fontWeight: 500 }}>/ {s.value.split('/')[1]}</span>
                </>
              ) : s.value}
            </div>
            {(s as any).sub && <div style={{ fontSize: 11.5, color: 'var(--c-faint)', marginTop: 2 }}>{(s as any).sub}</div>}
          </div>
        ))}
      </div>

      {/* Two-panel layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '256px 1fr', gap: 16, alignItems: 'start' }}>

        {/* Left: client list */}
        <div style={{ background: '#fff', border: '1px solid var(--c-border)', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--c-ghost)', textTransform: 'uppercase', letterSpacing: '.08em', padding: '14px 16px 10px' }}>Clients</div>
          {state.clients.map(client => {
            const cItems = items.filter(it => it.client_id === client.id)
            const pts = cItems.reduce((s, i) => s + i.effort, 0)
            const badge = clientBadge(cItems)
            const isActive = client.id === activeClientId
            return (
              <button key={client.id} onClick={() => setSelectedClientId(client.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '11px 14px', background: isActive ? 'rgba(255,92,31,.04)' : 'transparent', borderLeft: `3px solid ${isActive ? 'var(--c-accent)' : 'transparent'}`, borderBottom: '1px solid var(--c-border-soft)', transition: 'background .15s', textAlign: 'left' }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: client.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 11, flexShrink: 0 }}>{client.initials}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: isActive ? 'var(--c-ink)' : 'var(--c-ink-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{client.name}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--c-faint)', marginTop: 1 }}>{cItems.length > 0 ? `${cItems.length} items · ${pts} pts` : 'No work yet'}</div>
                </div>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: badge.c, background: badge.bg, borderRadius: 6, padding: '3px 7px', whiteSpace: 'nowrap', flexShrink: 0 }}>{badge.label}</span>
              </button>
            )
          })}
        </div>

        {/* Right: content detail */}
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
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700 }}>{activeEffort}</div>
                <div style={{ fontSize: 12, color: 'var(--c-faint)' }}>effort pts</div>
              </div>
            </div>

            {/* AI Copilot banner */}
            <div style={{ background: '#0F172A', borderRadius: 14, padding: '13px 18px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
              <Sparkle size={16} color="#FF5C1F" style={{ flexShrink: 0 }} />
              <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.8)', lineHeight: 1.5 }}>
                You're in control. Copilot can <strong style={{ color: '#fff' }}>draft briefs & suggest inspiration</strong> as you add work — every deliverable is yours to define.
              </div>
            </div>

            {/* Category sections */}
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
                      const dayLabel = formatDay(item.day, monthKey)
                      const effortColor = item.effort >= 4 ? '#FF5C1F' : item.effort >= 3 ? '#F4B740' : '#0EA5A4'
                      return (
                        <div key={item.id} style={{ borderRadius: 12, border: '1px solid var(--c-border-soft)', borderLeft: `3px solid ${cat.color}`, padding: '14px 14px 12px', background: '#fff', transition: 'box-shadow .15s' }}
                          onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,.07)'}
                          onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
                          {/* Badges row */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 9 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: '#1E293B', borderRadius: 6, padding: '3px 8px' }}>{item.type}</span>
                            {dayLabel && <span style={{ fontSize: 11.5, color: 'var(--c-subtle)' }}>{dayLabel}</span>}
                            <span style={{ fontSize: 11, fontWeight: 700, color: st.c, background: st.bg, borderRadius: 6, padding: '3px 8px' }}>{st.label}</span>
                            <div style={{ flex: 1 }} />
                            {assignee && (
                              <div title={assignee.name} style={{ width: 26, height: 26, borderRadius: '50%', background: assignee.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, flexShrink: 0 }}>{assignee.initials}</div>
                            )}
                            <button onClick={() => openEdit(item)} style={{ width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 7, color: 'var(--c-ghost)' }}
                              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--c-fill)'; (e.currentTarget as HTMLElement).style.color = 'var(--c-subtle)' }}
                              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--c-ghost)' }}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>
                            </button>
                            <button onClick={() => deleteItem(item.id)} style={{ width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 7, color: 'var(--c-ghost)' }}
                              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--c-red-bg)'; (e.currentTarget as HTMLElement).style.color = 'var(--c-red)' }}
                              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--c-ghost)' }}>
                              <X size={12} />
                            </button>
                          </div>
                          {/* Title */}
                          <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.3, marginBottom: item.brief ? 6 : 0 }}>{item.title}</div>
                          {/* Brief */}
                          {item.brief && (
                            <div style={{ fontSize: 13, color: 'var(--c-subtle)', lineHeight: 1.55, marginBottom: item.refs?.length ? 8 : 10, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as React.CSSProperties}>{item.brief}</div>
                          )}
                          {/* Refs */}
                          {item.refs && item.refs.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
                              {item.refs.map((r, i) => (
                                <span key={i} style={{ fontSize: 12, color: 'var(--c-subtle)', background: 'var(--c-fill)', borderRadius: 7, padding: '3px 9px', display: 'flex', alignItems: 'center', gap: 5 }}>
                                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                                  {r.label}
                                </span>
                              ))}
                            </div>
                          )}
                          {/* Bottom: effort dots + assign */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', gap: 3 }}>
                              {[1,2,3,4,5].map(n => (
                                <div key={n} style={{ width: 11, height: 11, borderRadius: 3, background: n <= item.effort ? effortColor : '#E5E7EB', transition: 'background .2s' }} />
                              ))}
                            </div>
                            {!assignee && (
                              <button onClick={() => setPushItem(item)} style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-accent)', background: 'rgba(255,92,31,.08)', borderRadius: 7, padding: '4px 10px' }}>Assign →</button>
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
          <div style={{ background: '#fff', border: '1px solid var(--c-border)', borderRadius: 16, padding: 40, textAlign: 'center', color: 'var(--c-faint)' }}>
            Select a client to view and plan deliverables
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
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

            <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
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
                      <Sparkle size={11} color="#FF5C1F" />Deep suggest (AI)
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

              {/* Effort + Day */}
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
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 5 }}>Scheduled Day (optional)</label>
                  <input type="number" min={1} max={31} value={modal.item!.day || ''} onChange={e => setModal(m => ({ ...m, item: { ...m.item!, day: e.target.value ? Number(e.target.value) : null } }))}
                    placeholder="e.g. 14" style={{ width: '100%', border: '1.5px solid var(--c-border)', borderRadius: 10, padding: '10px 12px', fontSize: 14 }} />
                </div>
              </div>

              {/* Status */}
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

              {/* Assignee */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 5 }}>Assign to</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button onClick={() => setModal(m => ({ ...m, item: { ...m.item!, assignee_id: '' } }))}
                    style={{ padding: '5px 10px', borderRadius: 8, fontSize: 12.5, fontWeight: 600, border: '1.5px solid', borderColor: !modal.item!.assignee_id ? 'var(--c-accent)' : 'var(--c-border)', color: !modal.item!.assignee_id ? 'var(--c-accent)' : 'var(--c-muted)', background: !modal.item!.assignee_id ? 'rgba(255,92,31,.06)' : '#fff' }}>
                    Unassigned
                  </button>
                  {state.users.map(u => (
                    <button key={u.id} onClick={() => setModal(m => ({ ...m, item: { ...m.item!, assignee_id: u.id } }))}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 8, fontSize: 12.5, fontWeight: 600, border: '1.5px solid', borderColor: modal.item!.assignee_id === u.id ? 'var(--c-accent)' : 'var(--c-border)', color: modal.item!.assignee_id === u.id ? 'var(--c-accent)' : 'var(--c-muted)', background: modal.item!.assignee_id === u.id ? 'rgba(255,92,31,.06)' : '#fff' }}>
                      <div style={{ width: 18, height: 18, borderRadius: '50%', background: u.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700 }}>{u.initials}</div>
                      {u.name.split(' ')[0]}
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

      {/* Push & Assign Modal */}
      {pushItem && (
        <div onClick={() => setPushItem(null)} className="modal-overlay">
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 380, background: '#fff', borderRadius: 18, overflow: 'hidden', boxShadow: 'var(--shadow-modal)', animation: 'popIn .22s cubic-bezier(.2,.9,.3,1) both' }}>
            <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--c-border-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15 }}>Push & Assign</div>
              <button onClick={() => setPushItem(null)}><X size={15} color="var(--c-ghost)" /></button>
            </div>
            <div style={{ padding: '14px 20px' }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 4 }}>{pushItem.title}</div>
              <div style={{ fontSize: 12.5, color: 'var(--c-faint)', marginBottom: 16 }}>{pushItem.type} · {SERVICE_CATS.find(c => c.key === pushItem.cat)?.label}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', marginBottom: 8 }}>Assign to team member</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {state.users.map(u => (
                  <button key={u.id} onClick={() => assignItem(u.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 12px', borderRadius: 10, border: '1.5px solid var(--c-border)', background: '#fff', transition: 'all .15s', textAlign: 'left' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--c-accent)'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,92,31,.04)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--c-border)'; (e.currentTarget as HTMLElement).style.background = '#fff' }}>
                    <div style={{ width: 34, height: 34, borderRadius: 9, background: u.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 11, flexShrink: 0 }}>{u.initials}</div>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 600 }}>{u.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--c-faint)' }}>{u.title}</div>
                    </div>
                    <div style={{ flex: 1 }} />
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--c-ghost)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
