'use client'
import { useState } from 'react'
import { useApp, useToast, useUpsertTask } from '@/lib/store'
import { Plus, X, Check } from '@/components/ui/Icon'
import { ModalPortal } from '@/components/ui/ModalPortal'
import type { Task } from '@/types'

const CHANNELS = ['SEO', 'Google Ads', 'Meta Ads', 'Email', 'Analytics', 'Landing Page', 'Other']
const CHANNEL_COLOR: Record<string, { c: string; bg: string }> = {
  'SEO': { c: '#0E8C63', bg: '#E7FAF3' },
  'Google Ads': { c: '#2563EB', bg: '#EAF1FF' },
  'Meta Ads': { c: '#7C3AED', bg: '#F3EEFE' },
  'Email': { c: '#C2410C', bg: '#FFF1EA' },
  'Analytics': { c: '#0369A1', bg: '#E0F2FE' },
  'Landing Page': { c: '#B07E0C', bg: '#FBF1D6' },
  'Other': { c: '#5A5E54', bg: '#F2F3EF' },
}
const STATUSES = [
  { key: 'todo', label: 'To do', c: '#B07E0C', bg: '#FBF1D6' },
  { key: 'in_progress', label: 'In progress', c: '#2563EB', bg: '#EAF1FF' },
  { key: 'done', label: 'Done', c: '#0E8C63', bg: '#E7FAF3' },
]
const DEPT = 'Digital Marketing'

const inputStyle: React.CSSProperties = { width: '100%', border: '1.5px solid var(--c-border)', borderRadius: 10, padding: '10px 12px', fontSize: 14, boxSizing: 'border-box' }

interface Form { id?: string; title: string; client_id: string; assignee_id: string; channel: string; goal: string; due: string; priority: 'Low' | 'Medium' | 'High'; status: string }
const EMPTY: Form = { title: '', client_id: '', assignee_id: '', channel: 'SEO', goal: '', due: '', priority: 'Medium', status: 'todo' }

