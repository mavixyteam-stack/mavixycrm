// ─── Single source of truth for screen access (RBAC + per-department) ─────────
// Used by both the Sidebar (which nav items to show) and the app shell
// (the access wall + redirect). Keep all access logic here so the two can
// never drift out of sync.

import type { Role, Screen } from '@/types'

// Role → the full set of screens that role may ever reach.
export const ROLE_SCREENS: Record<Role, Screen[]> = {
  owner: [
    'myday','planner','calendar','contentplan','dmboard',
    'clients','client-detail','reports',
    'journey','invoices',
    'team','onboarding','assistant','performance','permissions','connections','automations','knowledge','attendance',
  ],
  manager: [
    'myday','planner','calendar','contentplan','dmboard',
    'clients','client-detail','reports',
    'journey','invoices',
    'team','onboarding','assistant','performance','knowledge','attendance',
  ],
  // Sales work the Client Journey (their own accounts — see ClientJourney),
  // but proposals/contracts/invoices stay owner/manager.
  sales: [
    'myday','clients','client-detail','reports','journey','attendance',
  ],
  employee: [
    'myday','calendar','contentplan','dmboard','knowledge','attendance',
  ],
}

// Screens every employee gets regardless of department.
const EMPLOYEE_BASE: Screen[] = ['myday', 'knowledge', 'attendance']

// The department-specific work screens. An employee sees ONLY the work
// screens belonging to their department — Creative gets the content tools,
// Digital Marketing gets the performance board, and never both.
export const DEPARTMENT_SCREENS: Record<string, Screen[]> = {
  'Creative':          ['calendar', 'contentplan'],
  'Digital Marketing': ['dmboard'],
}

// Employees with no department set yet fall back to the historical default
// (the content tools) so nobody is locked out mid-migration.
const DEFAULT_EMPLOYEE_DEPARTMENT = 'Creative'

/**
 * Can this user reach this screen?
 * - Owners & managers oversee every department → full access to their role's screens.
 * - Sales role → its fixed screen set.
 * - Employees → base screens + ONLY their own department's work screens.
 */
export function canAccess(role: Role, screen: Screen, department?: string | null): boolean {
  if (role === 'owner' || role === 'manager') {
    return ROLE_SCREENS[role].includes(screen)
  }
  if (role === 'sales') {
    return ROLE_SCREENS.sales.includes(screen)
  }
  // employee
  if (EMPLOYEE_BASE.includes(screen)) return true
  const dept = department || DEFAULT_EMPLOYEE_DEPARTMENT
  return (DEPARTMENT_SCREENS[dept] || []).includes(screen)
}

/** The screen a user lands on by default / falls back to when blocked. */
export function defaultScreen(): Screen {
  return 'myday'
}
