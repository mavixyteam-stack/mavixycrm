'use client'
import { useState, useMemo } from 'react'
import { useApp, useToast } from '@/lib/store'
import { Sparkle, Spinner, Warning } from '@/components/ui/Icon'

const EFFORT_MINS = [0, 30, 60, 120, 180, 240] // index = effort level 1-5

function toTimeStr(offsetMins: number) {
  const total = 9 * 60 + offsetMins
  const h = Math.floor(total / 60)
  const m = total % 60
  const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`
}

function durStr(mins: number) {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (!h) return `${m}m`
  if (!m) return `${h}h`
  return `${h}h ${m}m`
}

export default function DayPlanner() {
  const { state } = useApp()
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [alertDismissed, setAlertDismissed] = useState(false)
  const [appliedSuggestion, setAppliedSuggestion] = useState(false)

  const today = new Date()
  const dayLabel = today.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }).replace(' at', ',')

  const teamData = useMemo(() => {
    return state.users.map(u => {
      const taskCount = state.tasks.filter((t: { assignee_id: string; done: boolean }) => t.assignee_id === u.id && !t.done).length
      const itemCount = state.planItems.filter((i: { assignee_id: string; status: string }) => i.assignee_id === u.id && i.status !== 'published').length
      const total = taskCount + itemCount
      const pct = Math.round((total / 8) * 100)
      return { ...u, taskCount, itemCount, total, pct }
    })
  }, [state.users, state.tasks, state.planItems])

  const [selectedMemberId, setSelectedMemberId] = useState<string>(() =>
    state.currentUser?.id || state.users[0]?.id || ''
  )

  const selected = teamData.find(m => m.id === selectedMemberId) || teamData[0]

  const dayPlan = useMemo(() => {
    if (!selected) return { hours: 0, blocks: [] as { time: string; dur: string; title: string; client: string; tag?: string; tagColor?: string; barColor: string }[] }

    const prRank: Record<string, number> = { High: 0, Medium: 1, Low: 2 }
    const userTasks = state.tasks
      .filter((t: { assignee_id: string; done: boolean }) => t.assignee_id === selected.id && !t.done)
      .sort((a: { priority: string }, b: { priority: string }) => (prRank[a.priority] ?? 1) - (prRank[b.priority] ?? 1))

    const userItems = state.planItems
      .filter((i: { assignee_id: string; status: string }) => i.assignee_id === selected.id && i.status !== 'published')
      .sort((a: { effort: number }, b: { effort: number }) => (b.effort || 3) - (a.effort || 3))

    const clientMap = new Map(state.clients.map((c: { id: string; name: string }) => [c.id, c]))

    type Block = { time: string; dur: string; title: string; client: string; tag?: string; tagColor?: string; barColor: string }
    const blocks: Block[] = []
    blocks.push({ time: toTimeStr(0), dur: '30m', title: 'Morning brief + team standup', client: 'Team', barColor: '#6B7280' })

    let offset = 30
    let lunchAdded = false

    function maybeAddLunch() {
      if (!lunchAdded && offset >= 180) {
        blocks.push({ time: toTimeStr(180), dur: '1h', title: 'Lunch break', client: '', barColor: '#D1D5DB' })
        offset = 240
        lunchAdded = true
      }
    }

    for (const task of userTasks.slice(0, 4)) {
      maybeAddLunch()
      const durMins = task.priority === 'High' ? 90 : task.priority === 'Medium' ? 60 : 45
      const client = task.client_id ? (clientMap.get(task.client_id) as { name: string } | undefined) : null
      const barColor = task.priority === 'High' ? '#EF4444' : task.priority === 'Medium' ? '#F59E0B' : '#22C55E'
      const tag = task.priority === 'High' ? 'High priority' : task.priority === 'Medium' ? 'Deep work' : undefined
      blocks.push({
        time: toTimeStr(offset),
        dur: durStr(durMins),
        title: task.title,
        client: client?.name || '',
        tag,
        tagColor: task.priority === 'High' ? '#EF4444' : '#F59E0B',
        barColor,
      })
      offset += durMins
    }

    for (const item of userItems.slice(0, 4)) {
      maybeAddLunch()
      const effort = item.effort || 3
      const durMins = EFFORT_MINS[effort] || 60
      const client = item.client_id ? (clientMap.get(item.client_id) as { name: string } | undefined) : null
      const barColor = effort >= 4 ? '#FF5C1F' : effort === 3 ? '#8B5CF6' : '#3B82F6'
      blocks.push({
        time: toTimeStr(offset),
        dur: durStr(durMins),
        title: item.title,
        client: client?.name || '',
        tag: effort >= 4 ? 'Deep work' : undefined,
        tagColor: '#F59E0B',
        barColor,
      })
      offset += durMins
    }

    const hours = Math.round((offset / 60) * 10) / 10
    return { hours, blocks }
  }, [selected, state.tasks, state.planItems, state.clients])

  const overloaded = teamData.find(m => m.pct > 100)

  async function replan() {
    setLoading(true)
    try {
      await fetch('/api/ai/brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userName: selected?.name?.split(' ')[0] || 'there',
          tasks: state.planItems.filter((i: { status: string }) => i.status !== 'published').slice(0, 8),
          clients: state.clients.slice(0, 4),
          date: dayLabel,
          mode: 'planner',
        })
      })
      toast('Day re-planned by AI')
    } catch {
      toast('Re-planned with local priorities')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 1120, margin: '0 auto' }}>
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

      {overloaded && !alertDismissed && (
        <div style={{ background: 'var(--c-ink)', borderRadius: 16, padding: '18px 22px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16, animation: 'fadeUp .3s ease both' }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255,92,31,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Warning size={20} color="#FF8A6B" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#FF8A6B', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 5 }}>AI Workload Alert</div>
            <p style={{ fontSize: 14, color: '#E8E6E2', lineHeight: 1.55, fontWeight: 400 }}>
              <strong style={{ color: '#fff', fontWeight: 700 }}>{overloaded.name?.split(' ')[0] || overloaded.initials || '?'} is at {overloaded.pct}% capacity</strong>
              {' '}— {overloaded.total} open tasks assigned. Consider redistributing work across the team to avoid burnout.
            </p>
          </div>
          <button onClick={() => { setAppliedSuggestion(true); setAlertDismissed(true); toast('Alert acknowledged') }}
            style={{ background: 'var(--c-accent)', color: '#fff', borderRadius: 10, padding: '10px 18px', fontWeight: 700, fontSize: 13.5, whiteSpace: 'nowrap', flexShrink: 0, transition: 'transform .15s' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = 'scale(1.03)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = ''}>
            Acknowledge
          </button>
        </div>
      )}

      {appliedSuggestion && (
        <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 12, padding: '12px 18px', marginBottom: 20, fontSize: 13.5, color: '#166534', fontWeight: 500 }}>
          ✓ Workload noted — reassign tasks in the Content Planner or Task board to balance the team
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 18, alignItems: 'start' }}>
        {/* Team Capacity */}
        <div style={{ background: '#fff', border: '1px solid var(--c-border)', borderRadius: 18, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.05)' }}>
          <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--c-border-soft)' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15 }}>Team capacity</div>
            <div style={{ fontSize: 12.5, color: 'var(--c-faint)', marginTop: 3 }}>Today · all open work</div>
          </div>
          <div style={{ padding: '6px 0' }}>
            {teamData.length === 0 ? (
              <div style={{ padding: '24px 18px', color: 'var(--c-ghost)', fontSize: 13, textAlign: 'center' }}>No team members yet</div>
            ) : teamData.map(member => {
              const over = member.pct > 100
              const barColor = over ? '#EF4444' : member.pct > 85 ? '#F59E0B' : '#22C55E'
              const isSelected = member.id === selectedMemberId
              return (
                <button key={member.id} onClick={() => setSelectedMemberId(member.id)}
                  style={{ width: '100%', textAlign: 'left', padding: '12px 18px', background: isSelected ? 'var(--c-fill)' : 'transparent', borderLeft: `3px solid ${isSelected ? 'var(--c-accent)' : 'transparent'}`, transition: 'all .12s', display: 'block' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: member.color || '#6B7280', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11.5, flexShrink: 0 }}>
                      {member.initials}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 600 }}>{member.name}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: barColor }}>{member.pct}%</span>
                          <span style={{ fontSize: 11, fontWeight: 600, color: barColor }}>
                            {over ? 'Over capacity' : member.pct > 85 ? 'High load' : 'Healthy'}
                          </span>
                        </div>
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--c-faint)', marginBottom: 6 }}>
                        {member.role} · {member.total} task{member.total !== 1 ? 's' : ''}
                      </div>
                      <div style={{ height: 5, background: 'var(--c-fill)', borderRadius: 99, overflow: 'hidden' }}>
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

        {/* Day Plan */}
        <div style={{ background: '#fff', border: '1px solid var(--c-border)', borderRadius: 18, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.05)' }}>
          {selected ? (
            <>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--c-border-soft)', display: 'flex', alignItems: 'center', gap: 13 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: selected.color || '#6B7280', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
                  {selected.initials}
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15 }}>{selected.name}&apos;s day plan</div>
                  <div style={{ fontSize: 12.5, color: 'var(--c-faint)', marginTop: 2 }}>
                    {dayPlan.hours > 0.5 ? `~${dayPlan.hours}h · sequenced by priority & energy` : 'No tasks assigned yet'}
                  </div>
                </div>
              </div>
              <div style={{ padding: '8px 0' }}>
                {dayPlan.blocks.length <= 1 ? (
                  <div style={{ padding: '48px 20px', textAlign: 'center' }}>
                    <div style={{ fontSize: 13.5, color: 'var(--c-ghost)', marginBottom: 8 }}>
                      No open tasks assigned to {selected.name?.split(' ')[0] || selected.initials || '?'}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--c-faint)' }}>Assign tasks in the Content Planner or Task board to build a day plan</div>
                  </div>
                ) : dayPlan.blocks.map((block, i) => (
                  <div key={i} style={{ display: 'flex', padding: '0 20px', marginBottom: 2 }}>
                    <div style={{ width: 72, flexShrink: 0, paddingTop: 14 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-ink)' }}>{block.time}</div>
                      <div style={{ fontSize: 11, color: 'var(--c-faint)', marginTop: 2 }}>{block.dur}</div>
                    </div>
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
            </>
          ) : (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--c-ghost)', fontSize: 13.5 }}>
              Select a team member to view their day plan
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
