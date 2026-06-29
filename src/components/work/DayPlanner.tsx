'use client'
import { useState } from 'react'
import { useApp, useToast } from '@/lib/store'
import { Sparkle, Spinner, Clock, Check } from '@/components/ui/Icon'

const HOURS = Array.from({ length: 11 }, (_, i) => i + 8) // 8am-6pm

const HOUR_BLOCKS = [
  { hour: 9, task: 'Morning brief + Slack triage', color: '#FF5C1F', client: '', cat: 'focus' },
  { hour: 10, task: 'SUNSO — Glow reel review', color: '#F4B740', client: 'SUNSO', cat: 'creative' },
  { hour: 11, task: 'Lumio — Diwali carousel brief', color: '#8B5CF6', client: 'Lumio', cat: 'creative' },
  { hour: 13, task: 'Elysian Trails — story set', color: '#10B981', client: 'Elysian', cat: 'creative' },
  { hour: 14, task: 'Meta Ads review — SUNSO + Verve', color: '#2563EB', client: 'Multiple', cat: 'performance' },
  { hour: 16, task: 'Client check-ins & EOD push', color: '#FF5C1F', client: '', cat: 'admin' },
]

interface ScheduleBlock {
  id: string
  hour: number
  duration: number
  task: string
  color: string
  client: string
  cat: string
  done: boolean
}

