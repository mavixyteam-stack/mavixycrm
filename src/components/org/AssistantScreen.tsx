'use client'
import { useState, useRef, useEffect } from 'react'
import { useApp, useReloadWorkspace } from '@/lib/store'
import { Sparkle } from '@/components/ui/Icon'

interface Msg { role: 'user' | 'assistant'; text: string }

// ─── Minimal Web Speech API typings (not in the DOM lib) ──────────────────────
type SpeechResult = ArrayLike<{ transcript: string }> & { isFinal: boolean }
type SpeechRecognitionInstance = {
  lang: string; interimResults: boolean; continuous: boolean
  start: () => void; stop: () => void; abort: () => void
  onstart: (() => void) | null
  onend: (() => void) | null
  onerror: ((e: { error?: string }) => void) | null
  onresult: ((e: { resultIndex: number; results: ArrayLike<SpeechResult> }) => void) | null
}
type SRWindow = Window & {
  SpeechRecognition?: new () => SpeechRecognitionInstance
  webkitSpeechRecognition?: new () => SpeechRecognitionInstance
}

const SUGGESTED = [
  "What's the state of the company right now?",
  'Who is behind on their work?',
  'Which clients need attention?',
  'What did the team get done today?',
  "How's the sales pipeline looking?",
  'Who worked the most this week?',
]

