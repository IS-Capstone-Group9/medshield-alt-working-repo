'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Login from '../../components/Login'
import { AuthProvider, useAuth } from '../../lib/AuthContext'

function LoginContent() {
  const router = useRouter()
  const { isAuthenticated, isAuthLoading } = useAuth()

  useEffect(() => {
    if (!isAuthLoading && isAuthenticated) {
      router.replace('/')
    }
  }, [isAuthenticated, isAuthLoading, router])

  return <Login onLoginSuccess={() => router.replace('/')} />
}

export default function LoginPage() {
  return (
    <AuthProvider>
      <LoginContent />
    </AuthProvider>
  )
}
