'use client'
import { useState } from 'react'
import { useApp, useToast } from '@/lib/store'
import { Plus, X, Sparkle, Spinner } from '@/components/ui/Icon'

const SEED_LEADS = [
  { id: 'l1', name: 'Riya Sstandford', company: 'Sundara Wellness', initials: 'RS', color: '#FF5C1F', email: 'riya@sundara.in', phone: '+91 98765 43210', source: 'Instagram DM', service: 'Social Media', budget: '₹45K/mo', score: 'hot', lead_status: 'new', owner: 'Meera', notes: 'Saw our SUNSO work, loves the aesthetic. Ready to start next month.' },
  { id: 'l2', name: 'Karan Bose', company: 'Foundry Coworks', initials: 'KB', color: '#F4B740', email: 'karan@foundry.co', phone: '+91 87654 32109', source: 'Referral', service: 'Performance Ads', budget: '₹60K/mo', score: 'hot', lead_status: 'contacted', owner: 'Arjun', notes: 'Referred by Elysian Trails. Wants ROAS focus. Already shared proposal.' },
  { id: 'l3', name: 'Anjali Rao', company: 'Petal & Co.', initials: 'AR', color: '#8B5CF6', email: 'anjali@petal.in', phone: '+91 76543 21098', source: 'Website form', service: 'SEO + Content', budget: '₹30K/mo', score: 'warm', lead_status: 'new', owner: 'Meera', notes: 'Submitted inquiry form, needs follow-up call.' },
  { id: 'l4', name: 'Vikram Shetty', company: 'Drift Eyewear', initials: 'VS', color: '#C99211', email: 'vikram@drift.com', phone: '+91 65432 10987', source: 'LinkedIn', service: 'Full Retainer', budget: '₹85K/mo', score: 'warm', lead_status: 'qualified', owner: 'Arjun', notes: 'D2C brand growing fast. Met at the ecomm summit. Strong fit.' },
  { id: 'l5', name: 'Naomi Pinto', company: 'Saffron Kitchen', initials: 'NP', color: '#10B981', email: 'naomi@saffron.in', phone: '', source: 'Instagram DM', service: 'Social Media', budget: '₹20K/mo', score: 'cold', lead_status: 'new', owner: 'Meera', notes: 'Early stage, small budget. Nurture for Q3.' },
  { id: 'l6', name: 'Aditya Menon', company: 'Cobalt Studios', initials: 'AM', color: '#2563EB', email: 'aditya@cobalt.io', phone: '+91 54321 09876', source: 'Referral', service: 'Branding + Social', budget: '₹70K/mo', score: 'hot', lead_status: 'contacted', owner: 'Arjun', notes: 'Creative studio expanding to digital. Wants to move fast.' },
]

const SCORE_STYLE: Record<string, { c: string; bg: string; label: string }> = {
  hot:  { c: '#DC2626', bg: '#FEE2E2', label: 'Hot' },
  warm: { c: '#C99211', bg: '#FCF3D9', label: 'Warm' },
  cold: { c: '#2563EB', bg: '#EAF1FF', label: 'Cold' },
}

const STATUS_STYLE: Record<string, { c: string; bg: string }> = {
  new:       { c: '#6B7280', bg: '#F3F4F6' },
  contacted: { c: '#2563EB', bg: '#EFF6FF' },
  qualified: { c: '#059669', bg: '#ECFDF5' },
}

const OWNERS = ['Meera', 'Arjun', 'Dev', 'Ira']
const SOURCES = ['Instagram DM', 'Referral', 'Website form', 'LinkedIn', 'Cold outreach', 'Other']

type Lead = typeof SEED_LEADS[0]

