export type Role = 'owner' | 'manager' | 'sales' | 'employee'

export type NavGroup = 'work' | 'accounts' | 'sales' | 'org'

export type Screen =
  | 'myday' | 'planner' | 'calendar' | 'contentplan'
  | 'clients' | 'client-detail' | 'reports' | 'inbox' | 'onboarding'
  | 'pipeline' | 'leads'
  | 'team' | 'permissions' | 'performance' | 'connections' | 'automations' | 'knowledge'
  | 'attendance'

export interface Profile {
  id: string
  email: string
  name: string
  role: Role
  color: string
  initials: string
  title: string
  permissions: string[]
  created_at: string
}

export interface Client {
  id: string
  name: string
  initials: string
  color: string
  health: number
  services: string[]
  type: 'social' | 'ads' | 'seo' | 'full'
  industry?: string
  contact_name?: string
  contact_email?: string
  whatsapp?: string
  account_owner_id?: string
  posts_per_month?: number
  monthly_retainer?: number
  ai_brief?: string
  about_business?: string
  target_audience?: string
  brand_voice?: string
  reference_links?: string
  created_at: string
}

export type ContentStatus = 'planned' | 'in_progress' | 'review' | 'approved' | 'published'
export type ContentCat = 'social' | 'performance' | 'seo'

export interface PlanItem {
  id: string
  month: string
  client_id: string
  cat: ContentCat
  type: string
  title: string
  brief: string
  refs: { label: string }[]
  assignee_id: string
  effort: 1 | 2 | 3 | 4 | 5
  day: number | null
  status: ContentStatus
  created_at: string
}

export interface Task {
  id: string
  title: string
  client_id: string
  type: string
  assignee_id: string
  due: string
  priority: 'Low' | 'Medium' | 'High'
  done: boolean
  idea?: string
  hook?: string
  format?: string
  refs?: { label: string }[]
  created_at: string
}

export interface AttendanceRecord {
  id: string
  user_id: string
  date: string
  check_in: string | null
  check_out: string | null
  break_minutes: number
  created_at: string
}

export type LeaveType = 'sick' | 'casual' | 'annual' | 'wfh'
export type RequestStatus = 'pending' | 'approved' | 'rejected'

export interface AttendanceRequest {
  id: string
  user_id: string
  type: 'correction' | 'leave'
  date: string                  // for correction: the day; for leave: start date
  leave_end?: string            // for leave: end date
  leave_type?: LeaveType
  check_in?: string             // for correction
  check_out?: string            // for correction
  reason: string
  status: RequestStatus
  reviewed_by?: string
  reviewed_at?: string
  rejection_reason?: string
  created_at: string
}

export interface Deal {
  id: string
  name: string
  company: string
  value: number
  stage: 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'closed'
  probability: number
  owner_id: string
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  text: string
  type: 'warning' | 'info' | 'success'
  read: boolean
  created_at: string
}
