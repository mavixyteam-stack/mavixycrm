import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/notify'

// Public: the signing page reads the agreement by token (no auth).
// Opening a 'sent' agreement flips it to 'viewed'.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const admin = adminClient()

  const { data, error } = await admin
    .from('contracts')
    .select('token, title, company, client_name, body, status, signer_name, signed_at, created_at')
    .eq('token', token)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  if (data.status === 'sent') {
    await admin.from('contracts').update({ status: 'viewed', viewed_at: new Date().toISOString() }).eq('token', token).then(r => r, () => null)
    data.status = 'viewed'
  }

  return NextResponse.json(data)
}
