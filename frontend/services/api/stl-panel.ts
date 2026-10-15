import Chart from 'chart.js/auto'
import { getJson } from './api-client'
import { stlViewModel, type StlRow } from './stl-view-model'

type StlResponse = { release: { fact_delta_version: number; dataset_id: string; policy_version: string }; parameters: { period: number; seasonal_window: number; robust: boolean; missing_policy: string }; rows: StlRow[] }

/** Optional warehouse capability: errors never substitute offline artifacts. */
export function installStlPanel(root: HTMLElement): () => void {
  const host = root.querySelector('[data-sales-output-panel="seasonality"]') || root.querySelector('#page-revenue')
  if (!host) return () => {}
  const section = document.createElement('section')
  section.className = 'chart-card'; section.id = 'descriptiveStlPanel'
  const title = document.createElement('h2'); title.textContent = 'Sales patterns across the full history — STL'
  const status = document.createElement('p'); status.setAttribute('role', 'status'); status.textContent = 'Checking validated Databricks STL…'
  section.append(title, status); host.append(section)
  let disposed = false
  const charts: Chart[] = []
  void getJson<StlResponse>('/api/seasonality/stl').then(data => {
    if (disposed) return
    const view = stlViewModel(data.rows)
    const investigate = (period: string) => {
      const row = data.rows.find(item => item.period === period)
      if (!row) return
      const end = new Date(Date.UTC(Number(period.slice(0,4)), Number(period.slice(5,7)), 0)).toISOString().slice(0,10)
      window.dispatchEvent(new CustomEvent('medshield:diagnostic-open', { detail: { start_date: period + '-01', end_date: end, label: 'STL residual period ' + period, expected_release: data.release } }))
    }
    const money = (value: number) => value.toLocaleString('en-PH', {style:'currency',currency:'PHP',maximumFractionDigits:0})
    const scope = document.createElement('p'); scope.className = 'chart-badge'
    scope.textContent = 'Full qualifying history · Independent of the date filter'
    section.insertBefore(scope, status)
    status.textContent = `${data.rows.length} qualifying months · ${data.rows[0].period}–${data.rows[data.rows.length - 1].period} · Candidate decomposition. Missing months remain blank.`
    const methodology = document.createElement('details'); methodology.className = 'chart-method'
    const methodologyHeading = document.createElement('summary'); methodologyHeading.textContent = 'STL scope and method'
    const methodologyText = document.createElement('p')
    methodologyText.textContent = `Only contiguous segments meeting the minimum history are included. Fact version ${data.release.fact_delta_version}. Period ${data.parameters.period}, seasonal window ${data.parameters.seasonal_window}, robust ${data.parameters.robust}. Missing months are not filled. This decomposition uses the full qualifying history independently of the date filter. Revenue seasonality does not establish disease causality or medicine quantities.`
    methodology.append(methodologyHeading, methodologyText)
    const trendNote = document.createElement('p'); trendNote.className = 'chart-subtitle'
    trendNote.textContent = `Within the latest qualifying segment (${view.first.period}–${view.latest.period}), fitted trend moved from ${money(view.first.trend)} to ${money(view.latest.trend)}. Breaks separate missing months or independently fitted segments; no change across a break is inferred.`
    const trendHeading = document.createElement('h3'); trendHeading.textContent = 'Underlying sales direction'
    section.append(trendHeading, trendNote)
    const compactMoney = (value: string | number) => '₱' + Number(value).toLocaleString('en-PH', { notation: 'compact', maximumFractionDigits: 1 })
    const chartOptions = {
      responsive: true, maintainAspectRatio: false, animation: false as const,
      interaction: { mode: 'index' as const, intersect: false },
      onClick: (_: unknown, elements: { index: number }[]) => { if (elements[0]) investigate(view.labels[elements[0].index]) },
      plugins: { legend: { position: 'bottom' as const, labels: { boxWidth: 10, padding: 12, font: { size: 11 } } },
        tooltip: { callbacks: { label: (context: { dataset: { label?: string }; raw: unknown }) => (context.dataset.label || '') + ': ' + money(Number(context.raw)) } } },
      scales: { x: { ticks: { autoSkip: true, maxTicksLimit: window.innerWidth < 600 ? 5 : 12, maxRotation: 0 } },
        y: { ticks: { callback: compactMoney }, title: { display: true, text: 'Revenue (₱)' } } },
    }
    const wrapper = document.createElement('div'); wrapper.className = 'chart-wrap stl-trend-wrap'
    const canvas = document.createElement('canvas'); canvas.setAttribute('aria-label', 'Observed revenue and STL trend; component values are in the table below'); canvas.setAttribute('role', 'img'); wrapper.append(canvas); section.append(wrapper)
    charts.push(new Chart(canvas, { type: 'line', data: { labels: view.labels, datasets: [
      { label: 'Observed revenue (₱)', data: view.observed, borderColor: '#1E3A5F', pointRadius: 2, spanGaps: false },
      { label: 'Underlying direction — STL trend (₱)', data: view.trend, borderColor: '#D97706', pointRadius: 1, spanGaps: false },
    ] }, options: chartOptions }))
    for (const [key, label, color] of [['seasonal', 'Seasonal component (₱)', '#0F766E'], ['residual', 'Residual (₱)', '#64748B']] as const) {
      const heading = document.createElement('h3'); heading.textContent = key === 'seasonal'
        ? 'Repeating monthly contribution — seasonal component'
        : 'Unusual periods — residual component'
      const note = document.createElement('p'); note.className = 'chart-subtitle'
      note.textContent = key === 'seasonal'
        ? `Fitted seasonal contribution ranges from ${money(view.low.seasonal)} (${view.low.period}) to ${money(view.high.seasonal)} (${view.high.period}). Values above zero add to the fitted trend; below zero subtract. This is historical revenue structure, not evidence of disease causality.`
        : `Largest unusual difference: ${money(view.unusual.residual)} in ${view.unusual.period}, selected by absolute residual size. Review source transactions and business context; a residual alone establishes neither a cause nor an error.`
      let target: HTMLElement = section
      if (key === 'residual') {
        const detail = document.createElement('details'); detail.id = 'stlResidualDetail'
        const summary = document.createElement('summary'); summary.textContent = 'Inspect unusual periods — residual detail'
        detail.append(summary); section.append(detail); target = detail
        detail.addEventListener('toggle', () => { if (detail.open) charts.forEach(chart => chart.resize()) })
        const inspect = document.createElement('button'); inspect.type = 'button'; inspect.className = 'btn btn-secondary'
        inspect.textContent = 'Investigate ' + view.unusual.period; inspect.onclick = () => investigate(view.unusual.period); target.append(inspect)
      }
      const wrap = document.createElement('div'); wrap.className = 'chart-wrap stl-component-wrap'
      const componentCanvas = document.createElement('canvas'); componentCanvas.setAttribute('role', 'img'); componentCanvas.setAttribute('aria-label', label + '; exact values in the component table')
      wrap.append(componentCanvas); target.append(heading, note, wrap)
      charts.push(new Chart(componentCanvas, {type:'line', data:{labels:view.labels, datasets:[
        {label, data:view[key], borderColor:color, pointRadius:2, spanGaps:false},
        {label:'Zero deviation', data:view.labels.map(()=>0), borderColor:'#94A3B8',borderDash:[4,4],borderWidth:1,pointRadius:0},
      ]}, options:{...chartOptions,scales:{...chartOptions.scales,y:{ticks:{callback:compactMoney},title:{display:true,text:'Deviation (₱)'}}}}}))
    }
    const exportButton = document.createElement('button'); exportButton.type = 'button'; exportButton.className = 'btn btn-secondary'; exportButton.textContent = 'Export STL components'
    exportButton.onclick = () => {
      const records: unknown[][] = [['Month','Observed PHP','Trend PHP','Seasonal PHP','Residual PHP','Segment start','Segment end','Dataset ID','Fact Delta version','Policy','Status'], ...data.rows.map(row=>[row.period,row.observed,row.trend,row.seasonal,row.residual,row.segment_start,row.segment_end,data.release.dataset_id,data.release.fact_delta_version,data.release.policy_version,'candidate_not_approved'])]
      const csv = records.map(row=>row.map(value=>'"'+String(value).replace(/"/g,'""')+'"').join(',')).join('\r\n')
      const url = URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}))
      const link = document.createElement('a'); link.href = url; link.download = 'medshield-stl-components.csv'; link.click(); setTimeout(()=>URL.revokeObjectURL(url),1000)
    }
    section.append(methodology, exportButton)
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
