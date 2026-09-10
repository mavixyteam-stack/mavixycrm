export type Role = 'owner' | 'manager' | 'sales' | 'employee'

export type NavGroup = 'work' | 'accounts' | 'sales' | 'org'

export type Screen =
  | 'myday' | 'planner' | 'calendar' | 'contentplan' | 'dmboard'
  | 'clients' | 'client-detail' | 'reports' | 'onboarding'
  | 'pipeline' | 'leads' | 'journey' | 'invoices'
  | 'team' | 'permissions' | 'performance' | 'connections' | 'automations' | 'knowledge' | 'assistant'
  | 'attendance'

export interface Profile {
  id: string
  email: string
  name: string
  role: Role
  color: string
  initials: string
  title: string
  department?: string | null
  permissions: string[]
  telegram_chat_id?: string | null
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
  connections?: Record<string, boolean>
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
  department?: string | null   // Creative | Digital Marketing | Sales | General
  channel?: string | null      // for Digital Marketing: SEO | Google Ads | Meta Ads | …
  goal?: string | null         // the objective / target metric
  status?: string | null       // todo | in_progress | done
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
  // Lead-specific fields (populated when stage starts as 'lead')
  email?: string
  phone?: string
  source?: string
  service?: string
  budget_text?: string
  score?: 'hot' | 'warm' | 'cold'
  lead_status?: 'new' | 'contacted' | 'qualified'
  notes?: string
  follow_up_date?: string | null
  initials?: string
  color?: string
}

// ─── Client journey (end-to-end revenue lifecycle) ────────────────────────────
export type JourneyStage =
  | 'lead' | 'prospect' | 'pitch' | 'proposal' | 'contract' | 'onboarding' | 'active' | 'lost'

export interface Journey {
  id: string
  name: string                 // primary contact / opportunity name
  company: string
  contact_email?: string | null
  contact_phone?: string | null
  stage: JourneyStage
  value: number                // deal value or monthly amount (₹)
  billing?: string | null      // one-time | monthly | retainer
  source?: string | null
  service?: string | null      // what they want (Social, Ads, SEO, Full-service…)
  owner_id?: string | null     // account owner (profile id)
  probability?: number | null
  notes?: string | null
  next_step?: string | null
  next_step_date?: string | null
  client_id?: string | null    // linked client once onboarded/active
  lost_reason?: string | null
  // Lead-triage fields (used in the Leads view of the journey)
  score?: 'hot' | 'warm' | 'cold' | null
  lead_status?: 'new' | 'contacted' | 'qualified' | null
  budget_text?: string | null
  created_at: string
  updated_at?: string | null
}

export interface ProposalLineItem {
  desc: string
  qty: number
  rate: number
}

export type ProposalStatus = 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected'

// ─── Structured proposal deck (the branded, AI-generated presentation) ─────────
export interface DeckAsset { label: string }
export interface DeckCapability { title: string; items: string[] }
export interface DeckActivityGroup { heading: string; items: string[] }
export interface DeckActivity { title: string; groups: DeckActivityGroup[] }
export interface DeckOutcome { title: string; text: string }
export interface DeckMonth {
  key: string                     // "Month 1" / "Months 2-3"
  focus: string                   // "Foundation"
  objective?: string              // one-line objective
  intro?: string                  // short phase intro
  activities?: DeckActivity[]     // the "What we'll do" deep-dive
  outcomes?: DeckOutcome[]        // the "Expected outcome" grid
}
export interface DeckCell { intensity: number; price: number }   // intensity 0–4 (Off→Max)
export interface DeckService { name: string; cells: DeckCell[] } // cells align 1:1 with months
export interface DeckExtra { heading: string; body?: string; bullets?: string[] }
export interface DeckObjective { headline?: string; steps: string[] }        // the 01–06 phased overview
export interface DeckJourneyRow { period: string; focus: string; objective: string }
export interface DeckWeek { week: string; title: string; items: string[] }

export interface ProposalDeck {
  clientName: string
  clientTagline?: string
  promiseHeadline?: string        // e.g. "3-Month Digital Growth Plan"
  promiseText?: string
  opportunityHeadline?: string    // e.g. "You already have the hard part."
  opportunityBody?: string
  assets?: DeckAsset[]            // what the client already has
  objective?: DeckObjective       // the phased-approach overview
  capabilities?: DeckCapability[] // overrides Mavixy's standard set
  months: DeckMonth[]             // the phases (with deep-dives)
  services: DeckService[]         // the rows of the intensity matrix
  gstNote?: string
  journeyTable?: DeckJourneyRow[] // the month-by-month summary table
  firstThirtyDays?: DeckWeek[]    // week-by-week rollout
  extras?: DeckExtra[]            // any extra custom sections
  closingHeadline?: string
  closingBody?: string
}

export interface ChatTurn { role: 'user' | 'assistant'; text: string }

export interface Proposal {
  id: string
  journey_id?: string | null
  token: string
  title: string
  company?: string | null
  client_name?: string | null
  intro?: string | null
  line_items: ProposalLineItem[]
  currency?: string | null
  tax_percent?: number | null
  discount?: number | null
  total: number
  terms?: string | null
  valid_until?: string | null
  status: ProposalStatus
  kind?: 'simple' | 'deck' | null   // 'deck' = branded AI presentation
  deck?: ProposalDeck | null
  chat?: ChatTurn[] | null          // the Proposal Studio conversation
  created_by?: string | null
  sent_at?: string | null
  viewed_at?: string | null
  accepted_at?: string | null
  created_at: string
  updated_at?: string | null
}

// ─── Invoices ─────────────────────────────────────────────────────────────────
export type InvoiceStatus = 'draft' | 'sent' | 'partial' | 'paid'

export interface Invoice {
  id: string
  number: string
  journey_id?: string | null
  client_id?: string | null
  company?: string | null
  client_name?: string | null
  contact_email?: string | null
  line_items: ProposalLineItem[]
  currency?: string | null
  tax_percent?: number | null
  discount?: number | null
  total: number
  amount_paid?: number | null
  notes?: string | null
  issue_date?: string | null
  due_date?: string | null
  status: InvoiceStatus
  token: string
  created_by?: string | null
  sent_at?: string | null
  paid_at?: string | null
  last_reminder_at?: string | null
  created_at: string
  updated_at?: string | null
}

// ─── Contracts / agreements ───────────────────────────────────────────────────
export type ContractStatus = 'draft' | 'sent' | 'viewed' | 'signed' | 'declined'

export interface Contract {
  id: string
  journey_id?: string | null
  proposal_id?: string | null
  token: string
  title: string
  company?: string | null
  client_name?: string | null
  contact_email?: string | null
  body: string
  status: ContractStatus
  signer_name?: string | null
  created_by?: string | null
  sent_at?: string | null
  viewed_at?: string | null
  signed_at?: string | null
  created_at: string
  updated_at?: string | null
}

export type NotificationType = 'warning' | 'info' | 'success' | 'reminder' | 'request'

export interface Notification {
  id: string
  user_id: string
  title?: string | null
  text: string
  type: NotificationType
  link?: string | null       // screen to open when clicked, e.g. 'attendance'
  read: boolean
  created_at: string
}
