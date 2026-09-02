'use client'
import { useEffect, useRef, Component } from 'react'
import type { ReactNode } from 'react'
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
import PipelineScreen from '@/components/sales/PipelineScreen'
import LeadsScreen from '@/components/sales/LeadsScreen'
import TeamScreen from '@/components/org/TeamScreen'
import PerformanceScreen from '@/components/org/PerformanceScreen'
import PermissionsScreen from '@/components/org/PermissionsScreen'
import ConnectionsScreen from '@/components/org/ConnectionsScreen'
import AutomationsScreen from '@/components/org/AutomationsScreen'
import KnowledgeScreen from '@/components/org/KnowledgeScreen'
import AttendanceScreen from '@/components/org/AttendanceScreen'
import OnboardingScreen from '@/components/org/OnboardingScreen'
import AssistantScreen from '@/components/org/AssistantScreen'
import { Sparkle } from '@/components/ui/Icon'
import type { Screen, Role } from '@/types'

// ─── Error Boundary ───────────────────────────────────────────────────────────
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error: Error) { return { error } }
  render() {
    if (this.state.error) {
      return (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh', gap:16, padding:32, textAlign:'center', background:'var(--c-bg)' }}>
          <div style={{ width:52, height:52, borderRadius:16, background:'var(--c-red-bg)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
          </div>
          <div>
            <div style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:700, marginBottom:8 }}>Something went wrong</div>
            <div style={{ fontSize:13, color:'var(--c-subtle)', maxWidth:'44ch', marginBottom:20 }}>{this.state.error.message}</div>
            <button onClick={() => window.location.reload()} style={{ background:'var(--c-accent)', color:'#fff', borderRadius:10, padding:'10px 20px', fontWeight:700, fontSize:14 }}>Reload</button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// ─── URL ↔ Screen mapping ─────────────────────────────────────────────────────
const SCREEN_PATHS: Record<string, Screen> = {
  '/': 'myday',
  '/planner': 'planner',
  '/calendar': 'calendar',
  '/content': 'contentplan',
  '/clients': 'clients',
  '/reports': 'reports',
  '/pipeline': 'pipeline',
  '/leads': 'leads',
  '/team': 'team',
  '/performance': 'performance',
  '/permissions': 'permissions',
  '/connections': 'connections',
  '/automations': 'automations',
  '/knowledge': 'knowledge',
  '/attendance': 'attendance',
  '/onboarding': 'onboarding',
  '/ask': 'assistant',
}

const SCREEN_TO_PATH: Partial<Record<Screen, string>> = {
  myday: '/',
  planner: '/planner',
  calendar: '/calendar',
  contentplan: '/content',
  clients: '/clients',
  reports: '/reports',
  pipeline: '/pipeline',
  leads: '/leads',
  team: '/team',
  performance: '/performance',
  permissions: '/permissions',
  connections: '/connections',
  automations: '/automations',
  knowledge: '/knowledge',
  attendance: '/attendance',
  onboarding: '/onboarding',
  assistant: '/ask',
}

// ─── RBAC matrix ─────────────────────────────────────────────────────────────
const ROLE_SCREENS: Record<Role, Screen[]> = {
  owner: [
    'myday','planner','calendar','contentplan',
    'clients','client-detail','reports',
    'pipeline','leads',
    'team','performance','permissions','connections','automations','knowledge','attendance','onboarding','assistant',
  ],
  manager: [
    'myday','planner','calendar','contentplan',
    'clients','client-detail','reports',
    'pipeline','leads',
    'team','performance','knowledge','attendance','onboarding','assistant',
  ],
  sales: [
    'myday','clients','client-detail','reports','pipeline','leads','attendance',
  ],
  employee: [
    'myday','planner','calendar','contentplan','knowledge','attendance',
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
  const isPopState = useRef(false)

  // Redirect to allowed screen if current screen is blocked
  useEffect(() => {
    if (state.isLoggedIn && !canAccess(role, state.screen)) {
      dispatch({ type: 'SET_SCREEN', screen: defaultScreen(role) })
    }
  }, [role, state.screen, state.isLoggedIn]) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync screen → URL
  useEffect(() => {
    if (!state.isLoggedIn) return
    if (isPopState.current) { isPopState.current = false; return }
    const path = state.screen === 'client-detail' && state.selectedClientId
      ? `/clients/${state.selectedClientId}`
      : (SCREEN_TO_PATH[state.screen] || '/')
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path)
    }
  }, [state.screen, state.selectedClientId, state.isLoggedIn]) // eslint-disable-line react-hooks/exhaustive-deps

  // Handle browser back/forward
  useEffect(() => {
    const onPop = () => {
      isPopState.current = true
      const path = window.location.pathname
      const clientMatch = path.match(/^\/clients\/([0-9a-f-]{36})$/)
      if (clientMatch) {
        dispatch({ type: 'SET_CLIENT_DETAIL', clientId: clientMatch[1] })
        return
      }
      const screen = SCREEN_PATHS[path] || 'myday'
      dispatch({ type: 'SET_SCREEN', screen })
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [dispatch])

  // Parse URL on first login (handles deep links and refreshes)
  useEffect(() => {
    if (!state.isLoggedIn) return
    const path = window.location.pathname
    const clientMatch = path.match(/^\/clients\/([0-9a-f-]{36})$/)
    if (clientMatch) {
      dispatch({ type: 'SET_CLIENT_DETAIL', clientId: clientMatch[1] })
      return
    }
    const screen = SCREEN_PATHS[path]
    if (screen && screen !== state.screen) dispatch({ type: 'SET_SCREEN', screen })
  }, [state.isLoggedIn]) // eslint-disable-line react-hooks/exhaustive-deps

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
      case 'pipeline':    return <PipelineScreen />
      case 'leads':       return <LeadsScreen />
      case 'team':        return <TeamScreen />
      case 'performance': return <PerformanceScreen />
      case 'permissions': return <PermissionsScreen />
      case 'connections': return <ConnectionsScreen />
      case 'automations': return <AutomationsScreen />
      case 'knowledge':   return <KnowledgeScreen />
      case 'attendance':  return <AttendanceScreen />
      case 'onboarding':  return <OnboardingScreen />
      case 'assistant':   return <AssistantScreen />
      default:            return <MyDay />
    }
  }

  return (
    <div style={{ display:'flex', height:'100vh', background:'var(--c-bg)', fontFamily:'var(--font-body)', overflow:'hidden', position:'relative', zIndex:0 }}>
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
    <ErrorBoundary>
      <AppProvider>
        <AppShell />
      </AppProvider>
    </ErrorBoundary>
  )
}
