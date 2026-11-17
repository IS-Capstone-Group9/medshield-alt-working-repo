import {financialScopeSelection, type FinancialScope} from './financial-scope'
import { getJson, authenticatedJson, authHeaders, API_BASE_URL } from './api-client'
import {
  SalesDatasetStatus,
  SalesPage,
  SalesSummary,
  SalesUploadResult,
} from '@/types/api.types'

export type SalesEvidenceFilters = {
  financialScope?:FinancialScope
  startDate?: string; endDate?: string; productId?: string; area?: string; sector?: string
  region?: string; territory?: string
  category?: string
}
function addEvidenceFilters(query: URLSearchParams, params: SalesEvidenceFilters) {
  query.set('financial_scope',params.financialScope??financialScopeSelection().scope)
  for (const [field, key] of [['startDate','start_date'], ['endDate','end_date'], ['productId','product_id'], ['area','area'], ['sector','sector'], ['region','region'], ['territory','territory'], ['category','category']] as const) {
    if (params[field]) query.set(key, params[field]!)
  }
}

export function getSalesDatasetStatus(scope:FinancialScope=financialScopeSelection().scope, options:Pick<RequestInit,'signal'>={}): Promise<SalesDatasetStatus> {
  return getJson<SalesDatasetStatus>('/api/sales/status?financial_scope='+scope,options)
}

export function getSalesTransactions(params: {
  year?: string
  page?: number
  pageSize?: number
  search?: string
  qualityStatus?: string
} & SalesEvidenceFilters, options:Pick<RequestInit,'signal'>={}): Promise<SalesPage> {
  const query = new URLSearchParams({
    year: params.year ?? 'all',
    page: String(params.page ?? 1),
    page_size: String(params.pageSize ?? 25),
    search: params.search ?? '',
    quality_status: params.qualityStatus ?? 'all',
  })
  addEvidenceFilters(query, params)
  return getJson<SalesPage>(`/api/sales/transactions?${query.toString()}`,options)
}

export function getSalesSummary(params: {
  year?: string
  search?: string
  qualityStatus?: string
} & SalesEvidenceFilters, options:Pick<RequestInit,'signal'>={}): Promise<SalesSummary> {
  const query = new URLSearchParams({
    year: params.year ?? 'all',
    search: params.search ?? '',
    quality_status: params.qualityStatus ?? 'all',
  })
  addEvidenceFilters(query, params)
  return getJson<SalesSummary>(`/api/sales/summary?${query.toString()}`,options)
}

export async function getSalesLedgerExport(params:SalesEvidenceFilters & {year?:string;search?:string;qualityStatus?:string}, options:Pick<RequestInit,'signal'>={}):Promise<Blob> {
  const query=new URLSearchParams({year:params.year??'all',search:params.search??'',quality_status:params.qualityStatus??'all'})
  addEvidenceFilters(query,params)
  const response=await fetch(API_BASE_URL+'/api/sales/financial-export?'+query,{cache:'no-store',headers:await authHeaders(),signal:options.signal})
  if(!response.ok) {
    const body=await response.json().catch(()=>null)
    throw new Error(body?.error??'Financial export unavailable.')
  }
  return response.blob()
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
