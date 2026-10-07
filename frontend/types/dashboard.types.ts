export type ActiveTab =
  | 'overview'
  | 'revenue'
  | 'products'
  | 'territory'
  | 'forecast'
  | 'inventory'
  | 'data'

export type ComparisonMode = 'single' | 'yoy'

export interface DashboardFilters {
  comparisonMode: ComparisonMode
  year: string
  yoyYear: string
}
