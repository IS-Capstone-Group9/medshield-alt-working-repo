import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'
import { WEATHER_VALIDATION_PAGE } from '../services/api/dashboard-markup'
import { MEDSHIELD_STYLE } from '../lib/medshieldReference'
import { weatherRefreshPeriod } from '../services/api/weather-provider-helpers'

test('weather refresh calendar uses closed Manila months beyond 2025', () => {
  expect(weatherRefreshPeriod('2026', new Date('2026-10-08T00:00:00Z'))).toEqual({ start: '2026-01-01', end: '2026-09-30' })
  expect(weatherRefreshPeriod('all', new Date('2026-09-30T15:59:59Z')).end).toBe('2026-08-31')
  expect(weatherRefreshPeriod('all', new Date('2026-09-30T16:00:00Z')).end).toBe('2026-09-30')
  expect(() => weatherRefreshPeriod('2027', new Date('2026-10-08T00:00:00Z'))).toThrow()
})

test('new models read through gateway, refresh explicitly and clear stale rows on source failure', async ({ page }) => {
  const files = ['weather-provider-helpers', 'weather-view-helpers', 'dashboard-interactions']
  const scripts = Object.fromEntries(await Promise.all(files.map(async name => [name, ts.transpileModule(
    await readFile(`services/api/${name}.ts`, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText])))
  await page.setContent(`<main id="root">${WEATHER_VALIDATION_PAGE}</main>`)
  await expect(page.locator('#weatherProvider option')).toHaveCount(5)
  await expect(page.locator('#weatherArea option')).toHaveCount(18)
  const result = await page.evaluate(async scripts => {
    const load = (script: string, require: (name: string) => any) => {
      const module = { exports: {} as any }
      new Function('require', 'module', 'exports', script)(require, module, module.exports)
      return module.exports
    }
    const helpers = load(scripts['weather-provider-helpers'], () => ({}))
    const view = load(scripts['weather-view-helpers'], () => ({ formatSalesValue: (value: unknown) => value == null ? '-' : String(value) }))
    const calls: any[] = []
    let fail = false
    const api = { getWeatherEffects: async (query: any) => {
      calls.push({ kind: 'read', ...query })
      if (fail) throw new Error('Databricks unavailable')
      return { metadata: { provider: query.provider, system_of_record: 'databricks', rows_returned: 1 }, summary: [],
        rows: [{ period: '2024-01', area: 'Quezon', provider: query.provider, rainfall_mm: 0, rainy_days: 0, avg_temperature_c: null, avg_relative_humidity_pct: null,
          max_wind_speed_kph: null, rainfall_severity_proxy: null, weather_alert_level: 'unavailable', sales_revenue: null, planning_demand_uplift_pct: null }] }
    }, refreshWeatherData: async (input: any) => { calls.push({ kind: 'refresh', ...input }); return {} } }
    const interactions = load(scripts['dashboard-interactions'], name => name === '@/lib/api' ? api : name === './weather-view-helpers' ? view : name === './weather-provider-helpers' ? helpers : {})
    const root = document.querySelector<HTMLElement>('#root')!
    const provider = root.querySelector<HTMLSelectElement>('#weatherProvider')!
    const area = root.querySelector<HTMLSelectElement>('#weatherArea')!
    const year = root.querySelector<HTMLSelectElement>('#weatherYear')!
    helpers.populateWeatherYears(year, new Date('2026-10-08T00:00:00Z'))
    const years = Array.from(year.options, option => option.value)
    year.value = '2024'; area.value = 'Quezon'
    const displays: string[] = []
    for (const value of ['open_meteo_era5', 'open_meteo_era5_seamless', 'open_meteo_ifs']) {
      provider.value = value
      await interactions.loadWeatherEffectView(root)
      displays.push(root.querySelector('#weatherEffectStatus')!.textContent!)
    }
    const cells = Array.from(root.querySelectorAll('#weatherEffectTable tbody td'), cell => cell.textContent)
    await interactions.refreshSelectedWeatherData(root)
    fail = true
    provider.value = 'nasa_power'
    await interactions.loadWeatherEffectView(root)
    return { calls, displays, cells, years, failedRowCount: root.querySelectorAll('#weatherEffectTable tbody tr').length,
      failureStatus: root.querySelector('#weatherEffectStatus')!.textContent, count: root.querySelector('#weatherEffectCount')!.textContent }
  }, scripts)
  expect(result.displays[0]).toContain('Open-Meteo ERA5 | Databricks Gold')
  expect(result.displays[1]).toContain('Open-Meteo ERA5-Seamless')
  expect(result.displays[2]).toContain('Open-Meteo ECMWF IFS')
  expect(result.cells).toContain('0.0 mm')
  expect(result.cells).toContain('Unavailable')
  expect(result.calls.find(call => call.kind === 'refresh')).toEqual({ kind: 'refresh', start: '2024-01-01', end: '2024-12-31', areas: ['Quezon'], provider: 'open_meteo_ifs' })
  expect(result.years).toContain('2026')
  expect(result.failedRowCount).toBe(0)
  expect(result.failureStatus).toBe('Databricks unavailable')
  expect(result.count).toBe('Unavailable')
})

test('weather controls fit desktop and mobile with existing styles', async ({ page }) => {
  const overrides = await readFile('app/overrides.css', 'utf8')
  // Production places pages in a bounded flex content container; display:contents
  // on the root alone does not provide that container in an isolated fixture.
  await page.setContent(`<style>${MEDSHIELD_STYLE}\n${overrides}\nbody{margin:0} #page-weather-validation{display:block;padding:16px}</style><main class="medshield-root"><div style="width:100%;min-width:0">${WEATHER_VALIDATION_PAGE}</div></main>`)
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 })
    for (const selector of ['#weatherProvider', '#weatherArea', '#weatherYear', '#weatherRefresh']) {
      const box = await page.locator(selector).boundingBox()
      expect(box).not.toBeNull()
      expect(box!.x).toBeGreaterThanOrEqual(0)
      expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1)
    }
    await page.screenshot({ path: `../outputs/weather_reliability_20261008/weather-controls-${width}.png`, fullPage: true })
  }
})
