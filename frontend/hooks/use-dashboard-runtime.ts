import { installRegionalForecastResearch } from '@/services/api/regional-forecast-research'
import { installStlPanel } from '@/services/api/stl-panel'
import { installSo1Panel } from '@/services/api/so1-panel'
import { installHistoricalComparisonPanel } from '@/services/api/historical-comparison-panel'
import { installCurrentResearchPanel } from '@/services/api/current-research-panel'
import { installTournamentResearch } from '@/services/api/tournament-research'
import { installAbcResearch } from '@/services/api/abc-research-panel'
import { installUnitResearchPanel } from '@/services/api/unit-research-panel'
import { installDashboardPageLayout } from '@/services/api/page-layout'
import { installRegionalSalesPanel } from '@/services/api/regional-sales-panel'
import { installDeliveryAreaPanel } from '@/services/api/delivery-area-panel'
import { installRegionalDecisionBoard } from '@/services/api/regional-decision-board'
import { installAreaPriorityPanel } from '@/services/api/area-priority-panel'
import { installSalesStreamsPanel } from '@/services/api/sales-streams-panel'
import { installFamilyAbcPanel } from '@/services/api/family-abc-panel'
import { installDiagnosticBreakdownsPanels } from '@/services/api/diagnostic-breakdowns-panel'
import { installDescriptiveProfilePanels } from '@/services/api/descriptive-profile-panel'
import { installPrescriptivePolicyPanel } from '@/services/api/prescriptive-policy-panel'
import { installSurgePreparednessPanel } from '@/services/api/surge-preparedness-panel'
import { installReadinessPanel } from '@/services/api/readiness-panel'
import { installModelRegisterPanel } from '@/services/api/model-register-panel'
import { installAcceptanceSurveyPanel } from '@/services/api/acceptance-survey-panel'
import { installManagementSummaryPanel } from '@/services/api/management-summary-panel'
import { installPlanningDrafts } from '@/services/api/planning-drafts'
import { installPlanningWorkspace } from '@/services/api/planning-workspace'
import { installForecastWorkspace } from '@/services/api/forecast-workspace'
import { installSalesIntake } from '@/services/api/sales-intake-panel'
import { installOperatingInputReview } from '@/services/api/operating-input-review'
import { installDiagnosticPanel } from '@/services/api/diagnostic-panel'
import { installSalesOutputSections } from '@/services/api/sales-output-sections'
import { useEffect, useEffectEvent, useRef, useState } from 'react'
import Chart from 'chart.js/auto'
import { MEDSHIELD_MARKUP, MEDSHIELD_STYLE } from '@/lib/medshieldReference'
import {
  DASHBOARD_GLOBAL_HANDLERS,
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
import { ApiRequestError, authenticatedJson } from '@/services/api/api-client'
import { installOverviewSectorComparison } from '@/services/api/overview-sector-comparison'
import { installAnalyticsOutputHub } from '@/services/api/analytics-output-hub'

export function useDashboardRuntime(onLogout: () => Promise<void>, user: User | null) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null)
  const logoutInFlight = useRef(false)
  const logout = useEffectEvent(() => onLogout())
  const installRuntimeEnhancements = useEffectEvent((root: HTMLElement, activeListeners: ListenerRecord[]) => {
    installDashboardEnhancements(root, activeListeners, user)
  })
  const installIntake = useEffectEvent((root: HTMLElement) => installSalesIntake(root, user?.role ?? ''))

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const handleLogout = () => {
      if (logoutInFlight.current) return
      logoutInFlight.current = true
      void logout().finally(() => { logoutInFlight.current = false })
    }

    let disposeStl = () => {}
    let disposeSo1 = () => {}
    let disposeHistorical = () => {}
    let disposeCurrentResearch = () => {}
    let disposeRollingResearch = () => {}
    let disposeTournamentResearch = () => {}
    let disposeRegionalForecastResearch = () => {}
    let disposeAbcResearch = () => {}
    let disposeUnitResearch = () => {}
    let disposeRegionalSales = () => {}
    let disposeDecisionBoard = () => {}
    let disposeAreaPriority = () => {}
    let disposeSalesStreams = () => {}
    let disposeFamilyAbc = () => {}
    let disposeBreakdowns = () => {}
    let disposeDescriptiveProfile = () => {}
    let disposeStockPolicy = () => {}
    let disposeSurgePrep = () => {}
    let disposeCapstonePanels = () => {}
    let disposePlanningDrafts = () => {}
    let disposeSalesIntake = () => {}
    let disposeOperatingInputs = () => {}
    let disposeDiagnostics = () => {}
    let disposeOverviewComparison = () => {}
    let disposeAnalyticsOutputs = () => {}
    let disposePageLayout: () => void = () => {}
    let disposePlanningWorkspace = () => {}
    let disposeForecastWorkspace = () => {}
    let disposed = false
    let activeListeners: ListenerRecord[] = []
    const ChartConstructor = (Chart as any)?.Chart || (Chart as any)?.default || Chart
    const destroyRootCharts = () => {
      root.querySelectorAll<HTMLCanvasElement>('canvas').forEach((canvas) => {
        ChartConstructor.getChart(canvas)?.destroy()
      })
    }

    root.dataset.sourceState = 'loading'
    root.setAttribute('aria-busy', 'true')
    root.style.visibility = 'visible'
    resetDashboardDeferredLoads()

    const showDatabricksUnavailable = (error?: unknown) => {
      if (disposed || root.dataset.sourceState === 'unavailable') return
      const authenticationUnavailable = error instanceof ApiRequestError && error.code === 'AUTHENTICATION_UNAVAILABLE'
      root.dataset.sourceState = 'unavailable'
      root.removeAttribute('aria-busy')
      root.style.visibility = 'visible'
      destroyRootCharts()
      root.innerHTML = `
        <main role="alert" style="max-width:760px;margin:10vh auto;padding:32px;border:1px solid #d9e2e8;border-radius:14px;background:#fff;color:#12384e;font-family:Arial,sans-serif">
          <h1 style="margin:0 0 12px;font-size:24px">${authenticationUnavailable ? 'Authentication service is unavailable' : 'Databricks data is unavailable'}</h1>
          <p style="margin:0;line-height:1.6">${authenticationUnavailable ? 'Your session could not be verified. Charts and values are unavailable.' : 'Source data could not be loaded. Charts and values are unavailable.'} Reload this page to retry, or contact the administrator if the problem continues.</p>
          <button type="button" style="margin-top:20px;padding:10px 18px;cursor:pointer">Retry loading dashboard</button>
        </main>`
      root.querySelector('button')?.addEventListener('click', () => window.location.reload(), { once: true })
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
    ;(window as any).Chart = (window as any).Chart || ChartConstructor
    // Next renames its local font, so read the resolved family instead of naming it here.
    const chartFont = document.body && typeof window.getComputedStyle === 'function' ? window.getComputedStyle(document.body).fontFamily : ''
    if (chartFont && ChartConstructor.defaults?.font) ChartConstructor.defaults.font.family = chartFont
    Chart.defaults.color = '#3f6377'
    Chart.defaults.font.size = 12
    Chart.defaults.set('scale.ticks', { padding: 8, font: { size: 12 } })
    Chart.defaults.set('scale.grid', { color: '#e3ecf2' })
    Chart.defaults.set('plugins.legend', { position: 'top', align: 'end' })

    root.innerHTML = MEDSHIELD_MARKUP
    enhanceDashboardContent(root)

    const loadingOverlay = document.createElement('div')
    loadingOverlay.className = 'dashboard-loading-overlay'
    loadingOverlay.setAttribute('role', 'status')
    loadingOverlay.setAttribute('aria-live', 'polite')
    loadingOverlay.innerHTML = `
      <div class="dashboard-loading-card">
        <strong class="dashboard-loading-title">Loading MedShield</strong>
        <div class="dashboard-loading-figures" aria-hidden="true">
          <div class="dashboard-loading-kpis">${'<span class="skeleton"></span>'.repeat(4)}</div>
          <div class="skeleton dashboard-loading-chart"></div>
        </div>
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
        
        installRuntimeEnhancements(root, activeListeners)
        disposeDiagnostics = installDiagnosticPanel(root)
        disposeOverviewComparison = installOverviewSectorComparison(root)
        installSalesOutputSections(root)
        disposeSo1 = installSo1Panel(root)
        const disposeRegions = installRegionalSalesPanel(root)
        const regionalSummary = document.createElement('details')
        const regionalSummaryLabel = document.createElement('summary')
        regionalSummaryLabel.textContent = 'Optional regional summary and historical regional experiments'
        regionalSummary.append(regionalSummaryLabel)
        const regionalPanel = root.querySelector('.regional-review')
        if (regionalPanel) { regionalPanel.before(regionalSummary); regionalSummary.append(regionalPanel) }
        const disposeAreas = installDeliveryAreaPanel(root)
        disposeRegionalSales = () => { disposeAreas(); disposeRegions(); regionalSummary.remove() }
        disposeDecisionBoard = installRegionalDecisionBoard(root)
        disposeAreaPriority = installAreaPriorityPanel(root)
        disposeSalesStreams = installSalesStreamsPanel(root)
        disposeFamilyAbc = installFamilyAbcPanel(root)
        disposeBreakdowns = installDiagnosticBreakdownsPanels(root)
        disposeDescriptiveProfile = installDescriptiveProfilePanels(root)
        disposeStockPolicy = installPrescriptivePolicyPanel(root)
        disposeSurgePrep = installSurgePreparednessPanel(root)
        {
          const disposers = [installReadinessPanel(root), installModelRegisterPanel(root), installAcceptanceSurveyPanel(root), installManagementSummaryPanel(root)]
          disposeCapstonePanels = () => disposers.forEach(dispose => dispose())
        }
        disposeHistorical = installHistoricalComparisonPanel(root)
        disposeCurrentResearch = installCurrentResearchPanel(root)
        disposeRollingResearch = installCurrentResearchPanel(root,{rolling:true})
        disposeTournamentResearch = installTournamentResearch(root)
        disposeRegionalForecastResearch = installRegionalForecastResearch(root)
        disposeAbcResearch = installAbcResearch(root)
        disposeUnitResearch = installUnitResearchPanel(root)
        disposePageLayout = installDashboardPageLayout(root)
        disposePlanningDrafts = installPlanningDrafts(root)
        disposeSalesIntake = installIntake(root)
        disposeOperatingInputs = installOperatingInputReview(root,(body,options)=>authenticatedJson('/api/sales/planning-dated-review',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:options.signal}),(body,options)=>authenticatedJson('/api/sales/planning-dated-select',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:options.signal}))
        disposePlanningWorkspace = installPlanningWorkspace(root)
        disposeForecastWorkspace = installForecastWorkspace(root)
        disposeAnalyticsOutputs = installAnalyticsOutputHub(root)

        let sourceReady = false
        const markSourceReady = () => {
          if (disposed || sourceReady) return
          sourceReady = true
          root.dataset.sourceState = 'ready'
          root.removeAttribute('aria-busy')
          root.style.visibility = 'visible'
          loadingOverlay.remove()
          disposeStl = installStlPanel(root)
        }
        // A financial-scope refresh may replace the initial request. Only the
        // successful publication for this root can finish its loading shell.
        const sourceError = (event: Event) => showDatabricksUnavailable((event as CustomEvent<unknown>).detail)
        root.addEventListener('medshield:source-error', sourceError)
        activeListeners.push({ target: root, type: 'medshield:source-error', listener: sourceError })
        root.addEventListener('medshield:source-ready', markSourceReady)
        activeListeners.push({ target: root, type: 'medshield:source-ready', listener: markSourceReady })
        void refreshDashboardFromGateway()
          .then((applied) => { if (applied !== false) markSourceReady() })
          .catch((error) => {
            if (disposed) return
            if (error instanceof ApiRequestError) console.warn('Dashboard request unavailable:', error.message)
            else console.error('Live Databricks dashboard load failed:', error)
            showDatabricksUnavailable(error)
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
      resetDashboardDeferredLoads()
      disposeStl()
      disposeSo1()
      disposeRegionalSales()
      disposeDecisionBoard()
      disposeAreaPriority()
      disposeSalesStreams()
      disposeFamilyAbc()
      disposeBreakdowns()
      disposeDescriptiveProfile()
      disposePlanningWorkspace()
      disposeForecastWorkspace()
      disposeStockPolicy()
      disposeSurgePrep()
      disposeCapstonePanels()
      disposeHistorical()
      disposeCurrentResearch()
      disposeRollingResearch()
      disposeTournamentResearch()
      disposeRegionalForecastResearch()
      disposeAbcResearch()
      disposeUnitResearch()
      disposePlanningDrafts()
      disposeSalesIntake()
      disposeOperatingInputs()
      disposeDiagnostics()
      disposeOverviewComparison()
      disposeAnalyticsOutputs()
      disposePageLayout()
      setPortalContainer(null)
      for (const { target, type, listener, options } of activeListeners) {
        target.removeEventListener(type, listener, options)
      }
      // Legacy charts belong to this mount, too. Removing their canvases alone
      // leaves Chart.js instances and responsive listeners alive across remounts.
      destroyRootCharts()
      root.innerHTML = ''
      document.getElementById('medshield-dashboard-styles')?.remove()
      
      for (const name of DASHBOARD_GLOBAL_HANDLERS) {
        delete (window as any)[name]
      }
      delete (window as any).__medshieldAuditInstalled
      delete root.dataset.enhancementsInstalled
      document.body.classList.remove('nav-collapsed', 'nav-hidden', 'nav-open')
      delete document.body.dataset.navState
    }
  }, [])

  useEffect(() => {
    if (rootRef.current) hydrateSidebarAccountCard(rootRef.current, user)
  }, [user])

  return { rootRef, portalContainer }
}
