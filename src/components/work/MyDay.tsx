'use client'
import { useState } from 'react'
import { useApp, useToast } from '@/lib/store'
import { Sparkle, ArrowRight, Plus, X, Check } from '@/components/ui/Icon'

const TASKS_SEED = [
  { id:'t1', clientId:'sunso', clientColor:'#F4B740', title:'Reel — "Glow ritual" 3-step routine', type:'Reel', due:'2:00 PM', est:'2.5h', priority:'High' as const, format:'Reel · 9:16 · 15–25s', hook:'"The 3-step glow ritual you\'re skipping" — open on the before/after texture macro.', idea:'Soft editorial pacing, warm gradients, lots of whitespace. End on a clean product CTA card.', refs:[{label:'Glossier — routine reel'},{label:'Saved: editorial skincare grid'}] },
  { id:'t2', clientId:'weekend', clientColor:'#FF5C38', title:'Reel — "3 corners of the cafe"', type:'Reel', due:'4:00 PM', est:'1h', priority:'High' as const, format:'Reel · 9:16 · 20–30s', hook:'"3 corners of this cafe you haven\'t tried" — fast cuts, warm film grain.', idea:'Hand-drawn arrows, cozy natural light, trending lo-fi audio. Big legible captions.', refs:[{label:'Cafe walkthrough reel'},{label:'Audio: lo-fi morning'}] },
  { id:'t3', clientId:'lumio', clientColor:'#8B5CF6', title:'Reel — Diwali gifting teaser', type:'Reel', due:'Today', est:'2h', priority:'High' as const, format:'Reel · 9:16 · 15s', hook:'"Light up their Diwali" — product hero in warm bokeh.', idea:'Cozy home + gifting moment. Premium, not loud. End on a festive sale stinger.', refs:[{label:'Festive bokeh reel'},{label:'Lumio brand films'}] },
  { id:'t4', clientId:'elysian', clientColor:'#10B981', title:'Instagram Story templates ×5', type:'Story', due:'Tomorrow', est:'2h', priority:'Medium' as const, format:'Story · 9:16 · static', hook:'Editorial travel-zine set — serif headlines, thin map lines.', idea:'Muted film palette, Cereal-magazine layout feel.', refs:[{label:'Cereal magazine layouts'}] },
  { id:'t5', clientId:'sunso', clientColor:'#F4B740', title:'Resize hero banner for website', type:'Design', due:'5:30 PM', est:'0.5h', priority:'Low' as const, idea:'Resize the approved hero to web dimensions. No new design needed.', refs:[] },
]

