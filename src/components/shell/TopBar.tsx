'use client'
import { useState, useEffect, useRef } from 'react'
import { useApp, useToast } from '@/lib/store'
import { dbCheckIn, dbCheckOut } from '@/lib/db'
import { Sparkle, Bell, Search, Clock, Spinner, Check, X } from '@/components/ui/Icon'

export default function TopBar() {
  const { state, dispatch } = useApp()
  const toast = useToast()
  const [briefLoading, setBriefLoading] = useState(false)
  const [briefText, setBriefText] = useState('')
  const [briefReveal, setBriefReveal] = useState('')
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

  async function generateBrief() {
    setBriefLoading(true)
    setBriefText('')
    setBriefReveal('')
    dispatch({ type: 'TOGGLE_BRIEF' })
    try {
      const res = await fetch('/api/ai/brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userName: state.currentUser?.name?.split(' ')[0] || 'there',
          tasks: state.tasks.slice(0, 5),
          clients: state.clients.slice(0, 3),
          date: new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long' })
        })
      })
      const { text } = await res.json()
      setBriefText(text || '')
      const words = (text || '').split(' ')
      let i = 0
      const iv = setInterval(() => {
        i++
        setBriefReveal(words.slice(0, i).join(' '))
        if (i >= words.length) clearInterval(iv)
      }, 50)
    } catch {
      const fallback = 'Unable to generate brief right now.'
      setBriefText(fallback)
      setBriefReveal(fallback)
    } finally {
      setBriefLoading(false)
    }
  }

  async function checkIn() {
    dispatch({ type:'CHECK_IN' })
    toast('Checked in — timer started')
    if (state.currentUser?.id) await dbCheckIn(state.currentUser.id)
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
    if (state.currentUser?.id) await dbCheckOut(state.currentUser.id, breakMinutes)
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

        {/* Morning Brief — orange glow button */}
        <button onClick={generateBrief} disabled={briefLoading}
          style={{ display:'flex', alignItems:'center', gap:7, background:'#FF5C1F', color:'#fff', borderRadius:11, padding:'9px 18px', fontWeight:700, fontSize:13.5, boxShadow:'0 4px 20px rgba(255,92,31,0.45), 0 2px 8px rgba(255,92,31,0.25)', transition:'transform .15s, box-shadow .15s', whiteSpace:'nowrap' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform='translateY(-1px)'; (e.currentTarget as HTMLElement).style.boxShadow='0 6px 28px rgba(255,92,31,0.55), 0 2px 10px rgba(255,92,31,0.3)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform=''; (e.currentTarget as HTMLElement).style.boxShadow='0 4px 20px rgba(255,92,31,0.45), 0 2px 8px rgba(255,92,31,0.25)' }}
        >
          {briefLoading
            ? <Spinner size={13} color="#fff" />
            : <Sparkle size={13} color="#fff" style={{ animation:'sparkleSpin 4s linear infinite' }} />
          }
          Send morning brief
        </button>

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

      {/* Morning Brief Modal */}
      {state.briefOpen && (
        <div onClick={() => dispatch({ type:'TOGGLE_BRIEF' })} className="modal-overlay">
          <div onClick={e => e.stopPropagation()} style={{ width:'100%', maxWidth:480, background:'var(--c-ink)', borderRadius:22, overflow:'hidden', boxShadow:'var(--shadow-modal)', animation:'popIn .26s cubic-bezier(.2,.9,.3,1) both', color:'#fff' }}>
            <div style={{ position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', width:240, height:240, borderRadius:'50%', background:'radial-gradient(circle,rgba(255,92,31,0.18),transparent 65%)', top:-100, right:-60 }} />
              <div style={{ padding:'24px 26px 20px', position:'relative' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <Sparkle size={16} color="#FF5C1F" style={{ animation:'sparkleSpin 6s linear infinite' }} />
                    <span style={{ fontSize:11.5, fontWeight:700, letterSpacing:'.08em', color:'#FF7A45' }}>MORNING BRIEF · {new Date().toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short'}).toUpperCase()}</span>
                  </div>
                  <button onClick={() => dispatch({ type:'TOGGLE_BRIEF' })} style={{ width:30, height:30, borderRadius:8, background:'rgba(255,255,255,.08)', display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(255,255,255,.4)' }}>
                    <X size={15} />
                  </button>
                </div>
                {briefLoading && (
                  <div style={{ display:'flex', alignItems:'center', gap:10, color:'rgba(255,255,255,.5)', marginBottom:20 }}>
                    <Spinner size={15} color="#FF5C1F" />
                    <span style={{ fontSize:14 }}>Composing your brief…</span>
                  </div>
                )}
                {briefReveal && (
                  <p style={{ fontSize:16.5, lineHeight:1.65, fontWeight:500, marginBottom:22, color:'rgba(232,230,226,0.92)' }}>{briefReveal}</p>
                )}
                <div style={{ display:'flex', gap:10 }}>
                  <button onClick={generateBrief} style={{ flex:1, background:'rgba(255,255,255,.08)', color:'rgba(232,230,226,.9)', borderRadius:10, padding:'10px', fontWeight:600, fontSize:13, display:'flex', alignItems:'center', justifyContent:'center', gap:7, transition:'background .15s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background='rgba(255,255,255,.12)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background='rgba(255,255,255,.08)'}
                  >
                    <Sparkle size={12} color="#FF7A45" />Regenerate
                  </button>
                  <button style={{ flex:1, background:'var(--c-accent)', color:'#fff', borderRadius:10, padding:'10px', fontWeight:700, fontSize:13, display:'flex', alignItems:'center', justifyContent:'center', gap:7, boxShadow:'0 4px 16px rgba(255,92,31,0.4)' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.13H6.5a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6 6l.76-.76a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                    Send on WhatsApp
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notifications panel */}
      {state.notifOpen && (
        <div onClick={() => dispatch({ type:'TOGGLE_NOTIF' })} style={{ position:'fixed', inset:0, zIndex:100 }}>
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
        </div>
      )}

      {/* Toast */}
      {state.toast && (
        <div className="toast">
          <div style={{ width:20, height:20, borderRadius:'50%', background:'var(--c-accent)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Check size={11} color="#fff" />
          </div>
          {state.toast}
        </div>
      )}
    </>
  )
}
