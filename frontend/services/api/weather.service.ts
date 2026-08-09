import { getJson, authenticatedJson } from './api-client'
import { WeatherEffects } from '@/types/api.types'

export function getWeatherEffects(
  params: { year?: string; area?: string; grain?: 'daily' | 'monthly' } = {}
): Promise<WeatherEffects> {
  const query = new URLSearchParams({
    year: params.year ?? 'all',
    area: params.area ?? 'all',
    grain: params.grain ?? 'monthly',
  })
  return getJson<WeatherEffects>(`/api/weather/effects?${query.toString()}`)
}

export function refreshWeatherData(input: {
  start: string
  end: string
  areas: string[]
  provider: 'nasa_power' | 'open_meteo'
}): Promise<Record<string, unknown>> {
  return authenticatedJson<Record<string, unknown>>('/api/weather/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}