export default function MyDay() {
  const { state, dispatch } = useApp()
  const toast = useToast()
  const role = state.currentUser?.role || 'employee'
  const name = state.currentUser?.name?.split(' ')[0] || 'there'
  const [done, setDone] = useState<Record<string,boolean>>({})
  const [expanded, setExpanded] = useState<string|null>('t1')
  const [createOpen, setCreateOpen] = useState(false)
  const [nw, setNw] = useState<{ title:string; clientId:string; type:string; due:string; priority:'Low'|'Medium'|'High' }>({ title:'', clientId:'', type:'Design', due:'Today', priority:'Medium' })

  const now = new Date()
  const h = now.getHours()
  const greeting = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
  const mos = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const dateStr = `${days[now.getDay()]}, ${mos[now.getMonth()]} ${now.getDate()}`

  const tasks = TASKS_SEED
  const clientName = (id: string) => state.clients.find(c => c.id === id)?.name || id

  function createTask() {
    if (!nw.title.trim()) return
    dispatch({ type: 'UPSERT_TASK', task: {
      id: `task-${Date.now()}`,
      title: nw.title,
      client_id: nw.clientId,
      type: nw.type,
      assignee_id: state.currentUser?.id || '',
      due: nw.due,
      priority: nw.priority,
      done: false,
      created_at: new Date().toISOString(),
    }})
    toast('Task created & assigned')
    setCreateOpen(false)
    setNw({ title:'', clientId: state.clients[0]?.id || '', type:'Design', due:'Today', priority:'Medium' })
  }

  if (role === 'owner') return <OwnerView name={name} greeting={greeting} dateStr={dateStr} dispatch={dispatch} clients={state.clients} />
  if (role === 'manager') return <ManagerView name={name} greeting={greeting} dateStr={dateStr} dispatch={dispatch} />

  return (
    <div style={{ animation:'fadeIn .4s ease both' }}>
      <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', gap:20, marginBottom:26, flexWrap:'wrap' }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:9, color:'var(--c-subtle)', fontSize:13.5, fontWeight:500, marginBottom:7 }}>
            {dateStr}
            <span style={{ width:4, height:4, borderRadius:'50%', background:'var(--c-rule)' }} />
            5 tasks · 9 hours planned
          </div>
          <h1 style={{ fontFamily:'var(--font-display)', fontSize:30, fontWeight:700, letterSpacing:'-0.02em', lineHeight:1.1 }}>{greeting}, {name}.</h1>
          <p style={{ color:'var(--c-muted)', fontSize:15.5, marginTop:8, maxWidth:'60ch' }}>Your day is planned and balanced. Three clients need design work — start with SUNSO while you&apos;re fresh.</p>
        </div>
        <button onClick={() => setCreateOpen(true)} style={{ display:'inline-flex', alignItems:'center', gap:8, background:'var(--c-ink)', color:'#fff', borderRadius:11, padding:'11px 16px', fontWeight:600, fontSize:14, transition:'transform .15s' }}
          onMouseEnter={e=>(e.currentTarget as HTMLElement).style.transform='translateY(-2px)'}
          onMouseLeave={e=>(e.currentTarget as HTMLElement).style.transform=''}
        >
          <Plus size={16} color="var(--c-accent)" />New task
        </button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1.55fr 1fr', gap:18, alignItems:'start' }}>
        <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
          {/* AI Focus */}
          <div style={{ background:'var(--c-ink)', color:'#fff', borderRadius:18, padding:'22px 24px', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', width:260, height:260, borderRadius:'50%', background:'radial-gradient(circle,rgba(255,92,31,.2),transparent 65%)', top:-90, right:-60 }} />
            <div style={{ position:'relative', display:'flex', alignItems:'center', gap:8, color:'#FF7A45', fontSize:12, fontWeight:700, letterSpacing:'.04em', marginBottom:14 }}>
              <Sparkle size={14} style={{ animation:'sparkleSpin 8s linear infinite' }} />
              AI FOCUS · TODAY
            </div>
            <p style={{ position:'relative', fontSize:18, lineHeight:1.5, margin:'0 0 20px', fontWeight:500, maxWidth:'46ch' }}>Start with the SUNSO carousel while you&apos;re fresh — it&apos;s your highest-impact task. I&apos;ve spaced the rest so you finish by 5:30 with buffer.</p>
            <div style={{ position:'relative', display:'flex', gap:26, flexWrap:'wrap', alignItems:'center' }}>
              <div><div style={{ fontFamily:'var(--font-display)', fontSize:24, fontWeight:700 }}>{tasks.length}</div><div style={{ color:'#9A9E94', fontSize:12.5 }}>tasks today</div></div>
              <div><div style={{ fontFamily:'var(--font-display)', fontSize:24, fontWeight:700 }}>9.0</div><div style={{ color:'#9A9E94', fontSize:12.5 }}>hours planned</div></div>
              <div><div style={{ fontFamily:'var(--font-display)', fontSize:24, fontWeight:700 }}>3</div><div style={{ color:'#9A9E94', fontSize:12.5 }}>clients</div></div>
              <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:12 }}>
                <svg width="56" height="56" viewBox="0 0 120 120" style={{ transform:'rotate(-90deg)' }}>
                  <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="11"/>
                  <circle cx="60" cy="60" r="54" fill="none" stroke="var(--c-accent)" strokeWidth="11" strokeLinecap="round" strokeDasharray="339" strokeDashoffset="41" style={{ animation:'ringIn 1.1s ease both' }}/>
                </svg>
                <div><div style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:700, color:'#FF7A45' }}>88%</div><div style={{ color:'#9A9E94', fontSize:11.5, lineHeight:1.2 }}>healthy<br/>capacity</div></div>
              </div>
            </div>
          </div>

          {/* Tasks */}
          <div style={{ background:'#fff', border:'1px solid var(--c-border)', borderRadius:18, overflow:'hidden', boxShadow:'var(--shadow-card)' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'17px 20px', borderBottom:'1px solid var(--c-border-soft)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <h3 style={{ fontFamily:'var(--font-display)', fontSize:16, fontWeight:700 }}>Your tasks</h3>
                <span style={{ background:'var(--c-fill)', color:'var(--c-muted)', fontSize:12, fontWeight:600, borderRadius:7, padding:'2px 8px' }}>{tasks.length}</span>
              </div>
              <button onClick={() => dispatch({ type:'SET_SCREEN', screen:'planner' })} style={{ fontSize:13, fontWeight:600, color:'var(--c-accent-dark)', display:'flex', alignItems:'center', gap:4 }}>
                Open planner <ArrowRight size={13} />
              </button>
            </div>
            {tasks.map(t => {
              const isDone = !!done[t.id]
              const isExp = expanded === t.id && !!t.idea
              const pc = t.priority==='High'?'#FF5C38':t.priority==='Medium'?'#F4B740':'#9A9E94'
              return (
                <div key={t.id} style={{ borderBottom:'1px solid var(--c-border-soft)' }}>
                  <div onClick={() => setExpanded(isExp ? null : t.id)} style={{ display:'flex', alignItems:'center', gap:13, padding:'14px 20px', cursor:'pointer', transition:'background .15s' }}
                    onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background='var(--c-fill-soft)'}
                    onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background=''}
                  >
                    <button onClick={e => { e.stopPropagation(); setDone(d => ({ ...d, [t.id]: !d[t.id] })) }}
                      style={{ width:22, height:22, borderRadius:7, border:`2px solid ${isDone?'var(--c-green)':'var(--c-rule)'}`, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', background:isDone?'var(--c-green)':'#fff', transition:'all .15s' }}>
                      {isDone && <Check size={11} color="#fff" />}
                    </button>
                    <span style={{ width:3, height:30, borderRadius:3, background:t.clientColor, flexShrink:0 }} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:600, fontSize:14.5, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', textDecoration:isDone?'line-through':'none', opacity:isDone?.6:1 }}>{t.title}</div>
                      <div style={{ display:'flex', alignItems:'center', gap:9, marginTop:3, fontSize:12.5, color:'var(--c-subtle)' }}>
                        <span style={{ fontWeight:600, color:t.clientColor }}>{clientName(t.clientId)}</span>
                        <span style={{ width:3, height:3, borderRadius:'50%', background:'var(--c-rule)' }} />
                        {t.type}
                        <span style={{ width:3, height:3, borderRadius:'50%', background:'var(--c-rule)' }} />
                        est {t.est}
                      </div>
                    </div>
                    <span style={{ fontSize:11, fontWeight:700, borderRadius:7, padding:'3px 8px', background:pc+'1f', color:pc }}>{t.priority}</span>
                    <span style={{ fontSize:12.5, fontWeight:600, color:t.due.includes('PM')?'#D6451F':'var(--c-subtle)', whiteSpace:'nowrap', minWidth:62, textAlign:'right' }}>{t.due}</span>
                  </div>
                  {isExp && (
                    <div style={{ margin:'0 20px 16px 58px', background:'#FFF7F2', border:'1px solid #FFD9C7', borderRadius:12, padding:'14px 16px', animation:'popIn .18s ease both' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:7, color:'var(--c-accent-dark)', fontSize:11.5, fontWeight:700, letterSpacing:'.03em', marginBottom:9 }}>
                        <Sparkle size={13} />AI BRIEF &amp; INSPIRATION
                      </div>
                      {t.format && <div style={{ display:'inline-block', fontSize:11, fontWeight:700, color:'var(--c-purple)', background:'var(--c-purple-bg)', borderRadius:6, padding:'3px 9px', marginBottom:9 }}>{t.format}</div>}
                      {t.hook && <div style={{ fontSize:13.5, lineHeight:1.5, color:'#2B1E16', marginBottom:8 }}><b>Hook:</b> {t.hook}</div>}
                      <p style={{ margin:'0 0 11px', fontSize:13, lineHeight:1.55, color:'#5A4A40' }}>{t.idea}</p>
                      {t.refs && t.refs.length > 0 && (
                        <>
                          <div style={{ fontSize:10.5, fontWeight:700, color:'var(--c-ghost)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:7 }}>Inspiration</div>
                          <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
                            {t.refs.map((r,i) => (
                              <span key={i} style={{ display:'inline-flex', alignItems:'center', gap:6, background:'#fff', border:'1px solid #FFD9C7', borderRadius:8, padding:'5px 10px', fontSize:12, fontWeight:600, color:'#9A3A12', cursor:'pointer' }}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FF5C1F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></svg>
                                {r.label}
                              </span>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
          {/* Today's brief */}
          <div style={{ background:'#fff', border:'1px solid var(--c-border)', borderRadius:18, padding:20, boxShadow:'var(--shadow-card)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:13 }}>
              <span style={{ width:32, height:32, borderRadius:9, background:'var(--c-accent-bg)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--c-accent-dark)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-9 8.4 8.5 8.5 0 0 1-3.9-.9L3 20l1.3-3.8A8.38 8.38 0 0 1 12 3a8.5 8.5 0 0 1 9 8.5z"/></svg>
              </span>
              <div>
                <h3 style={{ fontFamily:'var(--font-display)', fontSize:15, fontWeight:700 }}>Today&apos;s brief</h3>
                <div style={{ fontSize:12, color:'var(--c-subtle)' }}>Delivered 9:01 AM · WhatsApp</div>
              </div>
            </div>
            <div style={{ background:'var(--c-fill)', borderRadius:12, padding:'12px 13px', fontSize:13, lineHeight:1.5, color:'var(--c-ink-3)', marginBottom:14 }}>
              <span style={{ fontWeight:600 }}>Good morning ☀️</span> 3 designs today — SUNSO, Weekend Doors, Lumio. Ideas attached for each ✨
            </div>
            <button onClick={() => dispatch({ type:'TOGGLE_BRIEF' })} style={{ width:'100%', background:'var(--c-ink)', color:'#fff', borderRadius:11, padding:12, fontWeight:600, fontSize:14, display:'flex', alignItems:'center', justifyContent:'center', gap:8, transition:'transform .15s' }}
              onMouseEnter={e=>(e.currentTarget as HTMLElement).style.transform='translateY(-2px)'}
              onMouseLeave={e=>(e.currentTarget as HTMLElement).style.transform=''}
            >
              View today&apos;s brief <ArrowRight size={15} color="var(--c-accent)" />
            </button>
          </div>

          {/* Needs attention */}
          <div style={{ background:'#fff', border:'1px solid var(--c-border)', borderRadius:18, padding:20, boxShadow:'var(--shadow-card)' }}>
            <h3 style={{ fontFamily:'var(--font-display)', fontSize:15, fontWeight:700, marginBottom:13 }}>Needs your eyes</h3>
            {[
              { color:'#FF5C38', text:'Weekend Doors waiting on your reel cover approval', time:'2h overdue' },
              { color:'#F4B740', text:'Dev left a comment on the SUNSO carousel brief', time:'18 min ago' },
              { color:'#FF5C1F', text:'Lumio Diwali references added to the asset bank', time:'1h ago' },
            ].map((p,i) => (
              <div key={i} style={{ display:'flex', gap:11, padding:'9px 0', borderBottom: i<2 ? '1px solid var(--c-border-soft)' : 'none' }}>
                <span style={{ width:8, height:8, borderRadius:'50%', background:p.color, marginTop:6, flexShrink:0 }} />
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13.5, fontWeight:500, lineHeight:1.4 }}>{p.text}</div>
                  <div style={{ fontSize:12, color:'var(--c-faint)', marginTop:2 }}>{p.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick task modal */}
      {createOpen && (
        <div onClick={() => setCreateOpen(false)} className="modal-overlay">
          <div onClick={e => e.stopPropagation()} style={{ width:'100%', maxWidth:520, background:'#fff', borderRadius:22, overflow:'hidden', boxShadow:'var(--shadow-modal)', animation:'popIn .26s cubic-bezier(.2,.9,.3,1) both' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'20px 24px', borderBottom:'1px solid var(--c-border-soft)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:11 }}>
                <span style={{ width:34, height:34, borderRadius:10, background:'var(--c-accent-bg)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Plus size={17} color="var(--c-accent-dark)" />
                </span>
                <div>
                  <h3 style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:700 }}>Quick task</h3>
                  <div style={{ fontSize:12.5, color:'var(--c-subtle)' }}>Assign a one-off task to the right person.</div>
                </div>
              </div>
              <button onClick={() => setCreateOpen(false)} style={{ width:34, height:34, borderRadius:9, background:'var(--c-fill)', display:'flex', alignItems:'center', justifyContent:'center' }}><X size={17} color="var(--c-muted)" /></button>
            </div>
            <div style={{ padding:'22px 24px' }}>
              <label style={{ display:'block', fontSize:12.5, fontWeight:600, color:'var(--c-muted)', marginBottom:7 }}>Task title</label>
              <input value={nw.title} onChange={e => setNw(n=>({...n,title:e.target.value}))} placeholder="e.g. Design 3 IG carousel slides"
                style={{ width:'100%', background:'var(--c-fill-soft)', border:'1.5px solid var(--c-border)', borderRadius:11, padding:'12px 14px', fontSize:14.5, marginBottom:16 }}
              />
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:16 }}>
                <div>
                  <label style={{ display:'block', fontSize:12.5, fontWeight:600, color:'var(--c-muted)', marginBottom:7 }}>Client</label>
                  <select value={nw.clientId} onChange={e => setNw(n=>({...n,clientId:e.target.value}))} style={{ width:'100%', background:'var(--c-fill-soft)', border:'1.5px solid var(--c-border)', borderRadius:11, padding:'12px 14px', fontSize:14 }}>
                    {state.clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display:'block', fontSize:12.5, fontWeight:600, color:'var(--c-muted)', marginBottom:7 }}>Due</label>
                  <select style={{ width:'100%', background:'var(--c-fill-soft)', border:'1.5px solid var(--c-border)', borderRadius:11, padding:'12px 14px', fontSize:14 }}>
                    <option>Today</option><option>Tomorrow</option><option>This week</option>
                  </select>
                </div>
              </div>
              <label style={{ display:'block', fontSize:12.5, fontWeight:600, color:'var(--c-muted)', marginBottom:9 }}>Priority</label>
              <div style={{ display:'flex', gap:8 }}>
                {(['Low','Medium','High'] as const).map(pr => {
                  const sel = nw.priority === pr
                  const col = pr==='High'?'#FF5C38':pr==='Medium'?'#F4B740':'#9A9E94'
                  return <button key={pr} onClick={() => setNw(n=>({...n,priority:pr}))} style={{ flex:1, borderRadius:10, padding:10, fontSize:13.5, fontWeight:600, border:`1.5px solid ${sel?col:'var(--c-border)'}`, background:sel?col+'1f':'var(--c-fill-soft)', color:sel?col:'var(--c-muted)', transition:'all .15s' }}>{pr}</button>
                })}
              </div>
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end', gap:10, padding:'16px 24px', background:'var(--c-fill-soft)', borderTop:'1px solid var(--c-border-soft)' }}>
              <button onClick={() => setCreateOpen(false)} style={{ padding:'11px 18px', borderRadius:11, background:'var(--c-fill)', fontWeight:600, fontSize:14, color:'var(--c-ink-3)' }}>Cancel</button>
              <button onClick={createTask} style={{ padding:'11px 20px', borderRadius:11, fontWeight:700, fontSize:14, background:'var(--c-accent)', color:'#fff', boxShadow:'var(--shadow-accent)', transition:'transform .15s' }}
                onMouseEnter={e=>(e.currentTarget as HTMLElement).style.transform='translateY(-2px)'}
                onMouseLeave={e=>(e.currentTarget as HTMLElement).style.transform=''}
              >Create &amp; assign</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function OwnerView({ name, greeting, dateStr, dispatch, clients }: { name: string; greeting: string; dateStr: string; dispatch: any; clients: any[] }) {
  return (
    <div style={{ animation:'fadeIn .4s ease both' }}>
      <div style={{ marginBottom:26 }}>
        <div style={{ color:'var(--c-subtle)', fontSize:13.5, fontWeight:500, marginBottom:7 }}>{dateStr} · Company at a glance</div>
        <h1 style={{ fontFamily:'var(--font-display)', fontSize:30, fontWeight:700, letterSpacing:'-0.02em' }}>{greeting}, {name}.</h1>
        <p style={{ color:'var(--c-muted)', fontSize:15.5, marginTop:8, maxWidth:'62ch' }}>Workload is mostly balanced, but Rohan is over capacity and Verve Fitness is trending toward churn.</p>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:18 }}>
        {[{label:'Active clients',val:'6',c:'var(--c-ink)',bg:'var(--c-ink)',textC:'#fff'},{label:'Avg client health',val:'73',c:'var(--c-green)',bg:'#fff'},{label:'Accounts at risk',val:'1',c:'var(--c-red)',bg:'#fff'},{label:'Team utilisation',val:'83%',c:'var(--c-amber)',bg:'#fff'}].map((s,i)=>(
          <div key={i} style={{ background:s.bg||'#fff', border:`1px solid ${s.bg==='var(--c-ink)'?'var(--c-ink)':'var(--c-border)'}`, borderRadius:16, padding:'18px 20px', color:s.bg==='var(--c-ink)'?'#fff':undefined }}>
            <div style={{ fontSize:12.5, color:s.bg==='var(--c-ink)'?'#9A9E94':'var(--c-subtle)' }}>{s.label}</div>
            <div style={{ fontFamily:'var(--font-display)', fontSize:28, fontWeight:700, marginTop:4, color:s.c }}>{s.val}</div>
          </div>
        ))}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1.3fr 1fr', gap:18 }}>
        <div style={{ background:'#fff', border:'1px solid var(--c-border)', borderRadius:18, padding:20, boxShadow:'var(--shadow-card)' }}>
          <h3 style={{ fontFamily:'var(--font-display)', fontSize:16, fontWeight:700, marginBottom:14 }}>Client health</h3>
          {clients.map(c => {
            const hi = c.health<55?{c:'#EF4444',bg:'#FDECEC',z:'At risk'}:c.health<75?{c:'var(--c-amber)',bg:'var(--c-amber-bg)',z:'Watch'}:{c:'var(--c-green)',bg:'var(--c-green-bg)',z:'Healthy'}
            return (
              <div key={c.id} style={{ display:'flex', alignItems:'center', gap:12, marginBottom:11, cursor:'pointer' }} onClick={() => dispatch({ type:'SET_SCREEN', screen:'clients' })}>
                <span style={{ width:32, height:32, borderRadius:9, background:c.color, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:11, fontFamily:'var(--font-display)', flexShrink:0 }}>{c.initials}</span>
                <div style={{ width:120, fontWeight:600, fontSize:13.5, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{c.name}</div>
                <div style={{ flex:1, height:7, background:'var(--c-fill)', borderRadius:5, overflow:'hidden' }}>
                  <div style={{ height:'100%', borderRadius:5, width:`${c.health}%`, background:hi.c, transition:'width .8s cubic-bezier(.2,.9,.3,1)' }} />
                </div>
                <span style={{ fontSize:11, fontWeight:700, borderRadius:6, padding:'2px 7px', color:hi.c, background:hi.bg, minWidth:62, textAlign:'center' }}>{hi.z}</span>
              </div>
            )
          })}
        </div>
        <div style={{ background:'linear-gradient(135deg,#1A1B17,#0E0F0C)', color:'#fff', borderRadius:18, padding:22, position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', width:220, height:220, borderRadius:'50%', background:'radial-gradient(circle,rgba(239,68,68,.22),transparent 65%)', top:-80, right:-50 }} />
          <div style={{ position:'relative', display:'flex', alignItems:'center', gap:8, color:'#FF8A6B', fontSize:12, fontWeight:700, marginBottom:12 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FF8A6B" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>
            AI RISK RADAR
          </div>
          <p style={{ position:'relative', fontSize:15, lineHeight:1.55, margin:'0 0 16px' }}><b>Verve Fitness</b> is trending toward churn — 2 missed approvals and an overdue report. Recommend a check-in this week.</p>
          <button onClick={() => dispatch({ type:'SET_SCREEN', screen:'clients' })} style={{ position:'relative', background:'var(--c-accent)', color:'#fff', borderRadius:10, padding:'10px 16px', fontWeight:700, fontSize:13 }}>Open account</button>
        </div>
      </div>
    </div>
  )
}

function ManagerView({ name, greeting, dateStr, dispatch }: any) {
  const team = [
    { id:'aanya', name:'Aanya Mehra', initials:'AM', color:'#0EA5A4', load:88, tasks:5 },
    { id:'rohan', name:'Rohan Kapoor', initials:'RK', color:'#FB7185', load:142, tasks:9 },
    { id:'zoya', name:'Zoya Khan', initials:'ZK', color:'#6366F1', load:71, tasks:6 },
    { id:'kabir', name:'Kabir Joshi', initials:'KJ', color:'#F4B740', load:80, tasks:5 },
    { id:'dev', name:'Dev Sharma', initials:'DS', color:'#8B5CF6', load:64, tasks:4 },
    { id:'ira', name:'Ira Nair', initials:'IN', color:'#2563EB', load:52, tasks:7 },
  ]
  return (
    <div style={{ animation:'fadeIn .4s ease both' }}>
      <div style={{ marginBottom:26 }}>
        <div style={{ color:'var(--c-subtle)', fontSize:13.5, fontWeight:500, marginBottom:7 }}>{dateStr} · 4 approvals · team at 83%</div>
        <h1 style={{ fontFamily:'var(--font-display)', fontSize:30, fontWeight:700, letterSpacing:'-0.02em' }}>{greeting}, {name}.</h1>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1.2fr 1fr', gap:18 }}>
        <div style={{ background:'var(--c-ink)', color:'#fff', borderRadius:18, padding:'22px 24px', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', width:260, height:260, borderRadius:'50%', background:'radial-gradient(circle,rgba(255,92,31,.2),transparent 65%)', top:-90, right:-60 }} />
          <div style={{ position:'relative', display:'flex', alignItems:'center', gap:8, color:'#FF7A45', fontSize:12, fontWeight:700, marginBottom:14 }}>
            <Sparkle size={14} style={{ animation:'sparkleSpin 8s linear infinite' }} />AI FOCUS · TODAY
          </div>
          <p style={{ position:'relative', fontSize:18, lineHeight:1.5, margin:'0 0 18px', fontWeight:500, maxWidth:'48ch' }}>Two client updates are drafted and waiting on your approval. Rohan is over capacity — a one-tap rebalance is queued in the planner.</p>
          <div style={{ position:'relative', display:'flex', gap:10 }}>
            <button onClick={() => dispatch({ type:'SET_SCREEN', screen:'planner' })} style={{ background:'var(--c-accent)', color:'#fff', borderRadius:10, padding:'10px 16px', fontWeight:700, fontSize:13 }}>Open planner</button>
            <button onClick={() => dispatch({ type:'TOGGLE_BRIEF' })} style={{ background:'rgba(255,255,255,.1)', color:'#fff', borderRadius:10, padding:'10px 16px', fontWeight:600, fontSize:13 }}>Send brief</button>
          </div>
        </div>
        <div style={{ background:'#fff', border:'1px solid var(--c-border)', borderRadius:18, padding:20, boxShadow:'var(--shadow-card)' }}>
          <h3 style={{ fontFamily:'var(--font-display)', fontSize:16, fontWeight:700, marginBottom:14 }}>Team workload</h3>
          {team.map(m => {
            const col = m.load>100?'#FF5C38':m.load>88?'var(--c-amber)':'var(--c-green)'
            return (
              <div key={m.id} style={{ display:'flex', alignItems:'center', gap:11, marginBottom:12 }}>
                <span style={{ width:30, height:30, borderRadius:8, background:m.color, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:11, fontFamily:'var(--font-display)' }}>{m.initials}</span>
                <div style={{ flex:1 }}>
                  <div style={{ height:7, background:'var(--c-fill)', borderRadius:5, overflow:'hidden' }}>
                    <div style={{ height:'100%', borderRadius:5, width:`${Math.min(m.load,100)}%`, background:col, transition:'width .8s' }} />
                  </div>
                </div>
                <span style={{ fontSize:12.5, fontWeight:700, color:col, minWidth:42, textAlign:'right' }}>{m.load}%</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
