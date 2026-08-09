import { useEffect, useRef, useState } from 'react'
import Chart from 'chart.js/auto'
import { MEDSHIELD_MARKUP } from '@/lib/medshieldReference'
import {
  getExecutableDashboardScript,
  runDashboardScript,
  ListenerRecord,
} from '@/services/api/dashboard-engine'
import { enhanceDashboardContent } from '@/services/api/dashboard-enhancements'
import { installDashboardEnhancements } from '@/services/api/dashboard-enhancement-listeners'

export function useDashboardRuntime(onLogout: () => Promise<void>) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = () => {
    if (isLoggingOut) return
    setIsLoggingOut(true)
    onLogout().finally(() => setIsLoggingOut(false))
  }

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    let disposed = false
    let activeListeners: ListenerRecord[] = []

    root.innerHTML = MEDSHIELD_MARKUP;
    (window as any).Chart = Chart;
    enhanceDashboardContent(root)

    runDashboardScript(getExecutableDashboardScript())
      .then((listeners) => {
        activeListeners = listeners
        if (disposed) {
          for (const { target, type, listener, options } of activeListeners) {
            target.removeEventListener(type, listener, options)
          }
          return
        }
        
        installDashboardEnhancements(root, activeListeners)

        // Add portal injection anchor
        const inventoryPageEl = root.querySelector('#page-inventory')
        if (inventoryPageEl) {
          const container = document.createElement('div')
          container.id = 'model-dashboard-portal-container'
          container.style.marginTop = '32px'
          container.style.marginBottom = '32px'
          inventoryPageEl.appendChild(container)
          setPortalContainer(container)
        }

        // Bind logout click
        const logoutBtn = root.querySelector('#sidebarLogoutBtn')
        if (logoutBtn) {
          logoutBtn.addEventListener('click', handleLogout)
          activeListeners.push({ target: logoutBtn, type: 'click', listener: handleLogout })
        }
      })
      .catch((error) => {
        console.error('Failed to initialize the MedShield dashboard runtime:', error)
      })

    return () => {
      disposed = true
      setPortalContainer(null)
      for (const { target, type, listener, options } of activeListeners) {
        target.removeEventListener(type, listener, options)
      }
      root.innerHTML = ''
      
      const handlers = [
        'showPage', 'toggleTheme', 'openHelp', 'closeNavigation', 'toggleNavigation',
        'setComparisonMode', 'setYear', 'setYoYYear', 'refreshComparison', 'applyDatasetPatch', 'buildCharts'
      ]
      for (const name of handlers) {
        delete (window as any)[name]
      }
      delete (window as any).__medshieldAuditInstalled
      delete root.dataset.enhancementsInstalled
      document.body.classList.remove('nav-collapsed', 'nav-hidden', 'nav-open')
      delete document.body.dataset.navState
    }
  }, [])

  return {
    rootRef,
    portalContainer,
  }
}
