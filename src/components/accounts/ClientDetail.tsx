'use client'
import { useState } from 'react'
import { useApp, useToast, useUpsertClient } from '@/lib/store'
import { Sparkle, Spinner, X } from '@/components/ui/Icon'
import { SERVICE_CATS, STATUS_PIPE } from '@/lib/seed-data'

export default function ClientDetail() {
  const { state, dispatch } = useApp()
  const toast = useToast()
  const upsertClient = useUpsertClient()
  const [tab, setTab] = useState<'overview'|'content'|'brain'>('overview')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiInsight, setAiInsight] = useState('')
  const [brainEdits, setBrainEdits] = useState<Record<string,string>>({})
  const [brainSaving, setBrainSaving] = useState(false)

  const client = state.clients.find(c => c.id === state.selectedClientId) || state.clients[0]
  if (!client) return null

  const clientItems = state.planItems.filter(i => i.client_id === client.id)
  const published = clientItems.filter(i => i.status === 'published')
  const active = clientItems.filter(i => i.status !== 'published')

  function healthColor(h: number) {
    if (h >= 80) return 'var(--c-green)'
    if (h >= 60) return 'var(--c-amber)'
    return 'var(--c-red)'
  }

  async function generateInsight() {
    setAiLoading(true)
    setAiInsight('')
    try {
      const res = await fetch('/api/ai/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client: client.name,
          health: client.health,
          services: client.services,
          items: clientItems.map(i => ({ title: i.title, type: i.type, status: i.status })),
          mode: 'insight',
        })
      })
      const { text } = await res.json()
      setAiInsight(text || '')
    } catch {
      setAiInsight(`${client.name} has ${active.length} active deliverables this month. Focus on the highest effort items first. Health score at ${client.health} — ${client.health >= 80 ? 'strong momentum' : client.health >= 60 ? 'monitor closely' : 'needs attention'}.`)
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Back */}
      <button onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'clients' })}
        style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 600, color: 'var(--c-subtle)', marginBottom: 20 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        All Accounts
      </button>

      {/* Client hero */}
      <div style={{ background: 'var(--c-ink)', borderRadius: 20, padding: '24px 28px', marginBottom: 24, position: 'relative', overflow: 'hidden', color: '#fff' }}>
        <div style={{ position: 'absolute', width: 200, height: 200, borderRadius: '50%', background: `radial-gradient(circle,${client.color}30,transparent 70%)`, top: -60, right: -40 }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: 16, justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: client.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, color: '#fff', flexShrink: 0 }}>
              {client.initials}
            </div>
            <div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 6 }}>{client.name}</h1>
              <div style={{ display: 'flex', gap: 6 }}>
                {client.services.map(s => {
                  const cat = SERVICE_CATS.find(c => c.key === s)
                  return cat ? <span key={s} style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: 'rgba(255,255,255,.12)', borderRadius: 7, padding: '3px 8px' }}>{cat.short}</span> : null
                })}
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 38, fontWeight: 800, color: healthColor(client.health), fontFamily: 'var(--font-display)', lineHeight: 1 }}>{client.health}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', marginTop: 4 }}>Health Score</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginTop: 20 }}>
          {[
            { label: 'Deliverables', val: clientItems.length },
            { label: 'Active', val: active.length },
            { label: 'Published', val: published.length },
            { label: 'In review', val: clientItems.filter(i => i.status === 'review').length },
          ].map(s => (
            <div key={s.label} style={{ background: 'rgba(255,255,255,.06)', borderRadius: 12, padding: '12px 14px' }}>
              <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-display)' }}>{s.val}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.45)', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, background: 'var(--c-fill)', borderRadius: 11, padding: 4, marginBottom: 22, width: 'fit-content' }}>
        {(['overview','content','brain'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: '7px 18px', borderRadius: 8, fontSize: 13.5, fontWeight: 600, background: tab === t ? '#fff' : 'transparent', color: tab === t ? 'var(--c-ink)' : 'var(--c-muted)', boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,.1)' : 'none', transition: 'all .15s', textTransform: 'capitalize' }}>
            {t === 'brain' ? '🧠 Client Brain' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Status pipeline */}
          <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 16, padding: '18px' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Content Status</div>
            {STATUS_PIPE.map(s => {
              const cnt = clientItems.filter(i => i.status === s.key).length
              const pct = clientItems.length ? (cnt / clientItems.length) * 100 : 0
              return (
                <div key={s.key} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: s.c }}>{s.label}</span>
                    <span style={{ fontSize: 13, color: 'var(--c-faint)' }}>{cnt}</span>
                  </div>
                  <div style={{ height: 5, background: 'var(--c-fill)', borderRadius: 99 }}>
                    <div style={{ height: '100%', borderRadius: 99, background: s.c, width: `${pct}%`, transition: 'width .5s' }} />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Contact info */}
          <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 16, padding: '18px' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Contact Info</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {client.contact_name && (
                <div>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--c-faint)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 3 }}>Contact</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{client.contact_name}</div>
                </div>
              )}
              {client.contact_email && (
                <div>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--c-faint)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 3 }}>Email</div>
                  <a href={`mailto:${client.contact_email}`} style={{ fontSize: 14, color: 'var(--c-accent-dark)', fontWeight: 600 }}>{client.contact_email}</a>
                </div>
              )}
              {client.industry && (
                <div>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--c-faint)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 3 }}>Industry</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{client.industry}</div>
                </div>
              )}
              {!client.contact_name && !client.contact_email && (
                <div style={{ fontSize: 13, color: 'var(--c-ghost)', fontStyle: 'italic' }}>No contact info added yet</div>
              )}
            </div>
          </div>

          {/* Recent deliverables */}
          <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 16, padding: '18px', gridColumn: '1 / -1' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Active Deliverables</div>
            {active.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--c-ghost)', fontStyle: 'italic' }}>No active deliverables</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {active.map(item => {
                  const st = STATUS_PIPE.find(s => s.key === item.status)!
                  const assignee = state.users.find(u => u.id === item.assignee_id)
                  return (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--c-border-soft)' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: st.c, background: st.bg, borderRadius: 6, padding: '3px 7px', whiteSpace: 'nowrap' }}>{st.label}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
                        <div style={{ fontSize: 12, color: 'var(--c-faint)', marginTop: 1 }}>{item.type}{item.day ? ` · Day ${item.day}` : ''}</div>
                      </div>
                      {assignee && (
                        <div title={assignee.name} style={{ width: 26, height: 26, borderRadius: '50%', background: assignee.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                          {assignee.initials}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'content' && (
        <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 16, overflow: 'hidden' }}>
          {clientItems.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--c-ghost)', fontStyle: 'italic' }}>No content items this month</div>
          ) : (
            clientItems.map((item, i) => {
              const st = STATUS_PIPE.find(s => s.key === item.status)!
              const cat = SERVICE_CATS.find(c => c.key === item.cat)
              const assignee = state.users.find(u => u.id === item.assignee_id)
              return (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderBottom: i < clientItems.length - 1 ? '1px solid var(--c-border-soft)' : 'none' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: st.c, background: st.bg, borderRadius: 6, padding: '3px 7px', whiteSpace: 'nowrap' }}>{st.label}</span>
                  {cat && <span style={{ fontSize: 11, fontWeight: 600, color: cat.color, background: cat.bg, borderRadius: 6, padding: '3px 7px', whiteSpace: 'nowrap' }}>{cat.short}</span>}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--c-faint)', marginTop: 1 }}>{item.type}{item.day ? ` · Day ${item.day}` : ''}</div>
                  </div>
                  {assignee && (
                    <div title={assignee.name} style={{ width: 26, height: 26, borderRadius: '50%', background: assignee.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>
                      {assignee.initials}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}

      {tab === 'brain' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* AI Insight */}
          <div style={{ background: 'var(--c-ink)', borderRadius: 16, padding: '20px 22px', color: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkle size={15} color="#FF5C1F" />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#FF7A45', letterSpacing: '.05em' }}>AI CLIENT INSIGHT</span>
              </div>
              <button onClick={generateInsight} disabled={aiLoading}
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, color: '#fff', background: 'rgba(255,255,255,.1)', borderRadius: 8, padding: '6px 12px', opacity: aiLoading ? .7 : 1 }}>
                {aiLoading ? <Spinner size={12} color="#fff" /> : <Sparkle size={12} color="#FF5C1F" />}
                {aiLoading ? 'Thinking…' : 'Generate insight'}
              </button>
            </div>
            {aiInsight ? (
              <p style={{ fontSize: 15, lineHeight: 1.65, fontWeight: 400, color: '#E8E6E2', animation: 'fadeUp .3s ease both' }}>{aiInsight}</p>
            ) : (
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,.35)', fontStyle: 'italic' }}>Click "Generate insight" for an AI-powered health check on this client.</p>
            )}
          </div>

          {/* Scope info */}
          {(client.posts_per_month || client.monthly_retainer || client.ai_brief) && (
            <div style={{ background: '#fff', border: '1px solid var(--c-border)', borderRadius: 16, padding: '20px 22px' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Scope & Plan</div>
              <div style={{ display: 'grid', gridTemplateColumns: client.posts_per_month && client.monthly_retainer ? '1fr 1fr' : '1fr', gap: 14, marginBottom: client.ai_brief ? 14 : 0 }}>
                {client.posts_per_month && (
                  <div style={{ background: 'var(--c-fill)', borderRadius: 10, padding: '12px 14px' }}>
                    <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-display)' }}>{client.posts_per_month}</div>
                    <div style={{ fontSize: 12, color: 'var(--c-faint)', marginTop: 2 }}>posts / month</div>
                  </div>
                )}
                {client.monthly_retainer && (
                  <div style={{ background: 'var(--c-fill)', borderRadius: 10, padding: '12px 14px' }}>
                    <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-display)' }}>₹{client.monthly_retainer.toLocaleString('en-IN')}</div>
                    <div style={{ fontSize: 12, color: 'var(--c-faint)', marginTop: 2 }}>monthly retainer</div>
                  </div>
                )}
              </div>
              {client.ai_brief && (
                <div>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--c-faint)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>AI Workload Brief</div>
                  <p style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--c-ink-2)' }}>{client.ai_brief}</p>
                </div>
              )}
            </div>
          )}

          {/* Brand Knowledge — editable */}
          {(() => {
            const fields = [
              { key: 'about_business', label: 'About the business', placeholder: "What they sell, where, what makes them different...", rows: 3 },
              { key: 'target_audience', label: 'Target audience', placeholder: "e.g. Women 22-34, tier-1, skincare-curious", rows: 1 },
              { key: 'brand_voice', label: 'Brand voice & tone', placeholder: "e.g. Warm, editorial, confident", rows: 1 },
              { key: 'reference_links', label: 'Reference / inspiration links', placeholder: "competitor profiles, moodboards, brand guidelines...", rows: 2 },
            ]
            const hasAnyData = fields.some(f => (client as any)[f.key])
            const isDirty = Object.keys(brainEdits).length > 0
            return (
              <div style={{ background: '#fff', border: '1px solid var(--c-border)', borderRadius: 16, padding: '20px 22px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15 }}>Client Brain</div>
                  {isDirty && (
                    <button onClick={async () => {
                      setBrainSaving(true)
                      await upsertClient({ ...client, ...brainEdits } as any)
                      setBrainEdits({})
                      setBrainSaving(false)
                      toast('Brain updated')
                    }} disabled={brainSaving}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#fff', background: 'var(--c-accent)', borderRadius: 9, padding: '7px 14px', opacity: brainSaving ? .7 : 1 }}>
                      {brainSaving ? <Spinner size={12} color="#fff" /> : null}
                      {brainSaving ? 'Saving…' : 'Save changes'}
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {fields.map(f => (
                    <div key={f.key}>
                      <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-faint)', textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: 6 }}>{f.label}</label>
                      {f.rows === 1 ? (
                        <input
                          value={brainEdits[f.key] !== undefined ? brainEdits[f.key] : ((client as any)[f.key] || '')}
                          onChange={e => setBrainEdits(b => ({ ...b, [f.key]: e.target.value }))}
                          placeholder={f.placeholder}
                          style={{ width: '100%', border: '1.5px solid var(--c-border)', borderRadius: 10, padding: '10px 12px', fontSize: 13.5, background: 'var(--c-fill)', transition: 'border-color .15s, background .15s' }}
                          onFocus={e => { e.target.style.borderColor = 'var(--c-ink)'; e.target.style.background = '#fff' }}
                          onBlur={e => { e.target.style.borderColor = 'var(--c-border)'; e.target.style.background = 'var(--c-fill)' }}
                        />
                      ) : (
                        <textarea
                          rows={f.rows}
                          value={brainEdits[f.key] !== undefined ? brainEdits[f.key] : ((client as any)[f.key] || '')}
                          onChange={e => setBrainEdits(b => ({ ...b, [f.key]: e.target.value }))}
                          placeholder={f.placeholder}
                          style={{ width: '100%', border: '1.5px solid var(--c-border)', borderRadius: 10, padding: '10px 12px', fontSize: 13.5, resize: 'vertical', lineHeight: 1.6, background: 'var(--c-fill)', transition: 'border-color .15s, background .15s' }}
                          onFocus={e => { e.target.style.borderColor = 'var(--c-ink)'; e.target.style.background = '#fff' }}
                          onBlur={e => { e.target.style.borderColor = 'var(--c-border)'; e.target.style.background = 'var(--c-fill)' }}
                        />
                      )}
                    </div>
                  ))}
                </div>
                {!hasAnyData && !isDirty && (
                  <div style={{ marginTop: 16, background: '#0F172A', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Sparkle size={13} color="#FF5C1F" style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,.75)' }}>Fill in the client brain — AI uses this to generate briefs & ideas for this account.</span>
                  </div>
                )}
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}
