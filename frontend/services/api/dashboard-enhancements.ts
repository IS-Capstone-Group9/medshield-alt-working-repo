import {
  SALES_DATA_NAV_ITEM,
  WEATHER_VALIDATION_NAV_ITEM,
  SALES_DATA_PAGE,
  WEATHER_VALIDATION_PAGE,
} from './dashboard-markup'
import { DashboardDataStatus } from '@/types/api.types'

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

function replaceSelectOptions(select: HTMLSelectElement | null, years: string[], includeAll: boolean) {
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
    option.textContent = Number(year) === new Date().getFullYear()
      ? `${year} (Actual + Estimate)`
      : year
    fragment.appendChild(option)
  })

  select.replaceChildren(fragment)
  select.value = previousValue === 'all' && includeAll
    ? 'all'
    : years.includes(previousValue)
      ? previousValue
      : years[0]
}

function installDescriptivePeriodControls(root: HTMLElement) {
  const selector = root.querySelector<HTMLElement>('.comparison-selector')
  if (selector && !selector.querySelector('#descriptivePeriodSelect')) {
    selector.replaceChildren()
    const label = document.createElement('label')
    label.setAttribute('for', 'descriptivePeriodSelect')
    label.className = 'sr-only'
    label.textContent = 'Historical period'
    const select = document.createElement('select')
    select.id = 'descriptivePeriodSelect'
    select.className = 'topbar-select'
    select.setAttribute('aria-label', 'Historical period')
    ;[
      ['30d', 'Last 30 Days'],
      ['3', 'Last 3 Months'],
      ['6', 'Last 6 Months'],
      ['12', 'Last 12 Months'],
      ['custom', 'Custom Date Range'],
    ].forEach(([value, text]) => select.add(new Option(text, value, false, value === '12')))
    selector.append(label, select)

    const compareWrap = document.createElement('span')
    compareWrap.id = 'descriptiveComparisonWrap'
    const compareLabel = document.createElement('label')
    compareLabel.setAttribute('for', 'descriptiveComparisonSelect')
    compareLabel.className = 'sr-only'
    compareLabel.textContent = 'Comparison view'
    const compareSelect = document.createElement('select')
    compareSelect.id = 'descriptiveComparisonSelect'
    compareSelect.className = 'topbar-select'
    compareSelect.setAttribute('aria-label', 'Comparison view')
    compareSelect.add(new Option('Period View', 'single', true, true))
    compareSelect.add(new Option('Y/Y Compare', 'yoy'))
    compareWrap.append(compareLabel, compareSelect)
    selector.append(compareWrap)
  }

  const singleYearWrap = root.querySelector<HTMLElement>('#singleYearWrap')
  if (singleYearWrap) {
    singleYearWrap.style.display = 'none'
    singleYearWrap.setAttribute('aria-hidden', 'true')
  }

  if (selector && !selector.querySelector('#customDateRangeWrap')) {
    const rangeWrap = document.createElement('span')
    rangeWrap.id = 'customDateRangeWrap'
    rangeWrap.className = 'custom-date-range'
    rangeWrap.style.display = 'none'
    rangeWrap.setAttribute('role', 'group')
    rangeWrap.setAttribute('aria-label', 'Custom historical date range')

    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date())
    const currentYear = today.slice(0, 4)

    const makeDateInput = (id: string, labelText: string, accessibleName: string, value: string) => {
      const label = document.createElement('label')
      label.setAttribute('for', id)
      label.className = 'custom-date-label'
      label.textContent = labelText
      const input = document.createElement('input')
      input.type = 'date'
      input.id = id
      input.className = 'topbar-select'
      input.min = '2017-01-01'
      input.max = today
      input.value = value
      input.setAttribute('aria-label', accessibleName)
      return [label, input] as const
    }

    const [startLabel, startInput] = makeDateInput(
      'customDateStart', 'From', 'Custom range start date', `${currentYear}-01-01`
    )
    const [endLabel, endInput] = makeDateInput(
      'customDateEnd', 'To', 'Custom range end date', today
    )
    rangeWrap.append(startLabel, startInput, endLabel, endInput)
    selector.append(rangeWrap)
  }
  root.querySelector<HTMLElement>('#yoyYearWrap')?.remove()
}

export function updateDashboardProvenance(
  root: HTMLElement,
  status: DashboardDataStatus,
  availableYears: string[]
) {
  const years = [...new Set(availableYears)]
    .filter((year) => /^\d{4}$/.test(year))
    .sort((a, b) => Number(b) - Number(a))
  const currentYear = String(new Date().getFullYear())
  if (years.length && Number(years[0]) < Number(currentYear)) years.unshift(currentYear)

  replaceSelectOptions(root.querySelector<HTMLSelectElement>('#topbarYearSelect'), years, false)

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
    details.textContent = `Loaded: ${loadedLabel} PHT | Years: ${years.join(', ') || 'Unavailable'}`
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
    root.querySelector<HTMLElement>('[data-sales-growth-detail]'),
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

  replaceUnsupportedLabels(root)
  installDescriptivePeriodControls(root)

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
