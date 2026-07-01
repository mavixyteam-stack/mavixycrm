'use client'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useApp, useToast, useUpsertDeal } from '@/lib/store'
import { Plus, X, Sparkle, Spinner } from '@/components/ui/Icon'

const SCORE_STYLE = {
  hot:  { c: '#DC2626', bg: '#FEE2E2', label: 'Hot' },
  warm: { c: '#C99211', bg: '#FCF3D9', label: 'Warm' },
  cold: { c: '#2563EB', bg: '#EAF1FF', label: 'Cold' },
} as const

const STATUS_STYLE = {
  new:       { c: '#6B7280', bg: '#F3F4F6' },
  contacted: { c: '#2563EB', bg: '#EFF6FF' },
  qualified: { c: '#059669', bg: '#ECFDF5' },
} as const

const SOURCES = ['Instagram DM', 'Referral', 'Website form', 'LinkedIn', 'WhatsApp', 'Cold outreach', 'Other']
const SERVICES = ['Social Media', 'Performance Ads', 'SEO + Content', 'Full Retainer', 'Branding + Social', 'Email Marketing', 'Other']
const COLORS = ['#FF5C1F','#F4B740','#8B5CF6','#10B981','#2563EB','#EF4444','#0EA5A4','#EC4899']

function parseBudgetValue(s: string): number {
  const m = s.replace(/[₹,\s]/g, '').match(/(\d+(?:\.\d+)?)(K|L|k|l)?/)
  if (!m) return 0
  const n = parseFloat(m[1])
  if (m[2]?.toLowerCase() === 'k') return n * 1000
  if (m[2]?.toLowerCase() === 'l') return n * 100000
  return n
}

type LeadForm = {
  name: string; company: string; email: string; phone: string
  source: string; service: string; budget_text: string
  score: 'hot' | 'warm' | 'cold'; notes: string; owner_id: string
}

const EMPTY_FORM: LeadForm = {
  name: '', company: '', email: '', phone: '',
  source: 'Website form', service: 'Social Media',
  budget_text: '', score: 'warm',
  notes: '', owner_id: '',
}

