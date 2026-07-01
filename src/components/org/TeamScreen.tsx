'use client'
import { useState } from 'react'
import { useApp, useToast } from '@/lib/store'
import { Plus, X } from '@/components/ui/Icon'
import type { Profile } from '@/types'

const CAPACITY_MAX = 8
const COLORS = ['#0EA5A4','#FB7185','#6366F1','#F4B740','#8B5CF6','#2563EB','#10B981','#EF4444','#FF5C1F']
const ROLE_OPTS = [
  { key: 'manager', label: 'Manager', desc: 'Full access except owner settings' },
  { key: 'sales',   label: 'Sales',   desc: 'Pipeline, leads, clients only' },
  { key: 'employee',label: 'Employee',desc: 'Work tools: tasks, content, calendar' },
] as const

function getDept(u: Profile): string {
  const t = (u.title || '').toLowerCase()
  if (u.role === 'owner') return 'Leadership'
  if (t.includes('account')) return 'Accounts'
  if (t.includes('strategy') || t.includes('strategist')) return 'Strategy'
  if (t.includes('design') || t.includes('video') || t.includes('copy') || t.includes('creative')) return 'Creative'
  if (t.includes('market') || t.includes('performance') || t.includes('ads') || t.includes('seo')) return 'Marketing'
  if (u.role === 'sales' || t.includes('sales') || t.includes('business')) return 'Sales'
  if (u.role === 'manager') return 'Accounts'
  return 'Creative'
}

function capMeta(pct: number) {
  if (pct > 100) return { label: 'Over capacity', color: '#EF4444' }
  if (pct > 80)  return { label: 'Near full',     color: '#F59E0B' }
  if (pct > 0)   return { label: 'Balanced',      color: '#10B981' }
  return              { label: 'No tasks',      color: 'var(--c-ghost)' }
}

function barColor(pct: number) {
  if (pct > 100) return '#EF4444'
  if (pct > 80)  return '#F59E0B'
  return '#10B981'
}

function roleColor(role: string) {
  if (role === 'owner')   return { c:'#FF5C1F', bg:'#FFF1EA' }
  if (role === 'manager') return { c:'#7C3AED', bg:'#F3EEFE' }
  if (role === 'sales')   return { c:'#0369A1', bg:'#E0F2FE' }
  return                         { c:'#5A5E54', bg:'var(--c-fill)' }
}

function formatMs(ms: number) {
  if (ms <= 0) return '0m'
  const h = ms / 3600000
  return h >= 1 ? `${h.toFixed(1)}h` : `${Math.round(ms / 60000)}m`
}

const inputStyle: React.CSSProperties = {
  width: '100%', border: '1.5px solid var(--c-border)', borderRadius: 10,
  padding: '10px 12px', fontSize: 14, outline: 'none', transition: 'border-color .15s',
}

