import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/notify'

const MAX_BYTES = 8 * 1024 * 1024 // 8 MB
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']

// Public: an onboarding candidate uploads a document (Aadhaar/PAN).
// Gated by a valid, still-open invite token. Stored in a private bucket.
export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null)
  if (!form) return NextResponse.json({ error: 'Expected multipart form data' }, { status: 400 })

  const token = String(form.get('token') || '')
  const kind = String(form.get('kind') || '') // 'aadhar' | 'pan'
  const file = form.get('file')

  if (!token || !['aadhar', 'pan'].includes(kind)) {
    return NextResponse.json({ error: 'token and a valid kind are required' }, { status: 400 })
  }
  if (!(file instanceof File)) return NextResponse.json({ error: 'file is required' }, { status: 400 })
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'File must be under 8 MB' }, { status: 400 })
  if (!ALLOWED.includes(file.type)) return NextResponse.json({ error: 'Use a JPG, PNG or PDF' }, { status: 400 })

  const admin = adminClient()

  // Invite must exist and still be open for submission
  const { data: invite } = await admin.from('onboarding_invites').select('id, status').eq('token', token).maybeSingle()
  if (!invite) return NextResponse.json({ error: 'Invalid link' }, { status: 404 })
  if (invite.status !== 'pending') return NextResponse.json({ error: 'This form has already been submitted' }, { status: 409 })

  // Ensure the bucket exists (idempotent), then upload
  await admin.storage.createBucket('onboarding-docs', { public: false }).catch(() => {})

  const ext = file.name.split('.').pop()?.toLowerCase() || 'bin'
  const path = `${token}/${kind}-${Date.now()}.${ext}`
  const bytes = new Uint8Array(await file.arrayBuffer())

  const { error } = await admin.storage.from('onboarding-docs').upload(path, bytes, {
    contentType: file.type,
    upsert: true,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, path })
}
