export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://[::1]:5000'

export type Summary = {
  total_revenue: number
  total_income: number
  total_transactions: number
  top_product: string
  top_area: string
  avg_margin: number
}

export type MonthlyPoint = { period: string; revenue: number; income: number }
export type AreaPoint = { area: string; revenue: number; income: number }
export type ProductPoint = { product: string; revenue: number; qty: number; income: number; abc: string; pct_of_total: number }
export type YearPoint = { year: string; revenue: number; income: number; transactions: number }
export type SeasonalityPoint = { month: string; avg_revenue: number }

async function getJson<T>(path: string): Promise<T> {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, { cache: 'no-store' })
    if (!response.ok) throw new Error(`Request failed: ${response.status} ${response.statusText}`)
    return (await response.json()) as T
  } catch (err) {
    // rethrow to let caller handle fallback
    throw err
  }
}

async function getPublicJson<T>(path: string): Promise<T> {
  const response = await fetch(path, { cache: 'no-store' })
  if (!response.ok) throw new Error(`Public data fetch failed: ${response.status}`)
  return (await response.json()) as T
}

export async function loadDashboardData() {
  try {
    const [summary, monthly, byArea, products, yearSummary, seasonality] = await Promise.all([
      getJson<Summary>('/api/summary'),
      getJson<MonthlyPoint[]>('/api/monthly'),
      getJson<AreaPoint[]>('/api/by_area'),
      getJson<ProductPoint[]>('/api/products?limit=15'),
      getJson<YearPoint[]>('/api/year_summary'),
      getJson<SeasonalityPoint[]>('/api/seasonality'),
    ])
    return { summary, monthly, byArea, products, yearSummary, seasonality }
  } catch (err) {
    // fallback to public dataset bundled with the frontend
    const data = await getPublicJson<any>('/data/sales_data.json')
    return {
      summary: data.totals as Summary,
      monthly: data.monthly as MonthlyPoint[],
      byArea: data.by_area as AreaPoint[],
      products: data.top_products as ProductPoint[],
      yearSummary: data.year_summary as YearPoint[],
      seasonality: data.seasonality as SeasonalityPoint[],
    }
  }
}
