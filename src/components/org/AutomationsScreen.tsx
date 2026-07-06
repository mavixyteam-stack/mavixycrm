'use client'
import { useState } from 'react'
import { useApp, useToast } from '@/lib/store'
import { Zap, Check, X } from '@/components/ui/Icon'
import { ModalPortal } from '@/components/ui/ModalPortal'

interface Automation {
  id: string
  name: string
  description: string
  trigger: string
  action: string
  recipients: string
  schedule: string
  endpoint: string
  lastRun?: string
  lastStatus?: 'success' | 'failed'
  lastCount?: number
}

const AUTOMATIONS: Automation[] = [
  {
    id: 'morning-brief',
    name: 'Morning Brief',
    description: 'Sends each team member a personalised email with their content plan, task list, brief text, and inspiration links for the day.',
    trigger: 'Every weekday at 8:30 AM',
    action: 'Email to all employees',
    recipients: 'All team members',
    schedule: 'Mon–Fri, 8:30 AM',
    endpoint: '/api/automations/morning-brief',
  },
  {
    id: 'lead-followup',
    name: 'Lead Follow-up Reminder',
    description: 'Checks for leads with a follow-up date set to today and sends the sales team a digest with lead details, notes, and contact info.',
    trigger: 'Daily at 9:00 AM',
    action: 'Email to sales team & owner',
    recipients: 'Sales, Manager, Owner',
    schedule: 'Daily, 9:00 AM',
    endpoint: '/api/automations/lead-followup',
  },
  {
    id: 'weekly-digest',
    name: 'Weekly Performance Digest',
    description: 'Comprehensive weekly summary for leadership: pipeline value, deal stages, content delivery rate, overdue items, and team activity.',
    trigger: 'Every Monday at 8:00 AM',
    action: 'Email to owners & managers',
    recipients: 'Owner, Manager',
    schedule: 'Monday, 8:00 AM',
    endpoint: '/api/automations/weekly-digest',
  },
  {
    id: 'overdue-ops',
    name: 'Overdue Content Alert',
    description: 'Monitors for content items that have passed their scheduled day without being published, and alerts the team to take action.',
    trigger: 'Daily at 10:00 AM',
    action: 'Email to account managers',
    recipients: 'Manager, Owner',
    schedule: 'Daily, 10:00 AM',
    endpoint: '/api/automations/weekly-digest',
  },
]

function StatusDot({ status }: { status?: 'success' | 'failed' }) {
  if (!status) return null
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <div style={{ width: 7, height: 7, borderRadius: '50%', background: status === 'success' ? 'var(--c-green)' : 'var(--c-red)', flexShrink: 0 }} />
      <span style={{ fontSize: 12, color: status === 'success' ? 'var(--c-green)' : 'var(--c-red)', fontWeight: 600 }}>
        {status === 'success' ? 'Last run OK' : 'Last run failed'}
      </span>
    </div>
  )
}

