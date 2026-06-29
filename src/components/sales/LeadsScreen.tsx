'use client'
import { useState } from 'react'
import { useApp, useToast } from '@/lib/store'
import { Plus, X, Check, Sparkle, Spinner } from '@/components/ui/Icon'

const SEED_LEADS = [
  { id: 'l1', name: 'Priya Verma', company: 'Nourish Co', email: 'priya@nourishco.in', phone: '+91 98765 43210', source: 'Instagram', service: 'Social Media', budget: '₹40K/mo', status: 'hot', notes: 'Saw our SUNSO work, loves the aesthetic.' },
  { id: 'l2', name: 'Aarav Mehta', company: 'FreshRoutes', email: 'aarav@freshroutes.com', phone: '+91 87654 32109', source: 'Referral', service: 'Performance Ads', budget: '₹60K/mo', status: 'warm', notes: 'Referred by Elysian Trails. Wants ROAS focus.' },
  { id: 'l3', name: 'Sanya Chawla', company: 'Drape Atelier', email: 'sanya@drape.in', phone: '', source: 'Website', service: 'SEO + Content', budget: '₹25K/mo', status: 'warm', notes: 'Submitted inquiry form, needs follow-up call.' },
  { id: 'l4', name: 'Vikram Nair', company: 'TechNest', email: 'vikram@technest.io', phone: '+91 76543 21098', source: 'LinkedIn', service: 'Full Retainer', budget: '₹1.2L/mo', status: 'cold', notes: 'B2B SaaS, different niche. Explore fit.' },
]

const STATUS_COLORS: Record<string, { c: string; bg: string; label: string }> = {
  hot: { c: '#DC2626', bg: '#FEE2E2', label: '🔥 Hot' },
  warm: { c: '#C99211', bg: '#FCF3D9', label: '♨️ Warm' },
  cold: { c: '#2563EB', bg: '#EAF1FF', label: '❄️ Cold' },
}

