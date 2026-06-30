'use client'
import { useState } from 'react'
import { useApp, useToast, useUpsertClient } from '@/lib/store'
import { X, Sparkle, Check } from '@/components/ui/Icon'
import type { Client } from '@/types'

const ONBOARD_SERVICES = [
  { key: 'branding', label: 'Branding' },
  { key: 'social', label: 'Social' },
  { key: 'performance', label: 'Ads' },
  { key: 'seo', label: 'SEO' },
  { key: 'web', label: 'Web' },
]

const COLORS = ['#FF5C1F','#F4B740','#8B5CF6','#10B981','#2563EB','#EF4444','#0EA5A4','#FB7185','#6366F1','#0F172A']

const STEPS = [
  { num: 1, label: 'Basics' },
  { num: 2, label: 'Contacts & owner' },
  { num: 3, label: 'Scope & AI brief' },
  { num: 4, label: 'Business knowledge' },
]

interface Props {
  onClose: () => void
}

export default function ClientOnboardingModal({ onClose }: Props) {
  const { state } = useApp()
  const toast = useToast()
  const upsertClient = useUpsertClient()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    name: '',
    industry: '',
    services: [] as string[],
    color: '#FF5C1F',
    whatsapp: '',
    contact_email: '',
    contact_name: '',
    account_owner_id: '',
    posts_per_month: '',
    monthly_retainer: '',
    ai_brief: '',
    about_business: '',
    target_audience: '',
    brand_voice: '',
    reference_links: '',
  })

  function set(k: string, v: string | string[]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  function toggleService(key: string) {
    setForm(f => ({
      ...f,
      services: f.services.includes(key)
        ? f.services.filter(s => s !== key)
        : [...f.services, key]
    }))
  }

  function canNext() {
    if (step === 1) return form.name.trim().length > 0
    return true
  }

  async function handleFinish() {
    if (!form.name.trim()) return
    setSaving(true)
    const initials = form.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    const contentServices = form.services.filter(s => ['social','performance','seo'].includes(s))
    const client: Client = {
      id: `client-${Date.now()}`,
      name: form.name.trim(),
      initials,
      color: form.color,
      health: 80,
      services: contentServices.length ? contentServices : ['social'],
      type: contentServices.length >= 3 ? 'full' : contentServices.includes('performance') ? 'ads' : contentServices.includes('seo') ? 'seo' : 'social',
      industry: form.industry,
      contact_name: form.contact_name,
      contact_email: form.contact_email,
      whatsapp: form.whatsapp,
      account_owner_id: form.account_owner_id,
      posts_per_month: form.posts_per_month ? Number(form.posts_per_month) : undefined,
      monthly_retainer: form.monthly_retainer ? Number(form.monthly_retainer) : undefined,
      ai_brief: form.ai_brief,
      about_business: form.about_business,
      target_audience: form.target_audience,
      brand_voice: form.brand_voice,
      reference_links: form.reference_links,
      created_at: new Date().toISOString(),
    }
    await upsertClient(client)
    toast(`${form.name} onboarded successfully`)
    onClose()
    setSaving(false)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    border: '1.5px solid #E8EAE3',
    borderRadius: 14,
    padding: '13px 16px',
    fontSize: 15,
    background: '#F9FAF7',
    transition: 'border-color .15s, background .15s',
    color: '#0E0F0C',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 600,
    color: '#5A5E54',
    display: 'block',
    marginBottom: 8,
  }

  return (
    <div onClick={onClose} className="modal-overlay">
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 540, background: '#fff', borderRadius: 28, overflow: 'hidden', boxShadow: '0 40px 90px -20px rgba(0,0,0,.5)', animation: 'popIn .26s cubic-bezier(.2,.9,.3,1) both' }}>
        {/* Header */}
        <div style={{ padding: '22px 26px 0' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: '#FFF1EA', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF5C1F" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color: '#0E0F0C' }}>Onboard a client</div>
                <div style={{ fontSize: 13.5, color: '#9A9E94', marginTop: 2 }}>Step {step} of 4 · {STEPS[step-1].label}</div>
              </div>
            </div>
            <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 10, background: '#F2F3EF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9A9E94', transition: 'background .15s' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#E8EAE3'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#F2F3EF'}>
              <X size={15} />
            </button>
          </div>

          {/* Progress bar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 0 }}>
            {[1,2,3,4].map(n => (
              <div key={n} style={{ height: 4, borderRadius: 99, background: n <= step ? '#FF5C1F' : '#E8EAE3', transition: 'background .3s' }} />
            ))}
          </div>
        </div>

        <div style={{ borderTop: '1px solid #EEF0EA', marginTop: 18 }} />

        {/* Content */}
        <div style={{ padding: '22px 26px', display: 'flex', flexDirection: 'column', gap: 18, minHeight: 320 }}>

          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18, animation: 'slideInRight .25s ease both' }}>
              <div>
                <label style={labelStyle}>Client / brand name</label>
                <input value={form.name} onChange={e => set('name', e.target.value)}
                  placeholder="e.g. Aurora Beauty" style={inputStyle}
                  onFocus={e => { (e.target as HTMLInputElement).style.borderColor = '#FF5C1F'; (e.target as HTMLInputElement).style.background = '#fff' }}
                  onBlur={e => { (e.target as HTMLInputElement).style.borderColor = '#E8EAE3'; (e.target as HTMLInputElement).style.background = '#F9FAF7' }} />
              </div>
              <div>
                <label style={labelStyle}>Industry</label>
                <input value={form.industry} onChange={e => set('industry', e.target.value)}
                  placeholder="e.g. Skincare · D2C" style={inputStyle}
                  onFocus={e => { (e.target as HTMLInputElement).style.borderColor = '#FF5C1F'; (e.target as HTMLInputElement).style.background = '#fff' }}
                  onBlur={e => { (e.target as HTMLInputElement).style.borderColor = '#E8EAE3'; (e.target as HTMLInputElement).style.background = '#F9FAF7' }} />
              </div>
              <div>
                <label style={labelStyle}>Services</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {ONBOARD_SERVICES.map(s => (
                    <button key={s.key} onClick={() => toggleService(s.key)}
                      style={{ padding: '9px 18px', borderRadius: 12, fontSize: 14, fontWeight: 600, border: `1.5px solid ${form.services.includes(s.key) ? '#FF5C1F' : '#E8EAE3'}`, color: form.services.includes(s.key) ? '#FF5C1F' : '#5A5E54', background: form.services.includes(s.key) ? '#FFF1EA' : '#fff', transition: 'all .15s' }}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={labelStyle}>Brand color</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {COLORS.map(c => (
                    <button key={c} onClick={() => set('color', c)}
                      style={{ width: 32, height: 32, borderRadius: 10, background: c, border: `2.5px solid ${form.color === c ? '#0E0F0C' : 'transparent'}`, transition: 'border-color .15s, transform .15s', transform: form.color === c ? 'scale(1.1)' : 'scale(1)' }} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18, animation: 'slideInRight .25s ease both' }}>
              <div>
                <label style={labelStyle}>Contact name</label>
                <input value={form.contact_name} onChange={e => set('contact_name', e.target.value)}
                  placeholder="e.g. Priya Sharma" style={inputStyle}
                  onFocus={e => { (e.target as HTMLInputElement).style.borderColor = '#FF5C1F'; (e.target as HTMLInputElement).style.background = '#fff' }}
                  onBlur={e => { (e.target as HTMLInputElement).style.borderColor = '#E8EAE3'; (e.target as HTMLInputElement).style.background = '#F9FAF7' }} />
              </div>
              <div>
                <label style={labelStyle}>WhatsApp number</label>
                <input value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)}
                  placeholder="+91 98765 43210" style={inputStyle}
                  onFocus={e => { (e.target as HTMLInputElement).style.borderColor = '#FF5C1F'; (e.target as HTMLInputElement).style.background = '#fff' }}
                  onBlur={e => { (e.target as HTMLInputElement).style.borderColor = '#E8EAE3'; (e.target as HTMLInputElement).style.background = '#F9FAF7' }} />
              </div>
              <div>
                <label style={labelStyle}>Email</label>
                <input type="email" value={form.contact_email} onChange={e => set('contact_email', e.target.value)}
                  placeholder="founder@brand.com" style={inputStyle}
                  onFocus={e => { (e.target as HTMLInputElement).style.borderColor = '#FF5C1F'; (e.target as HTMLInputElement).style.background = '#fff' }}
                  onBlur={e => { (e.target as HTMLInputElement).style.borderColor = '#E8EAE3'; (e.target as HTMLInputElement).style.background = '#F9FAF7' }} />
              </div>
              <div>
                <label style={labelStyle}>Account owner</label>
                <select value={form.account_owner_id} onChange={e => set('account_owner_id', e.target.value)}
                  style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="">Select team member</option>
                  {state.users.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.title || u.role})</option>
                  ))}
                </select>
              </div>
              <div style={{ background: '#E7FAF3', border: '1px solid #A7F3D0', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#0E8C63', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Check size={10} color="#fff" />
                </div>
                <span style={{ fontSize: 13.5, color: '#0E8C63' }}>We'll connect this client's email & WhatsApp for automated updates.</span>
              </div>
            </div>
          )}

          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18, animation: 'slideInRight .25s ease both' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={labelStyle}>Posts per month</label>
                  <input type="number" value={form.posts_per_month} onChange={e => set('posts_per_month', e.target.value)}
                    placeholder="e.g. 12" style={inputStyle}
                    onFocus={e => { (e.target as HTMLInputElement).style.borderColor = '#FF5C1F'; (e.target as HTMLInputElement).style.background = '#fff' }}
                    onBlur={e => { (e.target as HTMLInputElement).style.borderColor = '#E8EAE3'; (e.target as HTMLInputElement).style.background = '#F9FAF7' }} />
                </div>
                <div>
                  <label style={labelStyle}>Monthly retainer</label>
                  <input type="number" value={form.monthly_retainer} onChange={e => set('monthly_retainer', e.target.value)}
                    placeholder="e.g. 85000" style={inputStyle}
                    onFocus={e => { (e.target as HTMLInputElement).style.borderColor = '#FF5C1F'; (e.target as HTMLInputElement).style.background = '#fff' }}
                    onBlur={e => { (e.target as HTMLInputElement).style.borderColor = '#E8EAE3'; (e.target as HTMLInputElement).style.background = '#F9FAF7' }} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>AI workload brief <span style={{ fontWeight: 400, color: '#B6BAAF' }}>— how much & what to produce</span></label>
                <textarea value={form.ai_brief} onChange={e => set('ai_brief', e.target.value)}
                  rows={4} placeholder="e.g. 3 reels + 2 carousels + 8 stories / week. Premium editorial tone, warm palette, founder-led storytelling."
                  style={{ ...inputStyle, resize: 'vertical' }}
                  onFocus={e => { (e.target as HTMLTextAreaElement).style.borderColor = '#FF5C1F'; (e.target as HTMLTextAreaElement).style.background = '#fff' }}
                  onBlur={e => { (e.target as HTMLTextAreaElement).style.borderColor = '#E8EAE3'; (e.target as HTMLTextAreaElement).style.background = '#F9FAF7' }} />
              </div>
              <div style={{ background: '#FFF1EA', border: '1px solid rgba(255,92,31,.2)', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <Sparkle size={14} color="#FF5C1F" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 13.5, color: '#C2430F' }}>AI uses this to auto-generate day-wise plans & team tasks for this client.</span>
              </div>
            </div>
          )}

          {step === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'slideInRight .25s ease both' }}>
              <div>
                <label style={labelStyle}>About the business</label>
                <textarea value={form.about_business} onChange={e => set('about_business', e.target.value)}
                  rows={3} placeholder="What they sell, where, what makes them different..."
                  style={{ ...inputStyle, resize: 'vertical' }}
                  onFocus={e => { (e.target as HTMLTextAreaElement).style.borderColor = '#FF5C1F'; (e.target as HTMLTextAreaElement).style.background = '#fff' }}
                  onBlur={e => { (e.target as HTMLTextAreaElement).style.borderColor = '#E8EAE3'; (e.target as HTMLTextAreaElement).style.background = '#F9FAF7' }} />
              </div>
              <div>
                <label style={labelStyle}>Target audience</label>
                <input value={form.target_audience} onChange={e => set('target_audience', e.target.value)}
                  placeholder="e.g. Women 22-34, tier-1, skincare-curious" style={inputStyle}
                  onFocus={e => { (e.target as HTMLInputElement).style.borderColor = '#FF5C1F'; (e.target as HTMLInputElement).style.background = '#fff' }}
                  onBlur={e => { (e.target as HTMLInputElement).style.borderColor = '#E8EAE3'; (e.target as HTMLInputElement).style.background = '#F9FAF7' }} />
              </div>
              <div>
                <label style={labelStyle}>Brand voice & tone</label>
                <input value={form.brand_voice} onChange={e => set('brand_voice', e.target.value)}
                  placeholder="e.g. Warm, editorial, confident" style={inputStyle}
                  onFocus={e => { (e.target as HTMLInputElement).style.borderColor = '#FF5C1F'; (e.target as HTMLInputElement).style.background = '#fff' }}
                  onBlur={e => { (e.target as HTMLInputElement).style.borderColor = '#E8EAE3'; (e.target as HTMLInputElement).style.background = '#F9FAF7' }} />
              </div>
              <div>
                <label style={labelStyle}>Reference / inspiration links <span style={{ fontWeight: 400, color: '#B6BAAF' }}>— one per line</span></label>
                <textarea value={form.reference_links} onChange={e => set('reference_links', e.target.value)}
                  rows={3} placeholder="competitor profiles, moodboards, brand guidelines..."
                  style={{ ...inputStyle, resize: 'vertical' }}
                  onFocus={e => { (e.target as HTMLTextAreaElement).style.borderColor = '#FF5C1F'; (e.target as HTMLTextAreaElement).style.background = '#fff' }}
                  onBlur={e => { (e.target as HTMLTextAreaElement).style.borderColor = '#E8EAE3'; (e.target as HTMLTextAreaElement).style.background = '#F9FAF7' }} />
              </div>
              <div style={{ background: '#0F172A', borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <Sparkle size={15} color="#FF5C1F" style={{ marginTop: 1, flexShrink: 0 }} />
                <span style={{ fontSize: 13.5, color: 'rgba(255,255,255,.85)', lineHeight: 1.5 }}>
                  This becomes the client's <strong style={{ color: '#fff' }}>brain</strong> — AI uses it for ideas, and new teammates use it to learn the account fast.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 26px 22px', borderTop: '1px solid #EEF0EA', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <button
            onClick={() => step > 1 ? setStep(s => s - 1) : onClose()}
            style={{ padding: '13px 24px', borderRadius: 14, background: '#F2F3EF', fontSize: 15, fontWeight: 600, color: '#5A5E54', transition: 'background .15s' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#E8EAE3'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#F2F3EF'}>
            Back
          </button>
          <button
            onClick={() => {
              if (!canNext()) return
              if (step < 4) {
                setStep(s => s + 1)
              } else {
                handleFinish()
              }
            }}
            disabled={!canNext() || saving}
            style={{ padding: '13px 32px', borderRadius: 14, background: canNext() ? '#FF5C1F' : '#E8EAE3', color: canNext() ? '#fff' : '#B6BAAF', fontSize: 15, fontWeight: 700, transition: 'all .15s, transform .15s', opacity: saving ? 0.7 : 1 }}
            onMouseEnter={e => { if (canNext()) (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = ''}>
            {saving ? 'Saving…' : step < 4 ? 'Continue' : 'Onboard client'}
          </button>
        </div>
      </div>
    </div>
  )
}
