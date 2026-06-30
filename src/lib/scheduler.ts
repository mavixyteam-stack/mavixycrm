import type { PlanItem, Profile } from '@/types'

// ─── Skill → content type mapping ────────────────────────────────────────────
// Maps title keywords to content types they're best suited for
const TITLE_SKILLS: Record<string, string[]> = {
  'video':       ['Reel', 'Video', 'UGC', 'Motion Graphics', 'Short Video', 'Brand Film'],
  'editor':      ['Reel', 'Video', 'UGC', 'Motion Graphics', 'Short Video'],
  'motion':      ['Reel', 'Video', 'Motion Graphics', 'Animation'],
  'design':      ['Carousel', 'Static Post', 'Story', 'Infographic', 'Banner', 'Poster', 'Key Visual'],
  'designer':    ['Carousel', 'Static Post', 'Story', 'Infographic', 'Banner', 'Poster', 'Key Visual'],
  'graphic':     ['Carousel', 'Static Post', 'Story', 'Infographic', 'Banner'],
  'creative':    ['Carousel', 'Static Post', 'Story', 'Reel', 'Video'],
  'copy':        ['Blog Article', 'Caption', 'Email', 'Caption Pack', 'Script', 'Thread'],
  'copywriter':  ['Blog Article', 'Caption', 'Email', 'Caption Pack', 'Script'],
  'writer':      ['Blog Article', 'Caption', 'Email', 'Script', 'Thread'],
  'content':     ['Blog Article', 'Caption', 'Email', 'Story', 'Caption Pack'],
  'performance': ['Meta Ads Campaign', 'Google Ads', 'LinkedIn Ads', 'Paid Campaign'],
  'ads':         ['Meta Ads Campaign', 'Google Ads', 'LinkedIn Ads', 'Paid Campaign'],
  'paid':        ['Meta Ads Campaign', 'Google Ads', 'LinkedIn Ads'],
  'seo':         ['Blog Article', 'On-page SEO', 'SEO Audit', 'Google Ads'],
  'strategy':    ['On-page SEO', 'SEO Audit', 'Strategy', 'Blog Article'],
  'strategist':  ['On-page SEO', 'SEO Audit', 'Strategy', 'Blog Article'],
  'account':     ['Strategy', 'Caption', 'Blog Article', 'Static Post'],
  'social':      ['Carousel', 'Static Post', 'Story', 'Caption', 'Reel'],
}

// Content type → ideal title keyword (for display)
const TYPE_ROLE: Record<string, string> = {
  'Reel':              'Video Editor',
  'Video':             'Video Editor',
  'UGC':               'Video Editor',
  'Motion Graphics':   'Motion Designer',
  'Carousel':          'Designer',
  'Static Post':       'Designer',
  'Story':             'Designer',
  'Infographic':       'Designer',
  'Key Visual':        'Designer',
  'Banner':            'Designer',
  'Blog Article':      'Copywriter',
  'Caption':           'Copywriter',
  'Caption Pack':      'Copywriter',
  'Email':             'Copywriter',
  'Script':            'Copywriter',
  'Meta Ads Campaign': 'Performance',
  'Google Ads':        'Performance',
  'LinkedIn Ads':      'Performance',
  'On-page SEO':       'Strategist',
  'SEO Audit':         'Strategist',
  'Strategy':          'Strategist',
}

// ─── Skill score: 0 = no match, 0.5 = partial, 1 = ideal ────────────────────
export function skillScore(contentType: string, userTitle: string): { score: number; reason: string } {
  const t = (userTitle || '').toLowerCase()
  if (!t) return { score: 0.3, reason: 'No title set' }

  let best = 0
  let matchedKeyword = ''
  for (const [keyword, types] of Object.entries(TITLE_SKILLS)) {
    if (t.includes(keyword)) {
      if (types.some(ty => ty.toLowerCase() === contentType.toLowerCase())) {
        best = 1
        matchedKeyword = keyword
        break
      }
      if (types.some(ty => ty.toLowerCase().includes(contentType.toLowerCase().split(' ')[0]))) {
        best = Math.max(best, 0.7)
        matchedKeyword = keyword
      }
    }
  }

  if (best === 1) return { score: 1, reason: `${TYPE_ROLE[contentType] || 'Specialist'} match` }
  if (best >= 0.7) return { score: 0.7, reason: `Partial match via "${matchedKeyword}"` }
  return { score: 0.2, reason: 'Out of specialty' }
}

