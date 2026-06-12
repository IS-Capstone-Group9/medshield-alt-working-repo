'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000').replace(/\/$/, '')
const TOKEN_KEY = 'medshield.accessToken'
const TOKEN_STORAGE_KEY = 'medshield.tokenStorage'

interface User {
  accountId: number
  username: string
  email: string
  role: string
}

interface AuthContextType {
  isAuthenticated: boolean
  isAuthLoading: boolean
  user: User | null
  accessToken: string | null
  login: (username: string, password: string, remember?: boolean) => Promise<{ ok: boolean; error?: string }>
  signup: (username: string, email: string, password: string) => Promise<{ ok: boolean; error?: string }>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function getStoredToken(): string | null {
  if (typeof window === 'undefined') {
    return null
  }

  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY)
}

function storeToken(token: string, remember = false): void {
  const primaryStorage = remember ? localStorage : sessionStorage
  const secondaryStorage = remember ? sessionStorage : localStorage

  primaryStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(TOKEN_STORAGE_KEY, remember ? 'local' : 'session')
  secondaryStorage.removeItem(TOKEN_KEY)
}

function clearStoredToken(): void {
  if (typeof window === 'undefined') {
    return
  }

  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(TOKEN_STORAGE_KEY)
  sessionStorage.removeItem(TOKEN_KEY)
}

function toUser(data: any): User {
  return {
    accountId: Number(data.account_id),
    username: String(data.username),
    email: String(data.email),
    role: String(data.role),
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isAuthLoading, setIsAuthLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)

  useEffect(() => {
    const token = getStoredToken()
    if (!token) {
      setIsAuthLoading(false)
      return
    }

    let cancelled = false

    async function restoreSession() {
      try {
        const res = await fetch(`${API_BASE}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        if (!res.ok) {
          clearStoredToken()
          return
        }

        if (!cancelled) {
          setAccessToken(token)
          setUser(toUser(data.user))
          setIsAuthenticated(true)
        }
      } catch {
        clearStoredToken()
      } finally {
        if (!cancelled) {
          setIsAuthLoading(false)
        }
      }
    }

    void restoreSession()

    return () => {
      cancelled = true
    }
  }, [])

  const login = async (username: string, password: string, remember = false) => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, remember }),
      })
      const data = await res.json()
      if (!res.ok) return { ok: false, error: data.error || 'Login failed' }
      storeToken(data.access_token, remember)
      setAccessToken(data.access_token)
      setIsAuthenticated(true)
      setUser(toUser(data.user))
      return { ok: true }
    } catch {
      return { ok: false, error: 'Cannot connect to server' }
    }
  }

  const signup = async (username: string, email: string, password: string) => {
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

  const logout = async () => {
    const token = accessToken ?? getStoredToken()
    if (token) {
      try {
        await fetch(`${API_BASE}/api/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        })
      } catch {
        // Local cleanup still happens if the gateway is unavailable.
      }
    }

    clearStoredToken()
    setAccessToken(null)
    setIsAuthenticated(false)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, isAuthLoading, user, accessToken, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
