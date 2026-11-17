import 'dotenv/config'
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { prepareSo1Publication, applySo1Publication } from '../src/so1Publication'

async function main() {
  const [input, hash, directory, mode] = process.argv.slice(2)
  assert.ok(input && hash && directory && ['--prepare', '--apply'].includes(mode), 'Usage: publish-so1-candidate.ts payload.json SHA256 directory --prepare|--apply')
  const raw = readFileSync(input, 'utf8'), plan = await prepareSo1Publication(raw, hash)
  const output = resolve(directory); mkdirSync(output, { recursive: true })
  if (mode === '--prepare') {
    const record = { status: 'prepared_not_staged', package_sha256: hash, table: plan.table, staged_rows: plan.records.length,
      statement_sha256: plan.statement_sha256, source: plan.source, already_exists: plan.exists }
    writeFileSync(resolve(output, 'preparation.json'), JSON.stringify(record, null, 2) + '\n', { flag: 'wx' })
    writeFileSync(resolve(output, 'publication.sql'), plan.statement + '\n', { flag: 'wx' })
    console.log(JSON.stringify(record)); return
  }
  const prepared = JSON.parse(readFileSync(resolve(output, 'preparation.json'), 'utf8'))
  assert.equal(prepared.package_sha256, hash); assert.equal(prepared.statement_sha256, plan.statement_sha256)
  const receipt = await applySo1Publication(plan, raw)
  writeFileSync(resolve(output, `receipt-${Date.now()}.json`), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' })
  console.log(JSON.stringify(receipt))
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'SO1 candidate staging failed'); process.exitCode = 1 })