export default function LeadsScreen() {
  const { state } = useApp()
  const toast = useToast()
  const upsertDeal = useUpsertDeal()

  // Leads = deals at stage 'lead' — same data source as Pipeline
  const leads = state.deals.filter(d => d.stage === 'lead')

  const [selected, setSelected] = useState<typeof leads[0] | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiPitch, setAiPitch] = useState('')
  const [filterOwner, setFilterOwner] = useState('')
  const [filterScore, setFilterScore] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [form, setForm] = useState<LeadForm>({ ...EMPTY_FORM, owner_id: state.currentUser?.id || '' })

  const filtered = leads.filter(l => {
    if (filterOwner && l.owner_id !== filterOwner) return false
    if (filterScore && l.score !== filterScore) return false
    if (filterStatus && (l.lead_status || 'new') !== filterStatus) return false
    return true
  })

  function addLead() {
    if (!form.name.trim() || !form.company.trim()) return
    const initials = form.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
    const color = COLORS[leads.length % COLORS.length]
    upsertDeal({
      id: `lead-${Date.now()}`,
      name: form.name,
      company: form.company,
      value: parseBudgetValue(form.budget_text),
      stage: 'lead',
      probability: 20,
      owner_id: form.owner_id,
      created_at: new Date().toISOString(),
      email: form.email,
      phone: form.phone,
      source: form.source,
      service: form.service,
      budget_text: form.budget_text,
      score: form.score,
      lead_status: 'new',
      notes: form.notes,
      initials,
      color,
    })
    toast('Lead added — also visible in Pipeline')
    setAddOpen(false)
    setForm({ ...EMPTY_FORM, owner_id: state.currentUser?.id || '' })
  }

  function updateLeadStatus(id: string, lead_status: 'new' | 'contacted' | 'qualified') {
    const lead = leads.find(l => l.id === id)
    if (!lead) return
    upsertDeal({ ...lead, lead_status })
    if (selected?.id === id) setSelected(s => s ? { ...s, lead_status } : s)
    toast(`Marked as ${lead_status}`)
  }

  function qualifyLead(lead: typeof leads[0]) {
    upsertDeal({ ...lead, stage: 'qualified', lead_status: 'qualified', probability: 60 })
    setSelected(null)
    setAiPitch('')
    toast(`${lead.name.split(' ')[0]} qualified — moved to Pipeline!`)
  }

  async function generatePitch(lead: typeof leads[0]) {
    setAiLoading(true)
    setAiPitch('')
    try {
      const res = await fetch('/api/ai/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'pitch', lead }),
      })
      const { text } = await res.json()
      setAiPitch(text || '')
    } catch {
      setAiPitch(`Hi ${lead.name.split(' ')[0]},\n\nWe noticed ${lead.company} is growing fast — we've driven great results for similar brands. Would love to show you what we can do.\n\nUp for a quick 20-min call this week?\n\nWarm regards,\nMavixy Team`)
    } finally {
      setAiLoading(false)
    }
  }

  const hotCount = leads.filter(l => l.score === 'hot').length
  const newCount = leads.filter(l => (l.lead_status || 'new') === 'new').length
  const qualifiedCount = leads.filter(l => l.lead_status === 'qualified').length

  const inputStyle = { width: '100%', border: '1.5px solid var(--c-border)', borderRadius: 10, padding: '10px 12px', fontSize: 14, background: 'var(--c-fill)' }

  return (
    <div style={{ maxWidth: 1040, margin: '0 auto', animation: 'fadeIn .4s ease both' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <div>
          <div style={{ fontSize: 12.5, color: 'var(--c-faint)', fontWeight: 500, marginBottom: 5 }}>Sales</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em' }}>Inbound leads</h1>
        </div>
        <button onClick={() => setAddOpen(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--c-ink)', color: '#fff', borderRadius: 11, padding: '10px 18px', fontWeight: 700, fontSize: 13.5, transition: 'transform .15s', border: 'none', cursor: 'pointer' }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = ''}>
          <Plus size={14} />Add lead
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'Total leads', val: leads.length, c: 'var(--c-ink)' },
          { label: 'New / uncontacted', val: newCount, c: 'var(--c-subtle)' },
          { label: 'Hot leads', val: hotCount, c: '#DC2626' },
          { label: 'Qualified', val: qualifiedCount, c: '#059669' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', border: '1px solid var(--c-border)', borderRadius: 16, padding: '18px 20px' }}>
            <div style={{ fontSize: 12.5, color: 'var(--c-faint)', marginBottom: 7 }}>{s.label}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 700, color: s.c }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {state.users.filter(u => u.role === 'sales' || u.role === 'owner').length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 1, background: '#fff', border: '1px solid var(--c-border)', borderRadius: 10, padding: '5px 8px' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-ghost)', letterSpacing: '.04em', paddingRight: 6 }}>OWNER</span>
            {[{ id: '', label: 'All' }, ...state.users.filter(u => u.role === 'sales' || u.role === 'owner').map(u => ({ id: u.id, label: u.name.split(' ')[0] }))].map(o => (
              <button key={o.id} onClick={() => setFilterOwner(o.id)}
                style={{ padding: '4px 10px', borderRadius: 7, fontSize: 12.5, fontWeight: 600, border: 'none', background: filterOwner === o.id ? 'var(--c-ink)' : 'transparent', color: filterOwner === o.id ? '#fff' : 'var(--c-subtle)', cursor: 'pointer', transition: 'all .12s' }}>
                {o.label}
              </button>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 1, background: '#fff', border: '1px solid var(--c-border)', borderRadius: 10, padding: '5px 8px' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-ghost)', letterSpacing: '.04em', paddingRight: 6 }}>SCORE</span>
          {[['', 'All'], ['hot', 'Hot'], ['warm', 'Warm'], ['cold', 'Cold']].map(([v, l]) => (
            <button key={v} onClick={() => setFilterScore(v)}
              style={{ padding: '4px 10px', borderRadius: 7, fontSize: 12.5, fontWeight: 600, border: 'none', background: filterScore === v ? 'var(--c-ink)' : 'transparent', color: filterScore === v ? '#fff' : 'var(--c-subtle)', cursor: 'pointer', transition: 'all .12s' }}>
              {l}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 1, background: '#fff', border: '1px solid var(--c-border)', borderRadius: 10, padding: '5px 8px' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-ghost)', letterSpacing: '.04em', paddingRight: 6 }}>STATUS</span>
          {[['', 'All'], ['new', 'New'], ['contacted', 'Contacted'], ['qualified', 'Qualified']].map(([v, l]) => (
            <button key={v} onClick={() => setFilterStatus(v)}
              style={{ padding: '4px 10px', borderRadius: 7, fontSize: 12.5, fontWeight: 600, border: 'none', background: filterStatus === v ? 'var(--c-ink)' : 'transparent', color: filterStatus === v ? '#fff' : 'var(--c-subtle)', cursor: 'pointer', transition: 'all .12s' }}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', border: '1px solid var(--c-border)', borderRadius: 18, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 100px 150px 120px', padding: '10px 22px', borderBottom: '1px solid var(--c-border-soft)' }}>
          {['LEAD', 'SOURCE', 'SCORE', 'OWNER', 'STATUS'].map(h => (
            <div key={h} style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-ghost)', letterSpacing: '.07em' }}>{h}</div>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: '56px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>📭</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--c-ink-2)', marginBottom: 6 }}>
              {leads.length === 0 ? 'No leads yet' : 'No leads match these filters'}
            </div>
            <div style={{ fontSize: 13.5, color: 'var(--c-faint)' }}>
              {leads.length === 0 ? 'Add your first lead and it will appear in Pipeline too.' : 'Try clearing a filter above.'}
            </div>
          </div>
        ) : filtered.map((lead, i) => {
          const sc = SCORE_STYLE[lead.score || 'warm']
          const st = STATUS_STYLE[(lead.lead_status || 'new') as keyof typeof STATUS_STYLE]
          const owner = state.users.find(u => u.id === lead.owner_id)
          return (
            <div key={lead.id} onClick={() => { setSelected(lead); setAiPitch('') }}
              style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 100px 150px 120px', alignItems: 'center', padding: '14px 22px', borderBottom: i < filtered.length - 1 ? '1px solid var(--c-border-soft)' : 'none', cursor: 'pointer', transition: 'background .12s', animation: `fadeUp .3s ease ${i * 0.04}s both` }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--c-fill-soft)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 11, background: lead.color || '#9A9E94', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                  {lead.initials || lead.name?.slice(0,2).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-ink)' }}>{lead.name}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--c-faint)', marginTop: 1 }}>{lead.company}</div>
                </div>
              </div>
              <div style={{ fontSize: 13.5, color: 'var(--c-subtle)' }}>{lead.source || '—'}</div>
              <div><span style={{ fontSize: 12, fontWeight: 700, color: sc.c, background: sc.bg, borderRadius: 7, padding: '3px 10px' }}>{sc.label}</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                {owner ? (
                  <>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: owner.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700 }}>{owner.initials}</div>
                    <span style={{ fontSize: 13.5, color: 'var(--c-ink-2)', fontWeight: 500 }}>{owner.name.split(' ')[0]}</span>
                  </>
                ) : <span style={{ fontSize: 13, color: 'var(--c-ghost)' }}>Unassigned</span>}
              </div>
              <div><span style={{ fontSize: 12, fontWeight: 700, color: st.c, background: st.bg, borderRadius: 7, padding: '3px 10px', textTransform: 'capitalize' }}>{lead.lead_status || 'new'}</span></div>
            </div>
          )
        })}
      </div>

      {/* Lead detail drawer */}
      {selected && (() => {
        const lead = leads.find(l => l.id === selected.id) || selected
        const sc = SCORE_STYLE[lead.score || 'warm']
        const st = STATUS_STYLE[(lead.lead_status || 'new') as keyof typeof STATUS_STYLE]
        const owner = state.users.find(u => u.id === lead.owner_id)
        return createPortal(
          <>
            <div onClick={() => { setSelected(null); setAiPitch('') }}
              style={{ position: 'fixed', inset: 0, zIndex: 1200, background: 'rgba(15,23,42,.38)', backdropFilter: 'blur(2px)', animation: 'fadeIn .18s ease both' }} />
            <div onClick={e => e.stopPropagation()}
              style={{ position: 'fixed', top: 0, right: 0, width: 480, height: '100vh', background: '#FAFBF9', boxShadow: '-12px 0 60px rgba(0,0,0,.18)', display: 'flex', flexDirection: 'column', animation: 'slideInRight .25s cubic-bezier(.2,.9,.3,1) both', zIndex: 1201 }}>

              <div style={{ padding: '20px 24px 18px', borderBottom: '1px solid var(--c-border-soft)', background: '#fff' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
                    <div style={{ width: 50, height: 50, borderRadius: 15, background: lead.color || '#9A9E94', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17 }}>
                      {lead.initials || lead.name?.slice(0,2).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 700 }}>{lead.name}</div>
                      <div style={{ fontSize: 13.5, color: 'var(--c-faint)', marginTop: 2 }}>{lead.company}</div>
                    </div>
                  </div>
                  <button onClick={() => { setSelected(null); setAiPitch('') }}
                    style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--c-fill)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}>
                    <X size={15} color="var(--c-muted)" />
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: sc.c, background: sc.bg, borderRadius: 7, padding: '4px 10px' }}>{sc.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: st.c, background: st.bg, borderRadius: 7, padding: '4px 10px', textTransform: 'capitalize' }}>{lead.lead_status || 'new'}</span>
                  {lead.budget_text && <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-accent-dark)', background: 'var(--c-accent-bg)', borderRadius: 7, padding: '4px 10px' }}>{lead.budget_text}</span>}
                </div>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
                  {[
                    { label: 'Source', val: lead.source },
                    { label: 'Service', val: lead.service },
                    { label: 'Owner', val: owner?.name || 'Unassigned' },
                    { label: 'Budget', val: lead.budget_text },
                  ].map(f => (
                    <div key={f.label} style={{ background: '#fff', border: '1px solid var(--c-border-soft)', borderRadius: 10, padding: '11px 13px' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-faint)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>{f.label}</div>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--c-ink-2)' }}>{f.val || '—'}</div>
                    </div>
                  ))}
                </div>

                {(lead.email || lead.phone) && (
                  <div style={{ background: '#fff', border: '1px solid var(--c-border-soft)', borderRadius: 12, padding: '14px 16px', marginBottom: 18 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-faint)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>Contact</div>
                    {lead.email && (
                      <a href={`mailto:${lead.email}`} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, color: 'var(--c-accent-dark)', fontWeight: 600, marginBottom: lead.phone ? 7 : 0, textDecoration: 'none' }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6"/></svg>
                        {lead.email}
                      </a>
                    )}
                    {lead.phone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, color: 'var(--c-ink-2)' }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--c-faint)" strokeWidth="2" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.65 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.56 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                        {lead.phone}
                      </div>
                    )}
                  </div>
                )}

                {lead.notes && (
                  <div style={{ marginBottom: 18 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-faint)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>Notes</div>
                    <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--c-ink-3)', margin: 0 }}>{lead.notes}</p>
                  </div>
                )}

                <div style={{ marginBottom: 18 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-faint)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>Update status</div>
                  <div style={{ display: 'flex', gap: 7 }}>
                    {(['new', 'contacted', 'qualified'] as const).map(s => {
                      const sst = STATUS_STYLE[s]
                      const active = (lead.lead_status || 'new') === s
                      return (
                        <button key={s} onClick={() => updateLeadStatus(lead.id, s)}
                          style={{ flex: 1, padding: '8px 0', borderRadius: 9, fontSize: 12.5, fontWeight: 700, border: `1.5px solid ${active ? sst.c : 'var(--c-border)'}`, color: active ? sst.c : 'var(--c-muted)', background: active ? sst.bg : '#fff', textTransform: 'capitalize', cursor: 'pointer' }}>
                          {s}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div style={{ background: 'var(--c-ink)', borderRadius: 14, padding: '16px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: aiPitch ? 12 : 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <Sparkle size={13} color="#FF5C1F" />
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: '#FF7A45', letterSpacing: '.05em' }}>AI PITCH DRAFT</span>
                    </div>
                    <button onClick={() => generatePitch(lead)} disabled={aiLoading}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: '#fff', background: 'rgba(255,255,255,.1)', borderRadius: 7, padding: '5px 11px', opacity: aiLoading ? .7 : 1, border: 'none', cursor: 'pointer' }}>
                      {aiLoading ? <Spinner size={11} color="#fff" /> : <Sparkle size={11} color="#FF5C1F" />}
                      {aiLoading ? 'Writing…' : 'Generate'}
                    </button>
                  </div>
                  {aiPitch ? (
                    <div style={{ animation: 'fadeUp .25s ease both' }}>
                      <p style={{ fontSize: 13.5, lineHeight: 1.65, color: '#E8E6E2', margin: '0 0 12px', whiteSpace: 'pre-line' }}>{aiPitch}</p>
                      <button onClick={() => { navigator.clipboard.writeText(aiPitch); toast('Copied!') }}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: '#FF7A45', background: 'rgba(255,92,31,.15)', borderRadius: 7, padding: '5px 11px', border: 'none', cursor: 'pointer' }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                        Copy pitch
                      </button>
                    </div>
                  ) : (
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,.35)', fontStyle: 'italic', marginTop: 10 }}>Generate a personalised pitch for {lead.name?.split(' ')[0]}.</p>
                  )}
                </div>
              </div>

              <div style={{ padding: '14px 24px', borderTop: '1px solid var(--c-border-soft)', background: '#fff', display: 'flex', gap: 10 }}>
                <button onClick={() => updateLeadStatus(lead.id, 'contacted')}
                  style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1.5px solid var(--c-border)', fontSize: 13.5, fontWeight: 600, color: 'var(--c-ink-3)', cursor: 'pointer', background: '#fff' }}>
                  Mark contacted
                </button>
                <button onClick={() => qualifyLead(lead)}
                  style={{ flex: 1, padding: '10px', borderRadius: 10, background: '#059669', color: '#fff', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', border: 'none', transition: 'transform .15s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = ''}>
                  Qualify → Pipeline
                </button>
              </div>
            </div>
          </>,
          document.body
        )
      })()}

      {/* Add Lead Modal */}
      {addOpen && (
        <div onClick={() => setAddOpen(false)} className="modal-overlay">
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 500, background: '#fff', borderRadius: 22, overflow: 'hidden', boxShadow: 'var(--shadow-modal)', animation: 'popIn .22s cubic-bezier(.2,.9,.3,1) both' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--c-border-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18 }}>Add lead</div>
              <button onClick={() => setAddOpen(false)} style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--c-fill)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}><X size={15} color="var(--c-muted)" /></button>
            </div>
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 5 }}>Contact name *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Priya Verma" style={inputStyle}
                    onFocus={e => { e.target.style.borderColor = 'var(--c-ink)'; e.target.style.background = '#fff' }}
                    onBlur={e => { e.target.style.borderColor = 'var(--c-border)'; e.target.style.background = 'var(--c-fill)' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 5 }}>Company *</label>
                  <input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} placeholder="Nourish Co" style={inputStyle}
                    onFocus={e => { e.target.style.borderColor = 'var(--c-ink)'; e.target.style.background = '#fff' }}
                    onBlur={e => { e.target.style.borderColor = 'var(--c-border)'; e.target.style.background = 'var(--c-fill)' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 5 }}>Email</label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="founder@brand.com" style={inputStyle}
                    onFocus={e => { e.target.style.borderColor = 'var(--c-ink)'; e.target.style.background = '#fff' }}
                    onBlur={e => { e.target.style.borderColor = 'var(--c-border)'; e.target.style.background = 'var(--c-fill)' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 5 }}>Phone</label>
                  <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+91 98765 43210" style={inputStyle}
                    onFocus={e => { e.target.style.borderColor = 'var(--c-ink)'; e.target.style.background = '#fff' }}
                    onBlur={e => { e.target.style.borderColor = 'var(--c-border)'; e.target.style.background = 'var(--c-fill)' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 5 }}>Budget</label>
                  <input value={form.budget_text} onChange={e => setForm(f => ({ ...f, budget_text: e.target.value }))} placeholder="₹40K/mo" style={inputStyle}
                    onFocus={e => { e.target.style.borderColor = 'var(--c-ink)'; e.target.style.background = '#fff' }}
                    onBlur={e => { e.target.style.borderColor = 'var(--c-border)'; e.target.style.background = 'var(--c-fill)' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 5 }}>Source</label>
                  <select value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}>
                    {SOURCES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 5 }}>Service</label>
                  <select value={form.service} onChange={e => setForm(f => ({ ...f, service: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}>
                    {SERVICES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 5 }}>Assign to</label>
                  <select value={form.owner_id} onChange={e => setForm(f => ({ ...f, owner_id: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}>
                    <option value="">Unassigned</option>
                    {state.users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 7 }}>Score</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['hot', 'warm', 'cold'] as const).map(s => {
                    const sc = SCORE_STYLE[s]
                    return (
                      <button key={s} onClick={() => setForm(f => ({ ...f, score: s }))}
                        style={{ flex: 1, padding: '8px 0', borderRadius: 9, fontSize: 13, fontWeight: 700, border: `1.5px solid ${form.score === s ? sc.c : 'var(--c-border)'}`, color: form.score === s ? sc.c : 'var(--c-muted)', background: form.score === s ? sc.bg : '#fff', cursor: 'pointer', transition: 'all .15s' }}>
                        {sc.label}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 5 }}>Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Context, referral source, key interests..."
                  style={{ ...inputStyle, resize: 'none' }}
                  onFocus={e => { e.target.style.borderColor = 'var(--c-ink)'; e.target.style.background = '#fff' }}
                  onBlur={e => { e.target.style.borderColor = 'var(--c-border)'; e.target.style.background = 'var(--c-fill)' }} />
              </div>
            </div>
            <div style={{ padding: '14px 24px', borderTop: '1px solid var(--c-border-soft)', display: 'flex', gap: 10 }}>
              <button onClick={() => setAddOpen(false)} style={{ flex: 1, padding: '11px', borderRadius: 10, border: '1.5px solid var(--c-border)', fontSize: 14, fontWeight: 600, color: 'var(--c-subtle)', cursor: 'pointer', background: '#fff' }}>Cancel</button>
              <button onClick={addLead} style={{ flex: 2, padding: '11px', borderRadius: 10, background: 'var(--c-ink)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', border: 'none', transition: 'transform .15s' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = ''}>
                Add lead
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
