'use client'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'

type Status = 'loading' | 'pending' | 'submitted' | 'completed' | 'notfound'

const inputStyle: React.CSSProperties = {
  width: '100%', border: '1.5px solid var(--c-border)', borderRadius: 11,
  padding: '11px 13px', fontSize: 14.5, background: '#fff', boxSizing: 'border-box',
  color: 'var(--c-ink)', outline: 'none', transition: 'border-color .15s',
}
const labelStyle: React.CSSProperties = { fontSize: 12.5, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 6 }

function Field({ label, required, children, hint }: { label: string; required?: boolean; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label style={labelStyle}>{label}{required && <span style={{ color: '#EF4444' }}> *</span>}</label>
      {children}
      {hint && <div style={{ fontSize: 11.5, color: 'var(--c-faint)', marginTop: 4 }}>{hint}</div>}
    </div>
  )
}

export default function OnboardPage() {
  const params = useParams()
  const token = String(params.token || '')

  const [status, setStatus] = useState<Status>('loading')
  const [role, setRole] = useState('')
  const [title, setTitle] = useState('')
  const [department, setDepartment] = useState('')

  const [f, setF] = useState({
    full_name: '', personal_email: '', phone: '', emergency_phone: '',
    aadhar_number: '', pan_number: '',
    bank_account_number: '', bank_account_confirm: '', bank_ifsc: '', bank_name: '', bank_branch: '',
  })
  const set = (k: keyof typeof f, v: string) => setF(prev => ({ ...prev, [k]: v }))

  const [aadharPath, setAadharPath] = useState<string | null>(null)
  const [panPath, setPanPath] = useState<string | null>(null)
  const [uploading, setUploading] = useState<{ aadhar: boolean; pan: boolean }>({ aadhar: false, pan: false })
  const [ifscLoading, setIfscLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) return
    fetch(`/api/onboarding/${token}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => {
        setRole(d.role); setTitle(d.title || ''); setDepartment(d.department || '')
        if (d.personal_email) setF(prev => ({ ...prev, personal_email: d.personal_email }))
        setStatus(d.status === 'pending' ? 'pending' : d.status === 'submitted' ? 'submitted' : 'completed')
      })
      .catch(() => setStatus('notfound'))
  }, [token])

  // IFSC → bank + branch
  async function lookupIfsc(code: string) {
    const c = code.trim().toUpperCase()
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(c)) return
    setIfscLoading(true)
    try {
      const res = await fetch(`https://ifsc.razorpay.com/${c}`)
      if (res.ok) {
        const d = await res.json()
        setF(prev => ({ ...prev, bank_name: d.BANK || '', bank_branch: [d.BRANCH, d.CITY].filter(Boolean).join(', ') }))
      } else {
        setF(prev => ({ ...prev, bank_name: '', bank_branch: '' }))
      }
    } catch { /* ignore */ }
    setIfscLoading(false)
  }

  async function uploadDoc(kind: 'aadhar' | 'pan', file: File) {
    setUploading(u => ({ ...u, [kind]: true })); setError('')
    const fd = new FormData()
    fd.append('token', token); fd.append('kind', kind); fd.append('file', file)
    try {
      const res = await fetch('/api/onboarding/upload', { method: 'POST', body: fd })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Upload failed')
      if (kind === 'aadhar') setAadharPath(d.path); else setPanPath(d.path)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    }
    setUploading(u => ({ ...u, [kind]: false }))
  }

  const accountMismatch = f.bank_account_confirm.length > 0 && f.bank_account_number !== f.bank_account_confirm

  const canSubmit = useMemo(() =>
    f.full_name.trim() && f.personal_email.trim() && f.phone.trim() && !accountMismatch && !submitting,
    [f, accountMismatch, submitting])

  async function submit() {
    setSubmitting(true); setError('')
    try {
      const res = await fetch('/api/onboarding/submit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...f, token, aadhar_path: aadharPath, pan_path: panPath }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Submission failed')
      setStatus('submitted')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Submission failed')
    }
    setSubmitting(false)
  }

  // ── Shells ──────────────────────────────────────────────────────────────────
  const Shell = ({ children }: { children: React.ReactNode }) => (
    <div style={{ minHeight: '100vh', background: 'var(--c-bg)', display: 'flex', justifyContent: 'center', padding: '40px 18px', fontFamily: 'var(--font-body)' }}>
      <div style={{ width: '100%', maxWidth: 560 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, color: 'var(--c-ink)' }}>mavixy<span style={{ color: 'var(--c-accent)' }}>.</span></span>
        </div>
        {children}
      </div>
    </div>
  )

  const Card = ({ children }: { children: React.ReactNode }) => (
    <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 20, padding: 28, boxShadow: 'var(--shadow-card)' }}>{children}</div>
  )

  if (status === 'loading') return <Shell><Card><div style={{ textAlign: 'center', color: 'var(--c-faint)', padding: 20 }}>Loading…</div></Card></Shell>

  if (status === 'notfound') return (
    <Shell><Card>
      <div style={{ textAlign: 'center', padding: '10px 0' }}>
        <div style={{ fontSize: 34, marginBottom: 10 }}>🔗</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>This link isn't valid</h1>
        <p style={{ fontSize: 14, color: 'var(--c-subtle)' }}>Ask your HR contact for a fresh onboarding link.</p>
      </div>
    </Card></Shell>
  )

  if (status === 'submitted' || status === 'completed') return (
    <Shell><Card>
      <div style={{ textAlign: 'center', padding: '10px 0' }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--c-green-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--c-green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 21, fontWeight: 700, marginBottom: 8 }}>All done — thank you! 🎉</h1>
        <p style={{ fontSize: 14.5, color: 'var(--c-subtle)', lineHeight: 1.6 }}>
          Your details are in. Our team will set up your accounts and email your login to your personal inbox shortly.
        </p>
      </div>
    </Card></Shell>
  )

  // ── The form ────────────────────────────────────────────────────────────────
  return (
    <Shell>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 6 }}>Welcome aboard 👋</h1>
        <p style={{ fontSize: 14.5, color: 'var(--c-subtle)', lineHeight: 1.6 }}>
          Fill in your details to get set up{department ? ` in ${department}` : ''}{title ? ` as ${title}` : role ? ` (${role})` : ''}. It takes about 3 minutes. Everything is kept private and used only for your employment records.
        </p>
      </div>

      <Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          <Section label="Personal details" />
          <Field label="Full name" required>
            <input style={inputStyle} value={f.full_name} onChange={e => set('full_name', e.target.value)} placeholder="As per your Aadhaar" />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="Personal email" required>
              <input style={inputStyle} type="email" value={f.personal_email} onChange={e => set('personal_email', e.target.value)} placeholder="you@gmail.com" />
            </Field>
            <Field label="Phone number" required>
              <input style={inputStyle} value={f.phone} onChange={e => set('phone', e.target.value)} placeholder="+91 98765 43210" />
            </Field>
          </div>
          <Field label="Emergency contact number">
            <input style={inputStyle} value={f.emergency_phone} onChange={e => set('emergency_phone', e.target.value)} placeholder="Family member's number" />
          </Field>

          <Section label="Identity" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="Aadhaar number" hint="12 digits">
              <input style={inputStyle} value={f.aadhar_number} onChange={e => set('aadhar_number', e.target.value)} placeholder="1234 5678 9012" inputMode="numeric" />
            </Field>
            <Field label="PAN number" hint="e.g. ABCDE1234F">
              <input style={inputStyle} value={f.pan_number} onChange={e => set('pan_number', e.target.value.toUpperCase())} placeholder="ABCDE1234F" maxLength={10} />
            </Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <UploadBox label="Upload Aadhaar" done={!!aadharPath} loading={uploading.aadhar} onPick={f => uploadDoc('aadhar', f)} />
            <UploadBox label="Upload PAN" done={!!panPath} loading={uploading.pan} onPick={f => uploadDoc('pan', f)} />
          </div>

          <Section label="Bank details" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="Account number" required>
              <input style={inputStyle} value={f.bank_account_number} onChange={e => set('bank_account_number', e.target.value.replace(/\s/g, ''))} placeholder="Account number" inputMode="numeric" autoComplete="off" />
            </Field>
            <Field label="Re-enter account number" required>
              <input style={{ ...inputStyle, borderColor: accountMismatch ? '#EF4444' : 'var(--c-border)' }} value={f.bank_account_confirm} onChange={e => set('bank_account_confirm', e.target.value.replace(/\s/g, ''))} placeholder="Type it again" inputMode="numeric" autoComplete="off" onPaste={e => e.preventDefault()} />
            </Field>
          </div>
          {accountMismatch && <div style={{ fontSize: 12.5, color: '#EF4444', marginTop: -12 }}>Account numbers don't match</div>}
          <Field label="IFSC code" hint={ifscLoading ? 'Looking up bank…' : 'Bank & branch fill in automatically'}>
            <input style={inputStyle} value={f.bank_ifsc} onChange={e => set('bank_ifsc', e.target.value.toUpperCase())} onBlur={e => lookupIfsc(e.target.value)} placeholder="SBIN0001234" maxLength={11} />
          </Field>
          {(f.bank_name || f.bank_branch) && (
            <div style={{ background: 'var(--c-green-bg)', border: '1px solid var(--c-green-border)', borderRadius: 11, padding: '11px 14px' }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--c-green)' }}>{f.bank_name}</div>
              <div style={{ fontSize: 12.5, color: 'var(--c-green)', opacity: .85 }}>{f.bank_branch}</div>
            </div>
          )}

          {error && <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 11, padding: '11px 14px', fontSize: 13, color: '#DC2626' }}>{error}</div>}

          <button onClick={submit} disabled={!canSubmit}
            style={{ background: canSubmit ? 'var(--c-accent)' : 'var(--c-rule)', color: '#fff', border: 'none', borderRadius: 12, padding: '14px', fontSize: 15, fontWeight: 700, cursor: canSubmit ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4 }}>
            {submitting ? 'Submitting…' : 'Submit my details'}
          </button>
        </div>
      </Card>
      <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--c-faint)', marginTop: 16 }}>
        🔒 Your information is encrypted and shared only with your employer's HR team.
      </div>
    </Shell>
  )
}

function Section({ label }: { label: string }) {
  return <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: 'var(--c-faint)', paddingTop: 4, borderTop: '1px solid var(--c-border-soft)' }}>{label}</div>
}

function UploadBox({ label, done, loading, onPick }: { label: string; done: boolean; loading: boolean; onPick: (f: File) => void }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <label style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        border: `1.5px dashed ${done ? 'var(--c-green)' : 'var(--c-border)'}`, borderRadius: 11,
        padding: '13px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
        color: done ? 'var(--c-green)' : 'var(--c-subtle)', background: done ? 'var(--c-green-bg)' : '#fff',
      }}>
        {loading ? 'Uploading…' : done ? '✓ Uploaded — replace' : '＋ Choose file'}
        <input type="file" accept="image/*,application/pdf" style={{ display: 'none' }}
          onChange={e => { const file = e.target.files?.[0]; if (file) onPick(file) }} />
      </label>
    </div>
  )
}