export default function LeadsScreen() {
  const { state } = useApp()
  const toast = useToast()
  const [leads, setLeads] = useState(SEED_LEADS)
  const [addOpen, setAddOpen] = useState(false)
  const [aiLoading, setAiLoading] = useState<string | null>(null)
  const [aiPitch, setAiPitch] = useState<Record<string, string>>({})
  const [form, setForm] = useState({ name: '', company: '', email: '', phone: '', source: 'Website', service: 'Social Media', budget: '', status: 'warm', notes: '' })

  function addLead() {
    if (!form.name.trim() || !form.company.trim()) return
    setLeads(ls => [...ls, { id: `lead-${Date.now()}`, ...form }])
    toast('Lead added')
    setAddOpen(false)
    setForm({ name: '', company: '', email: '', phone: '', source: 'Website', service: 'Social Media', budget: '', status: 'warm', notes: '' })
  }

  async function generatePitch(lead: typeof leads[0]) {
    setAiLoading(lead.id)
    try {
      const res = await fetch('/api/ai/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'pitch', lead })
      })
      const { text } = await res.json()
      setAiPitch(p => ({ ...p, [lead.id]: text || '' }))
    } catch {
      setAiPitch(p => ({ ...p, [lead.id]: `Hi ${lead.name.split(' ')[0]}, I noticed ${lead.company} is growing — we've driven strong results for similar brands in your space. Happy to share how we can do the same for you. Can we hop on a 20-min call this week?` }))
    } finally {
      setAiLoading(null)
    }
  }

  const hotCount = leads.filter(l => l.status === 'hot').length
  const warmCount = leads.filter(l => l.status === 'warm').length

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 4 }}>Leads</h1>
          <div style={{ display: 'flex', gap: 8 }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: '#DC2626', background: '#FEE2E2', borderRadius: 7, padding: '3px 8px' }}>{hotCount} hot</span>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: '#C99211', background: '#FCF3D9', borderRadius: 7, padding: '3px 8px' }}>{warmCount} warm</span>
          </div>
        </div>
        <button onClick={() => setAddOpen(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'var(--c-ink)', color: '#fff', borderRadius: 10, padding: '9px 16px', fontWeight: 600, fontSize: 13 }}>
          <Plus size={13} />Add Lead
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {leads.map(lead => {
          const st = STATUS_COLORS[lead.status] || STATUS_COLORS.cold
          return (
            <div key={lead.id} style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 16, padding: '18px 20px', transition: 'box-shadow .15s' }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,.08)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: 'var(--c-fill)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: 'var(--c-muted)', flexShrink: 0 }}>
                  {lead.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <span style={{ fontSize: 15, fontWeight: 700 }}>{lead.name}</span>
                    <span style={{ fontSize: 12, color: 'var(--c-faint)' }}>·</span>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--c-subtle)' }}>{lead.company}</span>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: st.c, background: st.bg, borderRadius: 7, padding: '3px 8px', marginLeft: 'auto' }}>{st.label}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
                    {lead.email && <span style={{ fontSize: 12.5, color: 'var(--c-subtle)' }}>{lead.email}</span>}
                    {lead.phone && <span style={{ fontSize: 12.5, color: 'var(--c-subtle)' }}>{lead.phone}</span>}
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--c-accent)' }}>{lead.budget}</span>
                    <span style={{ fontSize: 12.5, color: 'var(--c-faint)' }}>via {lead.source}</span>
                    <span style={{ fontSize: 12.5, color: 'var(--c-faint)' }}>{lead.service}</span>
                  </div>
                  {lead.notes && <p style={{ fontSize: 13, color: 'var(--c-subtle)', margin: 0, lineHeight: 1.5 }}>{lead.notes}</p>}
                  {aiPitch[lead.id] && (
                    <div style={{ marginTop: 10, padding: '10px 12px', background: 'rgba(255,92,31,.04)', border: '1px solid rgba(255,92,31,.15)', borderRadius: 10, fontSize: 13, lineHeight: 1.6, animation: 'fadeUp .3s ease both' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#FF7A45', letterSpacing: '.05em', marginBottom: 5 }}>AI PITCH DRAFT</div>
                      <p style={{ margin: 0 }}>{aiPitch[lead.id]}</p>
                      <button onClick={() => { navigator.clipboard.writeText(aiPitch[lead.id]); toast('Copied!') }}
                        style={{ marginTop: 8, fontSize: 12, fontWeight: 600, color: 'var(--c-accent)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                        Copy
                      </button>
                    </div>
                  )}
                </div>
                <button onClick={() => generatePitch(lead)} disabled={aiLoading === lead.id}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, color: '#FF5C1F', background: 'rgba(255,92,31,.06)', border: '1px solid rgba(255,92,31,.2)', borderRadius: 8, padding: '7px 12px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {aiLoading === lead.id ? <Spinner size={12} color="#FF5C1F" /> : <Sparkle size={12} color="#FF5C1F" />}
                  AI pitch
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Add Lead Modal */}
      {addOpen && (
        <div onClick={() => setAddOpen(false)} className="modal-overlay">
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 480, background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--shadow-modal)', animation: 'popIn .22s cubic-bezier(.2,.9,.3,1) both' }}>
            <div style={{ padding: '20px 22px', borderBottom: '1px solid var(--c-border-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>Add Lead</div>
              <button onClick={() => setAddOpen(false)}><X size={15} color="var(--c-ghost)" /></button>
            </div>
            <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 5 }}>Name *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Priya Verma"
                    style={{ width: '100%', border: '1.5px solid var(--c-border)', borderRadius: 10, padding: '10px 12px', fontSize: 14 }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 5 }}>Company *</label>
                  <input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} placeholder="e.g. Nourish Co"
                    style={{ width: '100%', border: '1.5px solid var(--c-border)', borderRadius: 10, padding: '10px 12px', fontSize: 14 }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 5 }}>Email</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="e.g. priya@brand.com"
                  style={{ width: '100%', border: '1.5px solid var(--c-border)', borderRadius: 10, padding: '10px 12px', fontSize: 14 }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 5 }}>Budget</label>
                  <input value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} placeholder="e.g. ₹40K/mo"
                    style={{ width: '100%', border: '1.5px solid var(--c-border)', borderRadius: 10, padding: '10px 12px', fontSize: 14 }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 5 }}>Source</label>
                  <select value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
                    style={{ width: '100%', border: '1.5px solid var(--c-border)', borderRadius: 10, padding: '10px 12px', fontSize: 14 }}>
                    {['Instagram', 'Referral', 'Website', 'LinkedIn', 'Cold outreach', 'Other'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 5 }}>Status</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {['hot', 'warm', 'cold'].map(s => {
                    const st = STATUS_COLORS[s]
                    return (
                      <button key={s} onClick={() => setForm(f => ({ ...f, status: s }))}
                        style={{ flex: 1, padding: '7px', borderRadius: 8, fontSize: 12.5, fontWeight: 600, border: '1.5px solid', borderColor: form.status === s ? st.c : 'var(--c-border)', color: form.status === s ? st.c : 'var(--c-muted)', background: form.status === s ? st.bg : '#fff' }}>
                        {st.label}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 5 }}>Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Any context or notes..."
                  style={{ width: '100%', border: '1.5px solid var(--c-border)', borderRadius: 10, padding: '10px 12px', fontSize: 14, resize: 'none' }} />
              </div>
            </div>
            <div style={{ padding: '14px 22px', borderTop: '1px solid var(--c-border-soft)', display: 'flex', gap: 10 }}>
              <button onClick={() => setAddOpen(false)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1.5px solid var(--c-border)', fontSize: 14, fontWeight: 600, color: 'var(--c-subtle)' }}>Cancel</button>
              <button onClick={addLead} style={{ flex: 2, padding: '10px', borderRadius: 10, background: 'var(--c-ink)', color: '#fff', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                <Check size={14} color="#fff" />Add Lead
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
