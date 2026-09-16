'use client'

import { FormEvent, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/lib/AuthContext'
import './login.css'

export default function PasswordResetRequired() {
  const { user, changeRequiredPassword, logout } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.')
      return
    }
    setLoading(true)
    const result = await changeRequiredPassword(currentPassword, newPassword)
    setLoading(false)
    if (!result.ok) setError(result.error ?? 'Password update failed.')
  }

  return (
    <main className="password-reset-shell">
      <section className="password-reset-card" aria-labelledby="password-reset-title">
        <div className="password-reset-kicker">MedShield secure migration</div>
        <h1 id="password-reset-title">Set a new password</h1>
        <p>
          Welcome, <strong>{user?.username}</strong>. Your account is now linked to Supabase Auth.
          Change the imported password before opening the dashboard.
        </p>
        <form className="login-form" onSubmit={submit}>
          {error && <div className="login-error-banner">{error}</div>}
          <div className="login-input-card">
            <label className="login-card-label" htmlFor="current-password">Current password</label>
            <div className="login-password-row">
              <input
                id="current-password"
                className="login-card-field"
                type={showCurrentPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                required
              />
              <button
                type="button"
                className="login-password-toggle"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                aria-label={showCurrentPassword ? 'Hide current password' : 'Show current password'}
                title={showCurrentPassword ? 'Hide current password' : 'Show current password'}
              >
                {showCurrentPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
              </button>
            </div>
          </div>
          <div className="login-input-card">
            <label className="login-card-label" htmlFor="new-password">New password</label>
            <div className="login-password-row">
              <input
                id="new-password"
                className="login-card-field"
                type={showNewPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                required
              />
              <button
                type="button"
                className="login-password-toggle"
                onClick={() => setShowNewPassword(!showNewPassword)}
                aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                title={showNewPassword ? 'Hide new password' : 'Show new password'}
              >
                {showNewPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
              </button>
            </div>
          </div>
          <div className="login-input-card">
            <label className="login-card-label" htmlFor="confirm-password">Confirm new password</label>
            <div className="login-password-row">
              <input
                id="confirm-password"
                className="login-card-field"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
              />
              <button
                type="button"
                className="login-password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                title={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
              >
                {showConfirmPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
              </button>
            </div>
          </div>
          <p className="password-reset-requirements">Use at least 12 characters with uppercase, lowercase, a number, and a special character.</p>
          <div className="login-buttons-row">
            <button className="login-btn-primary" type="submit" disabled={loading}>{loading ? 'Updating...' : 'Update password'}</button>
            <button className="login-btn-secondary" type="button" onClick={() => void logout()}>Sign out</button>
          </div>
        </form>
      </section>
    </main>
  )
}
