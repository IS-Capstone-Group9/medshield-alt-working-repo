// Exercise the generated closure with a function name changed by optimization.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('../node_modules/typescript')

const frontend = path.resolve(__dirname, '..')
const helperFile = path.join(frontend, 'services/api/analytical-scope-csv.ts')
const cache = new Map()
let compactHelper

function load(file) {
  file = path.resolve(file)
  if (file === helperFile && compactHelper) return { analyticalScopeCsv: compactHelper }
  if (cache.has(file)) return cache.get(file)
  const exports = {}
  cache.set(file, exports)
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText
  vm.runInNewContext(code, {
    exports,
    require: name => load(name.startsWith('@/')
      ? path.join(frontend, name.slice(2) + '.ts')
      : path.resolve(path.dirname(file), name + '.ts')),
  }, { filename: file })
  return exports
}

const helperSource = load(helperFile).analyticalScopeCsv.toString()
compactHelper = vm.runInNewContext('(' + helperSource.replace(/^function analyticalScopeCsv/, 'function a') + ')')
assert.equal(compactHelper.name, 'a')

const engine = load(path.join(frontend, 'services/api/dashboard-engine.ts'))
const script = engine.getExecutableDashboardScript()
new Function(script)
const parsed = ts.createSourceFile('generated.js', script, ts.ScriptTarget.Latest, true)
const declaration = parsed.statements.find(statement =>
  ts.isVariableStatement(statement) && statement.declarationList.declarations.some(
    item => item.name.getText(parsed) === 'analyticalScopeCsv'))
assert.ok(declaration, 'The generated closure must bind the helper under its required name')
const bound = vm.runInNewContext(declaration.getText(parsed) + '\nanalyticalScopeCsv')
const plain = value => JSON.parse(JSON.stringify(value))
const rows = [['value'], [7]]
assert.deepEqual(plain(bound(rows)), rows)
assert.notEqual(bound(rows)[0], rows[0])

const original = { batch_id: 'fixture-batch', dataset_id: 'fixture-dataset',
  source_table: 'fixture.gold.itemized', delta_version: 0, receipt_sha256: 'fixture-receipt' }
const scope = { id: 'itemized', label: 'Itemized', contracts_excluded: true, unreconciled: false,
  source_tables: ['fixture.gold.itemized'], delta_version: 0 }
for (const release of [{ original_itemized: original }, { original_itemized: original, financial_scope: scope }]) {
  const result = plain(bound(rows, release))
  assert.equal(result[1][result[0].indexOf('Dataset ID')], 'fixture-dataset')
  for (const column of ['Complete company sales', 'Financial release approved', 'Unit approval', 'Forecast approval']) {
    assert.equal(result[1][result[0].indexOf(column)], false)
  }
}
const corrected = plain(bound(rows, { analytical_integrity: { id: 'fixture-correction', serving_version: 0 } }))
assert.equal(corrected[1][corrected[0].indexOf('Analytical correction ID')], 'fixture-correction')
assert.deepEqual(plain(bound([], { original_itemized: original })), [])
console.log('PASS: generated CSV binding survives a renamed helper and retains scope metadata.')
