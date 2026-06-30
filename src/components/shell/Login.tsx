'use client'
import { useState } from 'react'
import { Sparkle, Spinner } from '@/components/ui/Icon'
import { createClient } from '@/lib/supabase/client'

export default function Login() {
  const [tab, setTab] = useState<'signin' | 'signup'>('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [info, setInfo] = useState('')
  const sb = createClient()

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setErr(''); setInfo(''); setLoading(true)
    const { error } = await sb.auth.signInWithPassword({ email, password: pass })
    if (error) setErr(error.message)
    setLoading(false)
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    setErr(''); setInfo(''); setLoading(true)
    const { error } = await sb.auth.signUp({
      email,
      password: pass,
      options: {
        data: { name, role: 'owner', color: '#FF5C1F', title: 'Founder' },
      },
    })
    if (error) setErr(error.message)
    else setInfo('Check your email to confirm your account, then sign in.')
    setLoading(false)
  }

  return (
    <div style={{ display:'flex', height:'100vh', fontFamily:'var(--font-body)' }}>
      {/* Left brand panel */}
      <div style={{ flex:'0 0 52%', background:'linear-gradient(145deg,#1A1B17 0%,#0E0F0C 100%)', position:'relative', overflow:'hidden', display:'flex', flexDirection:'column', justifyContent:'space-between', padding:'52px 56px' }}>
        <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(255,255,255,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.03) 1px,transparent 1px)', backgroundSize:'40px 40px', animation:'gridMove 8s linear infinite' }} />
        <div style={{ position:'absolute', width:320, height:320, borderRadius:'50%', background:'radial-gradient(circle,rgba(255,92,31,.18),transparent 70%)', top:-80, left:-60 }} />
        <div style={{ position:'absolute', width:200, height:200, borderRadius:'50%', background:'radial-gradient(circle,rgba(139,92,246,.14),transparent 70%)', bottom:120, right:40 }} />

        <div style={{ position:'relative', display:'flex', alignItems:'center', gap:11 }}>
          <div style={{ width:38, height:38, borderRadius:11, background:'#FF5C1F', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Sparkle size={18} color="#fff" style={{ animation:'sparkleSpin 8s linear infinite' }} />
          </div>
          <span style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:20, color:'#fff', letterSpacing:'-0.01em' }}>Mavixy OS</span>
        </div>

        <div style={{ position:'relative' }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:7, background:'rgba(255,92,31,.15)', border:'1px solid rgba(255,92,31,.3)', borderRadius:10, padding:'6px 12px', marginBottom:24 }}>
            <Sparkle size={12} color="#FF7A45" style={{ animation:'sparkleSpin 8s linear infinite' }} />
            <span style={{ color:'#FF7A45', fontSize:11.5, fontWeight:700, letterSpacing:'.06em' }}>AI-POWERED AGENCY OS</span>
          </div>
          <h1 style={{ fontFamily:'var(--font-display)', fontSize:44, fontWeight:700, color:'#fff', lineHeight:1.08, letterSpacing:'-0.03em', marginBottom:20 }}>Your whole<br />agency,<br />in one screen.</h1>
          <p style={{ color:'#9A9E94', fontSize:16, lineHeight:1.6, maxWidth:'36ch' }}>Content planning, client management, team workload and AI briefing — all in one calm command center.</p>
        </div>

        <div style={{ position:'relative', display:'flex', flexDirection:'column', gap:10 }}>
          {['Content planner with AI copilot','Real-time team attendance','Client health & smart reports','One-click push & assign'].map((f, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:10, color:'#71756C', fontSize:13 }}>
              <div style={{ width:20, height:20, borderRadius:6, background:'rgba(255,92,31,.12)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#FF5C1F" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 6"/></svg>
              </div>
              {f}
            </div>
          ))}
        </div>
      </div>

      {/* Right form */}
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:48, background:'#FAFBF9' }}>
        <div style={{ width:'100%', maxWidth:380, animation:'fadeUp .5s ease both' }}>

          {/* Tab switcher */}
          <div style={{ display:'flex', background:'var(--c-fill)', borderRadius:12, padding:4, marginBottom:32 }}>
            {(['signin','signup'] as const).map(t => (
              <button key={t} onClick={() => { setTab(t); setErr(''); setInfo('') }}
                style={{ flex:1, padding:'10px', borderRadius:9, fontSize:14, fontWeight:700,
                  background: tab === t ? '#fff' : 'transparent',
                  color: tab === t ? 'var(--c-ink)' : 'var(--c-muted)',
                  boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,.09)' : 'none',
                  transition:'all .15s' }}>
                {t === 'signin' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </div>

          {tab === 'signin' ? (
            <>
              <h2 style={{ fontFamily:'var(--font-display)', fontSize:28, fontWeight:700, letterSpacing:'-0.02em', marginBottom:6 }}>Welcome back</h2>
              <p style={{ color:'var(--c-subtle)', fontSize:14.5, marginBottom:28 }}>Sign in to your workspace</p>
              <form onSubmit={handleSignIn}>
                <InputField label="Email" type="email" value={email} onChange={setEmail} placeholder="you@agency.com" />
                <InputField label="Password" type="password" value={pass} onChange={setPass} placeholder="••••••••" />
                {err && <ErrorBox msg={err} />}
                <SubmitBtn loading={loading} label="Sign in" />
              </form>
              <p style={{ marginTop:20, textAlign:'center', fontSize:13, color:'var(--c-faint)' }}>
                No account?{' '}
                <span onClick={() => setTab('signup')} style={{ color:'var(--c-accent-dark)', fontWeight:600, cursor:'pointer' }}>Create one</span>
              </p>
            </>
          ) : (
            <>
              <h2 style={{ fontFamily:'var(--font-display)', fontSize:28, fontWeight:700, letterSpacing:'-0.02em', marginBottom:6 }}>Create your workspace</h2>
              <p style={{ color:'var(--c-subtle)', fontSize:14.5, marginBottom:28 }}>You&apos;ll be set up as the Owner</p>
              <form onSubmit={handleSignUp}>
                <InputField label="Your name" type="text" value={name} onChange={setName} placeholder="Gaurang Patel" />
                <InputField label="Work email" type="email" value={email} onChange={setEmail} placeholder="you@agency.com" />
                <InputField label="Password" type="password" value={pass} onChange={setPass} placeholder="8+ characters" />
                {err && <ErrorBox msg={err} />}
                {info && <div style={{ color:'#0E8C63', fontSize:13, fontWeight:500, marginBottom:14, background:'#E7FAF3', borderRadius:9, padding:'9px 12px' }}>{info}</div>}
                {!info && <SubmitBtn loading={loading} label="Create workspace" />}
              </form>
              <p style={{ marginTop:20, textAlign:'center', fontSize:13, color:'var(--c-faint)' }}>
                Already have an account?{' '}
                <span onClick={() => setTab('signin')} style={{ color:'var(--c-accent-dark)', fontWeight:600, cursor:'pointer' }}>Sign in</span>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function InputField({ label, type, value, onChange, placeholder }: { label: string; type: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div style={{ marginBottom:16 }}>
      <label style={{ display:'block', fontSize:12.5, fontWeight:600, color:'var(--c-muted)', marginBottom:7 }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} required placeholder={placeholder}
        style={{ width:'100%', background:'#fff', border:'1.5px solid var(--c-border)', borderRadius:12, padding:'13px 15px', fontSize:15, transition:'border-color .15s' }}
        onFocus={e => (e.target as HTMLInputElement).style.borderColor = 'var(--c-ink)'}
        onBlur={e => (e.target as HTMLInputElement).style.borderColor = 'var(--c-border)'} />
    </div>
  )
}

function ErrorBox({ msg }: { msg: string }) {
  return <div style={{ color:'#DC2626', fontSize:13, fontWeight:500, marginBottom:14, background:'#FEE2E2', borderRadius:9, padding:'9px 12px' }}>{msg}</div>
}

function SubmitBtn({ loading, label }: { loading: boolean; label: string }) {
  return (
    <button type="submit" disabled={loading}
      style={{ width:'100%', background:'var(--c-ink)', color:'#fff', borderRadius:12, padding:'14px', fontWeight:700, fontSize:15.5, display:'flex', alignItems:'center', justifyContent:'center', gap:9, marginTop:8, transition:'transform .15s, opacity .15s', opacity: loading ? .7 : 1 }}
      onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = ''}>
      {loading ? <><Spinner size={16} color="#fff" /> Please wait…</> : <>{label} <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--c-accent)" strokeWidth="2.2" strokeLinecap="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></>}
    </button>
  )
}
