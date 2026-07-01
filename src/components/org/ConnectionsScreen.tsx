'use client'
import { useState, useEffect } from 'react'
import { useToast } from '@/lib/store'
import { ModalPortal } from '@/components/ui/ModalPortal'

interface Creds {
  meta_app_id: string; meta_app_secret: string; meta_access_token: string; meta_ad_account_id: string
  wa_phone_number_id: string; wa_access_token: string; wa_business_id: string
  google_developer_token: string; google_client_id: string; google_client_secret: string; google_refresh_token: string; google_customer_id: string
  ga_property_id: string
}
const EMPTY: Creds = {
  meta_app_id:'', meta_app_secret:'', meta_access_token:'', meta_ad_account_id:'',
  wa_phone_number_id:'', wa_access_token:'', wa_business_id:'',
  google_developer_token:'', google_client_id:'', google_client_secret:'', google_refresh_token:'', google_customer_id:'',
  ga_property_id:'',
}

type IntKey = 'meta_ads'|'whatsapp'|'google_ads'|'ga4'|'slack'|'gmail'

export default function ConnectionsScreen() {
  const toast = useToast()
  const [open, setOpen] = useState<IntKey|null>(null)
  const [creds, setCreds] = useState<Creds>(EMPTY)
  const [saved, setSaved] = useState<Partial<Record<IntKey,boolean>>>({})
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    try {
      const s = localStorage.getItem('mavixy_connections')
      if (s) { const p = JSON.parse(s); setCreds(prev=>({...prev,...p.creds})); setSaved(p.saved||{}) }
    } catch {}
  }, [])

  function persist(s: Partial<Record<IntKey,boolean>>) {
    localStorage.setItem('mavixy_connections', JSON.stringify({ creds, saved: s }))
  }

  function save(key: IntKey) {
    const next = { ...saved, [key]: true }
    setSaved(next); persist(next); toast('Credentials saved'); setOpen(null)
  }

  function disconnect(key: IntKey) {
    const next = { ...saved, [key]: false }
    setSaved(next); persist(next); toast('Disconnected')
  }

  async function testMeta() {
    setTesting(true)
    try {
      const r = await fetch('/api/integrations/meta', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'test', creds }) })
      const d = await r.json()
      toast(d.ok ? `Connected — ${d.account_name}` : `Error: ${d.error}`)
    } catch { toast('Connection failed') }
    setTesting(false)
  }

  async function testWA() {
    setTesting(true)
    try {
      const r = await fetch('/api/integrations/whatsapp', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'test', creds }) })
      const d = await r.json()
      toast(d.ok ? `WhatsApp ready — ${d.phone_number}` : `Error: ${d.error}`)
    } catch { toast('Connection failed') }
    setTesting(false)
  }

  const INTGS: Array<{key:IntKey; name:string; desc:string; color:string; logo:string; group:string}> = [
    { key:'meta_ads', name:'Meta Ads', desc:'Sync campaign ROAS, spend and performance data', color:'#1877F2', logo:'M', group:'Paid Media' },
    { key:'google_ads', name:'Google Ads', desc:'Pull search and shopping campaign metrics', color:'#4285F4', logo:'G', group:'Paid Media' },
    { key:'ga4', name:'Google Analytics 4', desc:'Website traffic and conversion insights', color:'#E37400', logo:'GA', group:'Analytics' },
    { key:'whatsapp', name:'WhatsApp Business', desc:'Send content reminders and reports via WhatsApp', color:'#25D366', logo:'W', group:'Communication' },
    { key:'slack', name:'Slack', desc:'Morning briefs and task alerts in your channels', color:'#4A154B', logo:'S', group:'Communication' },
    { key:'gmail', name:'Gmail', desc:'Send client reports and approval emails', color:'#EA4335', logo:'@', group:'Communication' },
  ]

  return (
    <div style={{ maxWidth:860, margin:'0 auto', animation:'fadeIn .4s ease both' }}>
      <div style={{ marginBottom:28 }}>
        <h1 style={{ fontFamily:'var(--font-display)', fontSize:28, fontWeight:700, letterSpacing:'-0.02em', marginBottom:6 }}>Connections</h1>
        <p style={{ fontSize:14, color:'var(--c-subtle)' }}>Connect your ad platforms and tools to pull live data into Mavixy</p>
      </div>

      {/* WhatsApp promo card */}
      <div style={{ background:'linear-gradient(135deg,#E8FBF0,#D1FAE5)', border:'1px solid #6EE7B7', borderRadius:16, padding:'18px 22px', marginBottom:28, display:'flex', alignItems:'center', gap:16 }}>
        <div style={{ width:44, height:44, borderRadius:12, background:'#25D366', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:18, color:'#fff', flexShrink:0 }}>W</div>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:15, marginBottom:3 }}>Automate WhatsApp reminders</div>
          <div style={{ fontSize:13, color:'#065F46' }}>When content is due soon, Mavixy will message the assignee on WhatsApp — no manual follow-ups needed.</div>
        </div>
        <button onClick={() => setOpen('whatsapp')}
          style={{ background:'#25D366', color:'#fff', borderRadius:10, padding:'10px 18px', fontWeight:700, fontSize:13.5, flexShrink:0, transition:'transform .15s' }}
          onMouseEnter={e=>(e.currentTarget as HTMLElement).style.transform='translateY(-2px)'}
          onMouseLeave={e=>(e.currentTarget as HTMLElement).style.transform=''}>
          Set up WhatsApp
        </button>
      </div>

      {['Paid Media','Analytics','Communication'].map(group => (
        <div key={group} style={{ marginBottom:28 }}>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--c-ghost)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:12 }}>{group}</div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {INTGS.filter(i=>i.group===group).map(intg => {
              const connected = saved[intg.key]
              return (
                <div key={intg.key} style={{ background:'#fff', border:`1px solid ${connected ? '#A7F3D0' : 'var(--c-border)'}`, borderRadius:14, padding:'16px 20px', display:'flex', alignItems:'center', gap:16 }}>
                  <div style={{ width:44, height:44, borderRadius:12, background:intg.color, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:14, color:'#fff', flexShrink:0, fontFamily:'var(--font-display)' }}>{intg.logo}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:15, marginBottom:3, display:'flex', alignItems:'center', gap:8 }}>
                      {intg.name}
                      {connected && <span style={{ fontSize:10.5, fontWeight:700, color:'#059669', background:'#D1FAE5', borderRadius:6, padding:'2px 8px' }}>Connected</span>}
                    </div>
                    <div style={{ fontSize:13, color:'var(--c-subtle)' }}>{intg.desc}</div>
                  </div>
                  {connected ? (
                    <div style={{ display:'flex', gap:8 }}>
                      <button onClick={()=>setOpen(intg.key)} style={{ padding:'9px 16px', borderRadius:9, border:'1.5px solid var(--c-border)', fontWeight:600, fontSize:13, color:'var(--c-ink-3)', background:'transparent', cursor:'pointer' }}>Edit</button>
                      <button onClick={()=>disconnect(intg.key)} style={{ padding:'9px 16px', borderRadius:9, border:'1.5px solid #FCA5A5', fontWeight:600, fontSize:13, color:'#DC2626', background:'transparent', cursor:'pointer' }}>Disconnect</button>
                    </div>
                  ) : (
                    <button onClick={()=>setOpen(intg.key)}
                      style={{ padding:'10px 20px', borderRadius:10, background:'var(--c-ink)', color:'#fff', fontWeight:700, fontSize:13.5, flexShrink:0, transition:'transform .15s' }}
                      onMouseEnter={e=>(e.currentTarget as HTMLElement).style.transform='translateY(-2px)'}
                      onMouseLeave={e=>(e.currentTarget as HTMLElement).style.transform=''}>
                      Connect
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {/* ── Modals ── */}
      {open === 'meta_ads' && (
        <CModal title="Connect Meta Ads" onClose={()=>setOpen(null)}>
          <Guide steps={['Go to developers.facebook.com → My Apps → Create App → Business','Add "Marketing API" product','In App Settings → Basic: copy App ID + App Secret','In Tools → Graph API Explorer: generate token with ads_read permission','Extend to long-lived token via Access Token Debugger','In Meta Business Manager → Ad Accounts: copy your Ad Account ID (starts with act_)']} />
          <FG>
            <F label="App ID" value={creds.meta_app_id} onChange={v=>setCreds(p=>({...p,meta_app_id:v}))} ph="1234567890" />
            <F label="App Secret" value={creds.meta_app_secret} onChange={v=>setCreds(p=>({...p,meta_app_secret:v}))} ph="abc123..." pw />
            <F label="Long-lived Access Token" value={creds.meta_access_token} onChange={v=>setCreds(p=>({...p,meta_access_token:v}))} ph="EAAxxxxxxx..." pw />
            <F label="Ad Account ID" value={creds.meta_ad_account_id} onChange={v=>setCreds(p=>({...p,meta_ad_account_id:v}))} ph="act_123456789" />
          </FG>
          <MF>
            <button onClick={testMeta} disabled={testing} style={{ padding:'10px 18px', borderRadius:10, border:'1.5px solid var(--c-border)', fontWeight:600, fontSize:13.5, color:'var(--c-ink-3)', background:'transparent', cursor:'pointer' }}>{testing?'Testing…':'Test connection'}</button>
            <button onClick={()=>save('meta_ads')} style={{ padding:'10px 22px', borderRadius:10, background:'#1877F2', color:'#fff', fontWeight:700, fontSize:14 }}>Save</button>
          </MF>
        </CModal>
      )}

      {open === 'whatsapp' && (
        <CModal title="Connect WhatsApp Business" onClose={()=>setOpen(null)}>
          <Guide steps={['Go to developers.facebook.com → Create App → Business','Add "WhatsApp" product to your app','In WhatsApp → Getting Started: copy Phone Number ID and temporary token','Create a permanent System User Token in Meta Business Manager → System Users → Add Asset → WhatsApp account','Copy your WhatsApp Business Account ID from the API Setup page']} />
          <FG>
            <F label="Phone Number ID" value={creds.wa_phone_number_id} onChange={v=>setCreds(p=>({...p,wa_phone_number_id:v}))} ph="1234567890123" />
            <F label="Access Token" value={creds.wa_access_token} onChange={v=>setCreds(p=>({...p,wa_access_token:v}))} ph="EAAxxxxxxx..." pw />
            <F label="WhatsApp Business Account ID" value={creds.wa_business_id} onChange={v=>setCreds(p=>({...p,wa_business_id:v}))} ph="987654321" />
          </FG>
          <MF>
            <button onClick={testWA} disabled={testing} style={{ padding:'10px 18px', borderRadius:10, border:'1.5px solid var(--c-border)', fontWeight:600, fontSize:13.5, color:'var(--c-ink-3)', background:'transparent', cursor:'pointer' }}>{testing?'Testing…':'Test connection'}</button>
            <button onClick={()=>save('whatsapp')} style={{ padding:'10px 22px', borderRadius:10, background:'#25D366', color:'#fff', fontWeight:700, fontSize:14 }}>Save</button>
          </MF>
        </CModal>
      )}

      {open === 'google_ads' && (
        <CModal title="Connect Google Ads" onClose={()=>setOpen(null)}>
          <Guide steps={['Sign in to console.cloud.google.com → Enable Google Ads API','Go to APIs & Services → Credentials → Create OAuth 2.0 Client ID (Web application)','Apply for developer token at ads.google.com → Tools → API Center','Use OAuth Playground (developers.google.com/oauthplayground) to get a refresh token','Find Customer ID in Google Ads top-right (format: xxx-xxx-xxxx, remove dashes)']} />
          <FG>
            <F label="Developer Token" value={creds.google_developer_token} onChange={v=>setCreds(p=>({...p,google_developer_token:v}))} ph="xxxxxxxxxxxxxxx" pw />
            <F label="OAuth Client ID" value={creds.google_client_id} onChange={v=>setCreds(p=>({...p,google_client_id:v}))} ph="xxxxx.apps.googleusercontent.com" />
            <F label="OAuth Client Secret" value={creds.google_client_secret} onChange={v=>setCreds(p=>({...p,google_client_secret:v}))} ph="GOCSPX-..." pw />
            <F label="Refresh Token" value={creds.google_refresh_token} onChange={v=>setCreds(p=>({...p,google_refresh_token:v}))} ph="1//xxxxx..." pw />
            <F label="Customer ID" value={creds.google_customer_id} onChange={v=>setCreds(p=>({...p,google_customer_id:v}))} ph="1234567890" />
          </FG>
          <MF><button onClick={()=>save('google_ads')} style={{ padding:'10px 22px', borderRadius:10, background:'#4285F4', color:'#fff', fontWeight:700, fontSize:14 }}>Save</button></MF>
        </CModal>
      )}

      {open === 'ga4' && (
        <CModal title="Connect Google Analytics 4" onClose={()=>setOpen(null)}>
          <Guide steps={['Go to console.cloud.google.com → Enable Google Analytics Data API','Create a Service Account → Download JSON key file','In GA4 → Admin → Property Access Management → Add service account email as Viewer','Find Property ID in GA4 → Admin → Property Settings (just the number)']} />
          <FG>
            <F label="GA4 Property ID" value={creds.ga_property_id} onChange={v=>setCreds(p=>({...p,ga_property_id:v}))} ph="1234567890" />
          </FG>
          <MF><button onClick={()=>save('ga4')} style={{ padding:'10px 22px', borderRadius:10, background:'#E37400', color:'#fff', fontWeight:700, fontSize:14 }}>Save</button></MF>
        </CModal>
      )}

      {(open==='slack'||open==='gmail') && (
        <CModal title={open==='slack'?'Connect Slack':'Connect Gmail'} onClose={()=>setOpen(null)}>
          <div style={{ background:'var(--c-fill)', borderRadius:12, padding:24, textAlign:'center' }}>
            <div style={{ fontSize:40, marginBottom:12 }}>{open==='slack'?'🔗':'📧'}</div>
            <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:16, marginBottom:8 }}>OAuth flow coming soon</div>
            <div style={{ fontSize:13.5, color:'var(--c-subtle)', maxWidth:'34ch', margin:'0 auto', lineHeight:1.6 }}>
              {open==='slack'?'Slack OAuth is in progress. Use WhatsApp for notifications in the meantime.':'Gmail OAuth is coming in the next update. Reports can be sent manually for now.'}
            </div>
          </div>
          <MF><button onClick={()=>setOpen(null)} style={{ padding:'10px 22px', borderRadius:10, background:'var(--c-ink)', color:'#fff', fontWeight:700, fontSize:14 }}>Got it</button></MF>
        </CModal>
      )}
    </div>
  )
}

