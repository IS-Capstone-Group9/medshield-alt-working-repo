import Chart from 'chart.js/auto'
import { getJson } from './api-client'

type StlRow = { period: string; observed: number; trend: number; seasonal: number; residual: number }
type StlResponse = { release: { fact_delta_version: number }; parameters: { period: number; seasonal_window: number; robust: boolean; missing_policy: string }; rows: StlRow[] }

/** Optional warehouse capability: errors never substitute offline artifacts. */
export function installStlPanel(root: HTMLElement): () => void {
  const host = root.querySelector('#page-revenue')
  if (!host) return () => {}
  const section = document.createElement('section')
  section.className = 'chart-card'; section.id = 'descriptiveStlPanel'
  const title = document.createElement('h2'); title.textContent = 'Revenue seasonality — STL'
  const status = document.createElement('p'); status.setAttribute('role', 'status'); status.textContent = 'Checking validated Databricks STL…'
  section.append(title, status); host.append(section)
  let disposed = false
  let chart: Chart | undefined
  void getJson<StlResponse>('/api/seasonality/stl').then(data => {
    if (disposed) return
    status.textContent = `Candidate decomposition of the full published history; independent of the date filter. Fact version ${data.release.fact_delta_version}. Period ${data.parameters.period}, seasonal window ${data.parameters.seasonal_window}, robust ${data.parameters.robust}. Missing months are not filled. Revenue seasonality does not establish disease causality or medicine quantities.`
    const wrapper = document.createElement('div'); wrapper.style.height = '280px'
    const canvas = document.createElement('canvas'); canvas.setAttribute('aria-label', 'Observed revenue and STL trend; component values are in the table below'); canvas.setAttribute('role', 'img'); wrapper.append(canvas); section.append(wrapper)
    chart = new Chart(canvas, { type: 'line', data: { labels: data.rows.map(row => row.period), datasets: [
      { label: 'Observed revenue (₱)', data: data.rows.map(row => row.observed), borderColor: '#1E3A5F', pointRadius: 0 },
      { label: 'STL trend (₱)', data: data.rows.map(row => row.trend), borderColor: '#D97706', pointRadius: 0 },
    ] }, options: { responsive: true, maintainAspectRatio: false, animation: false } })
    const details = document.createElement('details'); const summary = document.createElement('summary'); summary.textContent = 'View observed, trend, seasonal and residual components'
    const scroll = document.createElement('div'); scroll.style.cssText = 'max-height:360px;overflow:auto'
    const table = document.createElement('table'); const head = table.createTHead().insertRow()
    for (const name of ['Month', 'Observed (₱)', 'Trend (₱)', 'Seasonal (₱)', 'Residual (₱)']) { const th = document.createElement('th'); th.scope = 'col'; th.textContent = name; head.append(th) }
    const body = table.createTBody()
    for (const row of data.rows) { const tr = body.insertRow(); for (const value of [row.period, row.observed, row.trend, row.seasonal, row.residual]) tr.insertCell().textContent = typeof value === 'number' ? value.toLocaleString('en-PH', { maximumFractionDigits: 2 }) : value }
    scroll.append(table); details.append(summary, scroll); section.append(details)
  }).catch(() => { if (!disposed) status.textContent = 'STL is unavailable for this dataset version. Calendar-month averages are not STL. Financial reporting remains available; an authorized operator must publish validated components in Databricks.' })
  return () => { disposed = true; chart?.destroy(); section.remove() }
}
