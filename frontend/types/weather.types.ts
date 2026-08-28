export type WeatherEffect = {
  date?: string
  period: string
  area: string
  provider: string
  rainfall_mm: number
  rainy_day?: boolean
  rainy_days?: number
  temperature_c?: number
  avg_temperature_c?: number
  relative_humidity_pct?: number | null
  avg_relative_humidity_pct?: number | null
  wind_speed_kph?: number
  max_wind_speed_kph?: number
  wind_speed_ms?: number
  rainfall_severity_proxy: number
  rainfall_severity_index?: number
  weather_alert_level: string
  sales_revenue?: number
  sales_total_net_cost?: number
  planning_demand_uplift_pct: number
  prescriptive_planning_uplift?: number
}

export type WeatherEffects = {
  metadata: {
    provider?: string
    grain?: string
    period_start?: string
    period_end?: string
    rows_returned?: number
    sales_matched_rows?: number
  }
  summary: Array<{
    periods?: number
    sales_matched_periods?: number
    rainfall_revenue_correlation?: number | null
  }>
  rows: WeatherEffect[]
}
