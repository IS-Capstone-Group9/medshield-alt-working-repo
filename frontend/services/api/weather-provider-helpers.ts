export const WEATHER_API_PROVIDERS = ['nasa_power', 'open_meteo_era5', 'open_meteo_era5_seamless', 'open_meteo_ifs'] as const
export type WeatherApiProvider = typeof WEATHER_API_PROVIDERS[number]
export type WeatherProvider = 'PAGASA' | WeatherApiProvider

export function isWeatherApiProvider(value: string): value is WeatherApiProvider {
  return (WEATHER_API_PROVIDERS as readonly string[]).includes(value)
}

export function weatherRefreshPeriod(year: string, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit' }).formatToParts(now)
  const currentYear = Number(parts.find(part => part.type === 'year')!.value)
  const month = Number(parts.find(part => part.type === 'month')!.value)
  const latest = new Date(Date.UTC(currentYear, month - 1, 0)).toISOString().slice(0, 10)
  if (year === 'all') return { start: '2017-01-01', end: latest }
  if (!/^\d{4}$/.test(year) || Number(year) < 2017 || Number(year) > currentYear) throw new Error('Choose a supported weather year.')
  const end = Number(year) === currentYear ? latest : `${year}-12-31`
  const start = `${year}-01-01`
  if (start > end) throw new Error('The selected year has no fully closed month yet.')
  return { start, end }
}

export function populateWeatherYears(select: HTMLSelectElement, now = new Date()) {
  const year = Number(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric' }).format(now))
  const selected = select.value || '2024'
  select.replaceChildren(new Option('All Years', 'all'))
  for (let value = year; value >= 2017; value--) select.add(new Option(String(value), String(value)))
  select.value = selected
}
