'use client'
import { useState } from 'react'
import { useApp, useToast } from '@/lib/store'
import { Sparkle, ArrowRight, Plus, X, Check } from '@/components/ui/Icon'
import { ModalPortal } from '@/components/ui/ModalPortal'

const CAPACITY_MAX = 8

export default function MyDay() {
  const { state, dispatch } = useApp()
  const toast = useToast()
  const role = state.currentUser?.role || 'employee'
  const name = state.currentUser?.name?.split(' ')[0] || 'there'
  const [done, setDone] = useState<Record<string, boolean>>({})
  const [expanded, setExpanded] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [nw, setNw] = useState<{ title: string; clientId: string; type: string; priority: 'Low' | 'Medium' | 'High' }>({ title: '', clientId: '', type: 'Design', priority: 'Medium' })

  const now = new Date()
  const h = now.getHours()
  const greeting = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const mos = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const dateStr = `${days[now.getDay()]}, ${mos[now.getMonth()]} ${now.getDate()}`

  const clientName = (id: string) => state.clients.find(c => c.id === id)?.name || ''
  const clientColor = (id: string) => state.clients.find(c => c.id === id)?.color || '#9A9E94'

  function createTask() {
    if (!nw.title.trim()) return
    dispatch({
      type: 'UPSERT_TASK', task: {
        id: `task-${Date.now()}`,
        title: nw.title,
        client_id: nw.clientId,
        type: nw.type,
        assignee_id: state.currentUser?.id || '',
        due: 'Today',
        priority: nw.priority,
        done: false,
        created_at: new Date().toISOString(),
      }
    })
    toast('Task created')
    setCreateOpen(false)
    setNw({ title: '', clientId: state.clients[0]?.id || '', type: 'Design', priority: 'Medium' })
  }

  if (role === 'owner') return <OwnerView name={name} greeting={greeting} dateStr={dateStr} state={state} dispatch={dispatch} />
  if (role === 'manager') return <ManagerView name={name} greeting={greeting} dateStr={dateStr} state={state} dispatch={dispatch} />

  // Employee / Sales view
  const uid = state.currentUser?.id || ''
  const myTasks = state.tasks.filter(t => t.assignee_id === uid && !t.done && !done[t.id])
  const myItems = state.planItems.filter(i => i.assignee_id === uid && i.status !== 'published')

  // Unified work list: tasks first (by priority), then plan items
  const priorityRank = (p: string) => p === 'High' ? 0 : p === 'Medium' ? 1 : 2
  const effortToTime = (e: number) => e <= 1 ? '30m' : e === 2 ? '1h' : e === 3 ? '2h' : e === 4 ? '3h' : '4h'

  const workItems = [
    ...myTasks.sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority)).map(t => ({
      id: t.id,
      title: t.title,
      clientId: t.client_id,
      type: t.type,
      priority: t.priority as 'Low' | 'Medium' | 'High',
      est: '1h',
      due: t.due,
      idea: t.idea,
      hook: t.hook,
      format: t.format,
      refs: t.refs || [],
    })),
    ...myItems.map(i => ({
      id: i.id,
      title: i.title,
      clientId: i.client_id,
      type: i.type,
      priority: (i.effort >= 4 ? 'High' : i.effort >= 3 ? 'Medium' : 'Low') as 'Low' | 'Medium' | 'High',
      est: effortToTime(i.effort),
      due: i.day ? `Day ${i.day}` : 'Scheduled',
      idea: i.brief,
      hook: undefined,
      format: undefined,
      refs: i.refs || [],
    })),
  ]

  const totalItems = workItems.length
  const totalHours = myTasks.length + myItems.reduce((s, i) => s + (i.effort || 1), 0)
  const uniqueClients = new Set(workItems.map(t => t.clientId).filter(Boolean)).size
  const capacityPct = Math.round((totalItems / CAPACITY_MAX) * 100)

  return (
    <div style={{ animation: 'fadeIn .4s ease both' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, marginBottom: 26, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, color: 'var(--c-subtle)', fontSize: 13.5, fontWeight: 500, marginBottom: 7 }}>
            {dateStr}
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--c-rule)' }} />
            {totalItems} task{totalItems !== 1 ? 's' : ''} · {totalHours}h planned
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1 }}>{greeting}, {name}.</h1>
          {totalItems === 0
            ? <p style={{ color: 'var(--c-muted)', fontSize: 15.5, marginTop: 8 }}>No tasks assigned yet — you&apos;re all clear for today.</p>
            : <p style={{ color: 'var(--c-muted)', fontSize: 15.5, marginTop: 8 }}>{uniqueClients > 0 ? `${uniqueClients} client${uniqueClients > 1 ? 's' : ''} need work today.` : 'Your tasks for today.'} Start with the highest priority items.</p>
          }
        </div>
        <button onClick={() => setCreateOpen(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--c-ink)', color: '#fff', borderRadius: 11, padding: '11px 16px', fontWeight: 600, fontSize: 14, transition: 'transform .15s' }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = ''}>
          <Plus size={16} color="var(--c-accent)" />New task
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.55fr 1fr', gap: 18, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Capacity summary */}
          <div style={{ background: 'var(--c-ink)', color: '#fff', borderRadius: 18, padding: '22px 24px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle,rgba(255,92,31,.2),transparent 65%)', top: -90, right: -60 }} />
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8, color: '#FF7A45', fontSize: 12, fontWeight: 700, letterSpacing: '.04em', marginBottom: 14 }}>
              <Sparkle size={14} style={{ animation: 'sparkleSpin 8s linear infinite' }} />
              YOUR WORKLOAD TODAY
            </div>
            <div style={{ position: 'relative', display: 'flex', gap: 26, flexWrap: 'wrap', alignItems: 'center' }}>
              <div><div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700 }}>{totalItems}</div><div style={{ color: '#9A9E94', fontSize: 12.5 }}>task{totalItems !== 1 ? 's' : ''} assigned</div></div>
              <div><div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700 }}>{totalHours}</div><div style={{ color: '#9A9E94', fontSize: 12.5 }}>hours planned</div></div>
              {uniqueClients > 0 && <div><div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700 }}>{uniqueClients}</div><div style={{ color: '#9A9E94', fontSize: 12.5 }}>client{uniqueClients !== 1 ? 's' : ''}</div></div>}
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
                <svg width="56" height="56" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="11" />
                  <circle cx="60" cy="60" r="54" fill="none" stroke={capacityPct > 100 ? '#EF4444' : 'var(--c-accent)'} strokeWidth="11" strokeLinecap="round" strokeDasharray="339" strokeDashoffset={339 - Math.min(339, 339 * capacityPct / 100)} style={{ animation: 'ringIn 1.1s ease both' }} />
                </svg>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: capacityPct > 100 ? '#EF4444' : '#FF7A45' }}>{capacityPct}%</div>
                  <div style={{ color: '#9A9E94', fontSize: 11.5, lineHeight: 1.2 }}>{capacityPct > 100 ? 'over\ncapacity' : capacityPct > 80 ? 'near\nfull' : 'healthy\ncapacity'}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Tasks list */}
          <div style={{ background: '#fff', border: '1px solid var(--c-border)', borderRadius: 18, overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '17px 20px', borderBottom: '1px solid var(--c-border-soft)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700 }}>Your tasks</h3>
                <span style={{ background: 'var(--c-fill)', color: 'var(--c-muted)', fontSize: 12, fontWeight: 600, borderRadius: 7, padding: '2px 8px' }}>{workItems.length}</span>
              </div>
              <button onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'planner' })} style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-accent-dark)', display: 'flex', alignItems: 'center', gap: 4 }}>
                Open planner <ArrowRight size={13} />
              </button>
            </div>
            {workItems.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--c-ghost)' }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>🎉</div>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Nothing assigned yet</div>
                <div style={{ fontSize: 13 }}>Tasks assigned to you will appear here</div>
              </div>
            ) : workItems.map(t => {
              const isDone = !!done[t.id]
              const isExp = expanded === t.id && !!t.idea
              const pc = t.priority === 'High' ? '#FF5C38' : t.priority === 'Medium' ? '#F4B740' : '#9A9E94'
              const cc = clientColor(t.clientId)
              return (
                <div key={t.id} style={{ borderBottom: '1px solid var(--c-border-soft)' }}>
                  <div onClick={() => setExpanded(isExp ? null : t.id)} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '14px 20px', cursor: t.idea ? 'pointer' : 'default', transition: 'background .15s' }}
                    onMouseEnter={e => { if (t.idea) (e.currentTarget as HTMLElement).style.background = 'var(--c-fill-soft)' }}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
                    <button onClick={e => { e.stopPropagation(); setDone(d => ({ ...d, [t.id]: !d[t.id] })) }}
                      style={{ width: 22, height: 22, borderRadius: 7, border: `2px solid ${isDone ? 'var(--c-green)' : 'var(--c-rule)'}`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isDone ? 'var(--c-green)' : '#fff', transition: 'all .15s' }}>
                      {isDone && <Check size={11} color="#fff" />}
                    </button>
                    <span style={{ width: 3, height: 30, borderRadius: 3, background: cc, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textDecoration: isDone ? 'line-through' : 'none', opacity: isDone ? .6 : 1 }}>{t.title}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 3, fontSize: 12.5, color: 'var(--c-subtle)' }}>
                        {t.clientId && <span style={{ fontWeight: 600, color: cc }}>{clientName(t.clientId)}</span>}
                        {t.clientId && <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--c-rule)' }} />}
                        <span>{t.type}</span>
                        <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--c-rule)' }} />
                        <span>est {t.est}</span>
                      </div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 7, padding: '3px 8px', background: pc + '1f', color: pc }}>{t.priority}</span>
                    {t.due && <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--c-subtle)', whiteSpace: 'nowrap', minWidth: 60, textAlign: 'right' }}>{t.due}</span>}
                  </div>
                  {isExp && t.idea && (
                    <div style={{ margin: '0 20px 16px 58px', background: '#FFF7F2', border: '1px solid #FFD9C7', borderRadius: 12, padding: '14px 16px', animation: 'popIn .18s ease both' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--c-accent-dark)', fontSize: 11.5, fontWeight: 700, letterSpacing: '.03em', marginBottom: 9 }}>
                        <Sparkle size={13} />BRIEF &amp; NOTES
                      </div>
                      {t.format && <div style={{ display: 'inline-block', fontSize: 11, fontWeight: 700, color: 'var(--c-purple)', background: 'var(--c-purple-bg)', borderRadius: 6, padding: '3px 9px', marginBottom: 9 }}>{t.format}</div>}
                      {t.hook && <div style={{ fontSize: 13.5, lineHeight: 1.5, color: '#2B1E16', marginBottom: 8 }}><b>Hook:</b> {t.hook}</div>}
                      <p style={{ margin: '0 0 11px', fontSize: 13, lineHeight: 1.55, color: '#5A4A40' }}>{t.idea}</p>
                      {t.refs && t.refs.length > 0 && (
                        <>
                          <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--c-ghost)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 7 }}>References</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                            {t.refs.map((r, i) => (
                              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff', border: '1px solid #FFD9C7', borderRadius: 8, padding: '5px 10px', fontSize: 12, fontWeight: 600, color: '#9A3A12' }}>
                                {r.label}
                              </span>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Morning brief */}
          <div style={{ background: '#fff', border: '1px solid var(--c-border)', borderRadius: 18, padding: 20, boxShadow: 'var(--shadow-card)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 13 }}>
              <span style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--c-accent-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkle size={15} color="var(--c-accent-dark)" />
              </span>
              <div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700 }}>Morning brief</h3>
                <div style={{ fontSize: 12, color: 'var(--c-subtle)' }}>AI-generated daily summary</div>
              </div>
            </div>
            <button onClick={() => dispatch({ type: 'TOGGLE_BRIEF' })} style={{ width: '100%', background: 'var(--c-ink)', color: '#fff', borderRadius: 11, padding: 12, fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'transform .15s' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = ''}>
              View today&apos;s brief <ArrowRight size={15} color="var(--c-accent)" />
            </button>
          </div>

          {/* Stats */}
          <div style={{ background: '#fff', border: '1px solid var(--c-border)', borderRadius: 18, padding: 20, boxShadow: 'var(--shadow-card)' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Workload summary</h3>
            {[
              { label: 'Assigned tasks', val: myTasks.length, color: 'var(--c-accent)' },
              { label: 'Content items', val: myItems.length, color: '#7C3AED' },
              { label: 'Capacity', val: `${capacityPct}%`, color: capacityPct > 100 ? '#EF4444' : capacityPct > 80 ? '#F59E0B' : '#10B981' },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--c-border-soft)' }}>
                <span style={{ fontSize: 13.5, color: 'var(--c-muted)' }}>{s.label}</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: s.color }}>{s.val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick task modal */}
      {createOpen && (
        <ModalPortal><div onClick={() => setCreateOpen(false)} className="modal-overlay">
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 520, background: '#fff', borderRadius: 22, overflow: 'hidden', boxShadow: 'var(--shadow-modal)', animation: 'popIn .26s cubic-bezier(.2,.9,.3,1) both' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--c-border-soft)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                <span style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--c-accent-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Plus size={17} color="var(--c-accent-dark)" />
                </span>
                <div>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700 }}>New task</h3>
                  <div style={{ fontSize: 12.5, color: 'var(--c-subtle)' }}>Adds to your task list immediately</div>
                </div>
              </div>
              <button onClick={() => setCreateOpen(false)} style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--c-fill)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={17} color="var(--c-muted)" /></button>
            </div>
            <div style={{ padding: '22px 24px' }}>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--c-muted)', marginBottom: 7 }}>Task title</label>
              <input value={nw.title} onChange={e => setNw(n => ({ ...n, title: e.target.value }))} placeholder="e.g. Design 3 IG carousel slides"
                style={{ width: '100%', background: 'var(--c-fill-soft)', border: '1.5px solid var(--c-border)', borderRadius: 11, padding: '12px 14px', fontSize: 14.5, marginBottom: 16 }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--c-muted)', marginBottom: 7 }}>Client</label>
                  <select value={nw.clientId} onChange={e => setNw(n => ({ ...n, clientId: e.target.value }))} style={{ width: '100%', background: 'var(--c-fill-soft)', border: '1.5px solid var(--c-border)', borderRadius: 11, padding: '12px 14px', fontSize: 14 }}>
                    <option value="">No client</option>
                    {state.clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--c-muted)', marginBottom: 7 }}>Type</label>
                  <select value={nw.type} onChange={e => setNw(n => ({ ...n, type: e.target.value }))} style={{ width: '100%', background: 'var(--c-fill-soft)', border: '1.5px solid var(--c-border)', borderRadius: 11, padding: '12px 14px', fontSize: 14 }}>
                    {['Design', 'Video', 'Copy', 'Strategy', 'Review', 'Call', 'Other'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--c-muted)', marginBottom: 9 }}>Priority</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['Low', 'Medium', 'High'] as const).map(pr => {
                  const sel = nw.priority === pr
                  const col = pr === 'High' ? '#FF5C38' : pr === 'Medium' ? '#F4B740' : '#9A9E94'
                  return <button key={pr} onClick={() => setNw(n => ({ ...n, priority: pr }))} style={{ flex: 1, borderRadius: 10, padding: 10, fontSize: 13.5, fontWeight: 600, border: `1.5px solid ${sel ? col : 'var(--c-border)'}`, background: sel ? col + '1f' : 'var(--c-fill-soft)', color: sel ? col : 'var(--c-muted)', transition: 'all .15s' }}>{pr}</button>
                })}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '16px 24px', background: 'var(--c-fill-soft)', borderTop: '1px solid var(--c-border-soft)' }}>
              <button onClick={() => setCreateOpen(false)} style={{ padding: '11px 18px', borderRadius: 11, background: 'var(--c-fill)', fontWeight: 600, fontSize: 14, color: 'var(--c-ink-3)' }}>Cancel</button>
              <button onClick={createTask} style={{ padding: '11px 20px', borderRadius: 11, fontWeight: 700, fontSize: 14, background: 'var(--c-accent)', color: '#fff', boxShadow: 'var(--shadow-accent)', transition: 'transform .15s' }}>Create task</button>
            </div>
          </div>
        </div></ModalPortal>
      )}
    </div>
  )
}

