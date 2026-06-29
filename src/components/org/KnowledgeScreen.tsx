'use client'
import { useState } from 'react'
import { useToast } from '@/lib/store'
import { Plus, X, Check, Sparkle, Spinner, Search } from '@/components/ui/Icon'

const SEED_DOCS = [
  { id: 'k1', title: 'Brand Voice Guide', cat: 'Brand', content: 'Mavixy\'s tone is calm confidence meets creative wit. We avoid corporate jargon, never use exclamation marks in headers, and lead with results. Copy is always punchy, benefit-first, and written for the scroll.', tags: ['tone', 'writing', 'brand'], pinned: true },
  { id: 'k2', title: 'Content SOP — Reel creation', cat: 'Process', content: 'Step 1: Brief review with client in the first week.\nStep 2: Scriptwriting + hook testing (3 hooks minimum).\nStep 3: Shoot or source footage.\nStep 4: Edit with brand template.\nStep 5: Internal review before client delivery.\nStep 6: Client feedback round (max 2 revisions).\nStep 7: Approved — push to scheduler.', tags: ['reel', 'process', 'sop'], pinned: true },
  { id: 'k3', title: 'Client onboarding checklist', cat: 'Process', content: '- Brand questionnaire sent\n- Access to social accounts\n- Google Drive folder created\n- Kickoff call scheduled\n- Month 1 plan drafted\n- Reporting template set up', tags: ['onboarding', 'client', 'checklist'], pinned: false },
  { id: 'k4', title: 'Pricing tiers 2026', cat: 'Sales', content: 'Starter: ₹25K/mo — Social (3 reels + 8 posts)\nGrowth: ₹55K/mo — Social + Performance ads\nScale: ₹1.1L/mo — Full retainer (social + ads + SEO)\nEnterprise: Custom', tags: ['pricing', 'sales'], pinned: false },
  { id: 'k5', title: 'Hook formulas that work', cat: 'Creative', content: '"[Number] things nobody tells you about [topic]"\n"Stop doing [common mistake]"\n"How we took [brand] from X to Y in [timeframe]"\n"The [adjective] secret to [desired outcome]"\n"POV: You just discovered [thing]"', tags: ['copy', 'creative', 'hooks'], pinned: true },
]

const CATS = ['All', 'Brand', 'Process', 'Creative', 'Sales']

