import { getSupabaseAccessToken, isSupabaseBrowserConfigured } from '@/lib/supabase/client'
import { TOKEN_KEY } from '@/lib/auth-tokens'

export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:5000').replace(/\/$/, '')

export async function authHeaders(extra?: HeadersInit): Promise<Headers> {
  const headers = new Headers(extra)
  const token = isSupabaseBrowserConfigured()
    ? await getSupabaseAccessToken()
    : typeof window === 'undefined'
      ? null
      : localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  return headers
}

export async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    cache: 'no-store',
    headers: await authHeaders(),
  })
  if (!response.ok) throw new Error(`Request failed: ${response.status} ${response.statusText}`)
  return (await response.json()) as T
}

export async function authenticatedJson<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    cache: 'no-store',
    headers: await authHeaders(init.headers),
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(String(body?.error ?? `Request failed: ${response.status}`))
  }
  return body as T
}

export async function getPublicJson<T>(path: string): Promise<T> {
  const response = await fetch(path, { cache: 'no-store' })
  if (!response.ok) throw new Error(`Public data fetch failed: ${response.status}`)
  return (await response.json()) as T
}
