import { createClient } from './supabase/client'
import type { PlanItem, Task, Deal, Client, AttendanceRequest } from '@/types'

// ─── Server-side write helper (bypasses RLS via service role key) ─────────────

async function apiUpsert(table: string, row: Record<string, unknown>) {
  const res = await fetch('/api/data/upsert', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ table, row }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(body.error || `Save to ${table} failed`)
  }
}

async function apiDelete(table: string, id: string) {
  const res = await fetch('/api/data/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ table, id }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(body.error || `Delete from ${table} failed`)
  }
}

// ─── Load all workspace data after login ─────────────────────────────────────

export async function loadWorkspace() {
  const sb = createClient()
  const [
    { data: clients },
    { data: planItems },
    { data: tasks },
    { data: deals },
    { data: profiles },
    { data: attReqs },
  ] = await Promise.all([
    sb.from('clients').select('*').order('created_at'),
    sb.from('plan_items').select('*').order('created_at'),
    sb.from('tasks').select('*').order('created_at'),
    sb.from('deals').select('*').order('created_at'),
    sb.from('profiles').select('*').order('created_at'),
    sb.from('attendance_requests').select('*').order('created_at', { ascending: false }),
  ])
  return {
    clients: clients || [],
    planItems: planItems || [],
    tasks: tasks || [],
    deals: deals || [],
    profiles: profiles || [],
    attendanceRequests: attReqs || [],
  }
}

// ─── Plan items ───────────────────────────────────────────────────────────────

export async function dbUpsertPlanItem(item: PlanItem) {
  await apiUpsert('plan_items', {
    id: item.id,
    month: item.month,
    client_id: item.client_id,
    cat: item.cat,
    type: item.type,
    title: item.title,
    brief: item.brief,
    refs: item.refs,
    assignee_id: item.assignee_id || null,
    effort: item.effort,
    day: item.day,
    status: item.status,
  })
}

export async function dbDeletePlanItem(id: string) {
  await apiDelete('plan_items', id)
}

// ─── Clients ─────────────────────────────────────────────────────────────────

export async function dbUpsertClient(client: Client) {
  await apiUpsert('clients', {
    id: client.id,
    name: client.name,
    initials: client.initials,
    color: client.color,
    health: client.health,
    services: client.services,
    type: client.type,
    industry: client.industry || null,
    contact_name: client.contact_name || null,
    contact_email: client.contact_email || null,
    whatsapp: client.whatsapp || null,
    account_owner_id: client.account_owner_id || null,
    posts_per_month: client.posts_per_month || null,
    monthly_retainer: client.monthly_retainer || null,
    ai_brief: client.ai_brief || null,
    about_business: client.about_business || null,
    target_audience: client.target_audience || null,
    brand_voice: client.brand_voice || null,
    reference_links: client.reference_links || null,
    connections: client.connections || {},
  })
}

export async function dbDeleteClient(id: string) {
  const sb = createClient()
  await sb.from('plan_items').delete().eq('client_id', id)
  await sb.from('tasks').delete().eq('client_id', id)
  await apiDelete('clients', id)
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

export async function dbUpsertTask(task: Task) {
  await apiUpsert('tasks', {
    id: task.id,
    title: task.title,
    client_id: task.client_id || null,
    type: task.type,
    assignee_id: task.assignee_id || null,
    due: task.due,
    priority: task.priority,
    done: task.done,
    idea: task.idea || null,
    hook: task.hook || null,
    format: task.format || null,
    refs: task.refs || null,
    department: task.department || null,
    channel: task.channel || null,
    goal: task.goal || null,
    status: task.status || null,
  })
}

// ─── Deals / Leads ────────────────────────────────────────────────────────────

export async function dbDeleteDeal(id: string) {
  await apiDelete('deals', id)
}

export async function dbUpsertDeal(deal: Deal) {
  await apiUpsert('deals', {
    id: deal.id,
    name: deal.name,
    company: deal.company,
    value: deal.value,
    stage: deal.stage,
    probability: deal.probability,
    owner_id: deal.owner_id || null,
    email: deal.email || null,
    phone: deal.phone || null,
    source: deal.source || null,
    service: deal.service || null,
    budget_text: deal.budget_text || null,
    score: deal.score || null,
    lead_status: deal.lead_status || null,
    notes: deal.notes || null,
    follow_up_date: deal.follow_up_date || null,
    initials: deal.initials || null,
    color: deal.color || null,
  })
}

// ─── Work logs (end-of-day updates) ──────────────────────────────────────────

export async function dbUpsertWorkLog(userId: string, note: string) {
  const d = new Date()
  const date = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  await apiUpsert('work_logs', {
    id: crypto.randomUUID(),
    user_id: userId,
    date,
    note,
  })
}

// ─── Attendance check-in / check-out ─────────────────────────────────────────

function localDateStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

export async function dbCheckIn(userId: string) {
  await apiUpsert('attendance', {
    user_id: userId,
    date: localDateStr(),
    check_in: new Date().toISOString(),
    check_out: null,
    break_minutes: 0,
  })
}

export async function dbCheckOut(userId: string, breakMinutes: number) {
  const sb = createClient()
  const { data: existing } = await sb
    .from('attendance')
    .select('*')
    .eq('user_id', userId)
    .eq('date', localDateStr())
    .maybeSingle()

  await apiUpsert('attendance', {
    ...(existing || {}),
    user_id: userId,
    date: localDateStr(),
    check_out: new Date().toISOString(),
    break_minutes: breakMinutes,
  })
}

// ─── Attendance requests ──────────────────────────────────────────────────────

export async function dbUpsertAttendanceRequest(req: AttendanceRequest) {
  await apiUpsert('attendance_requests', {
    id: req.id,
    user_id: req.user_id,
    type: req.type,
    date: req.date,
    leave_end: req.leave_end || null,
    leave_type: req.leave_type || null,
    check_in: req.check_in || null,
    check_out: req.check_out || null,
    reason: req.reason,
    status: req.status,
    reviewed_by: req.reviewed_by || null,
    reviewed_at: req.reviewed_at || null,
    rejection_reason: req.rejection_reason || null,
  })
}

export async function dbUpdateAttendanceRequest(
  id: string,
  status: 'approved' | 'rejected',
  _reviewed_by: string,
  rejection_reason?: string,
) {
  // Routed server-side: applies approved corrections to the attendance
  // record and notifies the employee, all with the service role.
  const res = await fetch('/api/attendance/review', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requestId: id, decision: status, rejectionReason: rejection_reason }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(body.error || 'Review failed')
  }
}

// ─── Notifications ────────────────────────────────────────────────────────────

export async function loadNotifications(userId: string) {
  const sb = createClient()
  const { data } = await sb
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)
  return data || []
}

export async function notifyUsers(
  userIds: string[],
  n: { title?: string; text: string; type?: string; link?: string },
) {
  if (userIds.length === 0) return
  await fetch('/api/notifications/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_ids: userIds, ...n }),
  }).catch(() => {}) // notifications are best-effort; never block the action
}

export async function markNotificationRead(id: string) {
  await fetch('/api/notifications/read', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  }).catch(() => {})
}

export async function markAllNotificationsRead() {
  await fetch('/api/notifications/read', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ all: true }),
  }).catch(() => {})
}
