'use client'
import { useState } from 'react'
import { useApp, useToast } from '@/lib/store'
import { Sparkle, Spinner, Warning } from '@/components/ui/Icon'

const TEAM_DATA = [
  { id: 'aanya', name: 'Aanya Mehra', role: 'Designer', initials: 'AM', color: '#8B5CF6', tasks: 5, pct: 88 },
  { id: 'rohan', name: 'Rohan Kapoor', role: 'Video Editor', initials: 'RK', color: '#EF4444', tasks: 9, pct: 142 },
  { id: 'zoya', name: 'Zoya Khan', role: 'Copywriter', initials: 'ZK', color: '#10B981', tasks: 6, pct: 71 },
  { id: 'kabir', name: 'Kabir Joshi', role: 'Performance', initials: 'KJ', color: '#F59E0B', tasks: 5, pct: 80 },
  { id: 'dev', name: 'Dev Sharma', role: 'Strategist', initials: 'DS', color: '#3B82F6', tasks: 4, pct: 64 },
  { id: 'ira', name: 'Ira Nair', role: 'Account Mgr', initials: 'IN', color: '#EC4899', tasks: 7, pct: 52 },
]

const AI_DAYS: Record<string, { hours: number; blocks: { time: string; dur: string; title: string; client: string; tag?: string; tagColor?: string; barColor: string }[] }> = {
  aanya: {
    hours: 9,
    blocks: [
      { time: '9:00', dur: '30m', title: 'Morning brief + team standup', client: 'Team', barColor: '#6B7280' },
      { time: '9:30', dur: '2h 30m', title: 'SUNSO — "Glow ritual" carousel, 3 slides', client: 'SUNSO', tag: 'Deep work', tagColor: '#F59E0B', barColor: '#FF5C1F' },
      { time: '12:00', dur: '45m', title: 'Lunch', client: '', barColor: '#D1D5DB' },
      { time: '1:00', dur: '1h', title: 'Weekend Doors — reel cover + thumbnails', client: 'The Weekend Doors', barColor: '#8B5CF6' },
      { time: '2:00', dur: '2h', title: 'Elysian Trails — story templates ×5', client: 'Elysian Trails', barColor: '#10B981' },
      { time: '4:00', dur: '30m', title: 'SUNSO — resize website hero banner', client: 'SUNSO', barColor: '#FF5C1F' },
      { time: '4:30', dur: '1h', title: 'Lumio — Diwali key visual, v1 draft', client: 'Lumio', tag: 'High priority', tagColor: '#EF4444', barColor: '#3B82F6' },
    ],
  },
  rohan: {
    hours: 10,
    blocks: [
      { time: '9:00', dur: '30m', title: 'Morning brief + Slack triage', client: '', barColor: '#6B7280' },
      { time: '9:30', dur: '1h 30m', title: 'Verve — product reel, v2 edit', client: 'Verve', tag: 'Deep work', tagColor: '#F59E0B', barColor: '#EF4444' },
      { time: '11:00', dur: '1h', title: 'SUNSO — unboxing reel cut', client: 'SUNSO', barColor: '#FF5C1F' },
      { time: '12:00', dur: '1h', title: 'Lunch + review notes', client: '', barColor: '#D1D5DB' },
      { time: '1:00', dur: '2h', title: 'Weekend Doors — promo video edit', client: 'The Weekend Doors', barColor: '#8B5CF6' },
      { time: '3:00', dur: '1h', title: 'Lumio — brand film rough cut', client: 'Lumio', tag: 'High priority', tagColor: '#EF4444', barColor: '#3B82F6' },
      { time: '4:00', dur: '1h', title: 'Client review calls & EOD exports', client: '', barColor: '#6B7280' },
    ],
  },
  zoya: {
    hours: 8,
    blocks: [
      { time: '9:00', dur: '30m', title: 'Morning brief + content review', client: '', barColor: '#6B7280' },
      { time: '9:30', dur: '2h', title: 'SUNSO — product description refresh ×10', client: 'SUNSO', tag: 'Deep work', tagColor: '#F59E0B', barColor: '#10B981' },
      { time: '11:30', dur: '30m', title: 'Elysian Trails — caption pack', client: 'Elysian Trails', barColor: '#10B981' },
      { time: '12:00', dur: '45m', title: 'Lunch', client: '', barColor: '#D1D5DB' },
      { time: '1:00', dur: '1h 30m', title: 'Lumio — festive email campaign copy', client: 'Lumio', barColor: '#3B82F6' },
      { time: '2:30', dur: '1h', title: 'Weekend Doors — menu + promo copy', client: 'The Weekend Doors', barColor: '#8B5CF6' },
    ],
  },
  dev: {
    hours: 7,
    blocks: [
      { time: '9:00', dur: '30m', title: 'Morning brief + client check-ins', client: '', barColor: '#6B7280' },
      { time: '9:30', dur: '2h', title: 'SUNSO — Q3 strategy deck', client: 'SUNSO', tag: 'Deep work', tagColor: '#F59E0B', barColor: '#3B82F6' },
      { time: '11:30', dur: '1h', title: 'Lumio — brand positioning session', client: 'Lumio', barColor: '#3B82F6' },
      { time: '1:00', dur: '1h', title: 'Elysian Trails — content calendar plan', client: 'Elysian Trails', barColor: '#10B981' },
      { time: '2:00', dur: '1h 30m', title: 'Agency weekly review + reporting', client: 'Internal', barColor: '#6B7280' },
    ],
  },
  ira: {
    hours: 8,
    blocks: [
      { time: '9:00', dur: '1h', title: 'Morning brief + client emails', client: '', barColor: '#6B7280' },
      { time: '10:00', dur: '1h', title: 'SUNSO — monthly check-in call', client: 'SUNSO', barColor: '#FF5C1F' },
      { time: '11:00', dur: '1h', title: 'Lumio — onboarding & asset briefing', client: 'Lumio', barColor: '#3B82F6' },
      { time: '12:00', dur: '45m', title: 'Lunch', client: '', barColor: '#D1D5DB' },
      { time: '1:00', dur: '2h', title: 'Elysian Trails — campaign review + approval', client: 'Elysian Trails', barColor: '#10B981' },
      { time: '3:00', dur: '1h', title: 'New client intake — Weekend Doors', client: 'The Weekend Doors', tag: 'High priority', tagColor: '#EF4444', barColor: '#8B5CF6' },
    ],
  },
  kabir: {
    hours: 8,
    blocks: [
      { time: '9:00', dur: '30m', title: 'Morning brief + ad account checks', client: '', barColor: '#6B7280' },
      { time: '9:30', dur: '2h', title: 'SUNSO — Meta Ads optimisation', client: 'SUNSO', tag: 'Deep work', tagColor: '#F59E0B', barColor: '#F59E0B' },
      { time: '11:30', dur: '1h', title: 'Verve — Google Ads restructure', client: 'Verve', barColor: '#EF4444' },
      { time: '12:30', dur: '30m', title: 'Lunch', client: '', barColor: '#D1D5DB' },
      { time: '1:00', dur: '2h', title: 'Lumio — SEO audit + keyword mapping', client: 'Lumio', barColor: '#3B82F6' },
      { time: '3:00', dur: '1h', title: 'Weekly performance report — all clients', client: 'Internal', barColor: '#6B7280' },
    ],
  },
}

