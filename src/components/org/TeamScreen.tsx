'use client'
import { useState } from 'react'
import { useApp, useToast } from '@/lib/store'
import { Plus, X } from '@/components/ui/Icon'

const ROLES = [
  { key: 'manager', label: 'Manager', desc: 'Full access except owner settings' },
  { key: 'sales', label: 'Sales', desc: 'Pipeline, leads, clients only' },
  { key: 'employee', label: 'Employee', desc: 'Work tools: tasks, content, calendar' },
] as const

const COLORS = ['#0EA5A4','#FB7185','#6366F1','#F4B740','#8B5CF6','#2563EB','#10B981','#EF4444','#FF5C1F']

export default function TeamScreen() {
  const { state, dispatch } = useApp()
  const toast = useToast()
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState({ name:'', email:'', title:'', role:'employee' as 'manager'|'sales'|'employee', color:'#0EA5A4', password:'' })
  const [saving, setSaving] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const isOwner = state.currentUser?.role === 'owner'

  async function createUser() {
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      toast('Name, email and password are required'); return
    }
    if (form.password.length < 6) { toast('Password must be at least 6 characters'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form }),
      })
      const data = await res.json()
      if (!res.ok) { toast(`Error: ${data.error}`); setSaving(false); return }

      // Add to local state immediately (profile will sync from Supabase)
      const initials = form.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
      dispatch({
        type: 'UPSERT_USER', user: {
          id: data.user_id, name: form.name, email: form.email, initials,
          color: form.color, title: form.title, role: form.role,
          permissions: [], created_at: new Date().toISOString(),
        }
      })
      toast(`${form.name} added — they can sign in now`)
      setAddOpen(false)
      setForm({ name:'', email:'', title:'', role:'employee', color:'#0EA5A4', password:'' })
    } catch { toast('Failed to create user') }
    setSaving(false)
  }

  function removeUser(id: string) {
    if (id === state.currentUser?.id) { toast('Cannot remove yourself'); return }
    dispatch({ type: 'DELETE_USER', id })
    toast('Removed from local view — delete in Supabase dashboard to fully revoke access')
  }

  const roleOrder: Record<string,number> = { owner:0, manager:1, sales:2, employee:3 }
  const sorted = [...state.users].sort((a, b) => (roleOrder[a.role]||3) - (roleOrder[b.role]||3))

  const roleColor = (role: string) => {
    if (role === 'owner') return { c:'#FF5C1F', bg:'#FFF1EA' }
    if (role === 'manager') return { c:'#7C3AED', bg:'#F3EEFE' }
    if (role === 'sales') return { c:'#0369A1', bg:'#E0F2FE' }
    return { c:'#5A5E54', bg:'var(--c-fill)' }
  }

  const screenAccess: Record<string,string[]> = {
    owner:    ['All screens + admin'],
    manager:  ['Work, Accounts, Sales, Team, Performance, Knowledge'],
    sales:    ['My Day, Pipeline, Leads, Clients'],
    employee: ['My Day, Calendar, Content Planner, Day Planner, Knowledge'],
  }

  return (
    <div style={{ maxWidth:900, margin:'0 auto', animation:'fadeIn .4s ease both' }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:28 }}>
        <div>
          <h1 style={{ fontFamily:'var(--font-display)', fontSize:28, fontWeight:700, letterSpacing:'-0.02em', marginBottom:4 }}>Team</h1>
          <p style={{ fontSize:14, color:'var(--c-subtle)' }}>{state.users.length} members · accounts are managed by the Owner</p>
        </div>
        {isOwner && (
          <button onClick={() => setAddOpen(true)}
            style={{ display:'flex', alignItems:'center', gap:7, background:'var(--c-ink)', color:'#fff', borderRadius:10, padding:'10px 17px', fontWeight:700, fontSize:13.5, transition:'transform .15s' }}
            onMouseEnter={e=>(e.currentTarget as HTMLElement).style.transform='translateY(-2px)'}
            onMouseLeave={e=>(e.currentTarget as HTMLElement).style.transform=''}>
            <Plus size={13} />Add Member
          </button>
        )}
      </div>

      {/* RBAC overview */}
      <div style={{ background:'#fff', border:'1px solid var(--c-border)', borderRadius:16, padding:'18px 22px', marginBottom:24 }}>
        <div style={{ fontSize:12, fontWeight:700, color:'var(--c-ghost)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:14 }}>Role Access Levels</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
          {(['owner','manager','sales','employee'] as const).map(r => {
            const rc = roleColor(r)
            return (
              <div key={r} style={{ background:rc.bg, borderRadius:12, padding:'14px' }}>
                <div style={{ fontSize:12.5, fontWeight:700, color:rc.c, textTransform:'capitalize', marginBottom:6 }}>{r}</div>
                <div style={{ fontSize:12, color:'var(--c-ink-3)', lineHeight:1.5 }}>{screenAccess[r]}</div>
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:14 }}>
        {sorted.map(u => {
          const isMe = u.id === state.currentUser?.id
          const rc = roleColor(u.role)
          const active = state.planItems.filter(i => i.assignee_id === u.id && i.status !== 'published').length
          return (
            <div key={u.id} style={{ background:'#fff', border:`1.5px solid ${isMe ? 'var(--c-accent)' : 'var(--c-border)'}`, borderRadius:16, padding:'18px', position:'relative', transition:'box-shadow .15s' }}
              onMouseEnter={e=>e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,.08)'}
              onMouseLeave={e=>e.currentTarget.style.boxShadow='none'}>
              {isMe && <div style={{ position:'absolute', top:12, right:12, fontSize:10, fontWeight:700, color:'var(--c-accent)', background:'rgba(255,92,31,.08)', borderRadius:6, padding:'2px 7px' }}>You</div>}
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
                <div style={{ width:46, height:46, borderRadius:13, background:u.color, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-display)', fontWeight:700, fontSize:14, flexShrink:0 }}>{u.initials}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:15, fontWeight:700, marginBottom:1 }}>{u.name}</div>
                  <div style={{ fontSize:12.5, color:'var(--c-faint)' }}>{u.title || u.email}</div>
                </div>
              </div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <span style={{ fontSize:11, fontWeight:700, color:rc.c, background:rc.bg, borderRadius:7, padding:'4px 9px', textTransform:'capitalize' }}>{u.role}</span>
                <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                  <span style={{ fontSize:12, color:'var(--c-faint)' }}>{active} active</span>
                  {isOwner && !isMe && (
                    <button onClick={() => removeUser(u.id)}
                      style={{ width:28, height:28, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:7, color:'var(--c-ghost)', transition:'background .1s, color .1s' }}
                      onMouseEnter={e=>{e.currentTarget.style.background='var(--c-red-bg)';e.currentTarget.style.color='var(--c-red)'}}
                      onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.color='var(--c-ghost)'}}>
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Add member modal — owner only */}
      {addOpen && (
        <div onClick={() => setAddOpen(false)} className="modal-overlay">
          <div onClick={e=>e.stopPropagation()} style={{ width:'100%', maxWidth:480, background:'#fff', borderRadius:22, overflow:'hidden', boxShadow:'var(--shadow-modal)', animation:'popIn .22s cubic-bezier(.2,.9,.3,1) both' }}>
            <div style={{ padding:'20px 24px', borderBottom:'1px solid var(--c-border-soft)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div>
                <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:17 }}>Add Team Member</div>
                <div style={{ fontSize:12.5, color:'var(--c-subtle)', marginTop:2 }}>Creates a real login — they can sign in immediately</div>
              </div>
              <button onClick={() => setAddOpen(false)} style={{ width:32, height:32, borderRadius:9, background:'var(--c-fill)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
                <X size={14} color="var(--c-ghost)" />
              </button>
            </div>

            <div style={{ padding:'20px 24px', display:'flex', flexDirection:'column', gap:14 }}>
              {/* Name + Email */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div>
                  <label style={{ fontSize:12, fontWeight:600, color:'var(--c-muted)', display:'block', marginBottom:5 }}>Full Name *</label>
                  <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Aanya Mehra"
                    style={{ width:'100%', border:'1.5px solid var(--c-border)', borderRadius:10, padding:'10px 12px', fontSize:14 }} />
                </div>
                <div>
                  <label style={{ fontSize:12, fontWeight:600, color:'var(--c-muted)', display:'block', marginBottom:5 }}>Job Title</label>
                  <input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="Designer"
                    style={{ width:'100%', border:'1.5px solid var(--c-border)', borderRadius:10, padding:'10px 12px', fontSize:14 }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize:12, fontWeight:600, color:'var(--c-muted)', display:'block', marginBottom:5 }}>Work Email *</label>
                <input type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="aanya@agency.com"
                  style={{ width:'100%', border:'1.5px solid var(--c-border)', borderRadius:10, padding:'10px 12px', fontSize:14 }} />
              </div>

              <div>
                <label style={{ fontSize:12, fontWeight:600, color:'var(--c-muted)', display:'block', marginBottom:5 }}>Temporary Password *</label>
                <div style={{ position:'relative' }}>
                  <input type={showPass?'text':'password'} value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} placeholder="Min 6 characters"
                    style={{ width:'100%', border:'1.5px solid var(--c-border)', borderRadius:10, padding:'10px 40px 10px 12px', fontSize:14 }} />
                  <button onClick={()=>setShowPass(!showPass)} type="button"
                    style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', color:'var(--c-ghost)', background:'none', fontSize:12, fontWeight:600 }}>
                    {showPass?'hide':'show'}
                  </button>
                </div>
                <div style={{ fontSize:11.5, color:'var(--c-faint)', marginTop:4 }}>Share this with them — they should change it after first login</div>
              </div>

              {/* Role */}
              <div>
                <label style={{ fontSize:12, fontWeight:600, color:'var(--c-muted)', display:'block', marginBottom:8 }}>Access Role</label>
                <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                  {ROLES.map(r => (
                    <button key={r.key} onClick={() => setForm(f=>({...f,role:r.key}))}
                      style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 14px', borderRadius:11, border:`1.5px solid ${form.role===r.key?'var(--c-accent)':'var(--c-border)'}`, background:form.role===r.key?'rgba(255,92,31,.05)':'#fff', textAlign:'left', cursor:'pointer', transition:'border-color .12s' }}>
                      <div style={{ width:16, height:16, borderRadius:'50%', border:`2px solid ${form.role===r.key?'var(--c-accent)':'var(--c-rule)'}`, background:form.role===r.key?'var(--c-accent)':'transparent', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                        {form.role===r.key && <div style={{ width:6, height:6, borderRadius:'50%', background:'#fff' }} />}
                      </div>
                      <div>
                        <div style={{ fontSize:13.5, fontWeight:700, color: form.role===r.key?'var(--c-accent)':'var(--c-ink)', textTransform:'capitalize' }}>{r.label}</div>
                        <div style={{ fontSize:12, color:'var(--c-subtle)' }}>{r.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Color */}
              <div>
                <label style={{ fontSize:12, fontWeight:600, color:'var(--c-muted)', display:'block', marginBottom:7 }}>Avatar Color</label>
                <div style={{ display:'flex', gap:7, flexWrap:'wrap' }}>
                  {COLORS.map(c => (
                    <button key={c} onClick={()=>setForm(f=>({...f,color:c}))}
                      style={{ width:28, height:28, borderRadius:8, background:c, border:`2.5px solid ${form.color===c?'var(--c-ink)':'transparent'}`, transition:'border-color .12s' }} />
                  ))}
                </div>
              </div>
            </div>

            <div style={{ padding:'16px 24px', borderTop:'1px solid var(--c-border-soft)', display:'flex', gap:10 }}>
              <button onClick={()=>setAddOpen(false)} style={{ flex:1, padding:'11px', borderRadius:11, border:'1.5px solid var(--c-border)', fontSize:14, fontWeight:600, color:'var(--c-subtle)', cursor:'pointer' }}>Cancel</button>
              <button onClick={createUser} disabled={saving}
                style={{ flex:2, padding:'11px', borderRadius:11, background:'var(--c-ink)', color:'#fff', fontSize:14, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', gap:8, opacity:saving?.7:1, transition:'opacity .15s', cursor:'pointer' }}>
                {saving ? 'Creating…' : 'Create & Send access'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
