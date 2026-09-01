'use client'
import { useEffect, useState, useCallback } from 'react'
import { useApp, useToast } from '@/lib/store'
import { Plus, X, Check } from '@/components/ui/Icon'
import { ModalPortal } from '@/components/ui/ModalPortal'

interface Invite {
  id: string; token: string; role: string; title: string | null; department: string | null; status: string
  work_email: string | null; full_name: string | null; personal_email: string | null
  phone: string | null; emergency_phone: string | null
  aadhar_number: string | null; pan_number: string | null
  aadhar_url: string | null; pan_url: string | null
  bank_account_number: string | null; bank_ifsc: string | null; bank_name: string | null; bank_branch: string | null
  m365_email: string | null; buddy_id: string | null; submitted_at: string | null; completed_at: string | null; created_at: string
}

const STATUS_STYLE: Record<string, { label: string; c: string; bg: string }> = {
  pending:   { label: 'Awaiting form', c: '#B07E0C', bg: '#FBF1D6' },
  submitted: { label: 'Ready to set up', c: '#7C3AED', bg: '#F3EEFE' },
  completed: { label: 'Onboarded', c: '#0E8C63', bg: '#E7FAF3' },
}

const ROLES = [
  { key: 'employee', label: 'Employee' },
  { key: 'sales', label: 'Sales' },
  { key: 'manager', label: 'Manager' },
]

