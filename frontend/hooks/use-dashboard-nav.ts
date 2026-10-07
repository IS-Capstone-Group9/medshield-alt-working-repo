import { useRouter, useSearchParams } from 'next/navigation'
import { ActiveTab } from '@/types/dashboard.types'

export function useDashboardNav() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const activeTab: ActiveTab = (searchParams.get('tab') as ActiveTab) || 'overview'

  const changeTab = (tab: ActiveTab) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', tab)
    router.push(`/?${params.toString()}`)
  }

  return {
    activeTab,
    changeTab,
  }
}
