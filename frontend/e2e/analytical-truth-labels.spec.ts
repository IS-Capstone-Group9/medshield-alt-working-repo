import {test,expect} from '@playwright/test'
import {readFileSync} from 'node:fs'
import path from 'node:path'
import ts from 'typescript'

test('sales ledger exposes corrected subset and resets labels when correction is absent',async({page})=>{
 const compiled=ts.transpileModule(readFileSync(path.resolve('services/api/sales-view-helpers.ts'),'utf8'),{
  compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS},
 }).outputText
 await page.setContent('<main id="page-sales-data"><p class="uploaded-data-copy"></p><span id="salesDatasetBadge"></span><p id="salesDatasetSource"></p></main>')
 await page.evaluate(code=>{
  const isolated={exports:{}};new Function('require','module','exports',code)(()=>({}),isolated,isolated.exports)
  const render=(isolated.exports as any).renderSalesDatasetStatus
  const status={source_file:'fixture.gold',cleaning_status:'databricks_gold_candidate',quality_summary:{rows_accepted:40160},release:{analytical_integrity:{id:'truth_fixture',kept_rows:40160}}}
  ;(window as any).__renderLedger=()=>render(document.querySelector('main'),{...status,release:undefined})
  render(document.querySelector('main'),status)
 },compiled)
 await expect(page.locator('#salesDatasetBadge')).toContainText('Original itemized records')
 await expect(page.locator('.uploaded-data-copy')).toContainText('not complete company totals')
 await expect(page.locator('#salesDatasetSource')).toContainText('truth_fixture. 40,160 retained itemized records')
 await page.evaluate(()=>(window as any).__renderLedger())
 await expect(page.locator('#salesDatasetBadge')).toHaveText('Databricks Gold · Candidate')
 await expect(page.locator('#salesDatasetSource')).not.toContainText('truth_fixture')
 await expect(page.locator('.uploaded-data-copy')).toContainText('Read-only records')
})

test('corrected sales provenance states itemized subset instead of company financial approval',async({page})=>{
 const compiled=ts.transpileModule(readFileSync(path.resolve('services/api/dashboard-enhancements.ts'),'utf8'),{
  compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS},
 }).outputText
 await page.setContent('<main class="medshield-root"><span data-financial-status></span><p data-publication-limits></p><div class="data-freshness-bar"></div><select id="topbarYearSelect"></select></main>')
 await page.evaluate(code=>{
  const isolated={exports:{}};new Function('require','module','exports',code)(()=>({}),isolated,isolated.exports)
  const update=(isolated.exports as any).updateDashboardProvenance
  update(document.querySelector('main'),{source:'databricks',mode:'live',loaded_at:'2026-10-25T00:00:00Z',
    release:{financial_publication:{status:'approved',scope:'descriptive_company_financial_history_and_source_label_commercial_reporting'},
      analytical_integrity:{id:'truth_test',policy:'original_itemized_sales_v1',scope:'itemized_product_sales',removed_rows:911,kept_rows:40160,source_rows:41071}}},['2025','2026'])
 },compiled)
 await expect(page.locator('[data-financial-status]')).toHaveText('Sales · Original itemized records')
 await expect(page.locator('[data-publication-limits]')).toContainText('not complete company totals')
 await expect(page.locator('.data-freshness-bar')).toContainText('911 unmatched replacement rows excluded')
 await expect(page.locator('.data-freshness-bar')).toContainText('Original-source correction truth_test')
 await expect(page.locator('.data-freshness-bar')).toContainText('40,160 retained itemized records')
 await expect(page.locator('.data-freshness-bar')).not.toContainText('Approved financial release')
 await expect(page.locator('[data-publication-limits]')).toContainText('Current monthly STL uses this corrected population')
 await expect(page.locator('main')).toHaveAttribute('data-analytical-scope','itemized_product_sales')
})
