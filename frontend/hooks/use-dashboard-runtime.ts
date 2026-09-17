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
import { hydrateSidebarAccountCard } from '@/lib/sidebar-account-card'
import type { User } from '@/lib/auth-tokens'

export function useDashboardRuntime(onLogout: () => Promise<void>, user: User | null) {
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

    root.dataset.sourceState = 'loading'
    root.setAttribute('aria-busy', 'true')
    root.style.visibility = 'hidden'

    const showDatabricksUnavailable = () => {
      if (disposed) return
      root.dataset.sourceState = 'unavailable'
      root.removeAttribute('aria-busy')
      root.style.visibility = 'visible'
      root.innerHTML = `
        <main role="alert" style="max-width:760px;margin:10vh auto;padding:32px;border:1px solid #d9e2e8;border-radius:14px;background:#fff;color:#12384e;font-family:Arial,sans-serif">
          <h1 style="margin:0 0 12px;font-size:24px">Databricks data is unavailable</h1>
          <p style="margin:0;line-height:1.6">MedShield could not load its live Databricks Gold dataset. Dashboard charts and values are hidden because local and mock fallbacks are disabled. Check the Databricks warehouse and credentials, then reload this page.</p>
        </main>`
    }

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
    hydrateSidebarAccountCard(root, user)

    runDashboardScript(getExecutableDashboardScript())
      .then((listeners) => {
        activeListeners = listeners
        if (disposed) {
          for (const { target, type, listener, options } of activeListeners) {
            target.removeEventListener(type, listener, options)
          }
          return
        }
        
        installDashboardEnhancements(root, activeListeners, user)

        void refreshDashboardFromGateway()
          .then(() => {
            if (disposed) return
            root.dataset.sourceState = 'ready'
            root.removeAttribute('aria-busy')
            root.style.visibility = 'visible'
          })
          .catch((error) => {
            console.error('Live Databricks dashboard load failed:', error)
            showDatabricksUnavailable()
          })

        // Bind logout click
        const logoutBtn = root.querySelector('#sidebarLogoutBtn')
        if (logoutBtn) {
          logoutBtn.addEventListener('click', handleLogout)
          activeListeners.push({ target: logoutBtn, type: 'click', listener: handleLogout })
        }
      })
      .catch((error) => {
        console.error('Failed to initialize the MedShield dashboard runtime:', error)
        showDatabricksUnavailable()
      })

    return () => {
      disposed = true
      setPortalContainer(null)
      for (const { target, type, listener, options } of activeListeners) {
        target.removeEventListener(type, listener, options)
      }
      root.innerHTML = ''
      document.getElementById('medshield-dashboard-styles')?.remove()
      
      const handlers = [
        'showPage', 'toggleTheme', 'openHelp', 'closeNavigation', 'toggleNavigation',
        'setComparisonMode', 'setYear', 'setYoYYear', 'setDescriptivePeriod', 'refreshComparison', 'applyDatasetPatch', 'buildCharts',
        'setPlanningData', 'setPlanningResult', 'getPlanningRequest', 'invalidatePlan', 'changePlanningScope', 'requestPlanSolve', 'exportPlanningCSV', 'setExternalRegressionData', 'renderExternalRegression', 'changeRegressionScope', 'exportExternalRegressionCSV', 'setForecastValidationData', 'renderForecastValidation', 'changeForecastScope', 'exportForecastValidationCSV', 'setSalesSectorsData', 'renderSalesSectors', 'setSalesHeatmapData', 'changeHeatmapCategory', 'renderSalesHeatmap', 'exportSalesHeatmapCSV',
        'renderProductPrioritizationTimeline', 'configureProductYearControls'
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

  return { rootRef, portalContainer }
}
