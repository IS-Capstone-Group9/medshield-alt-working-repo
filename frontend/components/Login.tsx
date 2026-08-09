'use client'

import { useLoginForm } from '@/hooks/use-login-form'
import { UserIcon, LockIcon, EyeIcon, ShieldIcon } from './ui/icons'
import { LoginFeatures } from './login-features'
import './login.css'

interface LoginProps {
  onLoginSuccess: () => void
  initialMessage?: string
}

export default function Login({ onLoginSuccess, initialMessage }: LoginProps) {
  const f = useLoginForm({ onLoginSuccess })

  const handleFooterClick = (l: string) => {
    if (l === 'Support') {
      window.location.href = 'mailto:support@medshield.local?subject=MedShield%20DSS%20Support'
      return
    }
    window.alert(l === 'Privacy' ? 'MedShield DSS uses authenticated access.' : 'Use is limited to authorized personnel.')
  }

  return (
    <main className="login-shell" aria-label="MedShield sign in">
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
            <h2>Enterprise Decision Support Platform</h2>
            <p className="login-inline-desc">
              MedShield provides prescriptive analytics and machine learning scenario models to optimize your pharmaceutical supply chain in the Philippines.
            </p>
            <LoginFeatures />
          </div>

          <div className="login-secure-note">
            <ShieldIcon />
            <span>Certified Secure Enterprise Infrastructure</span>
          </div>
          <div className="login-copyright">© 2026 MedShield Pharma Corp. Authorized Personnel Only.</div>
        </div>
      </section>

      <section className="login-form-panel" aria-label="Account sign in form">
        <div className="login-form-inner">
          <h2 className="login-heading">Sign in to your account</h2>
          <p className="login-subheading">Access your enterprise dashboard</p>

          <form className="login-form" onSubmit={f.handleLogin}>
            {initialMessage && <div className="login-notice-banner">{initialMessage}</div>}
            {f.loginError && <div className="login-error">{f.loginError}</div>}

            <div className="login-field-group">
              <label className="login-label" htmlFor="username">
                {f.useSupabaseAuth ? 'Email' : 'Username or Email'}
              </label>
              <div className="login-input-wrap">
                <span className="login-input-icon"><UserIcon /></span>
                <input
                  id="username"
                  className="login-input"
                  type="text"
                  value={f.username}
                  onChange={(e) => f.setUsername(e.target.value)}
                  placeholder={f.useSupabaseAuth ? 'Enter your email' : 'Enter your username'}
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="login-field-group">
              <div className="login-label-row">
                <label className="login-label" htmlFor="password">Password</label>
                <button
                  className="login-link-button"
                  type="button"
                  onClick={() => f.setLoginError('Password reset is administrator-managed. Contact MedShield support.')}
                >
                  Forgot password?
                </button>
              </div>
              <div className="login-input-wrap">
                <span className="login-input-icon"><LockIcon /></span>
                <input
                  id="password"
                  className="login-input"
                  type={f.showPassword ? 'text' : 'password'}
                  value={f.password}
                  onChange={(e) => f.setPassword(e.target.value)}
                  placeholder="Password"
                  autoComplete="current-password"
                />
                <button
                  className="login-password-button"
                  type="button"
                  aria-label={f.showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => f.setShowPassword((v) => !v)}
                >
                  <EyeIcon hidden={f.showPassword} />
                </button>
              </div>
            </div>

            <label className="login-check-row" htmlFor="rememberMe">
              <input
                id="rememberMe"
                type="checkbox"
                checked={f.rememberMe}
                onChange={(e) => f.setRememberMe(e.target.checked)}
              />
              <span>Remember me for 30 days</span>
            </label>

            <button className="login-submit" type="submit" disabled={f.loginLoading}>
              {f.loginLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="login-footer" aria-label="Login support links">
            {['Privacy', 'Terms', 'Support'].map((label) => (
              <button type="button" key={label} onClick={() => handleFooterClick(label)}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
