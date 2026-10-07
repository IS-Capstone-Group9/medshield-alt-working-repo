import { getJson } from './api-client'
import type { DiagnosticScope, SalesDiagnostics } from '@/types/diagnostics.types'

export function diagnosticQuery(scope: DiagnosticScope): URLSearchParams {
  const query = new URLSearchParams()
  for (const key of ['start_date', 'end_date', 'product_id', 'area', 'sector', 'region', 'territory', 'category'] as const) {
    const value = scope[key]
    if (value) query.set(key, value)
  }
  return query
}
export function getSalesDiagnostics(scope: DiagnosticScope): Promise<SalesDiagnostics> {
  return getJson<SalesDiagnostics>(`/api/sales/diagnostics?${diagnosticQuery(scope)}`)
}
