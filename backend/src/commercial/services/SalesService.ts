import type { WarehouseRepository } from '../repositories/WarehouseRepository'
import type { MonthlyQuery } from '../validators/schemas'
import { addMonths, balancedComponents, CommercialError, endOfMonth, money } from '../utils/contracts'

export async function monthlySales(query: MonthlyQuery, repository: WarehouseRepository) {
  if (!['All', 'Medical', 'Non-Medical', 'Unclassified'].includes(query.category)) throw new CommercialError(422, 'THERAPEUTIC_MAPPING_UNAVAILABLE', 'The active sales contract does not contain approved therapeutic category mappings.')
  const status = query.window === 'overall' ? await repository.status() : null
  const startDate = query.window === 'custom' ? query.startDate! : query.window === 'overall' ? status?.quality_summary.source_period_start : `${addMonths(query.anchor, 1 - Number(query.window.slice(0, -1)))}-01`
  const endDate = query.window === 'custom' ? query.endDate! : endOfMonth(query.anchor)
  if (!startDate || startDate < '2017-01-01' || startDate > endDate || endDate > endOfMonth(query.anchor)) throw new CommercialError(400, 'INVALID_SALES_WINDOW', 'Require an ordered window from 2017 onward, ending no later than the anchor month.')
  const data = await repository.diagnostics({ startDate, endDate, category: query.category, sector: query.sector, productId: query.productId })
  const company = query.category === 'All' && query.sector === 'All' && !query.productId
  const decomposition = company ? await repository.decomposition() : null
  if (decomposition && (decomposition.release.dataset_id !== data.release.dataset_id || decomposition.release.fact_delta_version !== data.release.fact_delta_version)) throw new CommercialError(503, 'DECOMPOSITION_SOURCE_MISMATCH', 'Sales and decomposition must use the same source release.')
  const components = new Map(decomposition?.rows.map(row => [row.period, row]) || [])
  return { status: 'success', meta: { anchor: query.anchor, window: query.window, startDate, endDate, classification: 'Candidate recorded sales', source: data.source, release: data.release, totalRecordedNetSales: data.totals.current_financial.revenue == null ? null : money(data.totals.current_financial.revenue), totalAuditedSales: null, receiptCount: null, reconciliationChecksum: null, auditStatus: 'BIR_receipt_audit_not_established', coverage: data.coverage }, data: data.contributions.month.map(row => {
    const component = components.get(row.key)
    const fullMonth = startDate <= `${row.key}-01` && endDate >= endOfMonth(row.key)
    const compatible = component && fullMonth && row.current != null && component.observed != null && component.trend != null && component.seasonal != null && component.residual != null && Math.abs(component.observed - row.current) < 0.005
    return { period: row.key, grossRevenue: null, netRevenue: row.current == null ? null : money(row.current), sourceRowCount: row.current_financial.rows, orderCount: null, unitsDelivered: null, components: compatible ? balancedComponents(component.observed!, component.trend!, component.seasonal!, component.residual!) : null, componentStatus: compatible ? 'source_reconciled' : 'not_available_for_scope', classification: row.current == null ? 'missing_observation' : 'candidate_recorded_sales' }
  }) }
}
