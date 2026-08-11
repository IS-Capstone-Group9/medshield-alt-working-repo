'use client'

import { useState } from 'react'
import { useLoginForm } from '@/hooks/use-login-form'
import { UserIcon, LockIcon, EyeIcon, ShieldIcon } from './ui/icons'
import { LoginFeatures } from './login-features'
import { ShieldCheck, Activity, KeyRound, Sparkles } from 'lucide-react'
import './login.css'

interface LoginProps {
  onLoginSuccess: () => void
  initialMessage?: string
}

export default function Login({ onLoginSuccess, initialMessage }: LoginProps) {
  const f = useLoginForm({ onLoginSuccess })

  const fillCredentials = (user: string, pass: string) => {
    f.setUsername(user)
    f.setPassword(pass)
  }

  const handleFooterClick = (l: string) => {
    if (l === 'Support') {
      window.location.href = 'mailto:support@medshield.local?subject=MedShield%20DSS%20Support'
      return
    }
    window.alert(
      l === 'Privacy'
        ? 'MedShield DSS complies with enterprise data privacy standards. All telemetry and transaction logs are encrypted.'
        : 'System access is strictly restricted to authorized pharmaceutical supply planners and clinical officers.'
    )
  }

  return (
    <main className="login-shell" aria-label="MedShield sign in">
      {/* LEFT BRANDING HERO PANEL */}
      <section className="login-brand-panel" aria-label="MedShield enterprise identity">
        <div className="login-brand-inner">
          <div className="login-header-meta">
            <div className="login-geo-badge">
              <span className="geo-dot"></span>
              <span>Philippines • CALABARZON / Bicol / NCR</span>
            </div>
            <div className="login-telemetry-pill">
              <Activity size={12} className="text-amber-400" />
              <span>DOH-PAGASA Telemetry Online</span>
            </div>
          </div>

          <div className="login-logo-row">
            <div className="login-logo-mark">
              <img src="/medshield_logo.png" alt="MedShield Logo" className="login-logo-img" />
            </div>
            <div>
              <h1 className="login-logo-title">MedShield</h1>
              <div className="login-logo-subtitle">PHARMACEUTICAL DECISION-SUPPORT SYSTEM</div>
            </div>
          </div>

          <div className="login-brand-message">
            <h2>Epidemiologically-Aware Supply Chain Intelligence</h2>
            <p className="login-inline-desc">
              Bridging multi-year ERP sales data with DOH disease surveillance and PAGASA climatic indicators to eliminate drug stockouts during seasonal epidemic surges.
            </p>
            <LoginFeatures />
          </div>

          <div className="login-brand-footer">
            <div className="login-secure-note">
              <ShieldCheck size={16} className="text-amber-400" />
              <span>AES-256 Cryptographic Audit Ledger • Star Schema Data Warehouse</span>
            </div>
            <div className="login-copyright">
              © 2026 MedShield Pharma Corp. Enterprise Decision Support System.
            </div>
          </div>
        </div>
      </section>

      {/* RIGHT AUTHENTICATION PANEL */}
      <section className="login-form-panel" aria-label="Account sign in form">
        <div className="login-form-card">
          <div className="login-card-header">
            <div className="login-badge-secure">
              <KeyRound size={13} />
              <span>Secure Gateway Login</span>
            </div>
            <h2 className="login-heading">Sign In to Dashboard</h2>
            <p className="login-subheading">Enter your enterprise credentials to continue</p>
          </div>

          {/* Quick Demo Fill Buttons for Defense Testing */}
          <div className="login-quick-demo">
            <div className="quick-demo-label">Quick Demo Access (1-Click Fill):</div>
            <div className="quick-demo-grid">
              <button
                type="button"
                className="quick-demo-btn planner"
                onClick={() => fillCredentials('admin', 'medshield2025')}
              >
                <Sparkles size={13} className="text-amber-400" />
                <span>Supply Planner (L2)</span>
              </button>
              <button
                type="button"
                className="quick-demo-btn viewer"
                onClick={() => fillCredentials('viewer', 'medshield2025')}
              >
                <UserIcon />
                <span>Executive Viewer (L1)</span>
              </button>
            </div>
          </div>

          <form className="login-form" onSubmit={f.handleLogin}>
            {initialMessage && <div className="login-notice-banner">{initialMessage}</div>}
            {f.loginError && <div className="login-error">{f.loginError}</div>}

            <div className="login-field-group">
              <label className="login-label" htmlFor="username">
                {f.useSupabaseAuth ? 'Enterprise Email' : 'Username or Email'}
              </label>
              <div className="login-input-wrap">
                <span className="login-input-icon">
                  <UserIcon />
                </span>
                <input
                  id="username"
                  className="login-input"
                  type="text"
                  value={f.username}
                  onChange={(e) => f.setUsername(e.target.value)}
                  placeholder={f.useSupabaseAuth ? 'planner@medshield.ph' : 'admin or viewer'}
                  autoComplete="username"
                  required
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
                    f.setLoginError(
                      'Default credentials: Username "admin" / Password "medshield2025".'
                    )
                  }
                >
                  Need Help?
                </button>
              </div>
              <div className="login-input-wrap">
                <span className="login-input-icon">
                  <LockIcon />
                </span>
                <input
                  id="password"
                  className="login-input"
                  type={f.showPassword ? 'text' : 'password'}
                  value={f.password}
                  onChange={(e) => f.setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
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

            <div className="login-remember-row">
              <label className="login-check-row" htmlFor="rememberMe">
                <input
                  id="rememberMe"
                  type="checkbox"
                  checked={f.rememberMe}
                  onChange={(e) => f.setRememberMe(e.target.checked)}
                />
                <span>Remember session for 30 days</span>
              </label>
            </div>

            <button className="login-submit" type="submit" disabled={f.loginLoading}>
              {f.loginLoading ? (
                <span className="login-spinner-wrap">
                  <span className="login-spinner"></span>
                  <span>Authenticating Session...</span>
                </span>
              ) : (
                <span>Access Decision-Support Platform →</span>
              )}
            </button>
          </form>

          <div className="login-footer" aria-label="Login support links">
            {['Privacy Policy', 'Terms of Use', 'Support'].map((label) => (
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
