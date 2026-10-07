import {
  loadDashboardData,
  getSalesDatasetStatus,
  uploadSalesFile,
  refreshWeatherData,
  SalesDatasetStatus,
} from '@/lib/api'

export async function fetchDashboardPayload() {
  return await loadDashboardData()
}

export async function checkIngestionStatus(): Promise<SalesDatasetStatus> {
  return await getSalesDatasetStatus()
}

export async function uploadDatasetFile(file: File): Promise<void> {
  await uploadSalesFile(file)
}

export async function triggerWeatherSync(): Promise<void> {
  await refreshWeatherData({
    start: '2025-01-01',
    end: '2025-12-31',
    areas: [],
    provider: 'nasa_power',
  })
}
