import {mkdirSync,writeFileSync} from 'node:fs'
import {selectDatedPlan} from '../src/datedPlanSelection'
const out='../outputs/dated_purchase_selection_20261029';mkdirSync(out,{recursive:true})
const cases=[]
for(let index=0;index<80;index++){
 const products=Array.from({length:1+index%3},(_,i)=>({product:'Synthetic '+i,unit_label:'entered units',stock_total:(index+i)%3,protected_reserve:0,batches:(index+i)%3?[{batch_id:'existing',units:(index+i)%3,received_on:'2026-10-01',expires_on:'2026-10-31',disposition:'released'}]:[],receipts:[],horizon_end:'2026-10-31',demand_calendar:['2026-10-29','2026-10-30','2026-10-31'].map((date,d)=>({date,units:1+(index+i+d)%3})),
  proposed_receipts:[{receipt_id:'slot',units:1,expected_on:index%4?'2026-10-29':'2026-10-30',expires_on:index%5?'2026-11-01':'2026-10-31'}],
  purchase_constraints:{units_per_pack:1,pack_cost:[.25,.5,1][i],supplier_max_packs:4,selection_max_packs:4,selection_weight:1+(i+index)%5,maximum_projected_expired_units:index%3?0:5,minimum_fulfillment_pct:index%4?0:100}}))
 const snapshot={schema_version:1,classification:'entered_unverified_operating_snapshot',checksum:'synthetic',scope:{sector:'All',territory:'all'},as_of:'2026-10-29',input_reference:'Synthetic oracle',purchase_budget:(index%12)/2,products}
 const request={acknowledged:true,snapshot},shortlist={source:{checksum:'synthetic'},scope:snapshot.scope,products:products.map(p=>({product:p.product}))}
 cases.push({request,result:selectDatedPlan(request,shortlist,'2026-10-29'),limited:selectDatedPlan(request,shortlist,'2026-10-29',0)})
}
writeFileSync(out+'/oracle-cases.json',JSON.stringify(cases,null,2)+'\n');console.log(JSON.stringify({status:'CAPTURED_DATED_SELECTION_ORACLE',cases:cases.length}))
const stressSnapshot={schema_version:1,classification:'entered_unverified_operating_snapshot',checksum:'synthetic',scope:{sector:'All',territory:'all'},as_of:'2026-10-29',input_reference:'Synthetic cap QA',purchase_budget:50,
 products:Array.from({length:5},(_,i)=>({product:'Stress '+i,unit_label:'entered units',stock_total:0,protected_reserve:0,batches:[],receipts:[],horizon_end:'2026-10-29',demand_calendar:[{date:'2026-10-29',units:20}],proposed_receipts:[{receipt_id:'slot',units:1,expected_on:'2026-10-29',expires_on:'2026-10-30'}],purchase_constraints:{units_per_pack:1,pack_cost:1,supplier_max_packs:20,selection_max_packs:20,selection_weight:1,maximum_projected_expired_units:0,minimum_fulfillment_pct:0}}))}
const stressBody={acknowledged:true,snapshot:stressSnapshot},started=Date.now(),stressResult=selectDatedPlan(stressBody,{source:{checksum:'synthetic'},scope:stressSnapshot.scope,products:stressSnapshot.products.map(p=>({product:p.product}))},'2026-10-29')
writeFileSync(out+'/stress-case.json',JSON.stringify({request:stressBody,result:stressResult,elapsed_ms:Date.now()-started,independently_known_primary_optimum_pct:50},null,2)+'\n')
