import 'dotenv/config'
import { mkdirSync, writeFileSync } from 'node:fs'
import { executeDatabricksStatement } from '../src/databricks'

async function main() {
  const output = '../outputs/truth_correction_20261025/continuation'
  mkdirSync(output, { recursive: true })
  const receipt: Record<string, unknown> = { checked_at: new Date().toISOString(), permissions_changed: false }
  for (const [name, path] of Object.entries({workspace:'/api/2.0/workspace/list?path=/Workspace/medshield', jobs:'/api/2.1/jobs/list?limit=1'})) {
    const response = await fetch(new URL(path, process.env.DATABRICKS_HOST), { headers: { Authorization: `Bearer ${process.env.DATABRICKS_TOKEN}` } })
    receipt[name] = { http_status: response.status }
  }
  const sql = await executeDatabricksStatement('SELECT current_user() IS NOT NULL AS authenticated, current_timestamp() AS checked_at', {rowLimit:1})
  receipt.sql = { status:'SUCCEEDED', rows:sql.rows }
  writeFileSync(output+'/execution-access.json', JSON.stringify(receipt,null,2)+'\n')
  console.log(JSON.stringify(receipt))
}
main().catch(error=>{console.error(error.message);process.exitCode=1})
