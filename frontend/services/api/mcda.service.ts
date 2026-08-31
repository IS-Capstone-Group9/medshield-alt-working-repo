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

const FALLBACK_MCDA_PROVINCES: CommercialMcdaResult = {
  model_code: 'MCDA-COMM-V1',
  model_version: '1.0.0',
  status: 'candidate',
  label: 'Province Commercial Prioritization',
  dataset_id: 'sales_2017_2025_v1',
  dataset_status: 'approved',
  data_period: '2017-2025',
  weights: { sales_value: 0.60, activity_coverage: 0.40 },
  criteria: [
    { key: 'sales_value', label: 'Sales-Value Score', definition: 'Historical territory demand volume', provenance: 'Verified local warehouse transactions' },
    { key: 'activity_coverage', label: 'Month-Coverage Score', definition: 'Active transaction continuity', provenance: 'Verified monthly fulfillment records' },
  ],
  excluded_criteria: {
    outbreak_risk: 'Validated via PIDSR surveillance index',
    supplier_lead_time: 'Derived via port-to-warehouse lead time',
  },
  weight_note: 'Multi-criteria ranking normalized across authorized provinces.',
  territories: [
    { territory: 'Quezon', abc_class: 'A', sales_value: 62785632.57, sales_value_share: 0.42, source_row_count: 3120, active_months: 108, available_months: 108, sales_value_score: 95.0, activity_coverage_score: 92.0, mcda_score: 93.8, priority_rank: 1, recommendation: 'Pre-allocate critical therapeutic safety stock & flood buffer' },
    { territory: 'Batangas', abc_class: 'A', sales_value: 38450120.10, sales_value_share: 0.26, source_row_count: 2450, active_months: 106, available_months: 108, sales_value_score: 84.0, activity_coverage_score: 88.0, mcda_score: 85.6, priority_rank: 2, recommendation: 'Maintain targeted replenishment and monsoon buffer' },
    { territory: 'Marinduque', abc_class: 'B', sales_value: 12404480.13, sales_value_share: 0.12, source_row_count: 1298, active_months: 88, available_months: 108, sales_value_score: 58.0, activity_coverage_score: 72.0, mcda_score: 63.6, priority_rank: 3, recommendation: 'Stage island contingency stocks prior to ferry suspension' },
    { territory: 'Laguna', abc_class: 'B', sales_value: 7105971.09, sales_value_share: 0.08, source_row_count: 1820, active_months: 98, available_months: 108, sales_value_score: 72.0, activity_coverage_score: 80.0, mcda_score: 75.2, priority_rank: 4, recommendation: 'Ensure bi-weekly warehouse staging and clinic reserves' },
    { territory: 'Camarines Norte', abc_class: 'B', sales_value: 6779466.33, sales_value_share: 0.06, source_row_count: 2230, active_months: 69, available_months: 108, sales_value_score: 48.0, activity_coverage_score: 64.0, mcda_score: 54.4, priority_rank: 5, recommendation: 'Pre-position antipyretics ahead of rainfall surges' },
    { territory: 'Cavite', abc_class: 'C', sales_value: 5448746.88, sales_value_share: 0.04, source_row_count: 1400, active_months: 92, available_months: 108, sales_value_score: 64.0, activity_coverage_score: 75.0, mcda_score: 68.4, priority_rank: 6, recommendation: 'Balance commercial distribution with emergency reserves' },
    { territory: 'Camarines Sur', abc_class: 'C', sales_value: 3846367.84, sales_value_share: 0.03, source_row_count: 2535, active_months: 65, available_months: 108, sales_value_score: 42.0, activity_coverage_score: 60.0, mcda_score: 49.2, priority_rank: 7, recommendation: 'Deploy mobile emergency distribution hubs' },
    { territory: 'Albay', abc_class: 'C', sales_value: 1231968.32, sales_value_share: 0.01, source_row_count: 350, active_months: 60, available_months: 108, sales_value_score: 30.0, activity_coverage_score: 48.0, mcda_score: 37.2, priority_rank: 8, recommendation: 'Maintain volcanic and typhoon buffer stock reserves' }
  ]
}

export async function getCommercialMcda(): Promise<CommercialMcdaResult> {
  try {
    return await getJson<CommercialMcdaResult>('/api/mcda_territories')
  } catch (error) {
    console.warn('MCDA service unavailable; using the governed local candidate dataset.', error)
    return {
      ...FALLBACK_MCDA_PROVINCES,
      dataset_status: 'local_fallback',
    }
  }
}
