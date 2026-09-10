import type { Proposal, ProposalLineItem, ProposalStatus } from '@/types'

/** Short, URL-safe, unguessable public token for a proposal link. */
export function makeProposalToken(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
}

export interface ProposalTotals {
  subtotal: number
  discount: number
  tax: number
  total: number
}

export function computeTotals(
  items: ProposalLineItem[],
  taxPercent = 0,
  discount = 0,
): ProposalTotals {
  const subtotal = (items || []).reduce((s, li) => s + (Number(li.qty) || 0) * (Number(li.rate) || 0), 0)
  const afterDiscount = Math.max(0, subtotal - (Number(discount) || 0))
  const tax = afterDiscount * ((Number(taxPercent) || 0) / 100)
  return { subtotal, discount: Number(discount) || 0, tax, total: afterDiscount + tax }
}

export const PROPOSAL_STATUS: Record<ProposalStatus, { label: string; c: string; bg: string }> = {
  draft:    { label: 'Draft',    c: '#64748B', bg: '#F1F5F9' },
  sent:     { label: 'Sent',     c: '#0EA5E9', bg: '#E0F2FE' },
  viewed:   { label: 'Viewed',   c: '#8B5CF6', bg: '#F3E8FF' },
  accepted: { label: 'Accepted', c: '#10B981', bg: '#D1FAE5' },
  rejected: { label: 'Declined', c: '#EF4444', bg: '#FEE2E2' },
}

/** Plain ₹ with grouping (proposals show exact figures, not compact L/Cr). */
export function money(n: number, currency = 'INR'): string {
  const sym = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₹'
  return `${sym}${Math.round(Number(n) || 0).toLocaleString('en-IN')}`
}

export function blankLineItem(): ProposalLineItem {
  return { desc: '', qty: 1, rate: 0 }
}

export function proposalIsExpired(p: Proposal): boolean {
  if (!p.valid_until) return false
  const today = new Date().toISOString().slice(0, 10)
  return p.valid_until < today && p.status !== 'accepted'
}

// ─── Proposal deck (branded presentation) ─────────────────────────────────────
import type { ProposalDeck, DeckCapability } from '@/types'

// Intensity 0–4 → label + heat class (matches the deck renderer palette).
export const INTENSITY = [
  { label: 'Off', h: 'h0' },
  { label: 'Light', h: 'h1' },
  { label: 'Medium', h: 'h2' },
  { label: 'Heavy', h: 'h3' },
  { label: 'Max', h: 'h4' },
] as const

export function intensityMeta(n: number) {
  return INTENSITY[Math.max(0, Math.min(4, Math.round(n || 0)))]
}

/** Total ₹ for a given month index across all services. */
export function monthTotal(deck: ProposalDeck, monthIndex: number): number {
  return (deck.services || []).reduce((s, svc) => s + (svc.cells?.[monthIndex]?.price || 0), 0)
}

/** Grand total ₹ across every month. */
export function deckTotal(deck: ProposalDeck): number {
  return (deck.months || []).reduce((s, _m, i) => s + monthTotal(deck, i), 0)
}

// Mavixy's standard capability set — used when the AI omits it.
export const DEFAULT_CAPABILITIES: DeckCapability[] = [
  { title: 'Brand & Creative', items: ['Positioning', 'Visual identity', 'Creative direction'] },
  { title: 'Digital & Tech', items: ['Website & UX', 'SEO build', 'Analytics'] },
  { title: 'Content', items: ['Strategy', 'Photo & video', 'Short-form'] },
  { title: 'Growth', items: ['Meta & Google', 'Lead generation', 'Performance'] },
  { title: 'AI & Data', items: ['Reporting', 'Optimisation', 'Automation'] },
]
