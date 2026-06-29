import { NextRequest, NextResponse } from 'next/server'
import { complete } from '@/lib/groq'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { mode, client, cat, type, existing, lead, title, content } = body

  let prompt = ''
  let systemPrompt = 'You are an expert creative strategist for a digital marketing agency.'

  if (mode === 'pitch' && lead) {
    prompt = `You are a senior account executive writing a personalised outreach message for a potential client.

Lead: ${lead.name} at ${lead.company}
Service interest: ${lead.service}
Budget: ${lead.budget}
Source: ${lead.source}
Notes: ${lead.notes || 'None'}

Write a brief, punchy outreach message (3-4 sentences) that:
- Opens with a specific observation about their brand/industry
- References what we do for similar brands
- Proposes a quick call
- Sounds human, not sales-y

Return just the message text.`
    systemPrompt = 'You are a senior sales executive at a top digital marketing agency writing personalised outreach.'
  } else if (mode === 'knowledge' && title) {
    prompt = `Expand the following agency knowledge base document with additional useful details, tips, or examples.

Document title: ${title}
Existing content:
${content}

Add 3-5 bullet points or a paragraph of additional insights, best practices, or examples that would be useful for a digital marketing agency team. Keep the same tone.`
  } else {
    // Content suggestion mode
    const existingList = existing?.join('\n- ') || 'None yet'
    prompt = `Suggest a creative content deliverable for ${client || 'the brand'}.

Service category: ${cat}
Content type: ${type}
Already planned this month:
- ${existingList}

Suggest something fresh that isn't already planned. Return:
- title: A compelling, specific title (under 60 chars)
- brief: A 2-sentence creative brief (what to do and how)

Return as JSON: {"title":"...","brief":"..."}`
  }

  try {
    const text = await complete(prompt, systemPrompt)
    // Try to parse JSON for content suggestions
    if (!mode || mode === 'content') {
      try {
        const json = JSON.parse(text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim())
        return NextResponse.json(json)
      } catch {
        return NextResponse.json({ title: text, brief: '' })
      }
    }
    return NextResponse.json({ text })
  } catch {
    return NextResponse.json({ error: 'AI unavailable' }, { status: 500 })
  }
}