export default function DigitalMarketingScreen() {
  const { state } = useApp()
  const toast = useToast()
  const upsertTask = useUpsertTask()
  const me = state.currentUser
  const isLead = ['owner', 'manager'].includes(me?.role || '')

  const [modal, setModal] = useState<Form | null>(null)

  let tasks = state.tasks.filter(t => t.department === DEPT)
  if (!isLead) tasks = tasks.filter(t => t.assignee_id === me?.id) // DM employees see only their work

  const clientName = (id: string) => state.clients.find(c => c.id === id)?.name || 'No client'
  const dmPeople = state.users // owner can assign to anyone; keep it open

  const stats = {
    active: tasks.filter(t => t.status !== 'done').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    done: tasks.filter(t => t.status === 'done').length,
  }

  function openNew() { setModal({ ...EMPTY, assignee_id: '' }) }
  function openEdit(t: Task) {
    setModal({ id: t.id, title: t.title, client_id: t.client_id || '', assignee_id: t.assignee_id || '', channel: t.channel || 'SEO', goal: t.goal || '', due: t.due || '', priority: t.priority, status: t.status || 'todo' })
  }

  function save() {
    if (!modal?.title.trim()) { toast('Add a task title'); return }
    const t: Task = {
      id: modal.id || crypto.randomUUID(),
      title: modal.title.trim(),
      client_id: modal.client_id,
      type: 'Digital Marketing',
      assignee_id: modal.assignee_id,
      due: modal.due,
      priority: modal.priority,
      done: modal.status === 'done',
      department: DEPT,
      channel: modal.channel,
      goal: modal.goal,
      status: modal.status,
      created_at: new Date().toISOString(),
    }
    upsertTask(t)
    toast(modal.id ? 'Task updated' : 'Task created')
    setModal(null)
  }

  function setStatus(t: Task, status: string) {
    upsertTask({ ...t, status, done: status === 'done' })
  }

  // group by client
  const byClient = new Map<string, Task[]>()
  for (const t of tasks) {
    const key = t.client_id || '—'
    if (!byClient.has(key)) byClient.set(key, [])
    byClient.get(key)!.push(t)
  }

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 22 }}>
        <div>
          <div style={{ fontSize: 13, color: 'var(--c-faint)', marginBottom: 4 }}>Digital Marketing · SEO &amp; Performance</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em' }}>{isLead ? 'Performance board' : 'My performance work'}</h1>
        </div>
        {isLead && (
          <button onClick={openNew} style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'var(--c-accent)', color: '#fff', borderRadius: 10, padding: '10px 16px', fontWeight: 700, fontSize: 13.5, border: 'none', cursor: 'pointer' }}>
            <Plus size={14} color="#fff" />New task
          </button>
        )}
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 22 }}>
        {[
          { label: 'Active', value: stats.active, color: '#FF5C1F' },
          { label: 'In progress', value: stats.inProgress, color: '#2563EB' },
          { label: 'Completed', value: stats.done, color: '#0E8C63' },
        ].map((s, i) => (
          <div key={i} style={{ background: '#fff', border: '1px solid var(--c-border)', borderRadius: 14, padding: '16px 18px' }}>
            <div style={{ fontSize: 12.5, color: 'var(--c-faint)', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {tasks.length === 0 ? (
        <div style={{ background: '#fff', border: '1px solid var(--c-border)', borderRadius: 16, padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>📈</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No performance tasks yet</div>
          <div style={{ fontSize: 13, color: 'var(--c-subtle)' }}>{isLead ? 'Create SEO, ads or analytics tasks and assign them to your team.' : 'Tasks assigned to you will show up here.'}</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {[...byClient.entries()].map(([cid, rows]) => (
            <div key={cid}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.04em', color: 'var(--c-faint)', textTransform: 'uppercase', marginBottom: 8 }}>{clientName(cid)} · {rows.length}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {rows.map(t => {
                  const ch = CHANNEL_COLOR[t.channel || 'Other'] || CHANNEL_COLOR.Other
                  const assignee = state.users.find(u => u.id === t.assignee_id)
                  return (
                    <div key={t.id} style={{ background: '#fff', border: '1px solid var(--c-border)', borderRadius: 13, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14, opacity: t.status === 'done' ? .7 : 1 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: ch.c, background: ch.bg, borderRadius: 6, padding: '2px 8px' }}>{t.channel}</span>
                          <span style={{ fontSize: 14.5, fontWeight: 700, textDecoration: t.status === 'done' ? 'line-through' : 'none' }}>{t.title}</span>
                        </div>
                        <div style={{ fontSize: 12.5, color: 'var(--c-subtle)' }}>
                          {t.goal ? `🎯 ${t.goal}` : 'No goal set'}{t.due ? ` · due ${t.due}` : ''}
                        </div>
                      </div>
                      {assignee && (
                        <div title={assignee.name} style={{ width: 28, height: 28, borderRadius: '50%', background: assignee.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9.5, fontWeight: 700, flexShrink: 0 }}>{assignee.initials}</div>
                      )}
                      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                        {STATUSES.map(s => (
                          <button key={s.key} onClick={() => setStatus(t, s.key)}
                            style={{ fontSize: 11.5, fontWeight: 700, padding: '5px 9px', borderRadius: 7, border: '1.5px solid', borderColor: t.status === s.key ? s.c : 'var(--c-border)', color: t.status === s.key ? s.c : 'var(--c-ghost)', background: t.status === s.key ? s.bg : '#fff', cursor: 'pointer' }}>
                            {s.label}
                          </button>
                        ))}
                      </div>
                      {isLead && (
                        <button onClick={() => openEdit(t)} style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 7, color: 'var(--c-ghost)', background: 'transparent', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / edit modal */}
      {modal && (
        <ModalPortal><div onClick={() => setModal(null)} className="modal-overlay">
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 480, background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--shadow-modal)', animation: 'popIn .22s cubic-bezier(.2,.9,.3,1) both' }}>
            <div style={{ padding: '20px 22px', borderBottom: '1px solid var(--c-border-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17 }}>{modal.id ? 'Edit task' : 'New performance task'}</div>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={16} color="var(--c-ghost)" /></button>
            </div>
            <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 14, maxHeight: '68vh', overflowY: 'auto' }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 5 }}>Task</label>
                <input value={modal.title} onChange={e => setModal(m => ({ ...m!, title: e.target.value }))} placeholder="e.g. Rank for 'organic skincare' — on-page SEO" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 7 }}>Channel</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {CHANNELS.map(ch => (
                    <button key={ch} onClick={() => setModal(m => ({ ...m!, channel: ch }))}
                      style={{ fontSize: 12.5, fontWeight: 600, padding: '6px 11px', borderRadius: 8, border: '1.5px solid', borderColor: modal.channel === ch ? 'var(--c-accent)' : 'var(--c-border)', color: modal.channel === ch ? 'var(--c-accent)' : 'var(--c-muted)', background: modal.channel === ch ? 'rgba(255,92,31,.06)' : '#fff', cursor: 'pointer' }}>{ch}</button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 5 }}>Client</label>
                  <select value={modal.client_id} onChange={e => setModal(m => ({ ...m!, client_id: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}>
                    <option value="">No client</option>
                    {state.clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 5 }}>Assign to</label>
                  <select value={modal.assignee_id} onChange={e => setModal(m => ({ ...m!, assignee_id: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}>
                    <option value="">Unassigned</option>
                    {dmPeople.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 5 }}>Goal / target metric</label>
                <input value={modal.goal} onChange={e => setModal(m => ({ ...m!, goal: e.target.value }))} placeholder="e.g. +20% organic traffic, ROAS 4x, CPL under ₹150" style={inputStyle} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 5 }}>Due date</label>
                  <input type="date" value={modal.due} onChange={e => setModal(m => ({ ...m!, due: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 5 }}>Priority</label>
                  <div style={{ display: 'flex', gap: 5 }}>
                    {(['Low', 'Medium', 'High'] as const).map(p => (
                      <button key={p} onClick={() => setModal(m => ({ ...m!, priority: p }))}
                        style={{ flex: 1, fontSize: 12, fontWeight: 700, padding: '9px 0', borderRadius: 8, border: '1.5px solid', borderColor: modal.priority === p ? 'var(--c-accent)' : 'var(--c-border)', color: modal.priority === p ? 'var(--c-accent)' : 'var(--c-muted)', background: modal.priority === p ? 'rgba(255,92,31,.06)' : '#fff', cursor: 'pointer' }}>{p}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div style={{ padding: '14px 22px', borderTop: '1px solid var(--c-border-soft)', display: 'flex', gap: 10 }}>
              <button onClick={() => setModal(null)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1.5px solid var(--c-border)', fontSize: 14, fontWeight: 600, color: 'var(--c-subtle)', background: '#fff' }}>Cancel</button>
              <button onClick={save} style={{ flex: 2, padding: '10px', borderRadius: 10, background: 'var(--c-ink)', color: '#fff', fontSize: 14, fontWeight: 700, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                <Check size={14} color="#fff" />{modal.id ? 'Update' : 'Create task'}
              </button>
            </div>
          </div>
        </div></ModalPortal>
      )}
    </div>
  )
}
