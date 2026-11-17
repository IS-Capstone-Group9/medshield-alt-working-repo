/**
 * Creates the one-row therapeutic category mapping table that GET /api/sales/demand-profile reads.
 * Writes to the shared Databricks workspace, so run it yourself after reviewing it:
 *   cd backend && npx tsx ../outputs/category_mapping_20261115/create_category_table.ts
 * New table only; refuses to overwrite. The gateway accepts it only at Delta version 0 with the pinned hash.
 * The mapping is candidate v0.1: AI-inferred from product labels, not verified against the FDA registry or the client.
 */
// The script lives outside backend/, so load dotenv from the backend's node_modules (it reads backend/.env from the cwd).
import '../../backend/node_modules/dotenv/config'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import path from 'node:path'
import {executeDatabricksStatement as x} from '../../backend/src/databricks'
import {databricksLiteral} from '../../backend/src/databricksLiteral'
import {CATEGORY_BINDING} from '../../backend/src/demandProfile'

const raw = readFileSync(path.resolve(__dirname, 'category_mapping_v0_1_payload.json'), 'utf8')
const sha = createHash('sha256').update(raw).digest('hex')
if (sha !== CATEGORY_BINDING.mappingSha256) throw new Error('Payload does not match the gateway binding')
const name = CATEGORY_BINDING.table.split('.').pop()!

;(async () => {
  if ((await x(`SHOW TABLES IN workspace.medshield_warehouse LIKE '${name}'`, {rowLimit: 5})).rows.length) return console.log('Table exists; not overwritten')
  await x(`CREATE TABLE ${CATEGORY_BINDING.table} AS SELECT ${databricksLiteral(sha)} AS mapping_sha256, ${databricksLiteral(raw)} AS payload_json`, {rowLimit: 1})
  const back = (await x(`SELECT mapping_sha256, payload_json FROM ${CATEGORY_BINDING.table}`, {rowLimit: 2})).rows
  const version = (await x(`DESCRIBE HISTORY ${CATEGORY_BINDING.table} LIMIT 1`, {rowLimit: 1})).rows[0]?.version
  const ok = back.length === 1 && createHash('sha256').update(String(back[0].payload_json)).digest('hex') === sha && version === '0'
  console.log(ok ? `Created ${CATEGORY_BINDING.table} (version 0, hash verified)` : 'Created, but verification failed: check the table')
})().catch(error => { console.error('Failed:', error.message); process.exit(1) })