export default function DayPlanner() {
  const { state } = useApp()
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [blocks, setBlocks] = useState<ScheduleBlock[]>(
    HOUR_BLOCKS.map((b, i) => ({ ...b, id: `block-${i}`, duration: 1, done: false }))
  )
  const [aiNote, setAiNote] = useState('')
  const [teamView, setTeamView] = useState(false)

  const today = new Date()
  const dayLabel = today.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })

  async function buildAISchedule() {
    setLoading(true)
    try {
      const res = await fetch('/api/ai/brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userName: state.currentUser?.name?.split(' ')[0] || 'there',
          tasks: state.planItems.filter(i => i.status !== 'published').slice(0, 8),
          clients: state.clients.slice(0, 4),
          date: dayLabel,
          mode: 'planner',
        })
      })
      const { text } = await res.json()
      setAiNote(text || '')
      toast('AI schedule built')
    } catch {
      setAiNote('Focus on your highest-impact client work first. Block deep work in the morning, admin in the afternoon.')
    } finally {
      setLoading(false)
    }
  }

  function toggleDone(id: string) {
    setBlocks(bs => bs.map(b => b.id === id ? { ...b, done: !b.done } : b))
  }

  function redistribute() {
    setBlocks(bs => {
      const undone = bs.filter(b => !b.done)
      const done = bs.filter(b => b.done)
      const startHours = [9, 10, 11, 13, 14, 15, 16]
      return [
        ...undone.map((b, i) => ({ ...b, hour: startHours[i] || b.hour })),
        ...done,
      ]
    })
    toast('Schedule redistributed')
  }

  const doneCount = blocks.filter(b => b.done).length

  const teamLoad = state.users.map(u => {
    const assigned = state.planItems.filter(i => i.assignee_id === u.id && i.status !== 'published')
    const effort = assigned.reduce((s, i) => s + (i.effort || 2), 0)
    return { ...u, assigned: assigned.length, effort, max: 12 }
  })

  return (
    <div style={{ maxWidth: 980, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 4 }}>Day Planner</h1>
          <p style={{ fontSize: 14, color: 'var(--c-subtle)' }}>{dayLabel}</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ display: 'flex', gap: 2, background: 'var(--c-fill)', borderRadius: 9, padding: 3 }}>
            <button onClick={() => setTeamView(false)}
              style={{ padding: '5px 12px', borderRadius: 7, fontSize: 13, fontWeight: 600, background: !teamView ? '#fff' : 'transparent', color: !teamView ? 'var(--c-ink)' : 'var(--c-muted)', boxShadow: !teamView ? '0 1px 3px rgba(0,0,0,.1)' : 'none', transition: 'all .15s' }}>
              My Day
            </button>
            <button onClick={() => setTeamView(true)}
              style={{ padding: '5px 12px', borderRadius: 7, fontSize: 13, fontWeight: 600, background: teamView ? '#fff' : 'transparent', color: teamView ? 'var(--c-ink)' : 'var(--c-muted)', boxShadow: teamView ? '0 1px 3px rgba(0,0,0,.1)' : 'none', transition: 'all .15s' }}>
              Team Load
            </button>
          </div>
          <button onClick={buildAISchedule} disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'var(--c-ink)', color: '#fff', borderRadius: 10, padding: '8px 14px', fontWeight: 600, fontSize: 13, opacity: loading ? .7 : 1, transition: 'transform .15s' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = ''}>
            {loading ? <Spinner size={13} color="#fff" /> : <Sparkle size={13} color="#FF5C1F" />}
            {loading ? 'Building…' : 'AI Schedule'}
          </button>
          {!teamView && (
            <button onClick={redistribute}
              style={{ padding: '8px 14px', borderRadius: 10, border: '1.5px solid var(--c-border)', fontSize: 13, fontWeight: 600, color: 'var(--c-subtle)' }}>
              Redistribute
            </button>
          )}
        </div>
      </div>

      {!teamView ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}>
          {/* Timeline */}
          <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 16, overflow: 'hidden' }}>
            {/* Progress bar */}
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--c-border-soft)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600 }}>Day progress</span>
                  <span style={{ fontSize: 12.5, color: 'var(--c-subtle)' }}>{doneCount}/{blocks.length} done</span>
                </div>
                <div style={{ height: 5, background: 'var(--c-fill)', borderRadius: 99 }}>
                  <div style={{ height: '100%', borderRadius: 99, background: 'var(--c-green)', width: `${blocks.length ? (doneCount / blocks.length) * 100 : 0}%`, transition: 'width .4s' }} />
                </div>
              </div>
            </div>

            {/* Hour rows */}
            <div style={{ padding: '10px 0' }}>
              {HOURS.map(hour => {
                const block = blocks.find(b => b.hour === hour)
                const label = hour < 12 ? `${hour}:00 AM` : hour === 12 ? '12:00 PM' : `${hour - 12}:00 PM`
                const isNow = new Date().getHours() === hour
                return (
                  <div key={hour} style={{ display: 'flex', gap: 0, minHeight: 56, position: 'relative' }}>
                    {/* Hour label */}
                    <div style={{ width: 72, flexShrink: 0, padding: '8px 14px 0', textAlign: 'right' }}>
                      <span style={{ fontSize: 11.5, fontWeight: isNow ? 700 : 400, color: isNow ? 'var(--c-accent)' : 'var(--c-faint)' }}>{label}</span>
                    </div>
                    {/* Line + content */}
                    <div style={{ flex: 1, borderLeft: `2px solid ${isNow ? 'var(--c-accent)' : 'var(--c-border-soft)'}`, paddingLeft: 14, paddingRight: 16, paddingBottom: 4 }}>
                      {isNow && <div style={{ position: 'absolute', left: 71, top: 11, width: 8, height: 8, borderRadius: '50%', background: 'var(--c-accent)', transform: 'translateX(-50%)' }} />}
                      {block ? (
                        <div style={{ background: block.done ? 'var(--c-fill)' : '#fff', border: `1.5px solid ${block.done ? 'var(--c-border-soft)' : block.color + '40'}`, borderLeft: `3px solid ${block.done ? 'var(--c-ghost)' : block.color}`, borderRadius: 10, padding: '9px 12px', display: 'flex', alignItems: 'center', gap: 10, transition: 'all .15s', marginBottom: 4 }}>
                          <button onClick={() => toggleDone(block.id)}
                            style={{ width: 20, height: 20, borderRadius: 6, border: `1.5px solid ${block.done ? 'var(--c-green)' : 'var(--c-border)'}`, background: block.done ? 'var(--c-green)' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .15s' }}>
                            {block.done && <Check size={11} color="#fff" />}
                          </button>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13.5, fontWeight: 600, color: block.done ? 'var(--c-ghost)' : 'var(--c-ink)', textDecoration: block.done ? 'line-through' : 'none' }}>{block.task}</div>
                            {block.client && <div style={{ fontSize: 11.5, color: 'var(--c-faint)', marginTop: 2 }}>{block.client}</div>}
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 600, color: block.color, background: `${block.color}18`, borderRadius: 6, padding: '2px 7px', flexShrink: 0 }}>{block.cat}</span>
                        </div>
                      ) : (
                        <div style={{ height: 38 }} />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Side panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* AI note */}
            {aiNote && (
              <div style={{ background: 'var(--c-ink)', borderRadius: 14, padding: '16px 18px', color: '#E8E6E2', animation: 'fadeUp .3s ease both' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                  <Sparkle size={13} color="#FF5C1F" />
                  <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '.06em', color: '#FF7A45' }}>AI NOTE</span>
                </div>
                <p style={{ fontSize: 13.5, lineHeight: 1.6, fontWeight: 400 }}>{aiNote}</p>
              </div>
            )}

            {/* Urgent items */}
            <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 14, padding: '14px 16px' }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--c-muted)', letterSpacing: '.05em', textTransform: 'uppercase', marginBottom: 10 }}>Attention</div>
              {state.planItems.filter(i => i.status === 'review' || (i.day && i.day <= new Date().getDate() && i.status !== 'published')).slice(0, 4).map(item => {
                const client = state.clients.find(c => c.id === item.client_id)
                return (
                  <div key={item.id} style={{ display: 'flex', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--c-border-soft)' }}>
                    <div style={{ width: 3, borderRadius: 99, background: item.status === 'review' ? 'var(--c-amber)' : 'var(--c-red)', flexShrink: 0, marginTop: 3 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.3 }}>{item.title}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--c-faint)', marginTop: 2 }}>{client?.name} · {item.status === 'review' ? 'Needs review' : 'Due today'}</div>
                    </div>
                  </div>
                )
              })}
              {state.planItems.filter(i => i.status === 'review').length === 0 && (
                <div style={{ fontSize: 13, color: 'var(--c-ghost)', fontStyle: 'italic' }}>All clear for today</div>
              )}
            </div>

            {/* Today's published */}
            <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 14, padding: '14px 16px' }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--c-muted)', letterSpacing: '.05em', textTransform: 'uppercase', marginBottom: 10 }}>Published this month</div>
              {state.planItems.filter(i => i.status === 'published').map(item => {
                const client = state.clients.find(c => c.id === item.client_id)
                return (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: '1px solid var(--c-border-soft)' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--c-green)', flexShrink: 0 }} />
                    <div style={{ flex: 1, fontSize: 12.5, fontWeight: 500 }}>{item.title}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--c-faint)' }}>{client?.initials}</div>
                  </div>
                )
              })}
              {state.planItems.filter(i => i.status === 'published').length === 0 && (
                <div style={{ fontSize: 13, color: 'var(--c-ghost)', fontStyle: 'italic' }}>Nothing published yet</div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Team Load View */
        <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--c-border-soft)' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15 }}>Team Capacity</div>
            <div style={{ fontSize: 13, color: 'var(--c-subtle)', marginTop: 2 }}>Active deliverables and effort scores across the team</div>
          </div>
          <div style={{ padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 0 }}>
            {teamLoad.map(u => {
              const pct = Math.min((u.effort / u.max) * 100, 100)
              const overloaded = pct > 80
              return (
                <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 0', borderBottom: '1px solid var(--c-border-soft)' }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: u.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
                    {u.initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600 }}>{u.name}</div>
                      <div style={{ fontSize: 12, color: overloaded ? 'var(--c-red)' : 'var(--c-faint)', fontWeight: overloaded ? 700 : 400 }}>
                        {u.assigned} items · effort {u.effort}/{u.max}
                      </div>
                    </div>
                    <div style={{ height: 6, background: 'var(--c-fill)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 99, background: overloaded ? 'var(--c-red)' : pct > 60 ? 'var(--c-amber)' : 'var(--c-green)', width: `${pct}%`, transition: 'width .5s' }} />
                    </div>
                  </div>
                  <div style={{ flexShrink: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: overloaded ? 'var(--c-red)' : pct > 60 ? 'var(--c-amber)' : 'var(--c-green)', background: overloaded ? 'var(--c-red-bg)' : pct > 60 ? 'var(--c-amber-bg)' : 'var(--c-green-bg)', borderRadius: 6, padding: '3px 8px' }}>
                      {overloaded ? 'Overloaded' : pct > 60 ? 'Busy' : 'Available'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
          {/* Unassigned items */}
          <div style={{ padding: '14px 18px', borderTop: '1px solid var(--c-border-soft)', background: 'var(--c-fill)' }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--c-muted)', marginBottom: 8 }}>
              Unassigned deliverables ({state.planItems.filter(i => !i.assignee_id).length})
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {state.planItems.filter(i => !i.assignee_id).map(item => {
                const client = state.clients.find(c => c.id === item.client_id)
                return (
                  <span key={item.id} style={{ fontSize: 12, fontWeight: 500, background: '#fff', border: '1px solid var(--c-border)', borderRadius: 8, padding: '4px 9px' }}>
                    {client?.initials} — {item.type}
                  </span>
                )
              })}
              {state.planItems.filter(i => !i.assignee_id).length === 0 && (
                <span style={{ fontSize: 13, color: 'var(--c-ghost)', fontStyle: 'italic' }}>All items assigned</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
