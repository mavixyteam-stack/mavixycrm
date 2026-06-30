import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// One-time owner setup endpoint.
// Safe to leave deployed — it checks for an existing owner and refuses if one exists.
export async function GET() {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Block if an owner already exists
  const { data: existing } = await admin
    .from('profiles')
    .select('id')
    .eq('role', 'owner')
    .limit(1)

  if (existing && existing.length > 0) {
    return NextResponse.json({ error: 'Owner account already exists. Use the Team screen to manage users.' }, { status: 409 })
  }

  // Create the owner account
  const { data, error } = await admin.auth.admin.createUser({
    email: 'mavixyteam@gmail.com',
    password: 'Mavixy@2026',
    email_confirm: true,
    user_metadata: {
      name: 'Gaurang Patel',
      role: 'owner',
      title: 'Founder',
      color: '#FF5C1F',
    },
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Ensure the profile trigger ran and update role to owner explicitly
  await admin
    .from('profiles')
    .upsert({
      id: data.user.id,
      email: 'mavixyteam@gmail.com',
      name: 'Gaurang Patel',
      initials: 'GP',
      role: 'owner',
      title: 'Founder',
      color: '#FF5C1F',
    })

  return NextResponse.json({
    ok: true,
    message: 'Owner account created. You can now sign in.',
    email: 'mavixyteam@gmail.com',
    password: 'Mavixy@2026',
  })
}
