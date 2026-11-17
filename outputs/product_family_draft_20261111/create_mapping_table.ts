/**
 * Creates the one-row family mapping table that GET /api/sales/family-abc-xyz reads (decision 015).
 * Writes to the shared Databricks workspace, so run it yourself after reviewing it:
 *   cd backend && npx tsx ../outputs/product_family_draft_20261111/create_mapping_table.ts
 * New table only; refuses to overwrite. The gateway accepts it only at Delta version 0 with the pinned hash.
 */
// The script lives outside backend/, so load dotenv from the backend's node_modules (it reads backend/.env from the cwd).
import '../../backend/node_modules/dotenv/config'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import path from 'node:path'
import {executeDatabricksStatement as x} from '../../backend/src/databricks'
import {databricksLiteral} from '../../backend/src/databricksLiteral'
import {FAMILY_BINDING} from '../../backend/src/familyAbcXyz'

const raw = readFileSync(path.resolve(__dirname, 'family_mapping_v1_1_payload.json'), 'utf8')
const sha = createHash('sha256').update(raw).digest('hex')
if (sha !== FAMILY_BINDING.mappingSha256) throw new Error('Payload does not match the gateway binding')
const name = FAMILY_BINDING.table.split('.').pop()!

;(async () => {
  if ((await x(`SHOW TABLES IN workspace.medshield_warehouse LIKE '${name}'`, {rowLimit: 5})).rows.length) return console.log('Table exists; not overwritten')
  await x(`CREATE TABLE ${FAMILY_BINDING.table} AS SELECT ${databricksLiteral(sha)} AS mapping_sha256, ${databricksLiteral(raw)} AS payload_json`, {rowLimit: 1})
  const back = (await x(`SELECT mapping_sha256, payload_json FROM ${FAMILY_BINDING.table}`, {rowLimit: 2})).rows
  const version = (await x(`DESCRIBE HISTORY ${FAMILY_BINDING.table} LIMIT 1`, {rowLimit: 1})).rows[0]?.version
  const ok = back.length === 1 && createHash('sha256').update(String(back[0].payload_json)).digest('hex') === sha && version === '0'
  console.log(ok ? `Created ${FAMILY_BINDING.table} (version 0, hash verified)` : 'Created, but verification failed: check the table')
})().catch(error => { console.error('Failed:', error.message); process.exit(1) })
