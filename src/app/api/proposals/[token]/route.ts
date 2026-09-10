import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/notify'

// Public: the shared proposal page reads the proposal by its token (no auth).
// Viewing a 'sent' proposal flips it to 'viewed' so the agency sees engagement.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const admin = adminClient()

  const { data, error } = await admin
    .from('proposals')
    .select('token, title, company, client_name, intro, line_items, currency, tax_percent, discount, total, terms, valid_until, status, kind, deck, accepted_at, created_at')
    .eq('token', token)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  // First open of a sent proposal → mark viewed (best-effort).
  if (data.status === 'sent') {
    await admin.from('proposals')
      .update({ status: 'viewed', viewed_at: new Date().toISOString() })
      .eq('token', token)
      .then(r => r, () => null)
    data.status = 'viewed'
  }

  return NextResponse.json(data)
}