function OwnerView({ name, greeting, dateStr, state, dispatch }: { name: string; greeting: string; dateStr: string; state: any; dispatch: any }) {
  const { clients, users, tasks, planItems } = state

  const totalTasks = tasks.filter((t: any) => !t.done).length
  const totalItems = planItems.filter((i: any) => i.status !== 'published').length
  const activeClients = clients.length
  const atRisk = clients.filter((c: any) => c.health < 55).length

  const teamCapacity = users.map((u: any) => {
    const tc = tasks.filter((t: any) => t.assignee_id === u.id && !t.done).length
    const ic = planItems.filter((i: any) => i.assignee_id === u.id && i.status !== 'published').length
    return Math.round(((tc + ic) / 8) * 100)
  })
  const avgCapacity = teamCapacity.length ? Math.round(teamCapacity.reduce((s: number, p: number) => s + p, 0) / teamCapacity.length) : 0

  return (
    <div style={{ animation: 'fadeIn .4s ease both' }}>
      <div style={{ marginBottom: 26 }}>
        <div style={{ color: 'var(--c-subtle)', fontSize: 13.5, fontWeight: 500, marginBottom: 7 }}>{dateStr} · Company overview</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em' }}>{greeting}, {name}.</h1>
        <p style={{ color: 'var(--c-muted)', fontSize: 15.5, marginTop: 8, maxWidth: '62ch' }}>
          {atRisk > 0 ? `${atRisk} client${atRisk > 1 ? 's' : ''} need attention.` : 'All clients are healthy.'} Team is at {avgCapacity}% capacity.
        </p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 18 }}>
        {[
          { label: 'Active clients', val: String(activeClients), c: 'var(--c-ink)', bg: 'var(--c-ink)', textC: '#fff' },
          { label: 'Open tasks', val: String(totalTasks + totalItems), c: '#7C3AED', bg: '#fff' },
          { label: 'Clients at risk', val: String(atRisk), c: atRisk > 0 ? '#EF4444' : '#10B981', bg: '#fff' },
          { label: 'Team utilisation', val: `${avgCapacity}%`, c: avgCapacity > 100 ? '#EF4444' : avgCapacity > 80 ? '#F59E0B' : '#10B981', bg: '#fff' },
        ].map((s, i) => (
          <div key={i} style={{ background: s.bg || '#fff', border: `1px solid ${s.bg === 'var(--c-ink)' ? 'var(--c-ink)' : 'var(--c-border)'}`, borderRadius: 16, padding: '18px 20px', color: s.bg === 'var(--c-ink)' ? '#fff' : undefined }}>
            <div style={{ fontSize: 12.5, color: s.bg === 'var(--c-ink)' ? '#9A9E94' : 'var(--c-subtle)' }}>{s.label}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, marginTop: 4, color: s.c }}>{s.val}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 18 }}>
        <div style={{ background: '#fff', border: '1px solid var(--c-border)', borderRadius: 18, padding: 20, boxShadow: 'var(--shadow-card)' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, marginBottom: 14 }}>Client health</h3>
          {clients.length === 0 ? (
            <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--c-ghost)', fontSize: 13 }}>No clients yet</div>
          ) : clients.map((c: any) => {
            const hi = c.health < 55 ? { c: '#EF4444', bg: '#FDECEC', z: 'At risk' } : c.health < 75 ? { c: 'var(--c-amber)', bg: 'var(--c-amber-bg)', z: 'Watch' } : { c: 'var(--c-green)', bg: 'var(--c-green-bg)', z: 'Healthy' }
            return (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 11, cursor: 'pointer' }} onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'clients' })}>
                <span style={{ width: 32, height: 32, borderRadius: 9, background: c.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11, fontFamily: 'var(--font-display)', flexShrink: 0 }}>{c.initials}</span>
                <div style={{ width: 120, fontWeight: 600, fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                <div style={{ flex: 1, height: 7, background: 'var(--c-fill)', borderRadius: 5, overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 5, width: `${c.health}%`, background: hi.c, transition: 'width .8s cubic-bezier(.2,.9,.3,1)' }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 6, padding: '2px 7px', color: hi.c, background: hi.bg, minWidth: 62, textAlign: 'center' }}>{hi.z}</span>
              </div>
            )
          })}
        </div>
        <div style={{ background: '#fff', border: '1px solid var(--c-border)', borderRadius: 18, padding: 20, boxShadow: 'var(--shadow-card)' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, marginBottom: 14 }}>Team workload</h3>
          {users.length === 0 ? (
            <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--c-ghost)', fontSize: 13 }}>No team members yet</div>
          ) : users.map((u: any) => {
            const tc = tasks.filter((t: any) => t.assignee_id === u.id && !t.done).length
            const ic = planItems.filter((i: any) => i.assignee_id === u.id && i.status !== 'published').length
            const pct = Math.round(((tc + ic) / 8) * 100)
            const col = pct > 100 ? '#EF4444' : pct > 80 ? '#F59E0B' : '#10B981'
            return (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 11 }}>
                <span style={{ width: 28, height: 28, borderRadius: 8, background: u.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 10, fontFamily: 'var(--font-display)', flexShrink: 0 }}>{u.initials}</span>
                <div style={{ fontSize: 12.5, fontWeight: 600, minWidth: 80, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name.split(' ')[0]}</div>
                <div style={{ flex: 1, height: 6, background: 'var(--c-fill)', borderRadius: 5, overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 5, width: `${Math.min(pct, 100)}%`, background: col, transition: 'width .8s' }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: col, minWidth: 36, textAlign: 'right' }}>{pct}%</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function ManagerView({ name, greeting, dateStr, state, dispatch }: { name: string; greeting: string; dateStr: string; state: any; dispatch: any }) {
  const { users, tasks, planItems } = state
  const totalOpen = tasks.filter((t: any) => !t.done).length + planItems.filter((i: any) => i.status !== 'published').length
  const overCapacity = users.filter((u: any) => {
    const tc = tasks.filter((t: any) => t.assignee_id === u.id && !t.done).length
    const ic = planItems.filter((i: any) => i.assignee_id === u.id && i.status !== 'published').length
    return ((tc + ic) / 8) > 1
  }).length

  return (
    <div style={{ animation: 'fadeIn .4s ease both' }}>
      <div style={{ marginBottom: 26 }}>
        <div style={{ color: 'var(--c-subtle)', fontSize: 13.5, fontWeight: 500, marginBottom: 7 }}>{dateStr} · {totalOpen} open items · {overCapacity > 0 ? `${overCapacity} over capacity` : 'team balanced'}</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em' }}>{greeting}, {name}.</h1>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 18 }}>
        <div style={{ background: 'var(--c-ink)', color: '#fff', borderRadius: 18, padding: '22px 24px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle,rgba(255,92,31,.2),transparent 65%)', top: -90, right: -60 }} />
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8, color: '#FF7A45', fontSize: 12, fontWeight: 700, marginBottom: 14 }}>
            <Sparkle size={14} style={{ animation: 'sparkleSpin 8s linear infinite' }} />TEAM OVERVIEW
          </div>
          <p style={{ position: 'relative', fontSize: 18, lineHeight: 1.5, margin: '0 0 18px', fontWeight: 500, maxWidth: '48ch' }}>
            {overCapacity > 0
              ? `${overCapacity} team member${overCapacity > 1 ? 's are' : ' is'} over capacity. Open the planner to rebalance workload.`
              : 'Team workload is balanced. Check the planner to assign today\'s content.'}
          </p>
          <div style={{ position: 'relative', display: 'flex', gap: 10 }}>
            <button onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'planner' })} style={{ background: 'var(--c-accent)', color: '#fff', borderRadius: 10, padding: '10px 16px', fontWeight: 700, fontSize: 13 }}>Open planner</button>
            <button onClick={() => dispatch({ type: 'TOGGLE_BRIEF' })} style={{ background: 'rgba(255,255,255,.1)', color: '#fff', borderRadius: 10, padding: '10px 16px', fontWeight: 600, fontSize: 13 }}>Send brief</button>
          </div>
        </div>
        <div style={{ background: '#fff', border: '1px solid var(--c-border)', borderRadius: 18, padding: 20, boxShadow: 'var(--shadow-card)' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, marginBottom: 14 }}>Team workload</h3>
          {users.length === 0 ? (
            <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--c-ghost)', fontSize: 13 }}>No team members yet</div>
          ) : users.map((u: any) => {
            const tc = tasks.filter((t: any) => t.assignee_id === u.id && !t.done).length
            const ic = planItems.filter((i: any) => i.assignee_id === u.id && i.status !== 'published').length
            const pct = Math.round(((tc + ic) / 8) * 100)
            const col = pct > 100 ? '#EF4444' : pct > 80 ? '#F59E0B' : '#22C55E'
            return (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 12 }}>
                <span style={{ width: 30, height: 30, borderRadius: 8, background: u.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11, fontFamily: 'var(--font-display)' }}>{u.initials}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{u.name.split(' ')[0]}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: col }}>{pct}%</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--c-fill)', borderRadius: 5, overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 5, width: `${Math.min(pct, 100)}%`, background: col, transition: 'width .8s' }} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
