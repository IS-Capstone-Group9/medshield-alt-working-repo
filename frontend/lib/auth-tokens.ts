export const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000').replace(/\/$/, '')
export const TOKEN_KEY = 'medshield.accessToken'
export const TOKEN_STORAGE_KEY = 'medshield.tokenStorage'

export interface User {
  accountId: number
  username: string
  email: string
  role: string
}

export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return match ? decodeURIComponent(match[2]) : null
}

export function setCookie(name: string, value: string, maxAgeSeconds?: number) {
  if (typeof document === 'undefined') return
  let cookieStr = `${name}=${encodeURIComponent(value)}; path=/; SameSite=Lax`
  if (maxAgeSeconds != null) {
    cookieStr += `; max-age=${maxAgeSeconds}`
  }
  if (window.location.protocol === 'https:') {
    cookieStr += '; Secure'
  }
  document.cookie = cookieStr
}

export function deleteCookie(name: string) {
  if (typeof document === 'undefined') return
  document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`
}

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || getCookie('medshield.accessToken')
}

export function storeToken(token: string, remember = false): void {
  const primaryStorage = remember ? localStorage : sessionStorage
  const secondaryStorage = remember ? sessionStorage : localStorage

  primaryStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(TOKEN_STORAGE_KEY, remember ? 'local' : 'session')
  secondaryStorage.removeItem(TOKEN_KEY)

  const maxAge = remember ? 30 * 24 * 60 * 60 : 24 * 60 * 60
  setCookie('medshield.accessToken', token, maxAge)
}

export function clearStoredToken(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(TOKEN_STORAGE_KEY)
  sessionStorage.removeItem(TOKEN_KEY)
  deleteCookie('medshield.accessToken')
}

export function toUser(data: any): User {
  return {
    accountId: Number(data.account_id),
    username: String(data.username),
    email: String(data.email),
    role: String(data.role),
  }
}

export function toUserFromSupabase(data: any): User {
  const email = String(data.email ?? '')
  return {
    accountId: 0,
    username: email ? email.split('@')[0] : String(data.id ?? 'user'),
    email,
    role: String(data.app_metadata?.medshield_role ?? data.app_metadata?.role ?? 'viewer'),
  }
}
