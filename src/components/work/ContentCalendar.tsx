'use client'
import React, { useState } from 'react'
import { useApp, useToast, useUpsertPlanItem } from '@/lib/store'
import { ChevronLeft, ChevronRight, Planner } from '@/components/ui/Icon'
import { STATUS_PIPE } from '@/lib/seed-data'
import type { PlanItem, ContentStatus } from '@/types'

function parseMonth(key: string) {
  const [y, m] = key.split('-').map(Number)
  return { y, m }
}
function monthLabel(key: string) {
  const { y, m } = parseMonth(key)
  return ['January','February','March','April','May','June','July','August','September','October','November','December'][m] + ' ' + y
}
function weekNum(day: number): number {
  return Math.ceil(day / 7)
}
function weekLabel(day: number | null) {
  if (!day) return null
  return `W${weekNum(day)}`
}

const WEEK_RANGES = [
  { key: 'today', label: 'Today' },
  { key: 'w1', label: 'W1', start: 1, end: 7 },
  { key: 'w2', label: 'W2', start: 8, end: 14 },
  { key: 'w3', label: 'W3', start: 15, end: 21 },
  { key: 'w4', label: 'W4', start: 22, end: 28 },
  { key: 'w5', label: 'W5', start: 29, end: 31 },
  { key: 'month', label: 'This Month' },
] as const

const CLIENT_COLORS: Record<string, string> = {
  sunso: '#FF5C1F', lumio: '#3B82F6', elysian: '#10B981',
  verve: '#EF4444', weekend: '#8B5CF6',
}

function getMonthKey() {
  const d = new Date()
  return `${d.getFullYear()}-${d.getMonth() + 1}`
}

