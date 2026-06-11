'use client'

import { useEffect, useRef } from 'react'
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

type ListenerRecord = {
  target: EventTarget
  type: string
  listener: EventListenerOrEventListenerObject
  options?: boolean | AddEventListenerOptions
}

async function runDashboardScript(script: string): Promise<ListenerRecord[]> {
  const registeredListeners: ListenerRecord[] = []
  const originalAddEventListener = EventTarget.prototype.addEventListener
  let restored = false

  const restorePrototype = () => {
    if (restored) return
    restored = true
    EventTarget.prototype.addEventListener = originalAddEventListener
  }

  EventTarget.prototype.addEventListener = function (
    this: EventTarget,
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ) {
    registeredListeners.push({ target: this, type, listener, options })
    return originalAddEventListener.call(this, type, listener, options)
  }

  try {
    const runtime = new Function(script)
    await Promise.resolve(runtime())
    return registeredListeners
  } finally {
    restorePrototype()
  }
}

function Dashboard({ onLogout }: { onLogout: () => void }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const onLogoutRef = useRef(onLogout)

  onLogoutRef.current = onLogout

  useEffect(() => {
    const root = rootRef.current
    if (!root) return undefined

    let disposed = false
    let activeListeners: ListenerRecord[] = []

    root.innerHTML = MEDSHIELD_MARKUP
    window.Chart = Chart

    const sidebarFooter = root.querySelector('.sidebar-footer')
    if (sidebarFooter) {
      const logoutButton = document.createElement('button')
      logoutButton.type = 'button'
      logoutButton.textContent = 'Log out'
      logoutButton.className = 'sidebar-logout-btn'
      logoutButton.style.width = '100%'
      logoutButton.style.marginTop = '12px'
      logoutButton.style.padding = '10px 14px'
      logoutButton.style.borderRadius = '10px'
      logoutButton.style.background = 'rgba(255,255,255,0.08)'
      logoutButton.style.border = '1px solid rgba(255,255,255,0.12)'
      logoutButton.style.color = '#D5E4EC'
      logoutButton.style.fontSize = '12px'
      logoutButton.style.fontWeight = '700'
      logoutButton.style.letterSpacing = '0.02em'
      logoutButton.style.cursor = 'pointer'
      logoutButton.style.transition = 'all 0.22s ease'
      logoutButton.addEventListener('click', () => onLogoutRef.current())
      logoutButton.addEventListener('mouseenter', () => {
        logoutButton.style.background = 'rgba(255,255,255,0.16)'
        logoutButton.style.color = '#FFFFFF'
      })
      logoutButton.addEventListener('mouseleave', () => {
        logoutButton.style.background = 'rgba(255,255,255,0.08)'
        logoutButton.style.color = '#D5E4EC'
      })
      sidebarFooter.appendChild(logoutButton)
    }

    void runDashboardScript(getExecutableDashboardScript())
      .then((listeners) => {
        activeListeners = listeners
        if (disposed) {
          for (const { target, type, listener, options } of activeListeners) {
            target.removeEventListener(type, listener, options)
          }
        }
      })
      .catch((error) => {
        console.error('Failed to initialize the MedShield dashboard runtime:', error)
      })

    return () => {
      disposed = true
      for (const { target, type, listener, options } of activeListeners) {
        target.removeEventListener(type, listener, options)
      }
      root.innerHTML = ''
      document.body.classList.remove('nav-collapsed', 'nav-hidden', 'nav-open')
      delete document.body.dataset.navState
    }
  }, [])

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `${MEDSHIELD_STYLE}\n.medshield-root { display: contents; }` }} />
      <div ref={rootRef} className="medshield-root" />
    </>
  )
}

function AppContent() {
  const { isAuthenticated, logout } = useAuth()

  if (!isAuthenticated) {
    return <Login onLoginSuccess={() => undefined} />
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
