'use client'
import { useState, useRef } from 'react'
import { useApp, useToast } from '@/lib/store'
import { ChevronLeft, ChevronRight, Planner } from '@/components/ui/Icon'
import { STATUS_PIPE, SEED_CLIENTS, SEED_TEAM } from '@/lib/seed-data'
import type { PlanItem, ContentStatus } from '@/types'

function parseMonth(key: string) {
  const [y, m] = key.split('-').map(Number)
  return { y, m }
}
function monthName(key: string) {
  const { y, m } = parseMonth(key)
  return ['January','February','March','April','May','June','July','August','September','October','November','December'][m] + ' ' + y
}
function daysInMonth(key: string) {
  const { y, m } = parseMonth(key)
  return new Date(y, m + 1, 0).getDate()
}
function dayOfWeek(key: string, d: number) {
  const { y, m } = parseMonth(key)
  return new Date(y, m, d).getDay()
}
const DN = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

export default function ContentCalendar() {
  const { state, dispatch } = useApp()
  const toast = useToast()
  const [monthKey, setMonthKey] = useState('2026-5')
  const [calClient, setCalClient] = useState('all')
  const [calDay, setCalDay] = useState<'today'|number>('today')
  const [draggingId, setDraggingId] = useState<string|null>(null)
  const [dragOverCol, setDragOverCol] = useState<string|null>(null)
  const [detailId, setDetailId] = useState<string|null>(null)
  const sliderRef = useRef<HTMLDivElement>(null)

  const now = new Date()
  const { y: my, m: mm } = parseMonth(monthKey)
  const isCurMonth = now.getFullYear() === my && now.getMonth() === mm
  const todayDate = now.getDate()
  const dim = daysInMonth(monthKey)

  const allItems = state.planItems
  const mItems = allItems.filter(it => it.month === monthKey)
  const clientItems = mItems.filter(it => calClient === 'all' || it.client_id === calClient)

  // Filter by day
  const inScope = (it: PlanItem) => {
    if (calDay === 'today') return it.status !== 'published' && (it.day == null || (isCurMonth && it.day <= todayDate))
    return it.day === calDay
  }
  const scopedItems = clientItems.filter(inScope)

  // Overdue count
  const overdueCount = clientItems.filter(it => it.status !== 'published' && it.day != null && isCurMonth && it.day < todayDate).length

  function shiftMonth(delta: number) {
    let { y, m } = parseMonth(monthKey)
    m += delta
    if (m < 0) { m = 11; y-- }
    if (m > 11) { m = 0; y++ }
    setMonthKey(y + '-' + m)
    setCalDay('today')
  }

  function moveStatus(id: string, status: ContentStatus) {
    const item = state.planItems.find(x => x.id === id)
    if (!item) return
    dispatch({ type: 'UPSERT_PLAN_ITEM', item: { ...item, status } })
    toast(`Moved to ${STATUS_PIPE.find(s => s.key === status)?.label}`)
  }

  function advanceStatus(id: string) {
    const item = state.planItems.find(x => x.id === id)
    if (!item) return
    const order = STATUS_PIPE.map(x => x.key)
    const idx = order.indexOf(item.status)
    if (idx < order.length - 1) moveStatus(id, order[idx + 1] as ContentStatus)
  }

  // Day tabs
  const dayTabs = ['today' as const, ...Array.from({ length: dim }, (_, i) => i + 1 as number)].map(id => {
    const isTod = id === 'today'
    const sel = calDay === id
    const dayN = isTod ? null : DN[dayOfWeek(monthKey, id as number)]
    const isWknd = !isTod && [0, 6].includes(dayOfWeek(monthKey, id as number))
    const hasWork = isTod
      ? clientItems.some(it => it.status !== 'published')
      : clientItems.some(it => it.day === id)
    const isActualToday = !isTod && isCurMonth && id === todayDate
    return {
      id, top: isTod ? 'TODAY' : dayN!, bot: isTod ? '' : String(id),
      sel, isWknd, hasWork, isActualToday,
    }
  })

  // Detail item
  const detailItem = detailId ? state.planItems.find(it => it.id === detailId) : null
  const person = (id: string) => SEED_TEAM.find(t => t.id === id) || { name:'Unassigned', initials:'?', color:'#9A9E94' }
  const client = (id: string) => SEED_CLIENTS.find(c => c.id === id) || SEED_CLIENTS[0]

  function deadlineLabel(it: PlanItem) {
    if (it.status === 'published') return { label: it.day ? `Posted Jun ${it.day}` : 'Posted', c:'var(--c-blue)', bg:'var(--c-blue-bg)', overdue:false }
    if (it.day == null) return { label: 'Not scheduled', c:'var(--c-faint)', bg:'var(--c-fill)', overdue:false }
    if (!isCurMonth) return { label: `Jun ${it.day}`, c:'var(--c-muted)', bg:'var(--c-fill)', overdue:false }
    const diff = it.day - todayDate
    if (diff < 0) return { label: `${-diff}d overdue`, c:'#DC2626', bg:'#FEE2E2', overdue:true }
    if (diff === 0) return { label:'Due today', c:'var(--c-accent-dark)', bg:'#FFEDD5', overdue:false }
    if (diff === 1) return { label:'1 day left', c:'var(--c-amber)', bg:'var(--c-amber-bg)', overdue:false }
    return { label: `${diff} days left`, c:'var(--c-muted)', bg:'var(--c-fill)', overdue:false }
  }

  const catStyles: Record<string,{c:string,bg:string}> = {
    social: { c:'#8B5CF6', bg:'#F3EEFE' },
    performance: { c:'var(--c-blue)', bg:'var(--c-blue-bg)' },
    seo: { c:'var(--c-green)', bg:'var(--c-green-bg)' },
  }

  return (
    <div style={{ animation:'fadeIn .4s ease both' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', gap:20, marginBottom:16, flexWrap:'wrap' }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:9, color:'var(--c-subtle)', fontSize:13.5, fontWeight:500, marginBottom:7 }}>
            Content Calendar
            <span style={{ width:4, height:4, borderRadius:'50%', background:'var(--c-rule)' }} />
            {scopedItems.length} pieces · {monthName(monthKey)}
          </div>
          <h1 style={{ fontFamily:'var(--font-display)', fontSize:30, fontWeight:700, letterSpacing:'-0.02em' }}>What&apos;s going out</h1>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:2, background:'#fff', border:'1px solid var(--c-border)', borderRadius:11, padding:4 }}>
            <button onClick={() => shiftMonth(-1)} style={{ width:32, height:32, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--c-muted)', transition:'background .15s' }}
              onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background='var(--c-fill)'}
              onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background=''}
            ><ChevronLeft size={17} /></button>
            <span style={{ fontFamily:'var(--font-display)', fontSize:14, fontWeight:700, minWidth:118, textAlign:'center' }}>{monthName(monthKey)}</span>
            <button onClick={() => shiftMonth(1)} style={{ width:32, height:32, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--c-muted)', transition:'background .15s' }}
              onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background='var(--c-fill)'}
              onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background=''}
            ><ChevronRight size={17} /></button>
          </div>
          <button onClick={() => dispatch({ type:'SET_SCREEN', screen:'contentplan' })} style={{ display:'inline-flex', alignItems:'center', gap:7, background:'var(--c-ink)', color:'#fff', borderRadius:11, padding:'10px 15px', fontWeight:600, fontSize:13.5, transition:'transform .15s' }}
            onMouseEnter={e=>(e.currentTarget as HTMLElement).style.transform='translateY(-2px)'}
            onMouseLeave={e=>(e.currentTarget as HTMLElement).style.transform=''}
          ><Planner size={15} />Open planner</button>
        </div>
      </div>

      {/* Filters row */}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12, flexWrap:'wrap' }}>
        <div style={{ position:'relative' }}>
          <select value={calClient} onChange={e => setCalClient(e.target.value)}
            style={{ appearance:'none', WebkitAppearance:'none', background:'#fff', border:'1px solid var(--c-border)', borderRadius:11, padding:'10px 38px 10px 14px', fontSize:14, fontWeight:600, color:'var(--c-ink)', cursor:'pointer' }}>
            <option value="all">All clients</option>
            {SEED_CLIENTS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--c-faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position:'absolute', right:13, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}><path d="m6 9 6 6 6-6"/></svg>
        </div>

        {overdueCount > 0 && (
          <span style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:12.5, fontWeight:700, color:'#DC2626', background:'#FEE2E2', borderRadius:9, padding:'7px 11px' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8v4M12 16h.01M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"/></svg>
            {overdueCount} overdue
          </span>
        )}

        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:5, fontSize:11.5, color:'var(--c-faint)', fontWeight:600 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--c-faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16v15H4zM4 10h16M8 3v4M16 3v4"/></svg>
          drag cards between columns to move status
        </div>
      </div>

      {/* Day slider */}
      <div ref={sliderRef} style={{ overflowX:'auto', marginBottom:14, paddingBottom:4, scrollbarWidth:'thin', scrollbarColor:'var(--c-rule) transparent' }}>
        <div style={{ display:'flex', gap:5, minWidth:'max-content', padding:'2px 0' }}>
          {dayTabs.map(t => (
            <button key={String(t.id)} onClick={() => setCalDay(t.id)}
              style={{
                display:'flex', flexDirection:'column', alignItems:'center', gap:2,
                padding: t.id === 'today' ? '9px 14px' : '8px 10px',
                borderRadius:10, minWidth: t.id === 'today' ? 58 : 38,
                border:`1.5px solid ${t.sel ? 'var(--c-ink)' : t.isActualToday ? 'var(--c-accent)' : 'var(--c-border)'}`,
                background: t.sel ? 'var(--c-ink)' : t.isActualToday ? 'var(--c-accent-bg)' : t.hasWork && !t.isWknd ? 'var(--c-fill)' : '#fff',
                color: t.sel ? '#fff' : t.isActualToday ? 'var(--c-accent-dark)' : t.isWknd && !t.hasWork ? 'var(--c-rule)' : 'var(--c-ink-3)',
                opacity: t.isWknd && !t.sel && !t.hasWork ? .45 : 1,
                transition:'all .15s', cursor:'pointer',
              }}
            >
              <span style={{ fontSize: t.id === 'today' ? 11 : 10, fontWeight:700, letterSpacing: t.id === 'today' ? '.06em' : 0, whiteSpace:'nowrap' }}>{t.top}</span>
              {t.bot && <span style={{ fontFamily:'var(--font-display)', fontSize:14, fontWeight:700, lineHeight:1 }}>{t.bot}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Kanban columns */}
      {scopedItems.length > 0 ? (
        <div style={{ display:'flex', gap:10, overflowX:'auto', paddingBottom:6 }}>
          {STATUS_PIPE.map(col => {
            const colItems = scopedItems
              .filter(it => it.status === col.key)
              .sort((a, b) => ((a.day ?? 99) - (b.day ?? 99)))

            return (
              <div key={col.key}
                onDragOver={e => { e.preventDefault(); setDragOverCol(col.key) }}
                onDrop={e => { e.preventDefault(); if (draggingId) moveStatus(draggingId, col.key as ContentStatus); setDraggingId(null); setDragOverCol(null) }}
                style={{
                  flex:1, minWidth:220,
                  background: dragOverCol === col.key ? '#FFF1EA' : 'var(--c-fill-soft)',
                  border:`1px solid ${dragOverCol === col.key ? '#FFC9AE' : 'var(--c-border-soft)'}`,
                  borderRadius:14, padding:10, minHeight:440,
                  transition:'background .15s, border-color .15s',
                }}
              >
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'5px 8px 12px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ width:9, height:9, borderRadius:'50%', background:col.c }} />
                    <span style={{ fontFamily:'var(--font-display)', fontSize:13, fontWeight:700 }}>{col.label}</span>
                  </div>
                  <span style={{ fontSize:11, fontWeight:700, color:'var(--c-ghost)' }}>{colItems.length}</span>
                </div>

                {colItems.map(it => {
                  const p = person(it.assignee_id)
                  const c = client(it.client_id)
                  const dl = deadlineLabel(it)
                  const cs = catStyles[it.cat] || catStyles.social
                  const isDragging = draggingId === it.id

                  return (
                    <div key={it.id}
                      draggable
                      onDragStart={() => setDraggingId(it.id)}
                      onDragEnd={() => { setDraggingId(null); setDragOverCol(null) }}
                      onClick={() => setDetailId(it.id)}
                      style={{
                        background:'#fff',
                        border:`1px solid ${dl.overdue ? '#FCA5A5' : 'var(--c-border-soft)'}`,
                        borderLeft:`3px solid ${c.color}`,
                        borderRadius:11, padding:'10px 11px',
                        cursor:'pointer', marginBottom:8,
                        opacity: isDragging ? .35 : 1,
                        boxShadow: isDragging ? 'none' : '0 1px 2px rgba(16,17,12,.05)',
                        transition:'box-shadow .15s, transform .15s, opacity .15s',
                      }}
                      onMouseEnter={e => { if (!isDragging) { (e.currentTarget as HTMLElement).style.boxShadow='0 8px 20px -10px rgba(16,17,12,.25)'; (e.currentTarget as HTMLElement).style.transform='translateY(-1px)' } }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow='0 1px 2px rgba(16,17,12,.05)'; (e.currentTarget as HTMLElement).style.transform='' }}
                    >
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:6, marginBottom:8 }}>
                        <span style={{ fontSize:10, fontWeight:700, borderRadius:6, padding:'2px 7px', color:dl.c, background:dl.bg }}>{dl.label}</span>
                        {it.day && <span style={{ fontSize:9.5, fontWeight:700, color:'var(--c-faint)', background:'var(--c-fill)', borderRadius:5, padding:'2px 6px' }}>Jun {it.day}</span>}
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
                        <span style={{ width:7, height:7, borderRadius:'50%', background:c.color, flexShrink:0 }} />
                        <span style={{ fontSize:10.5, fontWeight:700, color:c.color }}>{c.name}</span>
                      </div>
                      <div style={{ fontSize:12.5, fontWeight:600, lineHeight:1.3, color:'var(--c-ink-2)', marginBottom:9 }}>{it.title}</div>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:6 }}>
                        <span style={{ fontSize:9.5, fontWeight:700, color:cs.c, background:cs.bg, borderRadius:5, padding:'2px 7px' }}>{it.type}</span>
                        <span title={p.name} style={{ width:21, height:21, borderRadius:6, background:p.color, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:9, fontFamily:'var(--font-display)' }}>{p.initials}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      ) : (
        <div style={{ background:'#fff', border:'1px dashed var(--c-rule)', borderRadius:18, padding:'48px 20px', textAlign:'center' }}>
          <div style={{ width:48, height:48, borderRadius:13, background:'var(--c-fill)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--c-faint)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16v15H4zM4 10h16M8 3v4M16 3v4"/></svg>
          </div>
          <h3 style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:700, marginBottom:6 }}>
            {calDay === 'today' ? 'Nothing pending' : `Nothing scheduled for Jun ${calDay}`}
          </h3>
          <p style={{ margin:'0 auto 16px', color:'var(--c-subtle)', fontSize:14, maxWidth:'48ch' }}>
            Plan deliverables in the Content Planner, then push &amp; assign — they&apos;ll appear here as cards.
          </p>
          <button onClick={() => dispatch({ type:'SET_SCREEN', screen:'contentplan' })} style={{ background:'var(--c-ink)', color:'#fff', borderRadius:11, padding:'11px 18px', fontWeight:600, fontSize:14, display:'inline-flex', alignItems:'center', gap:8 }}>
            <Planner size={15} />Open Content Planner
          </button>
        </div>
      )}

      {/* Detail modal */}
      {detailItem && (
        <div onClick={() => setDetailId(null)} className="modal-overlay">
          <div onClick={e => e.stopPropagation()} style={{ width:'100%', maxWidth:540, background:'#fff', borderRadius:22, overflow:'hidden', boxShadow:'var(--shadow-modal)', animation:'popIn .26s cubic-bezier(.2,.9,.3,1) both' }}>
            <div style={{ padding:'20px 24px', borderBottom:'1px solid var(--c-border-soft)' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ width:9, height:9, borderRadius:'50%', background:client(detailItem.client_id).color }} />
                  <span style={{ fontSize:12, fontWeight:700, color:client(detailItem.client_id).color }}>{client(detailItem.client_id).name}</span>
                </div>
                <button onClick={() => setDetailId(null)} style={{ width:32, height:32, borderRadius:9, background:'var(--c-fill)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--c-muted)" strokeWidth="2.2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
              </div>
              <h3 style={{ fontFamily:'var(--font-display)', fontSize:19, fontWeight:700, marginBottom:10, lineHeight:1.25 }}>{detailItem.title}</h3>
              <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                {(() => { const cs = catStyles[detailItem.cat] || catStyles.social; return <span style={{ fontSize:11, fontWeight:700, color:cs.c, background:cs.bg, borderRadius:6, padding:'3px 9px' }}>{detailItem.type}</span> })()}
                {detailItem.day && <span style={{ fontSize:11, fontWeight:700, color:'var(--c-blue)', background:'var(--c-blue-bg)', borderRadius:6, padding:'3px 9px' }}>Jun {detailItem.day}</span>}
                {(() => { const st = STATUS_PIPE.find(x => x.key === detailItem.status)!; return <span style={{ fontSize:11, fontWeight:700, borderRadius:6, padding:'3px 9px', color:st.c, background:st.bg }}>{st.label}</span> })()}
                <span style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:12, color:'var(--c-subtle)' }}>
                  <span style={{ width:20, height:20, borderRadius:6, background:person(detailItem.assignee_id).color, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:9, fontFamily:'var(--font-display)' }}>{person(detailItem.assignee_id).initials}</span>
                  {person(detailItem.assignee_id).name}
                </span>
              </div>
            </div>
            <div style={{ padding:'20px 24px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
                <span style={{ fontSize:10.5, fontWeight:700, color:'var(--c-ghost)', textTransform:'uppercase', letterSpacing:'.05em' }}>Effort</span>
                <div style={{ display:'flex', gap:4 }}>
                  {[1,2,3,4,5].map(i => (
                    <span key={i} style={{ width:7, height:13, borderRadius:3, background: i <= detailItem.effort ? 'var(--c-accent)' : 'var(--c-border)' }} />
                  ))}
                </div>
                <span style={{ fontSize:12.5, color:'var(--c-subtle)' }}>{detailItem.effort}/5</span>
              </div>
              <div style={{ fontSize:10.5, fontWeight:700, color:'var(--c-ghost)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:6 }}>Brief</div>
              <p style={{ margin:'0 0 16px', fontSize:13.5, lineHeight:1.6, color:'var(--c-ink-3)' }}>{detailItem.brief || 'No brief added yet.'}</p>
              {detailItem.refs && detailItem.refs.length > 0 && (
                <>
                  <div style={{ fontSize:10.5, fontWeight:700, color:'var(--c-ghost)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:7 }}>Inspiration</div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
                    {detailItem.refs.map((r,i) => (
                      <span key={i} style={{ display:'inline-flex', alignItems:'center', gap:6, background:'var(--c-fill-soft)', border:'1px solid var(--c-border)', borderRadius:8, padding:'6px 11px', fontSize:12.5, fontWeight:600, color:'var(--c-ink-3)' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--c-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></svg>
                        {r.label}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, padding:'16px 24px', background:'var(--c-fill-soft)', borderTop:'1px solid var(--c-border-soft)' }}>
              <button onClick={() => dispatch({ type:'SET_SCREEN', screen:'contentplan' })} style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:13.5, fontWeight:600, color:'var(--c-ink-3)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>
                Edit deliverable
              </button>
              {(() => {
                const order = STATUS_PIPE.map(x => x.key)
                const idx = order.indexOf(detailItem.status)
                if (idx >= order.length - 1) return null
                const next = STATUS_PIPE[idx + 1]
                return (
                  <button onClick={() => { advanceStatus(detailItem.id); setDetailId(null) }}
                    style={{ padding:'11px 18px', borderRadius:11, fontWeight:700, fontSize:14, background:'var(--c-ink)', color:'#fff', transition:'transform .15s' }}
                    onMouseEnter={e=>(e.currentTarget as HTMLElement).style.transform='translateY(-2px)'}
                    onMouseLeave={e=>(e.currentTarget as HTMLElement).style.transform=''}
                  >Move to {next.label}</button>
                )
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
