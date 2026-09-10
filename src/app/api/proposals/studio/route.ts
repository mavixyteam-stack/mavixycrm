import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/notify'
import { completeJSON } from '@/lib/groq'
import type { ChatTurn, ProposalDeck } from '@/types'

// The Proposal Studio agent — a specialist that turns the owner's notes about a
// client conversation into a branded Mavixy proposal deck, asking follow-ups
// when key information (services, phases, pricing) is missing.
export async function POST(req: NextRequest) {
  const sb = await createServerClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = adminClient()
  const { data: caller } = await admin.from('profiles').select('role, name').eq('id', user.id).single()
  if (!caller || !['owner', 'manager'].includes(caller.role)) {
    return NextResponse.json({ error: 'Owner/manager only' }, { status: 403 })
  }

  const { journeyId, messages, deck } = await req.json() as { journeyId?: string; messages: ChatTurn[]; deck?: ProposalDeck | null }

  // Pull whatever we already know about the client from the journey.
  let ctx = ''
  if (journeyId) {
    const { data: j } = await admin.from('journeys').select('company, name, service, value, billing, source, notes, contact_email').eq('id', journeyId).maybeSingle()
    if (j) ctx = `KNOWN CLIENT CONTEXT (from the CRM):
- Company: ${j.company || '—'}
- Contact: ${j.name || '—'}${j.contact_email ? ` (${j.contact_email})` : ''}
- Service interest: ${j.service || '—'}
- Indicative value: ${j.value ? `₹${j.value}${j.billing ? `/${j.billing}` : ''}` : '—'}
- Notes: ${j.notes || '—'}`
  }

  const system = `You are Mavixy's proposal writer — a specialist AI that builds premium, on-brand marketing/growth proposals for a creative agency (Mavixy · Creative · Marketing · Technology, Bengaluru). You ONLY do proposals.

MAVIXY HOUSE STYLE (follow it exactly):
- Reframe-first: open by honouring what the client ALREADY has ("You already have the hard part"), then position digital as the opportunity.
- Phased plans (Foundation → Awareness → Growth, or similar), month by month. Each phase has a focus and a one-line objective.
- Pricing is bespoke per client — NO fixed rate card. It's expressed as a matrix of SERVICES × MONTHS, where each cell has an INTENSITY (0=Off,1=Light,2=Medium,3=Heavy,4=Max — the depth of that service that month) and a ₹ price. As focus shifts (e.g. social heavy early, performance heavy later), intensities and prices move with it.
- Confident, consultative, warm. Short lines over paragraphs — "less text, more visual". ₹ for money. Service fees are separate from ad/media spend (say so).

YOU MUST REPLY AS A SINGLE JSON OBJECT, one of two shapes:

1) When you still need information (missing services, phases, per-service/month pricing, client name, or the goal):
{ "mode": "ask", "message": "<one clear, specific follow-up question>" }
Ask for ONE thing at a time. Prefer concrete asks ("What's the monthly fee for social in month 1?").

2) When you have enough to draft (client, at least 1 month, services with prices):
{ "mode": "draft",
  "message": "<a short, friendly plain-text summary of the plan for the owner to approve — a few lines, mention months, the shifting focus, and the total>",
  "deck": {
    "clientName": "<Company>",
    "clientTagline": "<what they do, short>",
    "promiseHeadline": "<e.g. '3-Month Digital Growth Plan'>",
    "promiseText": "<one sentence>",
    "opportunityHeadline": "<reframe, ends with a period>",
    "opportunityBody": "<2-3 short sentences>",
    "assets": [ {"label":"<thing they already have>"}, ... 3-4 ],
    "months": [ {"key":"Month 1","focus":"Foundation","objective":"<one line>"}, ... ],
    "services": [ {"name":"Social Media","cells":[ {"intensity":4,"price":35000}, {"intensity":3,"price":28000}, ... ]}, ... ],
    "gstNote": "Service fees only. Ad spend is separate and paid directly to the platforms.",
    "closingHeadline": "<warm closing line, ends with a period>"
  }
}
RULES for the deck: every service's "cells" array MUST have exactly one entry per month, in order. intensity is 0-4. price is a plain integer in ₹ (0 when the service is Off that month). Use realistic Indian agency pricing consistent with what the owner told you; if they gave a monthly total but not the split, distribute it sensibly across services and say so in "message". Keep services to the ones actually in play. Do not invent a client name — if you don't have one, ask.

KEEP IT COMPACT (this is critical — the deck must be short and visual, and the response must stay small): every string is short. promiseHeadline ≤ 7 words. opportunityHeadline ≤ 9 words. opportunityBody ≤ 2 short sentences. each objective ≤ 12 words. assets: 4 max, each 1-3 words. Omit "capabilities" entirely unless the owner asked for specific ones (a good default is filled in automatically). extras: at most 2, each with ≤ 4 short bullets. Never write long paragraphs. The whole "deck" object must be small.

${ctx}`

  const convo = (messages || []).map(m => `${m.role === 'user' ? 'OWNER' : 'YOU'}: ${m.text}`).join('\n')
  const prompt = `${deck ? `CURRENT DRAFT (refine this if the owner asks for changes):\n${JSON.stringify(deck)}\n\n` : ''}CONVERSATION SO FAR:\n${convo}\n\nRespond with the JSON object.`

  try {
    const raw = await completeJSON(prompt, system, 7000)   // decks need room to finish valid JSON
    const parsed = JSON.parse(raw)
    return NextResponse.json({
      mode: parsed.mode === 'draft' ? 'draft' : 'ask',
      message: parsed.message || (parsed.mode === 'draft' ? 'Here is a first draft.' : 'Tell me a bit more.'),
      deck: parsed.mode === 'draft' ? parsed.deck : undefined,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : ''
    const friendly = /json_validate|max completion|tokens/i.test(msg)
      ? "That's a lot of detail in one go — let me make sure I keep it tight. Send it once more (or split it: the plan first, then the pricing) and I'll draft the deck."
      : "I couldn't put that together just now — give it another try in a moment."
    return NextResponse.json({ mode: 'ask', message: friendly }, { status: 200 })
  }
}