export default function ContentCalendar() {
  const { state, dispatch } = useApp()
  const toast = useToast()
  const upsertPlanItem = useUpsertPlanItem()
  const [monthKey, setMonthKey] = useState(getMonthKey)
  const [monthAutoSet, setMonthAutoSet] = useState(false)

  // Once plan items load, jump to a month that has data if current has none
  React.useEffect(() => {
    if (monthAutoSet || state.planItems.length === 0) return
    const cur = getMonthKey()
    const d = new Date(); d.setMonth(d.getMonth() - 1)
    const prev = `${d.getFullYear()}-${d.getMonth() + 1}`
    if (!state.planItems.some(i => i.month === cur) && state.planItems.some(i => i.month === prev)) {
      setMonthKey(prev)
    }
    setMonthAutoSet(true)
  }, [state.planItems, monthAutoSet])
  const [calClient, setCalClient] = useState('all')
  const [weekFilter, setWeekFilter] = useState<'today'|'w1'|'w2'|'w3'|'w4'|'w5'|'month'>('today')
  const [draggingId, setDraggingId] = useState<string|null>(null)
  const [dragOverCol, setDragOverCol] = useState<string|null>(null)
  const [detailId, setDetailId] = useState<string|null>(null)
  const now = new Date()
  const { y: my, m: mm } = parseMonth(monthKey)
  const isCurMonth = now.getFullYear() === my && now.getMonth() === mm
  const todayDate = now.getDate()

  const allItems = state.planItems
  const mItems = allItems.filter(it => it.month === monthKey)
  const clientItems = mItems.filter(it => calClient === 'all' || it.client_id === calClient)

  // Scope filter
  const inScope = (it: PlanItem): boolean => {
    if (weekFilter === 'today') return it.status !== 'published'
    if (weekFilter === 'month') return true
    const wr = WEEK_RANGES.find(w => w.key === weekFilter)
    if (!wr || !('start' in wr)) return true
    if (it.day == null) return false
    return it.day >= wr.start && it.day <= wr.end
  }
  const scopedItems = clientItems.filter(inScope)
  const overdueCount = clientItems.filter(it =>
    it.status !== 'published' && it.day != null && isCurMonth && it.day < todayDate
  ).length

  function shiftMonth(delta: number) {
    let { y, m } = parseMonth(monthKey)
    m += delta
    if (m < 0) { m = 11; y-- }
    if (m > 11) { m = 0; y++ }
    setMonthKey(y + '-' + m)
  }

  function moveStatus(id: string, status: ContentStatus) {
    const item = state.planItems.find(x => x.id === id)
    if (!item) return
    upsertPlanItem({ ...item, status })
    toast(`Moved to ${STATUS_PIPE.find(s => s.key === status)?.label}`)
  }

  function advanceStatus(id: string) {
    const item = state.planItems.find(x => x.id === id)
    if (!item) return
    const order = STATUS_PIPE.map(x => x.key)
    const idx = order.indexOf(item.status)
    if (idx < order.length - 1) moveStatus(id, order[idx + 1] as ContentStatus)
  }

  function deadlineLabel(it: PlanItem) {
    if (it.status === 'published') return { label: it.day ? `Posted Jun ${it.day}` : 'Posted', c:'#2563EB', bg:'#EFF6FF', overdue:false }
    if (it.day == null) return { label: 'Not scheduled', c:'var(--c-faint)', bg:'var(--c-fill)', overdue:false }
    if (!isCurMonth) return { label: weekLabel(it.day) || '', c:'var(--c-muted)', bg:'var(--c-fill)', overdue:false }
    const diff = it.day - todayDate
    if (diff < 0) return { label: `${-diff}d overdue`, c:'#DC2626', bg:'#FEE2E2', overdue:true }
    if (diff === 0) return { label:'Due today', c:'#C2430F', bg:'#FFEDD5', overdue:false }
    if (diff <= 2) return { label:`${diff}d left`, c:'#B45309', bg:'#FEF3C7', overdue:false }
    return { label:`${diff}d left`, c:'var(--c-muted)', bg:'var(--c-fill)', overdue:false }
  }

  const person = (id: string) => state.users.find(t => t.id === id) || { name:'Unassigned', initials:'?', color:'#9A9E94' }
  const clientFor = (id: string) => state.clients.find(c => c.id === id) || state.clients[0] || { name:'Client', color:'#ccc', initials:'C' }
  const detailItem = detailId ? state.planItems.find(it => it.id === detailId) : null

  const typeColor = (it: PlanItem) => {
    const map: Record<string, {c:string,bg:string}> = {
      Reel:         { c:'#7C3AED', bg:'#F3EEFE' },
      Carousel:     { c:'#0369A1', bg:'#E0F2FE' },
      Story:        { c:'#059669', bg:'#D1FAE5' },
      'Blog Article':   { c:'#B45309', bg:'#FEF3C7' },
      'Meta Ads Campaign': { c:'#DC2626', bg:'#FEE2E2' },
      'Google Ads':  { c:'#0284C7', bg:'#E0F2FE' },
    }
    return map[it.type] || { c:'#6B7280', bg:'#F3F4F6' }
  }

  const effortLabel = (n: number) => ['','Light','Easy','Medium','Heavy','Max'][n] || ''

  return (
    <div style={{ animation:'fadeIn .4s ease both' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', gap:20, marginBottom:20 }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:8, color:'var(--c-faint)', fontSize:13, fontWeight:500, marginBottom:7 }}>
            Content Calendar
            <span style={{ width:4, height:4, borderRadius:'50%', background:'var(--c-rule)' }} />
            <span style={{ fontWeight:600, color:'var(--c-subtle)' }}>{clientItems.length} pieces</span>
            <span style={{ width:4, height:4, borderRadius:'50%', background:'var(--c-rule)' }} />
            {monthLabel(monthKey)}
          </div>
          <h1 style={{ fontFamily:'var(--font-display)', fontSize:30, fontWeight:700, letterSpacing:'-0.02em' }}>What&apos;s going out</h1>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          {/* Month nav */}
          <div style={{ display:'flex', alignItems:'center', gap:2, background:'#fff', border:'1px solid var(--c-border)', borderRadius:11, padding:4 }}>
            <button onClick={() => shiftMonth(-1)}
              style={{ width:32, height:32, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--c-muted)', transition:'background .15s' }}
              onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background='var(--c-fill)'}
              onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background=''}><ChevronLeft size={17} /></button>
            <span style={{ fontFamily:'var(--font-display)', fontSize:14, fontWeight:700, minWidth:100, textAlign:'center' }}>{monthLabel(monthKey)}</span>
            <button onClick={() => shiftMonth(1)}
              style={{ width:32, height:32, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--c-muted)', transition:'background .15s' }}
              onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background='var(--c-fill)'}
              onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background=''}><ChevronRight size={17} /></button>
          </div>
          {/* Open planner */}
          <button onClick={() => dispatch({ type:'SET_SCREEN', screen:'contentplan' })}
            style={{ display:'inline-flex', alignItems:'center', gap:7, background:'var(--c-ink)', color:'#fff', borderRadius:11, padding:'10px 15px', fontWeight:600, fontSize:13.5, transition:'transform .15s' }}
            onMouseEnter={e=>(e.currentTarget as HTMLElement).style.transform='translateY(-2px)'}
            onMouseLeave={e=>(e.currentTarget as HTMLElement).style.transform=''}>
            <Planner size={15} />Open planner
          </button>
        </div>
      </div>

      {/* Filters + Week tabs row */}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14, flexWrap:'wrap' }}>
        {/* Client filter */}
        <div style={{ position:'relative' }}>
          <select value={calClient} onChange={e => setCalClient(e.target.value)}
            style={{ appearance:'none', WebkitAppearance:'none', background:'#fff', border:'1.5px solid var(--c-border)', borderRadius:11, padding:'9px 36px 9px 13px', fontSize:13.5, fontWeight:600, color:'var(--c-ink)', cursor:'pointer' }}>
            <option value="all">All clients</option>
            {state.clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--c-faint)" strokeWidth="2.2" strokeLinecap="round" style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}><path d="m6 9 6 6 6-6"/></svg>
        </div>

        {/* Overdue badge */}
        {overdueCount > 0 && (
          <button onClick={() => setWeekFilter('today')}
            style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:12.5, fontWeight:700, color:'#DC2626', background:'#FEE2E2', borderRadius:9, padding:'7px 12px', border:'none', cursor:'pointer' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
            {overdueCount} overdue
          </button>
        )}

        {/* Drag tip */}
        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:5, fontSize:11.5, color:'var(--c-faint)', fontWeight:500 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--c-faint)" strokeWidth="2" strokeLinecap="round"><rect x="4" y="6" width="16" height="15" rx="1"/><path d="M4 10h16M8 3v4M16 3v4"/></svg>
          drag cards between columns to move status
        </div>

        {/* Week tabs */}
        <div style={{ display:'flex', gap:3, background:'var(--c-fill)', borderRadius:10, padding:3 }}>
          {WEEK_RANGES.map(w => {
            const sel = weekFilter === w.key
            return (
              <button key={w.key}
                onClick={() => setWeekFilter(w.key)}
                style={{ padding:'5px 12px', borderRadius:7, fontSize:12.5, fontWeight:700, background: sel ? '#fff' : 'transparent', color: sel ? 'var(--c-ink)' : 'var(--c-muted)', boxShadow: sel ? '0 1px 3px rgba(0,0,0,.1)' : 'none', transition:'all .12s', whiteSpace:'nowrap' }}>
                {w.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Kanban */}
      {scopedItems.length > 0 ? (
        <div style={{ display:'flex', gap:10, overflowX:'auto', paddingBottom:8, alignItems:'start' }}>
          {STATUS_PIPE.map(col => {
            const colItems = scopedItems
              .filter(it => it.status === col.key)
              .sort((a, b) => ((a.day ?? 99) - (b.day ?? 99)))

            return (
              <div key={col.key}
                onDragOver={e => { e.preventDefault(); setDragOverCol(col.key) }}
                onDragLeave={() => setDragOverCol(null)}
                onDrop={e => { e.preventDefault(); if (draggingId) moveStatus(draggingId, col.key as ContentStatus); setDraggingId(null); setDragOverCol(null) }}
                style={{
                  flex:'0 0 230px', minWidth:230,
                  background: dragOverCol === col.key ? '#FFF5F0' : 'var(--c-fill-soft)',
                  border:`1.5px solid ${dragOverCol === col.key ? '#FFC9AE' : 'transparent'}`,
                  borderRadius:14, padding:10, minHeight:480,
                  transition:'background .15s, border-color .15s',
                }}>

                {/* Column header */}
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'4px 6px 12px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                    <span style={{ width:8, height:8, borderRadius:'50%', background:col.c }} />
                    <span style={{ fontFamily:'var(--font-display)', fontSize:13, fontWeight:700, color:'var(--c-ink)' }}>{col.label}</span>
                  </div>
                  <span style={{ fontSize:12, fontWeight:700, color:'var(--c-ghost)', background:'var(--c-fill)', borderRadius:6, padding:'1px 7px' }}>{colItems.length}</span>
                </div>

                {/* Cards */}
                {colItems.map(it => {
                  const p = person(it.assignee_id)
                  const c = clientFor(it.client_id)
                  const dl = deadlineLabel(it)
                  const tc = typeColor(it)
                  const wl = weekLabel(it.day)
                  const isDragging = draggingId === it.id

                  return (
                    <div key={it.id}
                      draggable
                      onDragStart={e => { setDraggingId(it.id); e.dataTransfer.effectAllowed = 'move' }}
                      onDragEnd={() => { setDraggingId(null); setDragOverCol(null) }}
                      onClick={() => setDetailId(it.id)}
                      style={{
                        background:'#fff',
                        border:`1px solid ${dl.overdue ? '#FCA5A580' : 'var(--c-border-soft)'}`,
                        borderLeft:`3px solid ${c.color || CLIENT_COLORS[it.client_id] || '#ccc'}`,
                        borderRadius:11, padding:'11px 12px', cursor:'grab',
                        marginBottom:8, opacity: isDragging ? .3 : 1,
                        boxShadow:'0 1px 3px rgba(16,17,12,.06)',
                        transition:'box-shadow .15s, transform .15s, opacity .1s',
                        userSelect:'none',
                      }}
                      onMouseEnter={e => { if (!isDragging) { const el = e.currentTarget as HTMLElement; el.style.boxShadow='0 8px 24px -8px rgba(16,17,12,.18)'; el.style.transform='translateY(-1px)' } }}
                      onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.boxShadow='0 1px 3px rgba(16,17,12,.06)'; el.style.transform='' }}>

                      {/* Top row: deadline + week */}
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:6, marginBottom:8 }}>
                        <span style={{ fontSize:10.5, fontWeight:700, borderRadius:6, padding:'2px 7px', color:dl.c, background:dl.bg }}>{dl.label}</span>
                        {wl && <span style={{ fontSize:10, fontWeight:700, color:'var(--c-ghost)', background:'var(--c-fill)', borderRadius:5, padding:'2px 6px' }}>{wl}</span>}
                      </div>

                      {/* Client name */}
                      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
                        <span style={{ width:7, height:7, borderRadius:'50%', background:c.color || '#ccc', flexShrink:0 }} />
                        <span style={{ fontSize:11, fontWeight:700, color:c.color || 'var(--c-ink)' }}>{c.name}</span>
                      </div>

                      {/* Title */}
                      <div style={{ fontSize:13, fontWeight:600, lineHeight:1.35, color:'var(--c-ink)', marginBottom:10 }}>{it.title}</div>

                      {/* Bottom: type + assignee */}
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:6 }}>
                        <span style={{ fontSize:10.5, fontWeight:700, color:tc.c, background:tc.bg, borderRadius:6, padding:'3px 8px' }}>{it.type}</span>
                        <span title={p.name} style={{ width:22, height:22, borderRadius:7, background:p.color, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:9, fontFamily:'var(--font-display)', flexShrink:0 }}>{p.initials}</span>
                      </div>
                    </div>
                  )
                })}

                {/* Drop zone hint when empty */}
                {colItems.length === 0 && (
                  <div style={{ border:'2px dashed var(--c-rule)', borderRadius:10, height:80, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <span style={{ fontSize:11.5, color:'var(--c-rule)', fontWeight:500 }}>Drop here</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div style={{ background:'#fff', border:'1px dashed var(--c-rule)', borderRadius:18, padding:'52px 20px', textAlign:'center' }}>
          <div style={{ width:48, height:48, borderRadius:13, background:'var(--c-fill)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--c-faint)" strokeWidth="1.7" strokeLinecap="round"><rect x="4" y="6" width="16" height="15" rx="1"/><path d="M4 10h16M8 3v4M16 3v4"/></svg>
          </div>
          <h3 style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:700, marginBottom:6 }}>Nothing here yet</h3>
          <p style={{ margin:'0 auto 18px', color:'var(--c-subtle)', fontSize:14, maxWidth:'44ch' }}>
            Plan deliverables in the Content Planner, then push &amp; assign to see them here.
          </p>
          <button onClick={() => dispatch({ type:'SET_SCREEN', screen:'contentplan' })}
            style={{ background:'var(--c-ink)', color:'#fff', borderRadius:11, padding:'11px 18px', fontWeight:600, fontSize:14, display:'inline-flex', alignItems:'center', gap:8 }}>
            <Planner size={15} />Open Content Planner
          </button>
        </div>
      )}

      {/* Detail Modal */}
      {detailItem && (() => {
        const c = clientFor(detailItem.client_id)
        const p = person(detailItem.assignee_id)
        const dl = deadlineLabel(detailItem)
        const tc = typeColor(detailItem)
        const st = STATUS_PIPE.find(x => x.key === detailItem.status)!
        const order = STATUS_PIPE.map(x => x.key)
        const idx = order.indexOf(detailItem.status)
        const nextStatus = idx < order.length - 1 ? STATUS_PIPE[idx + 1] : null

        return (
          <div onClick={() => setDetailId(null)} className="modal-overlay">
            <div onClick={e => e.stopPropagation()}
              style={{ width:'100%', maxWidth:520, background:'#fff', borderRadius:22, overflow:'hidden', boxShadow:'var(--shadow-modal)', animation:'popIn .26s cubic-bezier(.2,.9,.3,1) both' }}>

              {/* Modal header */}
              <div style={{ padding:'20px 24px 18px', borderBottom:'1px solid var(--c-border-soft)' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                    <span style={{ width:8, height:8, borderRadius:'50%', background:c.color }} />
                    <span style={{ fontSize:12.5, fontWeight:700, color:c.color }}>{c.name}</span>
                  </div>
                  <button onClick={() => setDetailId(null)}
                    style={{ width:32, height:32, borderRadius:9, background:'var(--c-fill)', display:'flex', alignItems:'center', justifyContent:'center', border:'none', cursor:'pointer' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--c-muted)" strokeWidth="2.2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                  </button>
                </div>

                <h3 style={{ fontFamily:'var(--font-display)', fontSize:20, fontWeight:700, marginBottom:14, lineHeight:1.2 }}>{detailItem.title}</h3>

                {/* Tag pills */}
                <div style={{ display:'flex', alignItems:'center', gap:7, flexWrap:'wrap' }}>
                  <span style={{ fontSize:11.5, fontWeight:700, color:tc.c, background:tc.bg, borderRadius:7, padding:'4px 10px' }}>{detailItem.type}</span>
                  {detailItem.day && (
                    <span style={{ fontSize:11.5, fontWeight:700, color:'#2563EB', background:'#EFF6FF', borderRadius:7, padding:'4px 10px' }}>
                      {new Date(my, mm, detailItem.day).toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short' })}
                    </span>
                  )}
                  <span style={{ fontSize:11.5, fontWeight:700, borderRadius:7, padding:'4px 10px', color:st.c, background:st.bg }}>{st.label}</span>
                  <span style={{ display:'inline-flex', alignItems:'center', gap:6, background:'var(--c-fill)', borderRadius:7, padding:'4px 10px' }}>
                    <span style={{ width:18, height:18, borderRadius:5, background:p.color, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:8, fontFamily:'var(--font-display)' }}>{p.initials}</span>
                    <span style={{ fontSize:11.5, fontWeight:600, color:'var(--c-ink-3)' }}>{p.name}</span>
                  </span>
                </div>
              </div>

              {/* Modal body */}
              <div style={{ padding:'20px 24px' }}>
                {/* Effort */}
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18 }}>
                  <span style={{ fontSize:10.5, fontWeight:700, color:'var(--c-ghost)', textTransform:'uppercase', letterSpacing:'.06em', minWidth:44 }}>Effort</span>
                  <div style={{ display:'flex', gap:5 }}>
                    {[1,2,3,4,5].map(i => (
                      <span key={i} style={{ width:14, height:14, borderRadius:'50%', background: i <= detailItem.effort ? '#FF5C1F' : 'var(--c-border)', display:'block', transition:'background .1s' }} />
                    ))}
                  </div>
                  <span style={{ fontSize:13, color:'var(--c-subtle)', fontWeight:500 }}>{effortLabel(detailItem.effort)} · {detailItem.effort}/5</span>
                </div>

                {/* Brief */}
                <div style={{ fontSize:10.5, fontWeight:700, color:'var(--c-ghost)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:7 }}>Brief</div>
                <p style={{ margin:'0 0 18px', fontSize:14, lineHeight:1.65, color:'var(--c-ink-3)' }}>
                  {detailItem.brief || 'No brief added yet. Open the Content Planner to add a brief.'}
                </p>

                {/* Inspiration */}
                {detailItem.refs && detailItem.refs.length > 0 && (
                  <>
                    <div style={{ fontSize:10.5, fontWeight:700, color:'var(--c-ghost)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:9 }}>Inspiration</div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
                      {detailItem.refs.map((r, i) => (
                        <span key={i} style={{ display:'inline-flex', alignItems:'center', gap:7, background:'var(--c-fill-soft)', border:'1px solid var(--c-border)', borderRadius:9, padding:'7px 12px', fontSize:13, fontWeight:600, color:'var(--c-ink-3)' }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FF5C1F" strokeWidth="2" strokeLinecap="round"><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></svg>
                          {r.label}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Modal footer */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 24px', background:'var(--c-fill-soft)', borderTop:'1px solid var(--c-border-soft)' }}>
                <button
                  onClick={() => { setDetailId(null); dispatch({ type:'SET_SCREEN', screen:'contentplan' }) }}
                  style={{ display:'inline-flex', alignItems:'center', gap:7, fontSize:13.5, fontWeight:600, color:'var(--c-ink-3)', background:'none', border:'none', cursor:'pointer', padding:'8px 4px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>
                  Edit deliverable
                </button>
                {nextStatus && (
                  <button
                    onClick={() => { advanceStatus(detailItem.id); setDetailId(null) }}
                    style={{ padding:'11px 20px', borderRadius:11, fontWeight:700, fontSize:14, background:'var(--c-ink)', color:'#fff', border:'none', cursor:'pointer', transition:'transform .15s' }}
                    onMouseEnter={e=>(e.currentTarget as HTMLElement).style.transform='translateY(-2px)'}
                    onMouseLeave={e=>(e.currentTarget as HTMLElement).style.transform=''}>
                    Move to {nextStatus.label}
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
