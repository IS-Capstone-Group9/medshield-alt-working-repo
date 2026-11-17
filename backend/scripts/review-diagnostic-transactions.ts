import 'dotenv/config'
import assert from 'node:assert/strict'
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs'
import {getDatabricksSalesTransactions} from '../src/databricksDashboard'

type Ledger=Awaited<ReturnType<typeof getDatabricksSalesTransactions>>
type Row=Ledger['rows'][number]
const micro=(value:number|null|undefined)=>Math.round((value??0)*1_000_000)
function summarize(rows:Row[]) {
  const eligible=rows.filter(row=>row.eligible_revenue!==null)
  const total=eligible.reduce((n,row)=>n+micro(row.eligible_revenue),0)
  function groups(key:(row:Row)=>string) {
    const grouped=new Map<string,{label:string;records:number;net_micro:number}>()
    for(const row of eligible){const label=key(row);const value=grouped.get(label)??{label,records:0,net_micro:0};value.records++;value.net_micro+=micro(row.eligible_revenue);grouped.set(label,value)}
    return [...grouped.values()].map(row=>({label:row.label,eligible_records:row.records,net_php:row.net_micro/1_000_000})).sort((a,b)=>b.net_php-a.net_php)
  }
  return {retained_records:rows.length,eligible_records:eligible.length,net_php:total/1_000_000,
    negative_eligible_records:eligible.filter(row=>(row.eligible_revenue??0)<0).length,
    unsupported_margin_records:rows.filter(row=>row.eligible_income===null).length,
    by_recorded_day:groups(row=>row.date_delivered??'Unavailable'),
    by_recorded_dr:groups(row=>row.dr_number??'Unavailable'),
    by_candidate_sector:groups(row=>row.sector??'Unavailable'),
    source_links:rows.map(row=>({record_id:row.source_record_id,file_sha256:row.source_file_sha256,row:row.source_row_number}))}
}
async function main(){
  const directory='../outputs/diagnostic_transactions_20261030';mkdirSync(directory,{recursive:true})
  const cases=[]
  for(const [period,label] of [['april','SPEEDA'],['july','SEROALBUMIN'],['july','SHARJVAX'],['august','ANTITET 1500IU/0.7ML']]){
    const diagnostic=JSON.parse(readFileSync('../outputs/diagnostic_follow_up_20261030/'+period+'.json','utf8'))
    const group=diagnostic.contributions.product.find((row:{label:string})=>row.label===label);assert.ok(group)
    const sides:Record<string,ReturnType<typeof summarize>>={}
    for(const side of ['current','prior']){
      const scope=diagnostic.scope
      const result=await getDatabricksSalesTransactions({startDate:scope[side==='current'?'start_date':'prior_start_date'],endDate:scope[side==='current'?'end_date':'prior_end_date'],productId:group.key},true)
      assert.equal(result.rows.length,result.pagination.total_rows,'All retained rows must be captured')
      assert.equal(new Set(result.rows.map(row=>row.source_record_id)).size,result.rows.length)
      assert.equal(result.release.dataset_id,diagnostic.release.dataset_id)
      assert.equal(result.release.fact_delta_version,diagnostic.release.fact_delta_version)
      const summary=summarize(result.rows);assert.equal(micro(summary.net_php),micro(group[side]))
      sides[side]=summary
      writeFileSync(directory+'/'+period+'-'+label.replace(/[^A-Z0-9]+/g,'_')+'-'+side+'.json',JSON.stringify(result,null,2)+'\n')
    }
    assert.equal(micro(sides.current.net_php)-micro(sides.prior.net_php),micro(group.delta))
    cases.push({period,label,product_group:group.key,identity_status:group.identity_status,delta_php:group.delta,source:diagnostic.release,sides})
  }
  writeFileSync(directory+'/review.json',JSON.stringify({status:'PASS_DIAGNOSTIC_TRANSACTION_RECONCILIATION',checked_at:new Date().toISOString(),cases,warehouse_writes:0,approvals_added:0,causal_status:'unverified'},null,2)+'\n')
  console.log('PASS_DIAGNOSTIC_TRANSACTION_RECONCILIATION: eight full ledgers, four product changes; no writes or approvals')
}
main().catch(error=>{console.error(error instanceof Error?error.message.slice(0,180):'Transaction evidence unavailable');process.exitCode=1})
