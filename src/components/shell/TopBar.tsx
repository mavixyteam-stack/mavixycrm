'use client'
import { useState, useEffect, useRef } from 'react'
import { useApp, useToast } from '@/lib/store'
import { dbCheckIn, dbCheckOut } from '@/lib/db'
import { Bell, Search, Check, X } from '@/components/ui/Icon'
import { ModalPortal } from '@/components/ui/ModalPortal'

export default function TopBar() {
  const { state, dispatch } = useApp()
  const toast = useToast()
  const [tick, setTick] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

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
  async function checkOut() {
    const breakMs = state.totalBreakMs + (state.onBreak && state.breakStart ? Date.now() - state.breakStart.getTime() : 0)
    const breakMinutes = Math.round(breakMs / 60000)
    dispatch({ type:'CHECK_OUT' })
    toast(`Checked out — ${workingTime} logged`)
    if (state.currentUser?.id) {
      try { await dbCheckOut(state.currentUser.id, breakMinutes) }
      catch { toast('Check-out saved locally — DB sync failed, check console') }
    }
  }

  const notifCount = 3

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
              <button onClick={checkOut} style={{ fontSize:12, fontWeight:600, color:'var(--c-red)', padding:'4px 9px', borderRadius:7, background:'var(--c-red-bg)' }}>Out</button>
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
          {notifCount > 0 && (
            <div style={{ position:'absolute', top:7, right:7, width:7, height:7, borderRadius:'50%', background:'#FF5C1F', border:'2px solid #fff' }} />
          )}
        </button>

      </div>

      {/* Notifications panel */}
      {state.notifOpen && (
        <ModalPortal><div onClick={() => dispatch({ type:'TOGGLE_NOTIF' })} style={{ position:'fixed', inset:0, zIndex:100 }}>
          <div onClick={e => e.stopPropagation()} style={{ position:'absolute', top:66, right:20, width:340, background:'#fff', borderRadius:16, border:'1px solid var(--c-border)', boxShadow:'0 20px 40px -15px rgba(0,0,0,.18)', overflow:'hidden', animation:'popIn .2s ease both' }}>
            <div style={{ padding:'14px 16px 10px', borderBottom:'1px solid var(--c-border-soft)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:15 }}>Notifications</span>
              <button style={{ fontSize:12, fontWeight:600, color:'var(--c-accent)' }}>Mark all read</button>
            </div>
            {[
              { color:'#FF5C38', text:'Weekend Doors waiting on your reel cover approval', time:'2h overdue' },
              { color:'#F4B740', text:'Dev left a comment on the SUNSO carousel brief', time:'18 min ago' },
              { color:'#FF5C1F', text:'Lumio Diwali references added to the asset bank', time:'1h ago' },
            ].map((n, i) => (
              <div key={i} style={{ display:'flex', gap:11, padding:'12px 16px', borderBottom:'1px solid var(--c-border-soft)', cursor:'pointer', transition:'background .15s' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background='var(--c-fill)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background='transparent'}
              >
                <div style={{ width:8, height:8, borderRadius:'50%', background:n.color, marginTop:5, flexShrink:0 }} />
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13.5, fontWeight:500, lineHeight:1.4 }}>{n.text}</div>
                  <div style={{ fontSize:12, color:'var(--c-faint)', marginTop:2 }}>{n.time}</div>
                </div>
              </div>
            ))}
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
