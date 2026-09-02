'use client'
import { useState } from 'react'
import { useApp, useToast } from '@/lib/store'
import { Sparkle, Calendar, BarChart, Building, Users, TrendUp, Book, Settings, Zap, FileText, Globe, LogOut, X } from '@/components/ui/Icon'
import { ModalPortal } from '@/components/ui/ModalPortal'
import type { Screen } from '@/types'

const COLORS = ['#0EA5A4','#FB7185','#6366F1','#F4B740','#8B5CF6','#2563EB','#10B981','#EF4444','#FF5C1F']

const NAV = [
  {
    group: 'Work',
    items: [
      { id:'myday', label:'My Day', Icon: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg> },
      { id:'planner', label:'Day Planner', Icon: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16v15H4zM4 10h16M8 3v4M16 3v4"/></svg> },
      { id:'calendar', label:'Content Calendar', Icon: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg> },
      { id:'contentplan', label:'Content Planner', Icon: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M8 4h8v3H8zM5 7h14v14H5zM9 12h6M9 16h4"/></svg> },
      { id:'dmboard', label:'Digital Marketing', Icon: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18M18 9l-5 5-3-3-4 4"/></svg> },
      { id:'attendance', label:'Attendance', Icon: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/></svg> },
    ]
  },
  {
    group: 'Accounts',
    items: [
      { id:'clients', label:'Clients', Icon: Building },
      { id:'reports', label:'Reports', Icon: FileText },
    ]
  },
  {
    group: 'Sales',
    items: [
      { id:'pipeline', label:'Pipeline', Icon: TrendUp },
      { id:'leads', label:'Leads', Icon: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
    ]
  },
  {
    group: 'Org',
    items: [
      { id:'assistant', label:'Ask Mavixy', Icon: () => <Sparkle size={15} color="currentColor" /> },
      { id:'team', label:'Team', Icon: Users },
      { id:'onboarding', label:'Onboarding', Icon: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM19 8v6M22 11h-6"/></svg> },
      { id:'performance', label:'Performance', Icon: BarChart },
      { id:'permissions', label:'Users & Permissions', Icon: Settings },
      { id:'connections', label:'Connections', Icon: Globe },
      { id:'automations', label:'Automations', Icon: Zap },
      { id:'knowledge', label:'Knowledge', Icon: Book },
    ]
  },
]

export default function Sidebar({ onLogout }: { onLogout?: () => void }) {
  const { state, dispatch } = useApp()
  const toast = useToast()
  const role = state.currentUser?.role || 'employee'
  const [profileOpen, setProfileOpen] = useState(false)
  const [profileForm, setProfileForm] = useState({ name: '', color: '', new_password: '', confirm_password: '', showPass: false })
  const [saving, setSaving] = useState(false)

  function openProfile() {
    setProfileForm({ name: state.currentUser?.name || '', color: state.currentUser?.color || '#0EA5A4', new_password: '', confirm_password: '', showPass: false })
    setProfileOpen(true)
  }

  async function saveProfile() {
    if (profileForm.new_password && profileForm.new_password !== profileForm.confirm_password) {
      toast('Passwords do not match'); return
    }
    if (profileForm.new_password && profileForm.new_password.length < 6) {
      toast('Password must be at least 6 characters'); return
    }
    setSaving(true)
    try {
      const body: Record<string, string> = {}
      if (profileForm.name.trim() && profileForm.name.trim() !== state.currentUser?.name) body.name = profileForm.name.trim()
      if (profileForm.color !== state.currentUser?.color) body.color = profileForm.color
      if (profileForm.new_password) body.new_password = profileForm.new_password
      if (!Object.keys(body).length) { setProfileOpen(false); setSaving(false); return }
      const res = await fetch('/api/auth/change-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { toast(`Error: ${data.error}`); setSaving(false); return }
      if (body.name || body.color) {
        const initials = (body.name || state.currentUser?.name || '').split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
        dispatch({ type: 'UPSERT_USER', user: { ...state.currentUser!, name: body.name || state.currentUser!.name, initials, color: body.color || state.currentUser!.color } })
      }
      toast(profileForm.new_password ? 'Profile updated & password changed' : 'Profile updated')
      setProfileOpen(false)
    } catch { toast('Failed to save') }
    setSaving(false)
  }

  const ROLE_SCREENS: Record<string, string[]> = {
    owner:    ['myday','planner','calendar','contentplan','dmboard','clients','client-detail','reports','pipeline','leads','team','onboarding','assistant','performance','permissions','connections','automations','knowledge','attendance'],
    manager:  ['myday','planner','calendar','contentplan','dmboard','clients','client-detail','reports','pipeline','leads','team','onboarding','assistant','performance','knowledge','attendance'],
    sales:    ['myday','clients','client-detail','reports','pipeline','leads','attendance'],
    employee: ['myday','calendar','contentplan','knowledge','attendance'],
  }
  const dept = state.currentUser?.department
  const allowed = (id: string) => id === 'dmboard'
    ? (['owner', 'manager'].includes(role) || dept === 'Digital Marketing')
    : (ROLE_SCREENS[role] || ROLE_SCREENS.employee).includes(id)
  const nav = (screen: Screen) => dispatch({ type:'SET_SCREEN', screen })

  return (
    <div style={{ width:224, flexShrink:0, background:'#fff', borderRight:'1px solid var(--c-border)', display:'flex', flexDirection:'column', height:'100vh', position:'sticky', top:0 }}>
      {/* Logo */}
      <div style={{ padding:'18px 16px 14px', borderBottom:'1px solid var(--c-border-soft)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:9 }}>
          <div style={{ width:32, height:32, borderRadius:9, background:'#0F172A', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, position:'relative', overflow:'hidden' }}>
            <Sparkle size={15} color="#FF5C1F" style={{ animation:'sparkleSpin 8s linear infinite', position:'relative', zIndex:1 }} />
            <div style={{ position:'absolute', inset:0, background:'radial-gradient(circle at 50% 50%, rgba(255,92,31,0.15), transparent 70%)' }} />
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:17, letterSpacing:'-0.03em', color:'#0F172A' }}>mavixy</span>
            <span style={{ fontSize:10, fontWeight:700, color:'#fff', background:'#FF5C1F', borderRadius:5, padding:'2px 6px', letterSpacing:'.04em' }}>OS</span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex:1, overflowY:'auto', padding:'8px 8px' }}>
        {NAV.map(section => {
          const visible = section.items.filter(item => allowed(item.id))
          if (!visible.length) return null
          return (
            <div key={section.group} style={{ marginBottom:2 }}>
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:'.1em', color:'var(--c-ghost)', textTransform:'uppercase', padding:'10px 10px 4px' }}>{section.group}</div>
              {visible.map(item => {
                const active = state.screen === item.id
                return (
                  <button key={item.id} onClick={() => nav(item.id as Screen)}
                    style={{ display:'flex', alignItems:'center', gap:9, width:'100%', padding:'8px 10px', borderRadius:9, fontSize:13.5, fontWeight: active ? 600 : 500, color: active ? '#0F172A' : 'var(--c-muted)', background: active ? 'var(--c-fill)' : 'transparent', borderLeft: active ? '2.5px solid var(--c-accent)' : '2.5px solid transparent', transition:'all .15s', cursor:'pointer', marginBottom:1 }}
                    onMouseEnter={e => { if (!active) { e.currentTarget.style.background='var(--c-fill)'; e.currentTarget.style.color='#0F172A' } }}
                    onMouseLeave={e => { if (!active) { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='var(--c-muted)' } }}
                  >
                    <span style={{ color: active ? 'var(--c-accent)' : 'var(--c-faint)', display:'flex', flexShrink:0 }}><item.Icon /></span>
                    {item.label}
                  </button>
                )
              })}
            </div>
          )
        })}
      </nav>

      {/* User */}
      <div style={{ padding:'10px 10px', borderTop:'1px solid var(--c-border-soft)' }}>
        {state.currentUser && (
          <div style={{ display:'flex', alignItems:'center', gap:9, padding:'6px 4px' }}>
            <button onClick={openProfile} title="My profile" style={{ width:32, height:32, borderRadius:9, background: state.currentUser.color || '#0EA5A4', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-display)', fontWeight:700, fontSize:11, flexShrink:0, cursor:'pointer', border:'none' }}>
              {state.currentUser.initials}
            </button>
            <button onClick={openProfile} style={{ flex:1, minWidth:0, textAlign:'left', background:'none', border:'none', cursor:'pointer', padding:0 }}>
              <div style={{ fontSize:13, fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', color:'#0F172A' }}>{state.currentUser.name}</div>
              <div style={{ fontSize:11, color:'var(--c-faint)', textTransform:'capitalize' }}>{state.currentUser.role}</div>
            </button>
            <button onClick={onLogout || (() => dispatch({ type:'LOGOUT' }))} title="Sign out"
              style={{ width:28, height:28, borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--c-ghost)', flexShrink:0 }}
              onMouseEnter={e => { e.currentTarget.style.background='var(--c-fill)'; e.currentTarget.style.color='var(--c-muted)' }}
              onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='var(--c-ghost)' }}
            >
              <LogOut size={13} />
            </button>
          </div>
        )}
      </div>

      {/* Profile modal */}
      {profileOpen && state.currentUser && (
        <ModalPortal>
          <div onClick={() => setProfileOpen(false)} className="modal-overlay">
            <div onClick={e => e.stopPropagation()} style={{ width:'100%', maxWidth:420, background:'#fff', borderRadius:20, overflow:'hidden', boxShadow:'var(--shadow-modal)', animation:'popIn .22s cubic-bezier(.2,.9,.3,1) both' }}>
              <div style={{ padding:'20px 22px', borderBottom:'1px solid var(--c-border-soft)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div style={{ display:'flex', alignItems:'center', gap:11 }}>
                  <div style={{ width:40, height:40, borderRadius:12, background:profileForm.color, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-display)', fontWeight:700, fontSize:14 }}>
                    {state.currentUser.initials}
                  </div>
                  <div>
                    <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:16 }}>My Profile</div>
                    <div style={{ fontSize:12, color:'var(--c-faint)' }}>{state.currentUser.email}</div>
                  </div>
                </div>
                <button onClick={() => setProfileOpen(false)} style={{ width:30, height:30, borderRadius:8, background:'var(--c-fill)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
                  <X size={13} color="var(--c-ghost)" />
                </button>
              </div>

              <div style={{ padding:'18px 22px', display:'flex', flexDirection:'column', gap:14 }}>
                <div>
                  <label style={{ fontSize:12, fontWeight:600, color:'var(--c-muted)', display:'block', marginBottom:5 }}>Display Name</label>
                  <input value={profileForm.name} onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))}
                    style={{ width:'100%', border:'1.5px solid var(--c-border)', borderRadius:10, padding:'10px 12px', fontSize:14 }}
                    onFocus={e => e.target.style.borderColor='var(--c-ink)'} onBlur={e => e.target.style.borderColor='var(--c-border)'} />
                </div>

                <div>
                  <label style={{ fontSize:12, fontWeight:600, color:'var(--c-muted)', display:'block', marginBottom:7 }}>Avatar Color</label>
                  <div style={{ display:'flex', gap:7, flexWrap:'wrap' }}>
                    {COLORS.map(c => (
                      <button key={c} onClick={() => setProfileForm(f => ({ ...f, color: c }))}
                        style={{ width:28, height:28, borderRadius:8, background:c, border:`2.5px solid ${profileForm.color === c ? 'var(--c-ink)' : 'transparent'}`, transition:'border-color .12s', cursor:'pointer' }} />
                    ))}
                  </div>
                </div>

                <div style={{ paddingTop:4, borderTop:'1px solid var(--c-border-soft)' }}>
                  <label style={{ fontSize:12, fontWeight:600, color:'var(--c-muted)', display:'block', marginBottom:5 }}>
                    New Password <span style={{ fontWeight:400 }}>(leave blank to keep current)</span>
                  </label>
                  <div style={{ position:'relative' }}>
                    <input type={profileForm.showPass ? 'text' : 'password'} value={profileForm.new_password}
                      onChange={e => setProfileForm(f => ({ ...f, new_password: e.target.value }))}
                      placeholder="Min 6 characters"
                      style={{ width:'100%', border:'1.5px solid var(--c-border)', borderRadius:10, padding:'10px 46px 10px 12px', fontSize:14 }}
                      onFocus={e => e.target.style.borderColor='var(--c-ink)'} onBlur={e => e.target.style.borderColor='var(--c-border)'} />
                    <button onClick={() => setProfileForm(f => ({ ...f, showPass: !f.showPass }))} type="button"
                      style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', color:'var(--c-ghost)', background:'none', fontSize:12, fontWeight:600 }}>
                      {profileForm.showPass ? 'hide' : 'show'}
                    </button>
                  </div>
                </div>

                {profileForm.new_password && (
                  <div>
                    <label style={{ fontSize:12, fontWeight:600, color:'var(--c-muted)', display:'block', marginBottom:5 }}>Confirm Password</label>
                    <input type="password" value={profileForm.confirm_password}
                      onChange={e => setProfileForm(f => ({ ...f, confirm_password: e.target.value }))}
                      placeholder="Re-enter new password"
                      style={{ width:'100%', border:`1.5px solid ${profileForm.confirm_password && profileForm.confirm_password !== profileForm.new_password ? '#EF4444' : 'var(--c-border)'}`, borderRadius:10, padding:'10px 12px', fontSize:14 }}
                      onFocus={e => e.target.style.borderColor='var(--c-ink)'} onBlur={e => e.target.style.borderColor = profileForm.confirm_password && profileForm.confirm_password !== profileForm.new_password ? '#EF4444' : 'var(--c-border)'} />
                    {profileForm.confirm_password && profileForm.confirm_password !== profileForm.new_password && (
                      <div style={{ fontSize:12, color:'#EF4444', marginTop:4 }}>Passwords don't match</div>
                    )}
                  </div>
                )}
              </div>

              <div style={{ padding:'14px 22px', borderTop:'1px solid var(--c-border-soft)', display:'flex', gap:10 }}>
                <button onClick={() => setProfileOpen(false)} style={{ flex:1, padding:'10px', borderRadius:10, border:'1.5px solid var(--c-border)', fontSize:14, fontWeight:600, color:'var(--c-subtle)', cursor:'pointer' }}>Cancel</button>
                <button onClick={saveProfile} disabled={saving}
                  style={{ flex:2, padding:'10px', borderRadius:10, background:'var(--c-ink)', color:'#fff', fontSize:14, fontWeight:700, opacity:saving ? .7 : 1, cursor:'pointer' }}>
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  )
}
