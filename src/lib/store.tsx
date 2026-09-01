'use client'
import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react'
import type { Screen, Profile, PlanItem, Task, AttendanceRecord, AttendanceRequest, Deal, Client, Notification } from '@/types'
import { createClient } from './supabase/client'
import {
  loadWorkspace,
  dbUpsertPlanItem, dbDeletePlanItem,
  dbUpsertClient, dbDeleteClient,
  dbUpsertTask, dbUpsertDeal, dbDeleteDeal,
  dbUpsertAttendanceRequest, dbUpdateAttendanceRequest,
  loadNotifications, markNotificationRead, markAllNotificationsRead, notifyUsers,
} from './db'

interface AppState {
  screen: Screen
  currentUser: Profile | null
  isLoggedIn: boolean
  authLoading: boolean
  users: Profile[]
  clients: Client[]
  planItems: PlanItem[]
  tasks: Task[]
  attendance: AttendanceRecord[]
  attendanceRequests: AttendanceRequest[]
  deals: Deal[]
  notifications: Notification[]
  selectedClientId: string | null
  toast: string | null
  briefOpen: boolean
  addUserOpen: boolean
  editUserId: string | null
  notifOpen: boolean
  attPanelOpen: boolean
  checkedIn: boolean
  checkInTime: Date | null
  onBreak: boolean
  breakStart: Date | null
  totalBreakMs: number
}

type Action =
  | { type: 'SET_SCREEN'; screen: Screen }
  | { type: 'SET_CLIENT_DETAIL'; clientId: string }
  | { type: 'SET_USER'; user: Profile }
  | { type: 'LOGOUT' }
  | { type: 'AUTH_LOADED' }
  | { type: 'SET_WORKSPACE'; clients: Client[]; planItems: PlanItem[]; tasks: Task[]; deals: Deal[]; users: Profile[]; attendanceRequests: AttendanceRequest[] }
  | { type: 'SET_PLAN_ITEMS'; items: PlanItem[] }
  | { type: 'UPSERT_PLAN_ITEM'; item: PlanItem }
  | { type: 'DELETE_PLAN_ITEM'; id: string }
  | { type: 'SET_TASKS'; tasks: Task[] }
  | { type: 'UPSERT_TASK'; task: Task }
  | { type: 'SET_CLIENTS'; clients: Client[] }
  | { type: 'UPSERT_CLIENT'; client: Client }
  | { type: 'DELETE_CLIENT'; id: string }
  | { type: 'SET_USERS'; users: Profile[] }
  | { type: 'UPSERT_USER'; user: Profile }
  | { type: 'DELETE_USER'; id: string }
  | { type: 'SET_DEALS'; deals: Deal[] }
  | { type: 'UPSERT_DEAL'; deal: Deal }
  | { type: 'DELETE_DEAL'; id: string }
  | { type: 'SET_ATTENDANCE'; attendance: AttendanceRecord[] }
  | { type: 'SET_NOTIFICATIONS'; notifications: Notification[] }
  | { type: 'ADD_NOTIFICATION'; notification: Notification }
  | { type: 'MARK_NOTIF_READ'; id: string }
  | { type: 'MARK_ALL_NOTIF_READ' }
  | { type: 'UPSERT_ATT_REQUEST'; request: AttendanceRequest }
  | { type: 'UPDATE_ATT_REQUEST'; id: string; status: 'approved' | 'rejected'; reviewed_by: string; rejection_reason?: string }
  | { type: 'SHOW_TOAST'; msg: string }
  | { type: 'CLEAR_TOAST' }
  | { type: 'TOGGLE_BRIEF' }
  | { type: 'TOGGLE_NOTIF' }
  | { type: 'TOGGLE_ATT_PANEL' }
  | { type: 'OPEN_ADD_USER' }
  | { type: 'OPEN_EDIT_USER'; id: string }
  | { type: 'CLOSE_USER_MODAL' }
  | { type: 'CHECK_IN' }
  | { type: 'RESTORE_CHECK_IN'; checkInTime: Date }
  | { type: 'START_BREAK' }
  | { type: 'END_BREAK'; ms: number }
  | { type: 'CHECK_OUT' }

const initial: AppState = {
  screen: 'myday',
  currentUser: null,
  isLoggedIn: false,
  authLoading: true,
  users: [],
  clients: [],
  planItems: [],
  tasks: [],
  attendance: [],
  attendanceRequests: [],
  deals: [],
  notifications: [],
  selectedClientId: null,
  toast: null,
  briefOpen: false,
  addUserOpen: false,
  editUserId: null,
  notifOpen: false,
  attPanelOpen: false,
  checkedIn: false,
  checkInTime: null,
  onBreak: false,
  breakStart: null,
  totalBreakMs: 0,
}

