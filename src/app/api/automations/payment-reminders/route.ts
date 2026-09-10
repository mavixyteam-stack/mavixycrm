import { NextRequest, NextResponse } from 'next/server'
import { authorizeAutomation } from '@/lib/automation-auth'
import { adminClient, createNotifications } from '@/lib/notify'
import { sendEmail } from '@/lib/email'
import { money, balanceDue, daysUntilDue, isOverdue } from '@/lib/invoice'
import type { Invoice } from '@/types'

const DAY = 86400000

// Daily: chase open invoices that are due soon or overdue, at most once every
// few days per invoice. Emails the client (if we have their email) and pings
// the invoice owner in-app + Telegram.
async function run(req: NextRequest) {
  if (!(await authorizeAutomation(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const admin = adminClient()

  const { data: invoicesRaw } = await admin
    .from('invoices')
    .select('*')
    .in('status', ['sent', 'partial'])
    .then(r => r, () => ({ data: [] as Invoice[] }))
  const invoices = (invoicesRaw || []) as Invoice[]

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin
  const now = Date.now()
  let emailed = 0, pinged = 0

  for (const inv of invoices) {
    const due = balanceDue(inv)
    if (due <= 0) continue
    const dd = daysUntilDue(inv)
    const dueSoonOrOverdue = dd !== null && dd <= 3   // within 3 days or overdue
    if (!dueSoonOrOverdue) continue

    // Don't nag more than once every 3 days.
    const last = inv.last_reminder_at ? new Date(inv.last_reminder_at).getTime() : 0
    if (last && now - last < 3 * DAY) continue

    const cur = inv.currency || 'INR'
    const overdue = isOverdue(inv)
    const link = `${appUrl}/invoice/${inv.token}`

    // Email the client.
    if (inv.contact_email) {
      const firstName = (inv.client_name || '').split(' ')[0] || 'there'
      const html = `
        <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;margin:0 auto;color:#0F172A">
          <div style="background:#0F172A;border-radius:16px;padding:22px 24px;color:#fff;margin-bottom:20px">
            <div style="font-size:13px;opacity:.7">${overdue ? 'PAYMENT OVERDUE' : 'PAYMENT REMINDER'}</div>
            <div style="font-size:20px;font-weight:700;margin-top:4px">Invoice ${inv.number}</div>
          </div>
          <p style="font-size:15px;line-height:1.6">Hi ${firstName},</p>
          <p style="font-size:15px;line-height:1.6">${overdue ? 'This invoice is now past due.' : 'A friendly reminder that this invoice is coming due.'} The balance is <strong>${money(due, cur)}</strong>${inv.due_date ? `, due ${new Date(inv.due_date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}` : ''}.</p>
          <p style="text-align:center;margin:26px 0"><a href="${link}" style="display:inline-block;background:#FF5C1F;color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:13px 26px;border-radius:12px">View invoice</a></p>
          <p style="font-size:13px;color:#64748B">Already paid? Please ignore this note — thank you!</p>
        </div>`
      try { await sendEmail(inv.contact_email, `${overdue ? 'Overdue' : 'Reminder'}: invoice ${inv.number}`, html); emailed++ } catch { /* keep going */ }
    }

    // Ping the invoice owner.
    if (inv.created_by) {
      await createNotifications(admin, [inv.created_by], {
        title: overdue ? 'Invoice overdue' : 'Invoice due soon',
        text: `${inv.number} · ${inv.company || inv.client_name || 'client'} — ${money(due, cur)} ${overdue ? 'is overdue' : `due in ${dd}d`}. ${inv.contact_email ? 'Reminder sent to the client.' : 'No client email on file.'}`,
        type: overdue ? 'warning' : 'reminder',
        link: 'invoices',
      })
      pinged++
    }

    await admin.from('invoices').update({ last_reminder_at: new Date().toISOString() }).eq('id', inv.id)
  }

  return NextResponse.json({ ok: true, scanned: invoices.length, emailed, pinged })
}

export const GET = run
export const POST = run
