import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { adminClient, createNotifications } from '@/lib/notify'

// The app is IST-centric; correction times are entered as local wall-clock.
const IST_OFFSET = '+05:30'

function toISO(date: string, hhmm: string | null | undefined): string | null {
  if (!hhmm) return null
  const t = hhmm.length === 5 ? `${hhmm}:00` : hhmm
  const d = new Date(`${date}T${t}${IST_OFFSET}`)
  return isNaN(d.getTime()) ? null : d.toISOString()
}

const LEAVE_LABELS: Record<string, string> = {
  sick: 'Sick leave', casual: 'Casual leave', annual: 'Annual leave', wfh: 'Work from home',
}

export async function POST(req: NextRequest) {
  const sb = await createServerClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = adminClient()

  // Only owners/managers may review requests.
  const { data: reviewer } = await admin.from('profiles').select('role, name').eq('id', user.id).single()
  if (!reviewer || !['owner', 'manager'].includes(reviewer.role)) {
    return NextResponse.json({ error: 'Only owners or managers can review requests' }, { status: 403 })
  }

  const { requestId, decision, rejectionReason } = await req.json()
  if (!requestId || !['approved', 'rejected'].includes(decision)) {
    return NextResponse.json({ error: 'requestId and a valid decision are required' }, { status: 400 })
  }

  const { data: request, error: reqErr } = await admin
    .from('attendance_requests').select('*').eq('id', requestId).single()
  if (reqErr || !request) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 })
  }

  // 1. Update the request itself
  const { error: updErr } = await admin.from('attendance_requests').update({
    status: decision,
    reviewed_by: user.id,
    reviewed_at: new Date().toISOString(),
    rejection_reason: decision === 'rejected' ? (rejectionReason || null) : null,
  }).eq('id', requestId)
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

  // 2. If an approved time correction, write the corrected times into attendance
  let attendanceApplied = false
  if (decision === 'approved' && request.type === 'correction') {
    const checkIn = toISO(request.date, request.check_in)
    const checkOut = toISO(request.date, request.check_out)

    const { data: existing } = await admin.from('attendance')
      .select('id, break_minutes').eq('user_id', request.user_id).eq('date', request.date).maybeSingle()

    if (existing) {
      await admin.from('attendance').update({ check_in: checkIn, check_out: checkOut }).eq('id', existing.id)
    } else {
      await admin.from('attendance').insert({
        user_id: request.user_id, date: request.date,
        check_in: checkIn, check_out: checkOut, break_minutes: 0,
      })
    }
    attendanceApplied = true
  }

  // 3. Notify the employee
  const kind = request.type === 'leave'
    ? (request.leave_type ? LEAVE_LABELS[request.leave_type] || 'Leave' : 'Leave')
    : 'Time correction'
  const reviewerName = reviewer.name?.split(' ')[0] || 'Your manager'
  const text = decision === 'approved'
    ? `${reviewerName} approved your ${kind.toLowerCase()} request for ${request.date}.`
    : `${reviewerName} declined your ${kind.toLowerCase()} request for ${request.date}${rejectionReason ? ` — ${rejectionReason}` : ''}.`

  await createNotifications(admin, [request.user_id], {
    title: decision === 'approved' ? 'Request approved' : 'Request declined',
    text,
    type: decision === 'approved' ? 'success' : 'warning',
    link: 'attendance',
  })

  return NextResponse.json({ ok: true, attendanceApplied })
}
