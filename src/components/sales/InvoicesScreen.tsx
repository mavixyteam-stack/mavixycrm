'use client'
import { useState, useMemo } from 'react'
import { useApp, useToast, useUpsertInvoice, useDeleteInvoice } from '@/lib/store'
import { ModalPortal } from '@/components/ui/ModalPortal'
import { X } from '@/components/ui/Icon'
import { inr } from '@/lib/journey'
import {
  INVOICE_STATUS, derivedStatus, balanceDue, isOverdue, daysUntilDue,
  nextInvoiceNumber, makeInvoiceToken, computeTotals, money,
} from '@/lib/invoice'
import type { Invoice, ProposalLineItem } from '@/types'

const todayISO = () => new Date().toISOString().slice(0, 10)
const addDays = (iso: string, n: number) => { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10) }

type Filter = 'all' | 'outstanding' | 'overdue' | 'paid' | 'draft'

export default function InvoicesScreen() {
  const { state } = useApp()
  const toast = useToast()
  const upsert = useUpsertInvoice()
  const remove = useDeleteInvoice()
  const me = state.currentUser?.id

  const [editing, setEditing] = useState<Invoice | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [filter, setFilter] = useState<Filter>('all')
  const [busyId, setBusyId] = useState<string | null>(null)

  const all = state.invoices

  const stats = useMemo(() => {
    const monthPrefix = todayISO().slice(0, 7)
    let outstanding = 0, overdue = 0, paidThisMonth = 0, drafts = 0
    for (const inv of all) {
      const ds = derivedStatus(inv)
      if (ds === 'draft') drafts++
      if (ds !== 'draft' && ds !== 'paid') outstanding += balanceDue(inv)
      if (ds === 'overdue') overdue += balanceDue(inv)
      if ((inv.paid_at || '').slice(0, 7) === monthPrefix) paidThisMonth += (inv.amount_paid || inv.total || 0)
    }
    return { outstanding, overdue, paidThisMonth, drafts }
  }, [all])

  const shown = useMemo(() => {
    const rows = [...all].sort((a, b) => (a.due_date || '9999') < (b.due_date || '9999') ? -1 : 1)
    if (filter === 'all') return rows
    return rows.filter(inv => {
      const ds = derivedStatus(inv)
      if (filter === 'outstanding') return ds === 'sent' || ds === 'partial' || ds === 'overdue'
      if (filter === 'overdue') return ds === 'overdue'
      if (filter === 'paid') return ds === 'paid'
      if (filter === 'draft') return ds === 'draft'
      return true
    })
  }, [all, filter])

  function openNew() {
    const iso = todayISO()
    setEditing({
      id: (globalThis.crypto?.randomUUID?.() ?? String(Date.now())),
      number: nextInvoiceNumber(all), token: makeInvoiceToken(),
      company: '', client_name: '', contact_email: '',
      line_items: [{ desc: '', qty: 1, rate: 0 }], currency: 'INR',
      tax_percent: 18, discount: 0, total: 0, amount_paid: 0,
      notes: 'Payment due within 7 days. Bank transfer details on request.',
      issue_date: iso, due_date: addDays(iso, 7), status: 'draft',
      created_by: me, created_at: new Date().toISOString(),
    })
    setIsNew(true)
  }
  function openEdit(inv: Invoice) { setEditing({ ...inv }); setIsNew(false) }

  async function markPaid(inv: Invoice) {
    setBusyId(inv.id)
    try { await upsert({ ...inv, amount_paid: inv.total, status: 'paid', paid_at: new Date().toISOString() }); toast('Marked paid ✓') }
    finally { setBusyId(null) }
  }

  async function sendOrRemind(inv: Invoice, reminder: boolean) {
    if (!inv.contact_email) { toast('Add a client email first (edit the invoice)'); return }
    setBusyId(inv.id)
    try {
      const res = await fetch('/api/invoices/send', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: inv.token, reminder }),
      })
      const d = await res.json().catch(() => ({}))
      if (res.ok) {
        await upsert({ ...inv, status: inv.status === 'draft' ? 'sent' : inv.status, sent_at: inv.sent_at || new Date().toISOString(), last_reminder_at: reminder ? new Date().toISOString() : inv.last_reminder_at })
        toast(reminder ? 'Reminder sent ✓' : 'Invoice sent ✓')
      } else toast(`Couldn't send: ${d.error || 'error'}`)
    } finally { setBusyId(null) }
  }

  async function copyLink(inv: Invoice) {
    try { await navigator.clipboard.writeText(`${window.location.origin}/invoice/${inv.token}`); toast('Invoice link copied ✓') } catch { toast('Copy failed') }
  }

  async function del(inv: Invoice) {
    if (!window.confirm(`Delete ${inv.number}? This can't be undone.`)) return
    await remove(inv.id); toast('Deleted')
  }

  const FILTERS: { key: Filter; label: string }[] = [
    { key: 'all', label: 'All' }, { key: 'outstanding', label: 'Outstanding' },
    { key: 'overdue', label: 'Overdue' }, { key: 'paid', label: 'Paid' }, { key: 'draft', label: 'Drafts' },
  ]

  return (
    <div style={{ animation: 'fadeIn .4s ease both' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, marginBottom: 18, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--c-faint)', marginBottom: 7 }}>Invoices</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em' }}>Get paid on time</h1>
        </div>
        <button onClick={openNew}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'var(--c-accent)', color: '#fff', borderRadius: 11, padding: '10px 16px', fontWeight: 700, fontSize: 13.5, border: 'none', cursor: 'pointer' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          New invoice
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          { label: 'Outstanding', val: inr(stats.outstanding), c: '#0F172A' },
          { label: 'Overdue', val: inr(stats.overdue), c: '#EF4444' },
          { label: 'Collected this month', val: inr(stats.paidThisMonth), c: '#10B981' },
          { label: 'Drafts', val: String(stats.drafts), c: '#64748B' },
        ].map(s => (
          <div key={s.label} style={{ flex: '1 1 160px', background: '#fff', border: '1px solid var(--c-border)', borderRadius: 14, padding: '13px 15px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-faint)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: s.c, lineHeight: 1 }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 3, background: 'var(--c-fill)', borderRadius: 10, padding: 3, marginBottom: 14, width: 'fit-content' }}>
        {FILTERS.map(f => {
          const sel = filter === f.key
          return (
            <button key={f.key} onClick={() => setFilter(f.key)}
              style={{ padding: '6px 14px', borderRadius: 7, fontSize: 12.5, fontWeight: 700, background: sel ? '#fff' : 'transparent', color: sel ? 'var(--c-ink)' : 'var(--c-muted)', boxShadow: sel ? '0 1px 3px rgba(0,0,0,.1)' : 'none', border: 'none', cursor: 'pointer' }}>
              {f.label}
            </button>
          )
        })}
      </div>

      {/* List */}
      {shown.length === 0 ? (
        <div style={{ background: '#fff', border: '1px dashed var(--c-rule)', borderRadius: 18, padding: '48px 20px', textAlign: 'center' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, marginBottom: 6 }}>No invoices here</h3>
          <p style={{ margin: '0 auto 18px', color: 'var(--c-subtle)', fontSize: 14, maxWidth: '40ch' }}>Raise an invoice, share the link, and let the reminders chase the payment for you.</p>
          <button onClick={openNew} style={{ background: 'var(--c-ink)', color: '#fff', borderRadius: 11, padding: '11px 18px', fontWeight: 600, fontSize: 14, border: 'none', cursor: 'pointer' }}>New invoice</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {shown.map(inv => {
            const ds = derivedStatus(inv)
            const st = INVOICE_STATUS[ds]
            const bal = balanceDue(inv)
            const dd = daysUntilDue(inv)
            const dueLabel = !inv.due_date ? '' : ds === 'paid' ? 'Paid' : isOverdue(inv) ? `${Math.abs(dd || 0)}d overdue` : dd === 0 ? 'Due today' : dd && dd > 0 ? `Due in ${dd}d` : ''
            const busy = busyId === inv.id
            return (
              <div key={inv.id} style={{ background: '#fff', border: `1px solid ${ds === 'overdue' ? '#FCA5A580' : 'var(--c-border)'}`, borderRadius: 13, padding: '13px 15px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <div style={{ minWidth: 150, flex: '1 1 200px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700 }}>{inv.number}</span>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: st.c, background: st.bg, borderRadius: 6, padding: '2px 8px' }}>{st.label}</span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--c-subtle)', marginTop: 3 }}>{inv.company || inv.client_name || 'No client'}</div>
                </div>
                <div style={{ textAlign: 'right', minWidth: 110 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 800 }}>{money(inv.total, inv.currency || 'INR')}</div>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: ds === 'overdue' ? '#DC2626' : 'var(--c-faint)' }}>
                    {dueLabel}{bal > 0 && bal !== inv.total ? ` · ${money(bal, inv.currency || 'INR')} due` : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  {ds !== 'paid' && <ActionBtn onClick={() => sendOrRemind(inv, ds !== 'draft')} disabled={busy}>{ds === 'draft' ? 'Send' : 'Remind'}</ActionBtn>}
                  {ds !== 'paid' && <ActionBtn onClick={() => markPaid(inv)} disabled={busy} accent>Mark paid</ActionBtn>}
                  <IconBtn title="Copy link" onClick={() => copyLink(inv)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" /></svg>
                  </IconBtn>
                  <IconBtn title="Edit" onClick={() => openEdit(inv)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>
                  </IconBtn>
                  <IconBtn title="Delete" onClick={() => del(inv)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></svg>
                  </IconBtn>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {editing && (
        <InvoiceForm
          inv={editing} isNew={isNew}
          links={buildLinks(state)}
          onChange={setEditing}
          onCancel={() => setEditing(null)}
          onSave={async () => {
            const totals = computeTotals(editing.line_items, editing.tax_percent || 0, editing.discount || 0)
            const status: Invoice['status'] = (editing.amount_paid || 0) >= totals.total && totals.total > 0 ? 'paid'
              : (editing.amount_paid || 0) > 0 ? 'partial' : editing.status
            await upsert({ ...editing, total: totals.total, status, paid_at: status === 'paid' ? (editing.paid_at || new Date().toISOString()) : editing.paid_at })
            setEditing(null); toast(isNew ? 'Invoice created' : 'Saved')
          }}
        />
      )}
    </div>
  )
}

function ActionBtn({ children, onClick, disabled, accent }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; accent?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ fontSize: 12.5, fontWeight: 700, color: accent ? '#fff' : 'var(--c-ink-3)', background: accent ? 'var(--c-ink)' : '#fff', border: accent ? 'none' : '1.5px solid var(--c-border)', borderRadius: 9, padding: '7px 12px', cursor: disabled ? 'default' : 'pointer', opacity: disabled ? .6 : 1 }}>
      {children}
    </button>
  )
}
function IconBtn({ children, onClick, title }: { children: React.ReactNode; onClick: () => void; title: string }) {
  return (
    <button onClick={onClick} title={title}
      style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--c-fill)', border: 'none', cursor: 'pointer', color: 'var(--c-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {children}
    </button>
  )
}

// Build the "Bill to" quick-pick list from active journeys + clients.
function buildLinks(state: ReturnType<typeof useApp>['state']) {
  const fromJourneys = state.journeys
    .filter(j => j.stage === 'active' || j.stage === 'onboarding' || j.stage === 'contract')
    .map(j => ({ key: `j:${j.id}`, label: `${j.company || j.name}`, company: j.company || j.name, client_name: j.name || '', email: j.contact_email || '', journey_id: j.id, client_id: null as string | null }))
  const fromClients = state.clients.map(c => ({ key: `c:${c.id}`, label: c.name, company: c.name, client_name: c.contact_name || '', email: c.contact_email || '', journey_id: null as string | null, client_id: c.id }))
  return [...fromJourneys, ...fromClients]
}

// ─── Create / edit form ───────────────────────────────────────────────────────
function InvoiceForm({ inv, isNew, links, onChange, onCancel, onSave }: {
  inv: Invoice; isNew: boolean
  links: { key: string; label: string; company: string; client_name: string; email: string; journey_id: string | null; client_id: string | null }[]
  onChange: (i: Invoice) => void; onCancel: () => void; onSave: () => void
}) {
  const set = (patch: Partial<Invoice>) => onChange({ ...inv, ...patch })
  const items = inv.line_items || []
  const totals = computeTotals(items, inv.tax_percent || 0, inv.discount || 0)
  const cur = inv.currency || 'INR'
  const setItem = (i: number, patch: Partial<ProposalLineItem>) => set({ line_items: items.map((li, idx) => idx === i ? { ...li, ...patch } : li) })

  const field = { width: '100%', border: '1.5px solid var(--c-border)', borderRadius: 10, padding: '10px 12px', fontSize: 14, boxSizing: 'border-box' as const, background: '#fff' }
  const lab = { fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block' as const, marginBottom: 5 }

  return (
    <ModalPortal>
      <div onClick={onCancel} className="modal-overlay">
        <div onClick={e => e.stopPropagation()}
          style={{ width: '100%', maxWidth: 640, background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--shadow-modal)', animation: 'popIn .22s cubic-bezier(.2,.9,.3,1) both', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--c-border-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17 }}>{isNew ? 'New invoice' : 'Edit invoice'} · {inv.number}</div>
            <button onClick={onCancel} style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--c-fill)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: 'none' }}><X size={13} color="var(--c-ghost)" /></button>
          </div>

          <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 13, overflowY: 'auto' }}>
            {/* Bill to */}
            {links.length > 0 && (
              <div>
                <label style={lab}>Bill to (quick-pick)</label>
                <select value="" onChange={e => { const l = links.find(x => x.key === e.target.value); if (l) set({ company: l.company, client_name: l.client_name, contact_email: l.email, journey_id: l.journey_id, client_id: l.client_id }) }} style={field}>
                  <option value="">Pick a client / active deal…</option>
                  {links.map(l => <option key={l.key} value={l.key}>{l.label}</option>)}
                </select>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><label style={lab}>Company</label><input value={inv.company || ''} onChange={e => set({ company: e.target.value })} style={field} /></div>
              <div><label style={lab}>Contact name</label><input value={inv.client_name || ''} onChange={e => set({ client_name: e.target.value })} style={field} /></div>
              <div><label style={lab}>Client email</label><input value={inv.contact_email || ''} onChange={e => set({ contact_email: e.target.value })} placeholder="billing@client.com" style={field} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div><label style={lab}>Issue</label><input type="date" value={inv.issue_date || ''} onChange={e => set({ issue_date: e.target.value })} style={field} /></div>
                <div><label style={lab}>Due</label><input type="date" value={inv.due_date || ''} onChange={e => set({ due_date: e.target.value })} style={field} /></div>
              </div>
            </div>

            {/* Line items */}
            <div>
              <label style={lab}>Line items</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {items.map((li, i) => (
                  <div key={i} style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
                    <input value={li.desc} onChange={e => setItem(i, { desc: e.target.value })} placeholder="Description" style={{ ...field, flex: 1 }} />
                    <input type="number" value={li.qty || ''} onChange={e => setItem(i, { qty: Number(e.target.value) || 0 })} title="Qty" style={{ ...field, width: 54, padding: '10px 8px', textAlign: 'center' }} />
                    <input type="number" value={li.rate || ''} onChange={e => setItem(i, { rate: Number(e.target.value) || 0 })} title="Rate" style={{ ...field, width: 90, padding: '10px 8px', textAlign: 'right' }} />
                    <div style={{ width: 90, textAlign: 'right', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{money((li.qty || 0) * (li.rate || 0), cur)}</div>
                    <button onClick={() => set({ line_items: items.filter((_, idx) => idx !== i) })} title="Remove" style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--c-fill)', border: 'none', cursor: 'pointer', color: 'var(--c-ghost)', flexShrink: 0 }}>×</button>
                  </div>
                ))}
              </div>
              <button onClick={() => set({ line_items: [...items, { desc: '', qty: 1, rate: 0 }] })} style={{ marginTop: 8, fontSize: 13, fontWeight: 700, color: 'var(--c-accent)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0' }}>+ Add item</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div><label style={lab}>Discount (₹)</label><input type="number" value={inv.discount || ''} onChange={e => set({ discount: Number(e.target.value) || 0 })} style={field} /></div>
              <div><label style={lab}>Tax (%)</label><input type="number" value={inv.tax_percent ?? ''} onChange={e => set({ tax_percent: Number(e.target.value) || 0 })} style={field} /></div>
              <div><label style={lab}>Amount paid (₹)</label><input type="number" value={inv.amount_paid || ''} onChange={e => set({ amount_paid: Number(e.target.value) || 0 })} style={field} /></div>
            </div>

            {/* Totals */}
            <div style={{ background: 'var(--c-fill-soft)', borderRadius: 12, padding: '12px 15px' }}>
              <Row label="Subtotal" value={money(totals.subtotal, cur)} />
              {totals.discount > 0 && <Row label="Discount" value={`− ${money(totals.discount, cur)}`} />}
              {(inv.tax_percent || 0) > 0 && <Row label={`Tax (${inv.tax_percent}%)`} value={money(totals.tax, cur)} />}
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, marginTop: 6, borderTop: '1.5px solid var(--c-border)', fontSize: 16, fontWeight: 800 }}>
                <span>Total</span><span>{money(totals.total, cur)}</span>
              </div>
              {(inv.amount_paid || 0) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 6, fontSize: 13.5, fontWeight: 700, color: '#10B981' }}>
                  <span>Balance due</span><span>{money(Math.max(0, totals.total - (inv.amount_paid || 0)), cur)}</span>
                </div>
              )}
            </div>

            <div><label style={lab}>Notes / payment terms</label><textarea value={inv.notes || ''} onChange={e => set({ notes: e.target.value })} rows={2} style={{ ...field, resize: 'vertical', lineHeight: 1.5 }} /></div>
          </div>

          <div style={{ padding: '14px 22px', borderTop: '1px solid var(--c-border-soft)', display: 'flex', gap: 10 }}>
            <button onClick={onCancel} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1.5px solid var(--c-border)', fontSize: 14, fontWeight: 600, color: 'var(--c-subtle)', background: '#fff', cursor: 'pointer' }}>Cancel</button>
            <button onClick={onSave} style={{ flex: 2, padding: '10px', borderRadius: 10, background: 'var(--c-ink)', color: '#fff', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer' }}>{isNew ? 'Create invoice' : 'Save changes'}</button>
          </div>
        </div>
      </div>
    </ModalPortal>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: 13.5, color: 'var(--c-subtle)' }}>
      <span>{label}</span><span style={{ fontWeight: 600, color: 'var(--c-ink)' }}>{value}</span>
    </div>
  )
}
