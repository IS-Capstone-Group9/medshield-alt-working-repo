'use client'

import { useState } from 'react'
import { useAuth } from '../lib/AuthContext'

interface LoginProps {
  onLoginSuccess: () => void
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [tab, setTab] = useState<'login' | 'signup'>('login')

  // Login state
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  // Signup state
  const [suUsername, setSuUsername] = useState('')
  const [suEmail, setSuEmail] = useState('')
  const [suPassword, setSuPassword] = useState('')
  const [suConfirm, setSuConfirm] = useState('')
  const [showSuPassword, setShowSuPassword] = useState(false)
  const [signupError, setSignupError] = useState('')
  const [signupSuccess, setSignupSuccess] = useState('')
  const [signupLoading, setSignupLoading] = useState(false)

  const [showLangMenu, setShowLangMenu] = useState(false)
  const { login, signup } = useAuth()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')
    if (!username || !password) { setLoginError('Please enter both username and password'); return }
    setLoginLoading(true)
    const result = await login(username, password)
    setLoginLoading(false)
    if (result.ok) {
      onLoginSuccess()
    } else {
      setLoginError(result.error || 'Invalid username or password')
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setSignupError('')
    setSignupSuccess('')
    if (!suUsername || !suEmail || !suPassword || !suConfirm) { setSignupError('All fields are required'); return }
    if (suPassword !== suConfirm) { setSignupError('Passwords do not match'); return }
    if (suPassword.length < 8) { setSignupError('Password must be at least 8 characters'); return }
    setSignupLoading(true)
    const result = await signup(suUsername, suEmail, suPassword)
    setSignupLoading(false)
    if (result.ok) {
      setSignupSuccess('Account created! You can now sign in.')
      setSuUsername(''); setSuEmail(''); setSuPassword(''); setSuConfirm('')
      setTimeout(() => setTab('login'), 1800)
    } else {
      setSignupError(result.error || 'Signup failed')
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '13px 14px 13px 42px',
    background: 'rgba(255,255,255,0.1)',
    border: '2px solid rgba(255,255,255,0.2)',
    borderRadius: 10, color: '#fff', fontSize: 14,
    outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit'
  }

  const btnPrimary: React.CSSProperties = {
    width: '100%', padding: '14px',
    background: loginLoading || signupLoading
      ? 'rgba(59,130,246,0.5)'
      : 'linear-gradient(135deg, #3b82f6 0%, #22c55e 100%)',
    border: 'none', borderRadius: 10, color: '#fff',
    fontSize: 15, fontWeight: 700, cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(59,130,246,0.4)', fontFamily: 'inherit'
  }

  return (
    <div style={{
      minHeight: '100vh', position: 'relative',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '16px', fontFamily: "'Inter', 'Open Sans', system-ui, sans-serif",
    }}>
      {/* Background */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <img
          src="https://images.unsplash.com/photo-1576669801838-1b1c52121e6a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=80&w=1080"
          alt="Pharmaceutical Laboratory"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(135deg, rgba(14,63,106,0.92) 0%, rgba(14,80,120,0.88) 50%, rgba(10,60,80,0.92) 100%)'
        }} />
      </div>

      {/* Language Menu */}
      <div style={{ position: 'absolute', top: 24, right: 24, zIndex: 20 }}>
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowLangMenu(!showLangMenu)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px',
              background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.22)', borderRadius: 8,
              color: '#fff', cursor: 'pointer', fontSize: 13
            }}
          >
            🌐 <span style={{ fontWeight: 500 }}>EN</span> ▾
          </button>
          {showLangMenu && (
            <div style={{
              position: 'absolute', right: 0, marginTop: 8, width: 160,
              background: '#fff', borderRadius: 8, boxShadow: '0 10px 30px rgba(0,0,0,0.18)',
              overflow: 'hidden', border: '1px solid #e5e7eb'
            }}>
              {['English', 'Español', 'Français'].map(lang => (
                <button key={lang} onClick={() => setShowLangMenu(false)} style={{
                  width: '100%', padding: '10px 16px', textAlign: 'left',
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 13, color: '#374151', borderBottom: '1px solid #f3f4f6'
                }}>{lang}</button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Container */}
      <div style={{
        position: 'relative', zIndex: 10,
        width: '100%', maxWidth: 1100,
        display: 'flex', alignItems: 'center', gap: 60
      }}>
        {/* Left Branding */}
        <div style={{ flex: 1, color: '#fff', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
            <div style={{
              width: 64, height: 64, borderRadius: 16,
              background: 'rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, fontWeight: 900, color: '#fff',
              border: '2px solid rgba(255,255,255,0.3)'
            }}>MS</div>
            <div>
              <h1 style={{ fontSize: 32, fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>MedShield</h1>
              <p style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>Pharma Corp</p>
            </div>
          </div>
          <h2 style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.25, margin: '0 0 16px' }}>
            Integrated Distribution &<br />Inventory Intelligence System
          </h2>
          <p style={{ fontSize: 15, color: 'rgba(200,225,240,0.9)', margin: '0 0 32px', lineHeight: 1.6 }}>
            Advanced analytics and insights for pharmaceutical distribution excellence.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { icon: '🔒', title: 'Secure Authentication', sub: 'Enterprise-grade security' },
              { icon: '🛡️', title: 'Data Protection', sub: 'HIPAA & FDA compliant' },
            ].map(item => (
              <div key={item.title} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18
                }}>{item.icon}</div>
                <div>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>{item.title}</p>
                  <p style={{ margin: 0, fontSize: 12, color: 'rgba(200,225,240,0.8)' }}>{item.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Card */}
        <div style={{ width: '100%', maxWidth: 460 }}>
          <div style={{
            background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.22)', borderRadius: 20,
            padding: '36px 32px', boxShadow: '0 24px 64px rgba(0,0,0,0.25)'
          }}>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 28, background: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: 4 }}>
              {(['login', 'signup'] as const).map(t => (
                <button key={t} onClick={() => { setTab(t); setLoginError(''); setSignupError(''); setSignupSuccess('') }}
                  style={{
                    flex: 1, padding: '9px', borderRadius: 7, border: 'none', cursor: 'pointer',
                    fontFamily: 'inherit', fontSize: 14, fontWeight: 600, transition: 'all 0.2s',
                    background: tab === t ? 'rgba(255,255,255,0.18)' : 'transparent',
                    color: tab === t ? '#fff' : 'rgba(200,225,240,0.6)',
                  }}>
                  {t === 'login' ? 'Sign In' : 'Sign Up'}
                </button>
              ))}
            </div>

            {/* ── LOGIN TAB ── */}
            {tab === 'login' && (
              <>
                <p style={{ margin: '0 0 24px', fontSize: 13, color: 'rgba(200,225,240,0.85)' }}>
                  Enter your credentials to access the system
                </p>
                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  {loginError && (
                    <div style={{
                      background: 'rgba(220,38,38,0.2)', borderLeft: '4px solid #ef4444',
                      borderRadius: '0 8px 8px 0', padding: '12px 16px', color: '#fecaca', fontSize: 13
                    }}>
                      <strong style={{ display: 'block', marginBottom: 2 }}>Authentication Error</strong>
                      {loginError}
                    </div>
                  )}
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 8 }}>Username or Email</label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(200,225,240,0.7)', fontSize: 16 }}>👤</span>
                      <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                        placeholder="Enter your username or email" autoComplete="username" style={inputStyle}
                        onFocus={e => e.target.style.borderColor = 'rgba(100,180,255,0.7)'}
                        onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.2)'} />
                    </div>
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <label style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>Password</label>
                      <button type="button" style={{ background: 'none', border: 'none', color: 'rgba(200,225,240,0.85)', fontSize: 12, cursor: 'pointer' }}>Forgot Password?</button>
                    </div>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(200,225,240,0.7)', fontSize: 16 }}>🔒</span>
                      <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                        placeholder="Enter your password" autoComplete="current-password"
                        style={{ ...inputStyle, paddingRight: 46 }}
                        onFocus={e => e.target.style.borderColor = 'rgba(100,180,255,0.7)'}
                        onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.2)'} />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(200,225,240,0.7)', fontSize: 16 }}>
                        {showPassword ? '🙈' : '👁️'}
                      </button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input id="rememberMe" type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)}
                      style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#3b82f6' }} />
                    <label htmlFor="rememberMe" style={{ fontSize: 13, color: 'rgba(200,225,240,0.85)', cursor: 'pointer' }}>Remember me for 30 days</label>
                  </div>
                  <button type="submit" disabled={loginLoading} style={btnPrimary}>
                    {loginLoading ? 'Signing in…' : 'Sign In'}
                  </button>
                </form>
              </>
            )}

            {/* ── SIGNUP TAB ── */}
            {tab === 'signup' && (
              <>
                <p style={{ margin: '0 0 24px', fontSize: 13, color: 'rgba(200,225,240,0.85)' }}>
                  Create your MedShield account
                </p>
                <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {signupError && (
                    <div style={{
                      background: 'rgba(220,38,38,0.2)', borderLeft: '4px solid #ef4444',
                      borderRadius: '0 8px 8px 0', padding: '12px 16px', color: '#fecaca', fontSize: 13
                    }}>
                      <strong style={{ display: 'block', marginBottom: 2 }}>Error</strong>{signupError}
                    </div>
                  )}
                  {signupSuccess && (
                    <div style={{
                      background: 'rgba(34,197,94,0.2)', borderLeft: '4px solid #22c55e',
                      borderRadius: '0 8px 8px 0', padding: '12px 16px', color: '#bbf7d0', fontSize: 13
                    }}>
                      ✅ {signupSuccess}
                    </div>
                  )}
                  {[
                    { label: 'Username', val: suUsername, set: setSuUsername, type: 'text', icon: '👤', placeholder: 'Choose a username', ac: 'username' },
                    { label: 'Email', val: suEmail, set: setSuEmail, type: 'email', icon: '✉️', placeholder: 'your@email.com', ac: 'email' },
                  ].map(f => (
                    <div key={f.label}>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 8 }}>{f.label}</label>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(200,225,240,0.7)', fontSize: 16 }}>{f.icon}</span>
                        <input type={f.type} value={f.val} onChange={e => f.set(e.target.value)}
                          placeholder={f.placeholder} autoComplete={f.ac} style={inputStyle}
                          onFocus={e => e.target.style.borderColor = 'rgba(100,180,255,0.7)'}
                          onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.2)'} />
                      </div>
                    </div>
                  ))}
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 8 }}>Password</label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(200,225,240,0.7)', fontSize: 16 }}>🔒</span>
                      <input type={showSuPassword ? 'text' : 'password'} value={suPassword} onChange={e => setSuPassword(e.target.value)}
                        placeholder="At least 8 characters" autoComplete="new-password"
                        style={{ ...inputStyle, paddingRight: 46 }}
                        onFocus={e => e.target.style.borderColor = 'rgba(100,180,255,0.7)'}
                        onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.2)'} />
                      <button type="button" onClick={() => setShowSuPassword(!showSuPassword)}
                        style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(200,225,240,0.7)', fontSize: 16 }}>
                        {showSuPassword ? '🙈' : '👁️'}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 8 }}>Confirm Password</label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(200,225,240,0.7)', fontSize: 16 }}>🔒</span>
                      <input type="password" value={suConfirm} onChange={e => setSuConfirm(e.target.value)}
                        placeholder="Re-enter your password" autoComplete="new-password"
                        style={inputStyle}
                        onFocus={e => e.target.style.borderColor = 'rgba(100,180,255,0.7)'}
                        onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.2)'} />
                    </div>
                  </div>
                  <button type="submit" disabled={signupLoading} style={{ ...btnPrimary, marginTop: 4 }}>
                    {signupLoading ? 'Creating account…' : 'Create Account'}
                  </button>
                </form>
              </>
            )}

            {/* Footer */}
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.14)', textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 8 }}>
                {['Privacy Policy', 'Terms of Service', 'Support'].map(link => (
                  <button key={link} style={{ background: 'none', border: 'none', color: 'rgba(200,225,240,0.7)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>{link}</button>
                ))}
              </div>
              <p style={{ margin: 0, fontSize: 11, color: 'rgba(200,225,240,0.5)' }}>
                © 2025 MedShield Pharma Corp. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
