'use client'
import { useState, useEffect } from 'react'
import { useApp, useToast, useUpsertAttendanceRequest, useUpdateAttendanceRequest, useNotify } from '@/lib/store'
import { createClient } from '@/lib/supabase/client'
import { Check, X, Plus, ChevronLeft, ChevronRight } from '@/components/ui/Icon'
import { ModalPortal } from '@/components/ui/ModalPortal'
import type { AttendanceRecord, AttendanceRequest, LeaveType } from '@/types'

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

// Handle both ISO timestamps (from attendance table) and HH:MM text (from requests)
function parseTimeMins(t: string | null | undefined): number {
  if (!t) return 0
  if (t.includes('T') || (t.includes(':') && t.length > 5)) {
    const d = new Date(t)
    return d.getHours() * 60 + d.getMinutes()
  }
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function fmt12(t: string | null | undefined): string {
  if (!t) return ''
  const mins = parseTimeMins(t)
  const h = Math.floor(mins / 60), m = mins % 60
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2,'0')} ${ampm}`
}

function hoursWorked(checkIn: string | null, checkOut: string | null, breakMin = 0): string {
  if (!checkIn || !checkOut) return checkIn ? 'In progress' : '—'
  const total = parseTimeMins(checkOut) - parseTimeMins(checkIn) - breakMin
  if (total <= 0) return '—'
  const h = Math.floor(total / 60), m = total % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function toDateStr(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`
}

function dayName(y: number, m: number, d: number): string {
  return new Date(y, m-1, d).toLocaleDateString('en-GB', { weekday: 'short' })
}

function formatFullDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface DayModalState {
  date: string
  record: AttendanceRecord | null
  corrReq: AttendanceRequest | null
  leaveReq: AttendanceRequest | null
  isToday: boolean
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function AttendanceScreen() {
  const { state } = useApp()
  const toast = useToast()
  const upsertRequest = useUpsertAttendanceRequest()
  const updateRequest = useUpdateAttendanceRequest()
  const notify = useNotify()

  const role = state.currentUser?.role || 'employee'
  const isOwner = role === 'owner' || role === 'manager'

  // Owners/managers who should be alerted when a request comes in
  const approverIds = state.users.filter(u => ['owner', 'manager'].includes(u.role)).map(u => u.id)
  const myFirstName = state.currentUser?.name?.split(' ')[0] || 'A team member'

  // View state
  const [tab, setTab] = useState<'calendar' | 'requests'>('calendar')
  const [monthOff, setMonthOff] = useState(0)
  const [viewUserId, setViewUserId] = useState(state.currentUser?.id || '')

  // Month data
  const [monthRecords, setMonthRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [reviewTick, setReviewTick] = useState(0)  // bumped after an approval applies a correction

  // Modals
  const [dayModal, setDayModal] = useState<DayModalState | null>(null)
  const [corrModal, setCorrModal] = useState<{ date: string } | null>(null)
  const [corrForm, setCorrForm] = useState({ checkIn: '09:00', checkOut: '18:00', reason: '' })
  const [leaveModal, setLeaveModal] = useState(false)
  const [leaveForm, setLeaveForm] = useState({ type: 'casual' as LeaveType, start: '', end: '', reason: '' })
  const [rejectModal, setRejectModal] = useState<{ id: string; userName: string } | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  // ── Derived values ──────────────────────────────────────────────────────────
  const now = new Date()
  const viewDate = new Date(now.getFullYear(), now.getMonth() + monthOff, 1)
  const year = viewDate.getFullYear()
  const month = viewDate.getMonth() + 1
  const daysInMonth = new Date(year, month, 0).getDate()
  const monthLabel = viewDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
  const todayStr = toDateStr(now.getFullYear(), now.getMonth() + 1, now.getDate())

  // Attendance requests for the viewed user
  const myRequests = state.attendanceRequests.filter(r =>
    r.user_id === (isOwner ? viewUserId : state.currentUser?.id)
  )
  const allPending = state.attendanceRequests.filter(r => r.status === 'pending')
  const pendingCount = isOwner ? allPending.length : myRequests.filter(r => r.status === 'pending').length

  // ── Load month records ── refetches when month or checkedIn changes ──────────
  useEffect(() => {
    if (!viewUserId) return
    setLoading(true)
    const sb = createClient()
    const start = toDateStr(year, month, 1)
    const end = toDateStr(year, month, daysInMonth)
    sb.from('attendance').select('*').eq('user_id', viewUserId).gte('date', start).lte('date', end)
      .then(({ data, error }) => {
        setMonthRecords(error ? [] : (data || []))
        setLoading(false)
      })
  }, [viewUserId, year, month, state.checkedIn, reviewTick]) // refetch on check-in/out and after a review applies changes

  // Init viewUserId when currentUser loads
  useEffect(() => {
    if (state.currentUser && !viewUserId) setViewUserId(state.currentUser.id)
  }, [state.currentUser]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Calendar helpers ────────────────────────────────────────────────────────
  const firstDayOfMonth = new Date(year, month-1, 1).getDay()
  const startOffset = (firstDayOfMonth + 6) % 7

  const recordForDate = (d: string) => monthRecords.find(r => r.date === d) || null
  const requestForDate = (d: string) => myRequests.find(r => r.date === d && r.type === 'correction') || null
  const leaveForDate = (d: string) => myRequests.find(r =>
    r.type === 'leave' && r.date <= d && (r.leave_end || r.date) >= d
  ) || null

  // For today: also show in-memory check-in state if DB hasn't updated yet
  function getLiveCheckIn(): string | null {
    if (!state.checkedIn || !state.checkInTime) return null
    const h = state.checkInTime.getHours()
    const m = state.checkInTime.getMinutes()
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`
  }

  // ── Stats ───────────────────────────────────────────────────────────────────
  const daysPresent = monthRecords.filter(r => r.check_in && r.check_out).length
  const totalMinutes = monthRecords.reduce((sum, r) => {
    if (!r.check_in || !r.check_out) return sum
    return sum + parseTimeMins(r.check_out) - parseTimeMins(r.check_in) - r.break_minutes
  }, 0)
  const totalHrs = Math.floor(totalMinutes / 60)
  const leaveDays = myRequests.filter(r => r.type === 'leave' && r.status === 'approved').length

  // ── Open day modal ──────────────────────────────────────────────────────────
  function openDayModal(day: number) {
    const dateStr = toDateStr(year, month, day)
    const record = recordForDate(dateStr)
    const corrReq = requestForDate(dateStr)
    const leaveReq = leaveForDate(dateStr)
    setDayModal({ date: dateStr, record, corrReq, leaveReq, isToday: dateStr === todayStr })
  }

  function goToCorrection(date: string, record: AttendanceRecord | null) {
    setDayModal(null)
    setCorrForm({
      checkIn: record ? fmt12HM(record.check_in) : '09:00',
      checkOut: record ? fmt12HM(record.check_out) : '18:00',
      reason: '',
    })
    setCorrModal({ date })
  }

  function goToLeave(date: string) {
    setDayModal(null)
    setLeaveForm({ type: 'casual', start: date, end: date, reason: '' })
    setLeaveModal(true)
  }

  // Convert to HH:MM for time input pre-fill
  function fmt12HM(t: string | null | undefined): string {
    if (!t) return ''
    const mins = parseTimeMins(t)
    return `${String(Math.floor(mins / 60)).padStart(2,'0')}:${String(mins % 60).padStart(2,'0')}`
  }

  // ── Submit correction ────────────────────────────────────────────────────────
  function submitCorrection() {
    if (!corrForm.reason.trim()) { toast('Please add a reason'); return }
    if (!corrForm.checkIn || !corrForm.checkOut) { toast('Please fill in both times'); return }
    const req: AttendanceRequest = {
      id: crypto.randomUUID(),
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
    notify(approverIds, {
      title: 'Time correction request',
      text: `${myFirstName} requested a time correction for ${req.date}.`,
      type: 'request',
      link: 'attendance',
    })
    setCorrModal(null)
    setCorrForm({ checkIn: '09:00', checkOut: '18:00', reason: '' })
    toast('Correction request submitted — awaiting approval')
  }

  // ── Submit leave ─────────────────────────────────────────────────────────────
  function submitLeave() {
    if (!leaveForm.start) { toast('Please select a date'); return }
    if (!leaveForm.reason.trim()) { toast('Please add a reason'); return }
    const req: AttendanceRequest = {
      id: crypto.randomUUID(),
      user_id: state.currentUser!.id,
      type: 'leave',
      date: leaveForm.start,
      leave_end: leaveForm.end || leaveForm.start,
      leave_type: leaveForm.type,
      reason: leaveForm.reason,
      status: 'pending',
      created_at: new Date().toISOString(),
    }
    upsertRequest(req)
    const range = req.leave_end && req.leave_end !== req.date ? `${req.date} → ${req.leave_end}` : req.date
    notify(approverIds, {
      title: `${LEAVE_LABELS[leaveForm.type]} request`,
      text: `${myFirstName} applied for ${LEAVE_LABELS[leaveForm.type].toLowerCase()} (${range}).`,
      type: 'request',
      link: 'attendance',
    })
    setLeaveModal(false)
    setLeaveForm({ type: 'casual', start: '', end: '', reason: '' })
    toast(`${LEAVE_LABELS[leaveForm.type]} request submitted`)
  }

  // ── Approve / Reject ─────────────────────────────────────────────────────────
  async function approveRequest(id: string, req: AttendanceRequest) {
    const user = state.users.find(u => u.id === req.user_id)
    try {
      await updateRequest(id, 'approved', state.currentUser!.id)
      setReviewTick(t => t + 1) // refetch so an applied correction shows immediately
      toast(`Approved — ${user?.name.split(' ')[0] || 'Employee'} notified`)
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Approval failed')
    }
  }

  function openReject(id: string, req: AttendanceRequest) {
    const user = state.users.find(u => u.id === req.user_id)
    setRejectModal({ id, userName: user?.name.split(' ')[0] || 'Employee' })
    setRejectReason('')
  }

  async function confirmReject() {
    if (!rejectModal) return
    const { id, userName } = rejectModal
    setRejectModal(null)
    try {
      await updateRequest(id, 'rejected', state.currentUser!.id, rejectReason)
      toast(`Rejected — ${userName} notified`)
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Rejection failed')
    }
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
    const liveCI = isToday ? getLiveCheckIn() : null

    let borderColor = 'var(--c-border-soft)'
    let bg = '#fff'
    let statusEl: React.ReactNode = null

    if (leaveReq) {
      const lt = leaveReq.leave_type || 'casual'
      const lc = LEAVE_COLORS[lt]
      borderColor = lc.c; bg = lc.bg + '80'
      statusEl = <span style={{ fontSize: 10, fontWeight: 700, color: lc.c, background: lc.bg, borderRadius: 4, padding: '1px 5px' }}>{LEAVE_LABELS[lt]}</span>
    } else if (corrReq) {
      borderColor = corrReq.status === 'approved' ? '#10B981' : corrReq.status === 'rejected' ? '#EF4444' : '#8B5CF6'
      bg = corrReq.status === 'approved' ? '#F0FDF4' : corrReq.status === 'rejected' ? '#FEF2F2' : '#F5F3FF'
      statusEl = <span style={{ fontSize: 10, fontWeight: 700, color: borderColor, background: bg, borderRadius: 4, padding: '1px 5px' }}>
        {corrReq.status === 'pending' ? 'Pending' : corrReq.status === 'approved' ? 'Approved' : 'Rejected'}
      </span>
    } else if (record?.check_in) {
      const hasOut = !!record.check_out
      borderColor = hasOut ? '#10B981' : '#F59E0B'
      bg = hasOut ? '#F0FDF4' : '#FFFBEB'
    } else if (liveCI) {
      borderColor = '#F59E0B'; bg = '#FFFBEB'
    } else if (!isFuture && !isWeekend) {
      borderColor = 'rgba(239,68,68,0.3)'; bg = '#FEF9F9'
    }

    if (isToday) { borderColor = '#FF5C1F'; bg = '#FFF8F5' }
    if (isFuture) { bg = '#FAFAFA' }

    const canClick = !isFuture && !isOwner
    const dispCheckIn = corrReq?.check_in || record?.check_in || liveCI
    const dispCheckOut = corrReq?.check_out || record?.check_out
    const hrs = (record?.check_in || liveCI)
      ? hoursWorked(record?.check_in || liveCI, record?.check_out || null, record?.break_minutes || 0)
      : null

    return (
      <div
        onClick={() => { if (canClick) openDayModal(day) }}
        style={{
          borderRadius: 10, border: `1.5px solid ${borderColor}`, background: bg,
          padding: '8px 10px', minHeight: 88,
          cursor: canClick ? 'pointer' : 'default',
          transition: 'box-shadow .12s, transform .1s', position: 'relative',
        }}
        onMouseEnter={e => { if (canClick) { e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,.08)'; e.currentTarget.style.transform = 'scale(1.01)' } }}
        onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = '' }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 13, fontWeight: isToday ? 700 : 500, color: isToday ? '#FF5C1F' : isFuture ? 'var(--c-faint)' : '#0F172A' }}>{day}</span>
          {isToday && <span style={{ fontSize: 8, fontWeight: 800, color: '#FF5C1F', letterSpacing: '.06em', background: '#FFE8DF', padding: '1px 5px', borderRadius: 4 }}>TODAY</span>}
          {isWeekend && !record && !liveCI && <span style={{ fontSize: 9, color: 'var(--c-ghost)', letterSpacing: '.04em' }}>{dayName(year, month, day)}</span>}
        </div>

        {leaveReq ? (
          <div style={{ marginTop: 4 }}>{statusEl}</div>
        ) : (
          <>
            {dispCheckIn && (
              <div style={{ fontSize: 11, fontWeight: 600, color: '#10B981', marginBottom: 1, display: 'flex', alignItems: 'center', gap: 3 }}>
                <span style={{ fontSize: 9 }}>▲</span>{fmt12(dispCheckIn)}
                {liveCI && !record?.check_in && <span style={{ fontSize: 8, color: '#F59E0B', marginLeft: 2 }}>live</span>}
              </div>
            )}
            {dispCheckOut && (
              <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 3 }}>
                <span style={{ fontSize: 9 }}>▼</span>{fmt12(dispCheckOut)}
              </div>
            )}
            {!dispCheckIn && !isFuture && !isWeekend && (
              <div style={{ fontSize: 10.5, color: 'var(--c-ghost)', fontStyle: 'italic', marginTop: 4 }}>
                {canClick ? 'Tap to raise request' : 'No record'}
              </div>
            )}
            {statusEl && <div style={{ marginTop: 3 }}>{statusEl}</div>}
            {hrs && hrs !== '—' && (
              <div style={{ position: 'absolute', bottom: 6, right: 8, fontSize: 10, fontWeight: 700, color: '#10B981' }}>{hrs}</div>
            )}
          </>
        )}
      </div>
    )
  }

  // ── Request card ──────────────────────────────────────────────────────────────
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
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
              {isOwner && <span style={{ fontSize: 13.5, fontWeight: 700 }}>{user?.name || 'Unknown'}</span>}
              <span style={{ fontSize: 11.5, fontWeight: 700, color: req.type === 'leave' && lc ? lc.c : '#8B5CF6', background: req.type === 'leave' && lc ? lc.bg : '#F5F3FF', borderRadius: 5, padding: '2px 8px' }}>
                {req.type === 'correction' ? 'Time Correction' : (lt ? LEAVE_LABELS[lt] : 'Leave')}
              </span>
              <span style={{ fontSize: 11.5, color: 'var(--c-faint)' }}>{dateLabel}</span>
              <span style={{ marginLeft: 'auto', fontSize: 11.5, fontWeight: 700, color: statusColor, background: statusBg, borderRadius: 5, padding: '2px 8px' }}>
                {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
              </span>
            </div>
            {req.type === 'correction' && req.check_in && (
              <div style={{ fontSize: 12.5, color: 'var(--c-subtle)', marginBottom: 4 }}>
                Requested times: {fmt12(req.check_in)} – {fmt12(req.check_out)}
              </div>
            )}
            <div style={{ fontSize: 13, color: 'var(--c-subtle)', lineHeight: 1.5 }}>{req.reason}</div>
            {req.rejection_reason && (
              <div style={{ fontSize: 12, color: '#DC2626', marginTop: 6, padding: '6px 10px', background: '#FEF2F2', borderRadius: 7 }}>
                Reason for rejection: {req.rejection_reason}
              </div>
            )}
          </div>
          {isOwner && req.status === 'pending' && (
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button onClick={() => approveRequest(req.id, req)}
                style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12.5, fontWeight: 700, color: '#10B981', background: '#F0FDF4', borderRadius: 8, padding: '6px 12px', border: '1.5px solid #BBF7D0', cursor: 'pointer' }}>
                <Check size={11} color="#10B981" />Approve
              </button>
              <button onClick={() => openReject(req.id, req)}
                style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12.5, fontWeight: 700, color: '#EF4444', background: '#FEF2F2', borderRadius: 8, padding: '6px 12px', border: '1.5px solid #FECACA', cursor: 'pointer' }}>
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
            {isOwner && (
              <select value={viewUserId} onChange={e => setViewUserId(e.target.value)}
                style={{ border: '1.5px solid var(--c-border)', borderRadius: 10, padding: '8px 12px', fontSize: 13.5, fontWeight: 600, color: '#0F172A', background: '#fff', cursor: 'pointer', minWidth: 180 }}>
                <option value="">All employees</option>
                {state.users.map(u => <option key={u.id} value={u.id}>{u.name} · {u.role}</option>)}
              </select>
            )}
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
            {!isOwner && (
              <button onClick={() => { setLeaveForm({ type: 'casual', start: '', end: '', reason: '' }); setLeaveModal(true) }}
                style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#0F172A', color: '#fff', borderRadius: 10, padding: '9px 16px', fontWeight: 700, fontSize: 13.5, transition: 'transform .15s', cursor: 'pointer' }}
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
          { label: 'Leave approved', value: leaveDays, color: '#2563EB', sub: 'days this month' },
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

      {/* ── Calendar tab ───────────────────────────────────────────────────────── */}
      {tab === 'calendar' && (
        <div style={{ background: '#fff', border: '1.5px solid var(--c-border)', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--c-border-soft)' }}>
            {WEEKDAYS.map(d => (
              <div key={d} style={{ padding: '10px 0', textAlign: 'center', fontSize: 11.5, fontWeight: 700, color: d === 'Sat' || d === 'Sun' ? 'var(--c-ghost)' : 'var(--c-faint)', letterSpacing: '.06em' }}>{d}</div>
            ))}
          </div>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: 'var(--c-ghost)', fontSize: 13 }}>Loading…</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, padding: 12 }}>
              {Array.from({ length: startOffset }, (_, i) => <div key={`e-${i}`} />)}
              {Array.from({ length: daysInMonth }, (_, i) => <DayCell key={i+1} day={i+1} />)}
            </div>
          )}
          {/* Legend + hint */}
          <div style={{ display: 'flex', gap: 14, padding: '12px 16px', borderTop: '1px solid var(--c-border-soft)', flexWrap: 'wrap', alignItems: 'center' }}>
            {[
              { color: '#10B981', bg: '#F0FDF4', label: 'Full day' },
              { color: '#F59E0B', bg: '#FFFBEB', label: 'Checked in' },
              { color: '#8B5CF6', bg: '#F5F3FF', label: 'Correction pending' },
              { color: '#EF4444', bg: '#FEF9F9', label: 'Absent' },
              { color: '#FF5C1F', bg: '#FFF8F5', label: 'Today' },
            ].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: 'var(--c-subtle)' }}>
                <div style={{ width: 11, height: 11, borderRadius: 3, background: l.bg, border: `1.5px solid ${l.color}` }} />
                {l.label}
              </div>
            ))}
            {!isOwner && <div style={{ marginLeft: 'auto', fontSize: 11.5, color: 'var(--c-ghost)', fontStyle: 'italic' }}>Tap any day to view details or raise a request</div>}
          </div>
        </div>
      )}

      {/* ── Requests tab ──────────────────────────────────────────────────────── */}
      {tab === 'requests' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontSize: 13, color: 'var(--c-subtle)' }}>
              {isOwner
                ? `${allPending.length} pending across team`
                : `${myRequests.length} total request${myRequests.length !== 1 ? 's' : ''}`}
            </div>
            {!isOwner && (
              <button onClick={() => { setLeaveForm({ type: 'casual', start: '', end: '', reason: '' }); setLeaveModal(true) }}
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#0F172A', background: 'var(--c-fill)', borderRadius: 9, padding: '7px 14px', border: '1.5px solid var(--c-border)', cursor: 'pointer' }}>
                <Plus size={12} />Apply for leave
              </button>
            )}
          </div>
          {displayRequests.length === 0 ? (
            <div style={{ background: '#fff', border: '1.5px solid var(--c-border)', borderRadius: 16, padding: '48px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>📋</div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No requests yet</div>
              <div style={{ fontSize: 13, color: 'var(--c-subtle)' }}>
                {isOwner ? 'All caught up — no pending requests from the team.' : 'Tap a day on the calendar to raise a correction or leave request.'}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
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

      {/* ── Day Detail Modal ──────────────────────────────────────────────────── */}
      {dayModal && (
        <ModalPortal><div onClick={() => setDayModal(null)} className="modal-overlay">
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 420, background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--shadow-modal)', animation: 'popIn .22s cubic-bezier(.2,.9,.3,1) both' }}>

            {/* Modal header */}
            <div style={{ padding: '18px 20px 16px', borderBottom: '1px solid var(--c-border-soft)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: '#0F172A' }}>
                    {dayModal.isToday ? 'Today' : formatFullDate(dayModal.date)}
                  </div>
                  {dayModal.isToday && state.checkedIn && (
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#10B981', background: '#F0FDF4', borderRadius: 5, padding: '2px 7px', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', animation: 'pulseRing 1.5s ease-out infinite' }} />
                      LIVE
                    </span>
                  )}
                </div>
                {dayModal.isToday && <div style={{ fontSize: 12, color: 'var(--c-faint)', marginTop: 2 }}>{formatFullDate(dayModal.date)}</div>}
              </div>
              <button onClick={() => setDayModal(null)} style={{ width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--c-ghost)', background: 'var(--c-fill)' }}><X size={14} /></button>
            </div>

            <div style={{ padding: '18px 20px' }}>

              {/* Leave indicator */}
              {dayModal.leaveReq && (() => {
                const lt = dayModal.leaveReq.leave_type || 'casual'
                const lc = LEAVE_COLORS[lt]
                return (
                  <div style={{ background: lc.bg, border: `1.5px solid ${lc.c}30`, borderRadius: 12, padding: '14px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 20 }}>{lt === 'sick' ? '🤒' : lt === 'wfh' ? '🏠' : lt === 'annual' ? '🌴' : '☕'}</span>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: lc.c }}>{LEAVE_LABELS[lt]}</div>
                      <div style={{ fontSize: 12, color: lc.c + 'AA', marginTop: 1 }}>
                        Status: {dayModal.leaveReq.status.charAt(0).toUpperCase() + dayModal.leaveReq.status.slice(1)}
                      </div>
                    </div>
                  </div>
                )
              })()}

              {/* Record details */}
              {(dayModal.record || (dayModal.isToday && state.checkedIn)) ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                  {/* Check-in row */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F0FDF4', borderRadius: 10, padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 30, height: 30, borderRadius: 8, background: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 14 }}>▲</span>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#166534', letterSpacing: '.05em' }}>CHECK IN</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: '#14532D', fontFamily: 'var(--font-display)' }}>
                          {fmt12(dayModal.record?.check_in || (dayModal.isToday ? getLiveCheckIn() : null))}
                        </div>
                      </div>
                    </div>
                    {dayModal.corrReq?.check_in && (
                      <div style={{ fontSize: 11, color: '#8B5CF6', fontWeight: 600 }}>
                        Req: {fmt12(dayModal.corrReq.check_in)}
                      </div>
                    )}
                  </div>

                  {/* Check-out row */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: (dayModal.record?.check_out) ? '#F8FAFC' : '#FFFBEB', borderRadius: 10, padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 30, height: 30, borderRadius: 8, background: dayModal.record?.check_out ? '#64748B' : '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 14, color: '#fff' }}>▼</span>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: dayModal.record?.check_out ? '#475569' : '#92400E', letterSpacing: '.05em' }}>CHECK OUT</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: dayModal.record?.check_out ? '#1E293B' : '#78350F', fontFamily: 'var(--font-display)' }}>
                          {dayModal.record?.check_out ? fmt12(dayModal.record.check_out) : (dayModal.isToday && state.checkedIn ? 'Still working…' : 'Not recorded')}
                        </div>
                      </div>
                    </div>
                    {dayModal.corrReq?.check_out && (
                      <div style={{ fontSize: 11, color: '#8B5CF6', fontWeight: 600 }}>
                        Req: {fmt12(dayModal.corrReq.check_out)}
                      </div>
                    )}
                  </div>

                  {/* Hours + break summary */}
                  {dayModal.record?.check_in && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <div style={{ flex: 1, background: 'var(--c-fill)', borderRadius: 10, padding: '10px 14px', textAlign: 'center' }}>
                        <div style={{ fontSize: 11, color: 'var(--c-ghost)', marginBottom: 2 }}>Worked</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', fontFamily: 'var(--font-display)' }}>
                          {hoursWorked(dayModal.record.check_in, dayModal.record.check_out, dayModal.record.break_minutes)}
                        </div>
                      </div>
                      {(dayModal.record.break_minutes || 0) > 0 && (
                        <div style={{ flex: 1, background: 'var(--c-fill)', borderRadius: 10, padding: '10px 14px', textAlign: 'center' }}>
                          <div style={{ fontSize: 11, color: 'var(--c-ghost)', marginBottom: 2 }}>Break</div>
                          <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', fontFamily: 'var(--font-display)' }}>
                            {dayModal.record.break_minutes}m
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Correction request status */}
                  {dayModal.corrReq && (
                    <div style={{ background: '#F5F3FF', borderRadius: 10, padding: '10px 14px', fontSize: 12.5, color: '#7C3AED', display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span>⏳</span>
                      Correction request is {dayModal.corrReq.status}
                    </div>
                  )}
                </div>
              ) : (
                /* No record */
                <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
                  <div style={{ width: 48, height: 48, borderRadius: 14, background: '#FEF9F9', border: '1.5px solid #FECACA', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', fontSize: 22 }}>⚠️</div>
                  <div style={{ fontSize: 14.5, fontWeight: 600, color: '#0F172A', marginBottom: 4 }}>No attendance record</div>
                  <div style={{ fontSize: 12.5, color: 'var(--c-subtle)' }}>Were you working or on leave? Raise a request below.</div>
                </div>
              )}

              {/* Actions */}
              {!isOwner && !dayModal.leaveReq && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {!dayModal.corrReq && (
                    <button
                      onClick={() => goToCorrection(dayModal.date, dayModal.record)}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 12, border: '1.5px solid var(--c-border)', background: '#fff', cursor: 'pointer', transition: 'background .12s', textAlign: 'left', width: '100%' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--c-fill)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#fff'}
                    >
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>🕐</div>
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0F172A' }}>Request time correction</div>
                        <div style={{ fontSize: 12, color: 'var(--c-subtle)', marginTop: 1 }}>
                          {dayModal.record ? 'Times recorded are wrong?' : "Were you present but times weren't recorded?"}
                        </div>
                      </div>
                      <span style={{ marginLeft: 'auto', color: 'var(--c-faint)', fontSize: 16 }}>→</span>
                    </button>
                  )}

                  {!dayModal.isToday && (
                    <button
                      onClick={() => goToLeave(dayModal.date)}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 12, border: '1.5px solid var(--c-border)', background: '#fff', cursor: 'pointer', transition: 'background .12s', textAlign: 'left', width: '100%' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--c-fill)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#fff'}
                    >
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>🏖️</div>
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0F172A' }}>Apply for leave</div>
                        <div style={{ fontSize: 12, color: 'var(--c-subtle)', marginTop: 1 }}>Was this a sick day, WFH, or annual leave?</div>
                      </div>
                      <span style={{ marginLeft: 'auto', color: 'var(--c-faint)', fontSize: 16 }}>→</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div></ModalPortal>
      )}

      {/* ── Correction request modal ──────────────────────────────────────────── */}
      {corrModal && (
        <ModalPortal><div onClick={() => setCorrModal(null)} className="modal-overlay">
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 440, background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--shadow-modal)', animation: 'popIn .22s cubic-bezier(.2,.9,.3,1) both' }}>
            <div style={{ padding: '20px 22px', borderBottom: '1px solid var(--c-border-soft)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17 }}>Request time correction</div>
                <div style={{ fontSize: 12.5, color: 'var(--c-faint)', marginTop: 2 }}>{formatFullDate(corrModal.date)}</div>
              </div>
              <button onClick={() => setCorrModal(null)} style={{ width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--c-ghost)', background: 'var(--c-fill)' }}><X size={14} /></button>
            </div>
            <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ background: '#F0F9FF', borderRadius: 10, padding: '10px 14px', fontSize: 12.5, color: '#0369A1', lineHeight: 1.5 }}>
                Enter the times you actually worked. The owner will review and approve or reject this request.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 5 }}>Check-in time</label>
                  <input type="time" value={corrForm.checkIn} onChange={e => setCorrForm(f => ({ ...f, checkIn: e.target.value }))}
                    style={{ width: '100%', border: '1.5px solid var(--c-border)', borderRadius: 10, padding: '9px 12px', fontSize: 14, boxSizing: 'border-box' }}
                    onFocus={e => e.target.style.borderColor = '#0F172A'}
                    onBlur={e => e.target.style.borderColor = 'var(--c-border)'} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 5 }}>Check-out time</label>
                  <input type="time" value={corrForm.checkOut} onChange={e => setCorrForm(f => ({ ...f, checkOut: e.target.value }))}
                    style={{ width: '100%', border: '1.5px solid var(--c-border)', borderRadius: 10, padding: '9px 12px', fontSize: 14, boxSizing: 'border-box' }}
                    onFocus={e => e.target.style.borderColor = '#0F172A'}
                    onBlur={e => e.target.style.borderColor = 'var(--c-border)'} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 5 }}>Reason <span style={{ color: '#EF4444' }}>*</span></label>
                <textarea value={corrForm.reason} onChange={e => setCorrForm(f => ({ ...f, reason: e.target.value }))}
                  rows={3} placeholder="e.g. Forgot to check in, was working from 9 AM as usual…"
                  style={{ width: '100%', border: '1.5px solid var(--c-border)', borderRadius: 10, padding: '10px 12px', fontSize: 13.5, resize: 'vertical', lineHeight: 1.5, boxSizing: 'border-box' }}
                  onFocus={e => e.target.style.borderColor = '#0F172A'}
                  onBlur={e => e.target.style.borderColor = 'var(--c-border)'} />
              </div>
            </div>
            <div style={{ padding: '14px 22px', borderTop: '1px solid var(--c-border-soft)', display: 'flex', gap: 10 }}>
              <button onClick={() => setCorrModal(null)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1.5px solid var(--c-border)', fontSize: 14, fontWeight: 600, color: 'var(--c-subtle)', cursor: 'pointer' }}>Cancel</button>
              <button onClick={submitCorrection} style={{ flex: 2, padding: '10px', borderRadius: 10, background: '#0F172A', color: '#fff', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, cursor: 'pointer' }}>
                <Check size={13} color="#fff" />Submit request
              </button>
            </div>
          </div>
        </div></ModalPortal>
      )}

      {/* ── Leave request modal ───────────────────────────────────────────────── */}
      {leaveModal && (
        <ModalPortal><div onClick={() => setLeaveModal(false)} className="modal-overlay">
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 440, background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--shadow-modal)', animation: 'popIn .22s cubic-bezier(.2,.9,.3,1) both' }}>
            <div style={{ padding: '20px 22px', borderBottom: '1px solid var(--c-border-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17 }}>Apply for leave</div>
              <button onClick={() => setLeaveModal(false)} style={{ width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--c-ghost)', background: 'var(--c-fill)' }}><X size={14} /></button>
            </div>
            <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Leave type */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 8 }}>Leave type</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
                  {(['sick', 'casual', 'annual', 'wfh'] as LeaveType[]).map(lt => {
                    const lc = LEAVE_COLORS[lt]
                    const sel = leaveForm.type === lt
                    const emoji = lt === 'sick' ? '🤒' : lt === 'casual' ? '☕' : lt === 'annual' ? '🌴' : '🏠'
                    return (
                      <button key={lt} onClick={() => setLeaveForm(f => ({ ...f, type: lt }))}
                        style={{ padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${sel ? lc.c : 'var(--c-border)'}`, background: sel ? lc.bg : '#fff', color: sel ? lc.c : 'var(--c-muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all .12s', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>{emoji}</span>{LEAVE_LABELS[lt]}
                      </button>
                    )
                  })}
                </div>
              </div>
              {/* Dates */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 5 }}>From date</label>
                  <input type="date" value={leaveForm.start}
                    onChange={e => setLeaveForm(f => ({ ...f, start: e.target.value, end: f.end < e.target.value ? e.target.value : f.end }))}
                    style={{ width: '100%', border: '1.5px solid var(--c-border)', borderRadius: 10, padding: '9px 12px', fontSize: 13.5, boxSizing: 'border-box' }}
                    onFocus={e => e.target.style.borderColor = '#0F172A'}
                    onBlur={e => e.target.style.borderColor = 'var(--c-border)'} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 5 }}>To date</label>
                  <input type="date" value={leaveForm.end} min={leaveForm.start}
                    onChange={e => setLeaveForm(f => ({ ...f, end: e.target.value }))}
                    style={{ width: '100%', border: '1.5px solid var(--c-border)', borderRadius: 10, padding: '9px 12px', fontSize: 13.5, boxSizing: 'border-box' }}
                    onFocus={e => e.target.style.borderColor = '#0F172A'}
                    onBlur={e => e.target.style.borderColor = 'var(--c-border)'} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 5 }}>Reason <span style={{ color: '#EF4444' }}>*</span></label>
                <textarea value={leaveForm.reason} onChange={e => setLeaveForm(f => ({ ...f, reason: e.target.value }))}
                  rows={3} placeholder="Brief reason for your leave request…"
                  style={{ width: '100%', border: '1.5px solid var(--c-border)', borderRadius: 10, padding: '10px 12px', fontSize: 13.5, resize: 'vertical', lineHeight: 1.5, boxSizing: 'border-box' }}
                  onFocus={e => e.target.style.borderColor = '#0F172A'}
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
        </div></ModalPortal>
      )}

      {/* ── Rejection modal ───────────────────────────────────────────────────── */}
      {rejectModal && (
        <ModalPortal><div onClick={() => setRejectModal(null)} className="modal-overlay">
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 380, background: '#fff', borderRadius: 18, overflow: 'hidden', boxShadow: 'var(--shadow-modal)', animation: 'popIn .2s cubic-bezier(.2,.9,.3,1) both' }}>
            <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--c-border-soft)' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>Reject request</div>
              <div style={{ fontSize: 12.5, color: 'var(--c-faint)', marginTop: 2 }}>{rejectModal.userName} will be notified</div>
            </div>
            <div style={{ padding: '16px 20px' }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 6 }}>Reason for rejection (optional)</label>
              <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                rows={3} placeholder="Let them know why this was rejected…"
                style={{ width: '100%', border: '1.5px solid var(--c-border)', borderRadius: 10, padding: '10px 12px', fontSize: 13.5, resize: 'none', lineHeight: 1.5, boxSizing: 'border-box' }}
                onFocus={e => e.target.style.borderColor = '#0F172A'}
                onBlur={e => e.target.style.borderColor = 'var(--c-border)'} />
            </div>
            <div style={{ padding: '12px 20px 18px', display: 'flex', gap: 8 }}>
              <button onClick={() => setRejectModal(null)} style={{ flex: 1, padding: '9px', borderRadius: 9, border: '1.5px solid var(--c-border)', fontSize: 13.5, fontWeight: 600, color: 'var(--c-subtle)', cursor: 'pointer' }}>Cancel</button>
              <button onClick={confirmReject} style={{ flex: 2, padding: '9px', borderRadius: 9, background: '#EF4444', color: '#fff', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                <X size={12} color="#fff" />Confirm rejection
              </button>
            </div>
          </div>
        </div></ModalPortal>
      )}
    </div>
  )
}
