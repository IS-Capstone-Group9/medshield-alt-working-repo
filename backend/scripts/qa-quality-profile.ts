// Read-only aggregate evidence for the post-Gold QA assessment.
import 'dotenv/config'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { executeDatabricksStatement } from '../src/databricks'

async function main() {
  const sql = `SELECT rule, COUNT(*) AS affected_rows
    FROM workspace.medshield_gold.sales_restart_fact_candidate
    LATERAL VIEW explode(quality_rule_codes) codes AS rule
    GROUP BY rule ORDER BY affected_rows DESC`
  const result = await executeDatabricksStatement(sql, { rowLimit: 100 })
  const directory = resolve(__dirname, '../../outputs/qa_reassessment')
  mkdirSync(directory, { recursive: true })
  const evidence = { checked_at: new Date().toISOString(), mode: 'read-only', sql, ...result }
  writeFileSync(resolve(directory, 'quality-rules.json'), JSON.stringify(evidence, null, 2) + '\n')
  console.log(JSON.stringify(evidence.rows, null, 2))
}
main().catch(error => { console.error((error as Error).message); process.exitCode = 1 })
