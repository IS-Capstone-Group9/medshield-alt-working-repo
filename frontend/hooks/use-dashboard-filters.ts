import { useRouter, useSearchParams } from 'next/navigation'
import { ComparisonMode, DashboardFilters } from '@/types/dashboard.types'

export function useDashboardFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const filters: DashboardFilters = {
    comparisonMode: (searchParams.get('comparison') as ComparisonMode) || 'single',
    year: searchParams.get('year') || 'all',
    yoyYear: searchParams.get('yoyYear') || '2025',
  }

  const updateFilters = (updates: Partial<DashboardFilters>) => {
    const params = new URLSearchParams(searchParams.toString())
    if (updates.comparisonMode !== undefined) {
      params.set('comparison', updates.comparisonMode)
    }
    if (updates.year !== undefined) {
      params.set('year', updates.year)
    }
    if (updates.yoyYear !== undefined) {
      params.set('yoyYear', updates.yoyYear)
    }
    router.push(`/?${params.toString()}`)
  }

  return {
    filters,
    updateFilters,
  }
}
