'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { createClient, isSupabaseBrowserConfigured } from './supabase/client'
import {
  API_BASE,
  User,
  getStoredToken,
  clearStoredToken,
  toUser,
  toUserFromSupabase,
} from './auth-tokens'
import { authLogin, authLogout, completePasswordReset } from '@/services/supabase/auth.service'

interface AuthContextType {
  isAuthenticated: boolean
  isAuthLoading: boolean
  user: User | null
  accessToken: string | null
  login: (username: string, password: string, remember?: boolean) => Promise<{ ok: boolean; error?: string }>
  changeRequiredPassword: (currentPassword: string, newPassword: string) => Promise<{ ok: boolean; error?: string }>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isAuthLoading, setIsAuthLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)

  useEffect(() => {
    if (isSupabaseBrowserConfigured() && !getStoredToken()) {
      try {
        const supabase = createClient()
        let cancelled = false

        const restoreSupabaseSession = async () => {
          try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!cancelled && session?.user) {
              setAccessToken(session.access_token)
              setUser(toUserFromSupabase(session.user))
              setIsAuthenticated(true)
            }
          } finally {
            if (!cancelled) setIsAuthLoading(false)
          }
        }

        void restoreSupabaseSession()

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
          if (cancelled) return
          setAccessToken(session?.access_token ?? null)
          setUser(session?.user ? toUserFromSupabase(session.user) : null)
          setIsAuthenticated(Boolean(session?.user))
          setIsAuthLoading(false)
        })

        return () => {
          cancelled = true
          subscription.unsubscribe()
        }
      } catch (err) {
        console.warn('Supabase auth initialization bypassed:', err)
        setIsAuthLoading(false)
      }
      return
    }

    const token = getStoredToken()
    if (!token) {
      setIsAuthLoading(false)
      return
    }

    let cancelled = false
    async function restoreSession() {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 4000)
      try {
        const res = await fetch(`${API_BASE}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        })
        clearTimeout(timeoutId)
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
        clearTimeout(timeoutId)
        clearStoredToken()
      } finally {
        if (!cancelled) setIsAuthLoading(false)
      }
    }

    void restoreSession()
    return () => { cancelled = true }
  }, [])

  const login = async (username: string, password: string, remember = false) => {
    const res = await authLogin(username, password, remember)
    if (res.ok) {
      setAccessToken(res.access_token ?? null)
      setIsAuthenticated(true)
      setUser(res.user ?? null)
      return { ok: true }
    }
    return { ok: false, error: res.error }
  }

  const changeRequiredPassword = async (currentPassword: string, newPassword: string) => {
    if (!accessToken) return { ok: false, error: 'Your session has expired. Sign in again.' }
    const result = await completePasswordReset(accessToken, currentPassword, newPassword)
    if (result.ok) {
      clearStoredToken()
      setAccessToken(null)
      setIsAuthenticated(false)
      setUser(null)
    }
    return result
  }

  const logout = async () => {
    await authLogout(accessToken)
    clearStoredToken()
    setAccessToken(null)
    setIsAuthenticated(false)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, isAuthLoading, user, accessToken, login, changeRequiredPassword, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
