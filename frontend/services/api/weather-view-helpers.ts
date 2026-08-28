import { WeatherEffects } from '@/lib/api'
import { formatSalesValue } from './sales-view-helpers'

export function weatherProviderLabel(provider: string) {
  if (provider === 'nasa_power') return 'NASA POWER'
  if (provider === 'open_meteo') return 'Open-Meteo Archive'
  return provider
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function renderWeatherEffects(root: HTMLElement, result: WeatherEffects) {
  const table = root.querySelector<HTMLTableElement>('#weatherEffectTable')
  const status = root.querySelector<HTMLElement>('#weatherEffectStatus')
  const countLabel = root.querySelector<HTMLElement>('#weatherEffectCount')
  if (!table || !status) return
  
  const metadata = result.metadata ?? {}
  const grain = String(metadata.grain ?? root.querySelector<HTMLSelectElement>('#weatherGrain')?.value ?? 'monthly')
  const provider = String(metadata.provider ?? 'not refreshed')
  const period = metadata.period_start && metadata.period_end
    ? `${String(metadata.period_start)} to ${String(metadata.period_end)}`
    : 'no period loaded'
  const summary = result.summary?.[0] ?? {}
  const periods = String(metadata.rows_returned ?? summary.periods ?? result.rows.length)
  const salesMatches = String(metadata.sales_matched_rows ?? summary.sales_matched_periods ?? 0)
  const correlation = summary.rainfall_revenue_correlation == null
    ? 'association needs more matched months'
    : `association ${String(summary.rainfall_revenue_correlation)}`
  
  table.replaceChildren()
  const isDaily = grain === 'daily'
  const headers = isDaily
    ? ['Date', 'Area', 'Provider', 'Rainfall', 'Rainy Day', 'Temp', 'Humidity', 'Wind', 'Severity Proxy', 'Alert', 'Daily Sales Net CP', 'Planning Uplift']
    : ['Period', 'Area', 'Provider', 'Rainfall', 'Rainy Days', 'Avg Temp', 'Avg Humidity', 'Max Wind', 'Severity Proxy', 'Alert', 'Monthly Sales Net CP', 'Planning Uplift']
  
  const head = table.createTHead()
  const headerRow = head.insertRow()
  for (const label of headers) {
    const cell = document.createElement('th')
    cell.textContent = label
    headerRow.appendChild(cell)
  }

  const body = table.createTBody()
  if (!result.rows.length) {
    const row = body.insertRow()
    const cell = row.insertCell()
    cell.colSpan = headers.length
    cell.className = 'uploaded-data-empty'
    cell.textContent = 'No weather validation data matched. Verify territory name matches database.'
  } else {
    for (const item of result.rows) {
      const temperature = isDaily ? item.temperature_c : item.avg_temperature_c
      const humidity = isDaily ? item.relative_humidity_pct : item.avg_relative_humidity_pct
      const wind = isDaily ? item.wind_speed_kph : item.max_wind_speed_kph
      const values = [
        isDaily ? item.date ?? item.period : item.period,
        item.area,
        item.provider,
        `${item.rainfall_mm.toFixed(1)} mm`,
        isDaily ? (item.rainy_day ? 'Yes' : 'No') : String(item.rainy_days ?? 0),
        `${Number(temperature ?? 0).toFixed(1)} C`,
        humidity == null ? '-' : `${Number(humidity).toFixed(1)}%`,
        `${Number(wind ?? 0).toFixed(1)} km/h`,
        item.rainfall_severity_proxy.toFixed(3),
        item.weather_alert_level,
        formatSalesValue(item.sales_revenue, 'money'),
        `${item.planning_demand_uplift_pct.toFixed(1)}%`,
      ]
      const row = body.insertRow()
      for (const value of values) {
        row.insertCell().textContent = value
      }
    }
  }

  status.textContent = result.rows.length
    ? `${weatherProviderLabel(provider)} | ${grain === 'daily' ? 'Daily rows' : 'Monthly aggregate'} | ${period} | ${periods} weather rows | ${salesMatches} sales matches | ${correlation}`
    : 'No weather rows match the selected territory and year.'
  
  if (countLabel) {
    countLabel.textContent = `Fetched ${periods} records | matched ${salesMatches} sales periods | rainfall-revenue ${correlation}`
  }
}
