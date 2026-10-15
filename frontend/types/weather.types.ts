export type WeatherEffect = {
  date?: string
  period: string
  area: string
  provider: string
  rainfall_mm: number | null
  rainy_day?: boolean
  rainy_days?: number | null
  temperature_c?: number
  avg_temperature_c?: number | null
  relative_humidity_pct?: number | null
  avg_relative_humidity_pct?: number | null
  wind_speed_kph?: number
  max_wind_speed_kph?: number | null
  wind_speed_ms?: number
  rainfall_severity_proxy: number | null
  rainfall_severity_index?: number
  weather_alert_level: string
  sales_revenue?: number | null
  sales_total_net_cost?: number
  planning_demand_uplift_pct: number | null
  prescriptive_planning_uplift?: number
  expected_days?: number | null
  valid_rainfall_days?: number | null
  quality_status?: string
  candidate_only?: boolean
}

export type WeatherEffects = {
  metadata: {
    provider?: string
    grain?: string
    period_start?: string | null
    period_end?: string | null
    rows_returned?: number
    sales_matched_rows?: number
    source?: string
    system_of_record?: string
    status?: string
    candidate_only?: boolean
    is_forecast_eligible?: boolean
    interpretation?: string
  }
  summary: Array<{
    periods?: number
    sales_matched_periods?: number
    rainfall_revenue_correlation?: number | null
  }>
  rows: WeatherEffect[]
}
