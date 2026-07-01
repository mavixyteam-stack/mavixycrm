'use client'
import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react'
import type { Screen, Profile, PlanItem, Task, AttendanceRecord, AttendanceRequest, Deal, Client } from '@/types'
import { createClient } from './supabase/client'
import {
  loadWorkspace,
  dbUpsertPlanItem, dbDeletePlanItem,
  dbUpsertClient, dbDeleteClient,
  dbUpsertTask, dbUpsertDeal,
  dbUpsertAttendanceRequest, dbUpdateAttendanceRequest,
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
  | { type: 'SET_ATTENDANCE'; attendance: AttendanceRecord[] }
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
    case 'SET_ATTENDANCE': return { ...state, attendance: action.attendance }
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
      }
    })
    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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

export function useUpsertPlanItem() {
  const { dispatch } = useApp()
  return useCallback(async (item: PlanItem) => {
    dispatch({ type: 'UPSERT_PLAN_ITEM', item })
    await dbUpsertPlanItem(item)
  }, [dispatch])
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
  return useCallback(async (client: Client) => {
    dispatch({ type: 'UPSERT_CLIENT', client })
    await dbUpsertClient(client)
  }, [dispatch])
}

export function useUpsertTask() {
  const { dispatch } = useApp()
  return useCallback(async (task: Task) => {
    dispatch({ type: 'UPSERT_TASK', task })
    await dbUpsertTask(task)
  }, [dispatch])
}

export function useUpsertDeal() {
  const { dispatch } = useApp()
  return useCallback(async (deal: Deal) => {
    dispatch({ type: 'UPSERT_DEAL', deal })
    await dbUpsertDeal(deal)
  }, [dispatch])
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