export default function DayPlanner() {
  const { state } = useApp()
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [selectedMember, setSelectedMember] = useState('aanya')
  const [alertDismissed, setAlertDismissed] = useState(false)
  const [appliedSuggestion, setAppliedSuggestion] = useState(false)

  const today = new Date()
  const dayLabel = today.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }).replace(' at', ',')

  const overloaded = TEAM_DATA.find(m => m.pct > 100)
  const suggestion = overloaded
    ? `${overloaded.name.split(' ')[0]} is at ${overloaded.pct}% capacity — ${overloaded.tasks} tasks, 2 due today. I can move the Verve reel edit to Zoya (71% → 95%) so today's deliverables still land on time.`
    : null

  const selected = TEAM_DATA.find(m => m.id === selectedMember) || TEAM_DATA[0]
  const dayPlan = AI_DAYS[selectedMember] || AI_DAYS.aanya

  async function replan() {
    setLoading(true)
    try {
      const res = await fetch('/api/ai/brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userName: state.currentUser?.name?.split(' ')[0] || 'there',
          tasks: state.planItems.filter(i => i.status !== 'published').slice(0, 8),
          clients: state.clients.slice(0, 4),
          date: dayLabel,
          mode: 'planner',
        })
      })
      await res.json()
      toast('Day re-planned by AI')
    } catch {
      toast('Re-planned with local priorities')
    } finally {
      setLoading(false)
    }
  }

  function applySuggestion() {
    setAppliedSuggestion(true)
    setAlertDismissed(true)
    toast('Suggestion applied — Verve reel moved to Zoya')
  }

  return (
    <div style={{ maxWidth: 1120, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 22 }}>
        <div>
          <div style={{ fontSize: 12.5, color: 'var(--c-faint)', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 7 }}>
            Day Planner
            <span style={{ color: 'var(--c-ghost)' }}>·</span>
            <span>{dayLabel}</span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, letterSpacing: '-0.03em' }}>Workload &amp; day plan</h1>
        </div>
        <button onClick={replan} disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1.5px solid var(--c-border)', borderRadius: 11, padding: '9px 16px', fontWeight: 600, fontSize: 13.5, color: 'var(--c-ink)', transition: 'all .15s', boxShadow: '0 1px 4px rgba(0,0,0,.06)', marginTop: 4 }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow = '0 3px 10px rgba(0,0,0,.1)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 4px rgba(0,0,0,.06)'}>
          {loading ? <Spinner size={13} color="#FF5C1F" /> : <Sparkle size={13} color="#FF5C1F" />}
          Re-plan with AI
        </button>
      </div>

      {/* AI Workload Alert */}
      {suggestion && !alertDismissed && (
        <div style={{ background: 'var(--c-ink)', borderRadius: 16, padding: '18px 22px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16, animation: 'fadeUp .3s ease both' }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255,92,31,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Warning size={20} color="#FF8A6B" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#FF8A6B', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 5 }}>AI Workload Alert</div>
            <p style={{ fontSize: 14, color: '#E8E6E2', lineHeight: 1.55, fontWeight: 400 }}>
              <strong style={{ color: '#fff', fontWeight: 700 }}>{overloaded?.name.split(' ')[0]} is at {overloaded?.pct}% capacity</strong>
              {' '}— {overloaded?.tasks} tasks, 2 due today. I can move the <strong style={{ color: '#fff' }}>Verve reel edit</strong> to Zoya (71% → 95%) so today&apos;s deliverables still land on time.
            </p>
          </div>
          <button onClick={applySuggestion}
            style={{ background: 'var(--c-accent)', color: '#fff', borderRadius: 10, padding: '10px 18px', fontWeight: 700, fontSize: 13.5, whiteSpace: 'nowrap', flexShrink: 0, transition: 'transform .15s' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = 'scale(1.03)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = ''}>
            Apply suggestion
          </button>
        </div>
      )}

      {appliedSuggestion && !alertDismissed && (
        <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 12, padding: '12px 18px', marginBottom: 20, fontSize: 13.5, color: '#166534', fontWeight: 500 }}>
          ✓ Verve reel edit moved to Zoya — workload rebalanced
        </div>
      )}

      {/* Two-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 18, alignItems: 'start' }}>
        {/* Left: Team Capacity */}
        <div style={{ background: '#fff', border: '1px solid var(--c-border)', borderRadius: 18, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.05)' }}>
          <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--c-border-soft)' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15 }}>Team capacity</div>
            <div style={{ fontSize: 12.5, color: 'var(--c-faint)', marginTop: 3 }}>Today · social media pod</div>
          </div>
          <div style={{ padding: '6px 0' }}>
            {TEAM_DATA.map(member => {
              const over = member.pct > 100
              const barColor = over ? '#EF4444' : member.pct > 85 ? '#F59E0B' : '#22C55E'
              const isSelected = member.id === selectedMember
              return (
                <button key={member.id} onClick={() => setSelectedMember(member.id)}
                  style={{ width: '100%', textAlign: 'left', padding: '12px 18px', background: isSelected ? 'var(--c-fill)' : 'transparent', borderLeft: `3px solid ${isSelected ? 'var(--c-accent)' : 'transparent'}`, transition: 'all .12s', display: 'block' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: member.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11.5, flexShrink: 0 }}>
                      {member.initials}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 600 }}>{member.name}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: barColor }}>{member.pct}%</span>
                          <span style={{ fontSize: 11, fontWeight: 600, color: over ? '#EF4444' : '#22C55E' }}>{over ? 'Over capacity' : 'Healthy'}</span>
                        </div>
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--c-faint)', marginBottom: 6 }}>{member.role} · {member.tasks} tasks</div>
                      <div style={{ height: 5, background: 'var(--c-fill)', borderRadius: 99, overflow: 'hidden', position: 'relative' }}>
                        <div style={{
                          height: '100%',
                          borderRadius: 99,
                          width: `${Math.min(member.pct, 100)}%`,
                          background: over
                            ? 'repeating-linear-gradient(45deg, #EF4444, #EF4444 4px, #FCA5A5 4px, #FCA5A5 8px)'
                            : barColor,
                          transition: 'width .5s',
                        }} />
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Right: AI Day Plan */}
        <div style={{ background: '#fff', border: '1px solid var(--c-border)', borderRadius: 18, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.05)' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--c-border-soft)', display: 'flex', alignItems: 'center', gap: 13 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: selected.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
              {selected.initials}
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15 }}>{selected.name}&apos;s day, planned by AI</div>
              <div style={{ fontSize: 12.5, color: 'var(--c-faint)', marginTop: 2 }}>{dayPlan.hours} hours · sequenced by priority &amp; energy</div>
            </div>
          </div>

          <div style={{ padding: '8px 0' }}>
            {dayPlan.blocks.map((block, i) => (
              <div key={i} style={{ display: 'flex', gap: 0, padding: '0 20px', marginBottom: 2 }}>
                {/* Time column */}
                <div style={{ width: 52, flexShrink: 0, paddingTop: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-ink)' }}>{block.time}</div>
                  <div style={{ fontSize: 11, color: 'var(--c-faint)', marginTop: 2 }}>{block.dur}</div>
                </div>
                {/* Content */}
                <div style={{ flex: 1, borderLeft: `3px solid ${block.barColor}`, marginLeft: 12, paddingLeft: 14, paddingTop: 10, paddingBottom: 10, borderBottom: i < dayPlan.blocks.length - 1 ? '1px solid var(--c-border-soft)' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--c-ink)', lineHeight: 1.35 }}>{block.title}</div>
                      {block.client && <div style={{ fontSize: 12, color: 'var(--c-faint)', marginTop: 3 }}>{block.client}</div>}
                    </div>
                    {block.tag && (
                      <span style={{ fontSize: 11.5, fontWeight: 600, color: block.tagColor, background: `${block.tagColor}18`, borderRadius: 7, padding: '3px 9px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {block.tag}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
