import { WeatherEffects } from '@/lib/api'
import { formatSalesValue } from './sales-view-helpers'

export function weatherProviderLabel(provider: string) {
  if (provider === 'nasa_power') return 'NASA POWER'
  if (provider === 'open_meteo_era5') return 'Open-Meteo ERA5'
  if (provider === 'open_meteo_era5_seamless') return 'Open-Meteo ERA5-Seamless'
  if (provider === 'open_meteo_ifs') return 'Open-Meteo ECMWF IFS'
  if (provider === 'open_meteo') return 'Open-Meteo Archive'
  return provider
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function applyWeatherColumns(root: HTMLElement) {
  const table = root.querySelector<HTMLTableElement>('#weatherEffectTable')
  if (!table) return
  const full = root.querySelector<HTMLSelectElement>('#weatherColumns')?.value === 'full'
  const headers = Array.from(table.querySelectorAll<HTMLTableCellElement>('thead th'))
  headers.forEach((header, index) => {
    const hidden = !full && header.dataset.compact === 'false'
    header.hidden = hidden
    for (const row of Array.from(table.tBodies).flatMap(body => Array.from(body.rows))) {
      if (row.cells.length === headers.length) row.cells[index].hidden = hidden
      else if (row.cells.length === 1) row.cells[0].colSpan = full ? headers.length : headers.filter(cell => cell.dataset.compact !== 'false').length
    }
  })
}

export function renderWeatherEffects(root: HTMLElement, result: WeatherEffects) {
  const table = root.querySelector<HTMLTableElement>('#weatherEffectTable')
  const status = root.querySelector<HTMLElement>('#weatherEffectStatus')
  const countLabel = root.querySelector<HTMLElement>('#weatherEffectCount')
  if (!table || !status) return
  
  const metadata = result.metadata ?? {}
  const grain = String(metadata.grain ?? root.querySelector<HTMLSelectElement>('#weatherGrain')?.value ?? 'monthly')
  const provider = String(metadata.provider ?? 'not refreshed')
  const sourceLabel = metadata.system_of_record === 'databricks' ? 'Databricks Gold' : 'unverified source'
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
  const measurements = [
    (item: WeatherEffects['rows'][number]) => isDaily ? item.rainy_day : item.rainy_days,
    (item: WeatherEffects['rows'][number]) => isDaily ? item.temperature_c : item.avg_temperature_c,
    (item: WeatherEffects['rows'][number]) => isDaily ? item.relative_humidity_pct : item.avg_relative_humidity_pct,
    (item: WeatherEffects['rows'][number]) => isDaily ? item.wind_speed_kph : item.max_wind_speed_kph,
  ]
  const compact = [true, true, true, true, ...measurements.map(measure => result.rows.some(item => {
    const value = measure(item)
    return typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value))
  })), false, false, false, false]
  const headers = isDaily
    ? ['Date', 'Area', 'Provider', 'Rainfall', 'Rainy Day', 'Temp', 'Humidity', 'Wind', 'Severity Proxy', 'Alert', 'Daily Sales Net CP', 'Planning Uplift']
    : ['Period', 'Area', 'Provider', 'Rainfall', 'Rainy Days', 'Avg Temp', 'Avg Humidity', 'Max Reported Wind', 'Severity Proxy', 'Alert', 'Monthly Sales Net CP', 'Planning Uplift']
  
  const head = table.createTHead()
  const headerRow = head.insertRow()
  for (const [index, label] of headers.entries()) {
    const cell = document.createElement('th')
    cell.scope = 'col'
    cell.dataset.compact = String(compact[index])
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
        item.rainfall_mm == null ? 'Unavailable' : `${Number(item.rainfall_mm).toFixed(1)} mm`,
        isDaily ? (item.rainy_day == null ? 'Unavailable' : item.rainy_day ? 'Yes' : 'No') : item.rainy_days == null ? 'Unavailable' : String(item.rainy_days),
        temperature == null ? 'Unavailable' : `${Number(temperature).toFixed(1)} C`,
        humidity == null ? 'Unavailable' : `${Number(humidity).toFixed(1)}%`,
        wind == null ? 'Unavailable' : `${Number(wind).toFixed(1)} km/h`,
        item.rainfall_severity_proxy == null ? 'Unavailable' : Number(item.rainfall_severity_proxy).toFixed(3),
        item.weather_alert_level,
        formatSalesValue(item.sales_revenue, 'money'),
        item.planning_demand_uplift_pct == null ? 'Unavailable' : `${Number(item.planning_demand_uplift_pct).toFixed(1)}%`,
      ]
      const row = body.insertRow()
      for (const value of values) {
        row.insertCell().textContent = value
      }
    }
  }

  status.textContent = result.rows.length
    ? `${weatherProviderLabel(provider)} | ${sourceLabel} | ${grain === 'daily' ? 'Daily rows' : 'Monthly aggregate'} | ${period} · ${metadata.candidate_only === false ? 'Approval not established' : 'Candidate'}`
    : metadata.status === 'not_refreshed'
      ? `No ${weatherProviderLabel(provider)} candidate data has been refreshed into ${sourceLabel} for this selection.`
      : `No ${weatherProviderLabel(provider)} rows match the selected territory and year in ${sourceLabel}.`
  
  if (countLabel) {
    countLabel.textContent = `${periods} weather records · ${salesMatches} sales matches`
  }
  const evidence = root.querySelector<HTMLElement>('#weatherEffectEvidence')
  if (evidence) evidence.textContent = `Rainfall-revenue ${correlation}. ${metadata.interpretation ?? ''}`
  applyWeatherColumns(root)
}
