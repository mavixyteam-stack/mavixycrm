'use client'
import { useState } from 'react'
import { useApp, useToast } from '@/lib/store'
import { Plus, X, Sparkle, Spinner, Check } from '@/components/ui/Icon'
import { SERVICE_CATS, TYPE_MAP, EFFORT_LABELS, IDEA_BANK, BRIEF_BANK, STATUS_PIPE } from '@/lib/seed-data'
import type { PlanItem, ContentCat, ContentStatus } from '@/types'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function getMonthKey(offset = 0) {
  const d = new Date()
  d.setMonth(d.getMonth() + offset)
  return `${d.getFullYear()}-${d.getMonth() + 1}`
}

function parseMonthKey(key: string) {
  const [y, m] = key.split('-').map(Number)
  return { y, m, label: `${MONTHS[m - 1]} ${y}` }
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
  const [catFilter, setCatFilter] = useState<string>('all')
  const [modal, setModal] = useState<ModalState>({ open: false, item: null, clientId: '', cat: 'social' })
  const [pushItem, setPushItem] = useState<PlanItem | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [ideaIdx, setIdeaIdx] = useState(0)

  const monthKey = getMonthKey(monthOff)
  const { label: monthLabel } = parseMonthKey(monthKey)
  const items = state.planItems.filter(it => it.month === monthKey)

  function openAdd(clientId: string, cat: ContentCat) {
    setModal({
      open: true,
      item: { client_id: clientId, cat, type: TYPE_MAP[cat][0], title: '', brief: BRIEF_BANK[cat], effort: 3, day: null, status: 'planned', refs: [] },
      clientId,
      cat,
    })
  }

  function openEdit(item: PlanItem) {
    setModal({ open: true, item: { ...item }, clientId: item.client_id, cat: item.cat })
  }

  function closeModal() {
    setModal(m => ({ ...m, open: false, item: null }))
  }

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

  function deleteItem(id: string) {
    dispatch({ type: 'DELETE_PLAN_ITEM', id })
    toast('Deleted')
  }

  async function aiQuickSuggest() {
    if (!modal.item) return
    setAiLoading(true)
    try {
      const ideas = IDEA_BANK[modal.cat]?.[modal.item!.type || ''] || []
      const idea = ideas[ideaIdx % Math.max(ideas.length, 1)] || 'Creative content idea for your brand'
      setIdeaIdx(i => i + 1)
      const clientName = state.clients.find(c => c.id === modal.clientId)?.name || 'Client'
      const title = idea.replace('{brand}', clientName)
      setModal(m => ({ ...m, item: { ...m.item!, title, brief: BRIEF_BANK[modal.cat] } }))
    } finally {
      setAiLoading(false)
    }
  }

  async function aiDeepSuggest() {
    if (!modal.item) return
    setAiLoading(true)
    try {
      const res = await fetch('/api/ai/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client: state.clients.find(c => c.id === modal.clientId)?.name,
          cat: modal.cat,
          type: modal.item!.type,
          existing: items.filter(it => it.client_id === modal.clientId).map(it => it.title),
        })
      })
      const { title, brief } = await res.json()
      setModal(m => ({ ...m, item: { ...m.item!, title: title || m.item!.title, brief: brief || m.item!.brief } }))
    } catch {
      toast('AI suggestion unavailable')
    } finally {
      setAiLoading(false)
    }
  }

  function assignItem(assignee_id: string) {
    if (!pushItem) return
    const updated: PlanItem = { ...pushItem, assignee_id, status: 'planned' as ContentStatus }
    dispatch({ type: 'UPSERT_PLAN_ITEM', item: updated })
    setPushItem(null)
    const name = state.users.find(u => u.id === assignee_id)?.name || 'teammate'
    toast(`Assigned to ${name}`)
  }

  const cats = catFilter === 'all' ? SERVICE_CATS : SERVICE_CATS.filter(c => c.key === catFilter)

  const totalItems = items.length
  const doneItems = items.filter(it => it.status === 'published').length
  const progress = totalItems ? Math.round((doneItems / totalItems) * 100) : 0

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 4 }}>Content Planner</h1>
          <p style={{ fontSize: 14, color: 'var(--c-subtle)' }}>Plan, brief and assign all deliverables for the month</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 10, padding: '6px 12px' }}>
            <button onClick={() => setMonthOff(o => o - 1)} style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, color: 'var(--c-subtle)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <span style={{ fontSize: 14, fontWeight: 600, minWidth: 88, textAlign: 'center' }}>{monthLabel}</span>
            <button onClick={() => setMonthOff(o => o + 1)} style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, color: 'var(--c-subtle)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          </div>
          <div style={{ display: 'flex', gap: 4, background: 'var(--c-fill)', borderRadius: 9, padding: 3 }}>
            {[{key:'all',label:'All'},...SERVICE_CATS.map(c=>({key:c.key,label:c.short}))].map(c => (
              <button key={c.key} onClick={() => setCatFilter(c.key)}
                style={{ padding: '5px 10px', borderRadius: 7, fontSize: 12.5, fontWeight: 600, background: catFilter === c.key ? '#fff' : 'transparent', color: catFilter === c.key ? 'var(--c-ink)' : 'var(--c-muted)', boxShadow: catFilter === c.key ? '0 1px 3px rgba(0,0,0,.1)' : 'none', transition: 'all .15s' }}>
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Month progress */}
      <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 14, padding: '14px 18px', marginBottom: 22, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{monthLabel} progress</span>
            <span style={{ fontSize: 13, color: 'var(--c-subtle)' }}>{doneItems}/{totalItems} published</span>
          </div>
          <div style={{ height: 6, background: 'var(--c-fill)', borderRadius: 99 }}>
            <div style={{ height: '100%', borderRadius: 99, background: 'linear-gradient(90deg,#FF5C1F,#FF9A6C)', width: `${progress}%`, transition: 'width .4s' }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 14 }}>
          {STATUS_PIPE.map(s => {
            const cnt = items.filter(it => it.status === s.key).length
            return (
              <div key={s.key} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: s.c }}>{cnt}</div>
                <div style={{ fontSize: 11, color: 'var(--c-faint)' }}>{s.label}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Client × Category grid */}
      {state.clients.map(client => {
        const clientItems = items.filter(it => it.client_id === client.id)
        if (clientItems.length === 0 && catFilter !== 'all') return null

        return (
          <div key={client.id} style={{ marginBottom: 24, background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderBottom: '1px solid var(--c-border-soft)', background: 'var(--c-fill)' }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: client.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12 }}>
                {client.initials}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14.5 }}>{client.name}</div>
                <div style={{ fontSize: 12, color: 'var(--c-faint)' }}>
                  {clientItems.length} deliverable{clientItems.length !== 1 ? 's' : ''} · {clientItems.filter(i => i.status === 'published').length} published
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {client.services.map(s => {
                  const cat = SERVICE_CATS.find(c => c.key === s)
                  return cat ? (
                    <span key={s} style={{ fontSize: 11, fontWeight: 600, color: cat.color, background: cat.bg, borderRadius: 6, padding: '3px 7px' }}>{cat.short}</span>
                  ) : null
                })}
              </div>
            </div>

            {cats.map(cat => {
              const catItems = clientItems.filter(it => it.cat === cat.key)
              const canAdd = client.services.includes(cat.key)
              if (!canAdd && catItems.length === 0) return null

              return (
                <div key={cat.key} style={{ borderBottom: '1px solid var(--c-border-soft)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px 8px', background: `${cat.bg}66` }}>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: cat.color, letterSpacing: '.05em', textTransform: 'uppercase' }}>{cat.label}</span>
                    <span style={{ fontSize: 12, color: 'var(--c-faint)' }}>({catItems.length})</span>
                    <div style={{ flex: 1 }} />
                    {canAdd && (
                      <button onClick={() => openAdd(client.id, cat.key as ContentCat)}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: cat.color, padding: '4px 9px', borderRadius: 7, background: cat.bg, border: `1px solid ${cat.color}33` }}>
                        <Plus size={11} />Add
                      </button>
                    )}
                  </div>

                  <div style={{ padding: '8px 18px 12px' }}>
                    {catItems.length === 0 ? (
                      <div style={{ fontSize: 13, color: 'var(--c-ghost)', padding: '8px 0', fontStyle: 'italic' }}>No deliverables yet</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {catItems.map(item => {
                          const st = STATUS_PIPE.find(s => s.key === item.status)!
                          const assignee = state.users.find(u => u.id === item.assignee_id)
                          return (
                            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--c-border-soft)', background: '#fff', transition: 'box-shadow .15s' }}
                              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,.06)'}
                              onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
                              <span style={{ fontSize: 11, fontWeight: 600, color: st.c, background: st.bg, borderRadius: 6, padding: '3px 7px', whiteSpace: 'nowrap' }}>{st.label}</span>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</div>
                                <div style={{ fontSize: 12, color: 'var(--c-faint)', marginTop: 1 }}>{item.type} · Effort: {EFFORT_LABELS[item.effort]}{item.day ? ` · Day ${item.day}` : ''}</div>
                              </div>
                              {assignee ? (
                                <div title={assignee.name} style={{ width: 26, height: 26, borderRadius: '50%', background: assignee.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                                  {assignee.initials}
                                </div>
                              ) : (
                                <button onClick={() => setPushItem(item)}
                                  style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--c-accent)', background: 'rgba(255,92,31,.08)', borderRadius: 7, padding: '4px 8px', whiteSpace: 'nowrap' }}>
                                  Assign
                                </button>
                              )}
                              <button onClick={() => setPushItem(item)}
                                style={{ padding: '4px 8px', fontSize: 11.5, fontWeight: 600, color: 'var(--c-subtle)', background: 'var(--c-fill)', borderRadius: 7, whiteSpace: 'nowrap' }}>
                                Push
                              </button>
                              <button onClick={() => openEdit(item)}
                                style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 7, color: 'var(--c-ghost)' }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'var(--c-fill)'; e.currentTarget.style.color = 'var(--c-subtle)' }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--c-ghost)' }}>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>
                              </button>
                              <button onClick={() => deleteItem(item.id)}
                                style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 7, color: 'var(--c-ghost)' }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'var(--c-red-bg)'; e.currentTarget.style.color = 'var(--c-red)' }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--c-ghost)' }}>
                                <X size={12} />
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )
      })}

      {/* Add / Edit Modal */}
      {modal.open && modal.item && (
        <div onClick={closeModal} className="modal-overlay">
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 540, background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--shadow-modal)', animation: 'popIn .22s cubic-bezier(.2,.9,.3,1) both' }}>
            <div style={{ padding: '20px 22px', borderBottom: '1px solid var(--c-border-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>{modal.item!.id ? 'Edit Deliverable' : 'Add Deliverable'}</div>
                <div style={{ fontSize: 12.5, color: 'var(--c-faint)', marginTop: 2 }}>
                  {state.clients.find(c => c.id === modal.clientId)?.name} · {SERVICE_CATS.find(c => c.key === modal.cat)?.label}
                </div>
              </div>
              <button onClick={closeModal} style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 9, color: 'var(--c-ghost)' }}>
                <X size={15} />
              </button>
            </div>

            <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* AI Copilot bar */}
              <div style={{ display: 'flex', gap: 8, padding: '10px 12px', background: 'rgba(255,92,31,.05)', borderRadius: 10, border: '1px solid rgba(255,92,31,.15)' }}>
                <Sparkle size={14} color="#FF5C1F" style={{ marginTop: 1, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--c-ink)', marginBottom: 6 }}>AI Copilot</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={aiQuickSuggest} disabled={aiLoading}
                      style={{ fontSize: 12, fontWeight: 600, color: '#FF5C1F', background: '#fff', border: '1px solid rgba(255,92,31,.25)', borderRadius: 7, padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 5 }}>
                      {aiLoading ? <Spinner size={11} color="#FF5C1F" /> : <Sparkle size={11} color="#FF5C1F" />}
                      Quick idea
                    </button>
                    <button onClick={aiDeepSuggest} disabled={aiLoading}
                      style={{ fontSize: 12, fontWeight: 600, color: '#FF5C1F', background: '#fff', border: '1px solid rgba(255,92,31,.25)', borderRadius: 7, padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Sparkle size={11} color="#FF5C1F" />
                      Deep suggest (AI)
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
                      style={{ fontSize: 12.5, fontWeight: 600, padding: '5px 11px', borderRadius: 8, border: '1.5px solid', borderColor: modal.item!.type === t ? 'var(--c-accent)' : 'var(--c-border)', color: modal.item!.type === t ? 'var(--c-accent)' : 'var(--c-muted)', background: modal.item!.type === t ? 'rgba(255,92,31,.06)' : '#fff', transition: 'all .12s' }}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 5 }}>Title</label>
                <input value={modal.item!.title || ''} onChange={e => setModal(m => ({ ...m, item: { ...m.item!, title: e.target.value } }))}
                  placeholder="e.g. Glow ritual — 3-step routine"
                  style={{ width: '100%', border: '1.5px solid var(--c-border)', borderRadius: 10, padding: '10px 12px', fontSize: 14, transition: 'border-color .15s' }}
                  onFocus={e => e.target.style.borderColor = 'var(--c-ink)'}
                  onBlur={e => e.target.style.borderColor = 'var(--c-border)'} />
              </div>

              {/* Brief */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 5 }}>Brief</label>
                <textarea value={modal.item!.brief || ''} onChange={e => setModal(m => ({ ...m, item: { ...m.item!, brief: e.target.value } }))}
                  rows={3} placeholder="Describe the content direction, references, key elements..."
                  style={{ width: '100%', border: '1.5px solid var(--c-border)', borderRadius: 10, padding: '10px 12px', fontSize: 13.5, resize: 'vertical', transition: 'border-color .15s' }}
                  onFocus={e => e.target.style.borderColor = 'var(--c-ink)'}
                  onBlur={e => e.target.style.borderColor = 'var(--c-border)'} />
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
                    placeholder="e.g. 14"
                    style={{ width: '100%', border: '1.5px solid var(--c-border)', borderRadius: 10, padding: '10px 12px', fontSize: 14 }} />
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
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--c-accent)'; e.currentTarget.style.background = 'rgba(255,92,31,.04)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--c-border)'; e.currentTarget.style.background = '#fff' }}>
                    <div style={{ width: 34, height: 34, borderRadius: 9, background: u.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 11, flexShrink: 0 }}>
                      {u.initials}
                    </div>
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
