import 'dotenv/config'
import assert from 'node:assert/strict'
import {mkdirSync,writeFileSync} from 'node:fs'
import {readSo1Diagnostics} from '../src/so1Diagnostics'
import {executeDatabricksStatement} from '../src/databricks'
import {SO1_FINANCIAL_SQL} from '../src/so1Financial'
async function main(){
  const output='../outputs/so1_financial_scope_20261027';mkdirSync(output,{recursive:true})
  const financial=await executeDatabricksStatement(SO1_FINANCIAL_SQL,{rowLimit:10001})
  writeFileSync(output+'/financial-source.json',JSON.stringify(financial.rows,null,2)+'\n')
  const views:Record<string,unknown>={}
  for(const [area,year] of [['COMPANY','all'],['COMPANY','2026'],['QUEZON','2026'],['ALBAY','all'],['GOVERNMENT','2026']]){
    const data=await readSo1Diagnostics({area,year})
    assert.ok('financial_summary' in data&&'financial' in data.source)
    assert.ok(data.financial_summary);assert.equal(data.source.financial.source_reconciled,true)
    if(area==='COMPANY'&&year==='all'){
      assert.ok(Math.abs(data.financial_summary.gross_profit_php!-334666271.55)<.000001)
      assert.ok(Math.abs(data.financial_summary.margin_revenue_basis_php!-566954921.92)<.000001)
    }
    views[area+'|'+year]=data
  }
  writeFileSync(output+'/actual-views.json',JSON.stringify(views,null,2)+'\n')
  const report={status:'PASS_ACTUAL_SO1_FINANCIAL_READS',checked_at:new Date().toISOString(),views:Object.keys(views),
    company_summary:(views['COMPANY|all'] as any).financial_summary,source:(views['COMPANY|all'] as any).source.financial,
    warehouse_writes:0,financial_release_approved:false,model_publication_approved:false}
  writeFileSync(output+'/live-verification.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report))
}
main().catch(()=>{console.error('SO1 financial readback failed; no substitute values.');process.exitCode=1})
