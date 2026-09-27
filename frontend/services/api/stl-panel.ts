import Chart from 'chart.js/auto'
import { getJson } from './api-client'

type StlRow = { period: string; observed: number; trend: number; seasonal: number; residual: number; segment_start: string; segment_end: string }
type StlResponse = { release: { fact_delta_version: number; dataset_id: string; policy_version: string }; parameters: { period: number; seasonal_window: number; robust: boolean; missing_policy: string }; rows: StlRow[] }

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
  const charts: Chart[] = []
  void getJson<StlResponse>('/api/seasonality/stl').then(data => {
    if (disposed) return
    status.textContent = `${data.rows.length} qualifying observed months (${data.rows[0].period}–${data.rows[data.rows.length - 1].period}); candidate decomposition independent of the date filter. Only contiguous segments meeting the minimum history are included. Fact version ${data.release.fact_delta_version}. Period ${data.parameters.period}, seasonal window ${data.parameters.seasonal_window}, robust ${data.parameters.robust}. Missing months are not filled. Revenue seasonality does not establish disease causality or medicine quantities.`
    const wrapper = document.createElement('div'); wrapper.style.height = '280px'
    const canvas = document.createElement('canvas'); canvas.setAttribute('aria-label', 'Observed revenue and STL trend; component values are in the table below'); canvas.setAttribute('role', 'img'); wrapper.append(canvas); section.append(wrapper)
    charts.push(new Chart(canvas, { type: 'line', data: { labels: data.rows.map(row => row.period), datasets: [
      { label: 'Observed revenue (₱)', data: data.rows.map(row => row.observed), borderColor: '#1E3A5F', pointRadius: 0 },
      { label: 'STL trend (₱)', data: data.rows.map(row => row.trend), borderColor: '#D97706', pointRadius: 0 },
    ] }, options: { responsive: true, maintainAspectRatio: false, animation: false } }))
    for (const [key, label, color] of [['seasonal', 'Seasonal component (₱)', '#0F766E'], ['residual', 'Residual (₱)', '#64748B']] as const) {
      const heading = document.createElement('h3'); heading.textContent = label
      const wrap = document.createElement('div'); wrap.style.height = '180px'
      const componentCanvas = document.createElement('canvas'); componentCanvas.setAttribute('role', 'img'); componentCanvas.setAttribute('aria-label', label + '; exact values in the component table')
      wrap.append(componentCanvas); section.append(heading, wrap)
      charts.push(new Chart(componentCanvas, {type:'line', data:{labels:data.rows.map(row=>row.period), datasets:[{label, data:data.rows.map(row=>row[key]), borderColor:color, pointRadius:0, spanGaps:false}]}, options:{responsive:true,maintainAspectRatio:false,animation:false}}))
    }
    const exportButton = document.createElement('button'); exportButton.type = 'button'; exportButton.className = 'btn btn-secondary'; exportButton.textContent = 'Export STL components'
    exportButton.onclick = () => {
      const records: unknown[][] = [['Month','Observed PHP','Trend PHP','Seasonal PHP','Residual PHP','Segment start','Segment end','Dataset ID','Fact Delta version','Policy','Status'], ...data.rows.map(row=>[row.period,row.observed,row.trend,row.seasonal,row.residual,row.segment_start,row.segment_end,data.release.dataset_id,data.release.fact_delta_version,data.release.policy_version,'candidate_not_approved'])]
      const csv = records.map(row=>row.map(value=>'"'+String(value).replace(/"/g,'""')+'"').join(',')).join('\r\n')
      const url = URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}))
      const link = document.createElement('a'); link.href = url; link.download = 'medshield-stl-components.csv'; link.click(); setTimeout(()=>URL.revokeObjectURL(url),1000)
    }
    section.append(exportButton)
    const details = document.createElement('details'); const summary = document.createElement('summary'); summary.textContent = 'View observed, trend, seasonal and residual components'
    const scroll = document.createElement('div'); scroll.style.cssText = 'max-height:360px;overflow:auto'
    const table = document.createElement('table'); const head = table.createTHead().insertRow()
    for (const name of ['Month', 'Observed (₱)', 'Trend (₱)', 'Seasonal (₱)', 'Residual (₱)']) { const th = document.createElement('th'); th.scope = 'col'; th.textContent = name; head.append(th) }
    const body = table.createTBody()
    for (const row of data.rows) { const tr = body.insertRow(); for (const value of [row.period, row.observed, row.trend, row.seasonal, row.residual]) tr.insertCell().textContent = typeof value === 'number' ? value.toLocaleString('en-PH', { maximumFractionDigits: 2 }) : value }
    scroll.append(table); details.append(summary, scroll); section.append(details)
  }).catch(() => { if (!disposed) status.textContent = 'STL is unavailable for this dataset version. Calendar-month averages are not STL. Financial reporting remains available; an authorized operator must publish validated components in Databricks.' })
  return () => { disposed = true; charts.forEach(chart => chart.destroy()); section.remove() }
}
