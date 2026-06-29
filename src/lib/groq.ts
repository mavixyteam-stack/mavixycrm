import Groq from 'groq-sdk'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export const MODEL = 'llama-3.3-70b-versatile'

export async function complete(prompt: string, system?: string): Promise<string> {
  const msgs: Groq.Chat.ChatCompletionMessageParam[] = []
  if (system) msgs.push({ role: 'system', content: system })
  msgs.push({ role: 'user', content: prompt })

  const res = await groq.chat.completions.create({
    model: MODEL,
    messages: msgs,
    max_tokens: 1024,
    temperature: 0.8,
  })
  return res.choices[0]?.message?.content ?? ''
}

export async function streamComplete(
  prompt: string,
  system: string,
  onChunk: (text: string) => void
): Promise<void> {
  const msgs: Groq.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: system },
    { role: 'user', content: prompt },
  ]

  const stream = await groq.chat.completions.create({
    model: MODEL,
    messages: msgs,
    max_tokens: 1024,
    temperature: 0.85,
    stream: true,
  })

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content
    if (delta) onChunk(delta)
  }
}
