import {
  SALES_DATA_NAV_ITEM,
  WEATHER_VALIDATION_NAV_ITEM,
  SALES_DATA_PAGE,
  WEATHER_VALIDATION_PAGE,
} from './dashboard-markup'
import { resolveForecastCurrentYear, resolveNextForecastYear } from './dashboard-forecast-window'
import type { DashboardDataStatus } from '@/types/api.types'

const UNSUPPORTED_DASHBOARD_LABELS = new Map([
  ['Execute Purchase Order', 'Save Draft Plan'],
  ['Confirm & Execute Order', 'Save Draft for Review'],
])

function replaceUnsupportedLabels(root: HTMLElement) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let node = walker.nextNode()
  while (node) {
    const value = node.nodeValue?.trim()
    if (value && UNSUPPORTED_DASHBOARD_LABELS.has(value)) {
      node.nodeValue = node.nodeValue?.replace(value, UNSUPPORTED_DASHBOARD_LABELS.get(value)!) ?? ''
    }
    node = walker.nextNode()
  }
}

function replaceSelectOptions(
  select: HTMLSelectElement | null,
  years: string[],
  includeAll: boolean,
  labels: Map<string, string> = new Map(),
) {
  if (!select || years.length === 0) return
  const previousValue = select.value
  const fragment = document.createDocumentFragment()

  if (includeAll) {
    const option = document.createElement('option')
    option.value = 'all'
    option.textContent = `All Years (${years[years.length - 1]}–${years[0]})`
    fragment.appendChild(option)
  }

  years.forEach((year) => {
    const option = document.createElement('option')
    option.value = year
    option.textContent = labels.get(year) ?? year
    fragment.appendChild(option)
  })

  select.replaceChildren(fragment)
  select.value = previousValue === 'all' && includeAll
    ? 'all'
    : years.includes(previousValue)
      ? previousValue
      : years[0]
}

export function updateDashboardProvenance(
  root: HTMLElement,
  status: DashboardDataStatus,
  availableYears: string[]
) {
  const historicalYearSet = new Set(
    availableYears.filter((year) => /^\d{4}$/.test(year))
  )
  const currentAnalyticalYear = resolveForecastCurrentYear(status)
  const nextForecastYear = resolveNextForecastYear(status)
  const years = [...new Set([
    ...historicalYearSet,
    currentAnalyticalYear,
    ...(nextForecastYear ? [nextForecastYear] : []),
  ])]
    .filter((year) => /^\d{4}$/.test(year))
    .sort((a, b) => Number(b) - Number(a))
  const yearLabels = new Map<string, string>()
  if (currentAnalyticalYear) {
    yearLabels.set(currentAnalyticalYear, `${currentAnalyticalYear} (Current Analytical)`)
  }
  if (nextForecastYear) {
    yearLabels.set(nextForecastYear, `${nextForecastYear} (Forward Forecast)`)
  }

  replaceSelectOptions(root.querySelector<HTMLSelectElement>('#topbarYearSelect'), years, true, yearLabels)
  replaceSelectOptions(root.querySelector<HTMLSelectElement>('#yoyBaseYearSelect'), years, false, yearLabels)
  replaceSelectOptions(root.querySelector<HTMLSelectElement>('#yoyTargetYearSelect'), years, false, yearLabels)

  const targetSelect = root.querySelector<HTMLSelectElement>('#yoyTargetYearSelect')
  const baseSelect = root.querySelector<HTMLSelectElement>('#yoyBaseYearSelect')
  if (targetSelect && baseSelect && targetSelect.value === baseSelect.value && years.length > 1) {
    targetSelect.value = years[1]
  }

  const statusBar = root.querySelector<HTMLElement>('.data-freshness-bar')
  if (statusBar) {
    const sourceLabel = status.source === 'analytics_services'
      ? 'Analytics Services'
      : 'Bundled Demo Snapshot'
    const loadedAt = new Date(status.loaded_at)
    const loadedLabel = Number.isNaN(loadedAt.getTime())
      ? 'Unavailable'
      : loadedAt.toLocaleString('en-PH', { timeZone: 'Asia/Manila' })

    statusBar.replaceChildren()
    const summary = document.createElement('div')
    summary.textContent = `${sourceLabel} | ${status.message}`
    const details = document.createElement('div')
    const yearSummary = years.map((year) => yearLabels.get(year) ?? year).join(', ')
    details.textContent = `Loaded: ${loadedLabel} PHT | Years: ${yearSummary || 'Unavailable'}`
    details.style.fontWeight = '700'
    statusBar.append(summary, details)
    statusBar.dataset.source = status.source
    statusBar.dataset.mode = status.mode
  }

  const badge = root.querySelector<HTMLElement>('.topbar-badge')
  if (badge) {
    badge.replaceChildren()
    badge.textContent = status.mode === 'demo' ? 'Demo Dataset' : 'Historical Dataset'
  }
}

export function applyScenarioSafetyLabels(root: HTMLElement) {
  replaceUnsupportedLabels(root)
}

