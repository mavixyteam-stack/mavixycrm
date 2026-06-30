'use client'
import { useEffect } from 'react'
import { useApp, AppProvider } from '@/lib/store'
import { createClient } from '@/lib/supabase/client'
import Login from '@/components/shell/Login'
import Sidebar from '@/components/shell/Sidebar'
import TopBar from '@/components/shell/TopBar'
import MyDay from '@/components/work/MyDay'
import ContentCalendar from '@/components/work/ContentCalendar'
import ContentPlanner from '@/components/work/ContentPlanner'
import DayPlanner from '@/components/work/DayPlanner'
import ClientsScreen from '@/components/accounts/ClientsScreen'
import ClientDetail from '@/components/accounts/ClientDetail'
import ReportsScreen from '@/components/accounts/ReportsScreen'
import InboxScreen from '@/components/accounts/InboxScreen'
import PipelineScreen from '@/components/sales/PipelineScreen'
import LeadsScreen from '@/components/sales/LeadsScreen'
import TeamScreen from '@/components/org/TeamScreen'
import PerformanceScreen from '@/components/org/PerformanceScreen'
import PermissionsScreen from '@/components/org/PermissionsScreen'
import ConnectionsScreen from '@/components/org/ConnectionsScreen'
import AutomationsScreen from '@/components/org/AutomationsScreen'
import KnowledgeScreen from '@/components/org/KnowledgeScreen'
import { Sparkle } from '@/components/ui/Icon'
import type { Screen, Role } from '@/types'

// ─── RBAC matrix ─────────────────────────────────────────────────────────────
const ROLE_SCREENS: Record<Role, Screen[]> = {
  owner: [
    'myday','planner','calendar','contentplan',
    'clients','client-detail','reports','inbox',
    'pipeline','leads',
    'team','performance','permissions','connections','automations','knowledge',
  ],
  manager: [
    'myday','planner','calendar','contentplan',
    'clients','client-detail','reports','inbox',
    'pipeline','leads',
    'team','performance','knowledge',
  ],
  sales: [
    'myday','inbox','clients','client-detail','reports','pipeline','leads',
  ],
  employee: [
    'myday','planner','calendar','contentplan','inbox','knowledge',
  ],
}

function canAccess(role: Role, screen: Screen): boolean {
  return ROLE_SCREENS[role]?.includes(screen) ?? false
}

function defaultScreen(role: Role): Screen {
  return ROLE_SCREENS[role][0] || 'myday'
}

// ─── Access denied wall ───────────────────────────────────────────────────────
function AccessDenied({ screen, role }: { screen: string; role: string }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:16, textAlign:'center' }}>
      <div style={{ width:56, height:56, borderRadius:16, background:'var(--c-red-bg)', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
      </div>
      <div>
        <div style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:700, marginBottom:6 }}>Access restricted</div>
        <div style={{ fontSize:14, color:'var(--c-subtle)', maxWidth:'36ch' }}>
          The <strong>{screen}</strong> screen is not available for the <strong>{role}</strong> role.
          Contact your admin if you need access.
        </div>
      </div>
    </div>
  )
}

// ─── Main shell ───────────────────────────────────────────────────────────────
function AppShell() {
  const { state, dispatch } = useApp()
  const sb = createClient()
  const role = (state.currentUser?.role || 'employee') as Role

  // Redirect to allowed screen if current screen is blocked
  useEffect(() => {
    if (state.isLoggedIn && !canAccess(role, state.screen)) {
      dispatch({ type: 'SET_SCREEN', screen: defaultScreen(role) })
    }
  }, [role, state.screen, state.isLoggedIn]) // eslint-disable-line react-hooks/exhaustive-deps

  if (state.authLoading) {
    return (
      <div style={{ display:'flex', height:'100vh', alignItems:'center', justifyContent:'center', background:'var(--c-bg)', flexDirection:'column', gap:16 }}>
        <div style={{ width:44, height:44, borderRadius:13, background:'#FF5C1F', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Sparkle size={20} color="#fff" style={{ animation:'sparkleSpin 8s linear infinite' }} />
        </div>
        <div style={{ width:28, height:28, borderRadius:'50%', border:'3px solid var(--c-rule)', borderTopColor:'var(--c-accent)', animation:'spin .7s linear infinite' }} />
      </div>
    )
  }

  if (!state.isLoggedIn) return <Login />

  async function handleLogout() {
    await sb.auth.signOut()
    dispatch({ type: 'LOGOUT' })
  }

  function renderScreen() {
    if (!canAccess(role, state.screen)) {
      return <AccessDenied screen={state.screen} role={role} />
    }
    switch (state.screen) {
      case 'myday':       return <MyDay />
      case 'planner':     return <DayPlanner />
      case 'calendar':    return <ContentCalendar />
      case 'contentplan': return <ContentPlanner />
      case 'clients':     return <ClientsScreen />
      case 'client-detail': return <ClientDetail />
      case 'reports':     return <ReportsScreen />
      case 'inbox':       return <InboxScreen />
      case 'pipeline':    return <PipelineScreen />
      case 'leads':       return <LeadsScreen />
      case 'team':        return <TeamScreen />
      case 'performance': return <PerformanceScreen />
      case 'permissions': return <PermissionsScreen />
      case 'connections': return <ConnectionsScreen />
      case 'automations': return <AutomationsScreen />
      case 'knowledge':   return <KnowledgeScreen />
      default:            return <MyDay />
    }
  }

  return (
    <div style={{ display:'flex', height:'100vh', background:'var(--c-bg)', fontFamily:'var(--font-body)', overflow:'hidden' }}>
      <Sidebar onLogout={handleLogout} />
      <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0, overflow:'hidden' }}>
        <TopBar />
        <main style={{ flex:1, overflowY:'auto', padding:28 }}>
          {renderScreen()}
        </main>
      </div>
    </div>
  )
}

export default function Home() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  )
}