function upsert<T extends { id: string }>(list: T[], item: T): T[] {
  const idx = list.findIndex(x => x.id === item.id)
  return idx >= 0 ? list.map((x, i) => i === idx ? item : x) : [...list, item]
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_SCREEN': return { ...state, screen: action.screen }
    case 'SET_CLIENT_DETAIL': return { ...state, selectedClientId: action.clientId, screen: 'client-detail' }
    case 'SET_USER': return { ...state, currentUser: action.user, isLoggedIn: true, authLoading: false }
    case 'AUTH_LOADED': return { ...state, authLoading: false }
    case 'LOGOUT': return { ...initial, isLoggedIn: false, authLoading: false }
    case 'SET_WORKSPACE': return {
      ...state,
      clients: action.clients,
      planItems: action.planItems,
      tasks: action.tasks,
      deals: action.deals,
      users: action.users,
      attendanceRequests: action.attendanceRequests,
    }
    case 'SET_PLAN_ITEMS': return { ...state, planItems: action.items }
    case 'UPSERT_PLAN_ITEM': return { ...state, planItems: upsert(state.planItems, action.item) }
    case 'DELETE_PLAN_ITEM': return { ...state, planItems: state.planItems.filter(x => x.id !== action.id) }
    case 'SET_TASKS': return { ...state, tasks: action.tasks }
    case 'UPSERT_TASK': return { ...state, tasks: upsert(state.tasks, action.task) }
    case 'SET_CLIENTS': return { ...state, clients: action.clients }
    case 'UPSERT_CLIENT': return { ...state, clients: upsert(state.clients, action.client) }
    case 'DELETE_CLIENT': return {
      ...state,
      clients: state.clients.filter(x => x.id !== action.id),
      planItems: state.planItems.filter(x => x.client_id !== action.id),
      tasks: state.tasks.filter(x => x.client_id !== action.id),
      selectedClientId: state.selectedClientId === action.id ? null : state.selectedClientId,
    }
    case 'SET_USERS': return { ...state, users: action.users }
    case 'UPSERT_USER': return { ...state, users: upsert(state.users, action.user) }
    case 'DELETE_USER': return { ...state, users: state.users.filter(x => x.id !== action.id) }
    case 'SET_DEALS': return { ...state, deals: action.deals }
    case 'UPSERT_DEAL': return { ...state, deals: upsert(state.deals, action.deal) }
    case 'DELETE_DEAL': return { ...state, deals: state.deals.filter(x => x.id !== action.id) }
    case 'SET_ATTENDANCE': return { ...state, attendance: action.attendance }
    case 'SET_NOTIFICATIONS': return { ...state, notifications: action.notifications }
    case 'ADD_NOTIFICATION':
      if (state.notifications.some(n => n.id === action.notification.id)) return state
      return { ...state, notifications: [action.notification, ...state.notifications] }
    case 'MARK_NOTIF_READ': return { ...state, notifications: state.notifications.map(n => n.id === action.id ? { ...n, read: true } : n) }
    case 'MARK_ALL_NOTIF_READ': return { ...state, notifications: state.notifications.map(n => ({ ...n, read: true })) }
    case 'UPSERT_ATT_REQUEST': return { ...state, attendanceRequests: upsert(state.attendanceRequests, action.request) }
    case 'UPDATE_ATT_REQUEST': return {
      ...state,
      attendanceRequests: state.attendanceRequests.map(r =>
        r.id === action.id
          ? { ...r, status: action.status, reviewed_by: action.reviewed_by, reviewed_at: new Date().toISOString(), rejection_reason: action.rejection_reason }
          : r
      ),
    }
    case 'SHOW_TOAST': return { ...state, toast: action.msg }
    case 'CLEAR_TOAST': return { ...state, toast: null }
    case 'TOGGLE_BRIEF': return { ...state, briefOpen: !state.briefOpen }
    case 'TOGGLE_NOTIF': return { ...state, notifOpen: !state.notifOpen }
    case 'TOGGLE_ATT_PANEL': return { ...state, attPanelOpen: !state.attPanelOpen }
    case 'OPEN_ADD_USER': return { ...state, addUserOpen: true, editUserId: null }
    case 'OPEN_EDIT_USER': return { ...state, addUserOpen: true, editUserId: action.id }
    case 'CLOSE_USER_MODAL': return { ...state, addUserOpen: false, editUserId: null }
    case 'CHECK_IN': return { ...state, checkedIn: true, checkInTime: new Date(), onBreak: false, totalBreakMs: 0 }
    case 'RESTORE_CHECK_IN': return { ...state, checkedIn: true, checkInTime: action.checkInTime }
    case 'START_BREAK': return { ...state, onBreak: true, breakStart: new Date() }
    case 'END_BREAK': return { ...state, onBreak: false, breakStart: null, totalBreakMs: state.totalBreakMs + action.ms }
    case 'CHECK_OUT': return { ...state, checkedIn: false, checkInTime: null, onBreak: false, breakStart: null, totalBreakMs: 0 }
    default: return state
  }
}