export default function OnboardingScreen() {
  const { state } = useApp()
  const toast = useToast()
  const isOwner = ['owner', 'manager'].includes(state.currentUser?.role || '')

  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState({ personal_email: '', role: 'employee', department: '' })
  const [creating, setCreating] = useState(false)
  const [newLink, setNewLink] = useState<string | null>(null)
  const [detail, setDetail] = useState<Invite | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/onboarding/list')
      const d = await res.json()
      if (res.ok) setInvites(d.invites || [])
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  async function createInvite() {
    setCreating(true)
    try {
      const res = await fetch('/api/onboarding/create', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      setNewLink(d.link)
      load()
    } catch (e) { toast(e instanceof Error ? e.message : 'Failed') }
    setCreating(false)
  }

  if (!isOwner) {
    return <div style={{ maxWidth: 700, margin: '40px auto', textAlign: 'center', color: 'var(--c-subtle)' }}>Onboarding is available to owners and managers.</div>
  }

  const groups: { key: string; title: string }[] = [
    { key: 'submitted', title: 'Ready to set up' },
    { key: 'pending', title: 'Awaiting the candidate' },
    { key: 'completed', title: 'Onboarded' },
  ]

  return (
    <div style={{ maxWidth: 820, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 4 }}>Onboarding</h1>
          <p style={{ fontSize: 14, color: 'var(--c-subtle)' }}>Invite a new hire, collect their details, and set up their accounts.</p>
        </div>
        <button onClick={() => { setForm({ personal_email: '', role: 'employee', department: '' }); setNewLink(null); setCreateOpen(true) }}
          style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'var(--c-accent)', color: '#fff', borderRadius: 10, padding: '10px 16px', fontWeight: 700, fontSize: 13.5, border: 'none', cursor: 'pointer' }}>
          <Plus size={14} color="#fff" />New onboarding
        </button>
      </div>

      {loading ? (
        <div style={{ color: 'var(--c-faint)', padding: 40, textAlign: 'center' }}>Loading…</div>
      ) : invites.length === 0 ? (
        <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 16, padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>🚀</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No one's being onboarded yet</div>
          <div style={{ fontSize: 13, color: 'var(--c-subtle)' }}>Click "New onboarding" to generate a link and send it to your new hire.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
          {groups.map(g => {
            const rows = invites.filter(i => i.status === g.key)
            if (rows.length === 0) return null
            return (
              <div key={g.key}>
                <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: 'var(--c-faint)', marginBottom: 10 }}>{g.title} · {rows.length}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {rows.map(inv => {
                    const st = STATUS_STYLE[inv.status]
                    return (
                      <div key={inv.id} style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 14, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                            <span style={{ fontSize: 14.5, fontWeight: 700 }}>{inv.full_name || 'Pending candidate'}</span>
                            <span style={{ fontSize: 11, fontWeight: 700, color: st.c, background: st.bg, borderRadius: 6, padding: '2px 8px' }}>{st.label}</span>
                          </div>
                          <div style={{ fontSize: 12.5, color: 'var(--c-subtle)' }}>
                            {inv.title || inv.role}{inv.work_email ? ` · ${inv.work_email}` : ''}{inv.personal_email ? ` · ${inv.personal_email}` : ''}
                          </div>
                        </div>
                        {inv.status === 'pending' && (
                          <button onClick={() => { navigator.clipboard?.writeText(`${window.location.origin}/onboard/${inv.token}`); toast('Link copied') }}
                            style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--c-ink)', background: 'var(--c-fill)', border: '1px solid var(--c-border)', borderRadius: 9, padding: '7px 12px', cursor: 'pointer' }}>Copy link</button>
                        )}
                        {inv.status === 'submitted' && (
                          <button onClick={() => setDetail(inv)}
                            style={{ fontSize: 12.5, fontWeight: 700, color: '#fff', background: 'var(--c-accent)', border: 'none', borderRadius: 9, padding: '8px 14px', cursor: 'pointer' }}>Review &amp; set up</button>
                        )}
                        {inv.status === 'completed' && (
                          <button onClick={() => setDetail(inv)}
                            style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--c-subtle)', background: 'var(--c-fill)', border: '1px solid var(--c-border)', borderRadius: 9, padding: '7px 12px', cursor: 'pointer' }}>View</button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create modal */}
      {createOpen && (
        <ModalPortal><div onClick={() => setCreateOpen(false)} className="modal-overlay">
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 440, background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--shadow-modal)', animation: 'popIn .22s cubic-bezier(.2,.9,.3,1) both' }}>
            <div style={{ padding: '20px 22px', borderBottom: '1px solid var(--c-border-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17 }}>New onboarding</div>
              <button onClick={() => setCreateOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={16} color="var(--c-ghost)" /></button>
            </div>
            {!newLink ? (
              <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 6 }}>Candidate's personal email <span style={{ color: '#EF4444' }}>*</span></label>
                  <input type="email" value={form.personal_email} onChange={e => setForm(f => ({ ...f, personal_email: e.target.value }))} placeholder="newhire@gmail.com"
                    style={{ width: '100%', border: '1.5px solid var(--c-border)', borderRadius: 10, padding: '10px 12px', fontSize: 14, boxSizing: 'border-box' }} />
                  <div style={{ fontSize: 11.5, color: 'var(--c-faint)', marginTop: 4 }}>The onboarding link is emailed here automatically.</div>
                </div>
                <div>
                  <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 8 }}>Role</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {ROLES.map(r => (
                      <button key={r.key} onClick={() => setForm(f => ({ ...f, role: r.key }))}
                        style={{ flex: 1, padding: '9px', borderRadius: 10, fontSize: 13, fontWeight: 700, border: `1.5px solid ${form.role === r.key ? 'var(--c-accent)' : 'var(--c-border)'}`, color: form.role === r.key ? 'var(--c-accent)' : 'var(--c-muted)', background: form.role === r.key ? 'rgba(255,92,31,.06)' : '#fff', cursor: 'pointer' }}>{r.label}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 6 }}>Department</label>
                  <input value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} placeholder="e.g. Social Media, Performance, Design"
                    style={{ width: '100%', border: '1.5px solid var(--c-border)', borderRadius: 10, padding: '10px 12px', fontSize: 14, boxSizing: 'border-box' }} />
                </div>
                <button onClick={createInvite} disabled={creating || !form.personal_email.trim()}
                  style={{ padding: '12px', borderRadius: 11, background: 'var(--c-ink)', color: '#fff', fontSize: 14, fontWeight: 700, border: 'none', cursor: creating || !form.personal_email.trim() ? 'default' : 'pointer', opacity: creating || !form.personal_email.trim() ? .6 : 1 }}>
                  {creating ? 'Sending invite…' : 'Send onboarding invite'}
                </button>
              </div>
            ) : (
              <div style={{ padding: '22px', textAlign: 'center' }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--c-green-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <Check size={22} color="var(--c-green)" />
                </div>
                <div style={{ fontSize: 15.5, fontWeight: 700, marginBottom: 6 }}>Invite sent 🎉</div>
                <div style={{ fontSize: 13, color: 'var(--c-subtle)', marginBottom: 16 }}>We emailed the onboarding link to the candidate. You can also share it directly below.</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input readOnly value={newLink} style={{ flex: 1, border: '1.5px solid var(--c-border)', borderRadius: 10, padding: '10px 12px', fontSize: 12.5, background: 'var(--c-fill)', boxSizing: 'border-box' }} />
                  <button onClick={() => { navigator.clipboard?.writeText(newLink); toast('Link copied') }}
                    style={{ background: 'var(--c-accent)', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Copy</button>
                </div>
              </div>
            )}
          </div>
        </div></ModalPortal>
      )}

      {detail && <DetailModal invite={detail} onClose={() => setDetail(null)} onDone={() => { setDetail(null); load() }} toast={toast} />}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string | null }) {
  if (!value) return null
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '9px 0', borderBottom: '1px solid var(--c-border-soft)' }}>
      <span style={{ fontSize: 12.5, color: 'var(--c-faint)' }}>{label}</span>
      <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--c-ink)', textAlign: 'right' }}>{value}</span>
    </div>
  )
}

function DetailModal({ invite, onClose, onDone, toast }: { invite: Invite; onClose: () => void; onDone: () => void; toast: (m: string) => void }) {
  const { state } = useApp()
  const [m365Email, setM365Email] = useState(invite.work_email || '')
  const [password, setPassword] = useState('')
  const [buddyId, setBuddyId] = useState(invite.buddy_id || '')
  const [saving, setSaving] = useState(false)
  const done = invite.status === 'completed'
  const buddy = state.users.find(u => u.id === invite.buddy_id)

  async function complete() {
    if (!m365Email || password.length < 8) { toast('Enter the work email and a password (8+ chars)'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/onboarding/complete', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: invite.token, m365_email: m365Email, m365_password: password, buddy_id: buddyId || null }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      toast(`Account created — welcome email sent to ${invite.personal_email}`)
      onDone()
    } catch (e) { toast(e instanceof Error ? e.message : 'Failed') }
    setSaving(false)
  }

  return (
    <ModalPortal><div onClick={onClose} className="modal-overlay">
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 480, maxHeight: '86vh', display: 'flex', flexDirection: 'column', background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--shadow-modal)', animation: 'popIn .22s cubic-bezier(.2,.9,.3,1) both' }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--c-border-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17 }}>{invite.full_name}</div>
            <div style={{ fontSize: 12.5, color: 'var(--c-faint)' }}>{invite.title || invite.role}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={16} color="var(--c-ghost)" /></button>
        </div>

        <div style={{ overflowY: 'auto', padding: '18px 22px' }}>
          <Row label="Personal email" value={invite.personal_email} />
          <Row label="Phone" value={invite.phone} />
          <Row label="Emergency" value={invite.emergency_phone} />
          <Row label="Aadhaar" value={invite.aadhar_number} />
          <Row label="PAN" value={invite.pan_number} />
          <Row label="Bank account" value={invite.bank_account_number} />
          <Row label="IFSC" value={invite.bank_ifsc} />
          <Row label="Bank" value={[invite.bank_name, invite.bank_branch].filter(Boolean).join(' · ') || null} />

          {(invite.aadhar_url || invite.pan_url) && (
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              {invite.aadhar_url && <a href={invite.aadhar_url} target="_blank" rel="noreferrer" style={{ flex: 1, textAlign: 'center', fontSize: 12.5, fontWeight: 600, color: 'var(--c-accent)', background: 'var(--c-accent-bg)', borderRadius: 9, padding: '9px', textDecoration: 'none' }}>View Aadhaar</a>}
              {invite.pan_url && <a href={invite.pan_url} target="_blank" rel="noreferrer" style={{ flex: 1, textAlign: 'center', fontSize: 12.5, fontWeight: 600, color: 'var(--c-accent)', background: 'var(--c-accent-bg)', borderRadius: 9, padding: '9px', textDecoration: 'none' }}>View PAN</a>}
            </div>
          )}

          {done ? (
            <div style={{ marginTop: 18, background: 'var(--c-green-bg)', border: '1px solid var(--c-green-border)', borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--c-green)', marginBottom: 3 }}>✓ Onboarded</div>
              <div style={{ fontSize: 12.5, color: 'var(--c-green)' }}>Account: {invite.m365_email} · welcome email sent to {invite.personal_email}{buddy ? ` · buddy: ${buddy.name}` : ''}</div>
            </div>
          ) : (
            <div style={{ marginTop: 18, background: 'var(--c-fill)', borderRadius: 12, padding: '16px' }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Finish onboarding</div>
              <div style={{ fontSize: 12.5, color: 'var(--c-subtle)', marginBottom: 14, lineHeight: 1.5 }}>
                Create their M365 account externally first, then enter the login here. We'll create their Mavixy account and email the welcome pack to <strong>{invite.personal_email}</strong>.
              </div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 5 }}>Work email (M365 ID)</label>
              <input value={m365Email} onChange={e => setM365Email(e.target.value)} style={{ width: '100%', border: '1.5px solid var(--c-border)', borderRadius: 10, padding: '10px 12px', fontSize: 14, boxSizing: 'border-box', marginBottom: 12 }} />
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 5 }}>Temporary password</label>
              <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 8 characters" style={{ width: '100%', border: '1.5px solid var(--c-border)', borderRadius: 10, padding: '10px 12px', fontSize: 14, boxSizing: 'border-box', marginBottom: 12 }} />
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 5 }}>Onboarding buddy</label>
              <select value={buddyId} onChange={e => setBuddyId(e.target.value)}
                style={{ width: '100%', border: '1.5px solid var(--c-border)', borderRadius: 10, padding: '10px 12px', fontSize: 14, boxSizing: 'border-box', background: '#fff', cursor: 'pointer' }}>
                <option value="">No buddy</option>
                {state.users.map(u => <option key={u.id} value={u.id}>{u.name}{u.title ? ` · ${u.title}` : ''}</option>)}
              </select>
              <button onClick={complete} disabled={saving}
                style={{ width: '100%', marginTop: 14, padding: '12px', borderRadius: 11, background: 'var(--c-accent)', color: '#fff', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer', opacity: saving ? .6 : 1 }}>
                {saving ? 'Setting up…' : 'Create account & send welcome email'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div></ModalPortal>
  )
}
