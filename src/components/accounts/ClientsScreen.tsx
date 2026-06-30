'use client'
import { useState } from 'react'
import { useApp } from '@/lib/store'
import { Plus, Search } from '@/components/ui/Icon'
import { SERVICE_CATS } from '@/lib/seed-data'
import ClientOnboardingModal from './ClientOnboardingModal'

export default function ClientsScreen() {
  const { state, dispatch } = useApp()
  const [search, setSearch] = useState('')
  const [onboardOpen, setOnboardOpen] = useState(false)

  const filtered = state.clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  function goDetail(id: string) {
    dispatch({ type: 'SET_CLIENT_DETAIL', clientId: id } as any)
    dispatch({ type: 'SET_SCREEN', screen: 'client-detail' })
  }

  function healthColor(h: number) {
    if (h >= 80) return 'var(--c-green)'
    if (h >= 60) return 'var(--c-amber)'
    return 'var(--c-red)'
  }

  const monthKey = `${new Date().getFullYear()}-${new Date().getMonth() + 1}`

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', animation: 'fadeIn .4s ease both' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 4 }}>Accounts</h1>
          <p style={{ fontSize: 14, color: 'var(--c-subtle)' }}>{state.clients.length} active clients</p>
        </div>
        <button onClick={() => setOnboardOpen(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--c-ink)', color: '#fff', borderRadius: 12, padding: '11px 18px', fontWeight: 700, fontSize: 13.5, transition: 'transform .15s' }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = ''}>
          <Plus size={14} />Onboard Client
        </button>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 22 }}>
        <Search size={15} color="var(--c-faint)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search clients..."
          style={{ width: '100%', maxWidth: 340, background: '#fff', border: '1.5px solid var(--c-border)', borderRadius: 11, padding: '10px 12px 10px 36px', fontSize: 13.5, transition: 'border-color .15s' }}
          onFocus={e => e.target.style.borderColor = 'var(--c-ink)'}
          onBlur={e => e.target.style.borderColor = 'var(--c-border)'} />
      </div>

      {/* Client grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 16 }}>
        {filtered.map((client, idx) => {
          const thisMonth = state.planItems.filter(i => i.client_id === client.id && i.month === monthKey)
          const activeCount = thisMonth.filter(i => i.status !== 'published').length
          const publishedCount = thisMonth.filter(i => i.status === 'published').length
          const owner = state.users.find(u => u.id === client.account_owner_id)
          return (
            <div key={client.id} onClick={() => goDetail(client.id)}
              style={{ background: '#fff', border: '1.5px solid var(--c-border)', borderRadius: 18, padding: '20px', cursor: 'pointer', transition: 'all .2s', animation: `fadeUp .4s ease ${idx * 0.05}s both` }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 28px rgba(0,0,0,.1)'; e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = 'var(--c-rule)' }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = ''; e.currentTarget.style.borderColor = 'var(--c-border)' }}>

              {/* Top row */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
                <div style={{ width: 46, height: 46, borderRadius: 13, background: client.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                  {client.initials}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15.5, fontWeight: 700, marginBottom: 4 }}>{client.name}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {client.services.map(s => {
                      const cat = SERVICE_CATS.find(c => c.key === s)
                      return cat ? (
                        <span key={s} style={{ fontSize: 10.5, fontWeight: 600, color: cat.color, background: cat.bg, borderRadius: 5, padding: '2px 7px' }}>{cat.short}</span>
                      ) : null
                    })}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: healthColor(client.health), fontFamily: 'var(--font-display)', lineHeight: 1 }}>{client.health}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--c-faint)', fontWeight: 600, marginTop: 2 }}>health</div>
                </div>
              </div>

              {/* Health bar */}
              <div style={{ height: 4, background: 'var(--c-fill)', borderRadius: 99, marginBottom: 16, overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 99, background: healthColor(client.health), width: `${client.health}%`, animation: 'progressFill .8s ease both' }} />
              </div>

              {/* Stats row */}
              <div style={{ display: 'flex', gap: 18, alignItems: 'flex-end' }}>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 700, fontFamily: 'var(--font-display)' }}>{activeCount}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--c-faint)' }}>active</div>
                </div>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--c-green)' }}>{publishedCount}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--c-faint)' }}>published</div>
                </div>
                {client.industry && (
                  <div style={{ marginLeft: 'auto' }}>
                    <div style={{ fontSize: 12, color: 'var(--c-faint)', background: 'var(--c-fill)', borderRadius: 6, padding: '3px 8px' }}>{client.industry}</div>
                  </div>
                )}
              </div>

              {/* Contact / owner */}
              {(client.contact_name || owner) && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--c-border-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  {client.contact_name && (
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--c-ink-2)' }}>{client.contact_name}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--c-faint)' }}>Contact</div>
                    </div>
                  )}
                  {owner && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 22, height: 22, borderRadius: '50%', background: owner.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700 }}>{owner.initials}</div>
                      <span style={{ fontSize: 12, color: 'var(--c-faint)' }}>{owner.name.split(' ')[0]}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {onboardOpen && <ClientOnboardingModal onClose={() => setOnboardOpen(false)} />}
    </div>
  )
}
