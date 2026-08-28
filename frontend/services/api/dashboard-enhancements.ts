import {
  SALES_DATA_NAV_ITEM,
  WEATHER_VALIDATION_NAV_ITEM,
  SALES_DATA_PAGE,
  WEATHER_VALIDATION_PAGE,
} from './dashboard-markup'

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
