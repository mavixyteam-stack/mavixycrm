import type { Journey, ContractStatus } from '@/types'
export { makeProposalToken as makeContractToken } from '@/lib/proposal'
import { inr } from '@/lib/journey'

export const CONTRACT_STATUS: Record<ContractStatus, { label: string; c: string; bg: string }> = {
  draft:    { label: 'Draft',    c: '#64748B', bg: '#F1F5F9' },
  sent:     { label: 'Sent',     c: '#0EA5E9', bg: '#E0F2FE' },
  viewed:   { label: 'Viewed',   c: '#8B5CF6', bg: '#F3E8FF' },
  signed:   { label: 'Signed',   c: '#10B981', bg: '#D1FAE5' },
  declined: { label: 'Declined', c: '#EF4444', bg: '#FEE2E2' },
}

/** A sensible starting agreement, prefilled from the journey. Fully editable. */
export function defaultContractBody(j: Journey, agencyName = 'Mavixy'): string {
  const client = j.company || j.name || 'the Client'
  const service = j.service || 'marketing services'
  const fee = j.value ? `${inr(j.value)}${j.billing && j.billing !== 'one-time' ? ` per ${j.billing === 'monthly' ? 'month' : 'month (retainer)'}` : ''}` : '[fee]'
  const date = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })

  return `This Service Agreement ("Agreement") is made on ${date} between ${agencyName} ("Agency") and ${client} ("Client").

1. SCOPE OF WORK
The Agency will provide ${service} as discussed and detailed in the accompanying proposal. Any work beyond the agreed scope will be quoted separately.

2. FEES & PAYMENT
The Client agrees to pay the Agency ${fee}. Invoices are payable within 7 days of the invoice date unless otherwise agreed. A monthly engagement continues until either party gives 30 days' written notice.

3. TIMELINE
Work begins once this Agreement is signed and any required advance is received. Timelines shared are good-faith estimates and depend on timely Client feedback and access.

4. CLIENT RESPONSIBILITIES
The Client will provide brand assets, access, approvals, and feedback in a timely manner so the Agency can meet agreed timelines.

5. OWNERSHIP
On full payment, final approved deliverables become the property of the Client. The Agency may showcase the work in its portfolio unless the Client requests otherwise in writing.

6. CONFIDENTIALITY
Both parties agree to keep each other's confidential information private.

7. TERMINATION
Either party may end this Agreement with 30 days' written notice. The Client remains responsible for fees for work completed up to the termination date.

By signing below, both parties agree to the terms above.`
}
