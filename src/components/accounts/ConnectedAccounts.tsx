'use client'
import { useState } from 'react'
import { Spinner } from '@/components/ui/Icon'
import type { Client } from '@/types'

// ── Platform catalog ──────────────────────────────────────────────────────────
const PLATFORMS: Record<string, {
  name: string
  letter: string
  color: string
  bg: string
  getHandle: (name: string) => string
}> = {
  instagram:  { name: 'Instagram',          letter: 'I',  color: '#E1306C', bg: '#FDF2F8', getHandle: n => `@${n.toLowerCase().replace(/\s+/g, '').slice(0, 14)}` },
  facebook:   { name: 'Facebook Page',      letter: 'F',  color: '#1877F2', bg: '#EFF6FF', getHandle: n => n },
  linkedin:   { name: 'LinkedIn',           letter: 'Li', color: '#0A66C2', bg: '#E8F0FE', getHandle: n => `${n} Official` },
  youtube:    { name: 'YouTube',            letter: 'Y',  color: '#FF0000', bg: '#FEF2F2', getHandle: n => `@${n.toLowerCase().replace(/\s+/g, '').slice(0, 14)}` },
  x:          { name: 'X (Twitter)',         letter: 'X',  color: '#1A1A1A', bg: '#F8FAFC', getHandle: n => `@${n.toLowerCase().replace(/\s+/g, '').slice(0, 14)}` },
  meta_ads:   { name: 'Meta Ads',           letter: 'M',  color: '#1877F2', bg: '#EFF6FF', getHandle: n => `${n} · Ad Acct` },
  google_ads: { name: 'Google Ads',         letter: 'G',  color: '#4285F4', bg: '#EFF6FF', getHandle: n => `${n} Ads` },
  gmb:        { name: 'Google My Business', letter: 'G',  color: '#34A853', bg: '#F0FDF4', getHandle: n => n },
  ga4:        { name: 'Google Analytics',   letter: 'A',  color: '#F57C00', bg: '#FFF7ED', getHandle: n => `GA4 · ${n}` },
  gsc:        { name: 'Search Console',     letter: 'S',  color: '#4285F4', bg: '#EFF6FF', getHandle: n => `${n.toLowerCase().replace(/\s+/g, '')}.com` },
}

// ── Service → platforms ───────────────────────────────────────────────────────
const SERVICE_PLATFORMS: Record<string, string[]> = {
  social:      ['instagram', 'facebook', 'linkedin', 'youtube', 'x'],
  performance: ['meta_ads', 'google_ads'],
  seo:         ['gmb', 'ga4', 'gsc'],
}

const SERVICE_LABELS: Record<string, string> = {
  social: 'Social Media',
  performance: 'Performance Ads',
  seo: 'SEO & Analytics',
}

// ── Mock insights per platform (health-aware) ─────────────────────────────────
function getInsights(id: string, health: number): { label: string; value: string }[] {
  const g = health >= 75, m = health >= 60
  const p = (a: string, b: string, c: string) => g ? a : m ? b : c

  const map: Record<string, { label: string; value: string }[]> = {
    instagram:  [{ label: 'Followers',    value: p('18.4K','8.2K','3.1K')  }, { label: 'Reach (30d)', value: p('142K','51K','18K')    }, { label: 'Engagement', value: p('4.8%','2.9%','1.4%') }],
    facebook:   [{ label: 'Page likes',   value: p('12.1K','5.4K','2.1K')  }, { label: 'Reach (30d)', value: p('88K','34K','11K')     }, { label: 'Engagement', value: p('3.2%','1.8%','0.9%') }],
    linkedin:   [{ label: 'Followers',    value: p('6.8K','3.2K','1.1K')   }, { label: 'Impressions', value: p('42K','18K','7K')      }, { label: 'Engagement', value: p('5.1%','3.0%','1.6%') }],
    youtube:    [{ label: 'Subscribers',  value: p('9.4K','4.1K','1.8K')   }, { label: 'Views (30d)', value: p('64K','28K','9K')      }, { label: 'Watch time',  value: p('4.2K hrs','1.8K hrs','620 hrs') }],
    x:          [{ label: 'Followers',    value: p('11.2K','4.8K','1.9K')  }, { label: 'Impressions', value: p('78K','32K','11K')     }, { label: 'Engagements',value: p('3,840','1,520','540') }],
    meta_ads:   [{ label: 'Spend (mo)',   value: p('₹1.8L','₹80K','₹35K') }, { label: 'ROAS',        value: p('4.2×','2.8×','1.4×') }, { label: 'CTR',        value: p('2.4%','1.6%','0.8%') }],
    google_ads: [{ label: 'Spend (mo)',   value: p('₹1.2L','₹55K','₹22K') }, { label: 'ROAS',        value: p('5.1×','3.2×','1.9×') }, { label: 'Conversions',value: p('284','128','47')     }],
    gmb:        [{ label: 'Profile views',value: p('8,240','3,100','980')  }, { label: 'Searches',    value: p('14.2K','5.8K','2.1K') }, { label: 'Calls',      value: p('218','92','34')      }],
    ga4:        [{ label: 'Sessions',     value: p('48.2K','18.4K','6.8K') }, { label: 'Users',       value: p('32.1K','12.6K','4.2K')}, { label: 'Bounce rate',value: p('28%','41%','58%')   }],
    gsc:        [{ label: 'Impressions',  value: p('142K','58K','19K')     }, { label: 'Clicks',      value: p('8,420','3,200','980') }, { label: 'Avg position',value: p('4.2','8.7','18.4') }],
  }
  return map[id] || []
}

interface Props {
  client: Client
  onUpdate: (client: Client) => Promise<void>
}

