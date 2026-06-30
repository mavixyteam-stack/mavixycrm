'use client'
import { useState } from 'react'
import { useApp, useToast } from '@/lib/store'
import { Plus, X, Check } from '@/components/ui/Icon'

const ROLES = ['employee', 'manager', 'sales', 'owner'] as const

export default function TeamScreen() {
  const { state, dispatch } = useApp()
  const toast = useToast()
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', title: '', role: 'employee' as typeof ROLES[number], color: '#0EA5A4' })

  const COLORS = ['#0EA5A4', '#FB7185', '#6366F1', '#F4B740', '#8B5CF6', '#2563EB', '#10B981', '#EF4444', '#FF5C1F']

  function saveUser() {
    if (!form.name.trim()) return
    const initials = form.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    const user = {
      id: `user-${Date.now()}`,
      name: form.name,
      email: form.email,
      initials,
      color: form.color,
      title: form.title,
      role: form.role,
      permissions: [] as string[],
      created_at: new Date().toISOString(),
    }
    dispatch({ type: 'UPSERT_USER', user })
    toast(`${form.name} added to team`)
    setAddOpen(false)
    setForm({ name: '', email: '', title: '', role: 'employee', color: '#0EA5A4' })
  }

  function removeUser(id: string) {
    if (id === state.currentUser?.id) { toast('Cannot remove yourself'); return }
    dispatch({ type: 'DELETE_USER', id })
    toast('Team member removed')
  }

  const roleOrder = { owner: 0, manager: 1, sales: 2, employee: 3 }
  const sorted = [...state.users].sort((a, b) => (roleOrder[a.role as keyof typeof roleOrder] || 3) - (roleOrder[b.role as keyof typeof roleOrder] || 3))

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 4 }}>Team</h1>
          <p style={{ fontSize: 14, color: 'var(--c-subtle)' }}>{state.users.length} members across {new Set(state.users.map(u => u.role)).size} roles</p>
        </div>
        <button onClick={() => setAddOpen(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'var(--c-ink)', color: '#fff', borderRadius: 10, padding: '9px 16px', fontWeight: 600, fontSize: 13 }}>
          <Plus size={13} />Add Member
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14 }}>
        {sorted.map(u => {
          const assignedItems = state.planItems.filter(i => i.assignee_id === u.id && i.status !== 'published')
          const isMe = u.id === state.currentUser?.id
          return (
            <div key={u.id} style={{ background: 'var(--c-surface)', border: `1.5px solid ${isMe ? 'var(--c-accent)' : 'var(--c-border)'}`, borderRadius: 16, padding: '18px', position: 'relative', transition: 'box-shadow .15s' }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,.08)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
              {isMe && <div style={{ position: 'absolute', top: 12, right: 12, fontSize: 10.5, fontWeight: 700, color: 'var(--c-accent)', background: 'rgba(255,92,31,.08)', borderRadius: 6, padding: '2px 7px' }}>You</div>}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{ width: 46, height: 46, borderRadius: 13, background: u.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                  {u.initials}
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{u.name}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--c-faint)' }}>{u.title}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--c-muted)', background: 'var(--c-fill)', borderRadius: 7, padding: '4px 9px', textTransform: 'capitalize' }}>{u.role}</span>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--c-faint)' }}>{assignedItems.length} active</span>
                  {!isMe && (
                    <button onClick={() => removeUser(u.id)}
                      style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 7, color: 'var(--c-ghost)' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--c-red-bg)'; e.currentTarget.style.color = 'var(--c-red)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--c-ghost)' }}>
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {addOpen && (
        <div onClick={() => setAddOpen(false)} className="modal-overlay">
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 440, background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--shadow-modal)', animation: 'popIn .22s cubic-bezier(.2,.9,.3,1) both' }}>
            <div style={{ padding: '20px 22px', borderBottom: '1px solid var(--c-border-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>Add Team Member</div>
              <button onClick={() => setAddOpen(false)}><X size={15} color="var(--c-ghost)" /></button>
            </div>
            <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 13 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 5 }}>Full Name *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Aanya Mehra"
                  style={{ width: '100%', border: '1.5px solid var(--c-border)', borderRadius: 10, padding: '10px 12px', fontSize: 14 }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 5 }}>Work Email</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="e.g. aanya@agency.com"
                  style={{ width: '100%', border: '1.5px solid var(--c-border)', borderRadius: 10, padding: '10px 12px', fontSize: 14 }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 5 }}>Title / Role Description</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Designer"
                  style={{ width: '100%', border: '1.5px solid var(--c-border)', borderRadius: 10, padding: '10px 12px', fontSize: 14 }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 5 }}>Access Role</label>
                <div style={{ display: 'flex', gap: 5 }}>
                  {ROLES.map(r => (
                    <button key={r} onClick={() => setForm(f => ({ ...f, role: r }))}
                      style={{ flex: 1, padding: '7px 0', borderRadius: 8, fontSize: 12, fontWeight: 600, border: '1.5px solid', borderColor: form.role === r ? 'var(--c-accent)' : 'var(--c-border)', color: form.role === r ? 'var(--c-accent)' : 'var(--c-muted)', background: form.role === r ? 'rgba(255,92,31,.06)' : '#fff', textTransform: 'capitalize' }}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 5 }}>Avatar Color</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {COLORS.map(c => (
                    <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                      style={{ width: 28, height: 28, borderRadius: 8, background: c, border: `2.5px solid ${form.color === c ? 'var(--c-ink)' : 'transparent'}`, transition: 'border-color .15s' }} />
                  ))}
                </div>
              </div>
            </div>
            <div style={{ padding: '14px 22px', borderTop: '1px solid var(--c-border-soft)', display: 'flex', gap: 10 }}>
              <button onClick={() => setAddOpen(false)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1.5px solid var(--c-border)', fontSize: 14, fontWeight: 600, color: 'var(--c-subtle)' }}>Cancel</button>
              <button onClick={saveUser} style={{ flex: 2, padding: '10px', borderRadius: 10, background: 'var(--c-ink)', color: '#fff', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                <Check size={14} color="#fff" />Add Member
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
