import 'dotenv/config'
import assert from 'node:assert/strict'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { applyStlPublication, prepareStlPublication } from '../src/stlPublication'

async function main() {
  const [inputPath, payloadHash, directory, mode] = process.argv.slice(2)
  assert.ok(inputPath && payloadHash && directory && ['--prepare', '--apply'].includes(mode),
    'Usage: publish-stl-candidate.ts payload.json BYTE_SHA256 output-directory --prepare|--apply')
  const raw = readFileSync(inputPath, 'utf8')
  const plan = await prepareStlPublication(raw, payloadHash)
  const output = resolve(directory), preparation = resolve(output, 'preparation.json')
  if (mode === '--prepare') {
    mkdirSync(output, { recursive: true })
    const record = { status: 'prepared_not_deployed', prepared_at: new Date().toISOString(), payload_sha256: plan.payloadHash,
      input_sha256: plan.payload.input_sha256, source_table: plan.release.source_table, output_table: plan.outputTable,
      release: plan.release, population_version: plan.payload.population_version, population_sha256: plan.payload.population_sha256,
      expected_rows: plan.records.length, existing_rows: plan.existingRows, statements_sha256: plan.statementsSha256, statements: plan.statements,
      business_approval: false, forecast_model_pointer_changed: false }
    writeFileSync(preparation, JSON.stringify(record, null, 2) + '\n', { flag: 'wx' })
    console.log(JSON.stringify({ status: record.status, preparation, expected_rows: record.expected_rows, warehouse_writes: 0 }))
    return
  }
  const reviewed = JSON.parse(readFileSync(preparation, 'utf8'))
  assert.equal(reviewed.status, 'prepared_not_deployed', 'A prepared STL artifact is required')
  assert.equal(reviewed.payload_sha256, plan.payloadHash, 'Prepared STL payload changed')
  assert.equal(reviewed.input_sha256, plan.payload.input_sha256, 'Prepared STL input changed')
  assert.equal(reviewed.output_table, plan.outputTable, 'Prepared STL target changed')
  assert.deepEqual(reviewed.release, plan.release, 'Prepared STL source identity changed')
  assert.equal(reviewed.statements_sha256, plan.statementsSha256, 'Prepared STL statement hash changed')
  assert.deepEqual(reviewed.statements, plan.statements, 'Prepared STL SQL changed')
  const receipt = await applyStlPublication(plan)
  const primary = resolve(output, 'receipt.json')
  const target = existsSync(primary) ? resolve(output, `receipt-${Date.now()}.json`) : primary
  writeFileSync(target, JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' })
  console.log(JSON.stringify({ ...receipt, receipt: target }))
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'STL candidate publication failed'); process.exitCode = 1 })
