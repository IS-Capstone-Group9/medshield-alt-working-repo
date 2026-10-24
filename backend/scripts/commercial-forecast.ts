import { config } from 'dotenv'
import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { getDatabricksSalesDiagnostics, descriptiveRelease } from '../src/databricksDashboard'
import { prepareForecast, validateManifest } from '../src/commercial/services/ForecastService'
import { forecastTable } from '../src/commercial/repositories/WarehouseRepository'
import { executeDatabricksStatement } from '../src/databricks'
import { endOfMonth } from '../src/commercial/utils/contracts'
import { periodSchema, dateSchema } from '../src/commercial/validators/schemas'

config({ path: path.resolve(__dirname, '../../.env'), quiet: true } as Parameters<typeof config>[0])
async function main() {
  const [command, argument, file, startArgument] = process.argv.slice(2)
  if (command === 'prepare' && argument && file) {
    const anchor = periodSchema.parse(argument)
    const startDate = dateSchema.parse(startArgument || '2017-01-01')
    if (!startDate.endsWith('-01') || startDate > anchor + '-01') throw new Error('Training start must be a month start no later than the anchor')
    const data = await getDatabricksSalesDiagnostics({ startDate, endDate: endOfMonth(anchor), category: 'All', sector: 'All' })
    const rows = data.contributions.month.map(row => {
      if (row.current == null) throw new Error('Missing observations cannot be imputed to zero')
      return { period: row.key, value: row.current }
    })
    const manifest = prepareForecast(rows, anchor, 36, { kind: 'company', id: 'company:net_sales:PHP', category: null, target: 'net_sales', unit: 'PHP' }, {
      datasetId: data.release.dataset_id, factVersion: data.release.fact_delta_version,
      checksum: createHash('sha256').update(JSON.stringify({ release: data.release, rows })).digest('hex'), mappingStatus: 'unverified', evidenceClass: 'databricks_gold_candidate',
    })
    await writeFile(path.resolve(file), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' })
    console.log(JSON.stringify({ status: 'prepared_candidate_only', runId: manifest.runId, months: manifest.points.length, evaluation: manifest.evaluation }))
    return
  }
  if (command === 'publish' && argument === '--reviewed-candidate' && file) {
    const manifest = validateManifest(JSON.parse(await readFile(file, 'utf8')))
    const release = await descriptiveRelease()
    if (manifest.source.datasetId !== release.dataset_id || manifest.source.factVersion !== release.fact_delta_version) throw new Error('Candidate belongs to a different active release')
    const payload = JSON.stringify(manifest)
    const parameters = Object.entries({ run: manifest.runId, anchor: manifest.anchor, kind: manifest.scope.kind, scope: manifest.scope.id, category: manifest.scope.category || '', dataset: manifest.source.datasetId, payload, checksum: createHash('sha256').update(payload).digest('hex') }).map(([name, value]) => ({ name, value, type: 'STRING' as const }))
    // Run as a single publisher job. Existing source/scope candidates are never overwritten.
    const existing = await executeDatabricksStatement(`SELECT run_id, payload_sha256 FROM ${forecastTable()} WHERE anchor_period=:anchor AND scope_kind=:kind AND scope_id=:scope AND dataset_id=:dataset AND fact_version=${manifest.source.factVersion}`, { parameters, rowLimit: 2 })
    if (existing.rows.length) {
      if (existing.rows.length === 1 && existing.rows[0].run_id === manifest.runId && existing.rows[0].payload_sha256 === parameters.find(p => p.name === 'checksum')!.value) { console.log('Candidate already published'); return }
      throw new Error('Another candidate exists. Replacement requires a reviewed warehouse operation.')
    }
    await executeDatabricksStatement(`INSERT INTO ${forecastTable()} SELECT :run, :anchor, :kind, :scope, NULLIF(:category,''), :dataset, ${manifest.source.factVersion}, :payload, :checksum, current_timestamp()`, { parameters })
    console.log('Published exploratory candidate; this does not approve a production forecast.')
    return
  }
  throw new Error('Usage: commercial-forecast.ts prepare YYYY-MM output.json [training-start-YYYY-MM-01] | publish --reviewed-candidate manifest.json')
}
main().catch(error => { console.error(error instanceof Error ? error.message.replace(/https?:\/\/\S+/g, '[provider]') : 'Forecast job failed'); process.exitCode = 1 })
