import { createClient, isSupabaseBrowserConfigured } from '@/lib/supabase/client'
import { API_BASE, getStoredToken, storeToken, toUser, User } from '@/lib/auth-tokens'

export async function authLogin(
  username: string,
  password: string,
  remember = false
): Promise<{ ok: boolean; access_token?: string; user?: User; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, remember }),
    })
    const data = await res.json()
    if (!res.ok) return { ok: false, error: data.error || 'Login failed' }
    if (isSupabaseBrowserConfigured()) {
      if (!data.refresh_token) return { ok: false, error: 'The server did not return a refreshable Supabase session.' }
      const supabase = createClient()
      const { error } = await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      })
      if (error) return { ok: false, error: 'Could not establish the secure browser session.' }
    } else {
      storeToken(data.access_token, remember)
    }
    return { ok: true, access_token: data.access_token, user: toUser(data.user) }
  } catch {
    return { ok: false, error: 'Cannot connect to server' }
  }
}

export async function completePasswordReset(
  accessToken: string,
  currentPassword: string,
  newPassword: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/complete-password-reset`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    })
    const data = await res.json()
    if (!res.ok) return { ok: false, error: data.error || 'Password update failed' }
    if (isSupabaseBrowserConfigured()) await createClient().auth.signOut()
    return { ok: true }
  } catch {
    return { ok: false, error: 'Cannot connect to the authentication server' }
  }
}

export async function authLogout(accessToken: string | null): Promise<void> {
  if (isSupabaseBrowserConfigured()) {
    const supabase = createClient()
    await supabase.auth.signOut()
    return
  }

  const token = accessToken ?? getStoredToken()
  if (token) {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
    } catch {}
  }
}
