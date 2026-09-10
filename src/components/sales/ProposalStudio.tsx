'use client'
import { useState, useRef, useEffect } from 'react'
import { useApp, useToast, useUpsertProposal } from '@/lib/store'
import { ModalPortal } from '@/components/ui/ModalPortal'
import { X } from '@/components/ui/Icon'
import { makeProposalToken } from '@/lib/proposal'
import ProposalDeckView from './ProposalDeckView'
import type { Journey, Proposal, ProposalDeck, ChatTurn } from '@/types'

// Minimal Web Speech typings for dictation.
type SR = { lang: string; interimResults: boolean; continuous: boolean; start: () => void; stop: () => void; abort: () => void; onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null; onend: (() => void) | null; onerror: (() => void) | null }
type SRWin = Window & { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR }

const GREETING = "Tell me about this client — who they are, what you discussed, what you'd do for them across the months, and the pricing you have in mind. Talk or type as much as you like; I'll ask if anything's missing, then draft the proposal."

export default function ProposalStudio({ journey, existing, onClose }: {
  journey: Journey; existing: Proposal | null; onClose: () => void
}) {
  const { state } = useApp()
  const toast = useToast()
  const upsert = useUpsertProposal()
  const me = state.currentUser?.id

  const idRef = useRef(existing?.id || (globalThis.crypto?.randomUUID?.() ?? String(Date.now())))
  const tokenRef = useRef(existing?.token || makeProposalToken())

  const [msgs, setMsgs] = useState<ChatTurn[]>(existing?.chat && existing.chat.length ? existing.chat : [{ role: 'assistant', text: GREETING }])
  const [deck, setDeck] = useState<ProposalDeck | null>(existing?.deck || null)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState(false)
  const [listening, setListening] = useState(false)

  // Persist the whole session (chat + draft) after every turn, so closing the
  // tab never loses work — reopen it from the deal's Proposals list.
  async function persist(chat: ChatTurn[], dk: ProposalDeck | null) {
    const proposal: Proposal = {
      id: idRef.current,
      journey_id: journey.id,
      token: tokenRef.current,
      title: dk?.promiseHeadline || `Proposal for ${journey.company || journey.name}`,
      company: journey.company || deck?.clientName || null,
      client_name: journey.name || null,
      line_items: [],
      currency: 'INR',
      total: 0,
      status: existing?.status && existing.status !== 'draft' ? existing.status : 'draft',
      kind: 'deck',
      deck: dk,
      chat,
      created_by: me,
      created_at: existing?.created_at || new Date().toISOString(),
    }
    try { await upsert(proposal) } catch { /* ignore */ }
    try { localStorage.setItem(`mvx_studio_${idRef.current}`, JSON.stringify({ chat, deck: dk })) } catch { /* ignore */ }
  }

  const scrollRef = useRef<HTMLDivElement>(null)
  const recogRef = useRef<SR | null>(null)
  const baseInputRef = useRef('')
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }) }, [msgs, loading])

  async function send(q: string) {
    const text = q.trim()
    if (!text || loading) return
    const next = [...msgs, { role: 'user' as const, text }]
    setMsgs(next); setInput(''); setLoading(true)
    let reply = 'I could not reach the server. Try again.'
    let newDeck = deck
    try {
      const res = await fetch('/api/proposals/studio', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ journeyId: journey.id, messages: next, deck }),
      })
      const d = await res.json()
      reply = d.message || d.error || 'Something went wrong.'
      if (d.deck) newDeck = d.deck
    } catch { /* keep fallback reply */ }
    const finalMsgs = [...next, { role: 'assistant' as const, text: reply }]
    setMsgs(finalMsgs)
    if (newDeck !== deck) setDeck(newDeck)
    setLoading(false)
    persist(finalMsgs, newDeck)   // autosave the turn
  }

  function copyLink() {
    persist(msgs, deck)
    try { navigator.clipboard.writeText(`${window.location.origin}/proposal/${tokenRef.current}`); toast('Share link copied ✓') } catch { toast('Copy failed') }
  }
  async function sendEmail() {
    const email = window.prompt('Send the proposal to which email?', journey.contact_email || '')
    if (!email) return
    await persist(msgs, deck)
    const res = await fetch('/api/proposals/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: tokenRef.current, email }) })
    toast(res.ok ? `Sent to ${email} ✓` : 'Could not send')
  }

  // ── dictation ──
  function toggleMic() {
    if (listening) { recogRef.current?.stop(); return }
    const w = window as SRWin
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition
    if (!Ctor) { toast('Voice not supported in this browser'); return }
    const r = new Ctor()
    r.lang = 'en-IN'; r.interimResults = true; r.continuous = true
    baseInputRef.current = input ? input + ' ' : ''
    r.onresult = (e) => {
      let s = ''
      for (let i = 0; i < e.results.length; i++) s += e.results[i][0].transcript
      setInput((baseInputRef.current + s).trimStart())
    }
    r.onend = () => setListening(false)
    r.onerror = () => setListening(false)
    recogRef.current = r
    try { r.start(); setListening(true) } catch { /* ignore */ }
  }
  useEffect(() => () => { try { recogRef.current?.abort() } catch { /* ignore */ } }, [])

  return (
    <ModalPortal>
      <div onClick={onClose} className="modal-overlay">
        <div onClick={e => e.stopPropagation()}
          style={{ width: '100%', maxWidth: preview ? 1120 : 860, height: '90vh', background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--shadow-modal)', animation: 'popIn .22s cubic-bezier(.2,.9,.3,1) both', display: 'flex', flexDirection: 'column' }}>
          {/* header */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--c-border-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: '#100E0C', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="15" height="15" viewBox="807 75.9 49.5 49.5" fill="#FF5A00"><path d="M831.88,125.05h0c0-13.49-10.94-24.42-24.42-24.42h0c13.49,0,24.42-10.94,24.42-24.43h0c0,13.49,10.94,24.42,24.42,24.42h0c-13.49,0-24.42,10.94-24.42,24.43Z" /></svg>
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15.5 }}>Proposal Studio</div>
                <div style={{ fontSize: 12, color: 'var(--c-faint)' }}>{journey.company || journey.name}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {deck && <button onClick={() => setPreview(p => !p)} style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--c-ink-3)', background: '#fff', border: '1.5px solid var(--c-border)', borderRadius: 9, padding: '7px 12px', cursor: 'pointer' }}>{preview ? 'Back to chat' : 'Preview deck'}</button>}
              <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--c-fill)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: 'none' }}><X size={14} color="var(--c-ghost)" /></button>
            </div>
          </div>

          {preview && deck ? (
            <div style={{ flex: 1, overflowY: 'auto', background: '#F5EDE1' }}>
              <ProposalDeckView deck={deck} />
            </div>
          ) : (
            <>
              {/* conversation */}
              <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {msgs.map((m, i) => m.role === 'user' ? (
                  <div key={i} style={{ alignSelf: 'flex-end', maxWidth: '82%', background: '#100E0C', color: '#F5EDE1', borderRadius: '15px 15px 4px 15px', padding: '11px 15px', fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{m.text}</div>
                ) : (
                  <div key={i} style={{ alignSelf: 'flex-start', maxWidth: '88%', background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: '4px 15px 15px 15px', padding: '12px 15px', fontSize: 14, lineHeight: 1.6, color: 'var(--c-ink-2)', whiteSpace: 'pre-wrap' }}>{m.text}</div>
                ))}
                {loading && <div style={{ alignSelf: 'flex-start', display: 'flex', gap: 4, padding: '8px 4px' }}>{[0, 1, 2].map(n => <div key={n} style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--c-ghost)', animation: `pulseRing 1.2s ease-in-out ${n * 0.2}s infinite` }} />)}</div>}

                {/* draft-ready card */}
                {deck && !loading && (
                  <div style={{ alignSelf: 'stretch', background: '#FBF4E9', border: '1px solid #E4D8C4', borderLeft: '3px solid #FF5A00', borderRadius: 12, padding: '14px 16px', marginTop: 4 }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: '#14110E' }}>Draft ready — {deck.clientName}</div>
                    <div style={{ fontSize: 12.5, color: '#6B6153', marginTop: 3 }}>{deck.months?.length || 0} phase(s){deck.months?.[0]?.investmentTotal ? ` · from ${deck.months[0].investmentTotal}` : ''} · preview the full deck</div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                      <button onClick={() => setPreview(true)} style={{ fontSize: 13, fontWeight: 700, color: '#fff', background: '#FF5A00', border: 'none', borderRadius: 9, padding: '8px 14px', cursor: 'pointer' }}>Preview deck</button>
                      <button onClick={copyLink} style={{ fontSize: 13, fontWeight: 700, color: '#14110E', background: '#fff', border: '1.5px solid #D6C7B0', borderRadius: 9, padding: '8px 14px', cursor: 'pointer' }}>Copy link</button>
                      <button onClick={sendEmail} style={{ fontSize: 13, fontWeight: 700, color: '#fff', background: '#100E0C', border: 'none', borderRadius: 9, padding: '8px 14px', cursor: 'pointer' }}>Send by email</button>
                    </div>
                    <div style={{ fontSize: 12, color: '#12643A', fontWeight: 600, marginTop: 9 }}>Saved automatically. Keep chatting to change anything — &ldquo;make Phase 2 ₹50k&rdquo;, &ldquo;add a website section&rdquo;.</div>
                  </div>
                )}
              </div>

              {/* input */}
              <div style={{ flexShrink: 0, padding: '12px 16px', borderTop: '1px solid var(--c-border-soft)', display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                <button onClick={toggleMic} title={listening ? 'Stop' : 'Dictate'}
                  style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', background: listening ? '#EF4444' : '#100E0C' }}>
                  {listening
                    ? <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
                    : <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" /></svg>}
                </button>
                <textarea value={input} onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) } }}
                  rows={1} placeholder={listening ? 'Listening… talk away' : 'Describe the client, the plan, the pricing…'}
                  style={{ flex: 1, border: '1.5px solid var(--c-border)', borderRadius: 13, padding: '12px 15px', fontSize: 14.5, lineHeight: 1.5, resize: 'none', outline: 'none', maxHeight: 140, background: '#fff', boxSizing: 'border-box' }} />
                <button onClick={() => send(input)} disabled={loading || !input.trim()}
                  style={{ width: 44, height: 44, borderRadius: 12, background: input.trim() && !loading ? '#FF5A00' : 'var(--c-rule)', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: input.trim() && !loading ? 'pointer' : 'default', flexShrink: 0 }}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </ModalPortal>
  )
}
