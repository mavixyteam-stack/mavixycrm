import { createClient } from './supabase/client'
import type { PlanItem, Task, Deal, Client, AttendanceRequest } from '@/types'

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
  const sb = createClient()
  const { error } = await sb.from('plan_items').upsert({
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
  if (error) { console.error('upsertPlanItem', error); throw error }
}

export async function dbDeletePlanItem(id: string) {
  const sb = createClient()
  await sb.from('plan_items').delete().eq('id', id)
}

// ─── Clients ─────────────────────────────────────────────────────────────────

export async function dbUpsertClient(client: Client) {
  const sb = createClient()
  const payload: Record<string, unknown> = {
    id: client.id,
    name: client.name,
    initials: client.initials,
    color: client.color,
    health: client.health,
    services: client.services,
    type: client.type,
    industry: client.industry,
    contact_name: client.contact_name,
    contact_email: client.contact_email,
    whatsapp: client.whatsapp,
    account_owner_id: client.account_owner_id || null,
    posts_per_month: client.posts_per_month,
    monthly_retainer: client.monthly_retainer,
    ai_brief: client.ai_brief,
    about_business: client.about_business,
    target_audience: client.target_audience,
    brand_voice: client.brand_voice,
    reference_links: client.reference_links,
  }
  // connections column may not exist if migration hasn't been run yet — try with, fall back without
  const { error } = await sb.from('clients').upsert({ ...payload, connections: client.connections || {} })
  if (error) {
    console.warn('upsertClient with connections failed, retrying without:', error.message)
    const { error: error2 } = await sb.from('clients').upsert(payload)
    if (error2) { console.error('upsertClient', error2); throw error2 }
  }
}

export async function dbDeleteClient(id: string) {
  const sb = createClient()
  // Cascade: delete related plan items and tasks first
  await sb.from('plan_items').delete().eq('client_id', id)
  await sb.from('tasks').delete().eq('client_id', id)
  const { error } = await sb.from('clients').delete().eq('id', id)
  if (error) console.error('deleteClient', error)
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

export async function dbUpsertTask(task: Task) {
  const sb = createClient()
  const { error } = await sb.from('tasks').upsert({
    id: task.id,
    title: task.title,
    client_id: task.client_id || null,
    type: task.type,
    assignee_id: task.assignee_id || null,
    due: task.due,
    priority: task.priority,
    done: task.done,
    idea: task.idea,
    hook: task.hook,
    format: task.format,
    refs: task.refs,
  })
  if (error) console.error('upsertTask', error)
}

// ─── Deals ────────────────────────────────────────────────────────────────────

export async function dbUpsertDeal(deal: Deal) {
  const sb = createClient()
  const { error } = await sb.from('deals').upsert({
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
    initials: deal.initials || null,
    color: deal.color || null,
  })
  if (error) { console.error('upsertDeal', error); throw error }
}

// ─── Attendance check-in / check-out ─────────────────────────────────────────

function localDateStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

export async function dbCheckIn(userId: string) {
  const sb = createClient()
  const { error } = await sb.from('attendance').upsert({
    user_id: userId,
    date: localDateStr(),
    check_in: new Date().toISOString(),
    check_out: null,
    break_minutes: 0,
  }, { onConflict: 'user_id,date' })
  if (error) { console.error('dbCheckIn', error); throw error }
}

export async function dbCheckOut(userId: string, breakMinutes: number) {
  const sb = createClient()
  const { error } = await sb.from('attendance')
    .update({ check_out: new Date().toISOString(), break_minutes: breakMinutes })
    .eq('user_id', userId).eq('date', localDateStr())
  if (error) { console.error('dbCheckOut', error); throw error }
}

// ─── Attendance requests ──────────────────────────────────────────────────────

export async function dbUpsertAttendanceRequest(req: AttendanceRequest) {
  const sb = createClient()
  const { error } = await sb.from('attendance_requests').upsert({
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
  if (error) console.error('upsertAttendanceRequest', error)
}

export async function dbUpdateAttendanceRequest(
  id: string,
  status: 'approved' | 'rejected',
  reviewed_by: string,
  rejection_reason?: string,
) {
  const sb = createClient()
  const { error } = await sb.from('attendance_requests').update({
    status,
    reviewed_by,
    reviewed_at: new Date().toISOString(),
    rejection_reason: rejection_reason || null,
  }).eq('id', id)
  if (error) console.error('updateAttendanceRequest', error)
}
