import 'dotenv/config'
import assert from 'node:assert/strict'
import {writeFileSync} from 'node:fs'
import {withFinancialScope,type FinancialScope,financialScopeMetadata} from '../src/financialScope'
import {loadSnapshot} from '../src/snapshot'
import {getDatabricksSalesSummary,getDatabricksSalesTransactions,getDatabricksSectorTrend,getDatabricksFinancialLedgerCsv} from '../src/databricksDashboard'
import {decimalMicros} from '../src/itemizedPreview'
const output='../outputs/unified_sales_scope_20261027/live-verification.json'
const controls={itemized:{records:40171,net:638015351.53,gp:334666271.55,basis:566954921.92},
  contracts:{records:352,net:118330249.95,gp:41691008.14,basis:109371117.44},
  combined_unreconciled:{records:40523,net:756345601.48,gp:376357279.69,basis:676326039.36}}
const near=(value:unknown,expected:number)=>assert.ok(typeof value==='number' && Math.abs(value-expected)<.000002,`Measure differs: ${String(value)} / ${expected}`)
function csvRows(text:string) {
  const rows:string[][]=[];let row:string[]=[],cell='',quoted=false
  for(let i=1;i<text.length;i++) {
    const c=text[i]
    if(c==='"') {if(quoted&&text[i+1]==='"'){cell+='"';i++}else quoted=!quoted}
    else if(c===','&&!quoted){row.push(cell);cell=''}
    else if(c==='\n'&&!quoted){row.push(cell.replace(/\r$/,''));rows.push(row);row=[];cell=''}
    else cell+=c
  }
  assert.equal(quoted,false);return rows
}
const report:Record<string,unknown>={checked_at:new Date().toISOString(),warehouse_writes:0,source_files_modified:false,approval_changes:0,mode:'read-only actual Gold gateway modules; no browser/auth walkthrough'}
let stage='scoped snapshots'
async function main(){
  try{
    const results=await Promise.all((Object.keys(controls) as FinancialScope[]).map(scope=>withFinancialScope(scope,async()=>{
      const [snapshot,summary,sectors]=await Promise.all([loadSnapshot(),getDatabricksSalesSummary({}),getDatabricksSectorTrend()])
      const c=controls[scope]
      near(snapshot.totals.total_revenue,c.net);near(snapshot.totals.total_income,c.gp)
      near(snapshot.totals.margin_revenue_basis,c.basis)
      assert.equal(snapshot.totals.total_transactions,c.records)
      near(summary.sums.net_cost,c.net);near(summary.sums.net_income,c.gp)
      assert.equal(summary.counts.rows,c.records);assert.equal(summary.sums.quantity,null)
      assert.equal((snapshot.data_status as any).release.financial_scope.id,scope)
      const daily=sectors.daily.filter(row=>row.sector==='All')
      near(daily.reduce((sum,row)=>sum+(row.revenue??0),0),c.net)
      near(daily.reduce((sum,row)=>sum+(row.income??0),0),c.gp)
      near(daily.reduce((sum,row)=>sum+(row.margin_revenue_basis??0),0),c.basis)
      console.log('Verified financial snapshot: '+scope)
      return {scope,summary:{records:c.records,net:summary.sums.net_cost,gp:summary.sums.net_income,basis:snapshot.totals.margin_revenue_basis,margin:summary.gross_margin_rate},daily_all_rows:daily.length,
        metadata:financialScopeMetadata(),product_net_controls:snapshot.top_products.map(row=>({label:row.product,net:row.revenue})),area_controls:snapshot.by_area}
    })))
    report.scopes=results
    assert.deepEqual(results[0].product_net_controls,results[1].product_net_controls)
    assert.deepEqual(results[0].product_net_controls,results[2].product_net_controls)
    assert.deepEqual(results[0].area_controls,results[2].area_controls)
    stage='year filtered ledger / summary / CSV'
    const filtered=await Promise.all((Object.keys(controls) as FinancialScope[]).map(scope=>withFinancialScope(scope,async()=>{
      const [summary,ledger]=await Promise.all([getDatabricksSalesSummary({year:'2026'}),getDatabricksSalesTransactions({year:'2026',pageSize:100})])
      assert.equal(ledger.pagination.total_rows,summary.counts.rows)
      assert.ok(ledger.rows.every(row=>scope==='combined_unreconciled'||row.record_kind===(scope==='contracts'?'contract_summary':'itemized_sale')))
      const csv=await getDatabricksFinancialLedgerCsv({year:'2026'})
      assert.ok(csv.csv.includes('"Financial scope","Unreconciled arithmetic sum","Additivity"'))
      assert.ok(csv.csv.includes('"'+scope+'"'))
      assert.ok(csv.csv.includes('"unverified","false"'))
      const [header,...rows]=csvRows(csv.csv)
      assert.equal(rows.length,summary.counts.rows,'CSV must contain the complete selected ledger')
      const eligibleNet=rows.reduce((sum,row)=>sum+decimalMicros(row[header.indexOf('eligible_revenue')]||'0'),0n)
      assert.equal(eligibleNet,decimalMicros(String(summary.sums.net_cost??0)))
      assert.ok(rows.every(row=>row[header.indexOf('Financial scope')]===scope))
      assert.equal(summary.release.financial_scope.id,scope)
      console.log('Verified filtered ledger and export: '+scope)
      return {scope,year:'2026',rows:summary.counts.rows,net:summary.sums.net_cost,export_rows:rows.length,export_eligible_net_micros:String(eligibleNet),export_bytes:Buffer.byteLength(csv.csv)}
    })))
    report.filtered=filtered
    near(filtered[2].net,Number(filtered[0].net)+Number(filtered[1].net))
    stage='unsupported dimensions / empty scope'
    await withFinancialScope('contracts',async()=>{
      for(const dimension of [{area:'QUEZON'},{productId:'RAW:example'},{category:'Medical'},{sector:'Government'},{search:'test'}])
        await assert.rejects(getDatabricksSalesSummary(dimension),/details are unavailable/)
      const empty=await getDatabricksSalesSummary({year:'2099'})
      assert.equal(empty.counts.rows,0);assert.equal(empty.sums.net_cost,null);assert.equal(empty.sums.net_income,null)
    })
    assert.equal(decimalMicros(String(results[2].summary.net)),decimalMicros(String(results[0].summary.net))+decimalMicros(String(results[1].summary.net)))
    report.status='PASS_FINANCIAL_SCOPES_LIVE'
  }catch(error){report.status='FAILED';report.stage=stage;report.error=error instanceof Error?error.message:'unknown';process.exitCode=1}
  writeFileSync(output,JSON.stringify(report,null,2)+'\n')
  console.log(JSON.stringify({status:report.status,stage,report:output}))
}
main().catch(()=>{console.error('Could not retain scoped verification');process.exitCode=1})
