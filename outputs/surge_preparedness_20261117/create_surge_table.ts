/**
 * Creates the one-row surge preparedness table that GET /api/sales/surge-preparedness reads.
 * Writes to the shared Databricks workspace, so run it yourself after reviewing it:
 *   cd backend && npx tsx ../outputs/surge_preparedness_20261117/create_surge_table.ts
 * New table only; refuses to overwrite. The gateway accepts it only at Delta version 0 with the pinned hash.
 */
import '../../backend/node_modules/dotenv/config'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import path from 'node:path'
import {executeDatabricksStatement as x} from '../../backend/src/databricks'
import {databricksLiteral} from '../../backend/src/databricksLiteral'
import {SURGE_BINDING} from '../../backend/src/surgePreparedness'

const raw = readFileSync(path.resolve(__dirname, 'surge_payload.json'), 'utf8')
const sha = createHash('sha256').update(raw).digest('hex')
if (sha !== SURGE_BINDING.payloadSha256) throw new Error('Payload does not match the gateway binding')
const name = SURGE_BINDING.table.split('.').pop()!

;(async () => {
  if ((await x(`SHOW TABLES IN workspace.medshield_warehouse LIKE '${name}'`, {rowLimit: 5})).rows.length) return console.log('Table exists; not overwritten')
  await x(`CREATE TABLE ${SURGE_BINDING.table} AS SELECT ${databricksLiteral(sha)} AS payload_sha256, ${databricksLiteral(raw)} AS payload_json`, {rowLimit: 1})
  const back = (await x(`SELECT payload_sha256, payload_json FROM ${SURGE_BINDING.table}`, {rowLimit: 2})).rows
  const version = (await x(`DESCRIBE HISTORY ${SURGE_BINDING.table} LIMIT 1`, {rowLimit: 1})).rows[0]?.version
  const ok = back.length === 1 && createHash('sha256').update(String(back[0].payload_json)).digest('hex') === sha && version === '0'
  console.log(ok ? `Created ${SURGE_BINDING.table} (version 0, hash verified)` : 'Created, but verification failed: check the table')
})().catch(error => { console.error('Failed:', error.message); process.exit(1) })