function CModal({ title, onClose, children }: { title:string; onClose:()=>void; children:React.ReactNode }) {
  return (
    <ModalPortal><div onClick={onClose} className="modal-overlay">
      <div onClick={e=>e.stopPropagation()} style={{ width:'100%', maxWidth:560, background:'#fff', borderRadius:20, overflow:'hidden', boxShadow:'var(--shadow-modal)', animation:'popIn .24s cubic-bezier(.2,.9,.3,1) both' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'20px 24px', borderBottom:'1px solid var(--c-border-soft)' }}>
          <h3 style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:700 }}>{title}</h3>
          <button onClick={onClose} style={{ width:32, height:32, borderRadius:9, background:'var(--c-fill)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--c-muted)" strokeWidth="2.2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div style={{ padding:'20px 24px', maxHeight:'72vh', overflowY:'auto' }}>{children}</div>
      </div>
    </div></ModalPortal>
  )
}

function Guide({ steps }: { steps:string[] }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ background:'#FFF7F0', border:'1px solid #FFD5B7', borderRadius:12, padding:'14px 16px', marginBottom:20 }}>
      <button onClick={()=>setOpen(!open)} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', width:'100%', background:'none', cursor:'pointer' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C2430F" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
          <span style={{ fontSize:13, fontWeight:700, color:'#C2430F' }}>How to get your credentials</span>
        </div>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#C2430F" strokeWidth="2.2" strokeLinecap="round" style={{ transform:open?'rotate(180deg)':'none', transition:'transform .2s' }}><path d="m6 9 6 6 6-6"/></svg>
      </button>
      {open && <ol style={{ marginTop:12, paddingLeft:18, display:'flex', flexDirection:'column', gap:8 }}>{steps.map((s,i)=><li key={i} style={{ fontSize:13, color:'#9A4400', lineHeight:1.5 }}>{s}</li>)}</ol>}
    </div>
  )
}

function FG({ children }: { children:React.ReactNode }) { return <div style={{ display:'flex', flexDirection:'column', gap:14 }}>{children}</div> }
function MF({ children }: { children:React.ReactNode }) { return <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-end', gap:10, marginTop:24, paddingTop:20, borderTop:'1px solid var(--c-border-soft)' }}>{children}</div> }
function F({ label, value, onChange, ph, pw }: { label:string; value:string; onChange:(v:string)=>void; ph:string; pw?:boolean }) {
  return (
    <div>
      <label style={{ display:'block', fontSize:12.5, fontWeight:600, color:'var(--c-muted)', marginBottom:6 }}>{label}</label>
      <input type={pw?'password':'text'} value={value} onChange={e=>onChange(e.target.value)} placeholder={ph}
        style={{ width:'100%', background:'var(--c-fill-soft)', border:'1.5px solid var(--c-border)', borderRadius:10, padding:'11px 13px', fontSize:14, fontFamily:'monospace', transition:'border-color .15s' }}
        onFocus={e=>(e.target as HTMLInputElement).style.borderColor='var(--c-ink)'}
        onBlur={e=>(e.target as HTMLInputElement).style.borderColor='var(--c-border)'} />
    </div>
  )
}
