import { createHash } from 'node:crypto'

type Row = Record<string, string | null>
export type ExternalContextScope = { mode: string; disease: string; provider: string; lag: number; rainfallLag: number; metric: string }
const index = (period: string) => {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) throw new Error('Invalid external context period')
  return Number(period.slice(0, 4)) * 12 + Number(period.slice(5)) - 1
}
const period = (n: number) => `${Math.floor(n / 12)}-${String(n % 12 + 1).padStart(2, '0')}`
const numeric = (value: string | null | undefined) => {
  if (value == null || value.trim() === '') return null
  const n = Number(value)
  if (!Number.isFinite(n)) throw new Error('Nonfinite external context measure')
  return n
}

/** Align at unique month keys, never joining transaction rows to multiple signals.
 * Co-observation is descriptive context; it grants no mapping/model approval. */
export function buildExternalContext(sales: Row[], signals: Row[], scope: ExternalContextScope) {
  const salesByMonth = new Map<string, Row>()
  for (const row of sales) {
    index(row.period ?? '')
    if (salesByMonth.has(row.period!)) throw new Error('Duplicate monthly sales context key')
    salesByMonth.set(row.period!, row)
  }
  const requested = [
    ...(scope.mode !== 'rainfall' ? [{ provider: 'DOH', signal: scope.disease, lag: scope.lag, unit: 'reported cases' }] : []),
    ...(scope.mode !== 'disease' ? [{ provider: scope.provider, signal: 'RAINFALL_TOTAL_MM', lag: scope.rainfallLag, unit: 'mm' }] : []),
  ]
  const series = requested.map(request => {
    const byMonth = new Map<string, Row>()
    for (const row of signals.filter(row => row.source === request.provider && row.signal === request.signal)) {
      index(row.period ?? '')
      if (byMonth.has(row.period!)) throw new Error('Duplicate external context signal key')
      byMonth.set(row.period!, row)
    }
    return { request, byMonth }
  })
  const rows = Array.from({ length: 108 }, (_, i) => {
    const target = period(2017 * 12 + i)
    const sale = salesByMonth.get(target)
    return { period: target, sales: scope.metric === 'revenue' ? numeric(sale?.sales) : null,
      source_rows: numeric(sale?.source_rows), original_source_rows: numeric(sale?.original_source_rows), adjusted_estimated_rows: numeric(sale?.adjusted_estimated_rows),
      signals: series.map(({ request, byMonth }) => {
        const signalPeriod = period(index(target) - request.lag)
        const row = byMonth.get(signalPeriod)
        return { ...request, period: signalPeriod, value: numeric(row?.signal_value),
          mapping_status: row?.mapping_status ?? 'no_observation',
          observation_status: row?.observation_status ?? 'no_observation',
          station: row?.station_name ?? null, join_ready: row?.is_external_join_ready === 'true',
          source_dataset_version: row?.source_dataset_version ?? null, external_dataset_id: row?.external_dataset_id ?? null }
      }) }
  })
  const observed = rows.filter(row => row.sales !== null)
  const paired = observed.filter(row => row.signals.every(signal => signal.value !== null))
  return { status: 'historical_context_candidate', start: '2017-01', end: '2025-12',
    sales_unit: '₱ net sales', sales_months: observed.length, coobserved_months: paired.length,
    join_ready_months: paired.filter(row => row.signals.every(signal => signal.join_ready)).length,
    limitations: [
      'Buyer assignments are proposed and pending review; geography approval is a separate decision.',
      'Candidate territory alignment; co-observed months do not establish an approved join or causality.',
      'DOH counts are retrospective onset-month records; publication and revision timing are unverified.',
      'PAGASA values are station observations, not province-wide averages. Missing values remain unavailable.',
      ...(scope.metric !== 'revenue' ? ['Quantity context is unavailable until product and source units are verified.'] : []),
      ...(!observed.length ? ['No eligible net sales for this buyer/product/territory. Unassigned geography is not allocated to fill gaps.'] : []),
    ], rows, checksum: createHash('sha256').update(JSON.stringify({ scope, sales, signals })).digest('hex') }
}
