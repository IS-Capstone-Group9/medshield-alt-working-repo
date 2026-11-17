import {readFileSync,writeFileSync,mkdirSync} from 'node:fs'
import {reviewDatedPlan} from '../src/datedPlanReview'
const out='../outputs/backend_dated_plan_20261029';mkdirSync(out,{recursive:true})
const previous=JSON.parse(readFileSync('../outputs/purchase_lot_comparison_20261029/cases.json','utf8')) as Array<{input:Record<string,unknown>}>
const cases=[]
for(const [index,entry]of previous.entries()){
 const snapshot=structuredClone(entry.input) as {products:Array<Record<string,unknown>>;[key:string]:unknown}
 const p=snapshot.products[0],proposal=(p.proposed_receipts as Array<{expected_on:string;units:number}>)[0]
 if(proposal.expected_on>String(p.horizon_end))continue
 snapshot.purchase_budget=index%2?1:10
 p.purchase_constraints={units_per_pack:1,pack_cost:.25,supplier_max_packs:index%3?10:2,maximum_projected_expired_units:index%4?0:20,minimum_fulfillment_pct:index%5?100:0}
 const shortlist={source:{checksum:String(snapshot.checksum)},scope:snapshot.scope as {sector:string;territory:string},products:[{product:String(p.product)}]}
 const request={acknowledged:true,snapshot},result=reviewDatedPlan(request,shortlist,'2026-10-29')
 cases.push({request,result})
}
writeFileSync(out+'/oracle-cases.json',JSON.stringify(cases,null,2)+'\n');console.log(JSON.stringify({status:'CAPTURED_SERVER_DATED_ORACLE_CASES',cases:cases.length}))