const Ctx = createContext<{ state: AppState; dispatch: React.Dispatch<Action> } | null>(null)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initial)
  const sb = createClient()

  useEffect(() => {
    sb.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const { data: profile } = await sb.from('profiles').select('*').eq('id', session.user.id).single()
        if (profile) dispatch({ type: 'SET_USER', user: profile })
        else dispatch({ type: 'AUTH_LOADED' })
        await fetchWorkspace(dispatch)
        await fetchNotifications(session.user.id, dispatch)
        await restoreCheckIn(sb, session.user.id, dispatch)
      } else {
        dispatch({ type: 'AUTH_LOADED' })
      }
    })

    const { data: { subscription } } = sb.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        dispatch({ type: 'LOGOUT' })
      } else if (event === 'SIGNED_IN' && session?.user) {
        const { data: profile } = await sb.from('profiles').select('*').eq('id', session.user.id).single()
        if (profile) dispatch({ type: 'SET_USER', user: profile })
        await fetchWorkspace(dispatch)
        await fetchNotifications(session.user.id, dispatch)
        await restoreCheckIn(sb, session.user.id, dispatch)
      }
    })
    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Notifications reach the recipient three ways, in order of speed:
  //  1. Realtime — instant push when a row is inserted (needs the table added
  //     to the supabase_realtime publication; harmless no-op if it isn't).
  //  2. A 30s poll as a fallback.
  //  3. A refetch whenever the tab regains focus.
  const userId = state.currentUser?.id
  useEffect(() => {
    if (!userId) return
    const refresh = () => fetchNotifications(userId, dispatch)

    const channel = sb
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        payload => dispatch({ type: 'ADD_NOTIFICATION', notification: payload.new as Notification }),
      )
      .subscribe()

    const interval = setInterval(refresh, 30000)
    const onFocus = () => { if (document.visibilityState === 'visible') refresh() }
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      sb.removeChannel(channel)
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  return <Ctx.Provider value={{ state, dispatch }}>{children}</Ctx.Provider>
}

async function fetchWorkspace(dispatch: React.Dispatch<Action>) {
  try {
    const data = await loadWorkspace()
    dispatch({
      type: 'SET_WORKSPACE',
      clients: data.clients,
      planItems: data.planItems,
      tasks: data.tasks,
      deals: data.deals,
      users: data.profiles,
      attendanceRequests: data.attendanceRequests,
    })
  } catch (e) {
    console.error('fetchWorkspace', e)
  }
}

async function fetchNotifications(userId: string, dispatch: React.Dispatch<Action>) {
  try {
    const notifications = await loadNotifications(userId)
    dispatch({ type: 'SET_NOTIFICATIONS', notifications })
  } catch (e) {
    console.error('fetchNotifications', e)
  }
}

