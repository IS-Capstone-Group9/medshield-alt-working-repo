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
    let cancelled = false
    let unsubscribe: (() => void) | undefined
    let controller: AbortController | undefined
    let timeoutId: ReturnType<typeof setTimeout> | undefined
    const usesSupabase = isSupabaseBrowserConfigured()

    async function restoreSession() {
      try {
        if (usesSupabase) {
          const supabase = createClient()
          const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (cancelled) return
            setAccessToken(session?.access_token ?? null)
            setUser(session?.user ? toUserFromSupabase(session.user) : null)
            setIsAuthenticated(Boolean(session?.user))
            setIsAuthLoading(false)
          })
          unsubscribe = () => subscription.unsubscribe()

          const { data: { session } } = await supabase.auth.getSession()
          if (!cancelled && session?.user) {
            setAccessToken(session.access_token)
            setUser(toUserFromSupabase(session.user))
            setIsAuthenticated(true)
          }
          return
        }

        const token = getStoredToken()
        if (!token) return
        controller = new AbortController()
        timeoutId = setTimeout(() => controller?.abort(), 4000)
        const res = await fetch(`${API_BASE}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        })
        clearTimeout(timeoutId)
        const data = await res.json()
        if (!res.ok) {
          if (!cancelled) clearStoredToken()
          return
        }
        if (!cancelled) {
          setAccessToken(token)
          setUser(toUser(data.user))
          setIsAuthenticated(true)
        }
      } catch (err) {
        if (usesSupabase) {
          console.warn('Supabase auth initialization failed:', err)
        } else if (!cancelled) {
          clearStoredToken()
        }
      } finally {
        clearTimeout(timeoutId)
        if (!cancelled) setIsAuthLoading(false)
      }
    }

    void restoreSession()
    return () => {
      cancelled = true
      unsubscribe?.()
      clearTimeout(timeoutId)
      controller?.abort()
    }
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
