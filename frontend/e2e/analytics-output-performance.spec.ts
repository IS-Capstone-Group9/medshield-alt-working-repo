import { test, expect, type Browser } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import ts from 'typescript'

const original = path.resolve(process.env.MEDSHIELD_OUTPUT_HUB_BASELINE ?? '../outputs/optimization_steps_20261102/frontend/before-analytics-output-hub.ts')
const current = path.resolve('services/api/analytics-output-hub.ts')
const digest = (source: string) => crypto.createHash('sha256').update(source).digest('hex')
const compile = (source: string) => '(function(){const exports={};' + ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText + ';window.outputHubModule=exports;})()'

async function measure(browser: Browser, source: string) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true })
  const page = await context.newPage()
  await page.setContent('<style>.page{display:none}.page.active{display:block}button{display:inline-block}</style><main class="medshield-root" data-source-state="ready"></main>')
  await page.addScriptTag({ content: compile(source) })
  const result = await page.evaluate(async () => {
    type Definition = { page: string; readings: Array<{ selectors: string[] }>; outputs: Array<{ selector: string }>; sections: Array<{ selector: string }> }
    const app = window as unknown as {
      outputHubModule: { TAB_ANALYTICS_PRESENTATION: Definition[]; installAnalyticsOutputHub: (root: HTMLElement) => () => void }
    }
    const root = document.querySelector<HTMLElement>('.medshield-root')!
    const definitions = app.outputHubModule.TAB_ANALYTICS_PRESENTATION
    const nativeClicks: string[] = [], blobs: Blob[] = []
    const createUrl = URL.createObjectURL.bind(URL)
    URL.createObjectURL = blob => { if (blob instanceof Blob) blobs.push(blob); return createUrl(blob) }
    for (const definition of definitions) {
      const section = document.createElement('section')
      section.className = 'page'
      section.id = 'page-' + definition.page
      const native = document.createElement('div')
      native.className = 'native'
      const insert = (selector: string, tag: string, text: string) => {
        if (native.querySelector(selector)) return
        // Complex selector in the Diagnostic fallback is deliberately absent, like an unopened panel.
        if (selector.includes(' ')) return
        const element = document.createElement(tag)
        if (selector.startsWith('#')) element.id = selector.slice(1)
        else element.setAttribute(selector.slice(1, -1), '')
        element.textContent = text
        native.append(element)
      }
      for (const reading of definition.readings) for (const selector of reading.selectors) insert(selector, 'p', 'Synthetic ₱0; missing months unavailable')
      for (const output of definition.outputs) {
        insert(output.selector, 'button', 'Native export')
        native.querySelector(output.selector)!.addEventListener('click', () => nativeClicks.push(definition.page + ':' + output.selector))
      }
      for (const section of definition.sections) insert(section.selector, 'div', 'Synthetic section')
      const detail = document.createElement('details')
      detail.className = 'optional'
      detail.innerHTML = '<summary>Optional evidence</summary><p>Conditional historical scope</p>'
      native.append(detail)
      section.append(native)
      root.append(section)
    }
    const activate = (name: string) => root.querySelectorAll<HTMLElement>('.page').forEach(element => element.classList.toggle('active', element.id === 'page-' + name))
    activate('overview')
    const nativeFrame = window.requestAnimationFrame.bind(window)
    const settle = async () => { await new Promise(nativeFrame); await new Promise(nativeFrame) }
    const counters = { selectors: 0, closest: 0, layoutReads: 0, scheduledFrames: 0, observerCallbacks: 0 }
    const query = Element.prototype.querySelector
    const closest = Element.prototype.closest
    const rects = Element.prototype.getClientRects
    Element.prototype.querySelector = function <E extends Element = Element>(selector: string): E | null {
      if (root.contains(this)) counters.selectors++
      return query.call(this, selector) as E | null
    }
    Element.prototype.closest = function <E extends Element = Element>(selector: string): E | null {
      if (root.contains(this)) counters.closest++
      return closest.call(this, selector) as E | null
    }
    Element.prototype.getClientRects = function () {
      if (root.contains(this)) counters.layoutReads++
      return rects.call(this)
    }
    window.requestAnimationFrame = callback => { counters.scheduledFrames++; return nativeFrame(callback) }
    const NativeObserver = window.MutationObserver
    window.MutationObserver = class extends NativeObserver {
      constructor(callback: MutationCallback) { super((records, observer) => { counters.observerCallbacks++; callback(records, observer) }) }
    }
    let dispose = app.outputHubModule.installAnalyticsOutputHub(root)
    await settle()
    const snapshot = () => Array.from(root.querySelectorAll<HTMLElement>('.analytics-output-hub')).map(hub => ({
      page: hub.dataset.analyticsTab,
      text: Array.from(hub.querySelectorAll('dd')).map(element => element.textContent),
      buttons: Array.from(hub.querySelectorAll('button')).map(element => ({ label: element.textContent, disabled: element.disabled })),
    }))
    const run = async (name: string, rounds: number, mutate: (index: number) => void) => {
      for (const key of Object.keys(counters) as Array<keyof typeof counters>) counters[key] = 0
      for (let index = 0; index < rounds; index++) { mutate(index); await settle() }
      const measured = { ...counters }
      return { name, rounds, counters: measured, snapshot: snapshot() }
    }
    const readout = root.querySelector('#overview-descriptive-output')!
    const hiddenReadout = root.querySelector('#forecastTakeaway')!
    const phases = []
    phases.push(await run('single-page-text', 30, index => { readout.textContent = 'Synthetic selected period ' + index + ': ₱0; missing months unavailable' }))
    phases.push(await run('batched-page-text', 10, index => { for (let change = 0; change < 20; change++) readout.textContent = 'Synthetic batch ' + index + '/' + change }))
    phases.push(await run('hidden-page-text', 20, index => { hiddenReadout.textContent = 'Synthetic fixed research window ' + index }))
    phases.push(await run('navigation', 18, index => activate(definitions[index % definitions.length].page)))
    phases.push(await run('global-source-state', 10, index => { root.dataset.sourceState = index % 2 ? 'ready' : 'unavailable' }))
    activate('overview'); await settle()
    const nativeExport = root.querySelector<HTMLButtonElement>('#overviewTrendExport')!
    phases.push(await run('export-availability', 10, index => { nativeExport.disabled = index % 2 === 0 }))
    nativeExport.disabled = false; await settle()
    const proxy = root.querySelector<HTMLButtonElement>('[data-analytics-tab="overview"] [data-analytics-native-output]')!
    proxy.click()
    const delegatedClicks = [...nativeClicks]
    root.querySelector<HTMLButtonElement>('[data-analytics-tab="overview"] [data-analytics-summary]')!.click()
    const exportedSummary = JSON.parse(await blobs.at(-1)!.text())
    delete exportedSummary.captured_at
    root.dataset.sourceState = 'unavailable'; await settle(); proxy.click()
    const blockedAfterSourceFailure = nativeClicks.length === delegatedClicks.length
    root.dataset.sourceState = 'ready'; await settle()
    const optional = root.querySelector<HTMLDetailsElement>('#page-overview details.optional')!
    const watched = root.querySelector('#overviewTrendReading')!
    watched.textContent = 'Synthetic optional output'
    optional.append(watched)
    readout.setAttribute('hidden', '')
    await settle()
    phases.push(await run('panel-visibility', 10, index => { optional.hidden = index % 2 === 0; optional.open = true }))
    const ownReadout = root.querySelector('[data-analytics-tab="overview"] dd')!
    phases.push(await run('hub-only-mutation', 5, index => { ownReadout.textContent = 'Synthetic hub-only ' + index }))
    const beforeReinstall = { hubs: root.querySelectorAll('.analytics-output-hub').length, styles: document.querySelectorAll('[data-analytics-output-style]').length }
    const previous = dispose
    dispose = app.outputHubModule.installAnalyticsOutputHub(root)
    previous()
    await settle()
    const afterReinstall = { hubs: root.querySelectorAll('.analytics-output-hub').length, styles: document.querySelectorAll('[data-analytics-output-style]').length }
    dispose()
    await settle()
    const afterDispose = { hubs: root.querySelectorAll('.analytics-output-hub').length, styles: document.querySelectorAll('[data-analytics-output-style]').length }
    for (const key of Object.keys(counters) as Array<keyof typeof counters>) counters[key] = 0
    readout.textContent = 'Synthetic mutation after disposal'; await settle()
    return { phases, delegatedClicks, exportedSummary, blockedAfterSourceFailure, beforeReinstall, afterReinstall, afterDispose, afterDisposeCounters: { ...counters } }
  })
  await context.close()
  return result
}

