'use client'
import { useState } from 'react'
import { useApp, useToast, useUpsertDeal } from '@/lib/store'
import { Plus, X, Check } from '@/components/ui/Icon'
import { ModalPortal } from '@/components/ui/ModalPortal'

const STAGES = [
  { key: 'lead', label: 'Lead', color: '#9A9E94', bg: '#F0F1ED' },
  { key: 'qualified', label: 'Qualified', color: '#C99211', bg: '#FCF3D9' },
  { key: 'proposal', label: 'Proposal', color: '#7C3AED', bg: '#F3EEFE' },
  { key: 'negotiation', label: 'Negotiation', color: '#FF5C1F', bg: '#FFF1EA' },
  { key: 'closed', label: 'Closed Won', color: '#0E8C63', bg: '#E7FAF3' },
] as const

export default function PipelineScreen() {
  const { state } = useApp()
  const toast = useToast()
  const upsertDeal = useUpsertDeal()
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverStage, setDragOverStage] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [filterOwner, setFilterOwner] = useState('')
  const [form, setForm] = useState({ name: '', company: '', value: '', stage: 'lead' as typeof STAGES[number]['key'], probability: 30, owner_id: state.currentUser?.id || '' })

  const allDeals = state.deals
  const deals = filterOwner ? allDeals.filter(d => d.owner_id === filterOwner) : allDeals

  const totalPipeline = allDeals.filter(d => d.stage !== 'closed').reduce((s, d) => s + d.value, 0)
  const weighted = allDeals.filter(d => d.stage !== 'closed').reduce((s, d) => s + d.value * (d.probability / 100), 0)
  const closed = allDeals.filter(d => d.stage === 'closed').reduce((s, d) => s + d.value, 0)

  function moveStage(id: string, stage: typeof STAGES[number]['key']) {
    const deal = allDeals.find(d => d.id === id)
    if (!deal) return
    upsertDeal({ ...deal, stage })
    toast(`Moved to ${STAGES.find(s => s.key === stage)?.label}`)
  }

  function addDeal() {
    if (!form.name.trim() || !form.company.trim()) return
    upsertDeal({
      id: crypto.randomUUID(),
      name: form.name,
      company: form.company,
      value: Number(form.value) || 0,
      stage: form.stage,
      probability: form.probability,
      owner_id: form.owner_id || state.currentUser?.id || '',
      created_at: new Date().toISOString(),
    })
    toast('Deal added')
    setAddOpen(false)
    setForm({ name: '', company: '', value: '', stage: 'lead', probability: 30, owner_id: state.currentUser?.id || '' })
  }

  function fmtCurrency(n: number) {
    if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`
    if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`
    return `₹${n}`
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 4 }}>Pipeline</h1>
          <p style={{ fontSize: 14, color: 'var(--c-subtle)' }}>Drag deals between stages to update status</p>
        </div>
        <button onClick={() => setAddOpen(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'var(--c-ink)', color: '#fff', borderRadius: 10, padding: '9px 16px', fontWeight: 600, fontSize: 13, border: 'none', cursor: 'pointer' }}>
          <Plus size={13} />Add Deal
        </button>
      </div>

      {/* Owner filter */}
      {state.users.filter(u => u.role === 'sales' || u.role === 'owner').length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 1, background: '#fff', border: '1px solid var(--c-border)', borderRadius: 10, padding: '5px 8px', marginBottom: 18, width: 'fit-content' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-ghost)', letterSpacing: '.04em', paddingRight: 6 }}>OWNER</span>
          {[{ id: '', label: 'All' }, ...state.users.filter(u => u.role === 'sales' || u.role === 'owner').map(u => ({ id: u.id, label: u.name.split(' ')[0] }))].map(o => (
            <button key={o.id} onClick={() => setFilterOwner(o.id)}
              style={{ padding: '4px 10px', borderRadius: 7, fontSize: 12.5, fontWeight: 600, border: 'none', background: filterOwner === o.id ? 'var(--c-ink)' : 'transparent', color: filterOwner === o.id ? '#fff' : 'var(--c-subtle)', cursor: 'pointer', transition: 'all .12s' }}>
              {o.label}
            </button>
          ))}
        </div>
      )}

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Total Pipeline', val: fmtCurrency(totalPipeline), sub: `${deals.filter(d => d.stage !== 'closed').length} open deals`, c: 'var(--c-accent)' },
          { label: 'Weighted Value', val: fmtCurrency(Math.round(weighted)), sub: 'probability-adjusted', c: '#7C3AED' },
          { label: 'Closed Won', val: fmtCurrency(closed), sub: `${deals.filter(d => d.stage === 'closed').length} deals`, c: 'var(--c-green)' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 14, padding: '16px 18px' }}>
            <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-display)', color: s.c, marginBottom: 4 }}>{s.val}</div>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{s.label}</div>
            <div style={{ fontSize: 12, color: 'var(--c-faint)' }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Kanban */}
      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 6 }}>
        {STAGES.map(stage => {
          const stageDeals = deals.filter(d => d.stage === stage.key)
          const stageVal = stageDeals.reduce((s, d) => s + d.value, 0)
          return (
            <div key={stage.key}
              onDragOver={e => { e.preventDefault(); setDragOverStage(stage.key) }}
              onDrop={e => { e.preventDefault(); if (draggingId) moveStage(draggingId, stage.key); setDraggingId(null); setDragOverStage(null) }}
              style={{ flex: 1, minWidth: 200, background: dragOverStage === stage.key ? `${stage.bg}` : 'var(--c-fill)', border: `1px solid ${dragOverStage === stage.key ? stage.color + '60' : 'var(--c-border-soft)'}`, borderRadius: 14, padding: 10, minHeight: 400, transition: 'all .15s' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 8px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: stage.color }} />
                  <span style={{ fontSize: 12.5, fontWeight: 700 }}>{stage.label}</span>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-ghost)' }}>{stageDeals.length}</span>
              </div>
              {stageVal > 0 && (
                <div style={{ fontSize: 12, fontWeight: 600, color: stage.color, background: stage.bg, borderRadius: 7, padding: '4px 8px', textAlign: 'center', marginBottom: 8 }}>
                  {fmtCurrency(stageVal)}
                </div>
              )}

              {stageDeals.length === 0 && (
                <div style={{ padding: '20px 8px', textAlign: 'center', color: 'var(--c-ghost)', fontSize: 12 }}>Empty</div>
              )}
              {stageDeals.map(deal => {
                const owner = state.users.find(u => u.id === deal.owner_id)
                return (
                  <div key={deal.id}
                    draggable
                    onDragStart={() => setDraggingId(deal.id)}
                    onDragEnd={() => { setDraggingId(null); setDragOverStage(null) }}
                    style={{ background: '#fff', border: '1px solid var(--c-border-soft)', borderLeft: `3px solid ${stage.color}`, borderRadius: 10, padding: '10px 11px', marginBottom: 8, cursor: 'grab', opacity: draggingId === deal.id ? .4 : 1, transition: 'all .15s' }}
                    onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,.1)'}
                    onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 3 }}>{deal.company}</div>
                    <div style={{ fontSize: 12, color: 'var(--c-subtle)', marginBottom: 8 }}>{deal.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--c-ink)', fontFamily: 'var(--font-display)' }}>{fmtCurrency(deal.value)}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: stage.color, background: stage.bg, borderRadius: 5, padding: '2px 6px' }}>{deal.probability}%</span>
                        {owner && (
                          <div title={owner.name} style={{ width: 22, height: 22, borderRadius: '50%', background: owner.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700 }}>
                            {owner.initials}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      {/* Add Deal Modal */}
      {addOpen && (
        <ModalPortal><div onClick={() => setAddOpen(false)} className="modal-overlay">
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 440, background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--shadow-modal)', animation: 'popIn .22s cubic-bezier(.2,.9,.3,1) both' }}>
            <div style={{ padding: '20px 22px', borderBottom: '1px solid var(--c-border-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>Add Deal</div>
              <button onClick={() => setAddOpen(false)}><X size={15} color="var(--c-ghost)" /></button>
            </div>
            <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 13 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 5 }}>Company</label>
                <input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} placeholder="e.g. Brew Republic"
                  style={{ width: '100%', border: '1.5px solid var(--c-border)', borderRadius: 10, padding: '10px 12px', fontSize: 14 }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 5 }}>Deal Name</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Full retainer — social + ads"
                  style={{ width: '100%', border: '1.5px solid var(--c-border)', borderRadius: 10, padding: '10px 12px', fontSize: 14 }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 5 }}>Value (₹)</label>
                  <input type="number" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} placeholder="e.g. 85000"
                    style={{ width: '100%', border: '1.5px solid var(--c-border)', borderRadius: 10, padding: '10px 12px', fontSize: 14 }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 5 }}>Probability %</label>
                  <input type="number" min={0} max={100} value={form.probability} onChange={e => setForm(f => ({ ...f, probability: Number(e.target.value) }))}
                    style={{ width: '100%', border: '1.5px solid var(--c-border)', borderRadius: 10, padding: '10px 12px', fontSize: 14 }} />
                </div>
              </div>
              {state.users.length > 0 && (
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 5 }}>Assign to</label>
                  <select value={form.owner_id} onChange={e => setForm(f => ({ ...f, owner_id: e.target.value }))}
                    style={{ width: '100%', border: '1.5px solid var(--c-border)', borderRadius: 10, padding: '10px 12px', fontSize: 14, background: 'var(--c-fill)', cursor: 'pointer' }}>
                    <option value="">Unassigned</option>
                    {state.users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 5 }}>Stage</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {STAGES.map(s => (
                    <button key={s.key} onClick={() => setForm(f => ({ ...f, stage: s.key }))}
                      style={{ padding: '5px 10px', borderRadius: 8, fontSize: 12.5, fontWeight: 600, border: '1.5px solid', borderColor: form.stage === s.key ? s.color : 'var(--c-border)', color: form.stage === s.key ? s.color : 'var(--c-muted)', background: form.stage === s.key ? s.bg : '#fff' }}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ padding: '14px 22px', borderTop: '1px solid var(--c-border-soft)', display: 'flex', gap: 10 }}>
              <button onClick={() => setAddOpen(false)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1.5px solid var(--c-border)', fontSize: 14, fontWeight: 600, color: 'var(--c-subtle)' }}>Cancel</button>
              <button onClick={addDeal} style={{ flex: 2, padding: '10px', borderRadius: 10, background: 'var(--c-ink)', color: '#fff', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                <Check size={14} color="#fff" />Add Deal
              </button>
            </div>
          </div>
        </div></ModalPortal>
      )}
    </div>
  )
}
