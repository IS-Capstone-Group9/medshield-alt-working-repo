import Chart, { type ChartConfiguration } from 'chart.js/auto'
import type {
  AreaPoint,
  DashboardData,
  ExternalSignalPoint,
  MonthlyPoint,
  RegionalPriority,
  SeasonalityPoint,
} from '@/types/api.types'
import {
  aggregateForecastRowsByPeriod,
  filterForecastRowsToWindow,
  formatPeriodLabel,
  parsePeriodKey,
  resolveRollingForecastWindow,
  type RollingForecastWindow,
} from './dashboard-forecast-window'

const dashboardDataByRoot = new WeakMap<HTMLElement, DashboardData>()

const chartColors = [
  { border: '#1E3A5F', fill: 'rgba(30, 58, 95, 0.16)' },
  { border: '#D97706', fill: 'rgba(217, 119, 6, 0.16)' },
  { border: '#0D7045', fill: 'rgba(13, 112, 69, 0.14)' },
]

const SIGNAL_FALLBACK_BY_MONTH = new Map<number, { disease: number; rainfall: number }>([
  [1, { disease: 0.88, rainfall: 28 }],
  [2, { disease: 0.95, rainfall: 32 }],
  [3, { disease: 1.02, rainfall: 45 }],
  [4, { disease: 1.08, rainfall: 40 }],
  [5, { disease: 1.16, rainfall: 36 }],
  [6, { disease: 1.11, rainfall: 30 }],
  [7, { disease: 1.05, rainfall: 26 }],
  [8, { disease: 1.01, rainfall: 24 }],
  [9, { disease: 1.18, rainfall: 29 }],
  [10, { disease: 1.26, rainfall: 34 }],
  [11, { disease: 1.34, rainfall: 41 }],
  [12, { disease: 1.22, rainfall: 38 }],
])

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
  return formatPeriodLabel(period)
}

function monthNumber(period: string): number | null {
  const date = parsePeriodKey(period)
  return date ? date.getUTCMonth() + 1 : null
}

function average(values: number[]): number | null {
  const validValues = values.filter((value) => Number.isFinite(value))
  if (!validValues.length) return null
  return validValues.reduce((sum, value) => sum + value, 0) / validValues.length
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
    ]),
  )
}

