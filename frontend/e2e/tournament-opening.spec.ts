import { test, expect, type Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'
import { MEDSHIELD_STYLE } from '../lib/medshieldReference'
import type { TournamentResearch } from '../services/api/tournament-research'

// Saved gateway capture replay. These tests do not establish a new live Gold read.
const captured = JSON.parse(fs.readFileSync(path.resolve('../outputs/current_integration_20261105/final/source-tournament.json'), 'utf8')) as TournamentResearch
const compiled = ts.transpileModule(fs.readFileSync(path.resolve('services/api/tournament-research.ts'), 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText

async function setup(page: Page) {
  let unavailable = false
  await page.route('http://medshield.test/**', route => route.fulfill({ contentType: 'text/html', body: '<html><body></body></html>' }))
  await page.route('http://medshield.test/api/sales/tournament-research', route => route.fulfill({
    status: unavailable ? 503 : 200, contentType: 'application/json', body: JSON.stringify(unavailable ? { error: 'SOURCE_UNAVAILABLE' } : captured),
  }))
  await page.goto('http://medshield.test/')
  const globalStyles = fs.readFileSync(path.resolve('app/globals.css'), 'utf8')
  await page.setContent(`<style>${globalStyles}\n${MEDSHIELD_STYLE}</style><style>body{margin:0}main{width:100%;min-width:0;max-width:1120px;margin:auto;padding:16px;box-sizing:border-box}</style><main class="medshield-root"><section class="page active"><div data-forecast-validation></div></section></main>`)
  await page.addScriptTag({ path: path.resolve('node_modules/chart.js/dist/chart.umd.js') })
  await page.addScriptTag({ content: `(function(){const exports={};const require=(name)=>{
    if(name==='chart.js/auto')return {default:window.Chart};
    if(name==='./api-client')return {getJson:async(url,options)=>{
      const response=await fetch('http://medshield.test'+url,options);
      if(!response.ok)throw Error('Source unavailable');return response.json();}};
    throw Error('Unexpected dependency '+name);
  };${compiled};window.disposeTournament=exports.installTournamentResearch(document.querySelector('main'));})()` })
  await expect(page.locator('[data-tournament-export]')).toBeEnabled()
  return { failSource: (value: boolean) => { unavailable = value } }
}

async function csv(page: Page) {
  const waiting = page.waitForEvent('download')
  await page.locator('[data-tournament-export]').click()
  const download = await waiting
  const content = fs.readFileSync((await download.path())!, 'utf8').replace(/^\uFEFF/, '').trim()
  const records = content.split(/\r?\n/).map(line => Array.from(line.matchAll(/"((?:[^"]|"")*)"(?:,|$)/g), match => match[1].replace(/""/g, '"')))
  const header = records.shift()!
  return { filename: download.suggestedFilename(), rows: records.map(row => Object.fromEntries(header.map((key, index) => [key, row[index]]))) }
}

for (const width of [1440, 390]) {
  test(`company research opens on development and keeps each window/export aligned at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 1000 })
    await setup(page)
    await expect(page.locator('[data-tournament-stage]')).toHaveValue('development')
    await expect(page.locator('[data-tournament-lead]')).toHaveValue('1')
    await expect(page.locator('[data-tournament-model]')).toHaveValue(captured.selections.find(s => s.lead_months === 1)!.model_id)
    await expect(page.locator('[data-tournament-status]')).toContainText('19/19')
    await expect(page.locator('[data-tournament-metrics]')).toContainText('71.66%')
    const observations = []
    for (const stage of ['development', 'retrospective_audit', 'inspected_extension'] as const) {
      await page.selectOption('[data-tournament-stage]', stage)
      const model = await page.locator('[data-tournament-model]').inputValue()
      const group = captured.groups.find(g => g.stage === stage && g.model_id === model && g.lead_months === 1)!
      const points = captured.points.filter(p => p.stage === stage && p.model_id === model && p.lead_months === 1).sort((a, b) => a.target_period.localeCompare(b.target_period))
      await expect(page.locator('[data-tournament-points] tbody tr')).toHaveCount(group.expected_cases)
      await expect(page.locator('[data-tournament-status]')).toContainText(`${group.n}/${group.expected_cases}`)
      await expect(page.locator('[data-tournament-metrics]')).toContainText(`${group.wape!.toLocaleString('en-PH', { maximumFractionDigits: 2 })}%`)
      const chart = await page.locator('[data-tournament-chart]').evaluate(canvas => {
        const c = (window as any).Chart.getChart(canvas)
        return c.data.datasets.map((d: { data: number[] }) => d.data)
      })
      expect(chart).toEqual([points.map(p => p.actual), points.map(p => p.prediction)])
      const output = await csv(page)
      expect(output.filename).toContain(stage)
      expect(output.rows).toHaveLength(points.length)
      for (let index = 0; index < points.length; index++) {
        const row = output.rows[index]
        expect(row.stage).toBe(stage)
        expect(row.origin_month).toBe(points[index].origin_period)
        expect(Number(row.actual_php)).toBe(points[index].actual)
        expect(Number(row.prediction_php)).toBe(points[index].prediction)
        expect(row.dataset_id).toBe(captured.source.dataset_id)
        for (const key of ['publication_approved', 'activation_allowed', 'operational_approval', 'financial_release_approved']) expect(row[key]).toBe('false')
      }
      observations.push({ stage, cases: points.length, wape: group.wape, csv: output.filename })
    }
    await page.selectOption('[data-tournament-stage]', 'development')
    for (const lead of [3, 6]) {
      await page.selectOption('[data-tournament-lead]', String(lead))
      await expect(page.locator('[data-tournament-model]')).toHaveValue(captured.selections.find(s => s.lead_months === lead)!.model_id)
      await expect(page.locator('[data-tournament-points] tbody tr')).toHaveCount(19)
    }
    await page.selectOption('[data-tournament-lead]', '1')
    const unavailable = captured.groups.find(g => g.stage === 'development' && g.lead_months === 1 && g.n === 0)!
    await page.selectOption('[data-tournament-model]', unavailable.model_id)
    await expect(page.locator('[data-tournament-status]')).toContainText('0/19')
    await expect(page.locator('[data-tournament-metrics]')).toContainText('WAPE Unavailable')
    const absent = await csv(page)
    expect(absent.rows).toHaveLength(19)
    expect(absent.rows.every(row => row.prediction_php === '' && row.group_wape_pct === '')).toBe(true)
    await page.selectOption('[data-tournament-model]', captured.selections[0].model_id)
    const stageSelect = page.locator('[data-tournament-stage]')
    await stageSelect.focus()
    await expect(stageSelect).toBeFocused()
    await stageSelect.press('ArrowDown')
    await stageSelect.press('Enter')
    await expect(stageSelect).toHaveValue('retrospective_audit')
    await stageSelect.press('Escape')
    if (width === 390) {
      const tableRegion = page.getByRole('region', { name: 'Tournament prediction table', exact: true })
      await expect.poll(() => tableRegion.evaluate(element => element.scrollWidth > element.clientWidth)).toBe(true)
      await tableRegion.focus()
      await tableRegion.press('ArrowRight')
      await expect.poll(() => tableRegion.evaluate(element => element.scrollLeft)).toBeGreaterThan(0)
      await tableRegion.evaluate(element => { element.scrollLeft = 0 })
    }
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
    await page.locator('.tournament-research').screenshot({ path: info.outputPath(`tournament-${width}.png`), animations: 'disabled' })
    fs.writeFileSync(info.outputPath('window-parity.json'), JSON.stringify({ evidence: 'captured-response replay', width, observations, selection_changed: false, live_source_read: false }, null, 2))
  })
}

test('reload, source failure and source replacement clear evidence and return to the development view', async ({ page }) => {
  const source = await setup(page)
  await page.selectOption('[data-tournament-stage]', 'inspected_extension')
  source.failSource(true)
  await page.locator('[data-tournament-reload]').click()
  await expect(page.locator('[data-tournament-status]')).toContainText('unavailable')
  await expect(page.locator('[data-tournament-export]')).toBeDisabled()
  await expect(page.locator('[data-tournament-points] tbody tr')).toHaveCount(0)
  await expect(page.locator('[data-tournament-understandingbox]')).toBeHidden()
  source.failSource(false)
  await page.locator('[data-tournament-reload]').click()
  await expect(page.locator('[data-tournament-stage]')).toHaveValue('development')
  await expect(page.locator('[data-tournament-status]')).toContainText('19/19')
  await page.evaluate(() => document.querySelector('main')!.dispatchEvent(new Event('medshield:source-reloaded')))
  await expect(page.locator('[data-tournament-export]')).toBeDisabled()
  await expect(page.locator('[data-tournament-points] tbody tr')).toHaveCount(0)
  await page.locator('[data-tournament-reload]').click()
  await expect(page.locator('[data-tournament-stage]')).toHaveValue('development')
})
