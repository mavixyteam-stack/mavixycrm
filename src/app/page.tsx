'use client'
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

function AppShell() {
  const { state, dispatch } = useApp()
  const sb = createClient()

  // Still checking auth session
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

  if (!state.isLoggedIn) {
    return <Login />
  }

  async function handleLogout() {
    await sb.auth.signOut()
    dispatch({ type: 'LOGOUT' })
  }

  function renderScreen() {
    switch (state.screen) {
      case 'myday': return <MyDay />
      case 'planner': return <DayPlanner />
      case 'calendar': return <ContentCalendar />
      case 'contentplan': return <ContentPlanner />
      case 'clients': return <ClientsScreen />
      case 'client-detail': return <ClientDetail />
      case 'reports': return <ReportsScreen />
      case 'inbox': return <InboxScreen />
      case 'pipeline': return <PipelineScreen />
      case 'leads': return <LeadsScreen />
      case 'team': return <TeamScreen />
      case 'performance': return <PerformanceScreen />
      case 'permissions': return <PermissionsScreen />
      case 'connections': return <ConnectionsScreen />
      case 'automations': return <AutomationsScreen />
      case 'knowledge': return <KnowledgeScreen />
      default: return <MyDay />
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
