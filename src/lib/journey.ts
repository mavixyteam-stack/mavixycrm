// ─── Client journey: the end-to-end revenue lifecycle ─────────────────────────
// Every prospect flows through these stages, from first contact to a paying,
// active client. Each stage carries the ONE thing to do next, so the board
// doubles as a playbook.

import type { JourneyStage } from '@/types'

export interface StageDef {
  key: JourneyStage
  label: string
  short: string
  c: string       // accent colour
  bg: string      // soft background
  hint: string    // the next move at this stage
  action?: string // label for the primary CTA (feature added in later phases)
}

// The ordered, active pipeline (lost is terminal and lives off to the side).
export const JOURNEY_STAGES: StageDef[] = [
  { key: 'lead',       label: 'New Lead',      short: 'Lead',     c: '#64748B', bg: '#F1F5F9', hint: 'Qualify — is there a real need, budget, and a decision-maker?' },
  { key: 'prospect',   label: 'Prospect',      short: 'Prospect', c: '#0EA5E9', bg: '#E0F2FE', hint: 'Book a discovery call. Understand goals and scope.' },
  { key: 'pitch',      label: 'Pitching',      short: 'Pitch',    c: '#8B5CF6', bg: '#F3E8FF', hint: 'Present your approach. Align on deliverables and price.' },
  { key: 'proposal',   label: 'Proposal',      short: 'Proposal', c: '#F59E0B', bg: '#FEF3C7', hint: 'Design and share the proposal, then follow up.', action: 'Build proposal' },
  { key: 'contract',   label: 'Contract',      short: 'Contract', c: '#F97316', bg: '#FFEDD5', hint: 'Send the agreement and get it signed.', action: 'Send agreement' },
  { key: 'onboarding', label: 'Onboarding',    short: 'Onboard',  c: '#14B8A6', bg: '#CCFBF1', hint: 'Kickoff call, gather access, set the first deliverables.', action: 'Start onboarding' },
  { key: 'active',     label: 'Active Client', short: 'Active',   c: '#10B981', bg: '#D1FAE5', hint: 'Deliver, report, and invoice on schedule.', action: 'Open client' },
]

export const LOST_STAGE: StageDef = {
  key: 'lost', label: 'Lost', short: 'Lost', c: '#EF4444', bg: '#FEE2E2',
  hint: 'Marked lost. Revisit later if the timing changes.',
}

export const ALL_STAGES: StageDef[] = [...JOURNEY_STAGES, LOST_STAGE]

export const BILLING_OPTIONS = ['one-time', 'monthly', 'retainer'] as const
export const SERVICE_OPTIONS = ['Social Media', 'Performance / Ads', 'SEO', 'Full-service', 'Branding', 'Web', 'Content', 'Other']
export const SOURCE_OPTIONS = ['Referral', 'Inbound', 'Outbound', 'Social', 'Event', 'Website', 'Cold call', 'Other']

export const stageDef = (key: string): StageDef => ALL_STAGES.find(s => s.key === key) || JOURNEY_STAGES[0]
export const stageIndex = (key: string): number => JOURNEY_STAGES.findIndex(s => s.key === key)

export function nextStage(key: string): JourneyStage | null {
  const i = stageIndex(key)
  return i >= 0 && i < JOURNEY_STAGES.length - 1 ? JOURNEY_STAGES[i + 1].key : null
}

// Default win-probability by stage — used for weighted pipeline value.
export const STAGE_PROBABILITY: Record<JourneyStage, number> = {
  lead: 10, prospect: 25, pitch: 40, proposal: 60, contract: 80, onboarding: 95, active: 100, lost: 0,
}

/** ₹ formatting — compact for big numbers (₹1.2L, ₹3.4Cr). */
export function inr(n: number): string {
  const v = Math.round(n || 0)
  if (v >= 1_00_00_000) return `₹${(v / 1_00_00_000).toFixed(v % 1_00_00_000 ? 1 : 0)}Cr`
  if (v >= 1_00_000) return `₹${(v / 1_00_000).toFixed(v % 1_00_000 ? 1 : 0)}L`
  if (v >= 1_000) return `₹${(v / 1_000).toFixed(v % 1_000 ? 1 : 0)}k`
  return `₹${v.toLocaleString('en-IN')}`
}
