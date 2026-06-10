'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Chart from 'chart.js/auto'
import { MEDSHIELD_MARKUP, MEDSHIELD_SCRIPT, MEDSHIELD_STYLE } from '../lib/medshieldReference'
import { AuthProvider, useAuth } from '../lib/AuthContext'
import Login from '../components/Login'

declare global {
  interface Window {
    Chart?: unknown
  }
}

function getExecutableDashboardScript() {
  return MEDSHIELD_SCRIPT
    .replace("window.addEventListener('DOMContentLoaded', async () => {", '(async () => {')
    .replace(/\n}\);\s*$/, '\n})();')
}

function Dashboard() {
  const rootRef = useRef<HTMLDivElement>(null)
  const executableScript = useMemo(() => getExecutableDashboardScript(), [])

  useEffect(() => {
    const root = rootRef.current
    if (!root) return undefined

    let cancelled = false
    root.innerHTML = MEDSHIELD_MARKUP
    window.Chart = Chart

    if (!cancelled) {
      const runtime = document.createElement('script')
      runtime.id = 'medshield-dashboard-runtime'
      runtime.text = executableScript
      document.body.appendChild(runtime)
    }

    return () => {
      cancelled = true
      document.getElementById('medshield-dashboard-runtime')?.remove()
      root.innerHTML = ''
      document.body.classList.remove('nav-collapsed', 'nav-hidden', 'nav-open')
      delete document.body.dataset.navState
    }
  }, [executableScript])

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `${MEDSHIELD_STYLE}\n.medshield-root { display: contents; }` }} />
      <div ref={rootRef} className="medshield-root" />
    </>
  )
}

function AppContent() {
  const { isAuthenticated, login } = useAuth()
  const [loggedIn, setLoggedIn] = useState(false)

  // sync with auth context
  useEffect(() => {
    if (isAuthenticated) setLoggedIn(true)
  }, [isAuthenticated])

  if (!loggedIn) {
    return <Login onLoginSuccess={() => setLoggedIn(true)} />
  }

  return <Dashboard />
}

export default function Page() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
