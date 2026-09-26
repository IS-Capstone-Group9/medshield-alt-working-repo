import { installStlPanel } from '@/services/api/stl-panel'
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
import {
  refreshDashboardFromGateway,
  resetDashboardDeferredLoads,
} from '@/services/api/dashboard-interactions'
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

    let disposeStl = () => {}
    let disposed = false
    let activeListeners: ListenerRecord[] = []

    root.dataset.sourceState = 'loading'
    root.setAttribute('aria-busy', 'true')
    root.style.visibility = 'visible'
    resetDashboardDeferredLoads()

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

    const loadingOverlay = document.createElement('div')
    loadingOverlay.className = 'dashboard-loading-overlay'
    loadingOverlay.setAttribute('role', 'status')
    loadingOverlay.setAttribute('aria-live', 'polite')
    loadingOverlay.innerHTML = `
      <div class="dashboard-loading-card">
        <div class="databricks-icon-container">
          <div class="databricks-orbital-ring-outer" aria-hidden="true"></div>
          <div class="databricks-orbital-ring" aria-hidden="true"></div>
          <svg class="databricks-logo-svg" viewBox="0 0 24 24" role="img" aria-label="Databricks logo">
            <path d="M.95 14.184 12 20.403l9.919-5.55v2.21L12 22.662l-10.484-5.96-.565.308v.77L12 24l11.05-6.218v-4.317l-.515-.309L12 19.118l-9.867-5.653v-2.21L12 16.805l11.05-6.218V6.32l-.515-.308L12 11.974 2.647 6.681 12 1.388l7.76 4.368.668-.411v-.566L12 0 .95 6.27v.72L12 13.207l9.919-5.55v2.26L12 15.52 1.516 9.56l-.565.308z"/>
          </svg>
        </div>
        <div class="dashboard-loading-text">
          <strong class="dashboard-loading-title">Databricks Loading</strong>
          <span class="dashboard-loading-sub">Connecting to live Gold dataset<span class="databricks-dots" aria-hidden="true"><span>.</span><span>.</span><span>.</span></span></span>
          <div class="databricks-pill-badge">
            <span class="databricks-pill-dot" aria-hidden="true"></span>
            Databricks Gold Lakehouse
          </div>
        </div>
        <div class="dashboard-loading-progress" aria-hidden="true"><i></i></div>
      </div>`
    root.appendChild(loadingOverlay)

    // Yield one frame so the loading shell paints before the legacy dashboard
    // runtime parses and initializes its chart registry.
    new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()))
      .then(() => {
        if (disposed) return []
        return runDashboardScript(getExecutableDashboardScript())
      })
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
            loadingOverlay.remove()
            disposeStl = installStlPanel(root)
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
      disposeStl()
      setPortalContainer(null)
      for (const { target, type, listener, options } of activeListeners) {
        target.removeEventListener(type, listener, options)
      }
      root.innerHTML = ''
      document.getElementById('medshield-dashboard-styles')?.remove()
      
      const handlers = [
        'showPage', 'toggleTheme', 'openHelp', 'closeNavigation', 'toggleNavigation',
        'setComparisonMode', 'setYear', 'setYoYYear', 'setDescriptivePeriod', 'refreshComparison', 'applyDatasetPatch', 'buildCharts',
        'setPlanningData', 'setPlanningResult', 'getPlanningRequest', 'invalidatePlan', 'changePlanningScope', 'requestPlanSolve', 'exportPlanningCSV', 'setPrescriptivePreset', 'resetPlanningDefaults', 'setExternalRegressionData', 'renderExternalRegression', 'changeRegressionScope', 'exportExternalRegressionCSV', 'setForecastValidationData', 'renderForecastValidation', 'changeForecastScope', 'exportForecastValidationCSV', 'setSalesSectorsData', 'renderSalesSectors', 'setSalesHeatmapData', 'changeHeatmapCategory', 'renderSalesHeatmap', 'exportSalesHeatmapCSV',
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
