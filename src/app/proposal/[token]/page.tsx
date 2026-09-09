'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { computeTotals, money, proposalIsExpired } from '@/lib/proposal'
import type { Proposal } from '@/types'

type State = 'loading' | 'notfound' | 'ok'

export default function ProposalPage() {
  const params = useParams()
  const token = String(params.token || '')
  const [state, setState] = useState<State>('loading')
  const [p, setP] = useState<Proposal | null>(null)
  const [accepting, setAccepting] = useState(false)
  const [name, setName] = useState('')
  const [accepted, setAccepted] = useState(false)

  useEffect(() => {
    fetch(`/api/proposals/${token}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((d: Proposal) => { setP(d); setAccepted(d.status === 'accepted'); setState('ok') })
      .catch(() => setState('notfound'))
  }, [token])

  async function accept() {
    setAccepting(true)
    try {
      const r = await fetch('/api/proposals/accept', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, name: name.trim() || undefined }),
      })
      if (r.ok) setAccepted(true)
    } finally { setAccepting(false) }
  }

  if (state === 'loading') return <Center>Loading…</Center>
  if (state === 'notfound' || !p) return <Center>This proposal link is not valid or has been removed.</Center>

  const items = Array.isArray(p.line_items) ? p.line_items : []
  const totals = computeTotals(items, p.tax_percent || 0, p.discount || 0)
  const expired = proposalIsExpired(p)
  const cur = p.currency || 'INR'

  return (
    <div style={{ minHeight: '100vh', background: '#F1F5F9', padding: '32px 16px', fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif', color: '#0F172A' }}>
      <div style={{ maxWidth: 660, margin: '0 auto' }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 18 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="#FF5C1F"><path d="M12 2l2.4 7.2H22l-6 4.4 2.3 7.2L12 16.8 5.7 20.8 8 13.6 2 9.2h7.6z" /></svg>
          </div>
          <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-0.02em' }}>mavixy</span>
        </div>

        {/* Card */}
        <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 10px 40px -12px rgba(15,23,42,.18)', overflow: 'hidden' }}>
          {/* Header band */}
          <div style={{ background: '#0F172A', color: '#fff', padding: '26px 28px' }}>
            <div style={{ fontSize: 12.5, opacity: .65, letterSpacing: '.06em', fontWeight: 600 }}>PROPOSAL</div>
            <h1 style={{ fontSize: 25, fontWeight: 700, margin: '6px 0 0', lineHeight: 1.2 }}>{p.title}</h1>
            {(p.company || p.client_name) && (
              <div style={{ fontSize: 14, opacity: .8, marginTop: 8 }}>Prepared for {p.company || p.client_name}</div>
            )}
          </div>

          <div style={{ padding: '24px 28px' }}>
            {accepted && (
              <Banner c="#065F46" bg="#D1FAE5" title="Proposal accepted 🎉"
                text="Thanks! We've been notified and will be in touch with next steps shortly." />
            )}
            {!accepted && expired && (
              <Banner c="#92400E" bg="#FEF3C7" title="This proposal has expired"
                text={`It was valid until ${p.valid_until}. Reach out and we'll refresh it for you.`} />
            )}

            {p.intro && <p style={{ fontSize: 15, lineHeight: 1.7, color: '#334155', marginTop: 0 }}>{p.intro}</p>}

            {/* Line items */}
            <div style={{ marginTop: 18, border: '1px solid #E2E8F0', borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ display: 'flex', padding: '10px 16px', background: '#F8FAFC', fontSize: 11.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                <div style={{ flex: 1 }}>Item</div>
                <div style={{ width: 44, textAlign: 'right' }}>Qty</div>
                <div style={{ width: 90, textAlign: 'right' }}>Rate</div>
                <div style={{ width: 100, textAlign: 'right' }}>Amount</div>
              </div>
              {items.length === 0 && <div style={{ padding: '16px', color: '#94A3B8', fontSize: 14 }}>No line items.</div>}
              {items.map((li, i) => (
                <div key={i} style={{ display: 'flex', padding: '13px 16px', borderTop: '1px solid #F1F5F9', fontSize: 14, alignItems: 'baseline' }}>
                  <div style={{ flex: 1, fontWeight: 600, color: '#0F172A' }}>{li.desc || '—'}</div>
                  <div style={{ width: 44, textAlign: 'right', color: '#64748B' }}>{li.qty}</div>
                  <div style={{ width: 90, textAlign: 'right', color: '#64748B' }}>{money(li.rate, cur)}</div>
                  <div style={{ width: 100, textAlign: 'right', fontWeight: 700 }}>{money((li.qty || 0) * (li.rate || 0), cur)}</div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div style={{ marginTop: 16, marginLeft: 'auto', maxWidth: 280 }}>
              <Row label="Subtotal" value={money(totals.subtotal, cur)} />
              {totals.discount > 0 && <Row label="Discount" value={`− ${money(totals.discount, cur)}`} />}
              {(p.tax_percent || 0) > 0 && <Row label={`Tax (${p.tax_percent}%)`} value={money(totals.tax, cur)} />}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 0', marginTop: 6, borderTop: '2px solid #0F172A', fontSize: 18, fontWeight: 800 }}>
                <span>Total</span><span>{money(totals.total, cur)}</span>
              </div>
            </div>

            {p.terms && (
              <div style={{ marginTop: 24 }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>Terms</div>
                <p style={{ fontSize: 13.5, lineHeight: 1.7, color: '#475569', whiteSpace: 'pre-wrap', margin: 0 }}>{p.terms}</p>
              </div>
            )}
            {p.valid_until && !expired && !accepted && (
              <div style={{ fontSize: 13, color: '#64748B', marginTop: 16 }}>Valid until {new Date(p.valid_until + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}.</div>
            )}
          </div>

          {/* Accept footer */}
          {!accepted && !expired && (
            <div style={{ padding: '20px 28px', borderTop: '1px solid #E2E8F0', background: '#F8FAFC' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 8 }}>Ready to go ahead? Add your name and accept.</div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name"
                  style={{ flex: 1, minWidth: 160, border: '1.5px solid #CBD5E1', borderRadius: 11, padding: '12px 14px', fontSize: 14.5, outline: 'none', boxSizing: 'border-box' }} />
                <button onClick={accept} disabled={accepting}
                  style={{ background: '#FF5C1F', color: '#fff', border: 'none', borderRadius: 11, padding: '12px 24px', fontWeight: 700, fontSize: 14.5, cursor: accepting ? 'default' : 'pointer', opacity: accepting ? .7 : 1 }}>
                  {accepting ? 'Accepting…' : 'Accept proposal'}
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 14, color: '#475569' }}>
      <span>{label}</span><span style={{ fontWeight: 600, color: '#0F172A' }}>{value}</span>
    </div>
  )
}

function Banner({ c, bg, title, text }: { c: string; bg: string; title: string; text: string }) {
  return (
    <div style={{ background: bg, borderRadius: 12, padding: '14px 16px', marginBottom: 18 }}>
      <div style={{ fontWeight: 700, color: c, fontSize: 14.5 }}>{title}</div>
      <div style={{ fontSize: 13.5, color: c, opacity: .85, marginTop: 3, lineHeight: 1.5 }}>{text}</div>
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
