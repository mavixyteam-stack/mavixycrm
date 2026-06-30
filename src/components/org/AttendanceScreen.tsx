'use client'
import { useState, useEffect } from 'react'
import { useApp, useToast, useUpsertAttendanceRequest, useUpdateAttendanceRequest } from '@/lib/store'
import { createClient } from '@/lib/supabase/client'
import { Check, X, Plus, ChevronLeft, ChevronRight } from '@/components/ui/Icon'
import type { AttendanceRecord, AttendanceRequest, LeaveType, Profile } from '@/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────
const LEAVE_LABELS: Record<LeaveType, string> = {
  sick: 'Sick leave', casual: 'Casual leave', annual: 'Annual leave', wfh: 'Work from home',
}
const LEAVE_COLORS: Record<LeaveType, { bg: string; c: string }> = {
  sick:   { bg: '#FEF2F2', c: '#DC2626' },
  casual: { bg: '#EFF6FF', c: '#2563EB' },
  annual: { bg: '#F0FDF4', c: '#16A34A' },
  wfh:    { bg: '#F5F3FF', c: '#7C3AED' },
}

function hoursWorked(checkIn: string | null, checkOut: string | null, breakMin = 0): string {
  if (!checkIn || !checkOut) return checkIn ? 'No out' : '—'
  const [h1, m1] = checkIn.split(':').map(Number)
  const [h2, m2] = checkOut.split(':').map(Number)
  const total = (h2 * 60 + m2) - (h1 * 60 + m1) - breakMin
  if (total <= 0) return '—'
  const h = Math.floor(total / 60), m = total % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function fmt12(t: string | null | undefined): string {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2,'0')} ${ampm}`
}

function toDateStr(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`
}

