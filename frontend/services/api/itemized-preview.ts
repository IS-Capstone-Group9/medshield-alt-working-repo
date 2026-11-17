import { API_BASE_URL, authHeaders, getJson } from './api-client'

export type ItemizedPreviewFilters = {year: string; area: string; category: string}
export type ItemizedPreviewRow = Record<string, string | null>
export type ItemizedPreviewData = {
  source: {batch_id: string; dataset_id: string; source_table: string; delta_version: number;
    receipt_sha256: string; note: string; scope: string; complete_company_sales: false;
    contracts_excluded: true; financial_release_approved: false; live_serving_changed: false}
  filters: ItemizedPreviewFilters; summary: ItemizedPreviewRow; monthly: ItemizedPreviewRow[];
  products: ItemizedPreviewRow[]; available_years: string[]; available_areas: string[]
}
const query = (filters: ItemizedPreviewFilters) => new URLSearchParams(filters).toString()
export const getItemizedPreview = (filters: ItemizedPreviewFilters) =>
  getJson<ItemizedPreviewData>('/api/sales/itemized-preview?' + query(filters))

export async function downloadItemizedPreview(view: 'monthly' | 'products' | 'records', filters: ItemizedPreviewFilters) {
  const response = await fetch(`${API_BASE_URL}/api/sales/itemized-preview/export?view=${view}&${query(filters)}`, {
    cache: 'no-store', headers: await authHeaders(),
  })
  if (!response.ok) throw new Error('The itemized export is unavailable. Refresh the preview before trying again.')
  const blob = await response.blob(), url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `medshield-itemized-preview-${view}.csv`
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
