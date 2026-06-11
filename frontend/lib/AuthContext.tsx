'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://[::1]:5000').replace(/\/$/, '')

interface User {
  accountId: number
  username: string
  email: string
  role: string
}

interface AuthContextType {
  isAuthenticated: boolean
  user: User | null
  login: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>
  signup: (username: string, email: string, password: string) => Promise<{ ok: boolean; error?: string }>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<User | null>(null)

  const login = async (username: string, password: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (!res.ok) return { ok: false, error: data.error || 'Login failed' }
      setIsAuthenticated(true)
      setUser({
        accountId: data.account_id,
        username: data.username,
        email: data.email,
        role: data.role,
      })
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

  const logout = () => {
    setIsAuthenticated(false)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
