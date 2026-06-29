'use client'
import { useState } from 'react'
import { useApp, useToast } from '@/lib/store'
import { Sparkle, Spinner } from '@/components/ui/Icon'

const SEED_MESSAGES = [
  { id: 'm1', from: 'Priya Sharma', company: 'SUNSO', avatar: 'PS', color: '#F4B740', text: 'Hey team! Can you share the latest reel draft for the glow ritual? We\'d like to review before EOD.', time: '2h ago', unread: true, thread: [] },
  { id: 'm2', from: 'Arjun Singh', company: 'Lumio', avatar: 'AS', color: '#8B5CF6', text: 'The Diwali teaser looks amazing! A few notes: 1. Can we add a 20% offer sticker? 2. The bokeh is perfect, keep it. 3. Push date confirmed for Nov 1.', time: '4h ago', unread: true, thread: [] },
  { id: 'm3', from: 'Neha Patel', company: 'The Weekend Doors', avatar: 'NP', color: '#FF5C38', text: 'Reel cover needs to change — we want the barista shot not the counter shot. Also the new menu drops Friday so the static post needs to go out Thursday.', time: 'Yesterday', unread: false, thread: [] },
  { id: 'm4', from: 'Kabir Mehta', company: 'Elysian Trails', avatar: 'KM', color: '#10B981', text: 'Story set is approved! We loved the film palette. Can you do a similar treatment for the hidden valleys blog header?', time: '2 days ago', unread: false, thread: [] },
]

export default function InboxScreen() {
  const { state } = useApp()
  const toast = useToast()
  const [messages, setMessages] = useState(SEED_MESSAGES)
  const [selected, setSelected] = useState<string | null>('m1')
  const [reply, setReply] = useState('')
  const [aiDraft, setAiDraft] = useState('')
  const [aiLoading, setAiLoading] = useState(false)

  const selectedMsg = messages.find(m => m.id === selected)
  const unread = messages.filter(m => m.unread).length

  function markRead(id: string) {
    setMessages(ms => ms.map(m => m.id === id ? { ...m, unread: false } : m))
  }

  function selectMsg(id: string) {
    setSelected(id)
    markRead(id)
    setReply('')
    setAiDraft('')
  }

  async function draftReply() {
    if (!selectedMsg) return
    setAiLoading(true)
    setAiDraft('')
    try {
      const res = await fetch('/api/ai/brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userName: state.currentUser?.name || 'Team',
          mode: 'reply',
          clientMessage: selectedMsg.text,
          clientName: selectedMsg.from,
          company: selectedMsg.company,
        })
      })
      const { text } = await res.json()
      setAiDraft(text || '')
      setReply(text || '')
    } catch {
      const draft = `Hi ${selectedMsg.from.split(' ')[0]},\n\nThank you for your message! We've noted your feedback and will action it right away.\n\nWe'll have an update to you by EOD.\n\nBest,\n${state.currentUser?.name || 'Mavixy Team'}`
      setAiDraft(draft)
      setReply(draft)
    } finally {
      setAiLoading(false)
    }
  }

  function sendReply() {
    if (!reply.trim()) return
    toast('Reply sent')
    setReply('')
    setAiDraft('')
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', display: 'grid', gridTemplateColumns: '300px 1fr', gap: 0, background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 16, overflow: 'hidden', height: 640 }}>
      {/* Message list */}
      <div style={{ borderRight: '1px solid var(--c-border-soft)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--c-border-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15 }}>Inbox</div>
          {unread > 0 && <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: 'var(--c-accent)', borderRadius: 20, padding: '2px 7px' }}>{unread} new</span>}
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {messages.map(m => (
            <button key={m.id} onClick={() => selectMsg(m.id)}
              style={{ width: '100%', textAlign: 'left', padding: '12px 14px', borderBottom: '1px solid var(--c-border-soft)', background: selected === m.id ? 'rgba(255,92,31,.04)' : '#fff', borderLeft: `3px solid ${selected === m.id ? 'var(--c-accent)' : 'transparent'}`, transition: 'all .12s' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: m.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 11, flexShrink: 0, position: 'relative' }}>
                  {m.avatar}
                  {m.unread && <div style={{ position: 'absolute', top: -2, right: -2, width: 8, height: 8, borderRadius: '50%', background: 'var(--c-accent)', border: '1.5px solid #fff' }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: m.unread ? 700 : 600 }}>{m.from}</span>
                    <span style={{ fontSize: 11, color: 'var(--c-faint)' }}>{m.time}</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--c-faint)', fontWeight: 500, marginBottom: 2 }}>{m.company}</div>
                  <div style={{ fontSize: 12, color: m.unread ? 'var(--c-ink-3)' : 'var(--c-ghost)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>{m.text}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Message thread */}
      {selectedMsg ? (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--c-border-soft)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: selectedMsg.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 11 }}>
              {selectedMsg.avatar}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{selectedMsg.from}</div>
              <div style={{ fontSize: 12, color: 'var(--c-faint)' }}>{selectedMsg.company} · {selectedMsg.time}</div>
            </div>
          </div>

          <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
            <div style={{ background: 'var(--c-fill)', borderRadius: 14, padding: '14px 16px', maxWidth: '80%', marginBottom: 16 }}>
              <p style={{ fontSize: 14, lineHeight: 1.6, margin: 0 }}>{selectedMsg.text}</p>
            </div>
          </div>

          {/* Reply box */}
          <div style={{ padding: '14px 20px', borderTop: '1px solid var(--c-border-soft)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--c-muted)' }}>Reply to {selectedMsg.from.split(' ')[0]}</span>
              <button onClick={draftReply} disabled={aiLoading}
                style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: '#FF5C1F', background: 'rgba(255,92,31,.06)', border: '1px solid rgba(255,92,31,.2)', borderRadius: 7, padding: '4px 9px' }}>
                {aiLoading ? <Spinner size={11} color="#FF5C1F" /> : <Sparkle size={11} color="#FF5C1F" />}
                AI draft
              </button>
            </div>
            <textarea value={reply} onChange={e => setReply(e.target.value)} placeholder="Write your reply..."
              rows={4}
              style={{ width: '100%', border: '1.5px solid var(--c-border)', borderRadius: 10, padding: '10px 12px', fontSize: 13.5, resize: 'none', outline: 'none', lineHeight: 1.6 }}
              onFocus={e => e.target.style.borderColor = 'var(--c-ink)'}
              onBlur={e => e.target.style.borderColor = 'var(--c-border)'} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
              <button onClick={sendReply} disabled={!reply.trim()}
                style={{ background: 'var(--c-ink)', color: '#fff', borderRadius: 9, padding: '9px 18px', fontWeight: 600, fontSize: 13.5, opacity: reply.trim() ? 1 : .4 }}>
                Send reply
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--c-ghost)', fontSize: 14 }}>
          Select a message to read
        </div>
      )}
    </div>
  )
}
