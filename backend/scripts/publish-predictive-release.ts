import 'dotenv/config'
import { readFileSync, writeFileSync } from 'node:fs'
import { preparePublication, publishPrepared } from '../src/predictivePublication'

async function main() {
  const [payload, review, output, action = '--prepare'] = process.argv.slice(2)
  if (!payload || !review || !output || !['--prepare', '--activate'].includes(action)) throw new Error('Usage: publish-predictive-release.ts payload.json review.json receipt.json [--prepare|--activate]')
  const plan = preparePublication(readFileSync(payload, 'utf8'), JSON.parse(readFileSync(review, 'utf8')))
  if (action === '--prepare') {
    writeFileSync(output, JSON.stringify({ status: 'prepared_not_deployed', artifact_hash: plan.hash, statements: plan.statements }, null, 2))
  } else {
    const receipt = await publishPrepared(plan)
    writeFileSync(output, JSON.stringify({ status: 'activated', ...receipt, activated_at: new Date().toISOString() }, null, 2))
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1 })
