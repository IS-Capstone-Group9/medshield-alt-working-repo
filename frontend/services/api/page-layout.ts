function disclosure(label: string, content?: Element, group?: string) {
  const details = document.createElement('details')
  details.className = 'dashboard-supporting-evidence'
  if (group) details.setAttribute('name', group)
  const summary = document.createElement('summary')
  summary.textContent = label
  details.append(summary)
  if (content) details.append(content)
  return details
}

const tableScrollRegions = '.plan-scroll, .area-review-scroll, .uploaded-data-table-wrap, [data-product-scroll], .table-responsive-wrap, .overview-summary-table'

function installTableScrollCues(root: HTMLElement) {
  let frame = 0
  let observed = new Set<Element>()
  const update = (region: HTMLElement) => {
    const canScrollRight = region.clientWidth > 0 && region.scrollLeft + region.clientWidth < region.scrollWidth - 1
    region.toggleAttribute('data-scroll-cue', canScrollRight)
  }
  const refresh = () => {
    frame = 0
    const targets = new Set<Element>()
    root.querySelectorAll<HTMLElement>(tableScrollRegions).forEach(region => {
      const table = region.querySelector('table')
      if (!table) return
      update(region)
      targets.add(region)
      targets.add(table)
    })
    observed.forEach(element => { if (!targets.has(element)) resize.unobserve(element) })
    targets.forEach(element => { if (!observed.has(element)) resize.observe(element) })
    observed = targets
  }
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(refresh)
  }
  const resize = new ResizeObserver(schedule)
  const changes = new MutationObserver(schedule)
  const onScroll = (event: Event) => {
    if (event.target instanceof HTMLElement && event.target.matches(tableScrollRegions)) update(event.target)
  }
  changes.observe(root, { childList: true, subtree: true })
  root.addEventListener('scroll', onScroll, true)
  schedule()
  return () => {
    cancelAnimationFrame(frame)
    resize.disconnect()
    changes.disconnect()
    root.removeEventListener('scroll', onScroll, true)
  }
}

export function installDashboardPageLayout(root: HTMLElement) {
  const wrappers: Element[] = []
  const forecast = root.querySelector('[data-forecast-validation]')
  const plotNote = forecast?.querySelector('#forecastPlotScope')
  const estimates = forecast?.querySelector('#forecastEstimatePanel')
  if (plotNote && estimates) plotNote.after(estimates)
  const metrics = forecast?.querySelector('#forecastMetrics')
  if (plotNote && metrics) plotNote.after(metrics)
  const research = forecast?.parentElement?.querySelectorAll(
    ':scope > :is(.current-research, .tournament-research, .regional-php-research, .unit-research)',
  )
  if (forecast && research?.length) {
    const group = disclosure('Historical forecast research')
    group.id = 'forecastResearchDetails'
    research.forEach(panel => {
      const label = panel.getAttribute('aria-label') ?? 'Forecast study'
      group.append(disclosure(`${label} · Research only`, panel, 'forecast-research'))
    })
    forecast.after(group)
    wrappers.push(group)
  }

  // Method notes follow the outputs they explain, so the KPIs come first.
  const salesOutputs = root.querySelector('#page-revenue #salesOutputSections')
  if (salesOutputs) {
    const card = document.createElement('div')
    card.id = 'salesSupportingEvidence'
    card.className = 'dashboard-supporting-evidence chart-card'
    card.append(...root.querySelectorAll('#page-revenue [data-metric-definitions], #page-revenue #salesScopeNotes'))
    salesOutputs.after(card)
    wrappers.push(card)
  }

  const area = root.querySelector('#page-territory')
  const areaDetails = area?.querySelectorAll(':scope > details:not([data-analytics-reading])')
  if (area && areaDetails?.length) {
    const card = document.createElement('div')
    card.className = 'dashboard-supporting-evidence chart-card'
    card.append(...areaDetails)
    area.append(card)
    wrappers.push(card)
  }

  const abc = root.querySelector('[data-abc-research]')
  if (abc) {
    const group = disclosure('ABC classifier · Retrospective research')
    group.id = 'productResearchDetails'
    const page = abc.parentElement
    group.append(abc)
    page?.append(group)
    wrappers.push(group)
  }

  const disposeScrollCues = installTableScrollCues(root)
  return () => {
    disposeScrollCues()
    // Each panel disposes itself; only the disclosure wrappers belong to this step.
    wrappers.forEach(wrapper => wrapper.remove())
  }
}
