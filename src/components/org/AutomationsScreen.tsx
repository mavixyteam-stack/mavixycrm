'use client'
import { useState } from 'react'
import { useToast } from '@/lib/store'
import { Zap, Plus, X, Check } from '@/components/ui/Icon'

const SEED_AUTOMATIONS = [
  { id: 'a1', name: 'Monthly report sender', trigger: 'First Monday of month', action: 'Draft + email report to all clients', active: true, runs: 6 },
  { id: 'a2', name: 'Overdue ping', trigger: 'Content is 2 days overdue', action: 'Slack message to assignee + manager', active: true, runs: 18 },
  { id: 'a3', name: 'Client health alert', trigger: 'Health score drops below 60', action: 'Notify account manager', active: true, runs: 3 },
  { id: 'a4', name: 'New lead welcome', trigger: 'Lead added to pipeline', action: 'Send AI-drafted intro email', active: false, runs: 0 },
]

const TRIGGERS = [
  'Content is overdue by N days',
  'Client health drops below threshold',
  'New lead added',
  'Deliverable moves to Published',
  'First Monday of month',
  'Team member check-out',
]

const ACTIONS = [
  'Send Slack message',
  'Draft and send email',
  'Create task',
  'Generate AI report',
  'Send WhatsApp message',
  'Add Notion entry',
]

export default function AutomationsScreen() {
  const toast = useToast()
  const [automations, setAutomations] = useState(SEED_AUTOMATIONS)
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState({ name: '', trigger: TRIGGERS[0], action: ACTIONS[0] })

  function toggle(id: string) {
    setAutomations(as => as.map(a => a.id === id ? { ...a, active: !a.active } : a))
    const a = automations.find(a => a.id === id)
    toast(a?.active ? 'Automation paused' : 'Automation activated')
  }

  function addAutomation() {
    if (!form.name.trim()) return
    setAutomations(as => [...as, { id: `auto-${Date.now()}`, name: form.name, trigger: form.trigger, action: form.action, active: true, runs: 0 }])
    toast('Automation created')
    setAddOpen(false)
    setForm({ name: '', trigger: TRIGGERS[0], action: ACTIONS[0] })
  }

  function deleteAuto(id: string) {
    setAutomations(as => as.filter(a => a.id !== id))
    toast('Automation deleted')
  }

  const activeCount = automations.filter(a => a.active).length
  const totalRuns = automations.reduce((s, a) => s + a.runs, 0)

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 4 }}>Automations</h1>
          <p style={{ fontSize: 14, color: 'var(--c-subtle)' }}>{activeCount} active · {totalRuns} total runs this month</p>
        </div>
        <button onClick={() => setAddOpen(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'var(--c-ink)', color: '#fff', borderRadius: 10, padding: '9px 16px', fontWeight: 600, fontSize: 13 }}>
          <Plus size={13} />New Automation
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {automations.map(auto => (
          <div key={auto.id} style={{ background: 'var(--c-surface)', border: `1.5px solid ${auto.active ? 'var(--c-border)' : 'var(--c-border-soft)'}`, borderRadius: 16, padding: '16px 20px', opacity: auto.active ? 1 : .6, transition: 'all .2s' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: auto.active ? 'rgba(255,92,31,.1)' : 'var(--c-fill)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Zap size={16} color={auto.active ? 'var(--c-accent)' : 'var(--c-ghost)'} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 700, marginBottom: 6 }}>{auto.name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-amber)', background: 'var(--c-amber-bg)', borderRadius: 7, padding: '3px 8px' }}>When: {auto.trigger}</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--c-ghost)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-green)', background: 'var(--c-green-bg)', borderRadius: 7, padding: '3px 8px' }}>Then: {auto.action}</span>
                </div>
                {auto.runs > 0 && <div style={{ fontSize: 12, color: 'var(--c-faint)', marginTop: 6 }}>Ran {auto.runs} times this month</div>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                {/* Toggle switch */}
                <button onClick={() => toggle(auto.id)}
                  style={{ width: 44, height: 24, borderRadius: 99, background: auto.active ? 'var(--c-green)' : 'var(--c-border)', position: 'relative', transition: 'background .2s', cursor: 'pointer' }}>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: auto.active ? 23 : 3, transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} />
                </button>
                <button onClick={() => deleteAuto(auto.id)}
                  style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, color: 'var(--c-ghost)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--c-red-bg)'; e.currentTarget.style.color = 'var(--c-red)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--c-ghost)' }}>
                  <X size={13} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {addOpen && (
        <div onClick={() => setAddOpen(false)} className="modal-overlay">
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 460, background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--shadow-modal)', animation: 'popIn .22s cubic-bezier(.2,.9,.3,1) both' }}>
            <div style={{ padding: '20px 22px', borderBottom: '1px solid var(--c-border-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>New Automation</div>
              <button onClick={() => setAddOpen(false)}><X size={15} color="var(--c-ghost)" /></button>
            </div>
            <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 5 }}>Name</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Weekly review reminder"
                  style={{ width: '100%', border: '1.5px solid var(--c-border)', borderRadius: 10, padding: '10px 12px', fontSize: 14 }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-amber)', display: 'block', marginBottom: 5 }}>WHEN (Trigger)</label>
                <select value={form.trigger} onChange={e => setForm(f => ({ ...f, trigger: e.target.value }))}
                  style={{ width: '100%', border: '1.5px solid var(--c-border)', borderRadius: 10, padding: '10px 12px', fontSize: 14 }}>
                  {TRIGGERS.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-green)', display: 'block', marginBottom: 5 }}>THEN (Action)</label>
                <select value={form.action} onChange={e => setForm(f => ({ ...f, action: e.target.value }))}
                  style={{ width: '100%', border: '1.5px solid var(--c-border)', borderRadius: 10, padding: '10px 12px', fontSize: 14 }}>
                  {ACTIONS.map(a => <option key={a}>{a}</option>)}
                </select>
              </div>
            </div>
            <div style={{ padding: '14px 22px', borderTop: '1px solid var(--c-border-soft)', display: 'flex', gap: 10 }}>
              <button onClick={() => setAddOpen(false)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1.5px solid var(--c-border)', fontSize: 14, fontWeight: 600, color: 'var(--c-subtle)' }}>Cancel</button>
              <button onClick={addAutomation} style={{ flex: 2, padding: '10px', borderRadius: 10, background: 'var(--c-ink)', color: '#fff', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                <Zap size={14} color="#FF5C1F" />Create Automation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
