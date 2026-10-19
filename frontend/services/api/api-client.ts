import { getSupabaseAccessToken, isSupabaseBrowserConfigured } from '@/lib/supabase/client'
import { getStoredToken } from '@/lib/auth-tokens'

export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:5000').replace(/\/$/, '')

export class ApiRequestError extends Error {
  readonly path: string
  readonly code?: string

  constructor(path: string, readonly status: number, statusText: string, body: unknown) {
    const details = body && typeof body === 'object' ? body as Record<string, unknown> : {}
    const message = typeof details.error === 'string' ? details.error : `Request failed: ${status} ${statusText}`
    const code = typeof details.code === 'string' ? details.code : undefined
    const endpoint = path.split('?')[0]
    super(`${message} (${status}${code ? ` ${code}` : ''}; ${endpoint})`)
    this.name = 'ApiRequestError'
    this.path = endpoint
    this.code = code
  }
}

export async function authHeaders(extra?: HeadersInit): Promise<Headers> {
  const headers = new Headers(extra)
  const token = isSupabaseBrowserConfigured()
    ? await getSupabaseAccessToken()
    : getStoredToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  return headers
}

export async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    cache: 'no-store',
    headers: await authHeaders(),
  })
  if (!response.ok) throw new ApiRequestError(path, response.status, response.statusText, await response.json().catch(() => null))
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
