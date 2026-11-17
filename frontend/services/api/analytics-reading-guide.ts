/** Presentation only: no source values, forecast selection or approval changes. */
export function installAnalyticsReadingGuide(root: HTMLElement) {
  const pages = [
    { id: 'overview', title: 'Review recorded sales and the limits of the outlook', kind: 'Observed · Derived · Forecast · Scenario',
      meaning: 'Start with sales, gross profit and recorded-month coverage, then open the detailed analysis.',
      limit: 'Missing months are unknown. PHP sales do not measure medicine-unit demand; forecast and planning panels have separate scopes.',
      evidence: 'The four analysis cards and their scope notes explain the selected history and the separately evaluated forecasts.' },
    { id: 'revenue', title: 'Compare sales over matching recorded periods', kind: 'Observed · Derived',
      meaning: 'Review sales changes, supported gross profit and seasonal patterns in the available history.',
      limit: 'Gross profit is before operating expenses. A change or seasonal pattern does not establish its business cause.',
      evidence: 'Read the financial tables, comparison dates and coverage notes; absent months are not zero sales.' },
    { id: 'products', title: 'Choose products for commercial review', kind: 'Observed · Derived · Retrospective prediction',
      meaning: 'Compare recorded sales contribution and historical ABC classes, then review the separate classifier evaluation.',
      limit: 'Financial ABC is not clinical importance. Source labels are not verified physical SKUs; historical classifier results do not prove future performance.',
      evidence: 'Product contribution tables and the classifier comparison show their populations, periods and evaluation counts.' },
    { id: 'territory', title: 'Choose delivery areas for commercial review', kind: 'Observed · Derived · Proxy',
      meaning: 'Compare sales and matched growth across supported delivery labels; review exploratory geographic priorities separately.',
      limit: 'Delivery labels do not establish complete regional coverage. Derived geographic priorities are not verified disease risk or private-sector demand.',
      evidence: 'Use the area comparison, mapping notes and separate priority-model scope before interpreting a rank.' },
    { id: 'forecast', title: 'Review the sales outlook and past forecast errors', kind: 'Forecast · Retrospective evaluation',
      meaning: 'Compare sales-only forecasts with their historical errors at the stated leads and number of scored cases.',
      limit: 'These forecasts estimate pesos of sales, not how many units of each medicine are needed. Past error shows how forecasts did on months already checked, not how they will do in the future, so do not use them alone to decide what to buy.',
      evidence: 'The selected-scope evidence table, model comparison and downloadable evidence identify the forecast periods and case counts.' },
    { id: 'inventory', title: 'Compare planning choices under entered assumptions', kind: 'Scenario · Derived',
      meaning: 'Explore reorder, allocation and dated supply options using the assumptions you enter.',
      limit: 'Stock, lead time, costs and expiry inputs require verification. A feasible scenario is not an approved purchase or a measured reduction in stockouts.',
      evidence: 'Review the scenario inputs, feasibility messages and plan export together.' },
    { id: 'data', title: 'Check the source and its review status', kind: 'Observed · Provenance',
      meaning: 'Check which analytical source is in use and which source-review or publication gates remain open.',
      limit: 'Technical eligibility and candidate status do not certify completeness, financial correctness or business approval.',
      evidence: 'The source identity, coverage and review-status fields describe the analytical data available to this dashboard.' },
    { id: 'sales-data', title: 'Inspect the recorded sales behind the summaries', kind: 'Observed',
      meaning: 'Inspect source-labelled sales records and the filters used for the current reporting scope.',
      limit: 'Recorded lines can include signed adjustments and unresolved source questions; they do not establish stock balances or complete demand.',
      evidence: 'Use the filtered record table, source fields and export to trace a summary back to its reporting population.' },
    { id: 'weather-validation', title: 'Check whether external evidence is ready to use', kind: 'Observed · Derived · Proxy',
      meaning: 'Review provider coverage, matching dates and validation status before considering an external-data explanation.',
      limit: 'A matching pattern is not a causal effect. Unreviewed joins or unavailable providers cannot support an externally informed forecast.',
      evidence: 'Provider validation, date coverage and join-status notes show what is available and what still needs review.' },
    { id: 'external', title: 'Review external-variable research within its limits', kind: 'Retrospective research · Proxy',
      meaning: 'Inspect the available external-variable research and its validation status.',
      limit: 'Research needs reviewed joins and issue-time data vintages. Missing or unavailable evidence is not replaced with a forecast.',
      evidence: 'The research panel reports source availability, validation scope and any explicit unavailable reason.' },
  ]

  const financialPages = new Set(['overview', 'revenue', 'products', 'sales-data'])
  pages.forEach(({ id, title, kind, meaning, limit, evidence }) => {
    const page = root.querySelector<HTMLElement>(id === 'external' ? '#externalRegressionDetails' : `#page-${id}`)
    if (!page || page.querySelector('[data-analytics-reading]')) return
    // The evidence type and limit stay on screen; the rest is one click away.
    const guide = document.createElement('details')
    guide.className = 'analytics-reading-guide'
    guide.dataset.analyticsReading = id
    const summary = document.createElement('summary')
    const types = document.createElement('span')
    types.className = 'analytics-reading-guide__types'
    for (const type of kind.split(' · ')) {
      const tag = document.createElement('span')
      tag.className = 'analytics-evidence-tag'
      tag.textContent = type
      types.append(tag)
    }
    const limitLine = document.createElement('span')
    limitLine.className = 'analytics-reading-guide__limit'
    const limitLabel = document.createElement('strong')
    limitLabel.textContent = 'Limit: '
    limitLine.append(limitLabel, limit)
    const more = document.createElement('span')
    more.className = 'analytics-reading-guide__more'
    more.textContent = 'About this page'
    summary.append(types, limitLine, more)
    const heading = document.createElement('h2')
    heading.className = 'chart-title'
    heading.textContent = title
    guide.append(summary, heading)
    const lines = [['Evidence type', kind], ['Use this page to', meaning], ['Where to check', evidence]]
    if (financialPages.has(id)) lines.push(['Financial scope', 'Applies to financial totals. Product, area, quantity, diagnostic and model analyses remain itemized-only.'])
    for (const [label, value] of lines) {
      const paragraph = document.createElement('p')
      paragraph.className = 'chart-subtitle'
      const name = document.createElement('strong')
      name.textContent = label + ': '
      paragraph.append(name, document.createTextNode(value))
      guide.appendChild(paragraph)
    }
    if (page.tagName === 'DETAILS') page.querySelector('summary')?.after(guide)
    else page.prepend(guide)
  })

}
