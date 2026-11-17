import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { test } from 'node:test'
import { createIntakeService, INTAKE_COLUMNS, parseIntakeCsv } from '../src/salesIngestion'

// Execute the real offline notebook functions; only the cloud transport is simulated.
const python = `
import base64, importlib.util, json, sys
from pathlib import Path
p=Path('databricks_updated_2/medshield_project/controlled_sales_intake.py')
s=importlib.util.spec_from_file_location('intake',p); m=importlib.util.module_from_spec(s); s.loader.exec_module(m)
x=json.load(sys.stdin); raw=x['csv'].encode('utf-8')
r=m.assess(raw,{'TEST MEDICINE':'medicine'})
report,files=m.report_artifacts(r,x['id'],m.digest(raw))
print(json.dumps({'report':report,'files':{k:base64.b64encode(v).decode() for k,v in files.items()}}))
`
const sha = (s: string | Buffer) => createHash('sha256').update(s).digest('hex')
for (const sample of [
  { name: 'valid signed transactions', rows: ['r1,2026-10-01,DR1,TEST MEDICINE,TEST AREA,1,10.00,2.00', 'r2,2026-10-02,DR2,TEST MEDICINE,TEST AREA,-1,-2.00,-0.50'], net: '8.00', accepted: 2, rejected: 0, status: 'READY_FOR_APPROVAL' },
  { name: 'invalid date is quarantined and unknown category retained', rows: ['r1,2031-01-01,DR1,UNKNOWN PRODUCT,TEST AREA,,0.00,', 'r2,2026-02-30,DR2,TEST MEDICINE,TEST AREA,1,99.00,2.00'], net: '0.00', accepted: 1, rejected: 1, status: 'NEEDS_REVIEW' },
]) test(`real Python report → gateway status/download: ${sample.name}`, async () => {
  const csv = INTAKE_COLUMNS.join(',') + '\r\n' + sample.rows.join('\r\n') + '\r\n'
  const sourceHash = sha(csv), id = sha(`client_sales_csv_v1:17:${sourceHash}`)
  const generated = spawnSync(process.platform === 'win32' ? 'python' : 'python3', ['-X', 'utf8', '-c', python], {
    cwd: path.resolve(__dirname, '../..'), input: JSON.stringify({ csv, id }), encoding: 'utf8', timeout: 15000,
  })
  assert.equal(generated.status, 0, generated.stderr)
  const actual = JSON.parse(generated.stdout)
  const manifest = { schema_version: 1, ingestion_id: id, account_id: 17, policy_version: 'client_sales_csv_v1', source_sha256: sourceHash, source_bytes: Buffer.byteLength(csv), record_count: parseIntakeCsv(Buffer.from(csv)).length - 1 }
  const files: Record<string, Buffer> = { 'manifest.json': Buffer.from(JSON.stringify(manifest)) }
  for (const [name, encoded] of Object.entries(actual.files)) files[name] = Buffer.from(encoded as string, 'base64')
  const send = (async (url: string, init: RequestInit) => {
    assert.equal(init.method, undefined, 'gateway verification must only read provider data')
    const name = new URL(url).pathname.split('/').at(-1)!
    return files[name] ? new Response(new Uint8Array(files[name])) : new Response(null, { status: 404 })
  }) as typeof fetch
  const service = createIntakeService({ host: 'https://fixture.invalid', token: 'fixture-only', volume: '/Volumes/test/intake/private', jobId: 1 }, send)
  const value = await service.status(id, { account_id: 17, role: 'analyst' })
  assert.equal(value.status, sample.status)
  assert.equal(value.published, false)
  assert.equal(value.candidate_only, true)
  assert.ok('counts' in value)
  assert.equal(value.counts.accepted, sample.accepted)
  assert.equal(value.counts.rejected, sample.rejected)
  assert.equal(value.net_sales_candidate, sample.net)
  for (const kind of ['issues', 'classifications'] as const) {
    const bytes = await service.report(id, { account_id: 17, role: 'analyst' }, kind)
    assert.deepEqual(bytes, files[kind + '.csv'])
    files[kind + '.csv'] = Buffer.from('changed report')
    await assert.rejects(() => service.report(id, { account_id: 17, role: 'analyst' }, kind))
  }
})
