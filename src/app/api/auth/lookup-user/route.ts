import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Public endpoint — looks up a user's email by name/username so they can log in without remembering their email.
// Only returns the email (not password or sensitive data). Attacker still needs the password.
export async function POST(req: NextRequest) {
  const { query } = await req.json()
  if (!query || typeof query !== 'string') {
    return NextResponse.json({ email: null }, { status: 400 })
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
  }

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)
  const q = query.trim().toLowerCase()

  // Search by full name (case-insensitive), then by first name
  const { data } = await admin
    .from('profiles')
    .select('email, name')
    .or(`name.ilike.${q},name.ilike.${q} %,email.ilike.${q}`)
    .limit(5)

  if (!data || data.length === 0) {
    return NextResponse.json({ email: null })
  }

  // Prefer exact name match, then first-name match, then email match
  const exact = data.find(p => p.name.toLowerCase() === q)
  const firstName = data.find(p => p.name.toLowerCase().startsWith(q + ' ') || p.name.toLowerCase() === q)
  const match = exact || firstName || data[0]

  return NextResponse.json({ email: match.email, name: match.name })
}
