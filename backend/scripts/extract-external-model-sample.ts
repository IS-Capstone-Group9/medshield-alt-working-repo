import 'dotenv/config'
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { executeDatabricksStatement } from '../src/databricks'

const out = path.resolve(__dirname, '../../outputs/databricks/quezon_external_sample_20260922')
const fact = 'workspace.medshield_gold.sales_restart_fact_candidate'
const external = 'workspace.medshield_gold.vw_dss_external_signals_candidate'
const where = `is_analysis_candidate = TRUE AND is_quantity_observation_eligible = TRUE
  AND is_provisional_product_demand_eligible = TRUE AND is_contract_label = FALSE
  AND proposed_area_type = 'territory'
  AND UPPER(COALESCE(territory, normalized_area)) = 'QUEZON'
  AND month_start >= DATE '2018-01-01' AND month_start < DATE '2025-01-01'`

async function main() {
  const queries: Record<string, string> = {
    product_selection: `SELECT normalized_product AS product, COUNT(DISTINCT month_start) AS observed_months,
      COUNT(*) AS transaction_count FROM ${fact} WHERE ${where}
      GROUP BY normalized_product ORDER BY observed_months DESC, transaction_count DESC, product ASC LIMIT 10`,
    external_source: `SELECT * FROM ${external} WHERE UPPER(territory) = 'QUEZON'
      AND period_start >= DATE '2018-01-01' AND period_start < DATE '2025-01-01'
      ORDER BY period_start, signal_family, signal`,
  }
  const results = await Promise.allSettled([
    executeDatabricksStatement(queries.product_selection, { rowLimit: 20 }),
    executeDatabricksStatement(queries.external_source, { rowLimit: 1000 }),
  ])
  for (const r of results) if (r.status === 'rejected') throw r.reason
  const candidates = (results[0] as PromiseFulfilledResult<any>).value.rows
  const signals = (results[1] as PromiseFulfilledResult<any>).value.rows
  if (!candidates.length || !signals.length) throw new Error('No eligible sample source rows')
  const product = candidates[0].product as string
  queries.monthly_sales = `SELECT DATE_FORMAT(month_start, 'yyyy-MM') AS period,
    SUM(quantity) AS delivered_quantity, COUNT(*) AS source_transactions,
    CONCAT_WS(';', SORT_ARRAY(COLLECT_SET(reference_mapping_status))) AS product_mapping_status
    FROM ${fact} WHERE ${where} AND normalized_product = '${product.replaceAll("'", "''")}'
    GROUP BY month_start ORDER BY month_start`
  const sales = (await executeDatabricksStatement(queries.monthly_sales, { rowLimit: 100 })).rows
  const seen = new Set<string>()
  for (const row of signals) {
    const key = `${row.period}|${row.signal_family}|${row.signal}`
    if (seen.has(key)) throw new Error(`Duplicate external key: ${key}`)
    seen.add(key)
  }
  if (new Set(sales.map(r => r.period)).size !== sales.length) throw new Error('Duplicate sales month')
  const rows = []
  for (let year = 2018; year <= 2024; year++) for (let month = 1; month <= 12; month++) {
    const period = `${year}-${String(month).padStart(2, '0')}`
    const sale = sales.find(r => r.period === period)
    const disease = signals.find((r: any) => r.period === period && r.signal === 'Dengue')
    const weather = signals.find((r: any) => r.period === period && r.signal_family === 'WEATHER')
    const numeric = (v: any) => v == null ? null : Number(v)
    rows.push({ period, territory: 'Quezon', product,
      delivered_quantity: numeric(sale?.delivered_quantity), source_transactions: numeric(sale?.source_transactions),
      sales_observation_status: sale ? 'OBSERVED' : 'NO_OBSERVATION_NOT_ZERO',
      product_mapping_status: sale?.product_mapping_status ?? null,
      dengue_cases: numeric(disease?.signal_value), rainfall_mm: numeric(weather?.signal_value),
      station_name: weather?.station_name ?? null,
      disease_mapping_status: disease?.mapping_status ?? null, weather_mapping_status: weather?.mapping_status ?? null,
      disease_join_ready: disease?.is_external_join_ready ?? null, weather_join_ready: weather?.is_external_join_ready ?? null,
      disease_forecast_eligible: disease?.is_forecast_eligible ?? null, weather_forecast_eligible: weather?.is_forecast_eligible ?? null,
      dii: null, rsi: null, index_status: 'NOT_COMPUTED_SOURCE_SAMPLE_ONLY',
    })
  }
  const matched = rows.filter(r => r.delivered_quantity !== null && r.dengue_cases !== null && r.rainfall_mm !== null)
  const payload = { extracted_at: new Date().toISOString(), status: 'EXPLORATORY_CANDIDATE_NOT_MODEL_READY',
    selection: 'Quezon; product with most observed eligible months, then transaction count; not selected for a proven disease relationship',
    period: '2018-01 through 2024-12', product, units: { delivered_quantity: 'source units for selected product', dengue_cases: 'reported non-discarded surveillance cases', rainfall_mm: 'candidate station monthly millimetres' },
    limitations: ['Mappings remain subject to source approval flags.', 'Product is a provisional demand identity, not proof of a validated canonical SKU.', 'Missing months are not zero.', 'DII is not computed; its historical denominator requires a documented baseline and coverage policy.', 'Rainfall totals are not the paper-defined probability-based RSI.', 'Same-month alignment illustrates source coverage only; it is not a leakage-safe forecasting dataset.', 'No clinical product-disease association is established by this sample.'],
    counts: { calendar_months: rows.length, observed_sales_months: sales.length, external_rows: signals.length, same_month_complete_rows: matched.length },
    queries, selection_candidates: candidates, source_sales: sales, source_external: signals, sample: rows,
    source_checksum: createHash('sha256').update(JSON.stringify({sales,signals})).digest('hex'),
  }
  await mkdir(out, { recursive: true })
  const file = path.join(out, 'sample.json')
  await writeFile(file, JSON.stringify(payload, null, 2) + '\n', 'utf8')
  const cell = (v: unknown) => v == null ? 'Missing' : String(v).replaceAll('|', '/')
  const preview = matched.slice(-12)
  const markdown = `# Quezon external modeling source sample\n\nExtracted: ${payload.extracted_at}\n\nProduct: **${product}**. Period: ${payload.period}.\n\nRead-only Databricks extraction. Candidate data, not a trained model or approved forecast.\n\n## Coverage\n\n- Calendar months: ${rows.length}\n- Observed sales months: ${sales.length}\n- External source rows: ${signals.length}\n- Months containing sales, dengue cases and rainfall: ${matched.length}\n\n## Latest ${preview.length} complete same-month examples\n\n| Month | Delivered source units | Dengue cases | Rainfall (mm) | Station |\n|---|---:|---:|---:|---|\n${preview.map(r => `| ${[r.period,r.delivered_quantity,r.dengue_cases,r.rainfall_mm,r.station_name].map(cell).join(' | ')} |`).join('\n')}\n\n## Interpretation\n\n${payload.limitations.map(t=>'- '+t).join('\n')}\n\nThe companion sample.json preserves all 84 calendar rows, raw extracted source rows, exact SQL, source versions and approval flags. DII and RSI are deliberately null.\n`
  await writeFile(path.join(out, 'README.md'), markdown, 'utf8')
  const saved = JSON.parse(await readFile(file, 'utf8'))
  if (saved.sample.length !== 84 || saved.source_external.length !== signals.length) throw new Error('Saved output validation failed')
  console.log(JSON.stringify({ output: out, product, counts: payload.counts, preview: preview.slice(-3), validation: 'PASS: unique keys, 84 calendar rows, source row counts preserved, saved JSON reopened' }, null, 2))
}
main().catch(e => { console.error(e instanceof Error ? e.message : String(e)); process.exitCode = 1 })