export default function KnowledgeScreen() {
  const toast = useToast()
  const [docs, setDocs] = useState(SEED_DOCS)
  const [cat, setCat] = useState('All')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>('k1')
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState({ title: '', cat: 'Process', content: '', tags: '' })
  const [aiLoading, setAiLoading] = useState(false)

  const filtered = docs.filter(d =>
    (cat === 'All' || d.cat === cat) &&
    (d.title.toLowerCase().includes(search.toLowerCase()) || d.content.toLowerCase().includes(search.toLowerCase()))
  )
  const selected = docs.find(d => d.id === selectedId)

  function saveDoc() {
    if (!form.title.trim() || !form.content.trim()) return
    const doc = {
      id: `k-${Date.now()}`,
      title: form.title,
      cat: form.cat,
      content: form.content,
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      pinned: false,
    }
    setDocs(ds => [...ds, doc])
    toast('Document added')
    setAddOpen(false)
    setSelectedId(doc.id)
    setForm({ title: '', cat: 'Process', content: '', tags: '' })
  }

  function togglePin(id: string) {
    setDocs(ds => ds.map(d => d.id === id ? { ...d, pinned: !d.pinned } : d))
    toast('Updated')
  }

  async function aiExpand() {
    if (!selected) return
    setAiLoading(true)
    try {
      const res = await fetch('/api/ai/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'knowledge', title: selected.title, content: selected.content })
      })
      const { text } = await res.json()
      setDocs(ds => ds.map(d => d.id === selectedId ? { ...d, content: d.content + '\n\n' + text } : d))
      toast('Content expanded with AI')
    } catch {
      toast('AI unavailable')
    } finally {
      setAiLoading(false)
    }
  }

  const sorted = [...filtered].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0))

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20, height: 680 }}>
      {/* Sidebar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} color="var(--c-faint)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search docs..."
            style={{ width: '100%', border: '1.5px solid var(--c-border)', borderRadius: 10, padding: '9px 10px 9px 30px', fontSize: 13.5, background: 'var(--c-surface)' }} />
        </div>

        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {CATS.map(c => (
            <button key={c} onClick={() => setCat(c)}
              style={{ padding: '4px 9px', borderRadius: 7, fontSize: 12, fontWeight: 600, background: cat === c ? 'var(--c-ink)' : 'var(--c-fill)', color: cat === c ? '#fff' : 'var(--c-muted)', transition: 'all .12s' }}>
              {c}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {sorted.map(doc => (
            <button key={doc.id} onClick={() => setSelectedId(doc.id)}
              style={{ textAlign: 'left', padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${selectedId === doc.id ? 'var(--c-accent)' : 'var(--c-border)'}`, background: selectedId === doc.id ? 'rgba(255,92,31,.04)' : '#fff', transition: 'all .12s' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                {doc.pinned && <svg width="10" height="10" viewBox="0 0 24 24" fill="var(--c-accent)" stroke="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>}
                <span style={{ fontSize: 13, fontWeight: 600 }}>{doc.title}</span>
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--c-faint)' }}>{doc.cat}</div>
            </button>
          ))}
        </div>

        <button onClick={() => setAddOpen(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 7, justifyContent: 'center', background: 'var(--c-ink)', color: '#fff', borderRadius: 10, padding: '9px', fontWeight: 600, fontSize: 13 }}>
          <Plus size={13} />New Document
        </button>
      </div>

      {/* Doc viewer */}
      {selected ? (
        <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--c-border-soft)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{selected.title}</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--c-muted)', background: 'var(--c-fill)', borderRadius: 6, padding: '2px 7px' }}>{selected.cat}</span>
                {selected.tags.map(tag => (
                  <span key={tag} style={{ fontSize: 11, color: 'var(--c-faint)', background: 'var(--c-fill)', borderRadius: 5, padding: '2px 6px' }}>#{tag}</span>
                ))}
              </div>
            </div>
            <button onClick={() => togglePin(selected.id)}
              style={{ padding: '7px 11px', borderRadius: 8, fontSize: 12.5, fontWeight: 600, color: selected.pinned ? 'var(--c-accent)' : 'var(--c-subtle)', background: selected.pinned ? 'rgba(255,92,31,.06)' : 'var(--c-fill)' }}>
              {selected.pinned ? '📌 Pinned' : 'Pin'}
            </button>
            <button onClick={aiExpand} disabled={aiLoading}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 11px', borderRadius: 8, fontSize: 12.5, fontWeight: 600, color: '#FF5C1F', background: 'rgba(255,92,31,.06)', border: '1px solid rgba(255,92,31,.2)' }}>
              {aiLoading ? <Spinner size={12} color="#FF5C1F" /> : <Sparkle size={12} color="#FF5C1F" />}
              AI expand
            </button>
          </div>
          <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
            <pre style={{ fontSize: 14, lineHeight: 1.75, color: 'var(--c-ink)', fontFamily: 'var(--font-body)', whiteSpace: 'pre-wrap', margin: 0 }}>{selected.content}</pre>
          </div>
        </div>
      ) : (
        <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--c-ghost)', fontSize: 14 }}>
          Select a document to read
        </div>
      )}

      {addOpen && (
        <div onClick={() => setAddOpen(false)} className="modal-overlay">
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 520, background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--shadow-modal)', animation: 'popIn .22s cubic-bezier(.2,.9,.3,1) both' }}>
            <div style={{ padding: '20px 22px', borderBottom: '1px solid var(--c-border-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>New Document</div>
              <button onClick={() => setAddOpen(false)}><X size={15} color="var(--c-ghost)" /></button>
            </div>
            <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 13 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 5 }}>Title</label>
                  <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Reel SOP"
                    style={{ width: '100%', border: '1.5px solid var(--c-border)', borderRadius: 10, padding: '10px 12px', fontSize: 14 }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 5 }}>Category</label>
                  <select value={form.cat} onChange={e => setForm(f => ({ ...f, cat: e.target.value }))}
                    style={{ width: '100%', border: '1.5px solid var(--c-border)', borderRadius: 10, padding: '10px 12px', fontSize: 14 }}>
                    {CATS.filter(c => c !== 'All').map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 5 }}>Content</label>
                <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={6} placeholder="Write your knowledge here..."
                  style={{ width: '100%', border: '1.5px solid var(--c-border)', borderRadius: 10, padding: '10px 12px', fontSize: 14, resize: 'vertical' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 5 }}>Tags (comma-separated)</label>
                <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="e.g. sop, reel, process"
                  style={{ width: '100%', border: '1.5px solid var(--c-border)', borderRadius: 10, padding: '10px 12px', fontSize: 14 }} />
              </div>
            </div>
            <div style={{ padding: '14px 22px', borderTop: '1px solid var(--c-border-soft)', display: 'flex', gap: 10 }}>
              <button onClick={() => setAddOpen(false)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1.5px solid var(--c-border)', fontSize: 14, fontWeight: 600, color: 'var(--c-subtle)' }}>Cancel</button>
              <button onClick={saveDoc} style={{ flex: 2, padding: '10px', borderRadius: 10, background: 'var(--c-ink)', color: '#fff', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                <Check size={14} color="#fff" />Save Document
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
