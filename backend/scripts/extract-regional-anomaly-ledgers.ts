import 'dotenv/config'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {executeDatabricksStatement} from '../src/databricks'
import {readRegionalReview,microsText} from '../src/regionalSalesReview'
import {decimalMicros} from '../src/itemizedPreview'
import {databricksLiteral} from '../src/databricksLiteral'
import {descriptiveBinding,readDescriptiveRelease} from '../src/descriptiveSource'

async function main(){
  console.log('READ_ONLY_PHASE: validate_current_regional_source')
  const directory=resolve(process.argv[2]??'../outputs/wp3_regional_anomaly_ledgers_20261030')
  const readCurrent=()=>readRegionalReview(undefined,()=>readDescriptiveRelease(descriptiveBinding({DATABRICKS_DESCRIPTIVE_ADAPTER:'original_itemized_v1'})))
  const current=await readCurrent()
  console.log('READ_ONLY_PHASE: current_source_validated')
  const savedBytes=readFileSync('../outputs/wp3_diagnostic_drivers_20261030/results.json')
  const saved=JSON.parse(savedBytes.toString('utf8'))
  const periods=['2020-01','2020-10','2021-10','2023-05','2026-06']
  assert.deepEqual(saved.flagged_periods,periods)
  assert.equal(current.source.dataset_id,'e87cae21986db32bcade298d69e652236be9db65f2685db51355003f1439ff10')
  assert.equal(current.source.fact_version,0)
  // Fixed reviewed CALABARZON labels. Source strings are SQL literals, never identifiers.
  const labels=current.mappings.filter((r:any)=>r.region==='CALABARZON').map((r:any)=>r.recorded_label)
  assert.ok(labels.length>0)
  const captures=[]
  for(const period of periods){
    const expected=current.months.find(r=>r.region==='CALABARZON'&&r.period===period)
    assert.ok(expected?.net_sales_php)
    const start=period+'-01';const year=Number(period.slice(0,4)),month=Number(period.slice(5))
    const end=(month===12?year+1:year)+'-'+String(month===12?1:month+1).padStart(2,'0')+'-01'
    const sql=`SELECT source_record_id,source_workbook,source_file_sha256,CAST(source_row_number AS STRING) AS source_row_number,
      CAST(date_delivered AS STRING) AS date_delivered,area,dr_number,normalized_product,
      CAST(net_sales AS STRING) AS net_sales,CAST(is_net_sales_technically_eligible AS STRING) AS net_eligible,
      source_data_status,quality_rule_codes_json FROM ${current.source.fact_table} VERSION AS OF 0
      WHERE record_kind='itemized_sale' AND area IN (${labels.map(databricksLiteral).join(',')})
      AND date_delivered>=CAST(${databricksLiteral(start)} AS DATE) AND date_delivered<CAST(${databricksLiteral(end)} AS DATE)
      ORDER BY source_record_id`
    const detail=await executeDatabricksStatement(sql,{rowLimit:10000})
    console.log('READ_ONLY_PHASE: received_'+period)
    assert.ok(detail.rows.length<10000);assert.equal(detail.rows.length,expected.records)
    assert.equal(new Set(detail.rows.map(r=>r.source_record_id)).size,detail.rows.length)
    const eligible=detail.rows.filter(r=>r.net_eligible==='true')
    assert.equal(eligible.length,expected.net_eligible_records)
    const net=eligible.reduce((sum,r)=>sum+decimalMicros(r.net_sales!),0n)
    assert.equal(microsText(net),expected.net_sales_php)
    captures.push({period,region:'CALABARZON',expected,sql,sql_sha256:createHash('sha256').update(sql).digest('hex'),rows:detail.rows})
  }
  assert.deepEqual((await readCurrent()).source,current.source)
  mkdirSync(directory,{recursive:true})
  const result={status:'PASS_READ_ONLY_GOLD_REGIONAL_ANOMALY_LEDGERS',checked_at:new Date().toISOString(),
    source:current.source,anomaly_report_sha256:createHash('sha256').update(savedBytes).digest('hex'),
    periods,captures,evidence_label:'Observed',warehouse_writes:0,approvals_created:0,
    extractor_sha256:createHash('sha256').update(readFileSync(__filename)).digest('hex')}
  writeFileSync(resolve(directory,'source.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'})
  console.log(JSON.stringify({status:result.status,months:captures.length,records:captures.reduce((n,c)=>n+c.rows.length,0),warehouse_writes:0}))
}
main().catch((error:unknown)=>{
  const message=error instanceof Error?error.message:''
  const http=message.match(/HTTP (\d{3})/)?.[1]
  const missing=message.match(/\b(DATABRICKS_[A-Z_]+) is not configured\b/)?.[1]
  const reason=http?'upstream_HTTP_'+http:missing?'missing_'+missing:error instanceof assert.AssertionError?'source_contract_assertion':'source_request_or_configuration_failure'
  if(error instanceof assert.AssertionError){
    const location=error.stack?.match(/backend[\\/]src[\\/]([A-Za-z0-9_-]+\.ts:\d+:\d+)/)?.[1]
    console.error('SOURCE_ASSERTION_LOCATION: '+(location??'not_available'))
  }
  console.error('REGIONAL_ANOMALY_SOURCE_UNAVAILABLE_OR_MISMATCHED: '+reason+'; no substitute data used')
  process.exitCode=1
})
