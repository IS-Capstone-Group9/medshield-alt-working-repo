type Control = { label: string; selector: string }
// includeCollapsed: the panel keeps this reading in a closed method note, so the header is where it shows.
type Reading = { label: string; selectors: string[]; includeCollapsed?: boolean }
type TabPresentation = {
  page: string; name: string; evidence: string; question: string; scope: string
  readings: Reading[]; outputs: Control[]; sections: Control[]; interpretation: string
}

export const TAB_ANALYTICS_PRESENTATION: readonly TabPresentation[] = [
  {
    page: 'overview', name: 'Overview', evidence: 'Recorded sales and review context',
    question: 'What changed, and what needs a closer look?',
    scope: 'Sales summaries follow the selected period. Forecast research and planning assumptions keep their own scope.',
    readings: [
      { label: 'Recorded performance', selectors: ['#overview-descriptive-output', '#overviewTrendReading'] },
      { label: 'Change to investigate', selectors: ['#overview-diagnostic-output'] },
    ],
    outputs: [{ label: 'Trend CSV', selector: '#overviewTrendExport' }],
    sections: [
      { label: 'Explore sales patterns', selector: '#overviewBaselineChart' },
      { label: 'Review the four analytics outputs', selector: '#overviewAnalyticsSections' },
      { label: 'Open sales change by buyer sector', selector: '#overviewSectorDetails' },
      { label: 'Open more sales patterns and coverage', selector: '#overviewSalesDetails' },
    ],
    interpretation: 'Observation coverage describes recorded months. Forecast evidence is a separate evaluation; planning readiness does not calculate a purchase order.',
  },
  {
    page: 'revenue', name: 'Sales Diagnostic', evidence: 'Observed and derived financial analysis',
    question: 'Where did recorded sales change?',
    scope: 'Use the seven output tabs below. Disease & weather and Territory baseline state their own historical controls.',
    readings: [
      { label: 'Selected output', selectors: ['#salesOutputScope'] },
      { label: 'Current finding', includeCollapsed: true, selectors: [
        '#salesTrendReading', '#diagnosticStatus', '#so1Summary', '#so1FinancialSummary', '#so1Status',
        '#salesMovementCaption', '#heatmapInsight', '#heatmapStatus',
        '#descriptiveStlPanel > p[role="status"]', '#regContextSummary', '#regStatus',
      ] },
    ],
    outputs: [
      { label: 'Territory financial CSV', selector: '#so1FinancialExport' },
      { label: 'Territory comparison CSV', selector: '#so1Export' },
      { label: 'Contribution CSV', selector: '#so1ContributionExport' },
      { label: 'Daily sensitivity CSV', selector: '#so1DailyExport' },
    ],
    sections: [{ label: 'Choose an analytical output', selector: '#salesOutputSections' }],
    interpretation: 'Compare equal observed periods. Gross profit uses supported transaction costs; missing months are not zero sales. Contributions localize change without proving its business cause.',
  },
  {
    page: 'products', name: 'Product Prioritization', evidence: 'Recorded-label commercial review',
    question: 'Which product labels warrant commercial review?',
    scope: 'Recorded-sales ranking and ABC classifier evaluation answer separate questions and keep their stated cohorts.',
    readings: [
      { label: 'Commercial finding', selectors: ['#productFinding', '#productCommercialStatus'] },
      { label: 'Suggested next check', selectors: ['#productReviewPrompt'] },
    ],
    outputs: [
      { label: 'Selected product rows CSV', selector: '#productPriorityExport' },
      { label: 'ABC evaluation metrics CSV', selector: '[data-abc-metric-export]' },
      { label: 'ABC evaluated cases CSV', selector: '[data-abc-case-export]' },
    ],
    sections: [
      { label: 'Inspect product contribution', selector: '#productPriorityScope' },
      { label: 'Open commercial review', selector: '#productCommercialDetails' },
      { label: 'Open ABC classifier research', selector: '#productResearchDetails' },
      { label: 'Read the product table', selector: '#productTable' },
    ],
    interpretation: 'Pareto and descriptive ABC use the declared positive-sales population before display filtering. A source label is not automatically a verified SKU; classifier performance does not authorize procurement.',
  },
  {
    page: 'territory', name: 'Area Prioritization', evidence: 'Confirmed delivery areas and unallocated labels',
    question: 'Where does delivery evidence support follow-up?',
    scope: 'The area review uses its selected year, region and matched observed months. Unallocated and channel labels stay separate.',
    readings: [
      { label: 'Area finding', selectors: ['#areaReviewTakeaway', '#areaReviewStatus'] },
      { label: 'Coverage and allocation', selectors: ['#areaReviewAllocation'] },
    ],
    outputs: [{ label: 'Area review CSV', selector: '#areaReviewExport' }],
    sections: [
      { label: 'Inspect confirmed-area priorities', selector: '#confirmedAreaReview' },
      { label: 'Inspect unallocated evidence', selector: '#areaReviewUnallocated' },
    ],
    interpretation: 'Mapped-record coverage is different from mapped sales value. Area ABC uses its stated signed-net basis; a hospital or government channel is not a province.',
  },
  {
    page: 'forecast', name: 'Forecast Modeling', evidence: 'Historical model-performance evaluation',
    question: 'How well did the supported models predict?',
    scope: 'Check target, unit, evaluation window and actual lead. Fixed company, regional and unit research use their own controls.',
    readings: [
      { label: 'Model evaluation', selectors: ['#forecastTakeaway', '#forecastStatus', '[data-tournament-status]'] },
      { label: 'Evaluation scope', selectors: ['#forecastEvaluationScope', '#unitResearchStatus'], includeCollapsed: true },
    ],
    outputs: [
      { label: 'Forecast evaluation CSV', selector: '#forecastExport' },
      { label: 'Tournament CSV', selector: '[data-tournament-export]' },
      { label: 'Regional research CSV', selector: '[data-regional-php-export]' },
      { label: 'Unit pilot CSV', selector: '#unitResearchExport' },
    ],
    sections: [
      { label: 'Read forecast errors', selector: '#forecastMetrics' },
      { label: 'Inspect target dates', selector: '#forecastCalendar' },
      { label: 'Open historical forecast research', selector: '#forecastResearchDetails' },
    ],
    interpretation: 'PHP sales and ampoules are different targets. Lower error must be judged on comparable cases; unavailable models are not zero-error models. Historical evaluation is not an approved operating forecast.',
  },
  {
    page: 'inventory', name: 'Prescriptive Planning', evidence: 'Explicitly entered planning scenarios',
    question: 'What changes under these planning assumptions?',
    scope: 'Enter stock, demand, costs, lead time and expiry explicitly. Compare the no-purchase baseline with the calculated scenario.',
    readings: [
      { label: 'Scenario result', selectors: ['#planTakeaway', '#planResultStatus'] },
      { label: 'Scenario scope', selectors: ['#planScope'] },
    ],
    outputs: [
      { label: 'Calculated scenario CSV', selector: '#planExport' },
      { label: 'Save entered draft', selector: '[data-draft-save]' },
      { label: 'Dated review snapshot', selector: '[data-supply-export]' },
    ],
    sections: [
      { label: 'Review entered assumptions', selector: '#planAssumptions' },
      { label: 'Inspect feasibility', selector: '#planFeasibilityTable' },
    ],
    interpretation: 'A saved draft contains inputs, not a solved plan. Whole-pack optima and bounded results retain their proof scope. Modeled coverage and expiry exposure are scenarios, not measured company outcomes.',
  },
  {
    page: 'data', name: 'Data Source', evidence: 'Source identity and candidate review',
    question: 'Which source is connected, and what needs review?',
    scope: 'The serving analytical source is separate from an intake candidate or correction preview.',
    readings: [
      { label: 'Connected source', selectors: ['#sourcePageStatus', '#sourcePageEvidence'] },
      { label: 'Candidate intake', selectors: ['[data-intake-feedback]'] },
    ],
    outputs: [
      { label: 'Intake CSV template', selector: '[data-intake-template]' },
      { label: 'Candidate issues report', selector: '[data-intake-issues]' },
      { label: 'Classification review report', selector: '[data-intake-classifications]' },
    ],
    sections: [{ label: 'Inspect source evidence', selector: '#sourcePageEvidence' }],
    interpretation: 'Validation and source rechecking are technical evidence. Candidate reports, a correction preview and a template do not approve publication or replace the serving release.',
  },
  {
    page: 'sales-data', name: 'View Sales Data', evidence: 'Recorded transaction evidence',
    question: 'Which records support the analytical finding?',
    scope: 'Search, year and quality filters define the matching ledger. Financial totals and the ledger export cover all matching pages.',
    readings: [
      { label: 'Matching records', selectors: ['#salesDataStatus'] },
      { label: 'Financial reconciliation', selectors: ['#salesFinancialReconciliation'] },
    ],
    outputs: [{ label: 'Filtered financial ledger CSV', selector: '#salesFinancialExport' }],
    sections: [
      { label: 'Review matching totals', selector: '#salesComputationGrid' },
      { label: 'Inspect source records', selector: '#salesDataTable' },
    ],
    interpretation: 'Source Qty keeps its recorded presentation. Financial and margin eligibility can differ. A paginated table does not limit the matching-record export to the visible page.',
  },
  {
    page: 'weather-validation', name: 'Weather API Validation', evidence: 'Historical observations and provider proxies',
    question: 'What observations and provider agreement are available?',
    scope: 'Use this page’s provider, location, year and weather-variable controls. These observations are not an official warning feed.',
    readings: [
      { label: 'Observation status', selectors: ['#weatherEffectStatus'] },
      { label: 'Coverage', selectors: ['#weatherEffectCount'] },
    ],
    outputs: [],
    sections: [
      { label: 'Inspect weather observations', selector: '#weatherEffectTable' },
      { label: 'Read provider evidence', selector: '#weatherEffectEvidence' },
    ],
    interpretation: 'PAGASA observations and NASA POWER/Open-Meteo proxies keep their own identities and completeness. Agreement or a sales association does not establish disease causation or forecasting benefit.',
  },
]

