'use client'
import { useState } from 'react'
import { useApp, useToast, useUpsertProposal, useDeleteProposal } from '@/lib/store'
import { ModalPortal } from '@/components/ui/ModalPortal'
import { X } from '@/components/ui/Icon'
import { makeProposalToken, computeTotals, money, blankLineItem } from '@/lib/proposal'
import type { Journey, Proposal, ProposalLineItem } from '@/types'

function blankProposal(j: Journey, createdBy?: string | null): Proposal {
  return {
    id: (globalThis.crypto?.randomUUID?.() ?? String(Date.now())),
    journey_id: j.id,
    token: makeProposalToken(),
    title: `Proposal for ${j.company || j.name || 'your project'}`,
    company: j.company || null,
    client_name: j.name || null,
    intro: `Thanks for the conversation — here's how we'd approach ${j.service || 'this'} for ${j.company || 'you'}.`,
    line_items: [{ desc: j.service || 'Monthly retainer', qty: 1, rate: j.value || 0 }],
    currency: 'INR',
    tax_percent: 18,
    discount: 0,
    total: j.value || 0,
    terms: '50% advance to begin, balance on delivery. This proposal is valid for 14 days.',
    valid_until: null,
    status: 'draft',
    created_by: createdBy || null,
    created_at: new Date().toISOString(),
  }
}

