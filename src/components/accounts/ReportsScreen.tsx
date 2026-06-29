'use client'
import { useState } from 'react'
import { useApp, useToast } from '@/lib/store'
import { Sparkle, Spinner, FileText } from '@/components/ui/Icon'
import { SERVICE_CATS, STATUS_PIPE } from '@/lib/seed-data'

export default function ReportsScreen() {
  const { state } = useApp()
  const toast = useToast()
  const [selectedClient, setSelectedClient] = useState(state.clients[0]?.id || '')
  const [reportText, setReportText] = useState('')
  const [loading, setLoading] = useState(false)
  const [generated, setGenerated] = useState(false)

  const client = state.clients.find(c => c.id === selectedClient)
  const clientItems = state.planItems.filter(i => i.client_id === selectedClient)
  const published = clientItems.filter(i => i.status === 'published')
  const active = clientItems.filter(i => i.status !== 'published')

  async function generateReport() {
    if (!client) return
    setLoading(true)
    setReportText('')
    setGenerated(false)
    try {
      const res = await fetch('/api/ai/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client: client.name,
          health: client.health,
          services: client.services,
          month: 'June 2026',
          items: clientItems.map(i => ({ title: i.title, type: i.type, status: i.status, day: i.day })),
          published: published.length,
          active: active.length,
        })
      })
      const { text } = await res.json()
      setReportText(text || '')
      setGenerated(true)
    } catch {
      const fallback = `Hi ${client.name} Team,

Here's your June 2026 content marketing update from Mavixy.

This month, we've delivered ${published.length} content pieces across your ${client.services.join(', ')} channels. Your current health score stands at ${client.health}/100.

**Active Work:** We have ${active.length} deliverables currently in progress or review, with key pieces expected to publish by month end.

**What's Next:** We're finalizing the remaining content for maximum impact before the end of the month. Our team is focused on quality-first execution.

Looking forward to a strong close to the month!

Best,
Mavixy Team`
      setReportText(fallback)
      setGenerated(true)
    } finally {
      setLoading(false)
    }
  }

  function copyReport() {
    navigator.clipboard.writeText(reportText)
    toast('Report copied to clipboard')
  }

  function healthColor(h: number) {
    if (h >= 80) return 'var(--c-green)'
    if (h >= 60) return 'var(--c-amber)'
    return 'var(--c-red)'
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 4 }}>Reports</h1>
        <p style={{ fontSize: 14, color: 'var(--c-subtle)' }}>Generate AI-drafted monthly reports for each client</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20 }}>
        {/* Client picker */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-muted)', letterSpacing: '.05em', textTransform: 'uppercase', marginBottom: 4 }}>Select Client</div>
          {state.clients.map(c => {
            const items = state.planItems.filter(i => i.client_id === c.id)
            return (
              <button key={c.id} onClick={() => { setSelectedClient(c.id); setGenerated(false); setReportText('') }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, border: `1.5px solid ${selectedClient === c.id ? 'var(--c-accent)' : 'var(--c-border)'}`, background: selectedClient === c.id ? 'rgba(255,92,31,.04)' : '#fff', textAlign: 'left', transition: 'all .15s' }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: c.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 11, flexShrink: 0 }}>
                  {c.initials}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>{c.name}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--c-faint)' }}>{items.length} items · Health {c.health}</div>
                </div>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: healthColor(c.health), flexShrink: 0 }} />
              </button>
            )
          })}
        </div>

        {/* Report panel */}
        <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 16, overflow: 'hidden' }}>
          {client && (
            <>
              {/* Header */}
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--c-border-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 9, background: client.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12 }}>
                    {client.initials}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{client.name} · June 2026</div>
                    <div style={{ fontSize: 12, color: 'var(--c-faint)' }}>Monthly Performance Report</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {generated && (
                    <button onClick={copyReport} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--c-subtle)', background: 'var(--c-fill)', borderRadius: 8, padding: '7px 12px' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                      Copy
                    </button>
                  )}
                  <button onClick={generateReport} disabled={loading}
                    style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'var(--c-ink)', color: '#fff', borderRadius: 9, padding: '8px 14px', fontWeight: 600, fontSize: 13, opacity: loading ? .7 : 1 }}>
                    {loading ? <Spinner size={13} color="#fff" /> : <Sparkle size={13} color="#FF5C1F" />}
                    {loading ? 'Drafting…' : generated ? 'Regenerate' : 'Draft with AI'}
                  </button>
                </div>
              </div>

              {/* Stats row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 1, background: 'var(--c-border-soft)', borderBottom: '1px solid var(--c-border-soft)' }}>
                {[
                  { label: 'Published', val: published.length, c: 'var(--c-green)' },
                  { label: 'Active', val: active.length, c: 'var(--c-amber)' },
                  { label: 'Health', val: `${client.health}%`, c: healthColor(client.health) },
                  { label: 'Services', val: client.services.length, c: 'var(--c-accent)' },
                ].map(s => (
                  <div key={s.label} style={{ background: '#fff', padding: '14px 16px', textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: s.c, fontFamily: 'var(--font-display)' }}>{s.val}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--c-faint)', marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Report body */}
              <div style={{ padding: '20px', minHeight: 320 }}>
                {!generated && !loading && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 280, gap: 12 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--c-fill)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FileText size={22} color="var(--c-faint)" />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 5 }}>Ready to draft</div>
                      <div style={{ fontSize: 13, color: 'var(--c-subtle)', maxWidth: '36ch' }}>Click "Draft with AI" to generate a professional monthly report for {client.name}</div>
                    </div>
                  </div>
                )}
                {loading && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 280, gap: 10, color: 'var(--c-subtle)' }}>
                    <Spinner size={16} color="#FF5C1F" />
                    <span style={{ fontSize: 14 }}>Drafting your report with Groq AI…</span>
                  </div>
                )}
                {generated && !loading && (
                  <textarea value={reportText} onChange={e => setReportText(e.target.value)}
                    style={{ width: '100%', minHeight: 380, border: 'none', outline: 'none', fontSize: 14, lineHeight: 1.75, color: 'var(--c-ink)', fontFamily: 'var(--font-body)', resize: 'vertical', animation: 'fadeUp .3s ease both' }} />
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