export const ANALYTICS_OUTPUT_HUB_STYLE = [
  '.analytics-output-hub { margin: 0 0 var(--space-3, 12px); padding: var(--space-4, 16px) var(--space-5, 20px); border: 1px solid var(--border); border-radius: var(--radius-md, 10px); background: var(--bg-surface); color: var(--text-primary); min-width: 0; }',
  '.analytics-output-hub__heading { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-4, 16px); }',
  '.analytics-output-hub__heading > div { min-width: 0; }',
  '.analytics-output-hub__evidence { margin: 0 0 var(--space-1, 4px); font-size: 12px; font-weight: 600; color: var(--accent, #117c80); }',
  '.analytics-output-hub h2 { font-size: 20px; line-height: 1.3; margin: 0; }',
  '.analytics-output-hub details p, .analytics-output-hub__export-note { font-size: 13px; line-height: 1.55; color: var(--text-secondary); margin: 0; }',
  '.analytics-output-hub__readings { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-4, 16px); margin: var(--space-3, 12px) 0; }',
  '.analytics-output-hub__reading { border-left: 3px solid var(--border); padding-left: var(--space-3, 12px); min-width: 0; }',
  '.analytics-output-hub dt { font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-bottom: var(--space-1, 4px); }',
  '.analytics-output-hub dd { font-size: 14px; line-height: 1.5; margin: 0; overflow-wrap: anywhere; }',
  '.analytics-output-hub__menu { position: relative; flex: none; }',
  '.analytics-output-hub__menu > summary { list-style: none; display: inline-flex; align-items: center; gap: var(--space-2, 8px); min-height: 38px; padding: var(--space-2, 8px) var(--space-3, 12px); border: 1px solid var(--border-strong, var(--border)); border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; white-space: nowrap; }',
  '.analytics-output-hub__menu > summary::-webkit-details-marker { display: none; }',
  ".analytics-output-hub__menu > summary::after { content: ''; width: 6px; height: 6px; margin-top: -3px; border-right: 2px solid currentColor; border-bottom: 2px solid currentColor; transform: rotate(45deg); }",
  '.analytics-output-hub__menu[open] > summary::after { margin-top: 3px; transform: rotate(225deg); }',
  '.analytics-output-hub__menu-panel { position: absolute; right: 0; z-index: 20; width: 300px; max-width: calc(100vw - 48px); margin-top: var(--space-1, 4px); padding: var(--space-2, 8px); display: grid; gap: var(--space-1, 4px); border: 1px solid var(--border); border-radius: var(--radius-md, 10px); background: var(--bg-surface); box-shadow: var(--shadow-md, 0 6px 16px rgba(15, 23, 42, .12)); }',
  '.analytics-output-hub__menu-label { margin: var(--space-1, 4px) var(--space-2, 8px) 0; font-size: 12px; font-weight: 600; color: var(--text-secondary); }',
  '.analytics-output-hub button { border: 0; border-radius: 6px; background: transparent; color: var(--text-primary); font: inherit; font-size: 13px; line-height: 1.4; padding: var(--space-2, 8px); cursor: pointer; min-height: 36px; width: 100%; overflow-wrap: anywhere; text-align: left; }',
  '.analytics-output-hub button:hover:not(:disabled) { background: var(--bg-subtle, rgba(17, 124, 128, .08)); color: var(--accent, #117c80); }',
  '.analytics-output-hub button:focus-visible, .analytics-output-hub summary:focus-visible { outline: 2px solid var(--accent, #117c80); outline-offset: 2px; }',
  '.analytics-output-hub button:disabled { color: var(--text-secondary); opacity: .7; cursor: not-allowed; }',
  '.analytics-output-hub__summary { font-weight: 600 !important; }',
  '.analytics-output-hub__export-note { padding: var(--space-1, 4px) var(--space-2, 8px); font-size: 12px; }',
  '.analytics-output-hub__more { display: flex; flex-wrap: wrap; align-items: center; justify-content: flex-end; gap: var(--space-2, 8px) var(--space-4, 16px); flex: none; max-width: 100%; }',
  '.analytics-output-hub__more > details:not(.analytics-output-hub__menu) { position: relative; }',
  '.analytics-output-hub__more > details:not(.analytics-output-hub__menu) > summary { cursor: pointer; font-size: 13px; font-weight: 600; color: var(--text-secondary); }',
  '.analytics-output-hub__popover { position: absolute; right: 0; z-index: 20; width: 380px; max-width: calc(100vw - 48px); margin-top: var(--space-1, 4px); padding: var(--space-3, 12px); display: grid; gap: var(--space-2, 8px); border: 1px solid var(--border); border-radius: var(--radius-md, 10px); background: var(--bg-surface); box-shadow: var(--shadow-md, 0 6px 16px rgba(15, 23, 42, .12)); }',
  '.analytics-output-hub__popover a { font-size: 13px; }',
  '@media (max-width: 700px) { .analytics-output-hub { padding: var(--space-4, 16px); } .analytics-output-hub h2 { font-size: 18px; } .analytics-output-hub__heading { flex-direction: column; gap: var(--space-2, 8px); } .analytics-output-hub__more { justify-content: flex-start; flex: 1 1 auto; } .analytics-output-hub__menu-panel, .analytics-output-hub__popover { left: 0; right: auto; } .analytics-output-hub__readings { grid-template-columns: 1fr; gap: var(--space-3, 12px); } .analytics-output-hub button { min-height: 44px; } }',
].join('\n')