// ─── Week utilities ───────────────────────────────────────────────────────────
export function weekOf(day: number): number {
  return Math.ceil(day / 7) // 1-7 → 1, 8-14 → 2, etc.
}

export function prevWeekRange(postingDay: number): { start: number; end: number } {
  const week = weekOf(postingDay)
  if (week <= 1) return { start: 1, end: Math.max(1, postingDay - 3) }
  const prevWeek = week - 1
  return { start: (prevWeek - 1) * 7 + 1, end: prevWeek * 7 }
}

// work_start = day work should begin so it's ready for approval before posting
export function calcWorkStart(postingDay: number, effort: number): number {
  const APPROVAL_BUFFER = 2  // days client needs to review before posting
  const deadline = postingDay - APPROVAL_BUFFER
  const { start: pws } = prevWeekRange(postingDay)
  // Effort = days needed; start `effort` days before deadline
  return Math.max(1, Math.max(pws, deadline - effort + 1))
}

// ─── Auto-post day: spread items evenly across the month ─────────────────────
export function autoPostDay(itemIndex: number, totalItems: number, daysInMonth: number): number {
  // Distribute across 4 weeks, leaving last 2 days as buffer
  const usableRange = daysInMonth - 2
  const slot = Math.round((itemIndex + 0.5) * (usableRange / totalItems))
  return Math.max(5, Math.min(slot, usableRange))
}

// ─── The scheduling result ────────────────────────────────────────────────────
export interface ScheduleRow {
  item: PlanItem
  assignee: Profile
  skillScore: number
  skillReason: string
  postingDay: number      // day content goes live
  workStartDay: number    // day work should begin
  deadlineDay: number     // day work must be done (posting - 2)
  weekLabel: string       // "Week 2 → Week 3"
  overrides: boolean      // user has manually changed assignee
}

// ─── Main scheduler ───────────────────────────────────────────────────────────
export function schedule(
  items: PlanItem[],
  users: Profile[],
  monthKey: string,
): ScheduleRow[] {
  if (!items.length || !users.length) return []

  const [year, month] = monthKey.split('-').map(Number)
  const daysInMonth = new Date(year, month, 0).getDate()

  // Calculate posting days for items that don't have one
  const unscheduled = items.filter(i => !i.day)
  const postingDays: Record<string, number> = {}

  if (unscheduled.length > 0) {
    unscheduled.forEach((item, idx) => {
      postingDays[item.id] = autoPostDay(idx, unscheduled.length, daysInMonth)
    })
  }

  // Track assigned days per user per week (for workload-aware scheduling)
  const userWeekLoad: Record<string, Record<number, number>> = {}
  users.forEach(u => { userWeekLoad[u.id] = {} })

  // Sort by posting day ascending (schedule earlier posts first)
  const sorted = [...items].sort((a, b) => {
    const da = a.day || postingDays[a.id] || 15
    const db = b.day || postingDays[b.id] || 15
    return da - db
  })

  return sorted.map(item => {
    const postingDay = item.day || postingDays[item.id] || 15
    const workStartDay = calcWorkStart(postingDay, item.effort)
    const deadlineDay = Math.max(workStartDay, postingDay - 2)
    const week = weekOf(postingDay)
    const prevWeek = weekOf(workStartDay)
    const weekLabel = prevWeek !== week
      ? `Week ${prevWeek} → Week ${week}`
      : `Week ${week}`

    // Score each user: skill match + workload
    const week_ = weekOf(workStartDay)
    const scored = users.map(u => {
      const { score: sScore, reason } = skillScore(item.type, u.title || '')
      const weekItems = userWeekLoad[u.id][week_] || 0
      const loadPenalty = Math.min(weekItems * 0.15, 0.6)  // max penalty = 0.6
      const finalScore = sScore * 0.7 + (1 - loadPenalty) * 0.3
      return { user: u, score: finalScore, reason }
    })

    // Pick best match
    scored.sort((a, b) => b.score - a.score)
    const best = scored[0]

    // If item already has an assignee, respect it
    const assignee = item.assignee_id
      ? (users.find(u => u.id === item.assignee_id) || best.user)
      : best.user

    const sr = scored.find(s => s.user.id === assignee.id) || best

    // Update workload tracking
    userWeekLoad[assignee.id][week_] = (userWeekLoad[assignee.id][week_] || 0) + 1

    return {
      item,
      assignee,
      skillScore: sr.score,
      skillReason: sr.reason,
      postingDay,
      workStartDay,
      deadlineDay,
      weekLabel,
      overrides: false,
    }
  })
}
