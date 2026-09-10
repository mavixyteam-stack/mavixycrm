'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import type { Contract } from '@/types'

type State = 'loading' | 'notfound' | 'ok'

export default function ContractPage() {
  const params = useParams()
  const token = String(params.token || '')
  const [state, setState] = useState<State>('loading')
  const [c, setC] = useState<Contract | null>(null)
  const [name, setName] = useState('')
  const [agree, setAgree] = useState(false)
  const [signing, setSigning] = useState(false)
  const [signed, setSigned] = useState(false)

  useEffect(() => {
    fetch(`/api/contracts/${token}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((d: Contract) => { setC(d); setSigned(d.status === 'signed'); if (d.signer_name) setName(d.signer_name); setState('ok') })
      .catch(() => setState('notfound'))
  }, [token])

  async function sign() {
    if (!name.trim() || !agree) return
    setSigning(true)
    try {
      const r = await fetch('/api/contracts/sign', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, name: name.trim() }) })
      if (r.ok) setSigned(true)
    } finally { setSigning(false) }
  }

  if (state === 'loading') return <Center>Loading…</Center>
  if (state === 'notfound' || !c) return <Center>This agreement link is not valid or has been removed.</Center>

  return (
    <div style={{ minHeight: '100vh', background: '#F1F5F9', padding: '32px 16px', fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif', color: '#0F172A' }}>
      <div style={{ maxWidth: 660, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 18 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="#FF5C1F"><path d="M12 2l2.4 7.2H22l-6 4.4 2.3 7.2L12 16.8 5.7 20.8 8 13.6 2 9.2h7.6z" /></svg>
          </div>
          <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-0.02em' }}>mavixy</span>
        </div>

        <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 10px 40px -12px rgba(15,23,42,.18)', overflow: 'hidden' }}>
          <div style={{ background: '#0F172A', color: '#fff', padding: '26px 28px' }}>
            <div style={{ fontSize: 12.5, opacity: .65, letterSpacing: '.06em', fontWeight: 600 }}>AGREEMENT</div>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: '6px 0 0', lineHeight: 1.2 }}>{c.title}</h1>
          </div>

          <div style={{ padding: '26px 28px' }}>
            {signed && (
              <div style={{ background: '#D1FAE5', borderRadius: 12, padding: '14px 16px', marginBottom: 20 }}>
                <div style={{ fontWeight: 700, color: '#065F46', fontSize: 14.5 }}>Signed ✅</div>
                <div style={{ fontSize: 13.5, color: '#065F46', opacity: .85, marginTop: 3 }}>Thank you, {c.signer_name || name}. A copy has been recorded and the team notified.</div>
              </div>
            )}

            <div style={{ fontSize: 14.5, lineHeight: 1.75, color: '#334155', whiteSpace: 'pre-wrap' }}>{c.body}</div>
          </div>

          {!signed && (
            <div style={{ padding: '22px 28px', borderTop: '1px solid #E2E8F0', background: '#F8FAFC' }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13.5, color: '#334155', marginBottom: 14, cursor: 'pointer' }}>
                <input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} style={{ marginTop: 3, width: 16, height: 16 }} />
                <span>I have read and agree to the terms of this agreement, and I am authorised to sign on behalf of {c.company || 'the client'}.</span>
              </label>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Type your full name to sign"
                  style={{ flex: 1, minWidth: 200, border: '1.5px solid #CBD5E1', borderRadius: 11, padding: '12px 14px', fontSize: 14.5, outline: 'none', boxSizing: 'border-box', fontFamily: 'Georgia, serif', fontStyle: 'italic' }} />
                <button onClick={sign} disabled={signing || !name.trim() || !agree}
                  style={{ background: (name.trim() && agree) ? '#FF5C1F' : '#CBD5E1', color: '#fff', border: 'none', borderRadius: 11, padding: '12px 26px', fontWeight: 700, fontSize: 14.5, cursor: (signing || !name.trim() || !agree) ? 'default' : 'pointer' }}>
                  {signing ? 'Signing…' : 'Agree & sign'}
                </button>
              </div>
            </div>
          )}
        </div>
        <div style={{ textAlign: 'center', fontSize: 12, color: '#94A3B8', marginTop: 20 }}>Powered by Mavixy OS</div>
      </div>
    </div>
  )
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F1F5F9', padding: 24, textAlign: 'center', color: '#475569', fontFamily: 'system-ui,sans-serif', fontSize: 15 }}>
      {children}
    </div>
  )
}
