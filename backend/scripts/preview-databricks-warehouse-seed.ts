import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import 'dotenv/config'
import { executeDatabricksStatement } from '../src/databricks'
import { decimalMicros, readItemizedPreviewSource } from '../src/itemizedPreview'
import { ITEMIZED_PREVIEW_BINDING as binding } from '../src/itemizedPreviewBinding'

function count(value: string | null): number {
  assert.ok(value != null && /^\d+$/.test(value), 'Expected a count')
  const parsed = Number(value)
  assert.ok(Number.isSafeInteger(parsed), 'Count exceeds safe range')
  return parsed
}

function php(micros: bigint): string {
  const digits = (micros < 0n ? -micros : micros).toString().padStart(7, '0')
  return (micros < 0n ? '-' : '') + digits.slice(0, -6) + '.' + digits.slice(-6)
}

export async function previewWarehouseSeed(
  execute = executeDatabricksStatement,
  validateSource = readItemizedPreviewSource,
) {
  const source = await validateSource(execute, binding)
  const table = binding.itemizedTable.split('.').map(part => '`' + part + '`').join('.')
  const { rows } = await execute(`SELECT DATE_FORMAT(date_delivered,'yyyy-MM') AS month,
    COUNT(*) AS records, COUNT_IF(is_net_sales_technically_eligible) AS eligible_records,
    CAST(SUM(CASE WHEN is_net_sales_technically_eligible THEN net_sales END) AS STRING) AS eligible_net,
    CAST(SUM(CASE WHEN is_net_sales_technically_eligible AND net_sales > 0 THEN net_sales ELSE 0 END) AS STRING) AS positive_sales,
    CAST(SUM(CASE WHEN is_net_sales_technically_eligible AND net_sales < 0 THEN net_sales ELSE 0 END) AS STRING) AS signed_returns
    FROM ${table} VERSION AS OF 0 GROUP BY 1 ORDER BY 1`, { rowLimit: 1200 })
  let records = 0, eligibleRecords = 0, net = 0n
  let previous = ''
  const months = rows.map(row => {
    const month = row.month
    assert.ok(month && /^\d{4}-(0[1-9]|1[0-2])$/.test(month) && month > previous, 'Missing, duplicate or unordered delivery month')
    previous = month
    const all = count(row.records), eligible = count(row.eligible_records)
    assert.ok(all > 0 && eligible <= all, 'Monthly source counts do not reconcile')
    const positive = decimalMicros(row.positive_sales ?? ''), returns = decimalMicros(row.signed_returns ?? '')
    const value = eligible ? decimalMicros(row.eligible_net ?? '') : 0n
    assert.ok(eligible > 0 || row.eligible_net == null, 'Ineligible month has an eligible net value')
    assert.ok(positive >= 0n && returns <= 0n && positive + returns === value, 'Monthly signed net does not reconcile')
    records += all; eligibleRecords += eligible; net += value
    return { month, records: all, eligible_records: eligible, excluded_records: all - eligible,
      eligible_net_php: eligible ? php(value) : null, positive_sales_php: php(positive), signed_returns_php: php(returns) }
  })
  assert.equal(records, binding.expectedRecords, 'Monthly rows differ from source pin')
  assert.equal(eligibleRecords, binding.expectedEligibleRecords, 'Monthly eligible rows differ from source pin')
  assert.equal(net, decimalMicros(binding.expectedNet), 'Monthly net differs from source pin')
  const controls = {
    policy: 'warehouse_seed_baseline_v1', source_table: source.source_table, delta_version: source.delta_version,
    dataset_id: source.dataset_id, receipt_sha256: source.receipt_sha256, source_keys_sha256: source.source_keys_sha256,
    scope: source.scope, records, eligible_records: eligibleRecords, excluded_records: records - eligibleRecords,
    eligible_net_php: php(net), months,
  }
  return {
    ...controls, baseline_sha256: createHash('sha256').update(JSON.stringify(controls)).digest('hex'),
    candidate_only: true, seed_applied: false, source_completeness_verified: false, financial_release_approved: false,
  }
}

if (require.main === module) {
  previewWarehouseSeed()
    .then(result => process.stdout.write(JSON.stringify(result, null, 2) + '\n'))
    .catch(error => {
      const status = error instanceof Error ? error.message.match(/\b(?:HTTP|status)\s+(\d{3})\b/i)?.[1] : undefined
      console.error('Warehouse seed baseline unavailable' + (status ? ` (HTTP ${status})` : '') + '. Check the SQL warehouse and pinned original Gold read grants.')
      process.exitCode = 1
    })
}
