'use client'
import { useState } from 'react'
import { useApp } from '@/lib/store'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
const MOCK_ATT = {
  aanya: [22, 21, 23, 20, 22, 18],
  rohan: [20, 22, 21, 23, 21, 16],
  zoya: [23, 20, 22, 21, 23, 17],
  kabir: [21, 23, 20, 22, 20, 15],
  dev: [22, 21, 23, 21, 22, 17],
  ira: [21, 22, 21, 22, 21, 16],
}

export default function PerformanceScreen() {
  const { state } = useApp()
  const [monthIdx, setMonthIdx] = useState(5)

  const month = MONTHS[monthIdx]

  const teamData = state.users.map(u => {
    const att = MOCK_ATT[u.id as keyof typeof MOCK_ATT] || [20, 20, 20, 20, 20, 15]
    const days = att[monthIdx]
    const workDays = 22
    const attPct = Math.round((days / workDays) * 100)
    const assigned = state.planItems.filter(i => i.assignee_id === u.id)
    const published = assigned.filter(i => i.status === 'published').length
    const total = assigned.length
    const delivPct = total ? Math.round((published / total) * 100) : 0
    const score = Math.round((attPct * 0.4) + (delivPct * 0.6))
    return { ...u, days, attPct, published, total, delivPct, score }
  }).sort((a, b) => b.score - a.score)

  function scoreColor(s: number) {
    if (s >= 80) return 'var(--c-green)'
    if (s >= 60) return 'var(--c-amber)'
    return 'var(--c-red)'
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 4 }}>Performance</h1>
          <p style={{ fontSize: 14, color: 'var(--c-subtle)' }}>Attendance and delivery score by team member</p>
        </div>
        <div style={{ display: 'flex', gap: 4, background: 'var(--c-fill)', borderRadius: 10, padding: 3 }}>
          {MONTHS.map((m, i) => (
            <button key={m} onClick={() => setMonthIdx(i)}
              style={{ padding: '5px 10px', borderRadius: 7, fontSize: 12.5, fontWeight: 600, background: monthIdx === i ? '#fff' : 'transparent', color: monthIdx === i ? 'var(--c-ink)' : 'var(--c-muted)', boxShadow: monthIdx === i ? '0 1px 3px rgba(0,0,0,.1)' : 'none', transition: 'all .15s' }}>
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Summary row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 24 }}>
        <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 14, padding: '16px 18px' }}>
          <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--c-green)', marginBottom: 4 }}>
            {Math.round(teamData.reduce((s, u) => s + u.attPct, 0) / teamData.length)}%
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>Avg Attendance</div>
          <div style={{ fontSize: 12, color: 'var(--c-faint)' }}>{month}</div>
        </div>
        <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 14, padding: '16px 18px' }}>
          <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--c-accent)', marginBottom: 4 }}>
            {Math.round(teamData.reduce((s, u) => s + u.delivPct, 0) / teamData.length)}%
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>Delivery Rate</div>
          <div style={{ fontSize: 12, color: 'var(--c-faint)' }}>Published / Assigned</div>
        </div>
        <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 14, padding: '16px 18px' }}>
          <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--c-amber)', marginBottom: 4 }}>
            {Math.round(teamData.reduce((s, u) => s + u.score, 0) / teamData.length)}
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>Team Score</div>
          <div style={{ fontSize: 12, color: 'var(--c-faint)' }}>Avg of all members</div>
        </div>
      </div>

      {/* Team table */}
      <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--c-border-soft)', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 80px', gap: 12, fontSize: 11, fontWeight: 700, color: 'var(--c-ghost)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
          <span>Member</span>
          <span>Attendance</span>
          <span>Delivery</span>
          <span>Score</span>
          <span>Rank</span>
        </div>
        {teamData.map((u, idx) => (
          <div key={u.id} style={{ padding: '14px 18px', borderBottom: '1px solid var(--c-border-soft)', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 80px', gap: 12, alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: u.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 11, flexShrink: 0 }}>
                {u.initials}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{u.name}</div>
                <div style={{ fontSize: 12, color: 'var(--c-faint)' }}>{u.title}</div>
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{u.days}d</span>
                <span style={{ fontSize: 12, color: 'var(--c-faint)' }}>{u.attPct}%</span>
              </div>
              <div style={{ height: 4, background: 'var(--c-fill)', borderRadius: 99 }}>
                <div style={{ height: '100%', borderRadius: 99, background: u.attPct >= 90 ? 'var(--c-green)' : u.attPct >= 75 ? 'var(--c-amber)' : 'var(--c-red)', width: `${u.attPct}%` }} />
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{u.published}/{u.total}</span>
                <span style={{ fontSize: 12, color: 'var(--c-faint)' }}>{u.delivPct}%</span>
              </div>
              <div style={{ height: 4, background: 'var(--c-fill)', borderRadius: 99 }}>
                <div style={{ height: '100%', borderRadius: 99, background: 'var(--c-accent)', width: `${u.delivPct}%` }} />
              </div>
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, fontFamily: 'var(--font-display)', color: scoreColor(u.score) }}>{u.score}</div>
            </div>
            <div>
              <span style={{ fontSize: 13, fontWeight: 700, color: idx === 0 ? '#C99211' : 'var(--c-ghost)' }}>
                {idx === 0 ? '🏆 #1' : `#${idx + 1}`}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
