import { getJson, authenticatedJson } from './api-client'
import {
  SalesDatasetStatus,
  SalesPage,
  SalesSummary,
  SalesUploadResult,
} from '@/types/api.types'

export type SalesEvidenceFilters = {
  startDate?: string; endDate?: string; productId?: string; area?: string; sector?: string
  region?: string; territory?: string
  category?: string
}
function addEvidenceFilters(query: URLSearchParams, params: SalesEvidenceFilters) {
  for (const [field, key] of [['startDate','start_date'], ['endDate','end_date'], ['productId','product_id'], ['area','area'], ['sector','sector'], ['region','region'], ['territory','territory'], ['category','category']] as const) {
    if (params[field]) query.set(key, params[field]!)
  }
}

export function getSalesDatasetStatus(): Promise<SalesDatasetStatus> {
  return getJson<SalesDatasetStatus>('/api/sales/status')
}

export function getSalesTransactions(params: {
  year?: string
  page?: number
  pageSize?: number
  search?: string
  qualityStatus?: string
} & SalesEvidenceFilters): Promise<SalesPage> {
  const query = new URLSearchParams({
    year: params.year ?? 'all',
    page: String(params.page ?? 1),
    page_size: String(params.pageSize ?? 25),
    search: params.search ?? '',
    quality_status: params.qualityStatus ?? 'all',
  })
  addEvidenceFilters(query, params)
  return getJson<SalesPage>(`/api/sales/transactions?${query.toString()}`)
}

export function getSalesSummary(params: {
  year?: string
  search?: string
  qualityStatus?: string
} & SalesEvidenceFilters): Promise<SalesSummary> {
  const query = new URLSearchParams({
    year: params.year ?? 'all',
    search: params.search ?? '',
    quality_status: params.qualityStatus ?? 'all',
  })
  addEvidenceFilters(query, params)
  return getJson<SalesSummary>(`/api/sales/summary?${query.toString()}`)
}

export function uploadSalesFile(file: File): Promise<SalesUploadResult> {
  return authenticatedJson<SalesUploadResult>(
    `/api/sales/upload?file_name=${encodeURIComponent(file.name)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
      body: file,
    }
  )
}
