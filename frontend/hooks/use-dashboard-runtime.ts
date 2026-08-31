import { useEffect, useRef, useState } from 'react'
import Chart from 'chart.js/auto'
import { MEDSHIELD_MARKUP, MEDSHIELD_STYLE } from '@/lib/medshieldReference'
import {
  getExecutableDashboardScript,
  runDashboardScript,
  ListenerRecord,
} from '@/services/api/dashboard-engine'
import { enhanceDashboardContent } from '@/services/api/dashboard-enhancements'
import { installDashboardEnhancements } from '@/services/api/dashboard-enhancement-listeners'
import { refreshDashboardFromGateway } from '@/services/api/dashboard-interactions'
import { resolveForecastCurrentMonth } from '@/services/api/dashboard-forecast-window'

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
    let monthRefreshTimer: number | null = null

    const styleEl = document.createElement('style')
    styleEl.id = 'medshield-dashboard-styles'
    styleEl.textContent = MEDSHIELD_STYLE
    document.head.appendChild(styleEl)

    // Provide immediate synchronous showPage handler before DOM markup injection
    ;(window as any).showPage = (window as any).showPage || function(name: string, el?: HTMLElement) {
      document.querySelectorAll('.page').forEach((p) => p.classList.remove('active'))
      const target = document.getElementById('page-' + name)
      if (target) target.classList.add('active')
      document.querySelectorAll('.nav-item').forEach((n) => n.classList.remove('active'))
      if (el) el.classList.add('active')
    }

    // Ensure robust Chart constructor resolution
    const ChartConstructor = (Chart as any)?.Chart || (Chart as any)?.default || Chart
    ;(window as any).Chart = (window as any).Chart || ChartConstructor

    root.innerHTML = MEDSHIELD_MARKUP
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

        void refreshDashboardFromGateway().catch((error) => {
          console.warn('Dashboard is using the bundled fallback dataset:', error)
        })

        let lastObservedForecastMonth = root.dataset.forecastCurrentMonth
          ?? resolveForecastCurrentMonth(undefined, new Date())
        monthRefreshTimer = window.setInterval(() => {
          const currentSystemMonth = resolveForecastCurrentMonth(undefined, new Date())
          const activeForecastMonth = root.dataset.forecastCurrentMonth ?? lastObservedForecastMonth
          if (currentSystemMonth === activeForecastMonth) return
          lastObservedForecastMonth = currentSystemMonth
          void refreshDashboardFromGateway().catch((error) => {
            console.warn('Rolling forecast refresh failed after a month boundary:', error)
          })
        }, 30 * 60 * 1000)

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
      if (monthRefreshTimer !== null) {
        window.clearInterval(monthRefreshTimer)
      }
      root.innerHTML = ''
      document.getElementById('medshield-dashboard-styles')?.remove()
      
      const handlers = [
        'showPage', 'toggleTheme', 'openHelp', 'closeNavigation', 'toggleNavigation',
        'setComparisonMode', 'setYear', 'setYoYYear', 'refreshComparison', 'applyDatasetPatch', 'buildCharts'
      ]
      for (const name of handlers) {
        delete (window as any)[name]
      }
      delete (window as any).__medshieldAuditInstalled
      delete root.dataset.enhancementsInstalled
      delete root.dataset.forecastCurrentMonth
      delete root.dataset.forecastWindowStart
      delete root.dataset.forecastWindowEnd
      document.body.classList.remove('nav-collapsed', 'nav-hidden', 'nav-open')
      delete document.body.dataset.navState
    }
  }, [])

  return {
    rootRef,
    portalContainer,
  }
}
