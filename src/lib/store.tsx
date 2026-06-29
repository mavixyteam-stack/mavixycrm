'use client'
import React, { createContext, useContext, useReducer, useCallback } from 'react'
import type { Screen, Profile, PlanItem, Task, AttendanceRecord, Deal } from '@/types'
import { SEED_CLIENTS, SEED_TEAM, SEED_PLAN_ITEMS } from './seed-data'

interface Client {
  id: string; name: string; initials: string; color: string
  health: number; services: string[]; type: string
  industry?: string; contact_name?: string; contact_email?: string
}

interface AppState {
  screen: Screen
  currentUser: Profile | null
  isLoggedIn: boolean
  users: any[]
  clients: Client[]
  planItems: PlanItem[]
  tasks: Task[]
  attendance: AttendanceRecord[]
  deals: Deal[]
  selectedClientId: string | null
  // UI state
  toast: string | null
  briefOpen: boolean
  addUserOpen: boolean
  editUserId: string | null
  notifOpen: boolean
  attPanelOpen: boolean
  // check-in state
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
  | { type: 'SET_PLAN_ITEMS'; items: PlanItem[] }
  | { type: 'UPSERT_PLAN_ITEM'; item: PlanItem }
  | { type: 'DELETE_PLAN_ITEM'; id: string }
  | { type: 'SET_TASKS'; tasks: Task[] }
  | { type: 'UPSERT_TASK'; task: Task }
  | { type: 'SET_CLIENTS'; clients: Client[] }
  | { type: 'UPSERT_CLIENT'; client: Client }
  | { type: 'SET_USERS'; users: any[] }
  | { type: 'UPSERT_USER'; user: any }
  | { type: 'DELETE_USER'; id: string }
  | { type: 'SET_DEALS'; deals: Deal[] }
  | { type: 'UPSERT_DEAL'; deal: Deal }
  | { type: 'SET_ATTENDANCE'; attendance: AttendanceRecord[] }
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
  users: SEED_TEAM,
  clients: SEED_CLIENTS,
  planItems: SEED_PLAN_ITEMS as any[],
  tasks: [],
  attendance: [],
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

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_SCREEN': return { ...state, screen: action.screen }
    case 'SET_CLIENT_DETAIL': return { ...state, selectedClientId: action.clientId }
    case 'SET_USER': return { ...state, currentUser: action.user, isLoggedIn: true }
    case 'LOGOUT': return { ...initial, isLoggedIn: false }
    case 'SET_PLAN_ITEMS': return { ...state, planItems: action.items }
    case 'UPSERT_PLAN_ITEM': {
      const exists = state.planItems.find(x => x.id === action.item.id)
      return { ...state, planItems: exists
        ? state.planItems.map(x => x.id === action.item.id ? action.item : x)
        : [...state.planItems, action.item]
      }
    }
    case 'DELETE_PLAN_ITEM': return { ...state, planItems: state.planItems.filter(x => x.id !== action.id) }
    case 'SET_TASKS': return { ...state, tasks: action.tasks }
    case 'UPSERT_TASK': {
      const exists = state.tasks.find(x => x.id === action.task.id)
      return { ...state, tasks: exists
        ? state.tasks.map(x => x.id === action.task.id ? action.task : x)
        : [...state.tasks, action.task]
      }
    }
    case 'SET_CLIENTS': return { ...state, clients: action.clients }
    case 'UPSERT_CLIENT': {
      const exists = state.clients.find(x => x.id === action.client.id)
      return { ...state, clients: exists
        ? state.clients.map(x => x.id === action.client.id ? action.client : x)
        : [...state.clients, action.client]
      }
    }
    case 'SET_USERS': return { ...state, users: action.users }
    case 'UPSERT_USER': {
      const exists = state.users.find(x => x.id === action.user.id)
      return { ...state, users: exists
        ? state.users.map(x => x.id === action.user.id ? action.user : x)
        : [...state.users, action.user]
      }
    }
    case 'DELETE_USER': return { ...state, users: state.users.filter(x => x.id !== action.id) }
    case 'SET_DEALS': return { ...state, deals: action.deals }
    case 'UPSERT_DEAL': {
      const exists = state.deals.find(x => x.id === action.deal.id)
      return { ...state, deals: exists
        ? state.deals.map(x => x.id === action.deal.id ? action.deal : x)
        : [...state.deals, action.deal]
      }
    }
    case 'SET_ATTENDANCE': return { ...state, attendance: action.attendance }
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
  return <Ctx.Provider value={{ state, dispatch }}>{children}</Ctx.Provider>
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