export function setCardModel(root: HTMLElement, id: string, name: string, note: string) {
  const canvas = root.querySelector(`#${id}`)
  const card = canvas?.closest('.chart-card')
  if (card && card instanceof HTMLElement) {
    card.dataset.model = `${name}: ${note}`
  }
}

function assignSalesDiagnosticsContent(root: HTMLElement) {
  const salesDiagnosticsPage = root.querySelector<HTMLElement>('#page-revenue')
  if (!salesDiagnosticsPage) return

  const insightCards = Array.from(root.querySelectorAll<HTMLElement>('.dss-insight-card'))
  const findInsight = (badge: string) =>
    insightCards.find(
      (card) => card.querySelector('.insight-badge')?.textContent?.trim() === badge
    ) ?? null

  // These historical-sales sections were emitted as direct children of
  // `.content`, outside every `.page`, so the browser displayed them under
  // every module. Give them one explicit owner: Sales Diagnostics.
  const sections = [
    findInsight('DSS Executive Takeaway'),
    root.querySelector('#growthChart')?.closest<HTMLElement>('.chart-grid-2') ?? null,
    root.querySelector('#revenueHeatmapGrid')?.closest<HTMLElement>('.chart-card') ?? null,
    findInsight('Seasonality Pattern Recognition'),
  ].filter((section): section is HTMLElement => section instanceof HTMLElement)

  if (sections.length === 0) return

  let deepDive = salesDiagnosticsPage.querySelector<HTMLElement>(
    ':scope > [data-sales-diagnostics-deep-dive]'
  )
  if (!deepDive) {
    deepDive = document.createElement('section')
    deepDive.dataset.salesDiagnosticsDeepDive = 'true'
    deepDive.setAttribute('aria-label', 'Historical sales performance analytics')
    salesDiagnosticsPage.appendChild(deepDive)
  }

  sections.forEach((section) => deepDive?.appendChild(section))
}

function updateAreaSegmentationLabels(root: HTMLElement) {
  const updates = [
    {
      canvasId: 'areaBarChart',
      title: 'Revenue by Province/Local Territory',
      subtitle: 'Province/local delivery areas only; region and island aggregates excluded',
      badge: 'Province Grain',
    },
    {
      canvasId: 'areaIncomeChart',
      title: 'Gross Margin by Customer Channel',
      subtitle: 'Government, Hospital, and Pharma grouped as customer/channel labels',
      badge: 'Channels',
    },
    {
      canvasId: 'areaMarginChart',
      title: 'Business-Line Margin Mix',
      subtitle: 'Admin, Supplies, Equipment, Personal, and Losses kept outside territory ranking',
      badge: 'Business Lines',
    },
  ]

  for (const update of updates) {
    const card = root.querySelector(`#${update.canvasId}`)?.closest<HTMLElement>('.chart-card')
    if (!card) continue
    const title = card.querySelector<HTMLElement>('.chart-title')
    const subtitle = card.querySelector<HTMLElement>('.chart-subtitle')
    const badge = card.querySelector<HTMLElement>('.chart-badge')
    if (title) title.textContent = update.title
    if (subtitle) subtitle.textContent = update.subtitle
    if (badge) badge.textContent = update.badge
  }
}

export function enhanceDashboardContent(root: HTMLElement) {
  // MedShield is intentionally light-only. Clear any legacy preference so a
  // previously stored dark theme cannot leave the user in an unsupported mode.
  root.querySelector('[aria-label="Toggle dark mode"]')?.remove()
  document.documentElement.removeAttribute('data-theme')
  try {
    window.localStorage.removeItem('medshield-theme')
  } catch {
    // Storage can be unavailable in privacy-restricted browser contexts.
  }

  replaceUnsupportedLabels(root)
  updateAreaSegmentationLabels(root)

  const navigation = root.querySelector('.nav')
  if (navigation) {
    if (!navigation.querySelector('#salesDataNavItem')) {
      navigation.insertAdjacentHTML('beforeend', SALES_DATA_NAV_ITEM)
    }
    if (!navigation.querySelector('#weatherValidationNavItem')) {
      navigation.insertAdjacentHTML('beforeend', WEATHER_VALIDATION_NAV_ITEM)
    }

    // Normalize the legacy inline routes into data attributes. A single
    // delegated listener owns navigation after the dashboard runtime starts.
    navigation.querySelectorAll<HTMLElement>('.nav-item').forEach((item) => {
      const inlineHandler = item.getAttribute('onclick') ?? ''
      const routeMatch = inlineHandler.match(/showPage\('([^']+)'/)
      if (routeMatch?.[1]) item.dataset.dashboardPage = routeMatch[1]
      item.removeAttribute('onclick')
    })
  }

  const content = root.querySelector('.content')
  if (content) {
    assignSalesDiagnosticsContent(root)

    if (!content.querySelector('#page-sales-data')) {
      content.insertAdjacentHTML('beforeend', SALES_DATA_PAGE)
    }
    if (!content.querySelector('#page-weather-validation')) {
      content.insertAdjacentHTML('beforeend', WEATHER_VALIDATION_PAGE)
    }
  }
}
