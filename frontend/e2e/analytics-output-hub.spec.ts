import { test, expect, type Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'
import { MEDSHIELD_MARKUP, MEDSHIELD_STYLE } from '../lib/medshieldReference'
import { SALES_DATA_PAGE, WEATHER_VALIDATION_PAGE } from '../services/api/dashboard-markup'

const modulePath = path.resolve('services/api/analytics-output-hub.ts')
const globalStyles = fs.readFileSync(path.resolve('app/globals.css'), 'utf8')
const compiled = ts.transpileModule(fs.readFileSync(modulePath, 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
}).outputText
const loadModule = '(function(){const exports={};' + compiled + ';window.outputHubModule=exports;})()'

async function setup(page: Page, actualMarkup = false) {
  await page.route('http://medshield.test/**', route => route.fulfill({ contentType: 'text/html', body: '<html><body></body></html>' }))
  await page.goto('http://medshield.test/')
  await page.setContent('<style>' + globalStyles + MEDSHIELD_STYLE + '</style><style>body{margin:0}.fixture-shell{max-width:1120px;margin:24px auto;padding:0 18px}.fixture-shell .page{display:none}.fixture-shell .page.active{display:block}.fixture-native{padding:16px;margin-top:24px;border:1px solid var(--border)}.fixture-native p{margin:8px 0}</style><main class="medshield-root fixture-shell" data-source-state="loading">' + (actualMarkup ? MEDSHIELD_MARKUP + SALES_DATA_PAGE + WEATHER_VALIDATION_PAGE : '') + '</main>')
  await page.addScriptTag({ content: loadModule })
  await page.evaluate(({ actualMarkup }) => {
    const app = window as any
    const root = document.querySelector<HTMLElement>('.medshield-root')!
    const definitions = app.outputHubModule.TAB_ANALYTICS_PRESENTATION
    app.nativeClicks = []
    app.blobCreates = 0
    const originalCreate = URL.createObjectURL.bind(URL)
    URL.createObjectURL = (blob: Blob) => { app.blobCreates++; return originalCreate(blob) }
    if (!actualMarkup) for (const definition of definitions) {
      const section = document.createElement('section')
      section.id = 'page-' + definition.page
      section.className = 'page'
      const native = document.createElement('div')
      native.className = 'fixture-native'
      const insert = (selector: string, tag: string, text: string) => {
        if (native.querySelector(selector)) return
        const element = document.createElement(tag)
        if (selector.startsWith('#')) element.id = selector.slice(1)
        else element.setAttribute(selector.slice(1, -1), '')
        element.textContent = text
        native.append(element)
      }
      for (const [index, reading] of definition.readings.entries()) {
        insert(reading.selectors[0], 'p', index === 0
          ? 'Fixture — ₱0 recorded sales; a missing month is unavailable.'
          : 'Fixture — this panel keeps its own window and limitations.')
      }
      for (const output of definition.outputs) {
        insert(output.selector, 'button', output.label)
        native.querySelector(output.selector)!.addEventListener('click', () => app.nativeClicks.push({
          tab: definition.page, selector: output.selector, run: app.currentRun ?? 'run-A',
        }))
      }
      for (const target of definition.sections) insert(target.selector, 'div', target.label)
      section.append(native)
      root.append(section)
    }
    app.activateOutputTab = (name: string) => {
      root.querySelectorAll<HTMLElement>('.page').forEach(section => section.classList.toggle('active', section.id === 'page-' + name))
    }
    app.disposeOutputHub = app.outputHubModule.installAnalyticsOutputHub(root)
    app.activateOutputTab('overview')
  }, { actualMarkup })
}

async function activate(page: Page, name: string) {
  await page.evaluate(value => (window as any).activateOutputTab(value), name)
  await expect(page.locator('[data-analytics-tab="' + name + '"]')).toBeVisible()
  await page.locator('#page-' + name).evaluate(element => Promise.all(
    element.getAnimations({ subtree: true }).map(animation => animation.finished.catch(() => undefined)),
  ))
}

test('all nine pages show truthful companions before source readiness, including actual markup', async ({ page }) => {
  await setup(page, true)
  await expect(page.locator('.analytics-output-hub')).toHaveCount(9)
  await expect(page.locator('[data-analytics-output-style]')).toHaveCount(1)
  for (const name of ['overview', 'revenue', 'products', 'territory', 'forecast', 'inventory', 'data', 'sales-data', 'weather-validation']) {
    await activate(page, name)
    const hub = page.locator('[data-analytics-tab="' + name + '"]')
    await expect(hub.locator('dd').first()).toHaveText('Loading (can take up to a minute)')
    await hub.locator('.analytics-output-hub__menu > summary').click()
    await expect(hub.getByRole('button', { name: 'Download displayed summary' })).toBeDisabled()
    await expect(hub.locator('button:not(:disabled)')).toHaveCount(0)
  }
})

test('summaries update from current visible readouts and preserve zero, missingness and markup safety', async ({ page }) => {
  await setup(page)
  const hub = page.locator('[data-analytics-tab="overview"]')
  await page.evaluate(() => { document.querySelector<HTMLElement>('.medshield-root')!.dataset.sourceState = 'ready' })
  await expect(hub.locator('dd').first()).toContainText('₱0')
  await expect(hub.locator('dd').first()).toContainText('missing month is unavailable')
  await page.evaluate(() => { document.querySelector('#overview-descriptive-output')!.textContent = '<img src=x onerror=alert(1)> — ₱17, not an injected element' })
  await expect(hub.locator('dd').first()).toContainText('<img src=x')
  await expect(hub.locator('dd img')).toHaveCount(0)
  await page.evaluate(() => { document.querySelector<HTMLElement>('#overview-descriptive-output')!.hidden = true })
  await expect(hub.locator('dd').first()).toContainText('No current readout')
  await page.evaluate(() => { document.querySelector<HTMLElement>('.medshield-root')!.dataset.sourceState = 'loading' })
  await expect(hub.locator('dd').first()).toHaveText('Loading (can take up to a minute)')
  await hub.locator('.analytics-output-hub__menu > summary').click()
  await expect(hub.getByRole('button', { name: 'Download displayed summary' })).toBeDisabled()
  await expect(hub).not.toContainText('₱17')
})

test('native exports honor changing disabled, hidden, source and run states', async ({ page }) => {
  await setup(page)
  await page.evaluate(() => { document.querySelector<HTMLElement>('.medshield-root')!.dataset.sourceState = 'ready' })
  const menu = page.locator('[data-analytics-tab="overview"] .analytics-output-hub__menu > summary')
  await menu.click()
  const proxy = page.locator('[data-analytics-tab="overview"] [data-analytics-native-output="#overviewTrendExport"]')
  await expect(proxy).toBeEnabled()
  await proxy.press('Enter')
  expect(await page.evaluate(() => (window as any).nativeClicks)).toEqual([{ tab: 'overview', selector: '#overviewTrendExport', run: 'run-A' }])
  await page.evaluate(() => { (window as any).currentRun = 'run-B'; (document.querySelector('#overviewTrendExport') as HTMLButtonElement).disabled = true })
  await expect(proxy).toBeDisabled()
  await page.evaluate(() => { (document.querySelector('#overviewTrendExport') as HTMLButtonElement).disabled = false })
  await expect(proxy).toBeEnabled()
  await menu.click()
  await proxy.click()
  expect((await page.evaluate(() => (window as any).nativeClicks))[1].run).toBe('run-B')
  await page.evaluate(() => { document.querySelector<HTMLElement>('#overviewTrendExport')!.hidden = true })
  await expect(proxy).toBeDisabled()
  await page.evaluate(() => {
    document.querySelector<HTMLElement>('#overviewTrendExport')!.hidden = false
    document.querySelector<HTMLElement>('.medshield-root')!.dataset.sourceState = 'unavailable'
    ;(document.querySelector('[data-analytics-native-output]') as HTMLButtonElement).click()
  })
  expect(await page.evaluate(() => (window as any).nativeClicks.length)).toBe(2)
})

test('glossary explains key terms and pending panel exports remain disabled', async ({ page }) => {
  await setup(page)
  await activate(page, 'forecast')
  await page.evaluate(() => {
    document.querySelector<HTMLElement>('.medshield-root')!.dataset.sourceState = 'ready'
    document.querySelector('#forecastTakeaway')!.textContent = 'Loading (can take up to a minute)'
  })
  const hub = page.locator('[data-analytics-tab="forecast"]')
  await hub.locator('.analytics-output-hub__menu > summary').click()
  await expect(hub.getByRole('button', {name: 'Download displayed summary'})).toBeDisabled()
  await expect(hub.locator('.analytics-output-hub__export-note')).toContainText('Exports disabled while source evidence loads')
  await hub.getByText('How to interpret these outputs', {exact: true}).click()
  await hub.getByRole('link', {name: 'Read key terms'}).click()
  await expect(hub.locator('#analyticsGlossary-forecast')).toHaveAttribute('open', '')
  for (const term of ['Exclude Contracts:', 'WAPE:', 'Bias:', 'Approval pending:', 'Last observed value:']) {
    await expect(hub.getByText(term, {exact: true})).toBeVisible()
  }
  await page.evaluate(() => { document.querySelector<HTMLElement>('.medshield-root')!.dataset.sourceState = 'unavailable' })
  await expect(hub.locator('dd').first()).toHaveText('Source unavailable. Reload to retry.')
})

test('a finding inside a closed section is not reported as displayed, but its export still works', async ({ page }) => {
  await setup(page)
  await page.evaluate(() => {
    document.querySelector<HTMLElement>('.medshield-root')!.dataset.sourceState = 'ready'
    const closed = document.createElement('details')
    document.querySelector('#page-overview .fixture-native')!.append(closed)
    closed.append(document.querySelector('#overview-descriptive-output')!, document.querySelector('#overviewTrendExport')!)
  })
  const hub = page.locator('[data-analytics-tab="overview"]')
  await expect(hub.locator('dd').first()).toContainText('No current readout')
  await hub.locator('.analytics-output-hub__menu > summary').click()
  await hub.locator('[data-analytics-native-output="#overviewTrendExport"]').click()
  await expect(hub.locator('.analytics-output-hub__menu > summary')).toBeFocused()
  expect(await page.evaluate(() => (window as any).nativeClicks.length)).toBe(1)
  await page.evaluate(() => { document.querySelector<HTMLDetailsElement>('#page-overview details:not(.analytics-output-hub details)')!.open = true })
  await expect(hub.locator('dd').first()).toContainText('₱0')
})

test('the Forecast evaluation scope stays in the header while its method note is closed', async ({ page }) => {
  await setup(page)
  await activate(page, 'forecast')
  await page.evaluate(() => {
    document.querySelector<HTMLElement>('.medshield-root')!.dataset.sourceState = 'ready'
    const closed = document.createElement('details')
    document.querySelector('#page-forecast .fixture-native')!.append(closed)
    const scope = document.querySelector('#forecastEvaluationScope')!
    scope.textContent = 'Protocol: fixed_origin_multi_step'
    closed.append(scope)
  })
  const hub = page.locator('[data-analytics-tab="forecast"]')
  await expect(hub.locator('[data-analytics-readout="Evaluation scope"]')).toHaveText('Protocol: fixed_origin_multi_step')
})

test('header popovers and the export menu close predictably', async ({ page }) => {
  await setup(page)
  await page.evaluate(() => { document.querySelector<HTMLElement>('.medshield-root')!.dataset.sourceState = 'ready' })
  const hub = page.locator('[data-analytics-tab="overview"]')
  const help = hub.locator('.analytics-output-hub__more > details').first()
  const helpTitle = hub.getByText('How to interpret these outputs', { exact: true })
  const menu = hub.locator('.analytics-output-hub__menu')
  await helpTitle.click()
  await page.keyboard.press('Escape')
  await expect(help).not.toHaveAttribute('open', '')
  await expect(helpTitle).toBeFocused()
  await helpTitle.click()
  await page.mouse.click(5, 5)
  await expect(help).not.toHaveAttribute('open', '')
  await menu.locator('> summary').click()
  await page.evaluate(() => (document.activeElement as HTMLElement).blur())
  await page.keyboard.press('Escape')
  await expect(menu).not.toHaveAttribute('open', '')
  await expect(menu.locator('> summary')).toBeFocused()
  await menu.locator('> summary').click()
  const download = page.waitForEvent('download')
  await hub.getByRole('button', { name: 'Download displayed summary' }).click()
  await download
  await expect(menu).not.toHaveAttribute('open', '')
  await expect(menu.locator('> summary')).toBeFocused()
})

test('Sales Diagnostic readouts follow the visible output panel', async ({ page }) => {
  await setup(page)
  await page.evaluate(() => {
    const root = document.querySelector<HTMLElement>('.medshield-root')!
    root.dataset.sourceState = 'ready'
    const native = document.querySelector('#page-revenue .fixture-native')!
    const diagnosis = document.createElement('p')
    diagnosis.id = 'diagnosticStatus'
    const panel = document.createElement('div')
    panel.id = 'fixtureDiagnosis'
    panel.hidden = true
    native.append(panel)
    panel.append(diagnosis)
    // The trend reading lives in a closed summary, and the header still shows it.
    const closed = document.createElement('details')
    native.append(closed)
    const trend = document.querySelector<HTMLElement>('#salesTrendReading')!
    trend.textContent = 'Fixture trend — ₱0 signed change; two missing months.'
    closed.append(trend)
  })
  await activate(page, 'revenue')
  const finding = page.locator('[data-analytics-tab="revenue"] dd').nth(1)
  await expect(finding).toContainText('Fixture trend')
  await page.evaluate(() => {
    document.querySelector<HTMLElement>('#salesTrendReading')!.hidden = true
    document.querySelector<HTMLElement>('#fixtureDiagnosis')!.hidden = false
    document.querySelector('#diagnosticStatus')!.textContent = 'Fixture investigation — current matched-period contribution.'
  })
  await expect(finding).toContainText('Fixture investigation')
  await expect(finding).not.toContainText('two missing months')
})

test('every tab downloads only current displayed text and clearly incomplete provenance', async ({ page }) => {
  await setup(page)
  await page.evaluate(() => { document.querySelector<HTMLElement>('.medshield-root')!.dataset.sourceState = 'ready' })
  for (const name of ['overview', 'revenue', 'products', 'territory', 'forecast', 'inventory', 'data', 'sales-data', 'weather-validation']) {
    await activate(page, name)
    await page.locator('[data-analytics-tab="' + name + '"] .analytics-output-hub__menu > summary').click()
    const button = page.locator('[data-analytics-tab="' + name + '"]').getByRole('button', { name: 'Download displayed summary' })
    await expect(button).toBeEnabled()
    const downloadPromise = page.waitForEvent('download')
    await button.click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toBe('medshield-' + name + '-displayed-summary.json')
    const file = await download.path()
    const result = JSON.parse(fs.readFileSync(file!, 'utf8'))
    expect(result.schema_version).toBe('medshield_displayed_tab_summary_v1')
    expect(result.source_identity).toBeNull()
    expect(result.approval_granted_by_export).toBe(false)
    expect(result.timezone).toBe('Asia/Manila')
    expect(result.displayed_readouts[0].text).toContain('₱0')
    expect(result.provenance_note).toContain('displayed text')
  }
  await expect(page.locator('[data-analytics-tab="weather-validation"] [data-analytics-native-output]')).toHaveCount(0)
})

test('reinstallation and disposal remove styles, companions and stale callbacks', async ({ page }) => {
  await setup(page)
  await page.evaluate(() => {
    const app = window as any
    app.oldDispose = app.disposeOutputHub
    app.disposeOutputHub = app.outputHubModule.installAnalyticsOutputHub(document.querySelector('.medshield-root'))
    app.oldDispose()
  })
  await expect(page.locator('.analytics-output-hub')).toHaveCount(9)
  await expect(page.locator('[data-analytics-output-style]')).toHaveCount(1)
  await page.evaluate(() => { (window as any).disposeOutputHub(); document.querySelector<HTMLElement>('.medshield-root')!.dataset.sourceState = 'ready' })
  await expect(page.locator('.analytics-output-hub')).toHaveCount(0)
  await expect(page.locator('[data-analytics-output-style]')).toHaveCount(0)
  expect(await page.evaluate(() => (window as any).blobCreates)).toBe(0)
})

for (const width of [1440, 824, 390]) {
  test('all tab companions fit and remain readable at ' + width + 'px', async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 })
    await setup(page)
    await page.evaluate(() => { document.querySelector<HTMLElement>('.medshield-root')!.dataset.sourceState = 'ready' })
    for (const name of ['overview', 'revenue', 'products', 'territory', 'forecast', 'inventory', 'data', 'sales-data', 'weather-validation']) {
      await activate(page, name)
      const hub = page.locator('[data-analytics-tab="' + name + '"]')
      await expect(hub.locator('dd').first()).toContainText('Fixture')
      const boxes = await hub.locator('button').evaluateAll(nodes => nodes.map(node => {
        const box = node.getBoundingClientRect()
        return { left: box.left, right: box.right, height: box.height }
      }))
      expect(boxes.every(box => box.left >= 0 && box.right <= width + 1)).toBe(true)
      if (width < 700) expect(boxes.every(box => box.height >= 44), JSON.stringify({ name, boxes })).toBe(true)
      await hub.screenshot({ path: testInfo.outputPath(name + '-' + width + '.png') })
    }
  })
}
