'use client'
import { useState, useEffect, useRef } from 'react'
import { useApp, useToast, useMarkNotifRead, useMarkAllNotifRead } from '@/lib/store'
import { dbCheckIn, dbCheckOut, dbUpsertWorkLog } from '@/lib/db'
import { Bell, Search, Check, X } from '@/components/ui/Icon'
import { ModalPortal } from '@/components/ui/ModalPortal'
import type { Screen, NotificationType } from '@/types'

const NOTIF_COLOR: Record<NotificationType, string> = {
  success: '#0E8C63',
  warning: '#E5484D',
  reminder: '#FF5C1F',
  request: '#7C5CFF',
  info: '#2563EB',
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return days === 1 ? 'yesterday' : `${days}d ago`
}

export default function TopBar() {
  const { state, dispatch } = useApp()
  const toast = useToast()
  const [tick, setTick] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [logNote, setLogNote] = useState('')
  const [submittingLog, setSubmittingLog] = useState(false)

  useEffect(() => {
    if (state.checkedIn) {
      timerRef.current = setInterval(() => setTick(t => t + 1), 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [state.checkedIn])

  const workingTime = (() => {
    if (!state.checkInTime) return '0:00'
    const now = Date.now()
    const ms = now - state.checkInTime.getTime() - state.totalBreakMs - (state.onBreak && state.breakStart ? now - state.breakStart.getTime() : 0)
    const s = Math.floor(ms / 1000)
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60
    return h > 0 ? `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}` : `${m}:${String(sec).padStart(2,'0')}`
  })()

  async function checkIn() {
    dispatch({ type:'CHECK_IN' })
    toast('Checked in — timer started')
    if (state.currentUser?.id) {
      try { await dbCheckIn(state.currentUser.id) }
      catch { toast('Check-in saved locally — DB sync failed, check console') }
    }
  }
  function startBreak() { dispatch({ type:'START_BREAK' }); toast('On break — timer paused') }
  function endBreak() {
    const ms = state.breakStart ? Date.now() - state.breakStart.getTime() : 0
    dispatch({ type:'END_BREAK', ms })
    toast('Break ended — timer resumed')
  }
  // Checkout now requires an end-of-day work log.
  async function submitCheckout() {
    if (!logNote.trim()) { toast('Add a quick note on what you got done today'); return }
    setSubmittingLog(true)
    const breakMs = state.totalBreakMs + (state.onBreak && state.breakStart ? Date.now() - state.breakStart.getTime() : 0)
    const breakMinutes = Math.round(breakMs / 60000)
    const logged = workingTime
    try {
      if (state.currentUser?.id) {
        await dbUpsertWorkLog(state.currentUser.id, logNote.trim())
        await dbCheckOut(state.currentUser.id, breakMinutes)
      }
      dispatch({ type:'CHECK_OUT' })
      toast(`Checked out — ${logged} logged. Nice work today!`)
      setCheckoutOpen(false); setLogNote('')
    } catch {
      toast('Check-out failed — please try again')
    } finally {
      setSubmittingLog(false)
    }
  }

  const myOpenWork = [
    ...state.tasks.filter(t => t.assignee_id === state.currentUser?.id && !t.done).map(t => t.title),
    ...state.planItems.filter(p => p.assignee_id === state.currentUser?.id && p.status !== 'published').map(p => p.title),
  ].slice(0, 6)

  const markRead = useMarkNotifRead()
  const markAllRead = useMarkAllNotifRead()
  const notifications = state.notifications
  const unreadCount = notifications.filter(n => !n.read).length

  // Telegram linking — only shown once a bot is configured
  const tgBot = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME
  const tgConnected = !!state.currentUser?.telegram_chat_id
  const tgLink = tgBot && state.currentUser ? `https://t.me/${tgBot}?start=${state.currentUser.id}` : null

  function openNotif(n: typeof notifications[number]) {
    if (!n.read) markRead(n.id)
    if (n.link) dispatch({ type: 'SET_SCREEN', screen: n.link as Screen })
    dispatch({ type: 'TOGGLE_NOTIF' })
  }

  return (
    <>
      <div style={{ height:58, borderBottom:'1px solid var(--c-border)', background:'#fff', display:'flex', alignItems:'center', paddingInline:20, gap:10, flexShrink:0, position:'sticky', top:0, zIndex:50 }}>

        {/* Search */}
        <div style={{ flex:1, maxWidth:340, position:'relative' }}>
          <Search size={14} color="var(--c-faint)" style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }} />
          <input placeholder="Search clients, tasks, content…"
            style={{ width:'100%', background:'var(--c-fill)', border:'1.5px solid transparent', borderRadius:10, padding:'8px 12px 8px 32px', fontSize:13, color:'var(--c-ink-2)', transition:'border-color .15s, background .15s' }}
            onFocus={e => { e.target.style.borderColor='var(--c-ink)'; e.target.style.background='#fff' }}
            onBlur={e => { e.target.style.borderColor='transparent'; e.target.style.background='var(--c-fill)' }}
          />
        </div>

        <div style={{ flex:1 }} />

        {/* Check-in widget */}
        <div style={{ display:'flex', alignItems:'center', gap:4, background:'#fff', borderRadius:11, padding:'4px 6px', border:'1.5px solid var(--c-border)' }}>
          {!state.checkedIn ? (
            <button onClick={checkIn}
              style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, fontWeight:600, color:'var(--c-ink)', padding:'5px 10px', borderRadius:8, transition:'background .15s' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background='var(--c-fill)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background='transparent'}
            >
              <div style={{ width:9, height:9, borderRadius:'50%', background:'#FF5C1F', position:'relative', flexShrink:0 }}>
                <div style={{ position:'absolute', inset:-3, borderRadius:'50%', border:'2px solid #FF5C1F', animation:'pulseRing 1.8s ease-out infinite', opacity:.4 }} />
              </div>
              Check in
            </button>
          ) : (
            <>
              <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:12.5, fontWeight:700, color:'var(--c-green)', fontFamily:'var(--font-display)', padding:'4px 6px' }}>
                <div style={{ width:7, height:7, borderRadius:'50%', background:'var(--c-green)', position:'relative' }}>
                  <div style={{ position:'absolute', inset:-3, borderRadius:'50%', border:'2px solid var(--c-green)', animation:'pulseRing 1.5s ease-out infinite', opacity:.5 }} />
                </div>
                {workingTime}
              </div>
              {state.onBreak ? (
                <button onClick={endBreak} style={{ fontSize:12, fontWeight:600, color:'var(--c-amber)', padding:'4px 9px', borderRadius:7, background:'var(--c-amber-bg)', transition:'opacity .15s' }}>Resume</button>
              ) : (
                <button onClick={startBreak} style={{ fontSize:12, fontWeight:600, color:'var(--c-subtle)', padding:'4px 9px', borderRadius:7, background:'var(--c-fill)', transition:'background .15s' }}>Break</button>
              )}
              <button onClick={() => { setLogNote(''); setCheckoutOpen(true) }} style={{ fontSize:12, fontWeight:600, color:'var(--c-red)', padding:'4px 9px', borderRadius:7, background:'var(--c-red-bg)' }}>Out</button>
            </>
          )}
        </div>

        {/* Notifications */}
        <button onClick={() => dispatch({ type:'TOGGLE_NOTIF' })}
          style={{ width:36, height:36, borderRadius:10, background:'var(--c-fill)', display:'flex', alignItems:'center', justifyContent:'center', position:'relative', transition:'background .15s' }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background='var(--c-border)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background='var(--c-fill)'}
        >
          <Bell size={17} color="var(--c-subtle)" />
          {unreadCount > 0 && (
            <div style={{ position:'absolute', top:2, right:2, minWidth:16, height:16, padding:'0 4px', borderRadius:8, background:'#FF5C1F', border:'2px solid #fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:9.5, fontWeight:800, color:'#fff', fontFamily:'var(--font-display)' }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </div>
          )}
        </button>

      </div>

      {/* Notifications panel */}
      {state.notifOpen && (
        <ModalPortal><div onClick={() => dispatch({ type:'TOGGLE_NOTIF' })} style={{ position:'fixed', inset:0, zIndex:100 }}>
          <div onClick={e => e.stopPropagation()} style={{ position:'absolute', top:66, right:20, width:360, maxHeight:'70vh', display:'flex', flexDirection:'column', background:'#fff', borderRadius:16, border:'1px solid var(--c-border)', boxShadow:'0 20px 40px -15px rgba(0,0,0,.18)', overflow:'hidden', animation:'popIn .2s ease both' }}>
            <div style={{ padding:'14px 16px 12px', borderBottom:'1px solid var(--c-border-soft)', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
              <span style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:15 }}>
                Notifications{unreadCount > 0 && <span style={{ color:'var(--c-faint)', fontWeight:600 }}> · {unreadCount} new</span>}
              </span>
              {unreadCount > 0 && (
                <button onClick={() => markAllRead()} style={{ fontSize:12, fontWeight:600, color:'var(--c-accent)', background:'none', border:'none', cursor:'pointer' }}>Mark all read</button>
              )}
            </div>
            <div style={{ overflowY:'auto', flex:1, minHeight:0 }}>
              {notifications.length === 0 ? (
                <div style={{ padding:'40px 24px', textAlign:'center' }}>
                  <div style={{ fontSize:28, marginBottom:8 }}>🔔</div>
                  <div style={{ fontSize:13.5, fontWeight:600, color:'var(--c-ink)', marginBottom:3 }}>You're all caught up</div>
                  <div style={{ fontSize:12.5, color:'var(--c-faint)' }}>New updates and reminders will show up here.</div>
                </div>
              ) : notifications.map(n => (
                <div key={n.id} onClick={() => openNotif(n)}
                  style={{ display:'flex', gap:11, padding:'12px 16px', borderBottom:'1px solid var(--c-border-soft)', cursor:'pointer', transition:'background .15s', background: n.read ? 'transparent' : 'var(--c-accent-bg)' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = n.read ? 'var(--c-fill)' : 'var(--c-accent-bg)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = n.read ? 'transparent' : 'var(--c-accent-bg)'}
                >
                  <div style={{ width:8, height:8, borderRadius:'50%', background: n.read ? 'var(--c-ghost)' : (NOTIF_COLOR[n.type] || '#FF5C1F'), marginTop:5, flexShrink:0 }} />
                  <div style={{ flex:1, minWidth:0 }}>
                    {n.title && <div style={{ fontSize:13, fontWeight:700, lineHeight:1.35, marginBottom:1 }}>{n.title}</div>}
                    <div style={{ fontSize:13, fontWeight: n.title ? 400 : 500, color: n.title ? 'var(--c-subtle)' : 'var(--c-ink)', lineHeight:1.45 }}>{n.text}</div>
                    <div style={{ fontSize:11.5, color:'var(--c-faint)', marginTop:3 }}>{timeAgo(n.created_at)}</div>
                  </div>
                </div>
              ))}
            </div>
            {tgLink && (
              <div style={{ borderTop:'1px solid var(--c-border-soft)', padding:'11px 16px', flexShrink:0, background:'var(--c-fill-soft)' }}>
                {tgConnected ? (
                  <div style={{ fontSize:12, color:'var(--c-green)', fontWeight:600, display:'flex', alignItems:'center', gap:6 }}>
                    <span>✅</span> Telegram connected — alerts reach your phone
                  </div>
                ) : (
                  <a href={tgLink} target="_blank" rel="noopener noreferrer"
                    style={{ display:'flex', alignItems:'center', gap:8, fontSize:12.5, fontWeight:600, color:'#229ED9', textDecoration:'none' }}>
                    <span style={{ fontSize:15 }}>✈️</span> Connect Telegram to get notified on your phone →
                  </a>
                )}
              </div>
            )}
          </div>
        </div></ModalPortal>
      )}

      {/* Checkout — end-of-day work log */}
      {checkoutOpen && (
        <ModalPortal><div onClick={() => !submittingLog && setCheckoutOpen(false)} className="modal-overlay">
          <div onClick={e => e.stopPropagation()} style={{ width:'100%', maxWidth:460, background:'#fff', borderRadius:20, overflow:'hidden', boxShadow:'var(--shadow-modal)', animation:'popIn .22s cubic-bezier(.2,.9,.3,1) both' }}>
            <div style={{ padding:'20px 22px 14px', borderBottom:'1px solid var(--c-border-soft)' }}>
              <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:17 }}>Wrap up your day</div>
              <div style={{ fontSize:12.5, color:'var(--c-faint)', marginTop:2 }}>{workingTime} worked · a quick note before you check out</div>
            </div>
            <div style={{ padding:'18px 22px' }}>
              <label style={{ fontSize:12.5, fontWeight:600, color:'var(--c-muted)', display:'block', marginBottom:6 }}>What did you get done today?</label>
              <textarea autoFocus value={logNote} onChange={e => setLogNote(e.target.value)} rows={5}
                placeholder={"• Finished the Weekend Doors reel edit\n• Drafted 3 SEO meta descriptions for Lumio\n• Reviewed SUNSO carousel with the team"}
                style={{ width:'100%', border:'1.5px solid var(--c-border)', borderRadius:12, padding:'11px 13px', fontSize:14, lineHeight:1.6, resize:'vertical', boxSizing:'border-box', outline:'none' }}
                onFocus={e => e.target.style.borderColor='var(--c-ink)'} onBlur={e => e.target.style.borderColor='var(--c-border)'} />
              {myOpenWork.length > 0 && (
                <div style={{ marginTop:12 }}>
                  <div style={{ fontSize:11, fontWeight:700, letterSpacing:'.05em', color:'var(--c-faint)', textTransform:'uppercase', marginBottom:6 }}>Your open work — tap to add</div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                    {myOpenWork.map((title, i) => (
                      <button key={i} onClick={() => setLogNote(n => (n ? n.replace(/\n?$/, '\n') : '') + `• ${title}`)}
                        style={{ fontSize:12, color:'var(--c-ink-2)', background:'var(--c-fill)', border:'1px solid var(--c-border)', borderRadius:8, padding:'5px 10px', cursor:'pointer', maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        + {title}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div style={{ padding:'14px 22px', borderTop:'1px solid var(--c-border-soft)', display:'flex', gap:10 }}>
              <button onClick={() => setCheckoutOpen(false)} disabled={submittingLog} style={{ flex:1, padding:'11px', borderRadius:11, border:'1.5px solid var(--c-border)', fontSize:14, fontWeight:600, color:'var(--c-subtle)', background:'#fff' }}>Cancel</button>
              <button onClick={submitCheckout} disabled={submittingLog} style={{ flex:2, padding:'11px', borderRadius:11, background:'var(--c-red)', color:'#fff', fontSize:14, fontWeight:700, border:'none', display:'flex', alignItems:'center', justifyContent:'center', gap:7, opacity:submittingLog?.6:1 }}>
                {submittingLog ? 'Checking out…' : 'Submit & check out'}
              </button>
            </div>
          </div>
        </div></ModalPortal>
      )}

      {/* Toast */}
      {state.toast && (
        <ModalPortal>
          <div className="toast">
            <div style={{ width:20, height:20, borderRadius:'50%', background:'var(--c-accent)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Check size={11} color="#fff" />
            </div>
            {state.toast}
          </div>
        </ModalPortal>
      )}
    </>
  )
}
