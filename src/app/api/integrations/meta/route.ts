import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { action, creds, client_id, date_from, date_to } = await req.json()

  if (action === 'test') {
    try {
      const url = `https://graph.facebook.com/v19.0/${creds.meta_ad_account_id}?fields=name,currency,account_status&access_token=${creds.meta_access_token}`
      const res = await fetch(url)
      const data = await res.json()
      if (data.error) return NextResponse.json({ ok: false, error: data.error.message })
      return NextResponse.json({ ok: true, account_name: data.name, currency: data.currency })
    } catch (e: any) {
      return NextResponse.json({ ok: false, error: e.message })
    }
  }

  if (action === 'insights') {
    // Pull campaign insights for a client
    const from = date_from || new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
    const to = date_to || new Date().toISOString().split('T')[0]
    try {
      const fields = 'campaign_name,spend,impressions,clicks,reach,cpm,cpc,ctr,actions'
      const url = `https://graph.facebook.com/v19.0/${creds.meta_ad_account_id}/insights?fields=${fields}&time_range={"since":"${from}","until":"${to}"}&level=campaign&access_token=${creds.meta_access_token}`
      const res = await fetch(url)
      const data = await res.json()
      if (data.error) return NextResponse.json({ ok: false, error: data.error.message })
      return NextResponse.json({ ok: true, data: data.data || [], client_id })
    } catch (e: any) {
      return NextResponse.json({ ok: false, error: e.message })
    }
  }

  return NextResponse.json({ ok: false, error: 'Unknown action' })
}
