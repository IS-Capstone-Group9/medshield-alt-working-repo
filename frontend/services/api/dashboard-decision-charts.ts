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

function selectedYear(root: HTMLElement): string | null {
  const comparisonVisible = root.querySelector<HTMLElement>('#yoyYearWrap')?.style.display !== 'none'
  const value = comparisonVisible
    ? root.querySelector<HTMLSelectElement>('#yoyTargetYearSelect')?.value
    : root.querySelector<HTMLSelectElement>('#topbarYearSelect')?.value
  return value && /^\d{4}$/.test(value) ? value : null
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

function aggregateMonthly(rows: MonthlyPoint[], year: string | null): MonthlyPoint[] {
  const totals = new Map<string, { revenue: number; income: number }>()
  for (const row of rows) {
    if (!row.period || !finite(row.revenue) || !finite(row.income)) continue
    if (year && !row.period.startsWith(`${year}-`)) continue
    const current = totals.get(row.period) ?? { revenue: 0, income: 0 }
    current.revenue += row.revenue
    current.income += row.income
    totals.set(row.period, current)
  }

  return [...totals.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .slice(-24)
    .map(([period, values]) => ({ period, ...values }))
}

function monthlyRowsForView(rows: MonthlyPoint[], year: string | null): MonthlyPoint[] {
  const selected = aggregateMonthly(rows, year)
  return selected.length ? selected : aggregateMonthly(rows, null)
}

function aggregateDiseaseSignals(rows: ExternalSignalPoint[]): Map<string, number> {
  const values = new Map<string, number[]>()
  for (const row of rows) {
    if (!row.period || !finite(row.disease_intensity_index)) continue
    const periodValues = values.get(row.period) ?? []
    periodValues.push(row.disease_intensity_index)
    values.set(row.period, periodValues)
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

  const monthly = monthlyRowsForView(data.monthly, selectedYear(root))
  if (!monthly.length) return

  const signalByPeriod = aggregateDiseaseSignals(data.externalSignals)
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
        subtitle: 'Loaded monthly sales value (bars) and aligned disease intensity index (line)',
        badge: 'Aligned observations',
        status: correlation === null
          ? `${alignedPairs.length} aligned rows`
          : `r = ${correlation >= 0 ? '+' : ''}${correlation.toFixed(2)} · n = ${alignedPairs.length}`,
        statusClass: 'status-ready',
      }
    : {
        title: 'Historical Monthly Sales Profile',
        subtitle: 'Loaded monthly sales value; no aligned disease-signal rows are available for this view',
        badge: 'Sales data only',
        status: 'Disease feed unavailable',
        statusClass: 'status-draft',
      })

  const datasets: ChartConfiguration<'bar' | 'line'>['data']['datasets'] = [
    {
      type: 'bar',
      label: 'Monthly sales value',
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

function priorityRadarData(rows: RegionalPriority[]) {
  const validRows = rows
    .filter((row) => row.area && finite(row.priority_rank))
    .sort((left, right) => left.priority_rank - right.priority_rank)
  if (!validRows.length) return null

  const maxima = {
    revenue: Math.max(...validRows.map((row) => row.revenue_score), 0),
    growth: Math.max(...validRows.map((row) => row.growth_score), 0),
    outbreak: Math.max(...validRows.map((row) => row.outbreak_risk_index), 0),
    mcda: Math.max(...validRows.map((row) => row.mcda_score), 0),
  }

  return {
    labels: ['Revenue score', 'Growth score', 'Outbreak risk', 'MCDA score', 'Rank urgency'],
    datasets: validRows.slice(0, 3).map((row, index) => ({
      label: row.area,
      data: [
        normalizeScore(row.revenue_score, maxima.revenue),
        normalizeScore(row.growth_score, maxima.growth),
        normalizeScore(row.outbreak_risk_index, maxima.outbreak),
        normalizeScore(row.mcda_score, maxima.mcda),
        Math.max(0, Math.min(100, ((validRows.length - row.priority_rank + 1) / validRows.length) * 100)),
      ],
      borderColor: chartColors[index].border,
      backgroundColor: chartColors[index].fill,
      borderWidth: 2,
      pointRadius: 3,
    })),
  }
}

function historicalAreaRadarData(rows: AreaPoint[]) {
  const validRows = rows
    .filter((row) => row.area && finite(row.revenue) && finite(row.income))
    .sort((left, right) => right.revenue - left.revenue)
  if (!validRows.length) return null

  const maximumRevenue = Math.max(...validRows.map((row) => Math.max(0, row.revenue)), 0)
  const maximumIncome = Math.max(...validRows.map((row) => Math.max(0, row.income)), 0)
  const margins = validRows.map((row) => row.revenue > 0 ? Math.max(0, row.income / row.revenue) : 0)
  const maximumMargin = Math.max(...margins, 0)

  return {
    labels: ['Revenue scale', 'Income scale', 'Income-to-revenue ratio'],
    datasets: validRows.slice(0, 3).map((row, index) => ({
      label: row.area,
      data: [
        normalizeScore(row.revenue, maximumRevenue),
        normalizeScore(row.income, maximumIncome),
        normalizeScore(row.revenue > 0 ? row.income / row.revenue : 0, maximumMargin),
      ],
      borderColor: chartColors[index].border,
      backgroundColor: chartColors[index].fill,
      borderWidth: 2,
      pointRadius: 3,
    })),
  }
}

function renderTerritoryRadarChart(root: HTMLElement, data: DashboardData) {
  const canvas = root.querySelector<HTMLCanvasElement>('#territoryRadarChart')
  if (!canvas) return

  const priorityData = priorityRadarData(data.regionalPriorities)
  const radarData = priorityData ?? historicalAreaRadarData(data.byArea)
  if (!radarData) return

  updateChartCard(canvas, priorityData
    ? {
        title: 'Territory Multi-Criteria Priority Radar',
        subtitle: 'Loaded regional priority measures normalized to a common 0-100 display scale',
        badge: 'Regional priority feed',
      }
    : {
        title: 'Territory Historical Sales Radar',
        subtitle: 'Sales-derived fallback; logistics, lead-time, and vulnerability inputs are not available',
        badge: 'Sales fallback',
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
