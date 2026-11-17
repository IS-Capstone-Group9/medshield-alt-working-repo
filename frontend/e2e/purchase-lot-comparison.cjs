const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),ts=require('../node_modules/typescript')
const root=path.resolve(__dirname,'../..'),out=path.join(root,'outputs/purchase_lot_comparison_20261029');fs.mkdirSync(out,{recursive:true})
const api={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,'frontend/services/api/operating-input-review.ts'),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,{AbortController,exports:api,Intl,Date})
const scope={checksum:'synthetic',scope:{sector:'All',territory:'all'},items:[{product:'Test'}]}
const fixture=()=>({schema_version:1,classification:'entered_unverified_operating_snapshot',as_of:'2026-10-29',input_reference:'Synthetic proposal QA',checksum:'synthetic',scope:scope.scope,
 products:[{product:'Test',unit_label:'entered units',stock_total:0,protected_reserve:0,batches:[],receipts:[],horizon_end:'2026-10-31',
 demand_calendar:['2026-10-29','2026-10-30','2026-10-31'].map(date=>({date,units:2})),
 proposed_receipts:[{receipt_id:'candidate',units:6,expected_on:'2026-10-29',expires_on:'2026-11-01'}]}]})
const run=input=>api.reviewOperatingInputs(input,scope,'2026-10-29').products[0]
const row=run(fixture()),c=row.purchase_comparison
assert.equal(row.timeline.fulfilled_units,0);assert.equal(c.combined_delta.additional_fulfilled_units,6)
assert.equal(c.combined_delta.change_unmet_units,-6);assert.equal(c.proposed_lot_results[0].consumed_units,6)
assert.equal(c.costs_budget_supplier_caps_checked,false);assert.equal(c.procurement_execution_approved,false)
const late=fixture();late.products[0].proposed_receipts[0].expected_on='2026-10-31'
assert.equal(run(late).purchase_comparison.combined_timeline.first_unmet_date,'2026-10-29')
assert.equal(run(late).purchase_comparison.combined_delta.additional_fulfilled_units,2)
const short=fixture();short.products[0].proposed_receipts[0].expires_on='2026-10-30'
const exp=run(short).purchase_comparison;assert.equal(exp.proposed_lot_results[0].projected_expired_units,4);assert.ok(exp.combined_delta.recommendation.includes('smaller or later'))
const overlapping=fixture();overlapping.products[0].proposed_receipts.push({...overlapping.products[0].proposed_receipts[0],receipt_id:'second'})
const both=run(overlapping).purchase_comparison;assert.equal(both.combined_delta.additional_fulfilled_units,6);assert.equal(both.individual_proposals.reduce((s,p)=>s+p.additional_fulfilled_units,0),12)
const outside=fixture();outside.products[0].proposed_receipts[0].expected_on='2026-11-02';outside.products[0].proposed_receipts[0].expires_on='2026-11-03'
assert.equal(run(outside).purchase_comparison.proposed_lot_results[0].outside_horizon_units,6)
const idCollision=fixture();idCollision.products[0].receipts=[{...idCollision.products[0].proposed_receipts[0],units:1}]
const names=run(idCollision).purchase_comparison.combined_timeline.daily[0].consumed_lots.map(l=>l.source_id);assert.ok(names.includes('proposed:candidate')||names.includes('receipt:candidate'))
const combinedCollision=run(idCollision).purchase_comparison.combined_timeline
const sources=[...combinedCollision.daily.flatMap(d=>d.consumed_lots.map(l=>l.source_id)),...combinedCollision.remaining_lots.map(l=>l.source_id)]
assert.ok(sources.includes('proposed:candidate'));assert.ok(sources.includes('receipt:candidate'))
const invalid=[d=>d.products[0].proposed_receipts=null,d=>d.products[0].proposed_receipts=Array.from({length:6},(_,i)=>({...d.products[0].proposed_receipts[0],receipt_id:String(i)})),d=>d.products[0].proposed_receipts.push(d.products[0].proposed_receipts[0]),d=>d.products[0].proposed_receipts[0].units=0,d=>d.products[0].proposed_receipts[0].units=null,d=>d.products[0].proposed_receipts[0].units=1.5,d=>d.products[0].proposed_receipts[0].expected_on='2026-10-28',d=>d.products[0].proposed_receipts[0].expires_on='2026-10-29',d=>delete d.products[0].horizon_end,d=>{d.products[0].proposed_receipts[0].units=1e9;d.products[0].proposed_receipts.push({...d.products[0].proposed_receipts[0],receipt_id:'other',units:1})}]
for(const mutate of invalid){const bad=fixture();mutate(bad);assert.throws(()=>run(bad))}
const no=fixture();no.products[0].proposed_receipts=[];assert.equal(run(no).purchase_comparison,null)
const cases=[]
for(const stock of [0,2,5])for(const demand of [0,2,5])for(const units of [1,4,9])for(const arrival of ['2026-10-29','2026-10-30','2026-11-02'])for(const shortLife of [false,true]){
 const input=fixture(),p=input.products[0];p.stock_total=stock;p.protected_reserve=Math.min(stock,1)
 p.batches=stock?[{batch_id:'existing',units:stock,received_on:'2026-10-01',expires_on:'2026-10-31',disposition:'released'}]:[]
 p.demand_calendar.forEach(d=>d.units=demand)
 p.proposed_receipts=[{receipt_id:'candidate',units,expected_on:arrival,expires_on:shortLife?new Date(Date.parse(arrival)+86400000).toISOString().slice(0,10):'2026-11-05'}]
 cases.push({input,result:run(input)})
}
const before=JSON.stringify(fixture()),immutable=JSON.parse(before);run(immutable);assert.equal(JSON.stringify(immutable),before)
fs.writeFileSync(path.join(out,'cases.json'),JSON.stringify(cases,null,2)+'\n')
fs.writeFileSync(path.join(out,'overlap-case.json'),JSON.stringify({input:overlapping,result:run(overlapping)},null,2)+'\n')
const report={status:'PASS_PROPOSED_LOT_COMPARISON_MODEL',grid_cases:cases.length,invalid_cases_rejected:invalid.length,baseline_unchanged:true,late_and_short_life_cases:true,individual_effects_nonadditive:true,outside_horizon_disclosed:true,authority_flags_false:true,input_not_mutated:true}
fs.writeFileSync(path.join(out,'model-checks.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report))