// Restore check-in state after page refresh by reading today's attendance row
async function restoreCheckIn(
  sb: ReturnType<typeof import('./supabase/client').createClient>,
  userId: string,
  dispatch: React.Dispatch<Action>
) {
  try {
    const today = new Date()
    const dateStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`
    const { data } = await sb.from('attendance').select('check_in, check_out').eq('user_id', userId).eq('date', dateStr).maybeSingle()
    if (data?.check_in && !data?.check_out) {
      dispatch({ type: 'RESTORE_CHECK_IN', checkInTime: new Date(data.check_in) })
    }
  } catch (e) {
    console.error('restoreCheckIn', e)
  }
}

export function useApp() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}

export function useToast() {
  const { dispatch } = useApp()
  return useCallback((msg: string) => {
    dispatch({ type: 'SHOW_TOAST', msg })
    setTimeout(() => dispatch({ type: 'CLEAR_TOAST' }), 3200)
  }, [dispatch])
}

// ── Supabase-synced mutation hooks ────────────────────────────────────────────

function useDbErrorToast() {
  const { dispatch } = useApp()
  return useCallback((label: string, err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(label, err)
    dispatch({ type: 'SHOW_TOAST', msg: `Save failed: ${msg.slice(0, 80)}` })
    setTimeout(() => dispatch({ type: 'CLEAR_TOAST' }), 5000)
  }, [dispatch])
}

export function useUpsertPlanItem() {
  const { state, dispatch } = useApp()
  const errToast = useDbErrorToast()
  return useCallback(async (item: PlanItem) => {
    const prev = state.planItems.find(p => p.id === item.id)
    const me = state.currentUser?.id
    const newlyAssigned = !!item.assignee_id && item.assignee_id !== me && (!prev || prev.assignee_id !== item.assignee_id)
    dispatch({ type: 'UPSERT_PLAN_ITEM', item })
    try { await dbUpsertPlanItem(item) } catch (e) { errToast('upsertPlanItem', e) }
    if (newlyAssigned) {
      const assigner = state.currentUser?.name?.split(' ')[0] || 'Someone'
      const client = state.clients.find(c => c.id === item.client_id)?.name
      notifyUsers([item.assignee_id], {
        title: 'New content assigned',
        text: `${assigner} assigned you ${item.type || 'content'}${client ? ` for ${client}` : ''}: ${item.title}`,
        type: 'info',
        link: 'contentplan',
      })
    }
  }, [state, dispatch, errToast])
}

export function useDeletePlanItem() {
  const { dispatch } = useApp()
  return useCallback(async (id: string) => {
    dispatch({ type: 'DELETE_PLAN_ITEM', id })
    await dbDeletePlanItem(id)
  }, [dispatch])
}

export function useDeleteClient() {
  const { dispatch } = useApp()
  return useCallback(async (id: string) => {
    dispatch({ type: 'DELETE_CLIENT', id })
    await dbDeleteClient(id)
  }, [dispatch])
}

export function useUpsertClient() {
  const { dispatch } = useApp()
  const errToast = useDbErrorToast()
  return useCallback(async (client: Client) => {
    dispatch({ type: 'UPSERT_CLIENT', client })
    try { await dbUpsertClient(client) } catch (e) { errToast('upsertClient', e) }
  }, [dispatch, errToast])
}

export function useUpsertTask() {
  const { state, dispatch } = useApp()
  const errToast = useDbErrorToast()
  return useCallback(async (task: Task) => {
    const prev = state.tasks.find(t => t.id === task.id)
    const me = state.currentUser?.id
    const newlyAssigned = !!task.assignee_id && task.assignee_id !== me && (!prev || prev.assignee_id !== task.assignee_id)
    dispatch({ type: 'UPSERT_TASK', task })
    try { await dbUpsertTask(task) } catch (e) { errToast('upsertTask', e) }
    if (newlyAssigned) {
      const assigner = state.currentUser?.name?.split(' ')[0] || 'Someone'
      const client = state.clients.find(c => c.id === task.client_id)?.name
      notifyUsers([task.assignee_id], {
        title: 'New task assigned',
        text: `${assigner} assigned you a task${client ? ` for ${client}` : ''}: ${task.title}`,
        type: 'info',
        link: 'myday',
      })
    }
  }, [state, dispatch, errToast])
}

export function useUpsertDeal() {
  const { dispatch } = useApp()
  const errToast = useDbErrorToast()
  return useCallback(async (deal: Deal) => {
    dispatch({ type: 'UPSERT_DEAL', deal })
    try { await dbUpsertDeal(deal) } catch (e) { errToast('upsertDeal', e) }
  }, [dispatch, errToast])
}

export function useDeleteDeal() {
  const { dispatch } = useApp()
  const errToast = useDbErrorToast()
  return useCallback(async (id: string) => {
    dispatch({ type: 'DELETE_DEAL', id })
    try { await dbDeleteDeal(id) } catch (e) { errToast('deleteDeal', e) }
  }, [dispatch, errToast])
}

export function useUpsertAttendanceRequest() {
  const { dispatch } = useApp()
  return useCallback(async (request: AttendanceRequest) => {
    dispatch({ type: 'UPSERT_ATT_REQUEST', request })
    await dbUpsertAttendanceRequest(request)
  }, [dispatch])
}

export function useUpdateAttendanceRequest() {
  const { dispatch } = useApp()
  return useCallback(async (id: string, status: 'approved' | 'rejected', reviewed_by: string, rejection_reason?: string) => {
    dispatch({ type: 'UPDATE_ATT_REQUEST', id, status, reviewed_by, rejection_reason })
    await dbUpdateAttendanceRequest(id, status, reviewed_by, rejection_reason)
  }, [dispatch])
}

// ── Notifications ─────────────────────────────────────────────────────────────

export function useMarkNotifRead() {
  const { dispatch } = useApp()
  return useCallback((id: string) => {
    dispatch({ type: 'MARK_NOTIF_READ', id })
    markNotificationRead(id)
  }, [dispatch])
}

export function useMarkAllNotifRead() {
  const { dispatch } = useApp()
  return useCallback(() => {
    dispatch({ type: 'MARK_ALL_NOTIF_READ' })
    markAllNotificationsRead()
  }, [dispatch])
}

/** Send a notification to a set of users (fire-and-forget). */
export function useNotify() {
  return useCallback((userIds: string[], n: { title?: string; text: string; type?: string; link?: string }) => {
    return notifyUsers(userIds, n)
  }, [])
}
