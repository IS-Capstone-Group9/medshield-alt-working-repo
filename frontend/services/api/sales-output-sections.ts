/** Keep one shared filter scope while giving each analytical question its own panel. */
export function installSalesOutputSections(root: Element) {
  const page = root.querySelector<HTMLElement>('#page-revenue')
  if (!page) return
  let container = page.querySelector<HTMLElement>('#salesOutputSections')
  if (!container) {
    container = document.createElement('section')
    container.id = 'salesOutputSections'
    container.innerHTML = '<div class="sales-output-nav" role="tablist" aria-label="Sales analytical outputs"></div><p id="salesOutputScope" class="chart-subtitle"></p>'
    const navigation = container.querySelector('.sales-output-nav')!
    const definitions = [
      ['trend', 'Sales Trend', 'Observed sales and profit, with month-to-month movement.'],
      ['growth', 'Growth', 'Matched prior-year comparisons and the exact growth values.'],
      ['quantities', 'Quantities', 'Source quantities for one product; recorded units are not pack-normalized.'],
      ['seasonality', 'Seasonality', 'Historical patterns and candidate decomposition; this does not establish disease effects.'],
      ['diagnostics', 'Change investigation', 'Reconciled contributions, transaction evidence and unverified business hypotheses.'],
    ]
    const activate = (name: string, focus = false) => {
      for (const button of container!.querySelectorAll<HTMLButtonElement>('[data-sales-output-tab]')) {
        const selected = button.dataset.salesOutputTab === name
        button.setAttribute('aria-selected', String(selected))
        button.tabIndex = selected ? 0 : -1
        if (selected && focus) button.focus()
      }
      for (const panel of container!.querySelectorAll<HTMLElement>('[data-sales-output-panel]')) {
        panel.hidden = panel.dataset.salesOutputPanel !== name
        if (!panel.hidden) requestAnimationFrame(() => {
          panel.querySelectorAll('canvas').forEach(canvas => {
            const chart = (window as any).Chart?.getChart(canvas)
            if (chart?.canvas?.isConnected) chart.resize()
          })
        })
      }
    }
    definitions.forEach(([name, label, note]) => {
      const button = document.createElement('button')
      button.type = 'button'; button.id = 'salesOutputTab-' + name
      button.dataset.salesOutputTab = name; button.textContent = label
      button.setAttribute('role', 'tab'); button.setAttribute('aria-controls', 'salesOutputPanel-' + name)
      button.addEventListener('click', () => activate(name))
      button.addEventListener('keydown', event => {
        const current = definitions.findIndex(([key]) => key === name)
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? definitions.length - 1
          : event.key === 'ArrowRight' ? (current + 1) % definitions.length
          : event.key === 'ArrowLeft' ? (current + definitions.length - 1) % definitions.length : -1
        if (next < 0) return
        event.preventDefault(); activate(definitions[next][0], true)
      })
      navigation.append(button)
      const panel = document.createElement('section')
      panel.id = 'salesOutputPanel-' + name; panel.dataset.salesOutputPanel = name
      panel.setAttribute('role', 'tabpanel'); panel.setAttribute('aria-labelledby', button.id)
      panel.innerHTML = '<h2 class="sales-output-heading">' + label + '</h2><p class="sales-output-description">' + note + '</p>'
      container!.append(panel)
    })
    const first = page.querySelector('#revenueDetailChart')?.closest('.chart-card')
    if (first) first.before(container)
    else page.append(container)
    activate('trend')
  }
  const panel = (name: string) => container!.querySelector<HTMLElement>('[data-sales-output-panel="' + name + '"]')!
  const move = (node: Element | null | undefined, name: string) => {
    if (node && node.parentElement !== panel(name)) panel(name).append(node)
  }
  move(root.querySelector('#revenueDetailChart')?.closest('.chart-card'), 'trend')
  move(root.querySelector('#salesMovementCard'), 'trend')
  move(root.querySelector('#growthChart')?.closest('.chart-grid-2'), 'growth')
  move(root.querySelector('[data-sales-growth-detail]'), 'growth')
  move(root.querySelector('#quantityTrendChart')?.closest('.chart-card'), 'quantities')
  move(root.querySelector('#descriptiveStlPanel'), 'seasonality')
  move(root.querySelector('#salesDiagnosticInvestigation'), 'diagnostics')
  root.querySelectorAll('.dss-insight-card').forEach(card => {
    const badge = card.querySelector('.insight-badge')?.textContent?.trim()
    if (badge === 'DSS Executive Takeaway') move(card, 'growth')
    if (badge === 'Seasonality Pattern Recognition') move(card, 'seasonality')
  })
  const deepDive = page.querySelector('[data-sales-diagnostics-deep-dive]')
  if (deepDive && !deepDive.children.length) deepDive.remove()
}
