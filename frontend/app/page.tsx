'use client'

import { createPortal } from 'react-dom'
import { AuthProvider, useAuth } from '@/lib/AuthContext'
import Login from '@/components/Login'
import PasswordResetRequired from '@/components/PasswordResetRequired'
import ModelDashboard from '@/components/ModelDashboard'
import { useDashboardRuntime } from '@/hooks/use-dashboard-runtime'

function Dashboard({ onLogout }: { onLogout: () => Promise<void> }) {
  const { rootRef, portalContainer } = useDashboardRuntime(onLogout)

  return (
    <>
      <div ref={rootRef} className="medshield-root" />
      {portalContainer && createPortal(<ModelDashboard />, portalContainer)}
    </>
  )
}

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

  return <Dashboard onLogout={logout} />
}

export default function Page() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
