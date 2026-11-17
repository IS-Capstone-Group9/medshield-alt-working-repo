import assert from 'node:assert/strict'
import test from 'node:test'
import { previewWarehouseSeed } from '../scripts/preview-databricks-warehouse-seed'
import type { executeDatabricksStatement } from '../src/databricks'
import type { readItemizedPreviewSource } from '../src/itemizedPreview'
import { ITEMIZED_PREVIEW_BINDING as binding } from '../src/itemizedPreviewBinding'

const source: Awaited<ReturnType<typeof readItemizedPreviewSource>> = {
  batch_id: binding.batchId, dataset_id: binding.datasetId, policy_version: binding.policy,
  source_table: binding.itemizedTable, delta_version: 0, receipt_sha256: binding.receiptSha256,
  source_keys_sha256: binding.keysSha256, scope: 'original_itemized_sales_contracts_excluded',
  complete_company_sales: false, contracts_excluded: true, financial_release_approved: false,
  unit_approval: false, forecast_approval: false, live_serving_changed: false, note: '',
}
const valid = [
  { month: '2017-01', records: '1', eligible_records: '0', eligible_net: null, positive_sales: '0', signed_returns: '0' },
  { month: '2026-09', records: '40170', eligible_records: '39286', eligible_net: '638015351.530000', positive_sales: '638015361.530000', signed_returns: '-10.000000' },
]

function fixture(rows: Record<string, string | null>[] = valid) {
  const execute: typeof executeDatabricksStatement = async (sql, options) => {
    assert.match(sql, /^SELECT /)
    assert.match(sql, /itemized_candidates` VERSION AS OF 0/)
    assert.equal(options?.rowLimit, 1200)
    return { rows, columns: Object.keys(valid[0]) }
  }
  return { execute, validate: async () => source }
}

test('seed baseline reconciles fixed decimal money and leaves an ineligible month unknown', async () => {
  const { execute, validate } = fixture()
  const result = await previewWarehouseSeed(execute, validate)
  assert.equal(result.seed_applied, false)
  assert.equal(result.source_completeness_verified, false)
  assert.equal(result.excluded_records, 885)
  assert.equal(result.eligible_net_php, binding.expectedNet)
  assert.equal(result.months[0].eligible_net_php, null)
  assert.equal(result.months[1].signed_returns_php, '-10.000000')
  assert.match(result.baseline_sha256, /^[a-f0-9]{64}$/)
  assert.equal((await previewWarehouseSeed(execute, validate)).baseline_sha256, result.baseline_sha256)
})

test('seed baseline fails closed on a missing delivery month, inconsistent net, or a truncated result', async () => {
  for (const [rows, expected] of [
    [[{ ...valid[0], month: null }, valid[1]], /delivery month/],
    [[valid[0], { ...valid[1], signed_returns: '0' }], /signed net/],
    [[valid[1]], /rows differ from source pin/],
  ] as const) {
    const { execute, validate } = fixture([...rows])
    await assert.rejects(previewWarehouseSeed(execute, validate), expected)
  }
})

test('seed preview stops before the monthly query if the pinned source fails validation', async () => {
  const execute: typeof executeDatabricksStatement = async () => { throw new Error('Unexpected monthly query') }
  await assert.rejects(previewWarehouseSeed(execute, async () => { throw new Error('Source receipt mismatch') }), /Source receipt mismatch/)
})
