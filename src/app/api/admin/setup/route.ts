import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const USERS = [
  {
    email: 'mavixyteam@gmail.com',
    password: 'Mavixy@2026',
    name: 'Gaurang Patel',
    initials: 'GP',
    role: 'owner',
    title: 'Founder',
    color: '#FF5C1F',
  },
  {
    email: 'manager@mavixy.com',
    password: 'Manager@2026',
    name: 'Dev Sharma',
    initials: 'DS',
    role: 'manager',
    title: 'Operations Manager',
    color: '#8B5CF6',
  },
  {
    email: 'sales@mavixy.com',
    password: 'Sales@2026',
    name: 'Ira Nair',
    initials: 'IN',
    role: 'sales',
    title: 'Account Manager',
    color: '#2563EB',
  },
  {
    email: 'designer@mavixy.com',
    password: 'Employee@2026',
    name: 'Aanya Mehra',
    initials: 'AM',
    role: 'employee',
    title: 'Designer',
    color: '#0EA5A4',
  },
]

export async function GET() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({
      error: 'SUPABASE_SERVICE_ROLE_KEY is not set on this server.',
      fix: 'Add it in Vercel → Project → Settings → Environment Variables, then redeploy.',
    }, { status: 500 })
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  )

  // Check if owner already exists
  const { data: existing } = await admin
    .from('profiles')
    .select('id')
    .eq('role', 'owner')
    .limit(1)

  if (existing && existing.length > 0) {
    return NextResponse.json({
      error: 'Setup already complete — owner account exists.',
      message: 'Sign in at mavixycrm.vercel.app with mavixyteam@gmail.com / Mavixy@2026',
    }, { status: 409 })
  }

  const results: Array<{ email: string; role: string; ok: boolean; error?: string }> = []

  for (const u of USERS) {
    // Create auth user
    const { data, error } = await admin.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { name: u.name, role: u.role, title: u.title, color: u.color },
    })

    if (error) {
      results.push({ email: u.email, role: u.role, ok: false, error: error.message })
      continue
    }

    // Upsert profile with correct role (trigger may default to 'employee')
    await admin.from('profiles').upsert({
      id: data.user.id,
      email: u.email,
      name: u.name,
      initials: u.initials,
      role: u.role,
      title: u.title,
      color: u.color,
      permissions: [],
    })

    results.push({ email: u.email, role: u.role, ok: true })
  }

  const allOk = results.every(r => r.ok)

  return NextResponse.json({
    ok: allOk,
    created: results,
    logins: USERS.map(u => ({ email: u.email, password: u.password, role: u.role })),
  })
}