export default function AutomationsScreen() {
  const { state } = useApp()
  const toast = useToast()
  const [runStates, setRunStates] = useState<Record<string, 'idle' | 'running' | 'done' | 'error'>>({})
  const [runResults, setRunResults] = useState<Record<string, string>>({})
  const [testOpen, setTestOpen] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [testRunning, setTestRunning] = useState(false)
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(AUTOMATIONS.map(a => [a.id, true]))
  )

  async function runNow(auto: Automation) {
    setRunStates(s => ({ ...s, [auto.id]: 'running' }))
    try {
      const res = await fetch(auto.endpoint, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      const msg = data.message || (data.sent !== undefined ? `Sent to ${data.sent} recipient${data.sent !== 1 ? 's' : ''}` : 'Completed')
      setRunResults(r => ({ ...r, [auto.id]: msg }))
      setRunStates(s => ({ ...s, [auto.id]: 'done' }))
      toast(`✅ ${auto.name} ran — ${msg}`)
    } catch (e: any) {
      setRunStates(s => ({ ...s, [auto.id]: 'error' }))
      setRunResults(r => ({ ...r, [auto.id]: e.message }))
      toast(`Failed: ${e.message}`)
    }
    setTimeout(() => setRunStates(s => ({ ...s, [auto.id]: 'idle' })), 4000)
  }

  async function sendTest() {
    const recipient = testEmail || state.currentUser?.email
    if (!recipient) return
    setTestRunning(true)
    try {
      const res = await fetch('/api/automations/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: recipient }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast(`Test email sent to ${recipient}`)
      setTestOpen(false)
    } catch (e: any) {
      toast(`Failed: ${e.message}`)
    } finally {
      setTestRunning(false)
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 4 }}>
            Automations
          </h1>
          <p style={{ fontSize: 14, color: 'var(--c-subtle)' }}>
            {Object.values(enabled).filter(Boolean).length} active · powered by Resend
          </p>
        </div>
        <button onClick={() => setTestOpen(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'var(--c-fill)', border: '1.5px solid var(--c-border)', color: 'var(--c-ink)', borderRadius: 10, padding: '9px 16px', fontWeight: 600, fontSize: 13 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.13H6.5a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6 6l.76-.76a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          Send test email
        </button>
      </div>

      {/* Info banner */}
      <div style={{ background: '#EAF1FF', border: '1.5px solid #BFDBFE', borderRadius: 14, padding: '12px 18px', marginBottom: 24, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: 1, flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
        <div style={{ fontSize: 13, color: '#1E40AF', lineHeight: 1.5 }}>
          <strong>To enable scheduled sending:</strong> add these routes as cron jobs in your Vercel dashboard under Settings → Cron Jobs. The "Run now" buttons trigger them instantly for testing.
        </div>
      </div>

      {/* Automation cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {AUTOMATIONS.map(auto => {
          const status = runStates[auto.id] || 'idle'
          const result = runResults[auto.id]
          const isEnabled = enabled[auto.id]

          return (
            <div key={auto.id} style={{
              background: 'var(--c-surface)',
              border: `1.5px solid ${isEnabled ? 'var(--c-border)' : 'var(--c-border-soft)'}`,
              borderRadius: 18, padding: '20px 22px',
              opacity: isEnabled ? 1 : .55,
              transition: 'all .2s',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>

                {/* Icon */}
                <div style={{ width: 42, height: 42, borderRadius: 12, background: isEnabled ? 'rgba(255,92,31,.08)' : 'var(--c-fill)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                  <Zap size={18} color={isEnabled ? 'var(--c-accent)' : 'var(--c-ghost)'} />
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                    <span style={{ fontSize: 15, fontWeight: 700 }}>{auto.name}</span>
                    {status === 'done' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--c-green-bg)', borderRadius: 6, padding: '2px 8px' }}>
                        <Check size={10} color="var(--c-green)" />
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-green)' }}>Sent</span>
                      </div>
                    )}
                    {status === 'error' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--c-red-bg)', borderRadius: 6, padding: '2px 8px' }}>
                        <X size={10} color="var(--c-red)" />
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-red)' }}>Error</span>
                      </div>
                    )}
                  </div>

                  <p style={{ fontSize: 13.5, color: 'var(--c-subtle)', lineHeight: 1.55, marginBottom: 10 }}>
                    {auto.description}
                  </p>

                  {/* Tags */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: result ? 8 : 0 }}>
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--c-amber)', background: 'var(--c-amber-bg)', borderRadius: 7, padding: '3px 9px' }}>
                      ⏱ {auto.schedule}
                    </span>
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--c-green)', background: 'var(--c-green-bg)', borderRadius: 7, padding: '3px 9px' }}>
                      → {auto.action}
                    </span>
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--c-blue)', background: 'var(--c-blue-bg)', borderRadius: 7, padding: '3px 9px' }}>
                      👥 {auto.recipients}
                    </span>
                  </div>

                  {result && (
                    <div style={{ fontSize: 12.5, color: status === 'error' ? 'var(--c-red)' : 'var(--c-green)', marginTop: 6 }}>
                      {result}
                    </div>
                  )}
                </div>

                {/* Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                  {/* Run now */}
                  <button
                    onClick={() => runNow(auto)}
                    disabled={status === 'running' || !isEnabled}
                    style={{
                      fontSize: 12.5, fontWeight: 700,
                      color: isEnabled ? 'var(--c-accent)' : 'var(--c-ghost)',
                      background: isEnabled ? 'var(--c-accent-bg)' : 'var(--c-fill)',
                      border: `1.5px solid ${isEnabled ? 'rgba(255,92,31,.25)' : 'transparent'}`,
                      borderRadius: 9, padding: '6px 12px',
                      display: 'flex', alignItems: 'center', gap: 5,
                      opacity: status === 'running' ? .6 : 1,
                      cursor: status === 'running' || !isEnabled ? 'default' : 'pointer',
                      transition: 'all .15s',
                    }}
                  >
                    {status === 'running' ? (
                      <>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', border: '2px solid var(--c-accent)', borderTopColor: 'transparent', animation: 'spin .7s linear infinite' }} />
                        Running…
                      </>
                    ) : (
                      <>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                        Run now
                      </>
                    )}
                  </button>

                  {/* Toggle */}
                  <button
                    onClick={() => {
                      setEnabled(e => ({ ...e, [auto.id]: !e[auto.id] }))
                      toast(enabled[auto.id] ? `${auto.name} paused` : `${auto.name} activated`)
                    }}
                    style={{ width: 44, height: 24, borderRadius: 99, background: isEnabled ? 'var(--c-green)' : 'var(--c-border)', position: 'relative', transition: 'background .2s', cursor: 'pointer', flexShrink: 0 }}
                  >
                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: isEnabled ? 23 : 3, transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} />
                  </button>
                </div>

              </div>
            </div>
          )
        })}
      </div>

      {/* Cron setup guide */}
      <div style={{ marginTop: 28, background: 'var(--c-surface)', borderRadius: 18, padding: '20px 24px', border: '1.5px solid var(--c-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15 }}>Scheduled Sending</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--c-green-bg)', borderRadius: 6, padding: '2px 8px' }}>
            <Check size={10} color="var(--c-green)" />
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-green)' }}>Schedule committed</span>
          </div>
        </div>
        <div style={{ fontSize: 13, color: 'var(--c-subtle)', lineHeight: 1.65, marginBottom: 14 }}>
          The cron schedule below is already in <code style={{ background: 'var(--c-fill)', padding: '1px 6px', borderRadius: 5, fontSize: 12 }}>vercel.json</code>. To activate it, set a <code style={{ background: 'var(--c-fill)', padding: '1px 6px', borderRadius: 5, fontSize: 12 }}>CRON_SECRET</code> env var in Vercel — that secures the endpoints so only Vercel can trigger them.
        </div>
        <pre style={{ background: '#0F172A', color: '#e2e8f0', borderRadius: 12, padding: '16px 18px', fontSize: 12.5, lineHeight: 1.6, overflow: 'auto', margin: 0 }}>{`"crons": [
  { "path": "/api/automations/morning-brief", "schedule": "0 3 * * 1-5" },
  { "path": "/api/automations/lead-followup",  "schedule": "30 3 * * *" },
  { "path": "/api/automations/weekly-digest",  "schedule": "30 2 * * 1" }
]`}</pre>
        <div style={{ fontSize: 12, color: 'var(--c-faint)', marginTop: 10, lineHeight: 1.6 }}>
          Times are UTC. Morning brief 3:00 UTC = 8:30 AM IST · lead follow-up 3:30 UTC = 9:00 AM IST · weekly digest Monday 2:30 UTC = 8:00 AM IST. Vercel Cron requires the Pro plan.
        </div>
      </div>

      {/* Test email modal */}
      {testOpen && (
        <ModalPortal>
          <div onClick={() => setTestOpen(false)} className="modal-overlay">
            <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 420, background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--shadow-modal)', animation: 'popIn .22s cubic-bezier(.2,.9,.3,1) both' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--c-border-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>Send Test Email</div>
                <button onClick={() => setTestOpen(false)}><X size={15} color="var(--c-ghost)" /></button>
              </div>
              <div style={{ padding: '20px 24px' }}>
                <p style={{ fontSize: 14, color: 'var(--c-subtle)', marginBottom: 16, lineHeight: 1.55 }}>
                  Sends a simple test email to verify your Resend API key and email delivery is working.
                </p>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 6 }}>Send to</label>
                <input
                  value={testEmail}
                  onChange={e => setTestEmail(e.target.value)}
                  placeholder={state.currentUser?.email || 'email@example.com'}
                  style={{ width: '100%', border: '1.5px solid var(--c-border)', borderRadius: 10, padding: '10px 12px', fontSize: 14, boxSizing: 'border-box' }}
                  onFocus={e => e.target.style.borderColor = 'var(--c-ink)'}
                  onBlur={e => e.target.style.borderColor = 'var(--c-border)'}
                />
                <p style={{ fontSize: 12, color: 'var(--c-faint)', marginTop: 6 }}>
                  Leave blank to send to your account email.
                </p>
              </div>
              <div style={{ padding: '14px 24px', borderTop: '1px solid var(--c-border-soft)', display: 'flex', gap: 10 }}>
                <button onClick={() => setTestOpen(false)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1.5px solid var(--c-border)', fontSize: 14, fontWeight: 600, color: 'var(--c-subtle)' }}>Cancel</button>
                <button onClick={sendTest} disabled={testRunning} style={{ flex: 2, padding: '10px', borderRadius: 10, background: 'var(--c-ink)', color: '#fff', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, opacity: testRunning ? .6 : 1 }}>
                  {testRunning ? (
                    <>
                      <div style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid #fff', borderTopColor: 'transparent', animation: 'spin .7s linear infinite' }} />
                      Sending…
                    </>
                  ) : (
                    <>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                      Send test
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

    </div>
  )
}