function dayName(y: number, m: number, d: number): string {
  return new Date(y, m-1, d).toLocaleDateString('en-GB', { weekday: 'short' })
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function AttendanceScreen() {
  const { state, dispatch } = useApp()
  const toast = useToast()
  const upsertRequest = useUpsertAttendanceRequest()
  const updateRequest = useUpdateAttendanceRequest()

  const role = state.currentUser?.role || 'employee'
  const isOwner = role === 'owner' || role === 'manager'

  // View state
  const [tab, setTab] = useState<'calendar' | 'requests'>('calendar')
  const [monthOff, setMonthOff] = useState(0)
  const [viewUserId, setViewUserId] = useState(state.currentUser?.id || '')

  // Month data
  const [monthRecords, setMonthRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(false)

  // Correction modal
  const [corrModal, setCorrModal] = useState<{ date: string } | null>(null)
  const [corrForm, setCorrForm] = useState({ checkIn: '09:00', checkOut: '18:00', reason: '' })

  // Leave modal
  const [leaveModal, setLeaveModal] = useState(false)
  const [leaveForm, setLeaveForm] = useState({ type: 'casual' as LeaveType, start: '', end: '', reason: '' })

  // Rejection modal
  const [rejectModal, setRejectModal] = useState<{ id: string; userName: string } | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  // ── Derived values ──────────────────────────────────────────────────────────
  const now = new Date()
  const viewDate = new Date(now.getFullYear(), now.getMonth() + monthOff, 1)
  const year = viewDate.getFullYear()
  const month = viewDate.getMonth() + 1
  const daysInMonth = new Date(year, month, 0).getDate()
  const monthLabel = viewDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
  const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`

  const viewedUser = state.users.find(u => u.id === viewUserId) || state.currentUser!

  // Current user's requests
  const myRequests = state.attendanceRequests.filter(r => r.user_id === (isOwner ? viewUserId : state.currentUser?.id))
  // All pending for owner view
  const allPending = state.attendanceRequests.filter(r => r.status === 'pending')
  const pendingCount = isOwner ? allPending.length : myRequests.filter(r => r.status === 'pending').length

  // ── Load month records from Supabase ────────────────────────────────────────
  useEffect(() => {
    if (!viewUserId) return
    setLoading(true)
    const sb = createClient()
    const start = toDateStr(year, month, 1)
    const end = toDateStr(year, month, daysInMonth)
    sb.from('attendance').select('*').eq('user_id', viewUserId).gte('date', start).lte('date', end)
      .then(({ data, error }) => { setMonthRecords(error ? [] : (data || [])); setLoading(false) })
  }, [viewUserId, year, month])

  // Init viewUserId when currentUser loads
  useEffect(() => {
    if (state.currentUser && !viewUserId) setViewUserId(state.currentUser.id)
  }, [state.currentUser])

  // ── Calendar grid ───────────────────────────────────────────────────────────
  // Monday-first: Mon=0 … Sun=6
  const firstDayOfMonth = new Date(year, month-1, 1).getDay()
  const startOffset = (firstDayOfMonth + 6) % 7

  const recordForDate = (d: string) => monthRecords.find(r => r.date === d) || null
  const requestForDate = (d: string) => myRequests.find(r => r.date === d && r.type === 'correction') || null
  const leaveForDate = (d: string) => myRequests.find(r => r.type === 'leave' && r.date <= d && (r.leave_end || r.date) >= d) || null

  // Stats for the month
  const daysPresent = monthRecords.filter(r => r.check_in && r.check_out).length
  const totalMinutes = monthRecords.reduce((sum, r) => {
    if (!r.check_in || !r.check_out) return sum
    const [h1, m1] = r.check_in.split(':').map(Number)
    const [h2, m2] = r.check_out.split(':').map(Number)
    return sum + (h2*60+m2) - (h1*60+m1) - r.break_minutes
  }, 0)
  const totalHrs = Math.floor(totalMinutes / 60)
  const leaveDays = myRequests.filter(r => r.type === 'leave' && r.status === 'approved').length

  // ── Submit correction ────────────────────────────────────────────────────────
  function submitCorrection() {
    if (!corrForm.reason.trim()) { toast('Please add a reason'); return }
    if (!corrForm.checkIn || !corrForm.checkOut) { toast('Please fill in both times'); return }
    const req: AttendanceRequest = {
      id: `req-${Date.now()}`,
      user_id: state.currentUser!.id,
      type: 'correction',
      date: corrModal!.date,
      check_in: corrForm.checkIn,
      check_out: corrForm.checkOut,
      reason: corrForm.reason,
      status: 'pending',
      created_at: new Date().toISOString(),
    }
    upsertRequest(req)
    setCorrModal(null)
    setCorrForm({ checkIn: '09:00', checkOut: '18:00', reason: '' })
    toast('Correction request submitted — owner notified')
    // Simulate owner email notification
    dispatch({ type: 'SHOW_TOAST', msg: `Owner notified about your correction request` })
    setTimeout(() => dispatch({ type: 'CLEAR_TOAST' }), 3200)
  }

  // ── Submit leave ─────────────────────────────────────────────────────────────
  function submitLeave() {
    if (!leaveForm.start || !leaveForm.end) { toast('Please select dates'); return }
    if (!leaveForm.reason.trim()) { toast('Please add a reason'); return }
    const req: AttendanceRequest = {
      id: `req-${Date.now()}`,
      user_id: state.currentUser!.id,
      type: 'leave',
      date: leaveForm.start,
      leave_end: leaveForm.end,
      leave_type: leaveForm.type,
      reason: leaveForm.reason,
      status: 'pending',
      created_at: new Date().toISOString(),
    }
    upsertRequest(req)
    setLeaveModal(false)
    setLeaveForm({ type: 'casual', start: '', end: '', reason: '' })
    toast(`${LEAVE_LABELS[leaveForm.type]} request submitted`)
  }

  // ── Approve / Reject ─────────────────────────────────────────────────────────
  function approveRequest(id: string, req: AttendanceRequest) {
    updateRequest(id, 'approved', state.currentUser!.id)
    const user = state.users.find(u => u.id === req.user_id)
    toast(`Approved — ${user?.name.split(' ')[0] || 'Employee'} has been notified`)
  }

  function openReject(id: string, req: AttendanceRequest) {
    const user = state.users.find(u => u.id === req.user_id)
    setRejectModal({ id, userName: user?.name.split(' ')[0] || 'Employee' })
    setRejectReason('')
  }

  function confirmReject() {
    if (!rejectModal) return
    updateRequest(rejectModal.id, 'rejected', state.currentUser!.id, rejectReason)
    toast(`Rejected — ${rejectModal.userName} has been notified`)
    setRejectModal(null)
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  function DayCell({ day }: { day: number }) {
    const dateStr = toDateStr(year, month, day)
    const isFuture = dateStr > todayStr
    const isToday = dateStr === todayStr
    const record = recordForDate(dateStr)
    const corrReq = requestForDate(dateStr)
    const leaveReq = leaveForDate(dateStr)
    const isWeekend = [6, 0].includes(new Date(year, month-1, day).getDay())

    let borderColor = 'var(--c-border-soft)'
    let bg = '#fff'
    let statusEl: React.ReactNode = null

    if (leaveReq) {
      const lt = leaveReq.leave_type || 'casual'
      const lc = LEAVE_COLORS[lt]
      borderColor = lc.c
      bg = lc.bg + '80'
      statusEl = <span style={{ fontSize: 10, fontWeight: 700, color: lc.c, background: lc.bg, borderRadius: 4, padding: '1px 5px' }}>{LEAVE_LABELS[lt]}</span>
    } else if (corrReq) {
      borderColor = corrReq.status === 'approved' ? '#10B981' : corrReq.status === 'rejected' ? '#EF4444' : '#8B5CF6'
      bg = corrReq.status === 'approved' ? '#F0FDF4' : corrReq.status === 'rejected' ? '#FEF2F2' : '#F5F3FF'
      statusEl = <span style={{ fontSize: 10, fontWeight: 700, color: borderColor, background: bg, borderRadius: 4, padding: '1px 5px' }}>
        {corrReq.status === 'pending' ? 'Pending' : corrReq.status === 'approved' ? 'Approved' : 'Rejected'}
      </span>
    } else if (record) {
      const hasOut = !!record.check_out
      borderColor = hasOut ? '#10B981' : '#F59E0B'
      bg = hasOut ? '#F0FDF4' : '#FFFBEB'
    } else if (!isFuture && !isWeekend && day <= parseInt(todayStr.split('-')[2] || '0', 10)) {
      borderColor = 'rgba(239,68,68,0.3)'
      bg = '#FEF9F9'
    }

    if (isToday) { borderColor = '#FF5C1F'; bg = '#FFF8F5' }
    if (isFuture) { bg = '#FAFAFA' }

    const canClick = !isFuture && !isOwner
    const dispCheckIn = corrReq?.check_in || record?.check_in
    const dispCheckOut = corrReq?.check_out || record?.check_out
    const hrs = record ? hoursWorked(record.check_in, record.check_out, record.break_minutes) : null

    return (
      <div
        onClick={() => { if (canClick && !leaveReq) setCorrModal({ date: dateStr }) }}
        style={{ borderRadius: 10, border: `1.5px solid ${borderColor}`, background: bg, padding: '8px 10px', minHeight: 88, cursor: canClick && !leaveReq ? 'pointer' : 'default', transition: 'box-shadow .12s', position: 'relative' }}
        onMouseEnter={e => { if (canClick) e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,.08)' }}
        onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 13, fontWeight: isToday ? 700 : 500, color: isToday ? '#FF5C1F' : isFuture ? 'var(--c-faint)' : '#0F172A' }}>{day}</span>
          {isToday && <span style={{ fontSize: 9, fontWeight: 800, color: '#FF5C1F', letterSpacing: '.06em' }}>TODAY</span>}
          {isWeekend && !record && <span style={{ fontSize: 9, color: 'var(--c-ghost)', letterSpacing: '.04em' }}>{dayName(year, month, day)}</span>}
        </div>
        {leaveReq ? (
          <div style={{ marginTop: 4 }}>{statusEl}</div>
        ) : (
          <>
            {dispCheckIn && (
              <div style={{ fontSize: 11.5, fontWeight: 600, color: '#10B981', marginBottom: 1 }}>
                ↑ {fmt12(dispCheckIn)}
              </div>
            )}
            {dispCheckOut && (
              <div style={{ fontSize: 11.5, fontWeight: 600, color: '#64748B', marginBottom: 4 }}>
                ↓ {fmt12(dispCheckOut)}
              </div>
            )}
            {!dispCheckIn && !isFuture && !isWeekend && (
              <div style={{ fontSize: 11, color: 'var(--c-ghost)', fontStyle: 'italic', marginTop: 4 }}>{canClick ? 'Tap to request correction' : 'No record'}</div>
            )}
            {statusEl && <div style={{ marginTop: 4 }}>{statusEl}</div>}
            {hrs && hrs !== '—' && (
              <div style={{ position: 'absolute', bottom: 7, right: 8, fontSize: 10.5, fontWeight: 700, color: '#10B981' }}>{hrs}</div>
            )}
          </>
        )}
      </div>
    )
  }

  // ── Requests list ─────────────────────────────────────────────────────────────
  const displayRequests = isOwner
    ? (viewUserId ? state.attendanceRequests.filter(r => r.user_id === viewUserId) : state.attendanceRequests)
    : myRequests

  function RequestCard({ req }: { req: AttendanceRequest }) {
    const user = state.users.find(u => u.id === req.user_id)
    const lt = req.leave_type
    const lc = lt ? LEAVE_COLORS[lt] : null
    const statusColor = req.status === 'approved' ? '#10B981' : req.status === 'rejected' ? '#EF4444' : '#8B5CF6'
    const statusBg = req.status === 'approved' ? '#F0FDF4' : req.status === 'rejected' ? '#FEF2F2' : '#F5F3FF'
    const dateLabel = req.type === 'leave' && req.leave_end && req.leave_end !== req.date
      ? `${req.date} → ${req.leave_end}` : req.date

    return (
      <div style={{ borderRadius: 12, border: '1.5px solid var(--c-border)', padding: '14px 16px', background: '#fff', animation: 'fadeUp .3s ease both' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          {isOwner && user && (
            <div style={{ width: 34, height: 34, borderRadius: 9, background: user.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 11, flexShrink: 0 }}>{user.initials}</div>
          )}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
              {isOwner && <span style={{ fontSize: 13.5, fontWeight: 700 }}>{user?.name || 'Unknown'}</span>}
              <span style={{ fontSize: 11.5, fontWeight: 700, color: req.type === 'leave' && lc ? lc.c : '#8B5CF6', background: req.type === 'leave' && lc ? lc.bg : '#F5F3FF', borderRadius: 5, padding: '2px 8px' }}>
                {req.type === 'correction' ? 'Correction' : (lt ? LEAVE_LABELS[lt] : 'Leave')}
              </span>
              <span style={{ fontSize: 11.5, color: 'var(--c-faint)' }}>{dateLabel}</span>
              <span style={{ marginLeft: 'auto', fontSize: 11.5, fontWeight: 700, color: statusColor, background: statusBg, borderRadius: 5, padding: '2px 8px' }}>
                {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
              </span>
            </div>

            {req.type === 'correction' && (
              <div style={{ fontSize: 12.5, color: 'var(--c-subtle)', marginBottom: 4 }}>
                Requested: {fmt12(req.check_in)} – {fmt12(req.check_out)}
              </div>
            )}
            <div style={{ fontSize: 13, color: 'var(--c-subtle)', lineHeight: 1.5 }}>{req.reason}</div>
            {req.rejection_reason && (
              <div style={{ fontSize: 12, color: '#DC2626', marginTop: 6, padding: '6px 10px', background: '#FEF2F2', borderRadius: 7 }}>
                Rejected: {req.rejection_reason}
              </div>
            )}
          </div>

          {/* Owner actions */}
          {isOwner && req.status === 'pending' && (
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button onClick={() => approveRequest(req.id, req)}
                style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12.5, fontWeight: 700, color: '#10B981', background: '#F0FDF4', borderRadius: 8, padding: '6px 12px', border: '1.5px solid #BBF7D0', transition: 'all .12s', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#DCFCE7'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#F0FDF4'}
              >
                <Check size={11} color="#10B981" />Approve
              </button>
              <button onClick={() => openReject(req.id, req)}
                style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12.5, fontWeight: 700, color: '#EF4444', background: '#FEF2F2', borderRadius: 8, padding: '6px 12px', border: '1.5px solid #FECACA', transition: 'all .12s', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#FEE2E2'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#FEF2F2'}
              >
                <X size={11} color="#EF4444" />Reject
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', animation: 'fadeIn .3s ease both' }}>

      {/* Header */}
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 12.5, color: 'var(--c-faint)', fontWeight: 500, marginBottom: 4 }}>Attendance</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, letterSpacing: '-0.025em', color: '#0F172A' }}>
            {isOwner ? 'Team Attendance' : 'My Attendance'}
          </h1>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>

            {/* Owner: employee selector */}
            {isOwner && (
              <select value={viewUserId} onChange={e => setViewUserId(e.target.value)}
                style={{ border: '1.5px solid var(--c-border)', borderRadius: 10, padding: '8px 12px', fontSize: 13.5, fontWeight: 600, color: '#0F172A', background: '#fff', cursor: 'pointer', minWidth: 180 }}>
                <option value="">All employees</option>
                {state.users.map(u => <option key={u.id} value={u.id}>{u.name} · {u.role}</option>)}
              </select>
            )}

            {/* Month nav */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 2, background: '#fff', border: '1.5px solid var(--c-border)', borderRadius: 10, padding: '5px 6px' }}>
              <button onClick={() => setMonthOff(o => o - 1)} style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 7, color: 'var(--c-subtle)' }}>
                <ChevronLeft size={14} />
              </button>
              <span style={{ fontSize: 13.5, fontWeight: 700, minWidth: 110, textAlign: 'center', color: '#0F172A' }}>{monthLabel}</span>
              <button onClick={() => setMonthOff(o => Math.min(o + 1, 0))} disabled={monthOff === 0}
                style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 7, color: monthOff === 0 ? 'var(--c-ghost)' : 'var(--c-subtle)' }}>
                <ChevronRight size={14} />
              </button>
            </div>

            {/* Apply leave — employees only */}
            {!isOwner && (
              <button onClick={() => setLeaveModal(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#0F172A', color: '#fff', borderRadius: 10, padding: '9px 16px', fontWeight: 700, fontSize: 13.5, transition: 'transform .15s' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = ''}
              >
                <Plus size={13} color="#fff" />Apply for leave
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 22 }}>
        {[
          { label: 'Days present', value: daysPresent, color: '#10B981', sub: `of ${daysInMonth} days` },
          { label: 'Hours worked', value: `${totalHrs}h`, color: '#FF5C1F', sub: 'this month' },
          { label: 'Pending requests', value: pendingCount, color: '#8B5CF6', sub: isOwner ? 'need review' : 'awaiting approval' },
          { label: 'Leave taken', value: leaveDays, color: '#2563EB', sub: 'days approved' },
        ].map((s, i) => (
          <div key={i} style={{ background: '#fff', border: '1.5px solid var(--c-border)', borderRadius: 14, padding: '16px 18px' }}>
            <div style={{ fontSize: 12, color: 'var(--c-faint)', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, color: s.color, letterSpacing: '-0.02em', lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 11.5, color: 'var(--c-ghost)', marginTop: 5 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 18, background: 'var(--c-fill)', borderRadius: 11, padding: 4, width: 'fit-content' }}>
        {(['calendar', 'requests'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: '8px 18px', borderRadius: 8, fontSize: 13.5, fontWeight: 600, background: tab === t ? '#fff' : 'transparent', color: tab === t ? '#0F172A' : 'var(--c-ghost)', boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,.08)' : 'none', transition: 'all .15s', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            {t === 'calendar' ? 'Calendar' : 'Requests'}
            {t === 'requests' && pendingCount > 0 && (
              <span style={{ fontSize: 10.5, fontWeight: 700, color: '#fff', background: '#8B5CF6', borderRadius: '99px', padding: '1px 6px', minWidth: 18, textAlign: 'center' }}>{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Calendar tab ──────────────────────────────────────────────────────── */}
      {tab === 'calendar' && (
        <div style={{ background: '#fff', border: '1.5px solid var(--c-border)', borderRadius: 16, overflow: 'hidden' }}>
          {/* Weekday headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--c-border-soft)' }}>
            {WEEKDAYS.map(d => (
              <div key={d} style={{ padding: '10px 0', textAlign: 'center', fontSize: 11.5, fontWeight: 700, color: d === 'Sat' || d === 'Sun' ? 'var(--c-ghost)' : 'var(--c-faint)', letterSpacing: '.06em' }}>{d}</div>
            ))}
          </div>

          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: 'var(--c-ghost)', fontSize: 13 }}>Loading…</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, padding: 12 }}>
              {/* Empty cells before first day */}
              {Array.from({ length: startOffset }, (_, i) => <div key={`empty-${i}`} />)}
              {/* Day cells */}
              {Array.from({ length: daysInMonth }, (_, i) => <DayCell key={i+1} day={i+1} />)}
            </div>
          )}

          {/* Legend */}
          <div style={{ display: 'flex', gap: 16, padding: '12px 16px', borderTop: '1px solid var(--c-border-soft)', flexWrap: 'wrap' }}>
            {[
              { color: '#10B981', bg: '#F0FDF4', label: 'Full day' },
              { color: '#F59E0B', bg: '#FFFBEB', label: 'Partial (no out)' },
              { color: '#8B5CF6', bg: '#F5F3FF', label: 'Correction pending' },
              { color: '#EF4444', bg: '#FEF2F2', label: 'Absent' },
              { color: '#FF5C1F', bg: '#FFF8F5', label: 'Today' },
            ].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: 'var(--c-subtle)' }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: l.bg, border: `1.5px solid ${l.color}` }} />
                {l.label}
              </div>
            ))}
            {!isOwner && <div style={{ marginLeft: 'auto', fontSize: 11.5, color: 'var(--c-ghost)', fontStyle: 'italic' }}>Tap any past day to request a correction</div>}
          </div>
        </div>
      )}

      {/* ── Requests tab ─────────────────────────────────────────────────────── */}
      {tab === 'requests' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontSize: 13, color: 'var(--c-subtle)' }}>
              {isOwner
                ? `${allPending.length} pending approval${allPending.length !== 1 ? 's' : ''} across team`
                : `${myRequests.length} total request${myRequests.length !== 1 ? 's' : ''}`}
            </div>
            {!isOwner && (
              <button onClick={() => setLeaveModal(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#0F172A', background: 'var(--c-fill)', borderRadius: 9, padding: '7px 14px', border: '1.5px solid var(--c-border)', transition: 'background .15s', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--c-border)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--c-fill)'}
              >
                <Plus size={12} />Apply for leave
              </button>
            )}
          </div>

          {displayRequests.length === 0 ? (
            <div style={{ background: '#fff', border: '1.5px solid var(--c-border)', borderRadius: 16, padding: '48px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>📋</div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No requests yet</div>
              <div style={{ fontSize: 13, color: 'var(--c-subtle)' }}>
                {isOwner ? 'All caught up — no pending requests from the team.' : 'Tap a past day on the calendar to request a correction, or apply for leave.'}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Pending first */}
              {displayRequests.filter(r => r.status === 'pending').map(r => <RequestCard key={r.id} req={r} />)}
              {displayRequests.filter(r => r.status !== 'pending').length > 0 && (
                <>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', color: 'var(--c-ghost)', textTransform: 'uppercase', marginTop: 8, marginBottom: 2 }}>Past requests</div>
                  {displayRequests.filter(r => r.status !== 'pending').map(r => <RequestCard key={r.id} req={r} />)}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Correction request modal ──────────────────────────────────────────── */}
      {corrModal && (
        <div onClick={() => setCorrModal(null)} className="modal-overlay">
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 440, background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--shadow-modal)', animation: 'popIn .22s cubic-bezier(.2,.9,.3,1) both' }}>
            <div style={{ padding: '20px 22px', borderBottom: '1px solid var(--c-border-soft)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17 }}>Request correction</div>
                <div style={{ fontSize: 12.5, color: 'var(--c-faint)', marginTop: 2 }}>
                  {new Date(corrModal.date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
                </div>
              </div>
              <button onClick={() => setCorrModal(null)} style={{ width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--c-ghost)' }}><X size={14} /></button>
            </div>
            <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 5 }}>Check-in time</label>
                  <input type="time" value={corrForm.checkIn} onChange={e => setCorrForm(f => ({ ...f, checkIn: e.target.value }))}
                    style={{ width: '100%', border: '1.5px solid var(--c-border)', borderRadius: 10, padding: '9px 12px', fontSize: 14 }}
                    onFocus={e => e.target.style.borderColor = 'var(--c-ink)'}
                    onBlur={e => e.target.style.borderColor = 'var(--c-border)'} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 5 }}>Check-out time</label>
                  <input type="time" value={corrForm.checkOut} onChange={e => setCorrForm(f => ({ ...f, checkOut: e.target.value }))}
                    style={{ width: '100%', border: '1.5px solid var(--c-border)', borderRadius: 10, padding: '9px 12px', fontSize: 14 }}
                    onFocus={e => e.target.style.borderColor = 'var(--c-ink)'}
                    onBlur={e => e.target.style.borderColor = 'var(--c-border)'} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 5 }}>Reason</label>
                <textarea value={corrForm.reason} onChange={e => setCorrForm(f => ({ ...f, reason: e.target.value }))}
                  rows={3} placeholder="e.g. Forgot to check in on time, was working from 9 AM…"
                  style={{ width: '100%', border: '1.5px solid var(--c-border)', borderRadius: 10, padding: '10px 12px', fontSize: 13.5, resize: 'vertical', lineHeight: 1.5 }}
                  onFocus={e => e.target.style.borderColor = 'var(--c-ink)'}
                  onBlur={e => e.target.style.borderColor = 'var(--c-border)'} />
              </div>
              <div style={{ background: '#F8FAFC', borderRadius: 10, padding: '10px 14px', fontSize: 12.5, color: 'var(--c-subtle)', lineHeight: 1.5 }}>
                This request will go to your owner for approval. Once approved, it will reflect in your attendance record.
              </div>
            </div>
            <div style={{ padding: '14px 22px', borderTop: '1px solid var(--c-border-soft)', display: 'flex', gap: 10 }}>
              <button onClick={() => setCorrModal(null)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1.5px solid var(--c-border)', fontSize: 14, fontWeight: 600, color: 'var(--c-subtle)', cursor: 'pointer' }}>Cancel</button>
              <button onClick={submitCorrection} style={{ flex: 2, padding: '10px', borderRadius: 10, background: '#0F172A', color: '#fff', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, cursor: 'pointer' }}>
                <Check size={13} color="#fff" />Submit correction
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Leave request modal ───────────────────────────────────────────────── */}
      {leaveModal && (
        <div onClick={() => setLeaveModal(false)} className="modal-overlay">
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 440, background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--shadow-modal)', animation: 'popIn .22s cubic-bezier(.2,.9,.3,1) both' }}>
            <div style={{ padding: '20px 22px', borderBottom: '1px solid var(--c-border-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17 }}>Apply for leave</div>
              <button onClick={() => setLeaveModal(false)} style={{ width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--c-ghost)' }}><X size={14} /></button>
            </div>
            <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Leave type */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 8 }}>Leave type</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
                  {(['sick', 'casual', 'annual', 'wfh'] as LeaveType[]).map(lt => {
                    const lc = LEAVE_COLORS[lt]
                    const sel = leaveForm.type === lt
                    return (
                      <button key={lt} onClick={() => setLeaveForm(f => ({ ...f, type: lt }))}
                        style={{ padding: '8px 12px', borderRadius: 9, border: `1.5px solid ${sel ? lc.c : 'var(--c-border)'}`, background: sel ? lc.bg : '#fff', color: sel ? lc.c : 'var(--c-muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all .12s' }}>
                        {LEAVE_LABELS[lt]}
                      </button>
                    )
                  })}
                </div>
              </div>
              {/* Dates */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 5 }}>From</label>
                  <input type="date" value={leaveForm.start} onChange={e => setLeaveForm(f => ({ ...f, start: e.target.value }))}
                    style={{ width: '100%', border: '1.5px solid var(--c-border)', borderRadius: 10, padding: '9px 12px', fontSize: 13.5 }}
                    onFocus={e => e.target.style.borderColor = 'var(--c-ink)'}
                    onBlur={e => e.target.style.borderColor = 'var(--c-border)'} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 5 }}>To</label>
                  <input type="date" value={leaveForm.end} min={leaveForm.start} onChange={e => setLeaveForm(f => ({ ...f, end: e.target.value }))}
                    style={{ width: '100%', border: '1.5px solid var(--c-border)', borderRadius: 10, padding: '9px 12px', fontSize: 13.5 }}
                    onFocus={e => e.target.style.borderColor = 'var(--c-ink)'}
                    onBlur={e => e.target.style.borderColor = 'var(--c-border)'} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 5 }}>Reason</label>
                <textarea value={leaveForm.reason} onChange={e => setLeaveForm(f => ({ ...f, reason: e.target.value }))}
                  rows={3} placeholder="Brief reason for your leave request…"
                  style={{ width: '100%', border: '1.5px solid var(--c-border)', borderRadius: 10, padding: '10px 12px', fontSize: 13.5, resize: 'vertical', lineHeight: 1.5 }}
                  onFocus={e => e.target.style.borderColor = 'var(--c-ink)'}
                  onBlur={e => e.target.style.borderColor = 'var(--c-border)'} />
              </div>
            </div>
            <div style={{ padding: '14px 22px', borderTop: '1px solid var(--c-border-soft)', display: 'flex', gap: 10 }}>
              <button onClick={() => setLeaveModal(false)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1.5px solid var(--c-border)', fontSize: 14, fontWeight: 600, color: 'var(--c-subtle)', cursor: 'pointer' }}>Cancel</button>
              <button onClick={submitLeave} style={{ flex: 2, padding: '10px', borderRadius: 10, background: '#0F172A', color: '#fff', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, cursor: 'pointer' }}>
                <Check size={13} color="#fff" />Submit leave request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Rejection reason modal ────────────────────────────────────────────── */}
      {rejectModal && (
        <div onClick={() => setRejectModal(null)} className="modal-overlay">
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 380, background: '#fff', borderRadius: 18, overflow: 'hidden', boxShadow: 'var(--shadow-modal)', animation: 'popIn .2s cubic-bezier(.2,.9,.3,1) both' }}>
            <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--c-border-soft)' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>Reject request</div>
              <div style={{ fontSize: 12.5, color: 'var(--c-faint)', marginTop: 2 }}>{rejectModal.userName} will be notified</div>
            </div>
            <div style={{ padding: '16px 20px' }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 6 }}>Reason (optional)</label>
              <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                rows={3} placeholder="Let them know why this was rejected…"
                style={{ width: '100%', border: '1.5px solid var(--c-border)', borderRadius: 10, padding: '10px 12px', fontSize: 13.5, resize: 'none', lineHeight: 1.5 }}
                onFocus={e => e.target.style.borderColor = 'var(--c-ink)'}
                onBlur={e => e.target.style.borderColor = 'var(--c-border)'} />
            </div>
            <div style={{ padding: '12px 20px 18px', display: 'flex', gap: 8 }}>
              <button onClick={() => setRejectModal(null)} style={{ flex: 1, padding: '9px', borderRadius: 9, border: '1.5px solid var(--c-border)', fontSize: 13.5, fontWeight: 600, color: 'var(--c-subtle)', cursor: 'pointer' }}>Cancel</button>
              <button onClick={confirmReject} style={{ flex: 2, padding: '9px', borderRadius: 9, background: '#EF4444', color: '#fff', fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}>
                Confirm rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
