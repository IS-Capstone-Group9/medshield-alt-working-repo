'use client'

import { AuthProvider, useAuth } from '@/lib/AuthContext'
import Login from '@/components/Login'
import PasswordResetRequired from '@/components/PasswordResetRequired'
import CommercialDashboard from '@/components/commercial/CommercialDashboard'

function AppContent() {
  const { isAuthenticated, isAuthLoading, user, logout } = useAuth()

  if (isAuthLoading) {
    return (
      <main
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: '#e5e7fb',
          color: '#155a91',
          fontFamily: 'Inter, DM Sans, Open Sans, system-ui, sans-serif',
          fontWeight: 700,
        }}
      >
        Restoring Secure Session...
      </main>
    )
  }

  if (!isAuthenticated) {
    return <Login onLoginSuccess={() => undefined} />
  }

  if (user?.mustResetPassword) {
    return <PasswordResetRequired />
  }

  return <CommercialDashboard onLogout={logout} user={user} />
}

export default function Page() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
