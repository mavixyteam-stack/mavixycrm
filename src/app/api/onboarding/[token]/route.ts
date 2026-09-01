import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/notify'

// Public: the onboarding form reads the invite's basic state (no auth).
// Only non-sensitive fields are returned.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const admin = adminClient()

  const { data, error } = await admin
    .from('onboarding_invites')
    .select('token, role, title, status, full_name')
    .eq('token', token)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  return NextResponse.json({
    token: data.token,
    role: data.role,
    title: data.title,
    status: data.status,
    full_name: data.full_name,
  })
}
