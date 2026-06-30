import { createClient } from './supabase/client'
import { SEED_CLIENTS, SEED_TEAM, SEED_PLAN_ITEMS } from './seed-data'
import type { PlanItem, Task, Deal, Client } from '@/types'

// ─── Load all workspace data after login ─────────────────────────────────────

export async function loadWorkspace() {
  const sb = createClient()
  const [
    { data: clients },
    { data: planItems },
    { data: tasks },
    { data: deals },
    { data: profiles },
  ] = await Promise.all([
    sb.from('clients').select('*').order('created_at'),
    sb.from('plan_items').select('*').order('created_at'),
    sb.from('tasks').select('*').order('created_at'),
    sb.from('deals').select('*').order('created_at'),
    sb.from('profiles').select('*').order('created_at'),
  ])
  return {
    clients: clients || [],
    planItems: planItems || [],
    tasks: tasks || [],
    deals: deals || [],
    profiles: profiles || [],
  }
}

// ─── Seed demo data for first-time users ─────────────────────────────────────

export async function seedDemoData() {
  const sb = createClient()

  // Insert seed clients
  const clientRows = SEED_CLIENTS.map(c => ({
    name: c.name,
    initials: c.initials,
    color: c.color,
    health: c.health,
    services: c.services,
    type: c.type,
  }))
  const { data: insertedClients, error: ce } = await sb
    .from('clients')
    .insert(clientRows)
    .select()
  if (ce || !insertedClients) return null

  // Build slug → UUID map
  const slugMap: Record<string, string> = {}
  insertedClients.forEach((c: any, i: number) => {
    slugMap[SEED_CLIENTS[i].id] = c.id
  })

  // Get current profiles to map assignees
  const { data: profiles } = await sb.from('profiles').select('id, name, initials, color, title')
  const profileMap: Record<string, string> = {}
  if (profiles) {
    SEED_TEAM.forEach(st => {
      const match = profiles.find((p: any) =>
        p.name?.toLowerCase().includes(st.name.split(' ')[0].toLowerCase())
      )
      if (match) profileMap[st.id] = match.id
    })
  }

  // Default to first profile for unmatched assignees
  const defaultAssigneeId = profiles?.[0]?.id || null

  // Insert seed plan items
  const planRows = (SEED_PLAN_ITEMS as any[]).map(it => ({
    month: it.month,
    client_id: slugMap[it.client_id] || null,
    cat: it.cat,
    type: it.type,
    title: it.title,
    brief: it.brief,
    refs: it.refs,
    assignee_id: profileMap[it.assignee_id] || defaultAssigneeId,
    effort: it.effort,
    day: it.day,
    status: it.status,
  }))

  await sb.from('plan_items').insert(planRows)

  return { clients: insertedClients, slugMap }
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
    assignee_id: item.assignee_id,
    effort: item.effort,
    day: item.day,
    status: item.status,
  })
  if (error) console.error('upsertPlanItem', error)
}

export async function dbDeletePlanItem(id: string) {
  const sb = createClient()
  await sb.from('plan_items').delete().eq('id', id)
}

// ─── Clients ─────────────────────────────────────────────────────────────────

export async function dbUpsertClient(client: Client) {
  const sb = createClient()
  const { error } = await sb.from('clients').upsert({
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
    account_owner_id: client.account_owner_id,
    posts_per_month: client.posts_per_month,
    monthly_retainer: client.monthly_retainer,
    ai_brief: client.ai_brief,
    about_business: client.about_business,
    target_audience: client.target_audience,
    brand_voice: client.brand_voice,
    reference_links: client.reference_links,
  })
  if (error) console.error('upsertClient', error)
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

export async function dbUpsertTask(task: Task) {
  const sb = createClient()
  const { error } = await sb.from('tasks').upsert({
    id: task.id,
    title: task.title,
    client_id: task.client_id,
    type: task.type,
    assignee_id: task.assignee_id,
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
    owner_id: deal.owner_id,
  })
  if (error) console.error('upsertDeal', error)
}
