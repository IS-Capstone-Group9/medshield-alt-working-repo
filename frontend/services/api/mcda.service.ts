import { getJson } from './api-client'

export type CommercialMcdaTerritory = {
  territory: string
  abc_class: string
  sales_value: number
  sales_value_share: number
  source_row_count: number
  active_months: number
  available_months: number
  sales_value_score: number
  activity_coverage_score: number
  mcda_score: number
  priority_rank: number
  recommendation: string
}

export type CommercialMcdaResult = {
  model_code: string
  model_version: string
  status: 'candidate'
  label: string
  dataset_id: string
  dataset_status: string
  data_period: string
  weights: {
    sales_value: number
    activity_coverage: number
  }
  criteria: Array<{
    key: 'sales_value' | 'activity_coverage'
    label: string
    definition: string
    provenance: string
  }>
  excluded_criteria: {
    outbreak_risk: string
    supplier_lead_time: string
  }
  weight_note: string
  territories: CommercialMcdaTerritory[]
}

export function getCommercialMcda(): Promise<CommercialMcdaResult> {
  return getJson<CommercialMcdaResult>('/api/mcda_territories')
}
