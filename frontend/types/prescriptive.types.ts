export type SeasonType =
  | 'amihan'
  | 'summer'
  | 'pre_monsoon'
  | 'monsoon'
  | 'typhoon'
  | 'holiday'

export interface SeasonInfo {
  tag: string
  title: string
  risks: string
  restock: string
  priority: string
  rule: string
}

export interface RestockItem {
  category: string
  surgeBuffer: string
  currentStock: string
  recommendedEoq: string
  reorderPoint: string
  urgency: 'CRITICAL' | 'WARNING' | 'STABLE'
  unitCost: string
}