export default function ProposalBuilder({ journey, existing, onClose }: {
  journey: Journey; existing: Proposal | null; onClose: () => void
}) {
  const { state } = useApp()
  const toast = useToast()
  const upsert = useUpsertProposal()
  const remove = useDeleteProposal()
  const me = state.currentUser?.id

  const [p, setP] = useState<Proposal>(existing || blankProposal(journey, me))
  const [busy, setBusy] = useState(false)
  const set = (patch: Partial<Proposal>) => setP(prev => ({ ...prev, ...patch }))

  const items = p.line_items || []
  const totals = computeTotals(items, p.tax_percent || 0, p.discount || 0)
  const cur = p.currency || 'INR'

  function setItem(i: number, patch: Partial<ProposalLineItem>) {
    set({ line_items: items.map((li, idx) => idx === i ? { ...li, ...patch } : li) })
  }
  function addItem() { set({ line_items: [...items, blankLineItem()] }) }
  function removeItem(i: number) { set({ line_items: items.filter((_, idx) => idx !== i) }) }

  async function persist(): Promise<Proposal> {
    const saved = { ...p, total: totals.total }
    setP(saved)
    await upsert(saved)
    return saved
  }

  async function saveDraft() {
    if (!p.title.trim()) { toast('Add a title'); return }
    setBusy(true)
    try { await persist(); toast('Proposal saved'); onClose() } finally { setBusy(false) }
  }

  async function copyLink() {
    setBusy(true)
    try {
      await persist()
      const link = `${window.location.origin}/proposal/${p.token}`
      try { await navigator.clipboard.writeText(link) } catch { /* ignore */ }
      toast('Share link copied ✓')
    } finally { setBusy(false) }
  }

  async function sendEmail() {
    const email = window.prompt('Send the proposal to which email?', journey.contact_email || '')
    if (!email) return
    setBusy(true)
    try {
      await persist()
      const res = await fetch('/api/proposals/send', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: p.token, email }),
      })
      const d = await res.json().catch(() => ({}))
      if (res.ok) { set({ status: 'sent', sent_at: new Date().toISOString() }); toast(`Sent to ${email} ✓`) }
      else toast(`Couldn't send: ${d.error || 'error'}`)
    } finally { setBusy(false) }
  }

  async function del() {
    if (!existing) { onClose(); return }
    if (!window.confirm('Delete this proposal?')) return
    await remove(p.id)
    toast('Proposal deleted'); onClose()
  }

  const field = { width: '100%', border: '1.5px solid var(--c-border)', borderRadius: 10, padding: '10px 12px', fontSize: 14, boxSizing: 'border-box' as const, background: '#fff' }
  const lab = { fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block' as const, marginBottom: 5 }

  return (
    <ModalPortal>
      <div onClick={onClose} className="modal-overlay">
        <div onClick={e => e.stopPropagation()}
          style={{ width: '100%', maxWidth: 620, background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--shadow-modal)', animation: 'popIn .22s cubic-bezier(.2,.9,.3,1) both', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--c-border-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17 }}>{existing ? 'Edit proposal' : 'Build proposal'}</div>
              <div style={{ fontSize: 12.5, color: 'var(--c-faint)' }}>{journey.company || journey.name}</div>
            </div>
            <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--c-fill)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: 'none' }}><X size={13} color="var(--c-ghost)" /></button>
          </div>

          {/* Body */}
          <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto' }}>
            <div><label style={lab}>Title</label><input value={p.title} onChange={e => set({ title: e.target.value })} style={field} /></div>
            <div><label style={lab}>Intro</label><textarea value={p.intro || ''} onChange={e => set({ intro: e.target.value })} rows={2} style={{ ...field, resize: 'vertical', lineHeight: 1.5 }} /></div>

            {/* Line items */}
            <div>
              <label style={lab}>Line items</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {items.map((li, i) => (
                  <div key={i} style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
                    <input value={li.desc} onChange={e => setItem(i, { desc: e.target.value })} placeholder="Description"
                      style={{ ...field, flex: 1 }} />
                    <input type="number" value={li.qty || ''} onChange={e => setItem(i, { qty: Number(e.target.value) || 0 })} title="Qty"
                      style={{ ...field, width: 56, padding: '10px 8px', textAlign: 'center' }} />
                    <input type="number" value={li.rate || ''} onChange={e => setItem(i, { rate: Number(e.target.value) || 0 })} title="Rate"
                      style={{ ...field, width: 92, padding: '10px 8px', textAlign: 'right' }} />
                    <div style={{ width: 92, textAlign: 'right', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{money((li.qty || 0) * (li.rate || 0), cur)}</div>
                    <button onClick={() => removeItem(i)} title="Remove" style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--c-fill)', border: 'none', cursor: 'pointer', color: 'var(--c-ghost)', flexShrink: 0 }}>×</button>
                  </div>
                ))}
              </div>
              <button onClick={addItem} style={{ marginTop: 8, fontSize: 13, fontWeight: 700, color: 'var(--c-accent)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0' }}>+ Add item</button>
            </div>

            {/* Money row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div><label style={lab}>Discount (₹)</label><input type="number" value={p.discount || ''} onChange={e => set({ discount: Number(e.target.value) || 0 })} style={field} /></div>
              <div><label style={lab}>Tax (%)</label><input type="number" value={p.tax_percent ?? ''} onChange={e => set({ tax_percent: Number(e.target.value) || 0 })} style={field} /></div>
              <div><label style={lab}>Valid until</label><input type="date" value={p.valid_until || ''} onChange={e => set({ valid_until: e.target.value || null })} style={field} /></div>
            </div>

            {/* Totals preview */}
            <div style={{ background: 'var(--c-fill-soft)', borderRadius: 12, padding: '12px 15px' }}>
              <Row label="Subtotal" value={money(totals.subtotal, cur)} />
              {totals.discount > 0 && <Row label="Discount" value={`− ${money(totals.discount, cur)}`} />}
              {(p.tax_percent || 0) > 0 && <Row label={`Tax (${p.tax_percent}%)`} value={money(totals.tax, cur)} />}
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, marginTop: 6, borderTop: '1.5px solid var(--c-border)', fontSize: 16, fontWeight: 800 }}>
                <span>Total</span><span>{money(totals.total, cur)}</span>
              </div>
            </div>

            <div><label style={lab}>Terms</label><textarea value={p.terms || ''} onChange={e => set({ terms: e.target.value })} rows={2} style={{ ...field, resize: 'vertical', lineHeight: 1.5 }} /></div>
          </div>

          {/* Footer */}
          <div style={{ padding: '14px 22px', borderTop: '1px solid var(--c-border-soft)', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button onClick={del} style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-faint)', background: 'none', border: 'none', cursor: 'pointer', padding: '9px 6px' }}>{existing ? 'Delete' : 'Cancel'}</button>
            <div style={{ flex: 1 }} />
            <button onClick={copyLink} disabled={busy} style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-ink-3)', background: '#fff', border: '1.5px solid var(--c-border)', borderRadius: 10, padding: '9px 14px', cursor: 'pointer' }}>Copy link</button>
            <button onClick={sendEmail} disabled={busy} style={{ fontSize: 13, fontWeight: 700, color: '#fff', background: '#0EA5E9', border: 'none', borderRadius: 10, padding: '9px 14px', cursor: 'pointer' }}>Send by email</button>
            <button onClick={saveDraft} disabled={busy} style={{ fontSize: 13.5, fontWeight: 700, color: '#fff', background: 'var(--c-ink)', border: 'none', borderRadius: 10, padding: '9px 16px', cursor: 'pointer' }}>{busy ? 'Saving…' : 'Save'}</button>
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
