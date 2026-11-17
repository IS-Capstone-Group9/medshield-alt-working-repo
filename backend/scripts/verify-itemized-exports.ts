import 'dotenv/config'
import assert from 'node:assert/strict'
import {writeFileSync} from 'node:fs'
import {getItemizedPreview, getItemizedPreviewCsv, decimalMicros} from '../src/itemizedPreview'

// Independent CSV round-trip: quoted cells, escaped quotes and embedded newlines.
function parse(csv: string) {
  const rows: string[][] = []; let row: string[] = [], cell = '', quoted = false
  const text = csv.replace(/^\uFEFF/,'')
  for (let i=0;i<text.length;i++) {
    const ch = text[i]
    if (ch === '"') {
      if (quoted && text[i+1] === '"') {cell += '"'; i++} else quoted = !quoted
    } else if (ch === ',' && !quoted) {row.push(cell); cell = ''}
    else if (ch === '\n' && !quoted) {row.push(cell.replace(/\r$/,'')); rows.push(row); row = []; cell = ''}
    else cell += ch
  }
  assert.equal(quoted,false)
  const [columns,...values] = rows
  return values.map(values=>Object.fromEntries(columns.map((name,i)=>[name,values[i]])))
}

async function main() {
  const report: Record<string, unknown> = {checked_at:new Date().toISOString(), read_only:true, source_changed:false, raw_records_retained:false}
  const filters = {year:'2025',area:'all',category:'medicine'}
  try {
    const preview = await getItemizedPreview(filters)
    const exports = await Promise.all(['monthly','products','records'].map(async view=>{
      const output = await getItemizedPreviewCsv(view,filters)
      const rows = parse(output.csv)
      const sum = rows.reduce((total,row)=>total + (view !== 'records' || row.net_eligible === 'true' ? decimalMicros(row.net_sales || '0') : 0n),0n)
      assert.equal(sum,decimalMicros(preview.summary.net_sales!))
      assert.ok(rows.every(row=>row['Source batch']===preview.source.batch_id && row['Gold table']===preview.source.source_table &&
        row['Contracts excluded']==='true' && row['Complete company sales']==='false' && row['Financial release approved']==='false' && row['Forecast approved']==='false' &&
        row['Year filter']===filters.year && row['Category filter']===filters.category))
      if (view === 'records') {
        assert.equal(rows.length,Number(preview.summary.records))
        assert.ok(rows.every(row=>row.date_delivered.startsWith('2025-') && row.category==='medicine' && row.source_unit_approved==='false'))
      }
      return {view,rows:rows.length,matching_net:true,scope_and_filters:true,bytes:Buffer.byteLength(output.csv)}
    }))
    // Full-record export also proves the configured row/chunk limit does not silently cut the candidate.
    const full = parse((await getItemizedPreviewCsv('records',{})).csv)
    assert.equal(full.length,40171)
    assert.equal(new Set(full.map(row=>row.source_record_id)).size,40171)
    assert.equal(full.filter(row=>row.net_eligible==='true').length,39286)
    assert.equal(full.reduce((sum,row)=>sum+(row.net_eligible==='true'?decimalMicros(row.net_sales):0n),0n),decimalMicros('638015351.53'))
    Object.assign(report,{status:'PASS_LIVE_EXPORT_PARITY',filters,exports,full_record_export:{records:full.length,unique_keys:40171,net_eligible:39286,matching_net:true}})
  } catch(error) {
    Object.assign(report,{status:'UNVERIFIED_LIVE_EXPORT_PARITY',error_type:error instanceof Error?error.name:'unknown',
      provider_code:error instanceof Error?error.message.match(/HTTP \d{3}|\[[A-Z_\.]+\]/)?.[0]:undefined,
      assertion:error instanceof assert.AssertionError?error.message.split('\n')[0]:undefined})
    process.exitCode=1
  }
  writeFileSync('../outputs/itemized_integration_20261026/live-exports.json',JSON.stringify(report,null,2)+'\n')
  console.log(JSON.stringify(report))
}
main().catch(()=>{console.error('Export verification could not write its report.');process.exitCode=1})
