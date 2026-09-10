import type { Invoice, InvoiceStatus } from '@/types'
export { makeProposalToken as makeInvoiceToken, computeTotals, money } from '@/lib/proposal'

// A derived status includes 'overdue', which is never stored — it's computed
// from the due date so the board is always truthful without a nightly job.
export type DerivedStatus = InvoiceStatus | 'overdue'

export const INVOICE_STATUS: Record<DerivedStatus, { label: string; c: string; bg: string }> = {
  draft:   { label: 'Draft',   c: '#64748B', bg: '#F1F5F9' },
  sent:    { label: 'Sent',    c: '#0EA5E9', bg: '#E0F2FE' },
  partial: { label: 'Partial', c: '#F59E0B', bg: '#FEF3C7' },
  overdue: { label: 'Overdue', c: '#EF4444', bg: '#FEE2E2' },
  paid:    { label: 'Paid',    c: '#10B981', bg: '#D1FAE5' },
}

const today = () => new Date().toISOString().slice(0, 10)

export function balanceDue(inv: Invoice): number {
  return Math.max(0, (inv.total || 0) - (inv.amount_paid || 0))
}

export function isOverdue(inv: Invoice): boolean {
  if (inv.status === 'paid' || inv.status === 'draft') return false
  return !!inv.due_date && inv.due_date < today() && balanceDue(inv) > 0
}

/** The status to show — folds in overdue and partial. */
export function derivedStatus(inv: Invoice): DerivedStatus {
  if (inv.status === 'paid' || balanceDue(inv) === 0) return 'paid'
  if (isOverdue(inv)) return 'overdue'
  if ((inv.amount_paid || 0) > 0) return 'partial'
  return inv.status
}

export function daysUntilDue(inv: Invoice): number | null {
  if (!inv.due_date) return null
  const ms = new Date(inv.due_date + 'T00:00:00').getTime() - new Date(today() + 'T00:00:00').getTime()
  return Math.round(ms / 86400000)
}

/** Next sequential invoice number, e.g. INV-0007. */
export function nextInvoiceNumber(existing: Invoice[]): string {
  let max = 0
  for (const inv of existing) {
    const m = /(\d+)\s*$/.exec(inv.number || '')
    if (m) max = Math.max(max, parseInt(m[1], 10))
  }
  return `INV-${String(max + 1).padStart(4, '0')}`
}