export default function ConnectedAccounts({ client, onUpdate }: Props) {
  const [connecting, setConnecting] = useState<Record<string, boolean>>({})
  const [unlinkId, setUnlinkId] = useState<string | null>(null)

  const connections: Record<string, boolean> = client.connections || {}

  // Collect ordered service groups (deduplicated platform IDs)
  const seen = new Set<string>()
  const groups: { service: string; platformIds: string[] }[] = []
  for (const svc of client.services) {
    const ids = (SERVICE_PLATFORMS[svc] || []).filter(id => !seen.has(id))
    if (ids.length) {
      ids.forEach(id => seen.add(id))
      groups.push({ service: svc, platformIds: ids })
    }
  }

  const linkedCount = Object.values(connections).filter(Boolean).length

  async function handleConnect(id: string) {
    setConnecting(c => ({ ...c, [id]: true }))
    await new Promise(r => setTimeout(r, 2400))
    await onUpdate({ ...client, connections: { ...connections, [id]: true } })
    setConnecting(c => ({ ...c, [id]: false }))
  }

  async function handleUnlink(id: string) {
    await onUpdate({ ...client, connections: { ...connections, [id]: false } })
    setUnlinkId(null)
  }

  if (groups.length === 0) return null

  return (
    <div style={{ background: '#fff', border: '1px solid var(--c-border)', borderRadius: 18, padding: '18px 20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--c-ink)" strokeWidth="2" strokeLinecap="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15 }}>Connected accounts</span>
          {linkedCount > 0 && (
            <span style={{ fontSize: 11, fontWeight: 700, color: '#10B981', background: '#ECFDF5', borderRadius: 20, padding: '2px 9px' }}>
              {linkedCount} linked
            </span>
          )}
        </div>
        <span style={{ fontSize: 11.5, color: 'var(--c-ghost)', marginLeft: 'auto' }}>
          {client.name}'s own channels — schedule, publish & pull reports
        </span>
      </div>

      {/* Service groups */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {groups.map(({ service, platformIds }) => (
          <div key={service}>
            {/* Group label */}
            <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--c-ghost)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>
              {SERVICE_LABELS[service] || service}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {platformIds.map(id => {
                const p = PLATFORMS[id]
                if (!p) return null
                const isLinked = !!connections[id]
                const isConnecting = !!connecting[id]
                const insights = isLinked ? getInsights(id, client.health) : []
                const isConfirmingUnlink = unlinkId === id

                return (
                  <div key={id}
                    style={{ border: `1.5px solid ${isLinked ? '#BBF7D0' : 'var(--c-border-soft)'}`, borderRadius: 13, overflow: 'hidden', transition: 'border-color .2s' }}>

                    {/* Platform row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: isLinked ? '#FAFFFE' : '#fff' }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: p.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, color: p.color, flexShrink: 0, letterSpacing: '-.02em' }}>
                        {p.letter}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--c-ink)' }}>{p.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--c-faint)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.getHandle(client.name)}</div>
                      </div>

                      {/* Status / actions */}
                      {isConnecting ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 600, color: 'var(--c-muted)' }}>
                          <Spinner size={12} color="var(--c-muted)" />
                          Linking…
                        </div>
                      ) : isLinked ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                          <span style={{ fontSize: 11.5, fontWeight: 700, color: '#059669', background: '#ECFDF5', borderRadius: 7, padding: '3px 9px' }}>✓ Linked</span>
                          {isConfirmingUnlink ? (
                            <div style={{ display: 'flex', gap: 5, animation: 'fadeUp .15s ease both' }}>
                              <button onClick={() => setUnlinkId(null)}
                                style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--c-muted)', padding: '4px 9px', borderRadius: 7, border: '1px solid var(--c-border-soft)', background: '#fff' }}>
                                Cancel
                              </button>
                              <button onClick={() => handleUnlink(id)}
                                style={{ fontSize: 11.5, fontWeight: 700, color: '#EF4444', padding: '4px 9px', borderRadius: 7, border: '1px solid #FECACA', background: '#FEF2F2' }}>
                                Unlink
                              </button>
                            </div>
                          ) : (
                            <button onClick={() => setUnlinkId(id)}
                              style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--c-ghost)', padding: '4px 8px', borderRadius: 6 }}
                              onMouseEnter={e => { e.currentTarget.style.color = '#EF4444'; e.currentTarget.style.background = '#FEF2F2' }}
                              onMouseLeave={e => { e.currentTarget.style.color = 'var(--c-ghost)'; e.currentTarget.style.background = 'transparent' }}>
                              Unlink
                            </button>
                          )}
                        </div>
                      ) : (
                        <button onClick={() => handleConnect(id)}
                          style={{ fontSize: 12.5, fontWeight: 700, color: '#fff', background: '#FF5C1F', borderRadius: 9, padding: '6px 16px', transition: 'transform .15s', flexShrink: 0 }}
                          onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-1px)')}
                          onMouseLeave={e => (e.currentTarget.style.transform = '')}>
                          Connect
                        </button>
                      )}
                    </div>

                    {/* Insights panel (when linked) */}
                    {isLinked && insights.length > 0 && (
                      <div style={{ borderTop: '1.5px solid #BBF7D0', background: '#F0FDF4', padding: '10px 14px', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 4 }}>
                        {insights.map((metric, i) => (
                          <div key={metric.label} style={{ textAlign: i === 0 ? 'left' : i === 2 ? 'right' : 'center' }}>
                            <div style={{ fontSize: 15, fontWeight: 800, color: p.color, fontFamily: 'var(--font-display)', lineHeight: 1 }}>{metric.value}</div>
                            <div style={{ fontSize: 10.5, color: '#6EE7B7', marginTop: 3, fontWeight: 500 }}>{metric.label}</div>
                          </div>
                        ))}
                      </div>
                    )}
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
