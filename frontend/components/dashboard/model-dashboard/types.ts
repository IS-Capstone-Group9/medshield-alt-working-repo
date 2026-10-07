export interface ModelEntry {
  model_name: string
  model_code: string
  layer: string
  status: string
  mae?: number
  rmse?: number
  mape?: number
  note?: string
  output?: string
  monthly_indices?: { month: string; index: number }[]
  external_correlations?: Record<string, { r: number; p_value: string; interpretation: string }>
}

export interface ModelSummary {
  methodology: { overall: string; data_period: string }
  descriptive: ModelEntry[]
  predictive: ModelEntry[]
  prescriptive: ModelEntry[]
  data_sources: { name: string; period: string; rows?: number; status: string }[]
}
