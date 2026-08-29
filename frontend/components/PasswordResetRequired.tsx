'use client'

import { FormEvent, useState } from 'react'
import { useAuth } from '@/lib/AuthContext'
import './login.css'

export default function PasswordResetRequired() {
  const { user, changeRequiredPassword, logout } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
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
            <input id="current-password" className="login-card-field" type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required />
          </div>
          <div className="login-input-card">
            <label className="login-card-label" htmlFor="new-password">New password</label>
            <input id="new-password" className="login-card-field" type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required />
          </div>
          <div className="login-input-card">
            <label className="login-card-label" htmlFor="confirm-password">Confirm new password</label>
            <input id="confirm-password" className="login-card-field" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
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
