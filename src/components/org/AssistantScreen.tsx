'use client'
import { useState, useRef, useEffect } from 'react'
import { useApp } from '@/lib/store'
import { Sparkle } from '@/components/ui/Icon'

interface Msg { role: 'user' | 'assistant'; text: string }

const SUGGESTED = [
  "What's the state of the company right now?",
  'Who is behind on their work?',
  'Which clients need attention?',
  'What did the team get done today?',
  "How's the sales pipeline looking?",
  'Who worked the most this week?',
]

export default function AssistantScreen() {
  const { state } = useApp()
  const firstName = state.currentUser?.name?.split(' ')[0] || 'there'
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }) }, [msgs, loading])

  async function ask(q: string) {
    const question = q.trim()
    if (!question || loading) return
    const history = msgs.slice(-6)
    setMsgs(m => [...m, { role: 'user', text: question }])
    setInput('')
    setLoading(true)
    try {
      const res = await fetch('/api/ai/assistant', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, history }),
      })
      const d = await res.json()
      setMsgs(m => [...m, { role: 'assistant', text: res.ok ? d.answer : (d.error || 'Something went wrong.') }])
    } catch {
      setMsgs(m => [...m, { role: 'assistant', text: 'I could not reach the server. Try again in a moment.' }])
    } finally {
      setLoading(false)
    }
  }

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
        <div style={{ width: 42, height: 42, borderRadius: 13, background: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Sparkle size={20} color="#FF5C1F" style={{ animation: 'sparkleSpin 8s linear infinite' }} />
        </div>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1 }}>Ask Mavixy</h1>
          <div style={{ fontSize: 13, color: 'var(--c-subtle)' }}>Your AI chief of staff — ask anything about the company</div>
        </div>
      </div>

      {/* Conversation */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14, paddingRight: 4 }}>
        {msgs.length === 0 && (
          <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 18, padding: '24px 22px' }}>
            <div style={{ fontSize: 15.5, fontWeight: 600, marginBottom: 4 }}>Hi {firstName} 👋</div>
            <div style={{ fontSize: 14, color: 'var(--c-subtle)', lineHeight: 1.6, marginBottom: 16 }}>
              I can see the whole company in real time — every task, client, deal, who's working and what they logged. Ask me anything.
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
      </div>

      {/* Input */}
      <div style={{ flexShrink: 0, marginTop: 14, display: 'flex', gap: 10, alignItems: 'flex-end' }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(input) } }}
          rows={1}
          placeholder="Ask about your team, clients, pipeline, anything…"
          style={{ flex: 1, border: '1.5px solid var(--c-border)', borderRadius: 14, padding: '12px 15px', fontSize: 14.5, lineHeight: 1.5, resize: 'none', outline: 'none', maxHeight: 120, background: '#fff', boxSizing: 'border-box' }}
          onFocus={e => e.target.style.borderColor = 'var(--c-ink)'} onBlur={e => e.target.style.borderColor = 'var(--c-border)'} />
        <button onClick={() => ask(input)} disabled={loading || !input.trim()}
          style={{ width: 46, height: 46, borderRadius: 13, background: input.trim() && !loading ? 'var(--c-accent)' : 'var(--c-rule)', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: input.trim() && !loading ? 'pointer' : 'default', flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </div>
    </div>
  )
}
