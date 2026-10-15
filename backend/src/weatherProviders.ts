import { refreshNasaPowerWeather, NasaPowerRefreshInput, WeatherRefreshInputError } from './nasaPowerWeather'
import { isOpenMeteoProvider, OPEN_METEO_PROVIDERS, refreshOpenMeteoWeather } from './openMeteoWeather'

export async function refreshWeatherProvider(input: NasaPowerRefreshInput) {
  const provider = typeof input.provider === 'string' ? input.provider.trim().toLowerCase() : input.provider == null ? 'nasa_power' : ''
  if (provider === 'nasa_power') return refreshNasaPowerWeather({ ...input, provider })
  if (isOpenMeteoProvider(provider)) return refreshOpenMeteoWeather({ ...input, provider })
  throw new WeatherRefreshInputError(`provider must be nasa_power or ${Object.keys(OPEN_METEO_PROVIDERS).join(', ')}; PAGASA uses controlled Databricks file ingestion`)
}
