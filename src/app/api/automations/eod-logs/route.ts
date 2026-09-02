import { NextRequest, NextResponse } from 'next/server'
import { authorizeAutomation } from '@/lib/automation-auth'
import { adminClient, createNotifications } from '@/lib/notify'

const pad = (n: number) => String(n).padStart(2, '0')
function today() { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }

// End-of-day: anyone who worked today (checked in) but hasn't logged their
// day yet gets a reminder to check out and submit their update.
async function run(req: NextRequest) {
  if (!(await authorizeAutomation(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const db = adminClient()
  const date = today()

  const [{ data: attendance }, { data: logs }] = await Promise.all([
    db.from('attendance').select('user_id, check_in').eq('date', date),
    db.from('work_logs').select('user_id').eq('date', date),
  ])

  const logged = new Set((logs || []).map(l => l.user_id))
  const missing = (attendance || [])
    .filter(a => a.check_in && !logged.has(a.user_id))
    .map(a => a.user_id)

  if (missing.length === 0) return NextResponse.json({ ok: true, reminded: 0 })

  await createNotifications(db, missing, {
    title: '📝 Log your day before you sign off',
    text: `You checked in today but haven't submitted your end-of-day update yet. Tap "Out" and add a quick note on what you got done — it keeps the whole team in sync.`,
    type: 'reminder',
    link: 'myday',
  })

  return NextResponse.json({ ok: true, reminded: missing.length })
}

export const GET = run
export const POST = run
