'use client'
import { useState } from 'react'
import { useApp, useToast, useUpsertClient, useDeleteClient } from '@/lib/store'
import { Sparkle, Spinner } from '@/components/ui/Icon'
import { STATUS_PIPE } from '@/lib/seed-data'

function HealthRing({ score, size = 80 }: { score: number; size?: number }) {
  const r = (size - 14) / 2
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - score / 100)
  const color = score >= 75 ? '#10B981' : score >= 60 ? '#F59E0B' : '#EF4444'
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)', position: 'absolute', inset: 0 }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#E5E7EB" strokeWidth={8} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={8}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 22, fontWeight: 800, color, fontFamily: 'var(--font-display)', lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: 9.5, color: 'var(--c-faint)', marginTop: 2 }}>health score</span>
      </div>
    </div>
  )
}

export default function ClientDetail() {
  const { state, dispatch } = useApp()
  const toast = useToast()
  const upsertClient = useUpsertClient()
  const deleteClient = useDeleteClient()
  const [menuOpen, setMenuOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [brainEditMode, setBrainEditMode] = useState(false)
  const [brainEdits, setBrainEdits] = useState<Record<string, string>>({})
  const [brainSaving, setBrainSaving] = useState(false)

  const client = state.clients.find(c => c.id === state.selectedClientId) || state.clients[0]
  if (!client) return null

  const clientItems = state.planItems.filter(i => i.client_id === client.id)
  const upcomingItems = clientItems.filter(i => i.status !== 'published').slice(0, 5)
  const owner = state.users.find(u => u.id === client.account_owner_id)

  const hb = client.health >= 75
    ? { label: 'Healthy', color: '#10B981', bg: '#ECFDF5' }
    : client.health >= 60
    ? { label: 'Monitor', color: '#F59E0B', bg: '#FFFBEB' }
    : { label: 'At risk', color: '#EF4444', bg: '#FEF2F2' }

  const typeCounts: Record<string, number> = {}
  clientItems.forEach(i => { typeCounts[i.type] = (typeCounts[i.type] || 0) + 1 })
  const CONTENT_SLOTS = [
    { label: 'Reels',     count: typeCounts['Reel'] || 0,      color: '#8B5CF6' },
    { label: 'Carousels', count: typeCounts['Carousel'] || 0,  color: '#F59E0B' },
    { label: 'Stories',   count: typeCounts['Story'] || 0,     color: '#10B981' },
    { label: 'Posts',     count: typeCounts['Post'] || 0,      color: '#3B82F6' },
  ]

  const clientHandle = client.name.toLowerCase().replace(/\s+/g, '').slice(0, 12)
  const SOCIALS = [
    { key: 'ig', letter: 'I', name: 'Instagram', handle: `@${clientHandle}`, color: '#E1306C', bg: '#FDF2F8', linked: true },
    { key: 'fb', letter: 'F', name: 'Facebook Page', handle: client.name, color: '#1877F2', bg: '#EFF6FF', linked: true },
    { key: 'yt', letter: 'Y', name: 'YouTube', handle: `@${clientHandle}`, color: '#FF0000', bg: '#FEF2F2', linked: false },
  ]
  const linkedCount = SOCIALS.filter(s => s.linked).length

  const ACTIVITY = [
    { dot: '#10B981', text: `Latest content approved by ${client.name}`, time: 'Today, 9:14 AM' },
    { dot: '#FF5C1F', text: 'AI drafted the next progress update — awaiting review', time: 'Today, 8:02 AM' },
    { dot: '#3B82F6', text: `New WhatsApp message from ${client.name}`, time: '2h ago' },
    { dot: '#8B5CF6', text: '3 new reference assets added to the asset bank', time: 'Yesterday' },
  ]

  const COMMS = [
    { ch: 'WA', from: client.name, text: 'Loved the last set — can we push the festive content live by Friday?', ago: '2h ago' },
    { ch: 'WA', from: owner?.name ? `${owner.name} (Mavixy)` : 'You (Mavixy)', text: 'On it! In review now, sending for approval today.', ago: '1h ago' },
    { ch: 'EM', from: client.name, text: `Subject: Re: ${client.name} — June performance snapshot`, ago: 'Yesterday' },
  ]

  function bv(key: string) { return brainEdits[key] !== undefined ? brainEdits[key] : ((client as unknown as Record<string,string>)[key] || '') }

  async function saveBrain() {
    setBrainSaving(true)
    await upsertClient({ ...client, ...brainEdits } as typeof client)
    setBrainEdits({})
    setBrainSaving(false)
    setBrainEditMode(false)
    toast('Client Brain updated')
  }

  function handleDelete() {
    deleteClient(client.id)
    dispatch({ type: 'SET_SCREEN', screen: 'clients' })
    toast(`${client.name} removed`)
  }

  const BRAIN_FIELDS = [
    { key: 'about_business',  label: 'About the business', rows: 3, ph: 'What they sell, where, who they are...' },
    { key: 'target_audience', label: 'Target audience',    rows: 1, ph: 'e.g. Women 22–34, tier-1 cities, skincare-curious' },
    { key: 'brand_voice',     label: 'Brand voice & tone', rows: 1, ph: 'e.g. Warm, editorial, confident' },
    { key: 'reference_links', label: 'Reference links',    rows: 2, ph: 'competitor profiles, moodboards, brand guidelines...' },
  ]

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <button onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'clients' })}
          style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 600, color: 'var(--c-subtle)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          All Accounts
        </button>
        <div style={{ position: 'relative' }}>
          <button onClick={() => setMenuOpen(o => !o)}
            style={{ width: 34, height: 34, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', background: menuOpen ? 'var(--c-fill)' : 'transparent', color: 'var(--c-muted)' }}>
            <svg width="4" height="18" viewBox="0 0 4 18" fill="currentColor"><circle cx="2" cy="2" r="2"/><circle cx="2" cy="9" r="2"/><circle cx="2" cy="16" r="2"/></svg>
          </button>
          {menuOpen && (
            <div style={{ position: 'absolute', top: 40, right: 0, background: '#fff', border: '1px solid var(--c-border)', borderRadius: 13, boxShadow: '0 8px 28px rgba(0,0,0,.1)', padding: 6, minWidth: 188, zIndex: 200 }}
              onMouseLeave={() => setMenuOpen(false)}>
              <button onClick={() => { setMenuOpen(false); toast(`${client.name} paused`) }}
                style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13.5, fontWeight: 500, color: 'var(--c-ink)', textAlign: 'left' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--c-fill)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                Put on hold
              </button>
              <div style={{ height: 1, background: 'var(--c-border-soft)', margin: '4px 0' }} />
              <button onClick={() => { setMenuOpen(false); setDeleteOpen(true) }}
                style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13.5, fontWeight: 500, color: '#EF4444', textAlign: 'left' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#FEF2F2')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2"/></svg>
                Delete client
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Hero */}
      <div style={{ background: '#fff', border: '1px solid var(--c-border)', borderRadius: 20, padding: '22px 28px', marginBottom: 22, display: 'flex', alignItems: 'center', gap: 18, justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{ width: 58, height: 58, borderRadius: 18, background: client.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 19, color: '#fff', flexShrink: 0 }}>
            {client.initials}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', color: '#0F172A' }}>{client.name}</h1>
              <span style={{ fontSize: 12, fontWeight: 700, color: hb.color, background: hb.bg, borderRadius: 20, padding: '3px 10px' }}>{hb.label}</span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--c-subtle)', display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              {client.industry && <span>{client.industry}</span>}
              {client.industry && <span style={{ color: 'var(--c-ghost)' }}>·</span>}
              {owner && <span>Owner {owner.name}</span>}
              {owner && <span style={{ color: 'var(--c-ghost)' }}>·</span>}
              <span>Next report in 6 days</span>
            </div>
          </div>
        </div>
        <HealthRing score={client.health} />
      </div>

      {/* Body: two columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20, alignItems: 'start' }}>

        {/* LEFT */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Client Brain */}
          <div style={{ background: '#0F172A', borderRadius: 18, padding: '20px 22px', color: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkle size={14} color="#FF5C1F" />
                <span style={{ fontSize: 11, fontWeight: 700, color: '#FF7A45', letterSpacing: '.08em' }}>CLIENT BRAIN · AI + TEAM KNOWLEDGE</span>
              </div>
              {!brainEditMode ? (
                <button onClick={() => setBrainEditMode(true)}
                  style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,.45)', background: 'rgba(255,255,255,.08)', borderRadius: 7, padding: '4px 10px' }}>
                  Edit
                </button>
              ) : (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => { setBrainEditMode(false); setBrainEdits({}) }}
                    style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,.45)', borderRadius: 7, padding: '4px 10px' }}>Cancel</button>
                  <button onClick={saveBrain} disabled={brainSaving}
                    style={{ fontSize: 12, fontWeight: 700, color: '#fff', background: '#FF5C1F', borderRadius: 7, padding: '4px 12px', opacity: brainSaving ? .7 : 1 }}>
                    {brainSaving ? 'Saving…' : 'Save'}
                  </button>
                </div>
              )}
            </div>

            {brainEditMode ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {BRAIN_FIELDS.map(f => (
                  <div key={f.key}>
                    <label style={{ fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,.35)', textTransform: 'uppercase', letterSpacing: '.07em', display: 'block', marginBottom: 5 }}>{f.label}</label>
                    {f.rows === 1 ? (
                      <input value={bv(f.key)} onChange={e => setBrainEdits(b => ({ ...b, [f.key]: e.target.value }))} placeholder={f.ph}
                        style={{ width: '100%', background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.15)', borderRadius: 9, padding: '9px 12px', color: '#fff', fontSize: 13.5 }} />
                    ) : (
                      <textarea rows={f.rows} value={bv(f.key)} onChange={e => setBrainEdits(b => ({ ...b, [f.key]: e.target.value }))} placeholder={f.ph}
                        style={{ width: '100%', background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.15)', borderRadius: 9, padding: '9px 12px', color: '#fff', fontSize: 13.5, resize: 'vertical', lineHeight: 1.55 }} />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <>
                <p style={{ fontSize: 14, lineHeight: 1.7, color: 'rgba(255,255,255,.75)', marginBottom: 16 }}>
                  {client.about_business || `${client.name} is a client managed by your team. Click Edit to fill in the Client Brain — AI uses this to generate briefs, ideas, and reports for this account.`}
                </p>
                {(client.target_audience || client.brand_voice) && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 16 }}>
                    {client.target_audience && (
                      <div style={{ display: 'flex', gap: 14 }}>
                        <span style={{ fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,.3)', textTransform: 'uppercase', letterSpacing: '.07em', minWidth: 72, paddingTop: 2, flexShrink: 0 }}>AUDIENCE</span>
                        <span style={{ fontSize: 13.5, color: 'rgba(255,255,255,.7)', lineHeight: 1.5 }}>{client.target_audience}</span>
                      </div>
                    )}
                    {client.brand_voice && (
                      <div style={{ display: 'flex', gap: 14 }}>
                        <span style={{ fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,.3)', textTransform: 'uppercase', letterSpacing: '.07em', minWidth: 72, paddingTop: 2, flexShrink: 0 }}>TONE</span>
                        <span style={{ fontSize: 13.5, color: 'rgba(255,255,255,.7)', lineHeight: 1.5 }}>{client.brand_voice}</span>
                      </div>
                    )}
                  </div>
                )}
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,.22)', borderTop: '1px solid rgba(255,255,255,.07)', paddingTop: 12 }}>
                  Every AI idea & new-joiner onboarding for {client.name} draws from this.
                </div>
              </>
            )}
          </div>

          {/* Connected accounts */}
          <div style={{ background: '#fff', border: '1px solid var(--c-border)', borderRadius: 18, padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--c-ink)" strokeWidth="2" strokeLinecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15 }}>Connected accounts</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#10B981', background: '#ECFDF5', borderRadius: 20, padding: '2px 9px' }}>{linkedCount} linked</span>
              </div>
              <span style={{ fontSize: 11.5, color: 'var(--c-ghost)', marginLeft: 'auto' }}>{client.name}'s own channels — used to schedule, publish & pull reports</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
              {SOCIALS.map(s => (
                <div key={s.key} style={{ border: '1px solid var(--c-border-soft)', borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 9, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, color: s.color, flexShrink: 0 }}>{s.letter}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--c-faint)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.handle}</div>
                  </div>
                  {s.linked
                    ? <span style={{ fontSize: 11, fontWeight: 700, color: '#10B981', background: '#ECFDF5', borderRadius: 7, padding: '3px 8px', whiteSpace: 'nowrap' }}>Linked</span>
                    : <button onClick={() => toast('Connect feature coming soon')} style={{ fontSize: 11.5, fontWeight: 700, color: '#fff', background: '#FF5C1F', borderRadius: 7, padding: '4px 9px', whiteSpace: 'nowrap' }}>Connect</button>
                  }
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming content */}
          <div style={{ background: '#fff', border: '1px solid var(--c-border)', borderRadius: 18, padding: '18px 20px' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Upcoming content</div>
            {upcomingItems.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--c-ghost)', fontStyle: 'italic' }}>No upcoming content this month</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {upcomingItems.map(item => {
                  const st = STATUS_PIPE.find(s => s.key === item.status) || { c: '#94A3B8', bg: '#F1F5F9', label: item.status }
                  return (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: 'var(--c-fill)' }}>
                      <div style={{ width: 3, height: 34, borderRadius: 99, background: '#FF5C1F', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
                        <div style={{ fontSize: 12, color: 'var(--c-faint)', marginTop: 1 }}>{item.type}</div>
                      </div>
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: st.c, background: st.bg, borderRadius: 6, padding: '3px 8px', whiteSpace: 'nowrap' }}>{st.label}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Communication */}
          <div style={{ background: '#fff', border: '1px solid var(--c-border)', borderRadius: 18, padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--c-ink)" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15 }}>Communication</span>
            </div>
            <div>
              {COMMS.map((c, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: i < COMMS.length - 1 ? '1px solid var(--c-border-soft)' : 'none' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: c.ch === 'WA' ? '#10B981' : '#3B82F6', background: c.ch === 'WA' ? '#ECFDF5' : '#EFF6FF', borderRadius: 5, padding: '2px 5px', height: 'fit-content', marginTop: 2, flexShrink: 0 }}>{c.ch}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, color: 'var(--c-ink)', lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.text}</div>
                    <div style={{ fontSize: 12, color: 'var(--c-ghost)', marginTop: 2 }}>{c.from} · {c.ago}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* This month's content */}
          <div style={{ background: '#fff', border: '1px solid var(--c-border)', borderRadius: 18, padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15 }}>This month's content</span>
              <span style={{ fontSize: 12, color: 'var(--c-faint)' }}>{new Date().toLocaleString('en', { month: 'long' })}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {CONTENT_SLOTS.map(slot => (
                <div key={slot.label} style={{ background: 'var(--c-fill)', borderRadius: 12, padding: '14px 16px' }}>
                  <div style={{ fontSize: 26, fontWeight: 800, color: slot.color, fontFamily: 'var(--font-display)', lineHeight: 1 }}>{slot.count}</div>
                  <div style={{ fontSize: 12, color: 'var(--c-faint)', marginTop: 4 }}>{slot.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Key contacts */}
          <div style={{ background: '#fff', border: '1px solid var(--c-border)', borderRadius: 18, padding: '18px 20px' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Key contacts</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {client.contact_name ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 11, border: '1px solid var(--c-border-soft)' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: client.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12, color: '#fff', flexShrink: 0 }}>{client.initials}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{client.contact_name} — Founder</div>
                    <div style={{ fontSize: 12, color: 'var(--c-faint)' }}>Primary · approvals</div>
                  </div>
                  {client.whatsapp && (
                    <button onClick={() => toast('Opening WhatsApp…')} style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-ink)', background: 'var(--c-fill)', borderRadius: 8, padding: '5px 10px', whiteSpace: 'nowrap' }}>WhatsApp</button>
                  )}
                </div>
              ) : (
                <div style={{ fontSize: 13, color: 'var(--c-ghost)', fontStyle: 'italic' }}>No primary contact added yet</div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 11, border: '1px solid var(--c-border-soft)' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12, color: '#fff', flexShrink: 0 }}>ML</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>Marketing Lead</div>
                  <div style={{ fontSize: 12, color: 'var(--c-faint)' }}>Day-to-day contact</div>
                </div>
                {client.contact_email && (
                  <a href={`mailto:${client.contact_email}`} style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-ink)', background: 'var(--c-fill)', borderRadius: 8, padding: '5px 10px', whiteSpace: 'nowrap', textDecoration: 'none' }}>Email</a>
                )}
              </div>
            </div>
          </div>

          {/* Recent activity */}
          <div style={{ background: '#fff', border: '1px solid var(--c-border)', borderRadius: 18, padding: '18px 20px' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Recent activity</div>
            <div>
              {ACTIVITY.map((a, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, padding: '9px 0', borderBottom: i < ACTIVITY.length - 1 ? '1px solid var(--c-border-soft)' : 'none' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: a.dot, flexShrink: 0, marginTop: 5 }} />
                  <div>
                    <div style={{ fontSize: 13, color: 'var(--c-ink)', lineHeight: 1.45 }}>{a.text}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--c-ghost)', marginTop: 2 }}>{a.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Delete modal */}
      {deleteOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setDeleteOpen(false)}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 28, maxWidth: 420, width: '100%', margin: '0 20px' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2"/></svg>
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Delete {client.name}?</div>
            <p style={{ fontSize: 14, color: 'var(--c-subtle)', lineHeight: 1.65, marginBottom: 24 }}>
              This will permanently remove this client and all associated content. This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setDeleteOpen(false)} style={{ flex: 1, padding: '11px 0', borderRadius: 11, fontSize: 14, fontWeight: 600, background: 'var(--c-fill)', color: 'var(--c-ink)' }}>Cancel</button>
              <button onClick={handleDelete} style={{ flex: 1, padding: '11px 0', borderRadius: 11, fontSize: 14, fontWeight: 700, background: '#EF4444', color: '#fff' }}>Delete client</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
