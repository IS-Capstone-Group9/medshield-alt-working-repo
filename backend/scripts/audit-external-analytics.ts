/** Read-only Gold extraction. Writes aggregate evidence only, never raw transactions. */
import 'dotenv/config'
import { writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { getDatabricksExternalRegression, getDatabricksSectorTrend, getDatabricksForecastValidation, getDatabricksSalesDiagnostics, getDatabricksSalesSectors } from '../src/databricksDashboard'

async function main() {
  const out = path.resolve('../outputs/analytics_external_audit_20261020')
  await mkdir(out, {recursive:true})
  const context = await getDatabricksExternalRegression({sector:'Private', territory:'Quezon', metric:'revenue', mode:'combined', lag:'1', rainfall_lag:'1'})
  await writeFile(path.join(out, 'gold-context.json'), JSON.stringify(context, null, 2))
  const [trend, forecast, diagnostic] = await Promise.all([
    getDatabricksSectorTrend(), getDatabricksForecastValidation({sector:'All'}),
    getDatabricksSalesDiagnostics({startDate:'2025-01-01',endDate:'2025-12-31',sector:'All'}),
  ])
  await writeFile(path.join(out, 'gold-financial-model-evidence.json'), JSON.stringify({extracted_at:new Date().toISOString(),trend,forecast,diagnostic}, null, 2))
  const catalog = await getDatabricksSalesSectors('All')
  const controls = new Map<string, number>()
  for (const row of catalog.rows) {
    if (row.sector !== 'Private' || row.territory?.toUpperCase() !== 'QUEZON' || row.revenue === null || !row.period) continue
    controls.set(row.period, (controls.get(row.period) ?? 0) + Math.round(row.revenue * 1_000_000))
  }
  await writeFile(path.join(out, 'pilot-sales-controls.json'), JSON.stringify({source:catalog.source, monthly:[...controls].sort().map(([period,value])=>({period,sales:value/1_000_000}))},null,2))
  console.log(JSON.stringify({context_rows:context.context.rows.length, observed_sales:context.context.sales_months, coobserved:context.context.coobserved_months, join_ready:context.context.join_ready_months, regression:context.status, daily_aggregates:trend.daily.length, forecast_status:forecast.status, source:trend.source}))
}
main().catch(e => { console.error(e instanceof Error ? e.message : 'Audit failed'); process.exitCode=1 })
