// Actual React hook in an isolated lifecycle model. No browser/hosted acceptance.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm')
const assert = require('node:assert/strict'), crypto = require('node:crypto'), cp = require('node:child_process')
const ts = require('../node_modules/typescript')
const rootPath = path.resolve(__dirname, '../..')
const hookPath = 'frontend/hooks/use-dashboard-runtime.ts'
const current = fs.readFileSync(path.join(rootPath, hookPath), 'utf8')
const prior = cp.execFileSync('git', ['show', 'HEAD:' + hookPath], {cwd: rootPath, encoding: 'utf8'})
const engine = ts.createSourceFile('engine.ts', fs.readFileSync(path.join(rootPath, 'frontend/services/api/dashboard-engine.ts'), 'utf8'), ts.ScriptTarget.Latest, true)
const registryInitializer = engine.statements.filter(ts.isVariableStatement).flatMap(s => [...s.declarationList.declarations]).find(d => d.name.getText(engine) === 'DASHBOARD_GLOBAL_HANDLERS').initializer
const registry = (ts.isAsExpression(registryInitializer) ? registryInitializer.expression : registryInitializer).elements.map(e => e.text)
const hash = text => crypto.createHash('sha256').update(text).digest('hex')
const tick = () => new Promise(resolve => setImmediate(resolve))

async function phase(source, name, early = false, pending = false, unavailable = false, sourceEvent = '') {
  const effects = [], styles = new Set(), liveListeners = new Set(), installed = [], disposed = []
  const rootListeners = new Map()
  let requestResets = 0
  let resolveLoad, load = pending ? new Promise(resolve => { resolveLoad = resolve }) : unavailable ? Promise.reject(new Error('isolated source unavailable')) : Promise.resolve(sourceEvent ? false : true)
  const canvas = {}, chart = {destroyed: false, destroy() {this.destroyed = true}}
  const root = {dataset: {}, style: {}, setAttribute() {}, removeAttribute() {}, appendChild() {},
    addEventListener(type, listener) {rootListeners.set(type,listener);liveListeners.add(listener)},
    removeEventListener(type, listener) {rootListeners.delete(type);liveListeners.delete(listener)},
    dispatchEvent(event) {rootListeners.get(event.type)?.(event)},
    querySelector(selector) {return selector === '#sidebarLogoutBtn' ? button : null},
    querySelectorAll(selector) {return selector === 'canvas' ? [canvas] : []}, innerHTML: ''}
  const button = {addEventListener(type, listener) {liveListeners.add(listener)}, removeEventListener(type, listener) {liveListeners.delete(listener)}}
  const document = {createElement() {return {children: [], append(...children) {this.children.push(...children)}, setAttribute() {}, remove() {styles.delete(this)}, style: {}}},
    head: {appendChild(style) {styles.add(style)}},
    getElementById(id) {return [...styles].find(style => style.id === id)},
    body: {classList: {remove() {}}, dataset: {}}, querySelectorAll() {return []}}
  const window = {requestAnimationFrame(fn) {queueMicrotask(fn)}}
  class Chart {static getChart(node) {return node === canvas ? chart : undefined}}
  const exports = {}
  const requireModel = name => {
    if (name === 'react') return {useEffect(fn) {effects.push(fn)}, useEffectEvent: fn => fn,
      useRef: value => ({current: value === null ? root : value}), useState: () => [null, () => {}]}
    if (name === 'chart.js/auto') return {default: Chart}
    if (name.endsWith('medshieldReference')) return {MEDSHIELD_MARKUP: '<main>isolated shell</main>', MEDSHIELD_STYLE: 'isolated style'}
    if (name.endsWith('dashboard-engine')) return {DASHBOARD_GLOBAL_HANDLERS: registry, getExecutableDashboardScript: () => 'isolated engine dependency', runDashboardScript: async () => {
      for (const handler of registry) window[handler] = () => {}
      const listener = () => {}; button.addEventListener('click', listener)
      return [{target: button, type: 'click', listener}]
    }}
    if (name.endsWith('dashboard-interactions')) return {resetDashboardDeferredLoads() {requestResets++}, refreshDashboardFromGateway: () => load}
    if (name.endsWith('api-client')) return {ApiRequestError: class extends Error {}, authenticatedJson() {throw Error('No network permitted')}}
    return new Proxy({}, {get(_, key) {
      if (key === '__esModule') return false
      if (String(key).startsWith('install')) return () => {installed.push(key); return () => disposed.push(key)}
      return () => {}
    }})
  }
  vm.runInNewContext(ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}}).outputText,
    {exports, require: requireModel, document, window, console, queueMicrotask})
  exports.useDashboardRuntime(async () => {}, {role: 'admin'})
  const cleanup = effects[0]()
  if (early) cleanup()
  await tick()
  if (!early) {
    assert.equal(styles.size, 1, name + ': exactly one style owner')
    if (pending) {cleanup(); resolveLoad(); await tick(); assert.equal(root.dataset.sourceState, 'loading', name + ': late source response cannot mark disposed root ready')}
    else {
      if (sourceEvent) {
        assert.equal(root.dataset.sourceState, 'loading', name + ': old false completion cannot report ready')
        root.dispatchEvent({type: 'medshield:' + sourceEvent, detail: new Error('synthetic replacement failure')})
        if (sourceEvent === 'source-ready') {
          root.dispatchEvent({type: 'medshield:source-ready'})
          assert.equal(installed.filter(key => key === 'installStlPanel').length, 1, 'ready event and completion cannot install STL twice')
        }
      }
      assert.equal(root.dataset.sourceState, unavailable || sourceEvent === 'source-error' ? 'unavailable' : 'ready')
      if (unavailable || sourceEvent === 'source-error') assert.equal(chart.destroyed, true, name + ': unavailable replacement destroys charts before removing canvases')
      cleanup()
    }
  }
  await tick()
  assert.equal(styles.size, 0, name + ': no leaked styles')
  assert.equal(liveListeners.size, 0, name + ': no retained engine/logout listeners')
  assert.equal(root.innerHTML, '', name + ': mounted DOM removed')
  assert.equal(window.showPage, undefined, name + ': global handler removed')
  assert.ok(installed.filter(n => !['installDashboardEnhancements','installSalesOutputSections'].includes(n)).every(n => disposed.includes(n)), name + ': installed panels disposed')
  if (!early) assert.equal(chart.destroyed, true, name + ': legacy canvas chart must be destroyed before removing the DOM')
  assert.deepEqual(registry.filter(handler => window[handler] !== undefined), [], name + ': no stale global handlers, including exports')
  assert.equal(requestResets, 2, name + ': request scope resets at mount and teardown')
  return {name, sha256: hash(source), early, pending, installed, disposed, styles_remaining: styles.size, listeners_remaining: liveListeners.size, chart_destroyed: chart.destroyed, cleared_global_handlers: registry.length, request_resets: requestResets}
}

