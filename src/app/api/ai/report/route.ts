import { NextRequest, NextResponse } from 'next/server'
import { complete } from '@/lib/groq'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { client, health, services, month, items, published, active, mode } = body

  let prompt = ''

  if (mode === 'insight') {
    const itemList = items?.slice(0, 10).map((i: any) => `- ${i.title} (${i.type}, ${i.status})`).join('\n') || ''
    prompt = `You are a senior account manager reviewing a client account.

Client: ${client}
Health score: ${health}/100
Active services: ${services?.join(', ')}
Current deliverables:
${itemList}

Write a 3-4 sentence AI insight that:
- Summarises the account health
- Highlights what's going well
- Flags any risks or attention areas
- Gives one clear recommendation

Be specific, data-driven, and direct.`
  } else {
    const totalItems = items?.length || 0
    const publishedCount = published || items?.filter((i: any) => i.status === 'published').length || 0
    const activeCount = active || items?.filter((i: any) => i.status !== 'published').length || 0
    const cats = [...new Set(services || items?.map((i: any) => i.cat) || [])]

    prompt = `Write a professional monthly performance report email for client "${client}" for ${month || 'this month'}.

Content delivered: ${publishedCount}/${totalItems} pieces published
Active in pipeline: ${activeCount} pieces
Health score: ${health}/100
Services: ${cats.join(', ')}

Write a professional client-facing report with:
1. Warm greeting and executive summary (2-3 sentences)
2. Content Performance highlights (3-4 bullet points with wins)
3. What's coming next month (2-3 items)
4. Warm sign-off

Keep it under 220 words. Tone: confident, client-friendly, results-focused. Do NOT use placeholder brackets like [X%].`
  }

  try {
    const text = await complete(prompt, 'You are a senior account manager at a top digital marketing agency writing client communications.')
    return NextResponse.json({ text })
  } catch {
    return NextResponse.json({ error: 'AI unavailable' }, { status: 500 })
  }
}