test('repeated frozen-original and current hub workloads retain behavior and count actual DOM work', async ({ browser }, info) => {
  test.setTimeout(180000)
  const assertImprovement = process.env.MEDSHIELD_ASSERT_OUTPUT_OPTIMIZATION === '1'
  if (assertImprovement) expect(fs.existsSync(original), 'An improvement claim requires its retained original source').toBe(true)
  const after = fs.readFileSync(current, 'utf8')
  const before = fs.existsSync(original) ? fs.readFileSync(original, 'utf8') : after
  const trials = []
  for (let trial = 0; trial < 3; trial++) {
    const baseline = await measure(browser, before), revised = await measure(browser, after)
    expect(revised.phases.map(phase => ({ name: phase.name, snapshot: phase.snapshot }))).toEqual(baseline.phases.map(phase => ({ name: phase.name, snapshot: phase.snapshot })))
    expect(revised.delegatedClicks).toEqual(baseline.delegatedClicks)
    expect(revised.exportedSummary).toEqual(baseline.exportedSummary)
    expect(revised.exportedSummary.source_identity).toBeNull()
    expect(revised.exportedSummary.approval_granted_by_export).toBe(false)
    expect(revised.blockedAfterSourceFailure).toBe(true)
    expect(revised.beforeReinstall).toEqual({ hubs: 9, styles: 1 })
    expect(revised.afterReinstall).toEqual({ hubs: 9, styles: 1 })
    expect(revised.afterDispose).toEqual({ hubs: 0, styles: 0 })
    expect(revised.afterDisposeCounters.observerCallbacks).toBe(0)
    expect(revised.phases.find(phase => phase.name === 'hub-only-mutation')!.counters.scheduledFrames).toBe(0)
    if (assertImprovement) {
      for (const name of ['single-page-text', 'batched-page-text', 'hidden-page-text', 'navigation', 'export-availability', 'panel-visibility']) {
        const oldCount = baseline.phases.find(phase => phase.name === name)!.counters
        const newCount = revised.phases.find(phase => phase.name === name)!.counters
        expect(newCount.selectors + newCount.closest + newCount.layoutReads, name + ' must reduce actual counted DOM calls').toBeLessThan(oldCount.selectors + oldCount.closest + oldCount.layoutReads)
      }
    }
    trials.push({ trial, baseline, revised })
    fs.writeFileSync(info.outputPath('work-counts.json'), JSON.stringify({
      checked_at: new Date().toISOString(), environment: 'isolated native Chromium DOM; synthetic presentation workload; no live analytics',
      before_sha256: digest(before), after_sha256: digest(after), performance_assertion_enabled: assertImprovement,
      baseline_kind: fs.existsSync(original) ? 'retained frozen original' : 'current-source parity only; no historical performance comparison',
      claim_scope: 'instrumented native DOM calls and equivalent visible/readout/export behavior; no latency or server throughput claim', trials,
    }, null, 2))
  }
})
