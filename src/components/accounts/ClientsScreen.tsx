'use client'
import { useState } from 'react'
import { useApp, useToast } from '@/lib/store'
import { Plus, X, Check, Search } from '@/components/ui/Icon'
import { SERVICE_CATS } from '@/lib/seed-data'

export default function ClientsScreen() {
  const { state, dispatch } = useApp()
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState({ name: '', industry: '', contact_name: '', contact_email: '', services: [] as string[], type: 'full' as 'full'|'social'|'ads'|'seo', color: '#FF5C1F' })

  const COLORS = ['#FF5C1F','#F4B740','#8B5CF6','#10B981','#2563EB','#EF4444','#0EA5A4','#FB7185']

  const filtered = state.clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  function saveClient() {
    if (!form.name.trim()) return
    const initials = form.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    const client = {
      id: `client-${Date.now()}`,
      name: form.name,
      initials,
      color: form.color,
      health: 80,
      services: form.services.length ? form.services : ['social'],
      type: form.type,
      industry: form.industry,
      contact_name: form.contact_name,
      contact_email: form.contact_email,
      created_at: new Date().toISOString(),
    }
    dispatch({ type: 'UPSERT_CLIENT', client })
    toast(`${form.name} added`)
    setAddOpen(false)
    setForm({ name: '', industry: '', contact_name: '', contact_email: '', services: [], type: 'full', color: '#FF5C1F' })
  }

  function goDetail(id: string) {
    dispatch({ type: 'SET_CLIENT_DETAIL', clientId: id } as any)
    dispatch({ type: 'SET_SCREEN', screen: 'client-detail' })
  }

  function healthColor(h: number) {
    if (h >= 80) return 'var(--c-green)'
    if (h >= 60) return 'var(--c-amber)'
    return 'var(--c-red)'
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 4 }}>Accounts</h1>
          <p style={{ fontSize: 14, color: 'var(--c-subtle)' }}>{state.clients.length} active clients</p>
        </div>
        <button onClick={() => setAddOpen(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'var(--c-ink)', color: '#fff', borderRadius: 10, padding: '9px 16px', fontWeight: 600, fontSize: 13 }}>
          <Plus size={13} />New Client
        </button>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 20 }}>
        <Search size={15} color="var(--c-faint)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search clients..."
          style={{ width: '100%', maxWidth: 320, background: 'var(--c-surface)', border: '1.5px solid var(--c-border)', borderRadius: 10, padding: '9px 12px 9px 34px', fontSize: 13.5 }}
          onFocus={e => e.target.style.borderColor = 'var(--c-ink)'}
          onBlur={e => e.target.style.borderColor = 'var(--c-border)'} />
      </div>

      {/* Client grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(290px,1fr))', gap: 16 }}>
        {filtered.map(client => {
          const itemsCount = state.planItems.filter(i => i.client_id === client.id).length
          const activeCount = state.planItems.filter(i => i.client_id === client.id && i.status !== 'published').length
          return (
            <div key={client.id} onClick={() => goDetail(client.id)}
              style={{ background: 'var(--c-surface)', border: '1.5px solid var(--c-border)', borderRadius: 16, padding: '18px', cursor: 'pointer', transition: 'all .2s' }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,.1)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = '' }}>
              {/* Top row */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: client.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                  {client.initials}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>{client.name}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {client.services.map(s => {
                      const cat = SERVICE_CATS.find(c => c.key === s)
                      return cat ? (
                        <span key={s} style={{ fontSize: 10.5, fontWeight: 600, color: cat.color, background: cat.bg, borderRadius: 5, padding: '2px 6px' }}>{cat.short}</span>
                      ) : null
                    })}
                  </div>
                </div>
                {/* Health */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: healthColor(client.health), fontFamily: 'var(--font-display)' }}>{client.health}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--c-faint)', fontWeight: 600 }}>health</div>
                </div>
              </div>

              {/* Health bar */}
              <div style={{ height: 4, background: 'var(--c-fill)', borderRadius: 99, marginBottom: 14, overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 99, background: healthColor(client.health), width: `${client.health}%`, transition: 'width .5s' }} />
              </div>

              {/* Stats */}
              <div style={{ display: 'flex', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-display)' }}>{itemsCount}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--c-faint)' }}>deliverables</div>
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-display)', color: activeCount > 0 ? 'var(--c-accent)' : 'var(--c-ghost)' }}>{activeCount}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--c-faint)' }}>in progress</div>
                </div>
                {client.contact_name && (
                  <div style={{ marginLeft: 'auto' }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600 }}>{client.contact_name}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--c-faint)' }}>Contact</div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Add Client Modal */}
      {addOpen && (
        <div onClick={() => setAddOpen(false)} className="modal-overlay">
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 480, background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--shadow-modal)', animation: 'popIn .22s cubic-bezier(.2,.9,.3,1) both' }}>
            <div style={{ padding: '20px 22px', borderBottom: '1px solid var(--c-border-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>New Client</div>
              <button onClick={() => setAddOpen(false)}><X size={15} color="var(--c-ghost)" /></button>
            </div>
            <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 5 }}>Client Name *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. SUNSO"
                  style={{ width: '100%', border: '1.5px solid var(--c-border)', borderRadius: 10, padding: '10px 12px', fontSize: 14 }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 5 }}>Industry</label>
                  <input value={form.industry} onChange={e => setForm(f => ({ ...f, industry: e.target.value }))} placeholder="e.g. Beauty"
                    style={{ width: '100%', border: '1.5px solid var(--c-border)', borderRadius: 10, padding: '10px 12px', fontSize: 14 }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 5 }}>Contact Name</label>
                  <input value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))} placeholder="e.g. Priya Sharma"
                    style={{ width: '100%', border: '1.5px solid var(--c-border)', borderRadius: 10, padding: '10px 12px', fontSize: 14 }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 5 }}>Contact Email</label>
                <input value={form.contact_email} onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))} type="email" placeholder="e.g. priya@brand.com"
                  style={{ width: '100%', border: '1.5px solid var(--c-border)', borderRadius: 10, padding: '10px 12px', fontSize: 14 }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 5 }}>Services</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {SERVICE_CATS.map(cat => (
                    <button key={cat.key} onClick={() => setForm(f => ({ ...f, services: f.services.includes(cat.key) ? f.services.filter(s => s !== cat.key) : [...f.services, cat.key] }))}
                      style={{ padding: '6px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600, border: '1.5px solid', borderColor: form.services.includes(cat.key) ? cat.color : 'var(--c-border)', color: form.services.includes(cat.key) ? cat.color : 'var(--c-muted)', background: form.services.includes(cat.key) ? cat.bg : '#fff' }}>
                      {cat.short}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', display: 'block', marginBottom: 5 }}>Brand Color</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {COLORS.map(c => (
                    <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                      style={{ width: 28, height: 28, borderRadius: 8, background: c, border: `2.5px solid ${form.color === c ? 'var(--c-ink)' : 'transparent'}`, transition: 'border-color .15s' }} />
                  ))}
                </div>
              </div>
            </div>
            <div style={{ padding: '14px 22px', borderTop: '1px solid var(--c-border-soft)', display: 'flex', gap: 10 }}>
              <button onClick={() => setAddOpen(false)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1.5px solid var(--c-border)', fontSize: 14, fontWeight: 600, color: 'var(--c-subtle)' }}>Cancel</button>
              <button onClick={saveClient} style={{ flex: 2, padding: '10px', borderRadius: 10, background: 'var(--c-ink)', color: '#fff', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                <Check size={14} color="#fff" />Add Client
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