export default function TeamScreen() {
  const { state, dispatch } = useApp()
  const toast = useToast()
  const [filter, setFilter] = useState('All')
  const [addOpen, setAddOpen] = useState(false)
  const [editUser, setEditUser] = useState<Profile | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null)

  const [form, setForm] = useState({ name:'', email:'', title:'', role:'employee' as 'manager'|'sales'|'employee', color:'#0EA5A4', password:'' })
  const [editForm, setEditForm] = useState({ name:'', title:'', role:'employee', color:'', new_password:'', showPass: false })
  const [saving, setSaving] = useState(false)
  const [showAddPass, setShowAddPass] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const isOwner = state.currentUser?.role === 'owner'
  const today = new Date().toISOString().split('T')[0]

  const allDepts = Array.from(new Set(state.users.map(getDept)))
  const depts = ['All', ...allDepts]
  const deptCounts: Record<string,number> = { All: state.users.length }
  state.users.forEach(u => { const d = getDept(u); deptCounts[d] = (deptCounts[d] || 0) + 1 })

  const roleOrder: Record<string,number> = { owner:0, manager:1, sales:2, employee:3 }
  const sorted = [...state.users]
    .filter(u => filter === 'All' || getDept(u) === filter)
    .sort((a, b) => (roleOrder[a.role]||3) - (roleOrder[b.role]||3))

  function getCapacity(u: Profile) {
    const tasks  = state.tasks.filter(t => t.assignee_id === u.id && !t.done).length
    const items  = state.planItems.filter(i => i.assignee_id === u.id && i.status !== 'published').length
    const total  = tasks + items
    const pct    = Math.round((total / CAPACITY_MAX) * 100)
    return { total, pct }
  }

  function getAtt(u: Profile) {
    if (u.id === state.currentUser?.id) {
      if (!state.checkedIn) return { status: 'notchecked' as const, ms: 0 }
      const breakMs = state.totalBreakMs + (state.onBreak && state.breakStart ? Date.now() - state.breakStart.getTime() : 0)
      const ms = Math.max(0, Date.now() - (state.checkInTime?.getTime() ?? Date.now()) - breakMs)
      return { status: (state.onBreak ? 'break' : 'active') as 'break'|'active', ms }
    }
    const att = state.attendance.find(a => a.user_id === u.id && a.date === today)
    if (!att?.check_in) return { status: 'notchecked' as const, ms: 0 }
    if (att.check_out) {
      const ms = Math.max(0, new Date(att.check_out).getTime() - new Date(att.check_in).getTime() - att.break_minutes * 60000)
      return { status: 'out' as const, ms }
    }
    const ms = Math.max(0, Date.now() - new Date(att.check_in).getTime() - att.break_minutes * 60000)
    return { status: 'active' as const, ms }
  }

  async function createUser() {
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) { toast('Name, email and password required'); return }
    if (form.password.length < 6) { toast('Password must be at least 6 chars'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/admin/create-user', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form }),
      })
      const data = await res.json()
      if (!res.ok) { toast(`Error: ${data.error}`); setSaving(false); return }
      const initials = form.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
      dispatch({ type: 'UPSERT_USER', user: {
        id: data.user_id, name: form.name, email: form.email, initials,
        color: form.color, title: form.title, role: form.role,
        permissions: [], created_at: new Date().toISOString(),
      }})
      toast(`${form.name} added — they can sign in now`)
      setAddOpen(false)
      setForm({ name:'', email:'', title:'', role:'employee', color:'#0EA5A4', password:'' })
    } catch { toast('Failed to create user') }
    setSaving(false)
  }

  function openEdit(u: Profile) {
    setEditUser(u)
    setEditForm({ name: u.name, title: u.title || '', role: u.role, color: u.color, new_password: '', showPass: false })
  }

  async function saveEdit() {
    if (!editUser) return
    if (!editForm.name.trim()) { toast('Name is required'); return }
    if (editForm.new_password && editForm.new_password.length < 6) { toast('Password must be at least 6 chars'); return }
    setSaving(true)
    try {
      const body: Record<string, string> = {
        user_id: editUser.id,
        name: editForm.name.trim(),
        title: editForm.title,
        role: editForm.role,
        color: editForm.color,
      }
      if (editForm.new_password) body.new_password = editForm.new_password
      const res = await fetch('/api/admin/update-user', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { toast(`Error: ${data.error}`); setSaving(false); return }
      const initials = editForm.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
      dispatch({ type: 'UPSERT_USER', user: { ...editUser, name: editForm.name.trim(), initials, title: editForm.title, role: editForm.role as any, color: editForm.color } })
      toast(editForm.new_password ? 'Profile updated & password reset' : 'Profile updated')
      setEditUser(null)
    } catch { toast('Failed to save changes') }
    setSaving(false)
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch('/api/admin/delete-user', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: deleteTarget.id }),
      })
      const data = await res.json()
      if (!res.ok) { toast(`Error: ${data.error}`); setDeleting(false); return }
      dispatch({ type: 'DELETE_USER', id: deleteTarget.id })
      toast(`${deleteTarget.name} removed`)
      setDeleteTarget(null)
    } catch { toast('Failed to remove user') }
    setDeleting(false)
  }

  return (
    <div style={{ maxWidth: 1040, margin: '0 auto', animation: 'fadeIn .4s ease both' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 22 }}>
        <div>
          <div style={{ fontSize: 12.5, color: 'var(--c-faint)', fontWeight: 500, marginBottom: 5 }}>Org</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em' }}>The team</h1>
        </div>
        {isOwner && (
          <button onClick={() => setAddOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--c-ink)', color: '#fff', borderRadius: 12, padding: '11px 18px', fontWeight: 700, fontSize: 13.5, transition: 'transform .15s' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = ''}>
            <Plus size={14} />Add employee
          </button>
        )}
      </div>

      {/* Dept filter chips */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 26 }}>
        {depts.map(d => {
          const active = filter === d
          const count = deptCounts[d] || 0
          const deptDot: Record<string,string> = { Leadership:'#FF5C1F', Accounts:'#3B82F6', Strategy:'#8B5CF6', Creative:'#10B981', Marketing:'#F59E0B', Sales:'#0EA5A4' }
          return (
            <button key={d} onClick={() => setFilter(d)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 99, fontSize: 13, fontWeight: 600, border: `1.5px solid ${active ? 'var(--c-ink)' : 'var(--c-border)'}`, background: active ? 'var(--c-ink)' : '#fff', color: active ? '#fff' : 'var(--c-ink-2)', transition: 'all .15s', cursor: 'pointer' }}>
              {d !== 'All' && <span style={{ width: 7, height: 7, borderRadius: '50%', background: active ? '#fff' : (deptDot[d] || 'var(--c-ghost)'), flexShrink: 0 }} />}
              {d} <span style={{ fontSize: 11.5, fontWeight: 700, opacity: .7 }}>{count}</span>
            </button>
          )
        })}
      </div>

      {/* Team grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(316px,1fr))', gap: 16 }}>
        {sorted.map((u, idx) => {
          const { total, pct } = getCapacity(u)
          const cap = capMeta(pct)
          const att = getAtt(u)
          const rc = roleColor(u.role)
          const isMe = u.id === state.currentUser?.id
          const barW = Math.min(pct, 120)

          return (
            <div key={u.id}
              style={{ background: '#fff', border: `1.5px solid ${isMe ? 'var(--c-accent)' : 'var(--c-border)'}`, borderRadius: 20, padding: '20px', position: 'relative', transition: 'all .18s', animation: `fadeUp .35s ease ${idx * 0.04}s both` }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,0,0,.09)'; e.currentTarget.style.borderColor = isMe ? 'var(--c-accent)' : 'var(--c-rule)' }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = isMe ? 'var(--c-accent)' : 'var(--c-border)' }}>

              {/* Top row */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 18 }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{ width: 52, height: 52, borderRadius: 15, background: u.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>
                    {u.initials}
                  </div>
                  {att.status === 'active' && <div style={{ position: 'absolute', bottom: 1, right: 1, width: 11, height: 11, borderRadius: '50%', background: '#10B981', border: '2px solid #fff' }} />}
                  {att.status === 'break' && <div style={{ position: 'absolute', bottom: 1, right: 1, width: 11, height: 11, borderRadius: '50%', background: '#F59E0B', border: '2px solid #fff' }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name}</div>
                    {isMe && <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--c-accent)', background: 'rgba(255,92,31,.1)', borderRadius: 5, padding: '1px 6px', flexShrink: 0 }}>You</div>}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--c-faint)' }}>{u.title || u.email}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: rc.c, background: rc.bg, borderRadius: 7, padding: '4px 9px', textTransform: 'capitalize' }}>{u.role}</span>
                  {isOwner && (
                    <>
                      <button onClick={() => openEdit(u)}
                        title="Edit member"
                        style={{ width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--c-ghost)', transition: 'background .12s, color .12s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--c-fill)'; e.currentTarget.style.color = 'var(--c-muted)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--c-ghost)' }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      {!isMe && (
                        <button onClick={() => setDeleteTarget(u)}
                          title="Remove member"
                          style={{ width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--c-ghost)', transition: 'background .12s, color .12s' }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#FEF2F2'; e.currentTarget.style.color = '#EF4444' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--c-ghost)' }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Capacity bar */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
                  <span style={{ fontSize: 12.5, color: 'var(--c-faint)', fontWeight: 500 }}>Capacity · {total} task{total !== 1 ? 's' : ''}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: pct > 100 ? '#EF4444' : pct > 80 ? '#F59E0B' : 'var(--c-ink-2)' }}>{pct}%</span>
                </div>
                <div style={{ height: 6, background: 'var(--c-fill)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 99, background: barColor(pct), width: `${barW}%`, transition: 'width .4s ease' }} />
                </div>
              </div>

              <div style={{ fontSize: 13, fontWeight: 700, color: cap.color, marginBottom: 14 }}>{cap.label}</div>
              <div style={{ height: 1, background: 'var(--c-border-soft)', marginBottom: 14 }} />

              {/* Attendance row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  {att.status === 'active' && <><div style={{ width: 7, height: 7, borderRadius: '50%', background: '#10B981', flexShrink: 0 }} /><span style={{ fontSize: 13, fontWeight: 600, color: '#10B981' }}>Active now</span></>}
                  {att.status === 'break' && <><div style={{ width: 7, height: 7, borderRadius: '50%', background: '#F59E0B', flexShrink: 0 }} /><span style={{ fontSize: 13, fontWeight: 600, color: '#F59E0B' }}>On break</span></>}
                  {att.status === 'out' && <><div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--c-ghost)', flexShrink: 0 }} /><span style={{ fontSize: 13, color: 'var(--c-muted)' }}>Checked out</span></>}
                  {att.status === 'notchecked' && <><div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--c-border)', flexShrink: 0 }} /><span style={{ fontSize: 13, color: 'var(--c-ghost)' }}>Not checked in</span></>}
                </div>
                {att.ms > 0 && <span style={{ fontSize: 13, color: 'var(--c-faint)' }}>{formatMs(att.ms)} today</span>}
                {att.status === 'notchecked' && <span style={{ fontSize: 13, color: 'var(--c-ghost)' }}>—</span>}
              </div>

              {u.email && (
                <div style={{ marginTop: 10, fontSize: 12.5, color: 'var(--c-faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Add Member modal ─────────────────────────────────────────────────── */}
      {addOpen && (
        <div onClick={() => setAddOpen(false)} className="modal-overlay">
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 480, background: '#fff', borderRadius: 22, overflow: 'hidden', boxShadow: 'var(--shadow-modal)', animation: 'popIn .22s cubic-bezier(.2,.9,.3,1) both' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--c-border-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17 }}>Add Team Member</div>
                <div style={{ fontSize: 12.5, color: 'var(--c-subtle)', marginTop: 2 }}>Creates a real login — they can sign in immediately</div>
              </div>
              <button onClick={() => setAddOpen(false)} style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--c-fill)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <X size={14} color="var(--c-ghost)" />
              </button>
            </div>
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 5 }}>Full Name *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Aanya Mehra" style={inputStyle}
                    onFocus={e => e.target.style.borderColor='var(--c-ink)'} onBlur={e => e.target.style.borderColor='var(--c-border)'} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 5 }}>Job Title</label>
                  <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Designer" style={inputStyle}
                    onFocus={e => e.target.style.borderColor='var(--c-ink)'} onBlur={e => e.target.style.borderColor='var(--c-border)'} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 5 }}>Work Email *</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="aanya@agency.com" style={inputStyle}
                  onFocus={e => e.target.style.borderColor='var(--c-ink)'} onBlur={e => e.target.style.borderColor='var(--c-border)'} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 5 }}>Temporary Password *</label>
                <div style={{ position: 'relative' }}>
                  <input type={showAddPass ? 'text' : 'password'} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Min 6 characters"
                    style={{ ...inputStyle, paddingRight: 46 }}
                    onFocus={e => e.target.style.borderColor='var(--c-ink)'} onBlur={e => e.target.style.borderColor='var(--c-border)'} />
                  <button onClick={() => setShowAddPass(!showAddPass)} type="button"
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--c-ghost)', background: 'none', fontSize: 12, fontWeight: 600 }}>
                    {showAddPass ? 'hide' : 'show'}
                  </button>
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--c-faint)', marginTop: 4 }}>Share this with them — they can change it after logging in</div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 8 }}>Access Role</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {ROLE_OPTS.map(r => (
                    <button key={r.key} onClick={() => setForm(f => ({ ...f, role: r.key }))}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 11, border: `1.5px solid ${form.role === r.key ? 'var(--c-accent)' : 'var(--c-border)'}`, background: form.role === r.key ? 'rgba(255,92,31,.05)' : '#fff', textAlign: 'left', cursor: 'pointer', transition: 'border-color .12s' }}>
                      <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${form.role === r.key ? 'var(--c-accent)' : 'var(--c-rule)'}`, background: form.role === r.key ? 'var(--c-accent)' : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {form.role === r.key && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />}
                      </div>
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: form.role === r.key ? 'var(--c-accent)' : 'var(--c-ink)' }}>{r.label}</div>
                        <div style={{ fontSize: 12, color: 'var(--c-subtle)' }}>{r.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 7 }}>Avatar Color</label>
                <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                  {COLORS.map(c => (
                    <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                      style={{ width: 28, height: 28, borderRadius: 8, background: c, border: `2.5px solid ${form.color === c ? 'var(--c-ink)' : 'transparent'}`, transition: 'border-color .12s' }} />
                  ))}
                </div>
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--c-border-soft)', display: 'flex', gap: 10 }}>
              <button onClick={() => setAddOpen(false)} style={{ flex: 1, padding: '11px', borderRadius: 11, border: '1.5px solid var(--c-border)', fontSize: 14, fontWeight: 600, color: 'var(--c-subtle)', cursor: 'pointer' }}>Cancel</button>
              <button onClick={createUser} disabled={saving}
                style={{ flex: 2, padding: '11px', borderRadius: 11, background: 'var(--c-ink)', color: '#fff', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: saving ? .7 : 1, cursor: 'pointer' }}>
                {saving ? 'Creating…' : 'Create & send access'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Member modal ────────────────────────────────────────────────── */}
      {editUser && (
        <div onClick={() => setEditUser(null)} className="modal-overlay">
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 460, background: '#fff', borderRadius: 22, overflow: 'hidden', boxShadow: 'var(--shadow-modal)', animation: 'popIn .22s cubic-bezier(.2,.9,.3,1) both' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--c-border-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: editForm.color || editUser.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14 }}>{editUser.initials}</div>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>Edit Member</div>
                  <div style={{ fontSize: 12.5, color: 'var(--c-faint)' }}>{editUser.email}</div>
                </div>
              </div>
              <button onClick={() => setEditUser(null)} style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--c-fill)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <X size={14} color="var(--c-ghost)" />
              </button>
            </div>

            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16, maxHeight: '65vh', overflowY: 'auto' }}>
              {/* Name + Title */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 5 }}>Full Name *</label>
                  <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} style={inputStyle}
                    onFocus={e => e.target.style.borderColor='var(--c-ink)'} onBlur={e => e.target.style.borderColor='var(--c-border)'} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 5 }}>Job Title</label>
                  <input value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Designer" style={inputStyle}
                    onFocus={e => e.target.style.borderColor='var(--c-ink)'} onBlur={e => e.target.style.borderColor='var(--c-border)'} />
                </div>
              </div>

              {/* Email (read-only) */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 5 }}>Email (cannot change)</label>
                <input readOnly value={editUser.email} style={{ ...inputStyle, background: 'var(--c-fill)', color: 'var(--c-faint)', cursor: 'default' }} />
              </div>

              {/* Role */}
              {editUser.role !== 'owner' && (
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 8 }}>Role</label>
                  <div style={{ display: 'flex', gap: 7 }}>
                    {ROLE_OPTS.map(r => (
                      <button key={r.key} onClick={() => setEditForm(f => ({ ...f, role: r.key }))}
                        style={{ flex: 1, padding: '9px 0', borderRadius: 10, fontSize: 13, fontWeight: 700, border: `1.5px solid ${editForm.role === r.key ? 'var(--c-accent)' : 'var(--c-border)'}`, color: editForm.role === r.key ? 'var(--c-accent)' : 'var(--c-muted)', background: editForm.role === r.key ? 'rgba(255,92,31,.06)' : '#fff', cursor: 'pointer', transition: 'all .12s' }}>
                        {r.label}
                      </button>
                    ))}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--c-faint)', marginTop: 5 }}>
                    {ROLE_OPTS.find(r => r.key === editForm.role)?.desc}
                  </div>
                </div>
              )}

              {/* Avatar color */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 7 }}>Avatar Color</label>
                <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                  {COLORS.map(c => (
                    <button key={c} onClick={() => setEditForm(f => ({ ...f, color: c }))}
                      style={{ width: 30, height: 30, borderRadius: 9, background: c, border: `2.5px solid ${editForm.color === c ? 'var(--c-ink)' : 'transparent'}`, transition: 'border-color .12s' }} />
                  ))}
                </div>
              </div>

              {/* Reset password */}
              <div style={{ paddingTop: 4, borderTop: '1px solid var(--c-border-soft)' }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 5 }}>
                  Reset Password
                  <span style={{ fontWeight: 400, marginLeft: 6 }}>(leave blank to keep current)</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input type={editForm.showPass ? 'text' : 'password'} value={editForm.new_password}
                    onChange={e => setEditForm(f => ({ ...f, new_password: e.target.value }))}
                    placeholder="New password (min 6 chars)"
                    style={{ ...inputStyle, paddingRight: 46 }}
                    onFocus={e => e.target.style.borderColor='var(--c-ink)'} onBlur={e => e.target.style.borderColor='var(--c-border)'} />
                  <button onClick={() => setEditForm(f => ({ ...f, showPass: !f.showPass }))} type="button"
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--c-ghost)', background: 'none', fontSize: 12, fontWeight: 600 }}>
                    {editForm.showPass ? 'hide' : 'show'}
                  </button>
                </div>
              </div>

              {/* Danger zone — delete */}
              {editUser.id !== state.currentUser?.id && (
                <div style={{ padding: '14px', borderRadius: 12, border: '1.5px solid #FEE2E2', background: '#FFF9F9' }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: '#EF4444', marginBottom: 6 }}>Danger zone</div>
                  <div style={{ fontSize: 12.5, color: '#9CA3AF', marginBottom: 10 }}>
                    Permanently removes this user and revokes all access. This cannot be undone.
                  </div>
                  <button
                    onClick={() => { setEditUser(null); setDeleteTarget(editUser) }}
                    style={{ padding: '8px 14px', borderRadius: 9, background: '#FEE2E2', color: '#EF4444', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                    Remove {editUser.name.split(' ')[0]}
                  </button>
                </div>
              )}
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--c-border-soft)', display: 'flex', gap: 10 }}>
              <button onClick={() => setEditUser(null)} style={{ flex: 1, padding: '11px', borderRadius: 11, border: '1.5px solid var(--c-border)', fontSize: 14, fontWeight: 600, color: 'var(--c-subtle)', cursor: 'pointer' }}>Cancel</button>
              <button onClick={saveEdit} disabled={saving}
                style={{ flex: 2, padding: '11px', borderRadius: 11, background: 'var(--c-ink)', color: '#fff', fontSize: 14, fontWeight: 700, opacity: saving ? .7 : 1, cursor: 'pointer' }}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirmation modal ────────────────────────────────────────── */}
      {deleteTarget && (
        <div onClick={() => !deleting && setDeleteTarget(null)} className="modal-overlay">
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 380, background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--shadow-modal)', animation: 'popIn .2s cubic-bezier(.2,.9,.3,1) both', padding: '28px 24px' }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, marginBottom: 8 }}>
              Remove {deleteTarget.name}?
            </div>
            <div style={{ fontSize: 13.5, color: 'var(--c-subtle)', lineHeight: 1.55, marginBottom: 24 }}>
              This will permanently delete their account and revoke all access. Their tasks and content assignments will remain but become unassigned.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setDeleteTarget(null)} disabled={deleting}
                style={{ flex: 1, padding: '11px', borderRadius: 11, border: '1.5px solid var(--c-border)', fontSize: 14, fontWeight: 600, color: 'var(--c-subtle)', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={confirmDelete} disabled={deleting}
                style={{ flex: 1, padding: '11px', borderRadius: 11, background: '#EF4444', color: '#fff', fontSize: 14, fontWeight: 700, opacity: deleting ? .7 : 1, cursor: 'pointer' }}>
                {deleting ? 'Removing…' : 'Yes, remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
