// Actual compiled export function; isolated inputs, no browser or source fallback.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('../node_modules/typescript')
const source = fs.readFileSync(path.resolve(__dirname, '../services/api/overview-sector-runtime.ts'), 'utf8')
const compiled = { exports: {} }
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports: compiled.exports })
for (const [selection, label, period] of [['extended', 'All available years', '2026-09'], ['capstone', 'Study Jan 2017–Sep 2026', '2026-09']]) {
  const context = {
    document: { getElementById: () => ({ value: selection }) },
    DATA: { release: { dataset_id: 'scoped-fixture', fact_delta_version: 0, policy_version: 'candidate' } },
    comparisonMode: 'single', overviewTrendMeasure: 'both',
    descriptivePeriodLabel: () => 'Selected dates', getDescriptivePriorDisplayRows: () => [],
    getDescriptiveDisplayRows: () => [{ period, revenue: -25, income: null, margin_revenue_basis: null, evidence: 'actual' }],
  }
  vm.runInNewContext(compiled.exports.OVERVIEW_SECTOR_SCRIPT + '\nresult = overviewExportRows();', context)
  const row = context.result[0]
  assert.equal(row.study_scope, label)
  assert.equal(row.period, period)
  assert.equal(row.study_start, '2017-01-01')
  assert.equal(row.study_end, '2026-09-30')
  assert.equal(row.study_2026_status, 'partial_january_september')
  assert.equal(row.missing_observation_policy, 'unavailable_not_zero')
  assert.equal(row.net_sales, -25)
  assert.equal(row.gross_profit, null)
  assert.equal(row.gross_margin_pct, null)
  assert.equal(row.dataset_id, 'scoped-fixture')
}
console.log('PASS_DESCRIPTIVE_EXPORT_SCOPE: extended/study labels, dates, signed values, nulls and source identity')
