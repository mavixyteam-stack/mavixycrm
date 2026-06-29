'use client'
import { useApp, AppProvider } from '@/lib/store'
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

function screenLabel(screen: string) {
  const map: Record<string, string> = {
    myday: 'My Day', planner: 'Day Planner', calendar: 'Content Calendar',
    contentplan: 'Content Planner', clients: 'Accounts', 'client-detail': 'Client Detail',
    reports: 'Reports', inbox: 'Inbox', pipeline: 'Pipeline', leads: 'Leads',
    team: 'Team', permissions: 'Permissions', performance: 'Performance',
    connections: 'Connections', automations: 'Automations', knowledge: 'Knowledge',
  }
  return map[screen] || screen
}

function AppShell() {
  const { state, dispatch } = useApp()

  async function handleLogin(email: string, pass: string) {
    const users = [
      { id:'dev', email:'dev@mavixy.com', pass:'dev123', name:'Dev Sharma', initials:'DS', color:'#8B5CF6', role:'manager' as const, title:'Strategist', permissions:[], created_at:'' },
      { id:'ira', email:'ira@mavixy.com', pass:'ira123', name:'Ira Nair', initials:'IN', color:'#2563EB', role:'manager' as const, title:'Account Mgr', permissions:[], created_at:'' },
      { id:'owner', email:'owner@mavixy.com', pass:'owner123', name:'Rahul Anand', initials:'RA', color:'#FF5C1F', role:'owner' as const, title:'Founder', permissions:[], created_at:'' },
      { id:'aanya', email:'aanya@mavixy.com', pass:'aanya123', name:'Aanya Mehra', initials:'AM', color:'#0EA5A4', role:'employee' as const, title:'Designer', permissions:[], created_at:'' },
    ]
    const user = users.find(u => u.email === email && u.pass === pass)
    if (!user) throw new Error('Invalid credentials')
    const { pass: _, ...profile } = user
    dispatch({ type: 'SET_USER', user: profile })
  }

  if (!state.isLoggedIn) {
    return <Login onLogin={handleLogin} />
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
      <Sidebar />
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
