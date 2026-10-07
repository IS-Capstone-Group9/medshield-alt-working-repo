import 'dotenv/config'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { executeDatabricksStatement } from '../src/databricks'

async function main() {
  const dir = path.resolve(__dirname, '../../outputs/databricks/quezon_external_sample_20260922')
  const sample = JSON.parse(await readFile(path.join(dir, 'sample.json'), 'utf8'))
  const sql = `SELECT * FROM workspace.medshield_gold.vw_weather_nasa_power_monthly_candidate
    WHERE UPPER(territory) = 'QUEZON' AND period_start >= DATE '2018-01-01'
      AND period_start < DATE '2025-01-01' ORDER BY period_start`
  const result = await executeDatabricksStatement(sql, { rowLimit: 100 })
  const keys = result.rows.map(r => String(r.period_start).slice(0,7))
  if (new Set(keys).size !== keys.length) throw new Error('Duplicate NASA territory-month keys')
  const rows = sample.sample.map((r: any) => {
    const nasa = result.rows.find(n => String(n.period_start).slice(0,7) === r.period)
    return { period: r.period, delivered_quantity: r.delivered_quantity, dengue_cases: r.dengue_cases,
      pagasa_rainfall_mm: r.rainfall_mm, pagasa_station: r.station_name,
      nasa_rainfall_mm: nasa?.rainfall_mm == null ? null : Number(nasa.rainfall_mm),
      nasa_weather_severity_proxy: nasa?.rainfall_severity_proxy == null ? null : Number(nasa.rainfall_severity_proxy),
      nasa_fetched_at: nasa?.fetched_at ?? null,
      comparison_status: 'CANDIDATE_SOURCE_COMPARISON_NOT_VALIDATED_RSI' }
  })
  const paired = rows.filter((r: any) => r.nasa_rainfall_mm !== null && r.pagasa_rainfall_mm !== null)
  const payload = { extracted_at: new Date().toISOString(), product: sample.product, territory: 'Quezon',
    sql, nasa_rows: result.rows, comparison: rows,
    limitations: ['NASA weather severity is an existing heuristic using rainfall, rainy days, wind and temperature; it is not a rainfall probability.', 'PAGASA station and NASA coordinate represent different spatial measurements.', 'No provider blending or model validation performed.', 'Null means unavailable, never zero.'],
    counts: { nasa_months: result.rows.length, paired_rainfall_months: paired.length } }
  const file = path.join(dir, 'nasa_pagasa_comparison.json')
  await writeFile(file, JSON.stringify(payload, null, 2)+'\n')
  if (JSON.parse(await readFile(file, 'utf8')).comparison.length !== 84) throw new Error('Saved comparison incomplete')
  const preview = paired.slice(-12)
  await writeFile(path.join(dir, 'NASA_PAGASA_COMPARISON.md'), `# Quezon NASA POWER and PAGASA comparison\n\nExtracted ${payload.extracted_at}.\n\nNASA months: ${result.rows.length}; months with both rainfall sources: ${paired.length}.\n\n| Month | PAGASA rainfall mm | NASA rainfall mm | Existing NASA weather proxy (0–1) |\n|---|---:|---:|---:|\n${preview.map((r:any)=>`| ${r.period} | ${r.pagasa_rainfall_mm} | ${r.nasa_rainfall_mm} | ${r.nasa_weather_severity_proxy} |`).join('\n')}\n\n${payload.limitations.map(t=>'- '+t).join('\n')}\n\nThe JSON preserves the exact SELECT, source metadata, all source rows and all 84 comparison months.\n`)
  console.log(JSON.stringify({counts:payload.counts,preview:paired.slice(-3),path:file,validation:'PASS: unique NASA monthly keys and 84 saved calendar rows'},null,2))
}
main().catch(e=>{console.error(e instanceof Error ? e.message : String(e));process.exitCode=1})
