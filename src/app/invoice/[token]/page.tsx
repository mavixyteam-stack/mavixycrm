'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { computeTotals, money } from '@/lib/proposal'
import type { Invoice } from '@/types'

type State = 'loading' | 'notfound' | 'ok'

export default function InvoicePage() {
  const params = useParams()
  const token = String(params.token || '')
  const [state, setState] = useState<State>('loading')
  const [inv, setInv] = useState<Invoice | null>(null)

  useEffect(() => {
    fetch(`/api/invoices/${token}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((d: Invoice) => { setInv(d); setState('ok') })
      .catch(() => setState('notfound'))
  }, [token])

  if (state === 'loading') return <Center>Loading…</Center>
  if (state === 'notfound' || !inv) return <Center>This invoice link is not valid or has been removed.</Center>

  const items = Array.isArray(inv.line_items) ? inv.line_items : []
  const totals = computeTotals(items, inv.tax_percent || 0, inv.discount || 0)
  const cur = inv.currency || 'INR'
  const paid = inv.amount_paid || 0
  const balance = Math.max(0, totals.total - paid)
  const fullyPaid = inv.status === 'paid' || balance === 0
  const fmt = (d?: string | null) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

  return (
    <div style={{ minHeight: '100vh', background: '#F1F5F9', padding: '32px 16px', fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif', color: '#0F172A' }}>
      <div style={{ maxWidth: 660, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="#FF5C1F"><path d="M12 2l2.4 7.2H22l-6 4.4 2.3 7.2L12 16.8 5.7 20.8 8 13.6 2 9.2h7.6z" /></svg>
            </div>
            <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-0.02em' }}>mavixy</span>
          </div>
          <button onClick={() => window.print()} style={{ background: '#fff', border: '1px solid #CBD5E1', borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 700, color: '#475569', cursor: 'pointer' }}>Print / Save PDF</button>
        </div>

        <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 10px 40px -12px rgba(15,23,42,.18)', overflow: 'hidden' }}>
          <div style={{ background: '#0F172A', color: '#fff', padding: '26px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontSize: 12.5, opacity: .65, letterSpacing: '.06em', fontWeight: 600 }}>INVOICE</div>
              <h1 style={{ fontSize: 24, fontWeight: 700, margin: '6px 0 0' }}>{inv.number}</h1>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 8, background: fullyPaid ? '#065F46' : '#FF5C1F', color: '#fff' }}>{fullyPaid ? 'PAID' : 'DUE'}</span>
              <div style={{ fontSize: 22, fontWeight: 800, marginTop: 8 }}>{money(fullyPaid ? totals.total : balance, cur)}</div>
            </div>
          </div>

          <div style={{ padding: '24px 28px' }}>
            {/* Meta */}
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>Billed to</div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{inv.company || inv.client_name || '—'}</div>
                {inv.company && inv.client_name && <div style={{ fontSize: 13.5, color: '#64748B' }}>{inv.client_name}</div>}
              </div>
              <div style={{ textAlign: 'right', fontSize: 13.5, color: '#475569' }}>
                <div>Issued: <strong>{fmt(inv.issue_date)}</strong></div>
                <div style={{ marginTop: 2 }}>Due: <strong>{fmt(inv.due_date)}</strong></div>
              </div>
            </div>

            {/* Items */}
            <div style={{ border: '1px solid #E2E8F0', borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ display: 'flex', padding: '10px 16px', background: '#F8FAFC', fontSize: 11.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                <div style={{ flex: 1 }}>Item</div>
                <div style={{ width: 44, textAlign: 'right' }}>Qty</div>
                <div style={{ width: 90, textAlign: 'right' }}>Rate</div>
                <div style={{ width: 100, textAlign: 'right' }}>Amount</div>
              </div>
              {items.map((li, i) => (
                <div key={i} style={{ display: 'flex', padding: '13px 16px', borderTop: '1px solid #F1F5F9', fontSize: 14, alignItems: 'baseline' }}>
                  <div style={{ flex: 1, fontWeight: 600 }}>{li.desc || '—'}</div>
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
              {(inv.tax_percent || 0) > 0 && <Row label={`Tax (${inv.tax_percent}%)`} value={money(totals.tax, cur)} />}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 0', marginTop: 6, borderTop: '2px solid #0F172A', fontSize: 18, fontWeight: 800 }}>
                <span>Total</span><span>{money(totals.total, cur)}</span>
              </div>
              {paid > 0 && (
                <>
                  <Row label="Paid" value={`− ${money(paid, cur)}`} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 4, fontSize: 15, fontWeight: 800, color: balance > 0 ? '#DC2626' : '#059669' }}>
                    <span>Balance due</span><span>{money(balance, cur)}</span>
                  </div>
                </>
              )}
            </div>

            {inv.notes && (
              <div style={{ marginTop: 24 }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>Notes</div>
                <p style={{ fontSize: 13.5, lineHeight: 1.7, color: '#475569', whiteSpace: 'pre-wrap', margin: 0 }}>{inv.notes}</p>
              </div>
            )}
          </div>
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

function Center({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F1F5F9', padding: 24, textAlign: 'center', color: '#475569', fontFamily: 'system-ui,sans-serif', fontSize: 15 }}>
      {children}
    </div>
  )
}