export default function LeadsScreen() {
  const { state } = useApp()
  const toast = useToast()
  const [leads, setLeads] = useState(SEED_LEADS)
  const [selected, setSelected] = useState<Lead | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiPitch, setAiPitch] = useState('')
  const [form, setForm] = useState({ name: '', company: '', email: '', phone: '', source: 'Website form', service: 'Social Media', budget: '', score: 'warm', lead_status: 'new', owner: OWNERS[0], notes: '' })

  const hotCount = leads.filter(l => l.score === 'hot').length
  const warmCount = leads.filter(l => l.score === 'warm').length
  const newThisWeek = leads.filter(l => l.lead_status === 'new').length
  const winRate = Math.round((leads.filter(l => l.lead_status === 'qualified').length / leads.length) * 100)

  function addLead() {
    if (!form.name.trim() || !form.company.trim()) return
    const initials = form.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    const colors = ['#FF5C1F','#F4B740','#8B5CF6','#10B981','#2563EB','#EF4444','#0EA5A4']
    setLeads(ls => [...ls, { id: `lead-${Date.now()}`, ...form, initials, color: colors[ls.length % colors.length] }])
    toast('Lead added')
    setAddOpen(false)
    setForm({ name: '', company: '', email: '', phone: '', source: 'Website form', service: 'Social Media', budget: '', score: 'warm', lead_status: 'new', owner: OWNERS[0], notes: '' })
  }

  function updateStatus(id: string, lead_status: string) {
    setLeads(ls => ls.map(l => l.id === id ? { ...l, lead_status } : l))
    if (selected?.id === id) setSelected(s => s ? { ...s, lead_status } : s)
    toast(`Marked as ${lead_status}`)
  }

  async function generatePitch(lead: Lead) {
    setAiLoading(true)
    setAiPitch('')
    try {
      const res = await fetch('/api/ai/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'pitch', lead })
      })
      const { text } = await res.json()
      setAiPitch(text || '')
    } catch {
      setAiPitch(`Hi ${lead.name.split(' ')[0]},\n\nI noticed ${lead.company} is building something exciting — we've driven strong results for similar brands in your space. We'd love to share how we can do the same for you.\n\nCould we hop on a quick 20-min call this week?\n\nWarm regards,\nMavixy Team`)
    } finally {
      setAiLoading(false)
    }
  }

  function openLead(lead: Lead) {
    setSelected(lead)
    setAiPitch('')
  }

  return (
    <div style={{ maxWidth: 1040, margin: '0 auto', animation: 'fadeIn .4s ease both' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <div>
          <div style={{ fontSize: 12.5, color: 'var(--c-faint)', fontWeight: 500, marginBottom: 5 }}>Sales</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em' }}>Inbound leads</h1>
        </div>
        <button onClick={() => setAddOpen(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--c-ink)', color: '#fff', borderRadius: 11, padding: '10px 18px', fontWeight: 700, fontSize: 13.5, transition: 'transform .15s' }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = ''}>
          <Plus size={14} />Add lead
        </button>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'New this week', val: newThisWeek, color: 'var(--c-ink)' },
          { label: 'Hot leads', val: hotCount, color: '#DC2626' },
          { label: 'Avg response', val: '1.4h', color: 'var(--c-ink)' },
          { label: 'Win rate', val: `${winRate}%`, color: 'var(--c-green)' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', border: '1px solid var(--c-border)', borderRadius: 16, padding: '18px 20px' }}>
            <div style={{ fontSize: 12.5, color: 'var(--c-faint)', marginBottom: 7 }}>{s.label}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 700, color: s.color }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: '#fff', border: '1px solid var(--c-border)', borderRadius: 18, overflow: 'hidden' }}>
        {/* Table head */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 120px 140px 120px', gap: 0, padding: '10px 22px', borderBottom: '1px solid var(--c-border-soft)' }}>
          {['LEAD', 'SOURCE', 'SCORE', 'OWNER', 'STATUS'].map(h => (
            <div key={h} style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-ghost)', letterSpacing: '.07em' }}>{h}</div>
          ))}
        </div>

        {/* Table rows */}
        {leads.map((lead, i) => {
          const sc = SCORE_STYLE[lead.score]
          const st = STATUS_STYLE[lead.lead_status] || STATUS_STYLE.new
          return (
            <div key={lead.id} onClick={() => openLead(lead)}
              style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 120px 140px 120px', alignItems: 'center', padding: '14px 22px', borderBottom: i < leads.length - 1 ? '1px solid var(--c-border-soft)' : 'none', cursor: 'pointer', transition: 'background .12s', animation: `fadeUp .35s ease ${i * 0.04}s both` }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--c-fill-soft)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>

              {/* Lead col */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 11, background: lead.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                  {lead.initials}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-ink)' }}>{lead.name}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--c-faint)', marginTop: 1 }}>{lead.company}</div>
                </div>
              </div>

              {/* Source col */}
              <div style={{ fontSize: 13.5, color: 'var(--c-subtle)' }}>{lead.source}</div>

              {/* Score col */}
              <div>
                <span style={{ fontSize: 12, fontWeight: 700, color: sc.c, background: sc.bg, borderRadius: 7, padding: '3px 10px' }}>{sc.label}</span>
              </div>

              {/* Owner col */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: lead.owner === 'Arjun' ? '#6366F1' : lead.owner === 'Dev' ? '#8B5CF6' : '#0EA5A4', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700 }}>
                  {lead.owner.slice(0, 2).toUpperCase()}
                </div>
                <span style={{ fontSize: 13.5, color: 'var(--c-ink-2)', fontWeight: 500 }}>{lead.owner}</span>
              </div>

              {/* Status col */}
              <div>
                <span style={{ fontSize: 12, fontWeight: 700, color: st.c, background: st.bg, borderRadius: 7, padding: '3px 10px', textTransform: 'capitalize' }}>{lead.lead_status}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Lead detail drawer */}
      {selected && (() => {
        const lead = leads.find(l => l.id === selected.id) || selected
        const sc = SCORE_STYLE[lead.score]
        const st = STATUS_STYLE[lead.lead_status] || STATUS_STYLE.new
        return (
          <>
            {/* Full-screen backdrop — covers header and sidebar so they're not interactive */}
            <div onClick={() => { setSelected(null); setAiPitch('') }}
              style={{ position: 'fixed', inset: 0, zIndex: 1200, background: 'rgba(15,23,42,.35)', backdropFilter: 'blur(2px)', animation: 'fadeIn .18s ease both' }} />
            <div onClick={e => e.stopPropagation()}
              style={{ position: 'fixed', top: 0, right: 0, width: 480, height: '100vh', background: '#FAFBF9', boxShadow: '-12px 0 60px rgba(0,0,0,.18)', display: 'flex', flexDirection: 'column', animation: 'slideInRight .25s cubic-bezier(.2,.9,.3,1) both', zIndex: 1201 }}>

              {/* Drawer header */}
              <div style={{ padding: '20px 24px 18px', borderBottom: '1px solid var(--c-border-soft)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
                    <div style={{ width: 50, height: 50, borderRadius: 15, background: lead.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17 }}>
                      {lead.initials}
                    </div>
                    <div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 700 }}>{lead.name}</div>
                      <div style={{ fontSize: 13.5, color: 'var(--c-faint)', marginTop: 2 }}>{lead.company}</div>
                    </div>
                  </div>
                  <button onClick={() => { setSelected(null); setAiPitch('') }}
                    style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--c-fill)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <X size={15} color="var(--c-muted)" />
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: sc.c, background: sc.bg, borderRadius: 7, padding: '4px 10px' }}>{sc.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: st.c, background: st.bg, borderRadius: 7, padding: '4px 10px', textTransform: 'capitalize' }}>{lead.lead_status}</span>
                  {lead.budget && <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-accent-dark)', background: 'var(--c-accent-bg)', borderRadius: 7, padding: '4px 10px' }}>{lead.budget}</span>}
                </div>
              </div>

              {/* Drawer body */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
                {/* Info grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
                  {[
                    { label: 'Source', val: lead.source },
                    { label: 'Service', val: lead.service },
                    { label: 'Owner', val: lead.owner },
                    { label: 'Budget', val: lead.budget || '—' },
                  ].map(f => (
                    <div key={f.label} style={{ background: 'var(--c-fill)', borderRadius: 10, padding: '11px 13px' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-faint)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>{f.label}</div>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--c-ink-2)' }}>{f.val}</div>
                    </div>
                  ))}
                </div>

                {/* Contact */}
                {(lead.email || lead.phone) && (
                  <div style={{ background: 'var(--c-fill)', borderRadius: 12, padding: '14px 16px', marginBottom: 18 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-faint)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>Contact</div>
                    {lead.email && (
                      <a href={`mailto:${lead.email}`} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, color: 'var(--c-accent-dark)', fontWeight: 600, marginBottom: lead.phone ? 7 : 0 }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6"/></svg>
                        {lead.email}
                      </a>
                    )}
                    {lead.phone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, color: 'var(--c-ink-2)', fontWeight: 500 }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--c-faint)" strokeWidth="2" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.65 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.56 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                        {lead.phone}
                      </div>
                    )}
                  </div>
                )}

                {/* Notes */}
                {lead.notes && (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-faint)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>Notes</div>
                    <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--c-ink-3)', margin: 0 }}>{lead.notes}</p>
                  </div>
                )}

                {/* Status actions */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-faint)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>Update status</div>
                  <div style={{ display: 'flex', gap: 7 }}>
                    {(['new', 'contacted', 'qualified'] as const).map(s => {
                      const sst = STATUS_STYLE[s]
                      const active = lead.lead_status === s
                      return (
                        <button key={s} onClick={() => updateStatus(lead.id, s)}
                          style={{ flex: 1, padding: '8px 0', borderRadius: 9, fontSize: 12.5, fontWeight: 700, border: `1.5px solid ${active ? sst.c : 'var(--c-border)'}`, color: active ? sst.c : 'var(--c-muted)', background: active ? sst.bg : '#fff', textTransform: 'capitalize', transition: 'all .15s', cursor: 'pointer' }}>
                          {s}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* AI Pitch */}
                <div style={{ background: 'var(--c-ink)', borderRadius: 14, padding: '16px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: aiPitch ? 12 : 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <Sparkle size={13} color="#FF5C1F" />
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: '#FF7A45', letterSpacing: '.05em' }}>AI PITCH DRAFT</span>
                    </div>
                    <button onClick={() => generatePitch(lead)} disabled={aiLoading}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: '#fff', background: 'rgba(255,255,255,.1)', borderRadius: 7, padding: '5px 11px', opacity: aiLoading ? .7 : 1 }}>
                      {aiLoading ? <Spinner size={11} color="#fff" /> : <Sparkle size={11} color="#FF5C1F" />}
                      {aiLoading ? 'Writing…' : 'Generate'}
                    </button>
                  </div>
                  {aiPitch ? (
                    <div style={{ animation: 'fadeUp .25s ease both' }}>
                      <p style={{ fontSize: 13.5, lineHeight: 1.65, color: '#E8E6E2', margin: '0 0 12px', whiteSpace: 'pre-line' }}>{aiPitch}</p>
                      <button onClick={() => { navigator.clipboard.writeText(aiPitch); toast('Copied!') }}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: '#FF7A45', background: 'rgba(255,92,31,.15)', borderRadius: 7, padding: '5px 11px' }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                        Copy pitch
                      </button>
                    </div>
                  ) : (
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,.35)', fontStyle: 'italic', marginTop: 10 }}>Generate a personalised pitch for {lead.name.split(' ')[0]}.</p>
                  )}
                </div>
              </div>

              {/* Drawer footer */}
              <div style={{ padding: '14px 24px', borderTop: '1px solid var(--c-border-soft)', display: 'flex', gap: 10 }}>
                <button onClick={() => { updateStatus(lead.id, 'contacted'); toast('Marked as contacted') }}
                  style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1.5px solid var(--c-border)', fontSize: 13.5, fontWeight: 600, color: 'var(--c-ink-3)', cursor: 'pointer' }}>
                  Mark contacted
                </button>
                <button onClick={() => { updateStatus(lead.id, 'qualified'); toast(`${lead.name.split(' ')[0]} qualified!`) }}
                  style={{ flex: 1, padding: '10px', borderRadius: 10, background: 'var(--c-ink)', color: '#fff', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', transition: 'transform .15s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = ''}>
                  Qualify lead
                </button>
              </div>
            </div>
          </>
        )
      })()}

      {/* Add Lead Modal */}
      {addOpen && (
        <div onClick={() => setAddOpen(false)} className="modal-overlay">
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 500, background: '#fff', borderRadius: 22, overflow: 'hidden', boxShadow: 'var(--shadow-modal)', animation: 'popIn .22s cubic-bezier(.2,.9,.3,1) both' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--c-border-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18 }}>Add lead</div>
              <button onClick={() => setAddOpen(false)} style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--c-fill)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={15} color="var(--c-muted)" /></button>
            </div>
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 5 }}>Name *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Priya Verma"
                    style={{ width: '100%', border: '1.5px solid var(--c-border)', borderRadius: 10, padding: '10px 12px', fontSize: 14, background: 'var(--c-fill)' }}
                    onFocus={e => { e.target.style.borderColor = 'var(--c-ink)'; e.target.style.background = '#fff' }}
                    onBlur={e => { e.target.style.borderColor = 'var(--c-border)'; e.target.style.background = 'var(--c-fill)' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 5 }}>Company *</label>
                  <input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} placeholder="e.g. Nourish Co"
                    style={{ width: '100%', border: '1.5px solid var(--c-border)', borderRadius: 10, padding: '10px 12px', fontSize: 14, background: 'var(--c-fill)' }}
                    onFocus={e => { e.target.style.borderColor = 'var(--c-ink)'; e.target.style.background = '#fff' }}
                    onBlur={e => { e.target.style.borderColor = 'var(--c-border)'; e.target.style.background = 'var(--c-fill)' }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 5 }}>Email</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="founder@brand.com"
                  style={{ width: '100%', border: '1.5px solid var(--c-border)', borderRadius: 10, padding: '10px 12px', fontSize: 14, background: 'var(--c-fill)' }}
                  onFocus={e => { e.target.style.borderColor = 'var(--c-ink)'; e.target.style.background = '#fff' }}
                  onBlur={e => { e.target.style.borderColor = 'var(--c-border)'; e.target.style.background = 'var(--c-fill)' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 5 }}>Budget</label>
                  <input value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} placeholder="₹40K/mo"
                    style={{ width: '100%', border: '1.5px solid var(--c-border)', borderRadius: 10, padding: '10px 12px', fontSize: 14, background: 'var(--c-fill)' }}
                    onFocus={e => { e.target.style.borderColor = 'var(--c-ink)'; e.target.style.background = '#fff' }}
                    onBlur={e => { e.target.style.borderColor = 'var(--c-border)'; e.target.style.background = 'var(--c-fill)' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 5 }}>Source</label>
                  <select value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
                    style={{ width: '100%', border: '1.5px solid var(--c-border)', borderRadius: 10, padding: '10px 12px', fontSize: 14, background: 'var(--c-fill)', cursor: 'pointer' }}>
                    {SOURCES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 5 }}>Owner</label>
                  <select value={form.owner} onChange={e => setForm(f => ({ ...f, owner: e.target.value }))}
                    style={{ width: '100%', border: '1.5px solid var(--c-border)', borderRadius: 10, padding: '10px 12px', fontSize: 14, background: 'var(--c-fill)', cursor: 'pointer' }}>
                    {state.users.length > 0
                      ? state.users.map(u => <option key={u.id} value={u.name.split(' ')[0]}>{u.name}</option>)
                      : OWNERS.map(o => <option key={o}>{o}</option>)
                    }
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 5 }}>Score</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {(['hot', 'warm', 'cold'] as const).map(s => {
                      const sc = SCORE_STYLE[s]
                      return (
                        <button key={s} onClick={() => setForm(f => ({ ...f, score: s }))}
                          style={{ flex: 1, padding: '7px 0', borderRadius: 8, fontSize: 12, fontWeight: 700, border: `1.5px solid ${form.score === s ? sc.c : 'var(--c-border)'}`, color: form.score === s ? sc.c : 'var(--c-muted)', background: form.score === s ? sc.bg : '#fff', cursor: 'pointer', transition: 'all .15s' }}>
                          {sc.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 5 }}>Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Context, referral source, key interest..."
                  style={{ width: '100%', border: '1.5px solid var(--c-border)', borderRadius: 10, padding: '10px 12px', fontSize: 14, resize: 'none', background: 'var(--c-fill)' }}
                  onFocus={e => { e.target.style.borderColor = 'var(--c-ink)'; e.target.style.background = '#fff' }}
                  onBlur={e => { e.target.style.borderColor = 'var(--c-border)'; e.target.style.background = 'var(--c-fill)' }} />
              </div>
            </div>
            <div style={{ padding: '14px 24px', borderTop: '1px solid var(--c-border-soft)', display: 'flex', gap: 10 }}>
              <button onClick={() => setAddOpen(false)} style={{ flex: 1, padding: '11px', borderRadius: 10, border: '1.5px solid var(--c-border)', fontSize: 14, fontWeight: 600, color: 'var(--c-subtle)', cursor: 'pointer' }}>Cancel</button>
              <button onClick={addLead} style={{ flex: 2, padding: '11px', borderRadius: 10, background: 'var(--c-ink)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'transform .15s' }}
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
