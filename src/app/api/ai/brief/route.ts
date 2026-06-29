import { NextRequest, NextResponse } from 'next/server'
import { complete } from '@/lib/groq'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { userName, tasks, clients, date, mode, clientMessage, clientName, company } = body

  let prompt = ''

  if (mode === 'reply' && clientMessage) {
    prompt = `You are an account manager at a creative marketing agency replying to a client message.

Client: ${clientName} from ${company}
Their message: "${clientMessage}"

Write a professional, friendly reply (3-5 sentences) that:
- Acknowledges their message
- Commits to action
- Is warm but concise
- Ends positively

Sign off with the account manager's name.`
  } else if (mode === 'planner') {
    const taskList = tasks?.map((t: any) => `- ${t.title || t.type} (${t.status})`).join('\n') || 'No pending tasks'
    prompt = `You are an AI assistant helping an agency team plan their day.

Today is ${date}.
Pending deliverables:
${taskList}
Clients: ${clients?.map((c: any) => c.name).join(', ') || 'Various'}

Write a short AI note (2-3 sentences) suggesting how to prioritize the day — what to tackle first, what needs attention, any focus recommendations. Be concise and actionable.`
  } else {
    const taskList = tasks?.map((t: any) => `- ${t.title || t.type} (${t.status})`).join('\n') || 'No tasks today'
    const clientList = clients?.map((c: any) => c.name).join(', ') || 'No clients'
    prompt = `Generate a morning WhatsApp brief for ${userName}, a creative agency professional starting their day on ${date}.

Their active deliverables:
${taskList}

Clients they're working with: ${clientList}

Write a warm, concise morning brief (3-4 sentences max) that:
- Greets them warmly by first name
- Highlights 2-3 key priorities for today
- Uses a friendly, encouraging tone
- Mentions specific client/task names
- Ends with a motivating sign-off

Keep it under 80 words. Use 1-2 tasteful emojis. Write in second person.`
  }

  try {
    const text = await complete(prompt, 'You are a helpful agency assistant.')
    return NextResponse.json({ text })
  } catch {
    return NextResponse.json({ error: 'AI unavailable' }, { status: 500 })
  }
}
