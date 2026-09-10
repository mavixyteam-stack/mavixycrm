import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/notify'

// Public: the shared invoice page reads the invoice by its token (no auth).
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const admin = adminClient()

  const { data, error } = await admin
    .from('invoices')
    .select('number, company, client_name, line_items, currency, tax_percent, discount, total, amount_paid, notes, issue_date, due_date, status, created_at')
    .eq('token', token)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  return NextResponse.json(data)
}
