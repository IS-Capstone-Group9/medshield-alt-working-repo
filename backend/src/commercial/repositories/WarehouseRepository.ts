import { createHash } from 'node:crypto'
import { executeDatabricksStatement } from '../../databricks'
import { descriptiveRelease, getDatabricksSalesDiagnostics, getDatabricksSalesStatus, getDatabricksStl } from '../../databricksDashboard'
import { validateManifest } from '../services/ForecastService'
import { CommercialError } from '../utils/contracts'
import type { ForecastQuery } from '../validators/schemas'

export function forecastTable() {
  const catalog = process.env.DATABRICKS_CATALOG || 'workspace', schema = process.env.DATABRICKS_SCHEMA || 'medshield_gold'
  if (![catalog, schema].every(value => /^[A-Za-z_][A-Za-z0-9_]*$/.test(value))) throw new Error('Invalid warehouse identifiers')
  return `${catalog}.${schema}.commercial_forecast_manifest_candidate`
}
export const warehouseRepository = {
  status: getDatabricksSalesStatus,
  diagnostics: getDatabricksSalesDiagnostics,
  decomposition: getDatabricksStl,
  async forecasts(kind: 'company' | 'product' | 'category', filters: ForecastQuery) {
    const release = await descriptiveRelease()
    const parameters: Array<{ name: string; value: string; type: 'STRING' }> = [
      { name: 'anchor', value: filters.anchor, type: 'STRING' }, { name: 'kind', value: kind, type: 'STRING' }, { name: 'dataset', value: release.dataset_id, type: 'STRING' },
    ]
    const clauses = ['anchor_period = :anchor', 'scope_kind = :kind', 'dataset_id = :dataset', `fact_version = ${release.fact_delta_version}`]
    for (const [field, value] of [['category', filters.category], ['scope_id', filters.productId]] as const) if (value) { clauses.push(`${field} = :${field}`); parameters.push({ name: field, value, type: 'STRING' }) }
    if (filters.search) { clauses.push('contains(lower(scope_id), lower(:search))'); parameters.push({ name: 'search', value: filters.search, type: 'STRING' }) }
    // At most one explicitly published candidate per anchor/scope/source is accepted; no arbitrary run selection.
    const result = await executeDatabricksStatement(`SELECT scope_id, payload_json, payload_sha256 FROM ${forecastTable()} WHERE ${clauses.join(' AND ')} ORDER BY scope_id LIMIT 1001`, { parameters, rowLimit: 1001 })
    if (result.rows.length > 1000) throw new CommercialError(422, 'NARROW_FORECAST_SCOPE', 'Narrow category or product search to at most 1000 series.')
    const ids = new Set<string>()
    const manifests = result.rows.map(row => {
      if (ids.has(String(row.scope_id))) throw new CommercialError(503, 'AMBIGUOUS_FORECAST_RUN', 'Multiple forecast candidates exist for one scope and anchor.')
      ids.add(String(row.scope_id))
      const payload = String(row.payload_json)
      if (createHash('sha256').update(payload).digest('hex') !== row.payload_sha256) throw new CommercialError(503, 'FORECAST_CHECKSUM_MISMATCH', 'Forecast payload integrity failed.')
      let decoded: unknown
      try { decoded = JSON.parse(payload) } catch { throw new CommercialError(503, 'INVALID_FORECAST_JSON', 'Forecast source JSON is malformed.') }
      const data = validateManifest(decoded)
      if (data.anchor !== filters.anchor || data.scope.kind !== kind || data.scope.id !== row.scope_id || data.source.datasetId !== release.dataset_id || data.source.factVersion !== release.fact_delta_version) throw new CommercialError(503, 'FORECAST_SOURCE_MISMATCH', 'Forecast identity does not match its source.')
      return data
    })
    const offset = (filters.page - 1) * filters.limit
    return { total: manifests.length, rows: manifests.slice(offset, offset + filters.limit) }
  },
}
export type WarehouseRepository = typeof warehouseRepository
