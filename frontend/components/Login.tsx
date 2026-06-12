'use client'

import { useState } from 'react'
import { useAuth } from '../lib/AuthContext'

interface LoginProps {
  onLoginSuccess: () => void
}

const wallpaperUrl =
  'https://images.unsplash.com/photo-1576669801838-1b1c52121e6a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=80&w=1400'

const UserIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21a8 8 0 0 0-16 0" />
    <circle cx="12" cy="7" r="4" />
  </svg>
)

const LockIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
)

const EyeIcon = ({ hidden }: { hidden: boolean }) => (
  <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
    {hidden ? (
      <>
        <path d="m3 3 18 18" />
        <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
        <path d="M9.9 5.2A10.7 10.7 0 0 1 12 5c5 0 9 4.5 10 7a13.2 13.2 0 0 1-2.2 3.3" />
        <path d="M6.2 6.2A13.1 13.1 0 0 0 2 12c1 2.5 5 7 10 7a10.7 10.7 0 0 0 4.1-.8" />
      </>
    ) : (
      <>
        <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    )}
  </svg>
)

const ShieldIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
    <path d="M9 12l2 2 4-5" />
  </svg>
)

export default function Login({ onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const { login } = useAuth()

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoginError('')

    if (!username || !password) {
      setLoginError('Please enter both username and password.')
      return
    }

    setLoginLoading(true)
    const result = await login(username, password, rememberMe)
    setLoginLoading(false)

    if (result.ok) {
      onLoginSuccess()
      return
    }

    setLoginError(result.error || 'Invalid username or password.')
  }

  return (
    <main className="login-shell" aria-label="MedShield sign in">
      <style dangerouslySetInnerHTML={{ __html: `
        .login-shell {
          min-height: 100vh;
          display: grid;
          grid-template-columns: minmax(440px, 56%) minmax(360px, 44%);
          background: #e6e8fb;
          color: #0e1b4d;
          font-family: Inter, "DM Sans", "Open Sans", system-ui, sans-serif;
        }

        .login-brand-panel {
          position: relative;
          display: flex;
          min-height: 100vh;
          overflow: hidden;
          color: #ffffff;
          background-image:
            linear-gradient(90deg, rgba(11, 83, 132, 0.94), rgba(17, 91, 141, 0.9)),
            url("${wallpaperUrl}");
          background-size: cover;
          background-position: center;
        }

        .login-brand-panel::after {
          content: "";
          position: absolute;
          inset: 0;
          background:
            linear-gradient(180deg, rgba(12, 70, 113, 0.18), rgba(9, 60, 99, 0.22)),
            radial-gradient(circle at 72% 30%, rgba(255, 255, 255, 0.08), transparent 34%);
          pointer-events: none;
        }

        .login-brand-inner {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 560px;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          padding: 32px 35px 45px;
        }

        .login-logo-row {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .login-logo-mark {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.18);
          border: 1px solid rgba(255, 255, 255, 0.32);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.24);
          font-size: 22px;
          font-weight: 800;
          letter-spacing: 0;
        }

        .login-logo-title {
          margin: 0;
          font-size: 26px;
          line-height: 1;
          font-weight: 800;
          letter-spacing: 0;
        }

        .login-logo-subtitle {
          margin-top: 6px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: rgba(226, 239, 250, 0.88);
        }

        .login-brand-message {
          margin-top: auto;
          margin-bottom: 90px;
          max-width: 470px;
        }

        .login-brand-message h2 {
          margin: 0 0 17px;
          font-size: clamp(30px, 4vw, 38px);
          line-height: 1.18;
          font-weight: 800;
          letter-spacing: 0;
        }

        .login-brand-message p {
          margin: 0;
          max-width: 430px;
          font-size: 17px;
          line-height: 1.55;
          color: rgba(223, 237, 248, 0.92);
        }

        .login-secure-note {
          display: flex;
          align-items: center;
          gap: 13px;
          margin-top: auto;
          color: rgba(220, 237, 250, 0.9);
          font-size: 14px;
          font-weight: 700;
        }

        .login-copyright {
          margin-top: 19px;
          font-size: 11px;
          color: rgba(205, 225, 240, 0.58);
        }

        .login-form-panel {
          display: flex;
          min-height: 100vh;
          align-items: center;
          justify-content: center;
          padding: 44px 30px;
          background: #e5e7fb;
        }

        .login-form-inner {
          width: min(100%, 346px);
        }

        .login-heading {
          margin: 0;
          font-size: 27px;
          line-height: 1.2;
          font-weight: 600;
          letter-spacing: 0;
          color: #0d1746;
        }

        .login-subheading {
          margin: 11px 0 41px;
          font-size: 16px;
          color: #3c4274;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .login-field-group {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .login-label-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .login-label {
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.08em;
          color: #162052;
        }

        .login-link-button {
          border: 0;
          padding: 0;
          background: transparent;
          color: #005ca9;
          font: inherit;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
        }

        .login-input-wrap {
          position: relative;
          color: #6b7095;
        }

        .login-input-icon {
          position: absolute;
          left: 18px;
          top: 50%;
          display: inline-flex;
          transform: translateY(-50%);
          pointer-events: none;
        }

        .login-input {
          width: 100%;
          min-height: 49px;
          padding: 0 52px 0 48px;
          border: 1px solid #b7bfdf;
          border-radius: 12px;
          background: #dfe3fa;
          color: #141b4a;
          font: inherit;
          font-size: 15px;
          outline: none;
          transition: border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
        }

        .login-input::placeholder {
          color: #687198;
        }

        .login-input:focus {
          border-color: #145c95;
          background: #e9ecff;
          box-shadow: 0 0 0 4px rgba(20, 92, 149, 0.12);
        }

        .login-password-button {
          position: absolute;
          right: 15px;
          top: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transform: translateY(-50%);
          border: 0;
          padding: 4px;
          background: transparent;
          color: #657096;
          cursor: pointer;
        }

        .login-check-row {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 1px;
          font-size: 14px;
          color: #313963;
        }

        .login-check-row input {
          width: 21px;
          height: 21px;
          margin: 0;
          accent-color: #155a91;
        }

        .login-submit {
          min-height: 60px;
          border: 0;
          border-radius: 10px;
          background: #155a91;
          color: #ffffff;
          font: inherit;
          font-size: 21px;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 13px 24px rgba(21, 90, 145, 0.22);
          transition: background 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease;
        }

        .login-submit:hover:not(:disabled) {
          background: #104e80;
          transform: translateY(-1px);
          box-shadow: 0 15px 26px rgba(21, 90, 145, 0.26);
        }

        .login-submit:disabled {
          cursor: progress;
          opacity: 0.72;
        }

        .login-error {
          border-left: 4px solid #b74040;
          border-radius: 8px;
          background: rgba(183, 64, 64, 0.1);
          color: #8f2727;
          padding: 11px 13px;
          font-size: 13px;
          line-height: 1.4;
        }

        .login-footer {
          margin-top: 63px;
          padding-top: 31px;
          border-top: 1px solid #bec5dd;
          display: flex;
          justify-content: center;
          gap: 30px;
        }

        .login-footer button {
          border: 0;
          padding: 0;
          background: transparent;
          color: #757998;
          font: inherit;
          font-size: 13px;
          cursor: pointer;
        }

        .login-link-button:focus-visible,
        .login-password-button:focus-visible,
        .login-submit:focus-visible,
        .login-footer button:focus-visible,
        .login-check-row input:focus-visible {
          outline: 2px solid #155a91;
          outline-offset: 3px;
        }

        @media (max-width: 880px) {
          .login-shell {
            grid-template-columns: 1fr;
          }

          .login-brand-panel {
            min-height: 330px;
          }

          .login-brand-inner {
            min-height: 330px;
            padding: 28px 24px;
          }

          .login-brand-message {
            margin-bottom: 28px;
          }

          .login-secure-note,
          .login-copyright {
            display: none;
          }

          .login-form-panel {
            min-height: auto;
            padding: 34px 24px 44px;
          }
        }

        @media (max-width: 520px) {
          .login-brand-panel {
            min-height: 300px;
          }

          .login-brand-inner {
            min-height: 300px;
          }

          .login-brand-message h2 {
            font-size: 29px;
          }

          .login-brand-message p,
          .login-subheading {
            font-size: 15px;
          }

          .login-form-inner {
            width: 100%;
          }

          .login-heading {
            font-size: 25px;
          }

          .login-footer {
            gap: 22px;
            margin-top: 42px;
          }
        }
      ` }} />

      <section className="login-brand-panel" aria-label="MedShield enterprise identity">
        <div className="login-brand-inner">
          <div className="login-logo-row">
            <div className="login-logo-mark">MS</div>
            <div>
              <h1 className="login-logo-title">MedShield</h1>
              <div className="login-logo-subtitle">Pharma Corp.</div>
            </div>
          </div>

          <div className="login-brand-message">
            <h2>Enterprise Supply Chain Intelligence</h2>
            <p>A centralized gateway for secure pharmaceutical distribution management and real-time inventory oversight.</p>
          </div>

          <div className="login-secure-note">
            <ShieldIcon />
            <span>Certified Secure Infrastructure</span>
          </div>
          <div className="login-copyright">(c) 2025 MedShield Pharma Corp. Authorized Personnel Only.</div>
        </div>
      </section>

      <section className="login-form-panel" aria-label="Account sign in form">
        <div className="login-form-inner">
          <h2 className="login-heading">Sign in to your account</h2>
          <p className="login-subheading">Access your enterprise dashboard</p>

          <form className="login-form" onSubmit={handleLogin}>
            {loginError && <div className="login-error">{loginError}</div>}

            <div className="login-field-group">
              <label className="login-label" htmlFor="username">
                Username or Email
              </label>
              <div className="login-input-wrap">
                <span className="login-input-icon">
                  <UserIcon />
                </span>
                <input
                  id="username"
                  className="login-input"
                  type="text"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="Enter your username"
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="login-field-group">
              <div className="login-label-row">
                <label className="login-label" htmlFor="password">
                  Password
                </label>
                <button
                  className="login-link-button"
                  type="button"
                  onClick={() =>
                    setLoginError(
                      'Password reset is administrator-managed. Contact MedShield support to verify your account.',
                    )
                  }
                >
                  Forgot password?
                </button>
              </div>
              <div className="login-input-wrap">
                <span className="login-input-icon">
                  <LockIcon />
                </span>
                <input
                  id="password"
                  className="login-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Password"
                  autoComplete="current-password"
                />
                <button
                  className="login-password-button"
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((value) => !value)}
                >
                  <EyeIcon hidden={showPassword} />
                </button>
              </div>
            </div>

            <label className="login-check-row" htmlFor="rememberMe">
              <input
                id="rememberMe"
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
              />
              <span>Remember me for 30 days</span>
            </label>

            <button className="login-submit" type="submit" disabled={loginLoading}>
              {loginLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="login-footer" aria-label="Login support links">
            {['Privacy', 'Terms', 'Support'].map((label) => (
              <button
                type="button"
                key={label}
                onClick={() => {
                  if (label === 'Support') {
                    window.location.href = 'mailto:support@medshield.local?subject=MedShield%20DSS%20Support'
                    return
                  }
                  window.alert(
                    label === 'Privacy'
                      ? 'MedShield DSS uses authenticated access and processes uploaded business data only for authorized analytics workflows.'
                      : 'Use of MedShield DSS is limited to authorized personnel and approved decision-support activities.',
                  )
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
