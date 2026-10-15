import {
  SALES_DATA_NAV_ITEM,
  WEATHER_VALIDATION_NAV_ITEM,
  SALES_DATA_PAGE,
  WEATHER_VALIDATION_PAGE,
} from './dashboard-markup'
import { DashboardDataStatus } from '@/types/api.types'
import { installDashboardFilterPanel } from './dashboard-filter-panel'

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
  const currentYear = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Manila', year: 'numeric' }).format(new Date())

  if (includeAll) {
    const option = document.createElement('option')
    option.value = 'all'
    option.textContent = `All Years (${years[years.length - 1]}–${years[0]})`
    fragment.appendChild(option)
  }

  years.forEach((year) => {
    const option = document.createElement('option')
    option.value = year
    option.textContent = year === currentYear
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
      ['3', 'Last 3 Months'],
      ['6', 'Last 6 Months'],
      ['12', 'Last 12 Months'],
      ['all', 'All Time · Yearly'],
      ['custom', 'Custom Date Range'],
    ].forEach(([value, text]) => select.add(new Option(text, value, false, value === 'all')))
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

  if (selector && !selector.querySelector('#analysisScopeSelect')) {
    const label = document.createElement('label')
    label.setAttribute('for', 'analysisScopeSelect')
    label.className = 'sr-only'
    label.textContent = 'Analysis scope'
    const select = document.createElement('select')
    select.id = 'analysisScopeSelect'
    select.className = 'topbar-select'
    select.setAttribute('aria-label', 'Analysis scope')
    select.add(new Option('Extended · 2017–Current', 'extended', true, true))
    select.add(new Option('Capstone · 2017–2025', 'capstone'))
    selector.prepend(label, select)
  }

  if (selector && !selector.querySelector('#chartGranularitySelect')) {
    const label = document.createElement('label')
    label.setAttribute('for', 'chartGranularitySelect')
    label.className = 'sr-only'
    label.textContent = 'Chart granularity'
    const select = document.createElement('select')
    select.id = 'chartGranularitySelect'
    select.className = 'topbar-select'
    select.setAttribute('aria-label', 'Chart granularity')
    select.add(new Option('Granularity · Automatic', 'auto', true, true))
    select.add(new Option('Granularity · Monthly', 'monthly'))
    select.add(new Option('Granularity · Yearly', 'yearly'))
    selector.append(label, select)
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
    .filter((year) => /^\d{4}$/.test(year) && Number(year) >= 2017)
    .sort((a, b) => Number(b) - Number(a))
  const currentYear = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Manila', year: 'numeric' }).format(new Date())
  // An estimate option is a selectable scope, not evidence of a source year.
  const offeredYears = years.length
    ? [...new Set([...years, currentYear])].sort((a, b) => Number(b) - Number(a))
    : []

  replaceSelectOptions(root.querySelector<HTMLSelectElement>('#topbarYearSelect'), offeredYears, false)

  const statusBar = root.querySelector<HTMLElement>('.data-freshness-bar')
  if (statusBar) {
    const sourceLabel = 'Databricks Gold'
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
    if (status.release) {
      const release = document.createElement('details')
      const label = document.createElement('summary'); label.textContent = `Candidate dataset · Fact version ${status.release.fact_delta_version} · Release approval pending`
      const identity = document.createElement('p'); identity.textContent = `Dataset: ${status.release.dataset_id}. Policy: ${status.release.policy_version}. Databricks is the analytical source; product identities and derived mappings retain their review status.`
      release.append(label, identity); statusBar.append(release)
    }
    statusBar.dataset.source = status.source
    statusBar.dataset.mode = status.mode
  }

  const badge = root.querySelector<HTMLElement>('.topbar-badge')
  if (badge) {
    badge.remove()
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

export function correctOverviewEvidence(root: Element) {
  const overview = root.querySelector<HTMLElement>('#page-overview')
  if (!overview) return

  const scopeNotice = overview.querySelector<HTMLElement>('.compliance-warning-banner')
  if (scopeNotice) {
    scopeNotice.textContent = 'Decision-support scope: Sales figures come from Databricks Gold candidate views. Disease and weather joins, predictive models, and inventory actions await approval or operational inputs.'
  }

  const salesChart = overview.querySelector('#overviewBaselineChart')?.closest<HTMLElement>('.chart-card')
  const salesBadge = salesChart?.querySelector<HTMLElement>('.status-pill')
  if (salesBadge) {
    salesBadge.textContent = 'DATABRICKS GOLD · CANDIDATE'
    salesBadge.classList.remove('status-ready')
  }
  const salesSubtitle = salesChart?.querySelector<HTMLElement>('.chart-subtitle')
  if (salesSubtitle) salesSubtitle.textContent = 'Observed net sales and transaction gross profit for the selected historical period.'

  const replaceCard = (currentTitle: string, title: string, subtitle: string, messages: string[]) => {
    const currentHeading = Array.from(overview.querySelectorAll<HTMLElement>('.chart-title'))
      .find((heading) => heading.textContent?.trim() === currentTitle)
    const card = currentHeading?.closest<HTMLElement>('.chart-card')
    if (!card) return
    const header = document.createElement('div')
    header.className = 'chart-header'
    const heading = document.createElement('div')
    heading.className = 'chart-title'
    heading.textContent = title
    const description = document.createElement('div')
    description.className = 'chart-subtitle'
    description.textContent = subtitle
    const headingGroup = document.createElement('div')
    headingGroup.append(heading, description)
    header.appendChild(headingGroup)
    const body = document.createElement('div')
    body.style.display = 'grid'
    body.style.gap = '10px'
    messages.forEach((message) => {
      const row = document.createElement('p')
      row.textContent = message
      body.appendChild(row)
    })
    card.replaceChildren(header, body)
  }

  replaceCard('Model Publication Status', 'Evidence and publication status',
    'Technical availability does not imply business approval.', [
      'Historical sales: Databricks Gold candidate data; business approval pending.',
      'Predictive forecast: no approved trained model is published. Sales-only baseline validation is available in Forecast Modeling.',
      'Inventory planning: reviewed scenarios only; live stock, lead time, and cost inputs are unavailable.',
    ])
  replaceCard('Active Decision Focus', 'Planning review',
    'No live disease or stock-out alert is published.', [
      'Use historical sales evidence to review product and territory patterns.',
      'Enter and review operational assumptions before treating a planning scenario as an action.',
    ])

  const insightTitle = Array.from(root.querySelectorAll<HTMLElement>('.dss-insight-card .insight-title'))
    .find((title) => title.textContent?.includes('Baseline Stability & Epidemic Surge Readiness'))
  if (insightTitle) insightTitle.textContent = 'Historical sales scope'

  const helpBody = root.querySelector<HTMLElement>('#helpGuidanceModal .custom-modal-body')
  if (helpBody) {
    helpBody.textContent = 'MedShield shows historical sales evidence from Databricks Gold candidate views. Forecast Modeling provides sales-only baseline validation. Product and area priorities use derived mappings that need owner review. Planning outputs are scenarios based on entered assumptions; MedShield does not publish live disease alerts or execute purchases.'
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
  installDescriptivePeriodControls(root)
  installDashboardFilterPanel(root)
  correctOverviewEvidence(root)

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
