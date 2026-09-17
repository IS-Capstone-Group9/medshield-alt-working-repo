import Chart, { type ChartConfiguration } from 'chart.js/auto'
import type {
  AreaPoint,
  DashboardData,
  ExternalSignalPoint,
  MonthlyPoint,
  RegionalPriority,
} from '@/types/api.types'

const dashboardDataByRoot = new WeakMap<HTMLElement, DashboardData>()

const chartColors = [
  { border: '#1E3A5F', fill: 'rgba(30, 58, 95, 0.16)' },
  { border: '#D97706', fill: 'rgba(217, 119, 6, 0.16)' },
  { border: '#0D7045', fill: 'rgba(13, 112, 69, 0.14)' },
]

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function phtCalendarMonth(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit',
  }).formatToParts(new Date())
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}`
}

function shiftMonth(period: string, offset: number): string {
  const [year, month] = period.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1 + offset, 1))
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

function periodSelection(root: HTMLElement) {
  const mode = root.querySelector<HTMLSelectElement>('#descriptivePeriodSelect')?.value ?? '12'
  const start = root.querySelector<HTMLInputElement>('#customDateStart')?.value ?? ''
  const end = root.querySelector<HTMLInputElement>('#customDateEnd')?.value ?? ''
  return { mode, start, end }
}

function compactCurrency(value: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

function formatPeriod(period: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(period)
  if (!match) return period
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1))
  return new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

function aggregateMonthly(
  rows: MonthlyPoint[],
  selection: { mode: string; start: string; end: string }
): MonthlyPoint[] {
  const totals = new Map<string, { revenue: number; income: number }>()
  const end = phtCalendarMonth()
  const monthCount = Number(selection.mode)
  const start = Number.isFinite(monthCount) ? shiftMonth(end, -(monthCount - 1)) : ''
  for (const row of rows) {
    if (!row.period || !finite(row.revenue) || !finite(row.income)) continue
    if (selection.mode === '30d') continue
    if (selection.mode === 'custom'
      && (row.period < selection.start.slice(0, 7) || row.period > selection.end.slice(0, 7))) continue
    if (selection.mode !== 'custom' && selection.mode !== 'all' && (row.period < start || row.period > end)) continue
    const aggregatePeriod = selection.mode === 'all' ? row.period.slice(0, 4) : row.period
    const current = totals.get(aggregatePeriod) ?? { revenue: 0, income: 0 }
    current.revenue += row.revenue
    current.income += row.income
    totals.set(aggregatePeriod, current)
  }

  return [...totals.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([period, values]) => ({ period, ...values }))
}

function monthlyRowsForView(
  rows: MonthlyPoint[],
  selection: { mode: string; start: string; end: string }
): MonthlyPoint[] {
  return aggregateMonthly(rows, selection)
}

function aggregateDiseaseSignals(rows: ExternalSignalPoint[], yearly = false): Map<string, number> {
  const values = new Map<string, number[]>()
  for (const row of rows) {
    if (!row.period || !finite(row.disease_intensity_index)) continue
    const aggregatePeriod = yearly ? row.period.slice(0, 4) : row.period
    const periodValues = values.get(aggregatePeriod) ?? []
    periodValues.push(row.disease_intensity_index)
    values.set(aggregatePeriod, periodValues)
  }

  return new Map(
    [...values.entries()].map(([period, periodValues]) => [
      period,
      periodValues.reduce((sum, value) => sum + value, 0) / periodValues.length,
    ])
  )
}

function pearsonCorrelation(pairs: Array<[number, number]>): number | null {
  if (pairs.length < 3) return null
  const xMean = pairs.reduce((sum, [x]) => sum + x, 0) / pairs.length
  const yMean = pairs.reduce((sum, [, y]) => sum + y, 0) / pairs.length
  let numerator = 0
  let xVariance = 0
  let yVariance = 0

  for (const [x, y] of pairs) {
    const xDelta = x - xMean
    const yDelta = y - yMean
    numerator += xDelta * yDelta
    xVariance += xDelta ** 2
    yVariance += yDelta ** 2
  }

  const denominator = Math.sqrt(xVariance * yVariance)
  return denominator > 0 ? numerator / denominator : null
}

function updateChartCard(
  canvas: HTMLCanvasElement,
  copy: { title: string; subtitle: string; badge: string; status?: string; statusClass?: string }
) {
  const card = canvas.closest<HTMLElement>('.chart-card')
  if (!card) return
  const title = card.querySelector<HTMLElement>('.chart-title')
  const status = title?.querySelector<HTMLElement>('.status-pill')
  const subtitle = card.querySelector<HTMLElement>('.chart-subtitle')
  const badge = card.querySelector<HTMLElement>('.chart-badge')

  if (title) {
    if (status) {
      const titleText = [...title.childNodes].find((node) => node.nodeType === Node.TEXT_NODE)
      if (titleText) titleText.textContent = `${copy.title} `
    } else {
      title.textContent = copy.title
    }
  }
  if (subtitle) subtitle.textContent = copy.subtitle
  if (badge) badge.textContent = copy.badge
  if (status && copy.status) {
    status.textContent = copy.status
    status.classList.remove('status-ready', 'status-draft', 'status-blocked')
    status.classList.add(copy.statusClass ?? 'status-draft')
  }
}

function replaceChart(canvas: HTMLCanvasElement, configuration: ChartConfiguration) {
  Chart.getChart(canvas)?.destroy()
  return new Chart(canvas, configuration)
}

function renderDiseaseDemandChart(root: HTMLElement, data: DashboardData) {
  const canvas = root.querySelector<HTMLCanvasElement>('#diseaseDemandChart')
  if (!canvas) return

  const selection = periodSelection(root)
  const monthly = monthlyRowsForView(data.monthly, selection)
  const yearly = selection.mode === 'all'
  if (!monthly.length) {
    Chart.getChart(canvas)?.destroy()
    updateChartCard(canvas, {
      title: selection.mode === '30d' ? 'Daily Sales vs. Disease Intensity' : 'Historical Sales vs. Disease Intensity',
      subtitle: selection.mode === '30d'
        ? 'Daily sales and disease data are unavailable; monthly totals are not expanded into synthetic days'
        : 'No aligned monthly observations are available for the selected historical period',
      badge: 'No source-backed observations',
      status: 'Unavailable',
      statusClass: 'status-draft',
    })
    return
  }

  const signalByPeriod = aggregateDiseaseSignals(data.externalSignals, yearly)
  const diseaseValues = monthly.map((row) => signalByPeriod.get(row.period) ?? null)
  const alignedPairs = monthly.flatMap((row) => {
    const diseaseValue = signalByPeriod.get(row.period)
    return finite(diseaseValue) ? [[row.revenue, diseaseValue] as [number, number]] : []
  })
  const correlation = pearsonCorrelation(alignedPairs)
  const hasDiseaseData = alignedPairs.length > 0

  updateChartCard(canvas, hasDiseaseData
    ? {
        title: 'Historical Sales vs. Disease Intensity',
        subtitle: `Loaded ${yearly ? 'annual' : 'monthly'} sales value (bars) and aligned disease intensity index (line)`,
        badge: 'Aligned observations',
        status: correlation === null
          ? `${alignedPairs.length} aligned rows`
          : `r = ${correlation >= 0 ? '+' : ''}${correlation.toFixed(2)} · n = ${alignedPairs.length}`,
        statusClass: 'status-ready',
      }
    : {
        title: `Historical ${yearly ? 'Annual' : 'Monthly'} Sales Profile`,
        subtitle: `Loaded ${yearly ? 'annual' : 'monthly'} sales value; no aligned disease-signal rows are available for this view`,
        badge: 'Sales data only',
        status: 'Disease feed unavailable',
        statusClass: 'status-draft',
      })

  const datasets: ChartConfiguration<'bar' | 'line'>['data']['datasets'] = [
    {
      type: 'bar',
      label: `${yearly ? 'Annual' : 'Monthly'} sales value`,
      data: monthly.map((row) => row.revenue),
      backgroundColor: 'rgba(30, 58, 95, 0.72)',
      borderColor: '#1E3A5F',
      borderWidth: 1,
      borderRadius: 3,
      yAxisID: 'sales',
    },
  ]

  if (hasDiseaseData) {
    datasets.push({
      type: 'line',
      label: 'Disease intensity index',
      data: diseaseValues,
      borderColor: '#D97706',
      backgroundColor: 'rgba(217, 119, 6, 0.12)',
      borderWidth: 2,
      pointRadius: 3,
      pointHoverRadius: 5,
      tension: 0.28,
      spanGaps: true,
      yAxisID: 'disease',
    })
  }

  replaceChart(canvas, {
    type: 'bar',
    data: {
      labels: monthly.map((row) => formatPeriod(row.period)),
      datasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } },
        tooltip: {
          callbacks: {
            label: (context) => context.dataset.yAxisID === 'sales'
              ? `${context.dataset.label}: ${compactCurrency(Number(context.raw))}`
              : `${context.dataset.label}: ${Number(context.raw).toFixed(2)}`,
          },
        },
      },
      scales: {
        x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true } },
        sales: {
          type: 'linear',
          position: 'left',
          beginAtZero: true,
          title: { display: true, text: 'Sales value (PHP)' },
          ticks: { callback: (value) => compactCurrency(Number(value)) },
        },
        disease: {
          type: 'linear',
          position: 'right',
          display: hasDiseaseData,
          beginAtZero: true,
          grid: { drawOnChartArea: false },
          title: { display: true, text: 'Disease intensity index' },
        },
      },
    },
  } as ChartConfiguration)
}

function normalizeScore(value: number, maximum: number): number {
  if (!finite(value) || maximum <= 0) return 0
  if (maximum <= 1) return Math.max(0, Math.min(100, value * 100))
  if (maximum <= 100) return Math.max(0, Math.min(100, value))
  return Math.max(0, Math.min(100, (value / maximum) * 100))
}

function supportedAreaRadarData(rows: AreaPoint[], priorities: RegionalPriority[]) {
  const validRows = rows
    .filter((row) => row.area && finite(row.revenue) && finite(row.income))
  if (!validRows.length) return null

  const publishedRanks = new Map(
    priorities
      .filter((row) => row.area && finite(row.priority_rank))
      .map((row) => [row.area, row.priority_rank])
  )
  const sortedRows = [...validRows].sort((left, right) => {
    const leftRank = publishedRanks.get(left.area)
    const rightRank = publishedRanks.get(right.area)
    if (finite(leftRank) && finite(rightRank)) return leftRank - rightRank
    if (finite(leftRank)) return -1
    if (finite(rightRank)) return 1
    return right.revenue - left.revenue
  })
  const maximumRevenue = Math.max(...validRows.map((row) => Math.max(0, row.revenue)), 0)
  const margins = validRows.map((row) => row.revenue > 0 ? Math.max(0, row.income / row.revenue) : 0)
  const maximumMargin = Math.max(...margins, 0)

  return {
    labels: ['Revenue scale', 'Margin ratio', 'Rank urgency'],
    datasets: sortedRows.slice(0, 3).map((row, index) => {
      const fallbackRank = sortedRows.findIndex((candidate) => candidate.area === row.area) + 1
      const rank = publishedRanks.get(row.area) ?? fallbackRank
      return {
        label: row.area,
        data: [
          normalizeScore(row.revenue, maximumRevenue),
          normalizeScore(row.revenue > 0 ? row.income / row.revenue : 0, maximumMargin),
          Math.max(0, Math.min(100, ((sortedRows.length - rank + 1) / sortedRows.length) * 100)),
        ],
        borderColor: chartColors[index].border,
        backgroundColor: chartColors[index].fill,
        borderWidth: 2,
        pointRadius: 3,
      }
    }),
  }
}

function ensureDecisionSupportHeading(page: HTMLElement, canvas: HTMLCanvasElement) {
  if (page.querySelector('[data-area-decision-heading]')) return
  const card = canvas.closest<HTMLElement>('.chart-card')
  const host = card?.parentElement
  if (!card || !host) return
  const heading = document.createElement('section')
  heading.className = 'area-decision-heading'
  heading.dataset.areaDecisionHeading = 'true'
  heading.setAttribute('aria-labelledby', 'areaDecisionHeadingTitle')
  heading.innerHTML = `
    <div class="area-section-eyebrow">03 · Decision support and epidemic triangulation</div>
    <h2 id="areaDecisionHeadingTitle">Territory priority profile and disease co-movement</h2>
    <p>Supported commercial criteria are normalized to 0–100. Disease intensity remains an external historical signal and is not used in the commercial MCDA candidate until validation is complete.</p>`
  host.parentElement?.insertBefore(heading, host)
}

function renderTerritoryRadarChart(root: HTMLElement, data: DashboardData) {
  const canvas = root.querySelector<HTMLCanvasElement>('#territoryRadarChart')
  if (!canvas) return

  const radarData = supportedAreaRadarData(data.byArea, data.regionalPriorities)
  if (!radarData) return
  const territoryPage = root.querySelector<HTMLElement>('#page-territory')
  if (territoryPage) ensureDecisionSupportHeading(territoryPage, canvas)

  updateChartCard(canvas, {
    title: 'Territory Priority Radar',
    subtitle: 'Revenue scale, margin ratio, and rank urgency normalized to a common 0–100 display scale',
    badge: 'Supported commercial criteria',
  })

  replaceChart(canvas, {
    type: 'radar',
    data: radarData,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'nearest', intersect: false },
      plugins: {
        legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } },
        tooltip: {
          callbacks: {
            label: (context) => `${context.dataset.label}: ${Number(context.raw).toFixed(1)}/100`,
          },
        },
      },
      scales: {
        r: {
          beginAtZero: true,
          min: 0,
          max: 100,
          ticks: { stepSize: 20, backdropColor: 'transparent' },
          pointLabels: { font: { size: 10 } },
          grid: { color: 'rgba(176, 196, 216, 0.55)' },
          angleLines: { color: 'rgba(176, 196, 216, 0.55)' },
        },
      },
    },
  })
}

export function setDecisionSupportChartData(root: HTMLElement, data: DashboardData) {
  dashboardDataByRoot.set(root, data)
  renderDecisionSupportCharts(root)
}

export function renderDecisionSupportCharts(root: HTMLElement) {
  const data = dashboardDataByRoot.get(root)
  const territoryPage = root.querySelector<HTMLElement>('#page-territory')
  if (!data || !territoryPage?.classList.contains('active')) return

  renderDiseaseDemandChart(root, data)
  renderTerritoryRadarChart(root, data)
}
