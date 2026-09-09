'use client'
import { useState, useMemo } from 'react'
import { useApp, useToast, useUpsertJourney, useDeleteJourney } from '@/lib/store'
import { ModalPortal } from '@/components/ui/ModalPortal'
import { X } from '@/components/ui/Icon'
import {
  JOURNEY_STAGES, LOST_STAGE, stageDef, stageIndex, nextStage, STAGE_PROBABILITY, inr,
  BILLING_OPTIONS, SERVICE_OPTIONS, SOURCE_OPTIONS,
} from '@/lib/journey'
import type { Journey, JourneyStage } from '@/types'

const todayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function blankJourney(ownerId?: string | null): Journey {
  return {
    id: (globalThis.crypto?.randomUUID?.() ?? String(Date.now())),
    name: '', company: '', contact_email: '', contact_phone: '',
    stage: 'lead', value: 0, billing: 'retainer', source: 'Referral', service: 'Social Media',
    owner_id: ownerId || null, probability: STAGE_PROBABILITY.lead,
    notes: '', next_step: '', next_step_date: null, client_id: null, lost_reason: null,
    created_at: new Date().toISOString(),
  }
}

export default function ClientJourney() {
  const { state } = useApp()
  const toast = useToast()
  const upsert = useUpsertJourney()
  const remove = useDeleteJourney()

  const [editing, setEditing] = useState<Journey | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverCol, setDragOverCol] = useState<string | null>(null)
  const [ownerFilter, setOwnerFilter] = useState('all')
  const [showLost, setShowLost] = useState(false)

  const me = state.currentUser?.id
  const owners = state.users.filter(u => ['owner', 'manager', 'sales'].includes(u.role))
  const person = (id?: string | null) => state.users.find(u => u.id === id)

  const all = state.journeys
  const visible = ownerFilter === 'all' ? all : all.filter(j => j.owner_id === ownerFilter)

  // ── Pipeline analytics ──────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const open = visible.filter(j => j.stage !== 'active' && j.stage !== 'lost')
    const pipeline = open.reduce((s, j) => s + (j.value || 0), 0)
    const weighted = open.reduce((s, j) => s + (j.value || 0) * ((j.probability ?? STAGE_PROBABILITY[j.stage]) / 100), 0)
    const active = visible.filter(j => j.stage === 'active')
    const activeValue = active.reduce((s, j) => s + (j.value || 0), 0)
    return { openCount: open.length, pipeline, weighted, activeCount: active.length, activeValue }
  }, [visible])

  const lostItems = visible.filter(j => j.stage === 'lost')

  function openNew() { setEditing(blankJourney(me)); setIsNew(true) }
  function openEdit(j: Journey) { setEditing({ ...j }); setIsNew(false); setDetailId(null) }

  async function save(j: Journey) {
    if (!j.company.trim() && !j.name.trim()) { toast('Add a company or contact name'); return }
    await upsert(j)
    setEditing(null)
    toast(isNew ? 'Added to the journey' : 'Saved')
  }

  async function moveStage(j: Journey, stage: JourneyStage) {
    if (j.stage === stage) return
    const probability = STAGE_PROBABILITY[stage]
    await upsert({ ...j, stage, probability })
    toast(`Moved to ${stageDef(stage).label}`)
  }

  async function markLost(j: Journey) {
    const reason = window.prompt('Why is this lost? (optional)') ?? ''
    await upsert({ ...j, stage: 'lost', probability: 0, lost_reason: reason || null })
    setDetailId(null)
    toast('Marked lost')
  }

  async function reopen(j: Journey) {
    await upsert({ ...j, stage: 'lead', probability: STAGE_PROBABILITY.lead, lost_reason: null })
    toast('Reopened as a lead')
  }

  async function del(j: Journey) {
    if (!window.confirm(`Delete ${j.company || j.name}? This can't be undone.`)) return
    await remove(j.id)
    setDetailId(null)
    toast('Deleted')
  }

  const detail = detailId ? all.find(j => j.id === detailId) : null

  return (
    <div style={{ animation: 'fadeIn .4s ease both' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, marginBottom: 18, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--c-faint)', fontSize: 13, fontWeight: 500, marginBottom: 7 }}>
            Client Journey
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--c-rule)' }} />
            <span style={{ fontWeight: 600, color: 'var(--c-subtle)' }}>{stats.openCount} in pipeline</span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em' }}>Lead to loyal client</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ position: 'relative' }}>
            <select value={ownerFilter} onChange={e => setOwnerFilter(e.target.value)}
              style={{ appearance: 'none', WebkitAppearance: 'none', background: '#fff', border: '1.5px solid var(--c-border)', borderRadius: 11, padding: '9px 34px 9px 13px', fontSize: 13.5, fontWeight: 600, color: 'var(--c-ink)', cursor: 'pointer' }}>
              <option value="all">All owners</option>
              {owners.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--c-faint)" strokeWidth="2.4" strokeLinecap="round" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}><path d="m6 9 6 6 6-6" /></svg>
          </div>
          <button onClick={openNew}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'var(--c-accent)', color: '#fff', borderRadius: 11, padding: '10px 16px', fontWeight: 700, fontSize: 13.5, border: 'none', cursor: 'pointer' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            New opportunity
          </button>
        </div>
      </div>

      {/* Stat strip */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          { label: 'Open pipeline', val: inr(stats.pipeline), sub: `${stats.openCount} deals`, c: '#0F172A' },
          { label: 'Weighted forecast', val: inr(stats.weighted), sub: 'by win probability', c: '#F59E0B' },
          { label: 'Active clients', val: String(stats.activeCount), sub: 'delivering now', c: '#10B981' },
          { label: 'Active book', val: inr(stats.activeValue), sub: 'per their billing', c: '#14B8A6' },
        ].map(s => (
          <div key={s.label} style={{ flex: '1 1 160px', background: '#fff', border: '1px solid var(--c-border)', borderRadius: 14, padding: '13px 15px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-faint)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: s.c, lineHeight: 1 }}>{s.val}</div>
            <div style={{ fontSize: 11.5, color: 'var(--c-faint)', marginTop: 4 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Board */}
      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 8, alignItems: 'start' }}>
        {JOURNEY_STAGES.map(col => {
          const colItems = visible.filter(j => j.stage === col.key)
          const colValue = colItems.reduce((s, j) => s + (j.value || 0), 0)
          return (
            <div key={col.key}
              onDragOver={e => { e.preventDefault(); setDragOverCol(col.key) }}
              onDragLeave={() => setDragOverCol(null)}
              onDrop={e => { e.preventDefault(); const j = all.find(x => x.id === draggingId); if (j) moveStage(j, col.key); setDraggingId(null); setDragOverCol(null) }}
              style={{
                flex: '0 0 246px', minWidth: 246,
                background: dragOverCol === col.key ? '#FFF5F0' : 'var(--c-fill-soft)',
                border: `1.5px solid ${dragOverCol === col.key ? '#FFC9AE' : 'transparent'}`,
                borderRadius: 14, padding: 10, minHeight: 460, transition: 'background .15s, border-color .15s',
              }}>
              {/* Column header */}
              <div style={{ padding: '4px 6px 10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: col.c }} />
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: 'var(--c-ink)' }}>{col.label}</span>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-ghost)', background: 'var(--c-fill)', borderRadius: 6, padding: '1px 7px' }}>{colItems.length}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--c-faint)', fontWeight: 600, marginTop: 4, paddingLeft: 15 }}>{colValue > 0 ? inr(colValue) : '—'}</div>
              </div>

              {/* Cards */}
              {colItems.map(j => {
                const p = person(j.owner_id)
                const overdue = j.next_step_date && j.next_step_date < todayStr()
                const isDragging = draggingId === j.id
                return (
                  <div key={j.id} draggable
                    onDragStart={e => { setDraggingId(j.id); e.dataTransfer.effectAllowed = 'move' }}
                    onDragEnd={() => { setDraggingId(null); setDragOverCol(null) }}
                    onClick={() => setDetailId(j.id)}
                    style={{
                      background: '#fff', border: `1px solid ${overdue ? '#FCA5A580' : 'var(--c-border-soft)'}`,
                      borderLeft: `3px solid ${col.c}`, borderRadius: 11, padding: '11px 12px', cursor: 'grab',
                      marginBottom: 8, opacity: isDragging ? .3 : 1, boxShadow: '0 1px 3px rgba(16,17,12,.06)',
                      transition: 'box-shadow .15s, transform .15s, opacity .1s', userSelect: 'none',
                    }}
                    onMouseEnter={e => { if (!isDragging) { const el = e.currentTarget as HTMLElement; el.style.boxShadow = '0 8px 24px -8px rgba(16,17,12,.18)'; el.style.transform = 'translateY(-1px)' } }}
                    onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.boxShadow = '0 1px 3px rgba(16,17,12,.06)'; el.style.transform = '' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 6 }}>
                      <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--c-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.company || j.name}</span>
                      {j.value > 0 && <span style={{ fontSize: 12, fontWeight: 800, color: col.c, flexShrink: 0 }}>{inr(j.value)}</span>}
                    </div>
                    {j.name && j.company && <div style={{ fontSize: 11.5, color: 'var(--c-faint)', marginBottom: 8 }}>{j.name}</div>}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: j.next_step ? 8 : 0 }}>
                      {j.service && <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--c-ink-3)', background: 'var(--c-fill)', borderRadius: 6, padding: '2px 7px' }}>{j.service}</span>}
                      {j.billing && <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--c-faint)' }}>{j.billing}</span>}
                    </div>
                    {j.next_step && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: overdue ? '#DC2626' : 'var(--c-subtle)', fontWeight: overdue ? 700 : 500 }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.next_step}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 9 }}>
                      {j.next_step_date
                        ? <span style={{ fontSize: 10.5, fontWeight: 700, color: overdue ? '#DC2626' : 'var(--c-faint)' }}>{overdue ? 'overdue · ' : ''}{new Date(j.next_step_date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                        : <span />}
                      {p
                        ? <span title={p.name} style={{ width: 22, height: 22, borderRadius: 7, background: p.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 9, fontFamily: 'var(--font-display)', flexShrink: 0 }}>{p.initials}</span>
                        : <span style={{ fontSize: 10, color: 'var(--c-rule)', fontWeight: 600 }}>unassigned</span>}
                    </div>
                  </div>
                )
              })}

              {colItems.length === 0 && (
                <div style={{ border: '2px dashed var(--c-rule)', borderRadius: 10, height: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--c-rule)', fontWeight: 500 }}>{col.hint}</span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Lost */}
      {lostItems.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <button onClick={() => setShowLost(v => !v)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 700, color: 'var(--c-faint)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: LOST_STAGE.c }} />
            {lostItems.length} lost
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" style={{ transform: showLost ? 'rotate(180deg)' : '', transition: 'transform .15s' }}><path d="m6 9 6 6 6-6" /></svg>
          </button>
          {showLost && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
              {lostItems.map(j => (
                <button key={j.id} onClick={() => setDetailId(j.id)}
                  style={{ textAlign: 'left', background: '#fff', border: '1px solid var(--c-border-soft)', borderRadius: 10, padding: '9px 12px', cursor: 'pointer', minWidth: 180 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-ink-3)' }}>{j.company || j.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--c-faint)', marginTop: 2 }}>{j.lost_reason || 'No reason noted'}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {all.length === 0 && (
        <div style={{ background: '#fff', border: '1px dashed var(--c-rule)', borderRadius: 18, padding: '48px 20px', textAlign: 'center', marginTop: 8 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Start your first opportunity</h3>
          <p style={{ margin: '0 auto 18px', color: 'var(--c-subtle)', fontSize: 14, maxWidth: '44ch' }}>
            Capture a lead and walk it all the way to an active, paying client — pitch, proposal, contract, onboarding, and beyond.
          </p>
          <button onClick={openNew} style={{ background: 'var(--c-ink)', color: '#fff', borderRadius: 11, padding: '11px 18px', fontWeight: 600, fontSize: 14, border: 'none', cursor: 'pointer' }}>New opportunity</button>
        </div>
      )}

      {/* Detail drawer */}
      {detail && (
        <JourneyDetail
          j={detail}
          ownerName={person(detail.owner_id)?.name}
          onClose={() => setDetailId(null)}
          onEdit={() => openEdit(detail)}
          onMove={(s) => moveStage(detail, s)}
          onLost={() => markLost(detail)}
          onReopen={() => reopen(detail)}
          onDelete={() => del(detail)}
          onAction={(label) => toast(`${label} — coming in the next build 🚧`)}
        />
      )}

      {/* Create / edit modal */}
      {editing && (
        <JourneyForm
          j={editing}
          isNew={isNew}
          owners={owners}
          onChange={setEditing}
          onCancel={() => setEditing(null)}
          onSave={() => save(editing)}
        />
      )}
    </div>
  )
}

// ─── Detail drawer ──────────────────────────────────────────────────────────
function JourneyDetail({ j, ownerName, onClose, onEdit, onMove, onLost, onReopen, onDelete, onAction }: {
  j: Journey; ownerName?: string
  onClose: () => void; onEdit: () => void; onMove: (s: JourneyStage) => void
  onLost: () => void; onReopen: () => void; onDelete: () => void; onAction: (label: string) => void
}) {
  const def = stageDef(j.stage)
  const idx = stageIndex(j.stage)
  const next = nextStage(j.stage)
  const overdue = j.next_step_date && j.next_step_date < todayStr()

  return (
    <ModalPortal>
      <div onClick={onClose} className="modal-overlay">
        <div onClick={e => e.stopPropagation()}
          style={{ width: '100%', maxWidth: 560, background: '#fff', borderRadius: 22, overflow: 'hidden', boxShadow: 'var(--shadow-modal)', animation: 'popIn .26s cubic-bezier(.2,.9,.3,1) both', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <div style={{ padding: '20px 24px 18px', borderBottom: '1px solid var(--c-border-soft)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ minWidth: 0 }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: def.c, background: def.bg, borderRadius: 7, padding: '3px 10px' }}>{def.label}</span>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, margin: '12px 0 3px', lineHeight: 1.15 }}>{j.company || j.name}</h3>
                {j.name && j.company && <div style={{ fontSize: 13.5, color: 'var(--c-subtle)' }}>{j.name}</div>}
              </div>
              <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--c-fill)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', flexShrink: 0 }}><X size={14} color="var(--c-muted)" /></button>
            </div>

            {/* Stage progress */}
            {j.stage !== 'lost' && (
              <div style={{ display: 'flex', gap: 4, marginTop: 16 }}>
                {JOURNEY_STAGES.map((s, i) => (
                  <div key={s.key} title={s.label} onClick={() => onMove(s.key)}
                    style={{ flex: 1, height: 6, borderRadius: 3, background: i <= idx ? def.c : 'var(--c-border)', cursor: 'pointer', transition: 'background .2s' }} />
                ))}
              </div>
            )}
          </div>

          {/* Body */}
          <div style={{ padding: '18px 24px', overflowY: 'auto' }}>
            {/* Next move */}
            <div style={{ background: def.bg, borderRadius: 12, padding: '13px 15px', marginBottom: 16 }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: def.c, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Next move</div>
              <div style={{ fontSize: 13.5, color: 'var(--c-ink-2)', lineHeight: 1.5 }}>{def.hint}</div>
              {def.action && (
                <button onClick={() => onAction(def.action!)}
                  style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 6, background: def.c, color: '#fff', borderRadius: 9, padding: '7px 13px', fontWeight: 700, fontSize: 12.5, border: 'none', cursor: 'pointer' }}>
                  {def.action}
                </button>
              )}
            </div>

            {/* Facts grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <Fact label="Value" value={j.value ? `${inr(j.value)}${j.billing ? ` · ${j.billing}` : ''}` : '—'} />
              <Fact label="Owner" value={ownerName || 'Unassigned'} />
              <Fact label="Service" value={j.service || '—'} />
              <Fact label="Source" value={j.source || '—'} />
              <Fact label="Email" value={j.contact_email || '—'} />
              <Fact label="Phone" value={j.contact_phone || '—'} />
            </div>

            {(j.next_step || j.next_step_date) && (
              <div style={{ border: '1px solid var(--c-border-soft)', borderRadius: 12, padding: '12px 14px', marginBottom: 16 }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--c-ghost)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 5 }}>Next step</div>
                <div style={{ fontSize: 14, color: 'var(--c-ink-2)' }}>{j.next_step || 'Set a next step'}</div>
                {j.next_step_date && <div style={{ fontSize: 12.5, fontWeight: 700, color: overdue ? '#DC2626' : 'var(--c-subtle)', marginTop: 4 }}>{overdue ? 'Overdue · ' : 'Due '}{new Date(j.next_step_date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</div>}
              </div>
            )}

            {j.notes && (
              <div style={{ marginBottom: 4 }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--c-ghost)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Notes</div>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--c-ink-3)', whiteSpace: 'pre-wrap' }}>{j.notes}</p>
              </div>
            )}
          </div>

          {/* Footer actions */}
          <div style={{ padding: '14px 24px', borderTop: '1px solid var(--c-border-soft)', background: 'var(--c-fill-soft)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={onEdit} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: 'var(--c-ink-3)', background: '#fff', border: '1.5px solid var(--c-border)', borderRadius: 10, padding: '9px 14px', cursor: 'pointer' }}>Edit</button>
            {j.stage === 'lost'
              ? <button onClick={onReopen} style={{ fontSize: 13, fontWeight: 700, color: '#0EA5E9', background: '#E0F2FE', border: 'none', borderRadius: 10, padding: '9px 14px', cursor: 'pointer' }}>Reopen</button>
              : <button onClick={onLost} style={{ fontSize: 13, fontWeight: 700, color: '#B91C1C', background: '#FEE2E2', border: 'none', borderRadius: 10, padding: '9px 14px', cursor: 'pointer' }}>Mark lost</button>}
            <button onClick={onDelete} title="Delete" style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-faint)', background: 'none', border: 'none', cursor: 'pointer', padding: '9px 8px' }}>Delete</button>
            <div style={{ flex: 1 }} />
            {next && j.stage !== 'lost' && (
              <button onClick={() => onMove(next)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 18px', borderRadius: 11, fontWeight: 700, fontSize: 13.5, background: 'var(--c-ink)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                Advance to {stageDef(next).label}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </ModalPortal>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--c-ghost)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13.5, color: 'var(--c-ink-2)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div>
    </div>
  )
}

// ─── Create / edit form ─────────────────────────────────────────────────────
function JourneyForm({ j, isNew, owners, onChange, onCancel, onSave }: {
  j: Journey; isNew: boolean; owners: { id: string; name: string }[]
  onChange: (j: Journey) => void; onCancel: () => void; onSave: () => void
}) {
  const set = (patch: Partial<Journey>) => onChange({ ...j, ...patch })
  const field = { width: '100%', border: '1.5px solid var(--c-border)', borderRadius: 10, padding: '10px 12px', fontSize: 14, boxSizing: 'border-box' as const, background: '#fff' }
  const lab = { fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block' as const, marginBottom: 5 }

  return (
    <ModalPortal>
      <div onClick={onCancel} className="modal-overlay">
        <div onClick={e => e.stopPropagation()}
          style={{ width: '100%', maxWidth: 540, background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--shadow-modal)', animation: 'popIn .22s cubic-bezier(.2,.9,.3,1) both', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--c-border-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17 }}>{isNew ? 'New opportunity' : 'Edit opportunity'}</div>
            <button onClick={onCancel} style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--c-fill)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: 'none' }}><X size={13} color="var(--c-ghost)" /></button>
          </div>

          <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 13, overflowY: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><label style={lab}>Company</label><input value={j.company} onChange={e => set({ company: e.target.value })} placeholder="Acme Co." style={field} /></div>
              <div><label style={lab}>Contact name</label><input value={j.name} onChange={e => set({ name: e.target.value })} placeholder="Priya Sharma" style={field} /></div>
              <div><label style={lab}>Email</label><input value={j.contact_email || ''} onChange={e => set({ contact_email: e.target.value })} placeholder="priya@acme.com" style={field} /></div>
              <div><label style={lab}>Phone</label><input value={j.contact_phone || ''} onChange={e => set({ contact_phone: e.target.value })} placeholder="+91…" style={field} /></div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div><label style={lab}>Value (₹)</label><input type="number" value={j.value || ''} onChange={e => set({ value: Number(e.target.value) || 0 })} placeholder="50000" style={field} /></div>
              <div><label style={lab}>Billing</label>
                <select value={j.billing || ''} onChange={e => set({ billing: e.target.value })} style={field}>
                  {BILLING_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div><label style={lab}>Stage</label>
                <select value={j.stage} onChange={e => set({ stage: e.target.value as JourneyStage, probability: STAGE_PROBABILITY[e.target.value as JourneyStage] })} style={field}>
                  {JOURNEY_STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div><label style={lab}>Service</label>
                <select value={j.service || ''} onChange={e => set({ service: e.target.value })} style={field}>
                  {SERVICE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div><label style={lab}>Source</label>
                <select value={j.source || ''} onChange={e => set({ source: e.target.value })} style={field}>
                  {SOURCE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div><label style={lab}>Owner</label>
                <select value={j.owner_id || ''} onChange={e => set({ owner_id: e.target.value || null })} style={field}>
                  <option value="">Unassigned</option>
                  {owners.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
              <div><label style={lab}>Next step</label><input value={j.next_step || ''} onChange={e => set({ next_step: e.target.value })} placeholder="Send proposal draft" style={field} /></div>
              <div><label style={lab}>Due</label><input type="date" value={j.next_step_date || ''} onChange={e => set({ next_step_date: e.target.value || null })} style={field} /></div>
            </div>

            <div><label style={lab}>Notes</label><textarea value={j.notes || ''} onChange={e => set({ notes: e.target.value })} rows={3} placeholder="Context, requirements, meeting notes…" style={{ ...field, resize: 'vertical', lineHeight: 1.5 }} /></div>
          </div>

          <div style={{ padding: '14px 22px', borderTop: '1px solid var(--c-border-soft)', display: 'flex', gap: 10 }}>
            <button onClick={onCancel} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1.5px solid var(--c-border)', fontSize: 14, fontWeight: 600, color: 'var(--c-subtle)', background: '#fff', cursor: 'pointer' }}>Cancel</button>
            <button onClick={onSave} style={{ flex: 2, padding: '10px', borderRadius: 10, background: 'var(--c-ink)', color: '#fff', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer' }}>{isNew ? 'Add opportunity' : 'Save changes'}</button>
          </div>
        </div>
      </div>
    </ModalPortal>
  )
}
