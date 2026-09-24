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
      ['3', 'Last 3 Months'],
      ['6', 'Last 6 Months'],
      ['12', 'Last 12 Months'],
      ['all', 'All Time · Yearly'],
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

  if (selector && !selector.querySelector('#analysisScopeSelect')) {
    const scopeLabel = document.createElement('label')
    scopeLabel.setAttribute('for', 'analysisScopeSelect')
    scopeLabel.className = 'sr-only'
    scopeLabel.textContent = 'Analysis scope'
    const scopeSelect = document.createElement('select')
    scopeSelect.id = 'analysisScopeSelect'
    scopeSelect.className = 'topbar-select'
    scopeSelect.setAttribute('aria-label', 'Analysis scope')
    scopeSelect.add(new Option('Extended · 2017–Current', 'extended', true, true))
    scopeSelect.add(new Option('Capstone · 2021–2025', 'capstone'))
    selector.prepend(scopeLabel, scopeSelect)
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

function installDecisionStory(root: HTMLElement) {
  const overview = root.querySelector<HTMLElement>('#page-overview')
  if (!overview || overview.querySelector('[data-decision-story]')) return

  const story = document.createElement('section')
  story.dataset.decisionStory = 'true'
  story.className = 'decision-story'
  story.setAttribute('aria-labelledby', 'decisionStoryTitle')
  story.innerHTML = `
    <div class="decision-story-header">
      <div>
        <div class="decision-story-eyebrow">North Star decision path</div>
        <h2 id="decisionStoryTitle">From historical evidence to a reviewable planning action</h2>
        <p>Follow the same sequence used in the capstone: explain what happened, identify what and where matters, evaluate what may happen next, then review a constrained action.</p>
      </div>
      <span class="decision-story-scope">Use “Capstone · 2021–2025” for objective evidence</span>
    </div>
    <ol class="decision-story-steps">
      <li><button type="button" data-story-page="revenue"><span>1</span><strong>What happened?</strong><small>Sales trends, YoY movement and seasonality evidence</small></button></li>
      <li><button type="button" data-story-page="products"><span>2</span><strong>What matters?</strong><small>Pareto contribution, ABC evidence and slow-mover review</small></button></li>
      <li><button type="button" data-story-page="territory"><span>3</span><strong>Where should we focus?</strong><small>Regional rollups with provincial drill-down</small></button></li>
      <li><button type="button" data-story-page="forecast"><span>4</span><strong>What may happen next?</strong><small>Baseline comparison, accuracy and regressor validation</small></button></li>
      <li><button type="button" data-story-page="inventory"><span>5</span><strong>What should be reviewed?</strong><small>Scenario constraints, allocation and human approval</small></button></li>
    </ol>`

  const warning = overview.querySelector<HTMLElement>('.compliance-warning-banner')
  if (warning) warning.insertAdjacentElement('afterend', story)
  else overview.prepend(story)
}

function installEvidenceBoundaries(root: HTMLElement) {
  const overview = root.querySelector<HTMLElement>('#page-overview')
  if (!overview) return

  const warning = overview.querySelector<HTMLElement>('.compliance-warning-banner')
  const warningText = warning?.querySelector<HTMLElement>('div')
  if (warningText) {
    warningText.innerHTML = '<strong>Validation boundary:</strong> Historical sales are sourced from Databricks Gold. STL, Prophet with external regressors, XGBoost urgency, expiry-wastage controls, and operational EOQ/ROP/MCDA recommendations remain unavailable until their approved inputs and validation evidence are published.'
  }

  const publicationCard = Array.from(overview.querySelectorAll<HTMLElement>('.chart-card'))
    .find((card) => card.querySelector('.chart-title')?.textContent?.trim() === 'Model Publication Status')
  const modelStates = new Map([
    ['Descriptive Analytics Model', ['PARTIAL', 'status-draft']],
    ['Predictive Time-Series Model (Prophet)', ['VALIDATION', 'status-draft']],
    ['Prescriptive Buffer Model (EOQ/ROP)', ['SCENARIO', 'status-draft']],
  ])
  publicationCard?.querySelectorAll<HTMLElement>('span').forEach((label) => {
    const state = modelStates.get(label.textContent?.trim() ?? '')
    const pill = label.parentElement?.querySelector<HTMLElement>('.status-pill')
    if (!state || !pill) return
    pill.textContent = state[0]
    pill.className = `status-pill ${state[1]}`
  })

  const focusCard = Array.from(overview.querySelectorAll<HTMLElement>('.chart-card'))
    .find((card) => card.querySelector('.chart-title')?.textContent?.trim() === 'Active Decision Focus')
  if (focusCard) {
    const title = focusCard.querySelector<HTMLElement>('.chart-title')
    const subtitle = focusCard.querySelector<HTMLElement>('.chart-subtitle')
    const items = Array.from(focusCard.querySelectorAll<HTMLElement>('.chart-header ~ div > div'))
    if (title) title.textContent = 'Objective Evidence Review Queue'
    if (subtitle) subtitle.textContent = 'Items that must be resolved before operational claims are made'
    if (items[0]) {
      items[0].textContent = 'METHOD GAP: Publish the 2021–2025 STL decomposition before claiming Objective 1 is complete.'
      items[0].style.cssText = 'font-size:11px;padding:8px 12px;border-radius:6px;background:#fffbeb;border:1px solid #fcd34d;color:#92400e;font-weight:600;'
    }
    if (items[1]) {
      items[1].textContent = 'INPUT GAP: Approved expiry, cost, lead-time, DOH and PAGASA evidence is required for Objectives 3–5.'
      items[1].style.cssText = 'font-size:11px;padding:8px 12px;border-radius:6px;background:#f8fafc;border:1px solid #cbd5e1;color:#334155;font-weight:600;'
    }
  }

  const externalEvidenceCard = overview.querySelector<HTMLElement>('#overviewThreatOdometerCard')
  if (externalEvidenceCard) {
    externalEvidenceCard.innerHTML = `
      <div class="chart-header" style="margin-bottom:14px;">
        <div>
          <div class="chart-title">External Signal Evidence Readiness <span class="status-pill status-draft" style="font-size:9px;padding:1px 6px;margin-left:6px;">NOT PUBLISHED</span></div>
          <div class="chart-subtitle">Required evidence for the DII, RSI, PAGASA Signal-2 and multi-hazard objectives</div>
        </div>
        <span class="chart-badge">Validation Gate</span>
      </div>
      <div class="decision-story-steps" style="grid-template-columns:repeat(3,minmax(0,1fr));">
        <div><strong>DOH surveillance</strong><small>Approved period, geography, disease definition and lineage required</small></div>
        <div><strong>PAGASA weather</strong><small>Station coverage, rainfall and Signal-2 provenance required</small></div>
        <div><strong>Inventory controls</strong><small>On-hand, expiry, cost, lead time and service-level inputs required</small></div>
      </div>
      <div class="threat-narrative-box" style="margin-top:14px;"><strong>Decision rule:</strong> Until these inputs pass validation, the DSS presents historical demand context and reviewable scenarios only; it does not assert a live hazard score or activate procurement.</div>`
  }

  const paretoInsight = Array.from(root.querySelectorAll<HTMLElement>('.dss-insight-card'))
    .find((card) => card.querySelector('.insight-badge')?.textContent?.trim() === 'Operations Research Principle')
  if (paretoInsight) {
    const title = paretoInsight.querySelector<HTMLElement>('.insight-title')
    const body = title?.nextElementSibling as HTMLElement | null
    if (title) title.textContent = 'Pareto Concentration — Critical SKU Review'
    if (body) body.textContent = 'Use source-ranked SKU contribution to focus capital and slow-mover review. Treat ABC/XGBoost classification and safety-stock recommendations as unpublished until their model evidence and required inventory inputs are validated.'
  }

  const helpBody = root.querySelector<HTMLElement>('#helpGuidanceModal .custom-modal-body')
  if (helpBody) {
    helpBody.innerHTML = `
      <p style="margin-bottom:10px;"><strong>MedShield DSS</strong> separates published evidence from work that is still awaiting inputs or validation.</p>
      <ul style="list-style:disc; margin-left:18px; margin-bottom:12px;">
        <li><strong>Sales Diagnostics:</strong> Review historical sales using either the capstone 2021–2025 lens or the extended 2017–current view.</li>
        <li><strong>Product and Area Prioritization:</strong> Inspect Pareto contribution and regional rollups before drilling into territories.</li>
        <li><strong>Forecast Modeling:</strong> Compare candidate forecasts only when accuracy, training scope, and regressor evidence are published.</li>
        <li><strong>Prescriptive Planning:</strong> Save reviewable scenarios; the DSS does not execute procurement.</li>
      </ul>
      <div style="background:var(--bg-elevated); padding:10px; border-radius:6px; border:1px solid var(--border); font-size:11px;"><strong>Decision rule:</strong> Unavailable evidence remains visibly unavailable and is never replaced by demonstration values.</div>`
  }
}

export function updateDashboardProvenance(
  root: HTMLElement,
  status: DashboardDataStatus,
  availableYears: string[]
) {
  const years = [...new Set(availableYears)]
    .filter((year) => /^(201[7-9]|202[0-5])$/.test(year))
    .sort((a, b) => Number(b) - Number(a))
  const currentYear = String(new Date().getFullYear())
  if (years.length && Number(years[0]) < Number(currentYear)) years.unshift(currentYear)

  replaceSelectOptions(root.querySelector<HTMLSelectElement>('#topbarYearSelect'), years, false)

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
  installDecisionStory(root)
  installEvidenceBoundaries(root)

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