async function main() {
  // Both identities are retained in memory only; no live source/checkout mutation.
  // The HEAD hook is a known prior identity. Current source retains all existing panels.
  const results = []
  for (const [name, source] of [['current', current], ['rollback', prior], ['reapply', current]]) {
    // Prior release defects are findings, not a reason to weaken current acceptance.
    try {results.push(await phase(source, name))} catch (error) {
      if (name !== 'rollback') throw error
      results.push({name, sha256: hash(source), known_prior_failure: error.message})
    }
  }
  results.push(await phase(current, 'dispose-before-frame', true))
  results.push(await phase(current, 'dispose-pending-source', false, true))
  results.push(await phase(current, 'source-unavailable', false, false, true))
  results.push(await phase(current, 'replacement-source-ready', false, false, false, 'source-ready'))
  results.push(await phase(current, 'replacement-source-unavailable', false, false, false, 'source-error'))
  const report = {status: 'PASS_ISOLATED_HOOK_LIFECYCLE', prior_head: cp.execFileSync('git', ['rev-parse', 'HEAD'], {cwd: rootPath, encoding: 'utf8'}).trim(), results,
    scope: 'actual hook; modeled React, DOM, engine/network and panel dependencies; not native/Next artifact/hosted rollback or network abort proof'}
  if (process.argv[2]) fs.writeFileSync(path.resolve(process.argv[2]), JSON.stringify(report, null, 2) + '\n')
  console.log(JSON.stringify(report))
}
main().catch(error => {console.error(error); process.exitCode = 1})
