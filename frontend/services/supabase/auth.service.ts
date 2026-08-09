import { createClient, isSupabaseBrowserConfigured } from '@/lib/supabase/client'
import { API_BASE, getStoredToken, storeToken, toUser, toUserFromSupabase, User } from '@/lib/auth-tokens'

export async function authLogin(
  username: string,
  password: string,
  remember = false
): Promise<{ ok: boolean; access_token?: string; user?: User; error?: string }> {
  if (isSupabaseBrowserConfigured()) {
    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signInWithPassword({ email: username, password })
      if (error || !data.session?.user) return { ok: false, error: error?.message || 'Login failed' }
      return {
        ok: true,
        access_token: data.session.access_token,
        user: toUserFromSupabase(data.session.user),
      }
    } catch {
      return { ok: false, error: 'Cannot connect to Supabase Auth' }
    }
  }

  try {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, remember }),
    })
    const data = await res.json()
    if (!res.ok) return { ok: false, error: data.error || 'Login failed' }
    storeToken(data.access_token, remember)
    return { ok: true, access_token: data.access_token, user: toUser(data.user) }
  } catch {
    return { ok: false, error: 'Cannot connect to server' }
  }
}

export async function authSignup(
  username: string,
  email: string,
  password: string
): Promise<{ ok: boolean; error?: string }> {
  if (isSupabaseBrowserConfigured()) {
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signUp({ email, password, options: { data: { username } } })
      if (error) return { ok: false, error: error.message }
      return { ok: true }
    } catch {
      return { ok: false, error: 'Cannot connect to Supabase Auth' }
    }
  }

  try {
    const res = await fetch(`${API_BASE}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password }),
    })
    const data = await res.json()
    if (!res.ok) return { ok: false, error: data.error || 'Signup failed' }
    return { ok: true }
  } catch {
    return { ok: false, error: 'Cannot connect to server' }
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
