'use client'
import { useState } from 'react'
import { useToast } from '@/lib/store'
import { Check } from '@/components/ui/Icon'

const INTEGRATIONS = [
  {
    group: 'Social Media',
    items: [
      { id: 'instagram', name: 'Instagram', desc: 'Schedule posts and reels, view analytics', icon: '📸', connected: true, color: '#E1306C' },
      { id: 'linkedin', name: 'LinkedIn', desc: 'Publish company updates and articles', icon: '💼', connected: false, color: '#0077B5' },
      { id: 'twitter', name: 'X / Twitter', desc: 'Schedule tweets and thread drops', icon: '🐦', connected: false, color: '#000' },
      { id: 'youtube', name: 'YouTube', desc: 'Upload and schedule video content', icon: '▶️', connected: false, color: '#FF0000' },
    ]
  },
  {
    group: 'Project Management',
    items: [
      { id: 'slack', name: 'Slack', desc: 'Get task notifications and updates in channels', icon: '💬', connected: true, color: '#4A154B' },
      { id: 'notion', name: 'Notion', desc: 'Sync content briefs and brand docs', icon: '📝', connected: false, color: '#000' },
      { id: 'asana', name: 'Asana', desc: 'Sync tasks across Mavixy and Asana', icon: '📋', connected: false, color: '#F06A6A' },
    ]
  },
  {
    group: 'Analytics',
    items: [
      { id: 'ga4', name: 'Google Analytics', desc: 'Pull website traffic data into reports', icon: '📊', connected: false, color: '#E37400' },
      { id: 'meta', name: 'Meta Business Suite', desc: 'Sync ad performance and ROAS data', icon: '📈', connected: true, color: '#1877F2' },
      { id: 'gsc', name: 'Google Search Console', desc: 'Pull SEO data and keyword rankings', icon: '🔍', connected: false, color: '#4285F4' },
    ]
  },
  {
    group: 'Communication',
    items: [
      { id: 'whatsapp', name: 'WhatsApp Business', desc: 'Send reports and updates via WhatsApp', icon: '💬', connected: false, color: '#25D366' },
      { id: 'gmail', name: 'Gmail', desc: 'Send client reports and approvals via email', icon: '📧', connected: false, color: '#EA4335' },
    ]
  },
]

export default function ConnectionsScreen() {
  const toast = useToast()
  const [connections, setConnections] = useState<Record<string, boolean>>(
    Object.fromEntries(INTEGRATIONS.flatMap(g => g.items.map(i => [i.id, i.connected])))
  )

  function toggle(id: string) {
    setConnections(c => {
      const next = { ...c, [id]: !c[id] }
      toast(next[id] ? 'Connected' : 'Disconnected')
      return next
    })
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 4 }}>Connections</h1>
        <p style={{ fontSize: 14, color: 'var(--c-subtle)' }}>Connect your tools to supercharge your agency workflow</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {INTEGRATIONS.map(group => (
          <div key={group.group}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--c-ghost)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>{group.group}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 12 }}>
              {group.items.map(item => {
                const isConnected = connections[item.id]
                return (
                  <div key={item.id} style={{ background: 'var(--c-surface)', border: `1.5px solid ${isConnected ? 'var(--c-green)' : 'var(--c-border)'}`, borderRadius: 14, padding: '16px', transition: 'all .15s' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 11, background: `${item.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                        {item.icon}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 3 }}>{item.name}</div>
                        <div style={{ fontSize: 12.5, color: 'var(--c-faint)', lineHeight: 1.4 }}>{item.desc}</div>
                      </div>
                    </div>
                    <button onClick={() => toggle(item.id)}
                      style={{ width: '100%', padding: '8px', borderRadius: 9, fontSize: 13, fontWeight: 700, background: isConnected ? 'var(--c-green-bg)' : 'var(--c-ink)', color: isConnected ? 'var(--c-green)' : '#fff', border: isConnected ? '1px solid var(--c-green-border)' : 'none', transition: 'all .15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      {isConnected ? (
                        <><Check size={13} color="var(--c-green)" />Connected</>
                      ) : (
                        <>Connect</>
                      )}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