// Strip markdown + emoji so the spoken version sounds clean.
function speakable(text: string): string {
  return text
    .replace(/\*\*/g, '')
    .replace(/^[-•*]\s+/gm, '')
    .replace(/[#*_`>]/g, '')
    .replace(/₹/g, ' rupees ')
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{2190}-\u{21FF}\u{2000}-\u{206F}\u{FE0F}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export default function AssistantScreen() {
  const { state } = useApp()
  const reload = useReloadWorkspace()
  const firstName = state.currentUser?.name?.split(' ')[0] || 'there'
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  // Voice state
  const [voiceSupported, setVoiceSupported] = useState(false)
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [speaking, setSpeaking] = useState(false)
  const [voiceOn, setVoiceOn] = useState(false)      // read replies aloud
  const [handsFree, setHandsFree] = useState(false)  // continuous conversation

  const scrollRef = useRef<HTMLDivElement>(null)
  const recogRef = useRef<SpeechRecognitionInstance | null>(null)
  const voicesRef = useRef<SpeechSynthesisVoice[]>([])
  const askRef = useRef<(q: string) => void>(() => {})
  const finalRef = useRef('')
  const listeningRef = useRef(false)
  const voiceOnRef = useRef(false)
  const handsFreeRef = useRef(false)

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }) }, [msgs, loading, interim])

  // Keep refs in sync with the latest state/closures for use inside callbacks.
  useEffect(() => { listeningRef.current = listening }, [listening])
  useEffect(() => { voiceOnRef.current = voiceOn }, [voiceOn])
  useEffect(() => { handsFreeRef.current = handsFree }, [handsFree])

  // Restore voice preferences.
  useEffect(() => {
    try {
      setVoiceOn(localStorage.getItem('mavixy_voice_on') === '1')
    } catch { /* ignore */ }
  }, [])

  // ── Text-to-speech ──────────────────────────────────────────────────────────
  function pickVoice(): SpeechSynthesisVoice | null {
    const vs = voicesRef.current
    if (!vs.length) return null
    return (
      vs.find(v => /en-IN/i.test(v.lang)) ||
      vs.find(v => /Google.*English/i.test(v.name)) ||
      vs.find(v => /en-GB/i.test(v.lang)) ||
      vs.find(v => /^en[-_]/i.test(v.lang)) ||
      vs.find(v => /^en/i.test(v.lang)) ||
      null
    )
  }

  function stopSpeaking() {
    try { window.speechSynthesis?.cancel() } catch { /* ignore */ }
    setSpeaking(false)
  }

  function speak(text: string) {
    const canTTS = typeof window !== 'undefined' && 'speechSynthesis' in window
    if (!voiceOnRef.current || !canTTS) {
      if (handsFreeRef.current) startListening()
      return
    }
    const clean = speakable(text)
    if (!clean) { if (handsFreeRef.current) startListening(); return }
    try { window.speechSynthesis.cancel() } catch { /* ignore */ }
    const u = new SpeechSynthesisUtterance(clean)
    u.rate = 1.03; u.pitch = 1; u.lang = 'en-IN'
    const v = pickVoice(); if (v) u.voice = v
    u.onstart = () => setSpeaking(true)
    u.onend = () => { setSpeaking(false); if (handsFreeRef.current) startListening() }
    u.onerror = () => setSpeaking(false)
    window.speechSynthesis.speak(u)
  }

  // ── Speech-to-text ──────────────────────────────────────────────────────────
  function startListening() {
    const r = recogRef.current
    if (!r || listeningRef.current) return
    stopSpeaking()
    finalRef.current = ''
    setInterim('')
    try { r.start() } catch { /* already running */ }
  }
  function stopListening() {
    try { recogRef.current?.stop() } catch { /* ignore */ }
  }

  // Set up recognition once.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const w = window as SRWindow
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition
    if (!SR) { setVoiceSupported(false); return }
    setVoiceSupported(true)

    // Load TTS voices (async in most browsers).
    const loadVoices = () => { try { voicesRef.current = window.speechSynthesis.getVoices() } catch { /* ignore */ } }
    loadVoices()
    if ('speechSynthesis' in window) window.speechSynthesis.onvoiceschanged = loadVoices

    const r = new SR()
    r.lang = 'en-IN'
    r.interimResults = true
    r.continuous = false
    r.onstart = () => setListening(true)
    r.onerror = (e) => {
      setListening(false)
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') setHandsFree(false)
    }
    r.onend = () => {
      setListening(false)
      const t = finalRef.current.trim()
      finalRef.current = ''
      setInterim('')
      if (t) askRef.current(t)   // auto-send what was heard
    }
    r.onresult = (e) => {
      let interimStr = ''
      let finalStr = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i]
        if (res.isFinal) finalStr += res[0].transcript
        else interimStr += res[0].transcript
      }
      if (finalStr) finalRef.current += finalStr
      setInterim(interimStr)
      setInput((finalRef.current + ' ' + interimStr).trim())
    }
    recogRef.current = r

    return () => {
      try { r.abort() } catch { /* ignore */ }
      try { window.speechSynthesis?.cancel() } catch { /* ignore */ }
      if ('speechSynthesis' in window) window.speechSynthesis.onvoiceschanged = null
    }
  }, [])

  function toggleVoice() {
    const next = !voiceOn
    setVoiceOn(next)
    try { localStorage.setItem('mavixy_voice_on', next ? '1' : '0') } catch { /* ignore */ }
    if (!next) stopSpeaking()
  }

  function toggleHandsFree() {
    const next = !handsFree
    setHandsFree(next)
    handsFreeRef.current = next
    if (next) {
      if (!voiceOnRef.current) { setVoiceOn(true); voiceOnRef.current = true; try { localStorage.setItem('mavixy_voice_on', '1') } catch { /* ignore */ } }
      startListening()
    } else {
      stopListening()
      stopSpeaking()
    }
  }

  function toggleMic() {
    if (listening) stopListening()
    else startListening()
  }

  async function ask(q: string) {
    const question = q.trim()
    if (!question || loading) return
    stopSpeaking()
    const history = msgs.slice(-6)
    setMsgs(m => [...m, { role: 'user', text: question }])
    setInput('')
    setInterim('')
    setLoading(true)
    try {
      const res = await fetch('/api/ai/assistant', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, history }),
      })
      const d = await res.json()
      const answer = res.ok ? d.answer : (d.error || 'Something went wrong.')
      setMsgs(m => [...m, { role: 'assistant', text: answer }])
      if (d.created) { try { await reload() } catch { /* ignore */ } }
      speak(answer)
    } catch {
      const answer = 'I could not reach the server. Try again in a moment.'
      setMsgs(m => [...m, { role: 'assistant', text: answer }])
      speak(answer)
    } finally {
      setLoading(false)
    }
  }
  askRef.current = ask

  function renderText(text: string) {
    return text.split('\n').map((line, i) => {
      const t = line.trim()
      if (!t) return <div key={i} style={{ height: 6 }} />
      const bold = /^\*\*(.+?)\*\*:?$/.exec(t)
      if (bold) return <div key={i} style={{ fontWeight: 700, color: 'var(--c-ink)', margin: '10px 0 3px' }}>{bold[1]}</div>
      if (/^[-•*]\s/.test(t)) return <div key={i} style={{ margin: '2px 0 2px 4px', display: 'flex', gap: 7 }}><span style={{ color: 'var(--c-accent)' }}>•</span><span>{t.replace(/^[-•*]\s/, '')}</span></div>
      return <div key={i} style={{ margin: '4px 0' }}>{t}</div>
    })
  }

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 18, flexShrink: 0 }}>
        <div style={{ position: 'relative', width: 42, height: 42, borderRadius: 13, background: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Sparkle size={20} color="#FF5C1F" style={{ animation: (speaking || listening) ? 'sparkleSpin 2s linear infinite' : 'sparkleSpin 8s linear infinite' }} />
          {(speaking || listening) && <span style={{ position: 'absolute', inset: -3, borderRadius: 16, border: `2px solid ${listening ? '#EF4444' : '#FF5C1F'}`, animation: 'pulseRing 1.4s ease-in-out infinite' }} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1 }}>Ask Mavixy</h1>
          <div style={{ fontSize: 13, color: 'var(--c-subtle)' }}>
            {listening ? 'Listening…' : speaking ? 'Speaking…' : 'Your AI chief of staff — talk or type, and I can assign work too'}
          </div>
        </div>

        {/* Voice controls */}
        {voiceSupported && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <button onClick={toggleVoice} title={voiceOn ? 'Voice replies on' : 'Voice replies off'}
              style={{ width: 38, height: 38, borderRadius: 11, border: `1.5px solid ${voiceOn ? 'var(--c-accent)' : 'var(--c-border)'}`, background: voiceOn ? 'var(--c-accent)' : '#fff', color: voiceOn ? '#fff' : 'var(--c-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all .15s' }}>
              {voiceOn ? (
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
              ) : (
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
              )}
            </button>
            <button onClick={toggleHandsFree} title="Hands-free conversation"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 38, padding: '0 13px', borderRadius: 11, border: `1.5px solid ${handsFree ? '#0F172A' : 'var(--c-border)'}`, background: handsFree ? '#0F172A' : '#fff', color: handsFree ? '#fff' : 'var(--c-muted)', fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all .15s' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: handsFree ? '#4ADE80' : 'var(--c-rule)', boxShadow: handsFree ? '0 0 0 3px rgba(74,222,128,.25)' : 'none' }} />
              Hands-free
            </button>
          </div>
        )}
      </div>

      {/* Conversation */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14, paddingRight: 4 }}>
        {msgs.length === 0 && (
          <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 18, padding: '24px 22px' }}>
            <div style={{ fontSize: 15.5, fontWeight: 600, marginBottom: 4 }}>Hi {firstName} 👋</div>
            <div style={{ fontSize: 14, color: 'var(--c-subtle)', lineHeight: 1.6, marginBottom: 16 }}>
              I can see the whole company in real time — every task, client, deal, who&apos;s working and what they logged. Ask me anything, or just tell me to assign work{voiceSupported ? '. Tap the mic and talk, or switch on hands-free for a back-and-forth' : ''}.
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {SUGGESTED.map(s => (
                <button key={s} onClick={() => ask(s)}
                  style={{ fontSize: 13, fontWeight: 500, color: 'var(--c-ink-2)', background: 'var(--c-fill)', border: '1px solid var(--c-border)', borderRadius: 20, padding: '8px 14px', cursor: 'pointer', transition: 'all .12s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--c-accent)'; (e.currentTarget as HTMLElement).style.color = 'var(--c-accent-ink)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--c-border)'; (e.currentTarget as HTMLElement).style.color = 'var(--c-ink-2)' }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {msgs.map((m, i) => m.role === 'user' ? (
          <div key={i} style={{ alignSelf: 'flex-end', maxWidth: '85%', background: 'var(--c-accent)', color: '#fff', borderRadius: '16px 16px 4px 16px', padding: '11px 15px', fontSize: 14.5, lineHeight: 1.5 }}>{m.text}</div>
        ) : (
          <div key={i} style={{ alignSelf: 'flex-start', maxWidth: '92%', display: 'flex', gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 9, background: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
              <Sparkle size={13} color="#FF5C1F" />
            </div>
            <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: '4px 16px 16px 16px', padding: '13px 16px', fontSize: 14.5, lineHeight: 1.6, color: 'var(--c-ink-2)' }}>
              {renderText(m.text)}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ alignSelf: 'flex-start', display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ width: 28, height: 28, borderRadius: 9, background: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkle size={13} color="#FF5C1F" style={{ animation: 'sparkleSpin 2s linear infinite' }} />
            </div>
            <div style={{ display: 'flex', gap: 4, padding: '4px 0' }}>
              {[0, 1, 2].map(n => <div key={n} style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--c-ghost)', animation: `pulseRing 1.2s ease-in-out ${n * 0.2}s infinite` }} />)}
            </div>
          </div>
        )}

        {/* Live listening bubble */}
        {listening && (
          <div style={{ alignSelf: 'flex-end', maxWidth: '85%', display: 'flex', alignItems: 'center', gap: 9, background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', borderRadius: '16px 16px 4px 16px', padding: '11px 15px', fontSize: 14.5 }}>
            <span style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
              {[0, 1, 2].map(n => <span key={n} style={{ width: 3.5, height: 13, borderRadius: 3, background: '#EF4444', animation: `eq 1s ease-in-out ${n * 0.15}s infinite` }} />)}
            </span>
            <span style={{ opacity: interim ? 1 : 0.6 }}>{interim || 'Listening…'}</span>
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{ flexShrink: 0, marginTop: 14, display: 'flex', gap: 10, alignItems: 'flex-end' }}>
        {voiceSupported && (
          <button onClick={toggleMic} title={listening ? 'Stop listening' : 'Speak'}
            style={{ width: 46, height: 46, borderRadius: 13, flexShrink: 0, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', background: listening ? '#EF4444' : '#0F172A', transition: 'all .15s', boxShadow: listening ? '0 0 0 4px rgba(239,68,68,.2)' : 'none' }}>
            {listening ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/></svg>
            )}
          </button>
        )}
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(input) } }}
          rows={1}
          placeholder={listening ? 'Listening…' : 'Ask, or tell me to assign work…'}
          style={{ flex: 1, border: '1.5px solid var(--c-border)', borderRadius: 14, padding: '12px 15px', fontSize: 14.5, lineHeight: 1.5, resize: 'none', outline: 'none', maxHeight: 120, background: '#fff', boxSizing: 'border-box' }}
          onFocus={e => e.target.style.borderColor = 'var(--c-ink)'} onBlur={e => e.target.style.borderColor = 'var(--c-border)'} />
        {speaking ? (
          <button onClick={stopSpeaking} title="Stop speaking"
            style={{ width: 46, height: 46, borderRadius: 13, background: '#0F172A', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
          </button>
        ) : (
          <button onClick={() => ask(input)} disabled={loading || !input.trim()}
            style={{ width: 46, height: 46, borderRadius: 13, background: input.trim() && !loading ? 'var(--c-accent)' : 'var(--c-rule)', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: input.trim() && !loading ? 'pointer' : 'default', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        )}
      </div>
    </div>
  )
}
