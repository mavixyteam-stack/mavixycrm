'use client'
import { useApp } from '@/lib/store'
import { Sparkle, Calendar, BarChart, Building, Users, TrendUp, Book, Settings, Zap, Inbox, FileText, Globe, LogOut } from '@/components/ui/Icon'
import type { Screen } from '@/types'

const NAV = [
  {
    group: 'Work',
    items: [
      { id:'myday', label:'My Day', Icon: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg> },
      { id:'planner', label:'Day Planner', Icon: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16v15H4zM4 10h16M8 3v4M16 3v4"/></svg> },
      { id:'calendar', label:'Content Calendar', Icon: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg> },
      { id:'contentplan', label:'Content Planner', Icon: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M8 4h8v3H8zM5 7h14v14H5zM9 12h6M9 16h4"/></svg> },
    ]
  },
  {
    group: 'Clients',
    items: [
      { id:'clients', label:'Accounts', Icon: Building },
      { id:'reports', label:'Reports', Icon: FileText },
      { id:'inbox', label:'Inbox', Icon: Inbox },
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
    group: 'Organisation',
    items: [
      { id:'team', label:'Team', Icon: Users },
      { id:'performance', label:'Performance', Icon: BarChart },
      { id:'permissions', label:'Permissions', Icon: Settings },
      { id:'connections', label:'Connections', Icon: Globe },
      { id:'automations', label:'Automations', Icon: Zap },
      { id:'knowledge', label:'Knowledge', Icon: Book },
    ]
  },
]

export default function Sidebar({ onLogout }: { onLogout?: () => void }) {
  const { state, dispatch } = useApp()
  const role = state.currentUser?.role || 'employee'

  const ROLE_SCREENS: Record<string, string[]> = {
    owner:    ['myday','planner','calendar','contentplan','clients','client-detail','reports','inbox','pipeline','leads','team','performance','permissions','connections','automations','knowledge'],
    manager:  ['myday','planner','calendar','contentplan','clients','client-detail','reports','inbox','pipeline','leads','team','performance','knowledge'],
    sales:    ['myday','inbox','clients','client-detail','reports','pipeline','leads'],
    employee: ['myday','planner','calendar','contentplan','inbox','knowledge'],
  }
  const allowed = (id: string) => (ROLE_SCREENS[role] || ROLE_SCREENS.employee).includes(id)

  const nav = (screen: Screen) => dispatch({ type:'SET_SCREEN', screen })

  return (
    <div style={{ width:232, flexShrink:0, background:'#fff', borderRight:'1px solid var(--c-border)', display:'flex', flexDirection:'column', height:'100vh', position:'sticky', top:0 }}>
      {/* Logo */}
      <div style={{ padding:'20px 18px 16px', borderBottom:'1px solid var(--c-border-soft)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:34, height:34, borderRadius:10, background:'var(--c-ink)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Sparkle size={16} color="#FF5C1F" style={{ animation:'sparkleSpin 8s linear infinite' }} />
          </div>
          <div>
            <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:16, letterSpacing:'-0.01em', lineHeight:1 }}>Mavixy OS</div>
            <div style={{ fontSize:11, color:'var(--c-faint)', marginTop:2 }}>Agency Command Center</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex:1, overflowY:'auto', padding:'10px 10px' }}>
        {NAV.map(section => {
          const visible = section.items.filter(item => allowed(item.id))
          if (!visible.length) return null
          return (
            <div key={section.group} style={{ marginBottom:4 }}>
              <div style={{ fontSize:10.5, fontWeight:700, letterSpacing:'.08em', color:'var(--c-ghost)', textTransform:'uppercase', padding:'8px 10px 4px' }}>{section.group}</div>
              {visible.map(item => {
                const active = state.screen === item.id
                return (
                  <button key={item.id} onClick={() => nav(item.id as Screen)}
                    style={{ display:'flex', alignItems:'center', gap:10, width:'100%', padding:'9px 11px', borderRadius:10, fontSize:13.5, fontWeight: active ? 600 : 500, color: active ? 'var(--c-ink)' : 'var(--c-muted)', background: active ? 'var(--c-fill)' : 'transparent', transition:'background .15s, color .15s', cursor:'pointer', marginBottom:1 }}
                    onMouseEnter={e => { if (!active) { e.currentTarget.style.background='var(--c-fill)'; e.currentTarget.style.color='var(--c-ink-2)' } }}
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
      <div style={{ padding:'12px 12px', borderTop:'1px solid var(--c-border-soft)' }}>
        {state.currentUser && (
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:34, height:34, borderRadius:9, background: state.currentUser.color || '#0EA5A4', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-display)', fontWeight:700, fontSize:12, flexShrink:0 }}>
              {state.currentUser.initials}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13.5, fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{state.currentUser.name}</div>
              <div style={{ fontSize:11.5, color:'var(--c-faint)', textTransform:'capitalize' }}>{state.currentUser.role}</div>
            </div>
            <button onClick={onLogout || (() => dispatch({ type:'LOGOUT' }))} title="Sign out"
              style={{ width:30, height:30, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--c-ghost)' }}
              onMouseEnter={e => { e.currentTarget.style.background='var(--c-fill)'; e.currentTarget.style.color='var(--c-muted)' }}
              onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='var(--c-ghost)' }}
            >
              <LogOut size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