function aggregateExternalSignals(rows: ExternalSignalPoint[]): Map<string, { disease: number | null; rainfall: number | null }> {
  const grouped = new Map<string, { disease: number[]; rainfall: number[] }>()

  for (const row of rows) {
    if (!row.period) continue
    const current = grouped.get(row.period) ?? { disease: [], rainfall: [] }
    if (finite(row.disease_intensity_index)) current.disease.push(row.disease_intensity_index)
    if (finite(row.rainfall_severity_index)) current.rainfall.push(row.rainfall_severity_index)
    grouped.set(row.period, current)
  }

  return new Map(
    [...grouped.entries()].map(([period, values]) => [
      period,
      {
        disease: average(values.disease),
        rainfall: average(values.rainfall),
      },
    ]),
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
  copy: { title: string; subtitle: string; badge: string; status?: string; statusClass?: string },
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

function rollingWindow(data: DashboardData): RollingForecastWindow {
  return resolveRollingForecastWindow(data.dataStatus, new Date())
}

function rollingWindowLabel(window: RollingForecastWindow): string {
  return `${formatPeriodLabel(window.start)} - ${formatPeriodLabel(window.end)}`
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

  updateChartCard(
    canvas,
    hasDiseaseData
      ? {
          title: 'Historical Sales vs. Disease Intensity',
          subtitle: 'Loaded monthly sales value (bars) and aligned disease intensity index (line)',
          badge: 'Aligned observations',
          status:
            correlation === null
              ? `${alignedPairs.length} aligned rows`
              : `r = ${correlation >= 0 ? '+' : ''}${correlation.toFixed(2)} - n = ${alignedPairs.length}`,
          statusClass: 'status-ready',
        }
      : {
          title: 'Historical Monthly Sales Profile',
          subtitle: 'Loaded monthly sales value; no aligned disease-signal rows are available for this view',
          badge: 'Sales data only',
          status: 'Disease feed unavailable',
          statusClass: 'status-draft',
        },
  )

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

  replaceChart(
    canvas,
    {
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
              label: (context) =>
                context.dataset.yAxisID === 'sales'
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
    } as ChartConfiguration,
  )
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
  const margins = validRows.map((row) => (row.revenue > 0 ? Math.max(0, row.income / row.revenue) : 0))
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

  updateChartCard(
    canvas,
    priorityData
      ? {
          title: 'Territory Multi-Criteria Priority Radar',
          subtitle: 'Loaded regional priority measures normalized to a common 0-100 display scale',
          badge: 'Regional priority feed',
        }
      : {
          title: 'Territory Historical Sales Radar',
          subtitle: 'Sales-derived fallback; logistics, lead-time, and vulnerability inputs are not available',
          badge: 'Sales fallback',
        },
  )

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

type ForecastSeriesPoint = {
  period: string
  baseline: number | null
  adjusted: number | null
  lower: number | null
  upper: number | null
  source: 'live' | 'fallback'
}

function seasonalityIndexByMonth(rows: SeasonalityPoint[]): Map<number, number> {
  const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
  const validRows = rows.filter((row) => row.month && finite(row.avg_revenue))
  const mean = average(validRows.map((row) => row.avg_revenue)) ?? 0
  const indices = new Map<number, number>()

  for (const row of validRows) {
    const monthIndex = monthNames.indexOf(String(row.month).trim().slice(0, 3).toLowerCase())
    if (monthIndex < 0) continue
    indices.set(monthIndex + 1, mean > 0 ? row.avg_revenue / mean : 1)
  }

  return indices
}

function fallbackForecastSeries(window: RollingForecastWindow, data: DashboardData): ForecastSeriesPoint[] {
  const indices = seasonalityIndexByMonth(data.seasonality)
  const trailingBaseline =
    average(
      [...data.monthly]
        .filter((row) => finite(row.revenue) && row.revenue > 0)
        .sort((left, right) => left.period.localeCompare(right.period))
        .slice(-3)
        .map((row) => row.revenue),
    ) ??
    average(data.seasonality.filter((row) => finite(row.avg_revenue)).map((row) => row.avg_revenue)) ??
    0

  return window.periods.map((period) => {
    const month = monthNumber(period)
    const seasonalIndex = (month && indices.get(month)) ?? 1
    const adjusted = Math.round(trailingBaseline * seasonalIndex)
    return {
      period,
      baseline: Math.round(adjusted * 0.96),
      adjusted,
      lower: Math.round(adjusted * 0.88),
      upper: Math.round(adjusted * 1.12),
      source: 'fallback',
    }
  })
}

function forecastSeries(window: RollingForecastWindow, data: DashboardData) {
  const filtered = filterForecastRowsToWindow(aggregateForecastRowsByPeriod(data.forecasts), window)
  const filteredByPeriod = new Map(filtered.map((row) => [row.period, row]))
  const liveRows = window.periods.map<ForecastSeriesPoint>((period) => {
    const row = filteredByPeriod.get(period)
    return {
      period,
      baseline: row && finite(row.baseline_forecast) ? row.baseline_forecast : null,
      adjusted: row && finite(row.adjusted_forecast) ? row.adjusted_forecast : null,
      lower: row && finite(row.lower_bound) ? row.lower_bound : null,
      upper: row && finite(row.upper_bound) ? row.upper_bound : null,
      source: 'live',
    }
  })

  const livePeriodsLoaded = liveRows.filter((row) => finite(row.adjusted) || finite(row.baseline)).length
  if (livePeriodsLoaded > 0) {
    return { rows: liveRows, isFallback: false, loadedPeriods: livePeriodsLoaded }
  }

  return {
    rows: fallbackForecastSeries(window, data),
    isFallback: true,
    loadedPeriods: 0,
  }
}

function currentMonthActualSeries(window: RollingForecastWindow, monthly: MonthlyPoint[]) {
  const monthlyByPeriod = new Map(
    monthly
      .filter((row) => finite(row.revenue))
      .map((row) => [row.period, row.revenue]),
  )
  const actual = monthlyByPeriod.get(window.currentMonth)
  if (!finite(actual)) return null
  return window.periods.map((period) => (period === window.currentMonth ? actual : null))
}

function renderForecastChart(root: HTMLElement, data: DashboardData) {
  const canvas = root.querySelector<HTMLCanvasElement>('#forecastChart')
  if (!canvas) return

  const window = rollingWindow(data)
  const series = forecastSeries(window, data)
  const currentMonthActual = currentMonthActualSeries(window, data.monthly)
  const horizonLabel = rollingWindowLabel(window)

  updateChartCard(canvas, {
    title: 'Rolling 12-Month Demand Forecast',
    subtitle: series.isFallback
      ? `Rolling Forecast - ${horizonLabel} - compatibility fallback because no forecast records were loaded`
      : `Rolling Forecast - ${horizonLabel} - filtered from real forecast periods without fixed-year labels`,
    badge: series.isFallback ? 'Fallback window' : 'Rolling forecast',
    status: series.isFallback ? 'Scenario fallback' : `${series.loadedPeriods}/12 model periods loaded`,
    statusClass: series.isFallback ? 'status-draft' : 'status-ready',
  })

  const adjustedValues = series.rows.map((row) => row.adjusted)
  const datasets: ChartConfiguration<'line'>['data']['datasets'] = [
    {
      label: 'Lower bound',
      data: series.rows.map((row) => row.lower),
      borderColor: 'rgba(0,0,0,0)',
      backgroundColor: 'rgba(0,0,0,0)',
      pointRadius: 0,
      spanGaps: true,
    },
    {
      label: 'Upper bound',
      data: series.rows.map((row) => row.upper),
      borderColor: 'rgba(0,0,0,0)',
      backgroundColor: 'rgba(30, 58, 95, 0.12)',
      fill: '-1',
      pointRadius: 0,
      spanGaps: true,
    },
    {
      label: series.isFallback ? 'Forecast compatibility series' : 'Adjusted forecast',
      data: adjustedValues,
      borderColor: '#1E3A5F',
      backgroundColor: 'rgba(30, 58, 95, 0.10)',
      tension: 0.35,
      borderWidth: 2.5,
      fill: false,
      spanGaps: true,
      pointRadius: window.periods.map((period) => (period === window.currentMonth ? 5 : 3)),
      pointHoverRadius: window.periods.map((period) => (period === window.currentMonth ? 7 : 5)),
      pointBackgroundColor: window.periods.map((period) => (period === window.currentMonth ? '#D97706' : '#1E3A5F')),
      pointBorderColor: window.periods.map((period) => (period === window.currentMonth ? '#D97706' : '#1E3A5F')),
    },
    {
      label: 'Baseline forecast',
      data: series.rows.map((row) => row.baseline),
      borderColor: '#0D7045',
      borderDash: [6, 4],
      tension: 0.28,
      borderWidth: 2,
      fill: false,
      spanGaps: true,
      pointRadius: 0,
    },
  ]

  if (currentMonthActual) {
    datasets.unshift({
      label: 'Current month actual-to-date',
      data: currentMonthActual,
      borderColor: '#D97706',
      backgroundColor: '#D97706',
      showLine: false,
      pointRadius: 6,
      pointHoverRadius: 7,
    })
  }

  replaceChart(canvas, {
    type: 'line',
    data: {
      labels: window.labels,
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
            label: (context) => {
              const value = Number(context.raw)
              return Number.isFinite(value) ? `${context.dataset.label}: ${compactCurrency(value)}` : `${context.dataset.label}: Unavailable`
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { maxRotation: 0, autoSkip: false, minRotation: 0 },
        },
        y: {
          beginAtZero: true,
          title: { display: true, text: 'Demand forecast (PHP)' },
          ticks: { callback: (value) => compactCurrency(Number(value)) },
        },
      },
    },
  })
}

function renderExternalSignalsChart(root: HTMLElement, data: DashboardData) {
  const canvas = root.querySelector<HTMLCanvasElement>('#externalChart')
  if (!canvas) return

  const window = rollingWindow(data)
  const groupedSignals = aggregateExternalSignals(data.externalSignals)
  const alignedSignals = window.periods.map((period) => {
    const month = monthNumber(period)
    const fallback = month ? SIGNAL_FALLBACK_BY_MONTH.get(month) : null
    const live = groupedSignals.get(period)
    return {
      disease: live?.disease ?? fallback?.disease ?? null,
      rainfall: live?.rainfall ?? fallback?.rainfall ?? null,
      source: live?.disease !== null || live?.rainfall !== null ? 'live' : 'fallback',
    }
  })
  const hasLiveSignal = alignedSignals.some((row) => row.source === 'live')
  const horizonLabel = rollingWindowLabel(window)

  updateChartCard(canvas, {
    title: 'PAGASA Weather & DOH Case Correlation',
    subtitle: hasLiveSignal
      ? `Rolling signal horizon - ${horizonLabel} - aligned to the analytical month across year boundaries`
      : `Rolling signal horizon - ${horizonLabel} - scenario fallback because no external signal rows were loaded`,
    badge: hasLiveSignal ? 'Rolling signal window' : 'Signal fallback',
  })

  replaceChart(canvas, {
    type: 'line',
    data: {
      labels: window.labels,
      datasets: [
        {
          label: 'DOH disease intensity index',
          data: alignedSignals.map((row) => row.disease),
          borderColor: '#C0392B',
          backgroundColor: 'rgba(192, 57, 43, 0.10)',
          tension: 0.35,
          borderWidth: 2.5,
          pointRadius: 2,
          spanGaps: true,
        },
        {
          label: 'PAGASA rainfall severity index',
          data: alignedSignals.map((row) => row.rainfall),
          borderColor: '#1E3A5F',
          backgroundColor: 'rgba(30, 58, 95, 0.10)',
          tension: 0.35,
          borderWidth: 2.5,
          pointRadius: 2,
          spanGaps: true,
          yAxisID: 'y1',
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { maxRotation: 0, autoSkip: false, minRotation: 0 },
        },
        y: {
          beginAtZero: true,
          title: { display: true, text: 'Disease intensity index' },
          ticks: { callback: (value) => Number(value).toFixed(2) },
        },
        y1: {
          beginAtZero: true,
          position: 'right',
          title: { display: true, text: 'Rainfall severity index' },
          ticks: { callback: (value) => Number(value).toFixed(0) },
          grid: { drawOnChartArea: false },
        },
      },
    },
  })
}

function renderSeasonalityIndexChart(root: HTMLElement, data: DashboardData) {
  const canvas = root.querySelector<HTMLCanvasElement>('#seasonIndexChart')
  if (!canvas) return

  const window = rollingWindow(data)
  const indices = seasonalityIndexByMonth(data.seasonality)
  const values = window.periods.map((period) => {
    const month = monthNumber(period)
    return month ? indices.get(month) ?? null : null
  })
  const horizonLabel = rollingWindowLabel(window)

  updateChartCard(canvas, {
    title: 'Climate-Disease Seasonality Index',
    subtitle: `Rolling seasonality horizon - ${horizonLabel} - monthly amplification aligned to the forecast window`,
    badge: 'Rolling seasonal window',
  })

  replaceChart(canvas, {
    type: 'bar',
    data: {
      labels: window.labels,
      datasets: [
        {
          label: 'Demand index',
          data: values,
          backgroundColor: values.map((value) =>
            !finite(value) ? 'rgba(176, 196, 216, 0.55)' : value > 1.12 ? '#1E3A5F' : value > 0.96 ? '#D97706' : '#0D7045',
          ),
          borderRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => `${context.dataset.label}: ${Number(context.raw).toFixed(2)}x`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { maxRotation: 0, autoSkip: false, minRotation: 0 },
        },
        y: {
          beginAtZero: true,
          title: { display: true, text: 'Demand amplification' },
          ticks: { callback: (value) => `${Number(value).toFixed(2)}x` },
        },
      },
    },
  })
}

export function setDecisionSupportChartData(root: HTMLElement, data: DashboardData) {
  dashboardDataByRoot.set(root, data)
  const window = rollingWindow(data)
  root.dataset.forecastCurrentMonth = window.currentMonth
  root.dataset.forecastWindowStart = window.start
  root.dataset.forecastWindowEnd = window.end
  renderDecisionSupportCharts(root)
}

export function renderDecisionSupportCharts(root: HTMLElement) {
  const data = dashboardDataByRoot.get(root)
  if (!data) return

  const territoryPage = root.querySelector<HTMLElement>('#page-territory')
  if (territoryPage?.classList.contains('active')) {
    renderDiseaseDemandChart(root, data)
    renderTerritoryRadarChart(root, data)
  }

  const forecastPage = root.querySelector<HTMLElement>('#page-forecast')
  if (forecastPage?.classList.contains('active')) {
    renderForecastChart(root, data)
    renderExternalSignalsChart(root, data)
    renderSeasonalityIndexChart(root, data)
  }
}
