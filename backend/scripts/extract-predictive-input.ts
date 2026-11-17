import 'dotenv/config'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { preparePredictiveInput, readReceiptRelease, readSourceAudit } from '../src/descriptiveEvidence'

// Read-only, version-pinned audit extract. Never imported by the dashboard.
async function main() {
  const args = process.argv.slice(2)
  const allowLegacy = args.includes('--legacy-receipt')
  assert.ok(args.every(arg => !arg.startsWith('--') || arg === '--legacy-receipt'), 'Unknown extraction option')
  const paths = args.filter(arg => arg !== '--legacy-receipt')
  assert.ok(paths.length >= 1 && paths.length <= 2, 'Usage: extract-predictive-input.ts <descriptive evidence.json> [coverage.json] [--legacy-receipt]')
  const receiptPath = paths[0]
  assert.match(receiptPath, /\.json$/, 'Descriptive receipt must be a JSON file with a SHA-256 sidecar')
  const body = readFileSync(receiptPath, 'utf8')
  const hash = createHash('sha256').update(body).digest('hex')
  assert.equal(readFileSync(receiptPath.replace(/\.json$/, '.sha256'), 'utf8').trim(), hash, 'Descriptive receipt checksum mismatch')
  const receipt = JSON.parse(body)
  const { release, population, legacy } = await readReceiptRelease(receipt, process.env, allowLegacy)
  const audit = await readSourceAudit(release, population)
  const coverageBody = paths[1] ? readFileSync(paths[1], 'utf8') : null
  const now = new Date()
  const { input, reconciliation } = preparePredictiveInput(receipt, hash, audit, population,
    coverageBody ? JSON.parse(coverageBody) : null, now,
    coverageBody ? createHash('sha256').update(coverageBody).digest('hex') : null, legacy)
  const out = resolve('..', 'outputs', 'predictive_validation', now.toISOString().replace(/[:.]/g, '-'))
  mkdirSync(out, { recursive: false })
  const serialized = JSON.stringify(input, null, 2) + '\n'
  writeFileSync(resolve(out, 'input.json'), serialized)
  writeFileSync(resolve(out, 'input.sha256'), createHash('sha256').update(serialized).digest('hex') + '\n')
  writeFileSync(resolve(out, 'reconciliation.json'), JSON.stringify(reconciliation, null, 2) + '\n')
  writeFileSync(resolve(out, 'eligibility.json'), JSON.stringify(input.rows.map((row: any) => ({ period: row.period, eligible: row.eligible_for_evaluation, blockers: row.blockers })), null, 2) + '\n')
  writeFileSync(resolve(out, 'exclusions.json'), JSON.stringify(audit.rows.map(row => ({ period: row.period, count: row.excluded_count, amount: row.excluded_amount })), null, 2) + '\n')
  console.log(JSON.stringify({ output: out, periods: input.rows.length, source_table: release.source_table,
    fact_delta_version: release.fact_delta_version, source_count: audit.source_count, total_source_count: audit.total_count,
    population: population.version, legacy_full_fact_receipt: legacy, training_approved: input.manifest.training_approved }))
}
main().catch(error => { console.error(error.message); process.exitCode = 1 })