const installations = new WeakMap<HTMLElement, () => void>()

const ANALYTICS_GLOSSARY = [
  ['Exclude Contracts', 'Shows itemized sales; contracts without product detail are excluded, so this is not complete company revenue.'],
  ['WAPE', 'Total absolute prediction error divided by total absolute actual sales, expressed as a percentage; lower is better.'],
  ['Bias', 'Mean prediction minus actual in target units: positive means overforecast, negative means underforecast.'],
  ['Approval pending', 'The required reviewer has not recorded acceptance; technical checks alone do not grant approval.'],
  ['Last observed value', 'A baseline that repeats the latest recorded value available at the forecast origin.'],
] as const

/** Explain existing outputs; never calculate replacement measures or activate models. */
export function installAnalyticsOutputHub(root: HTMLElement) {
  installations.get(root)?.()
  const style = document.createElement('style')
  style.dataset.analyticsOutputStyle = 'true'
  style.textContent = ANALYTICS_OUTPUT_HUB_STYLE
  document.head.append(style)
  let disposed = false
  let frame = 0
  const bindings: Array<{ hub: HTMLElement; dispose: () => void; refresh: () => void }> = []
  const refreshByPage = new Map<HTMLElement, () => void>()
  const pendingRefreshes = new Set<() => void>()
  const visible = (element: HTMLElement | null): element is HTMLElement =>
    Boolean(element?.isConnected && !element.closest('[hidden], [aria-hidden="true"]') && element.getClientRects().length)
  // A closed disclosure still has layout rects, so a finding inside one is not "displayed".
  // Exports stay reachable from there: they act on the current panel state, not on what is on screen.
  const displayed = (element: HTMLElement | null): element is HTMLElement => visible(element) && element.checkVisibility()
  const sourceReady = () => !disposed && root.dataset.sourceState === 'ready'
  const setText = (element: HTMLElement, value: string) => {
    if (element.textContent !== value) element.textContent = value
  }
  const setDisabled = (button: HTMLButtonElement, value: boolean) => {
    if (button.disabled !== value) button.disabled = value
  }

  for (const definition of TAB_ANALYTICS_PRESENTATION) {
    const page = root.querySelector<HTMLElement>('#page-' + definition.page)
    if (!page) continue
    const hub = document.createElement('section')
    hub.className = 'analytics-output-hub'
    hub.dataset.analyticsTab = definition.page
    const title = document.createElement('h2')
    title.id = 'analyticsOutputTitle-' + definition.page
    title.textContent = definition.question
    hub.setAttribute('aria-labelledby', title.id)
    const evidence = document.createElement('p')
    evidence.className = 'analytics-output-hub__evidence'
    evidence.textContent = definition.evidence
    const scope = document.createElement('p')
    scope.className = 'analytics-output-hub__scope'
    scope.textContent = definition.scope
    const readings = document.createElement('dl')
    readings.className = 'analytics-output-hub__readings'
    const fields = definition.readings.map(reading => {
      const item = document.createElement('div')
      item.className = 'analytics-output-hub__reading'
      const label = document.createElement('dt')
      label.textContent = reading.label
      const value = document.createElement('dd')
      value.dataset.analyticsReadout = reading.label
      value.setAttribute('aria-live', 'polite')
      item.append(label, value)
      readings.append(item)
      return { reading, value }
    })
    const menu = document.createElement('details')
    menu.className = 'analytics-output-hub__menu'
    const menuTitle = document.createElement('summary')
    menuTitle.textContent = 'Exports and links'
    const actions = document.createElement('div')
    actions.className = 'analytics-output-hub__menu-panel'
    actions.setAttribute('role', 'group')
    actions.setAttribute('aria-label', definition.name + ' outputs')
    menu.append(menuTitle, actions)
    const summaryButton = document.createElement('button')
    summaryButton.type = 'button'
    summaryButton.className = 'analytics-output-hub__summary'
    summaryButton.dataset.analyticsSummary = definition.page
    summaryButton.textContent = 'Download displayed summary'
    actions.append(summaryButton)
    const outputButtons = definition.outputs.map(output => {
      const button = document.createElement('button')
      button.type = 'button'
      button.dataset.analyticsNativeOutput = output.selector
      button.textContent = /^(Export|Download)\b/.test(output.label) ? output.label : 'Export ' + output.label
      actions.append(button)
      return { output, button }
    })
    const note = document.createElement('p')
    note.className = 'analytics-output-hub__export-note'
    note.textContent = 'The summary captures displayed text. Use each source-specific export for full values, identities and method details.'
    actions.append(note)
    const jumpLabel = document.createElement('p')
    jumpLabel.className = 'analytics-output-hub__menu-label'
    jumpLabel.textContent = 'Go to'
    actions.append(jumpLabel)
    const sectionButtons = definition.sections.map(section => {
      const button = document.createElement('button')
      button.type = 'button'
      button.dataset.analyticsSection = section.selector
      button.textContent = section.label
      actions.append(button)
      return { section, button }
    })
    const details = document.createElement('details')
    details.setAttribute('name', 'analytics-help-' + definition.page)
    const detailsTitle = document.createElement('summary')
    detailsTitle.textContent = 'How to interpret these outputs'
    const interpretation = document.createElement('p')
    interpretation.textContent = definition.interpretation
    const detailsPanel = document.createElement('div')
    detailsPanel.className = 'analytics-output-hub__popover'
    detailsPanel.append(scope, interpretation)
    details.append(detailsTitle, detailsPanel)
    const glossary = document.createElement('details')
    glossary.id = 'analyticsGlossary-' + definition.page
    glossary.setAttribute('name', 'analytics-help-' + definition.page)
    const glossaryTitle = document.createElement('summary')
    glossaryTitle.textContent = 'Key terms'
    const glossaryPanel = document.createElement('div')
    glossaryPanel.className = 'analytics-output-hub__popover'
    glossary.append(glossaryTitle, glossaryPanel)
    for (const [term, meaning] of ANALYTICS_GLOSSARY) {
      const line = document.createElement('p')
      const label = document.createElement('strong')
      label.textContent = term + ': '
      label.title = meaning
      line.append(label, meaning)
      glossaryPanel.append(line)
    }
    const glossaryLink = document.createElement('a')
    glossaryLink.href = '#' + glossary.id
    glossaryLink.textContent = 'Read key terms'
    glossaryLink.addEventListener('click', () => { glossary.open = true })
    detailsPanel.append(glossaryLink)
    const heading = document.createElement('div')
    heading.className = 'analytics-output-hub__heading'
    const headingText = document.createElement('div')
    headingText.append(evidence, title)
    const more = document.createElement('div')
    more.className = 'analytics-output-hub__more'
    more.append(details, glossary, menu)
    heading.append(headingText, more)
    hub.append(heading, readings)
    page.prepend(hub)
    // The diagnostic shortcut is a page action, so it belongs with the other page actions.
    const shortcut = page.querySelector<HTMLButtonElement>(':scope > [data-diagnostic-shortcut]')
    if (shortcut) actions.append(shortcut)

    const collect = () => fields.map(({ reading }) => {
      const target = reading.selectors.map(selector => page.querySelector<HTMLElement>(selector)).find(reading.includeCollapsed ? visible : displayed)
      return { label: reading.label, text: target?.textContent?.replace(/\s+/g, ' ').trim() ?? '' }
    })
    const refresh = () => {
      if (!hub.isConnected || disposed) return
      const ready = sourceReady()
      const current = ready ? collect() : []
      const loading = (!ready && root.dataset.sourceState !== 'unavailable') || current.some(item => /^Loading\b/i.test(item.text))
      fields.forEach(({ value }, index) => setText(value, current[index]?.text
        || (ready ? 'No current readout in this panel yet. Use the controls below.' : loading ? 'Loading (can take up to a minute)' : 'Source unavailable. Reload to retry.')))
      hub.setAttribute('aria-busy', String(loading))
      setDisabled(summaryButton, !ready || loading || !current.some(item => item.text))
      summaryButton.title = summaryButton.disabled ? (loading ? 'Export disabled while source evidence loads.' : 'Export disabled: no displayed evidence.') : 'Download the displayed findings and their limitations.'
      setText(note, loading ? 'Exports disabled while source evidence loads.' : !ready ? 'Exports disabled: source evidence is unavailable.' : 'The summary captures displayed text. Use each source-specific export for full values, identities and method details.')
      for (const { output, button } of outputButtons) {
        const target = page.querySelector<HTMLButtonElement>(output.selector)
        const enabled = ready && visible(target) && !target.disabled && target.getAttribute('aria-disabled') !== 'true'
        setDisabled(button, !enabled)
        button.title = enabled ? 'Use the existing output and its current controls.' : 'Open the relevant output panel and load its evidence first.'
      }
      for (const { section, button } of sectionButtons) setDisabled(button, !ready || !page.querySelector(section.selector))
    }
    const click = (event: Event) => {
      const button = (event.target as Element).closest<HTMLButtonElement>('button')
      if (!button || button.disabled || !hub.contains(button) || !sourceReady()) return
      const native = button.dataset.analyticsNativeOutput
      if (native) {
        const target = page.querySelector<HTMLButtonElement>(native)
        if (visible(target) && !target.disabled && target.getAttribute('aria-disabled') !== 'true') {
          menu.open = false
          menuTitle.focus()
          target.click()
        }
        return
      }
      const section = button.dataset.analyticsSection
      if (section) {
        const target = page.querySelector<HTMLElement>(section)
        if (!target) return
        for (let closed = target.closest('details:not([open])'); closed; closed = target.closest('details:not([open])')) (closed as HTMLDetailsElement).open = true
        menu.open = false
        target.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
        const focusTarget = target instanceof HTMLDetailsElement
          ? target.querySelector<HTMLElement>(':scope > summary') ?? target
          : target
        if (focusTarget === target && !target.hasAttribute('tabindex')) target.tabIndex = -1
        focusTarget.focus({ preventScroll: true })
        return
      }
      if (!button.dataset.analyticsSummary) {
        menu.open = false
        return
      }
      const current = collect()
      if (!current.some(item => item.text)) return
      const snapshot = {
        schema_version: 'medshield_displayed_tab_summary_v1',
        tab: definition.name,
        captured_at: new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' }),
        timezone: 'Asia/Manila',
        evidence_type: definition.evidence,
        scope_note: definition.scope,
        displayed_readouts: current.filter(item => item.text),
        interpretation: definition.interpretation,
        provenance_note: note.textContent,
        source_identity: null,
        source_identity_note: 'Use the source-specific export for its source/run/assumption identities.',
        approval_granted_by_export: false,
      }
      const url = URL.createObjectURL(new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json;charset=utf-8' }))
      const link = document.createElement('a')
      link.href = url
      link.download = 'medshield-' + definition.page + '-displayed-summary.json'
      link.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 0)
      menu.open = false
      menuTitle.focus()
    }
    hub.addEventListener('click', click)
    const closeOverlays = (event: Event) => {
      for (const overlay of [menu, details, glossary]) {
        if (!overlay.open) continue
        if (event instanceof KeyboardEvent) {
          if (event.key !== 'Escape') continue
          const focused = document.activeElement
          overlay.open = false
          // Focus falls to the body after a click on a disabled item; other controls keep theirs.
          if (overlay.contains(focused) || focused === document.body) overlay.querySelector<HTMLElement>(':scope > summary')?.focus()
        } else if (!overlay.contains(event.target as Node) && event.target !== glossaryLink) {
          overlay.open = false
        }
      }
    }
    document.addEventListener('click', closeOverlays)
    document.addEventListener('keydown', closeOverlays)
    bindings.push({ hub, refresh, dispose: () => {
      hub.removeEventListener('click', click)
      document.removeEventListener('click', closeOverlays)
      document.removeEventListener('keydown', closeOverlays)
      if (shortcut?.isConnected) page.prepend(shortcut)
      hub.remove()
    } })
    refreshByPage.set(page, refresh)
  }
  const schedule = (refresh?: () => void) => {
    if (disposed) return
    if (refresh) pendingRefreshes.add(refresh)
    else bindings.forEach(binding => pendingRefreshes.add(binding.refresh))
    if (frame) return
    frame = window.requestAnimationFrame(() => {
      frame = 0
      const current = [...pendingRefreshes]
      pendingRefreshes.clear()
      current.forEach(update => update())
    })
  }
  const observer = new MutationObserver(records => {
    // Page-local findings and controls cannot change another page's companion.
    // Source/root changes remain global; navigation dirties both departing and arriving pages.
    for (const target of new Set(records.map(record => record.target))) {
      const element = target instanceof Element ? target : target.parentElement
      if (element?.closest('.analytics-output-hub')) continue
      const page = element?.closest<HTMLElement>('.page')
      const refresh = page ? refreshByPage.get(page) : undefined
      schedule(refresh)
      if (!refresh) return
    }
  })
  observer.observe(root, {
    subtree: true, childList: true, characterData: true, attributes: true,
    attributeFilter: ['class', 'hidden', 'disabled', 'aria-disabled', 'data-source-state', 'open'],
  })
  bindings.forEach(binding => binding.refresh())
  const dispose = () => {
    if (disposed) return
    disposed = true
    observer.disconnect()
    if (frame) window.cancelAnimationFrame(frame)
    pendingRefreshes.clear()
    refreshByPage.clear()
    bindings.forEach(binding => binding.dispose())
    style.remove()
    if (installations.get(root) === dispose) installations.delete(root)
  }
  installations.set(root, dispose)
  return dispose
}
