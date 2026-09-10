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

2) When you have enough to draft (client, phases, services with prices):
{ "mode": "draft",
  "message": "<a short, friendly plain-text summary for the owner to approve — mention the phases, the shifting focus, and the total>",
  "deck": {
    "clientName": "<Company>",
    "clientTagline": "<what they do, short>",
    "promiseHeadline": "<e.g. '2-Phase Digital Brand Building Plan'>",
    "promiseText": "<one sentence>",
    "opportunityHeadline": "<reframe of their existing strength, ends with a period>",
    "opportunityBody": "<2-3 short sentences>",
    "assets": [ {"label":"<thing they already have, 1-3 words>"}, ... 4 ],
    "objective": { "headline":"<one line>", "steps":["Build the foundation","Create awareness","Generate demand", ...] },
    "months": [
      { "key":"Phase 1 · Months 1-3", "focus":"Foundation & Authority", "objective":"<one line>", "intro":"<1 short sentence>",
        "activities":[
          { "title":"Aggressive social media growth", "groups":[
            {"heading":"Content","items":["Content strategy","Short-form video","Product storytelling","Educational content","Festival content"]},
            {"heading":"Management","items":["Creative concepts","Graphic design","Video editing","Publishing","Community monitoring"]}
          ]},
          { "title":"Awareness campaigns", "groups":[ {"heading":"Our role","items":["Audience research","Campaign setup","Targeting","Retargeting"]} ]}
        ],
        "outcomes":[ {"title":"Brand visibility","text":"Greater digital exposure and familiarity."}, {"title":"Audience","text":"A growing, relevant audience."}, ... 4-6 ]
      }, ...
    ],
    "services": [ {"name":"Social Media","cells":[ {"intensity":4,"price":35000}, {"intensity":2,"price":18000} ]}, ... ],
    "gstNote":"Service fees only. Ad spend is separate and paid directly to the platforms.",
    "journeyTable":[ {"period":"Months 1-3","focus":"Foundation","objective":"Build authority and audience"}, ... ],
    "closingHeadline":"<warm closing line, ends with a period>",
    "closingBody":"<2 short sentences>"
  }
}

RULES for the matrix: every service's "cells" array MUST have exactly one entry per month/phase in "months", in order. intensity 0-4. price = integer ₹ (0 when Off). Use realistic Indian agency pricing matching what the owner said; if they gave a phase total but not the split, distribute it across services sensibly and say so in "message".

DEPTH — this is what makes it a real Mavixy proposal, not a summary: for EACH phase give 2-3 "activities", and each activity 1-2 "groups" of 3-6 SHORT items (2-4 words each) — these are the concrete things you'll do (like the SAP/Aakar decks). Give each phase 4-6 "outcomes" (title + one short sentence). Fill "objective.steps" (4-6 short verbs) and "journeyTable" (one row per phase or month).

DO NOT output "capabilities", the approach, the system flywheel, measurement, terms or "what you get" — Mavixy's standard versions of those are added automatically. Focus your tokens on the client-specific layer above. Keep every individual string short (headlines ≤ 9 words, items 2-4 words, sentences short) — depth comes from MANY short items, never long paragraphs. Do not invent a client name — if you don't have one, ask.

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
