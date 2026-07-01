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

  // Fetch all profiles and filter in JS to avoid Supabase .or() escaping issues with spaces
  const { data } = await admin.from('profiles').select('email, name').limit(200)

  if (!data || data.length === 0) {
    return NextResponse.json({ email: null })
  }

  // Exact full name match first, then first-name match, then email prefix match
  const exact = data.find(p => p.name.toLowerCase() === q)
  const firstName = data.find(p => p.name.toLowerCase().split(' ')[0] === q)
  const emailPrefix = data.find(p => p.email.toLowerCase().startsWith(q))

  const match = exact || firstName || emailPrefix

  if (!match) return NextResponse.json({ email: null })
  return NextResponse.json({ email: match.email, name: match.name })
}
