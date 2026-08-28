'use client'

import { useLoginForm } from '@/hooks/use-login-form'
import './login.css'

interface LoginProps {
  onLoginSuccess: () => void
  initialMessage?: string
}

export default function Login({ onLoginSuccess, initialMessage }: LoginProps) {
  const f = useLoginForm({ onLoginSuccess })

  const handleForgotPassword = () => {
    f.setLoginError('Password reset is administrator-managed. Contact MedShield support at support@medshield.ph.')
  }

  return (
    <main className="login-shell" aria-label="MedShield Enterprise Sign In">
      {/* Left Branding & Headline Panel */}
      <section className="login-brand-panel" aria-label="MedShield Identity">
        <div className="login-brand-inner">
          {/* Top Logo Row */}
          <div className="login-logo-row">
            <div className="login-logo-emblem-wrap">
              <img src="/ms_logo.png" className="login-logo-img" alt="MedShield Crest" />
            </div>

            <div className="login-logo-text-wrap">
              <h1 className="login-title-main">MedShield</h1>
              <div className="login-title-sub">PHARMA CORP</div>
            </div>
          </div>

          {/* Center Main Headline */}
          <div className="login-headline-wrap">
            <h2 className="login-headline">
              ENTERPRISE<br />
              DECISION<br />
              SUPPORT SYSTEM
            </h2>
          </div>

          {/* Bottom Left Copyright */}
          <div className="login-copyright">
            © 2026 MedShield Pharma Corp. Authorized Personnel Only.
          </div>
        </div>
      </section>

      {/* Right Login Form Panel */}
      <section className="login-form-panel" aria-label="Account Sign In">
        <div className="login-form-container">
          <div className="login-header-group">
            <h2 className="login-welcome-title">Welcome Back!</h2>
            <p className="login-welcome-sub">Please Log in to your account.</p>
          </div>

          <form className="login-form" onSubmit={f.handleLogin} noValidate>
            {initialMessage && <div className="login-notice-banner">{initialMessage}</div>}
            {f.loginError && <div className="login-error-banner">{f.loginError}</div>}

            {/* Email Address / Username Input with Floating Label */}
            <div className="login-input-card">
              <label htmlFor="username" className="login-card-label">
                {f.useSupabaseAuth ? 'Email Address' : 'Username or Email'}
              </label>
              <input
                id="username"
                type="text"
                className="login-card-field"
                value={f.username}
                onChange={(e) => f.setUsername(e.target.value)}
                placeholder={f.useSupabaseAuth ? 'name@company.com' : 'Enter username'}
                autoComplete="username"
                required
              />
            </div>

            {/* Password Input with Floating Label */}
            <div className="login-input-card">
              <label htmlFor="password" className="login-card-label">Password</label>
              <input
                id="password"
                type={f.showPassword ? 'text' : 'password'}
                className="login-card-field"
                value={f.password}
                onChange={(e) => f.setPassword(e.target.value)}
                placeholder="••••••••••••"
                autoComplete="current-password"
                required
              />
            </div>

            {/* Options Row: Remember me & Forgot Password */}
            <div className="login-options-row">
              <label className="login-remember-label" htmlFor="rememberMe">
                <input
                  id="rememberMe"
                  type="checkbox"
                  className="login-radio-checkbox"
                  checked={f.rememberMe}
                  onChange={(e) => f.setRememberMe(e.target.checked)}
                />
                <span>Remember me</span>
              </label>

              <button
                type="button"
                className="login-forgot-link-red"
                onClick={handleForgotPassword}
              >
                Forgot password?
              </button>
            </div>

            {/* Side-by-side Action Buttons */}
            <div className="login-buttons-row">
              <button className="login-btn-primary" type="submit" disabled={f.loginLoading}>
                {f.loginLoading ? 'Logging in...' : 'Login'}
              </button>

              <button
                className="login-btn-secondary"
                type="button"
                onClick={() => f.setLoginError('Account creation is managed by MedShield system administrators.')}
              >
                Create account
              </button>
            </div>
          </form>

          {/* Bottom Data Policy Disclaimer */}
          <div className="login-policy-disclaimer">
            By sign up you agree to our term and that you have read our data policy.
          </div>
        </div>
      </section>
    </main>
  )
}
