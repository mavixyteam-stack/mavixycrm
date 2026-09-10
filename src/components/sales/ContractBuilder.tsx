'use client'
import { useState } from 'react'
import { useApp, useToast, useUpsertContract, useDeleteContract } from '@/lib/store'
import { ModalPortal } from '@/components/ui/ModalPortal'
import { X } from '@/components/ui/Icon'
import { makeContractToken, defaultContractBody } from '@/lib/contract'
import type { Journey, Contract } from '@/types'

function blankContract(j: Journey, createdBy?: string | null): Contract {
  return {
    id: (globalThis.crypto?.randomUUID?.() ?? String(Date.now())),
    journey_id: j.id,
    token: makeContractToken(),
    title: `Service Agreement — ${j.company || j.name || 'Client'}`,
    company: j.company || null,
    client_name: j.name || null,
    contact_email: j.contact_email || null,
    body: defaultContractBody(j),
    status: 'draft',
    created_by: createdBy || null,
    created_at: new Date().toISOString(),
  }
}

export default function ContractBuilder({ journey, existing, onClose }: {
  journey: Journey; existing: Contract | null; onClose: () => void
}) {
  const { state } = useApp()
  const toast = useToast()
  const upsert = useUpsertContract()
  const remove = useDeleteContract()
  const me = state.currentUser?.id

  const [c, setC] = useState<Contract>(existing || blankContract(journey, me))
  const [busy, setBusy] = useState(false)
  const set = (patch: Partial<Contract>) => setC(prev => ({ ...prev, ...patch }))

  async function persist(): Promise<Contract> { await upsert(c); return c }

  async function save() {
    if (!c.title.trim()) { toast('Add a title'); return }
    setBusy(true)
    try { await persist(); toast('Agreement saved'); onClose() } finally { setBusy(false) }
  }
  async function copyLink() {
    setBusy(true)
    try { await persist(); try { await navigator.clipboard.writeText(`${window.location.origin}/contract/${c.token}`) } catch { /* ignore */ } toast('Signing link copied ✓') } finally { setBusy(false) }
  }
  async function sendEmail() {
    const email = window.prompt('Send the agreement to which email?', journey.contact_email || c.contact_email || '')
    if (!email) return
    setBusy(true)
    try {
      await persist()
      const res = await fetch('/api/contracts/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: c.token, email }) })
      const d = await res.json().catch(() => ({}))
      if (res.ok) { set({ status: 'sent', sent_at: new Date().toISOString() }); toast(`Sent to ${email} ✓`) }
      else toast(`Couldn't send: ${d.error || 'error'}`)
    } finally { setBusy(false) }
  }
  async function del() {
    if (!existing) { onClose(); return }
    if (!window.confirm('Delete this agreement?')) return
    await remove(c.id); toast('Agreement deleted'); onClose()
  }

  const field = { width: '100%', border: '1.5px solid var(--c-border)', borderRadius: 10, padding: '10px 12px', fontSize: 14, boxSizing: 'border-box' as const, background: '#fff' }
  const lab = { fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block' as const, marginBottom: 5 }
  const signed = c.status === 'signed'

  return (
    <ModalPortal>
      <div onClick={onClose} className="modal-overlay">
        <div onClick={e => e.stopPropagation()}
          style={{ width: '100%', maxWidth: 640, background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--shadow-modal)', animation: 'popIn .22s cubic-bezier(.2,.9,.3,1) both', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--c-border-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17 }}>{existing ? 'Agreement' : 'New agreement'}</div>
              <div style={{ fontSize: 12.5, color: 'var(--c-faint)' }}>{journey.company || journey.name}</div>
            </div>
            <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--c-fill)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: 'none' }}><X size={13} color="var(--c-ghost)" /></button>
          </div>

          <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 13, overflowY: 'auto' }}>
            {signed && (
              <div style={{ background: '#D1FAE5', borderRadius: 10, padding: '11px 14px', fontSize: 13.5, color: '#065F46', fontWeight: 600 }}>
                ✅ Signed by {c.signer_name || 'the client'}{c.signed_at ? ` on ${new Date(c.signed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}.
              </div>
            )}
            <div><label style={lab}>Title</label><input value={c.title} onChange={e => set({ title: e.target.value })} style={field} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><label style={lab}>Client company</label><input value={c.company || ''} onChange={e => set({ company: e.target.value })} style={field} /></div>
              <div><label style={lab}>Client email</label><input value={c.contact_email || ''} onChange={e => set({ contact_email: e.target.value })} style={field} /></div>
            </div>
            <div>
              <label style={lab}>Agreement</label>
              <textarea value={c.body} onChange={e => set({ body: e.target.value })} rows={14}
                style={{ ...field, resize: 'vertical', lineHeight: 1.6, fontFamily: 'var(--font-body)', whiteSpace: 'pre-wrap' }} />
              <div style={{ fontSize: 11.5, color: 'var(--c-faint)', marginTop: 4 }}>Prefilled from the deal — edit freely. The client reads this and e-signs by typing their name.</div>
            </div>
          </div>

          <div style={{ padding: '14px 22px', borderTop: '1px solid var(--c-border-soft)', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button onClick={del} style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-faint)', background: 'none', border: 'none', cursor: 'pointer', padding: '9px 6px' }}>{existing ? 'Delete' : 'Cancel'}</button>
            <div style={{ flex: 1 }} />
            <button onClick={copyLink} disabled={busy} style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-ink-3)', background: '#fff', border: '1.5px solid var(--c-border)', borderRadius: 10, padding: '9px 14px', cursor: 'pointer' }}>Copy link</button>
            <button onClick={sendEmail} disabled={busy} style={{ fontSize: 13, fontWeight: 700, color: '#fff', background: '#0EA5E9', border: 'none', borderRadius: 10, padding: '9px 14px', cursor: 'pointer' }}>Send for signature</button>
            <button onClick={save} disabled={busy} style={{ fontSize: 13.5, fontWeight: 700, color: '#fff', background: 'var(--c-ink)', border: 'none', borderRadius: 10, padding: '9px 16px', cursor: 'pointer' }}>{busy ? 'Saving…' : 'Save'}</button>
          </div>
        </div>
      </div>
    </ModalPortal>
  )
}
