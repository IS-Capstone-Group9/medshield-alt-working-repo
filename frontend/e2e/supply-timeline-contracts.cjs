const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),ts=require('../node_modules/typescript')
const root=path.resolve(__dirname,'../..'),out=path.join(root,'outputs/supply_timeline_20261029');fs.mkdirSync(out,{recursive:true})
const api={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,'frontend/services/api/operating-input-review.ts'),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,{AbortController,exports:api,Intl,Date})
const current={checksum:'synthetic',scope:{sector:'All',territory:'all'},items:[{product:'Test',stock:'8',reserve:'1'}]}
const fixture=()=>({schema_version:1,classification:'entered_unverified_operating_snapshot',as_of:'2026-10-29',input_reference:'Synthetic daily QA',checksum:'synthetic',scope:current.scope,
 products:[{product:'Test',unit_label:'entered units',stock_total:8,protected_reserve:1,
 batches:[{batch_id:'late',units:5,received_on:'2026-10-01',expires_on:'2026-11-03',disposition:'released'},{batch_id:'early',units:3,received_on:'2026-10-01',expires_on:'2026-10-30',disposition:'released'}],
 receipts:[{receipt_id:'arrival',units:4,expected_on:'2026-10-30',expires_on:'2026-11-02'}],horizon_end:'2026-11-01',
 demand_calendar:['2026-10-29','2026-10-30','2026-10-31','2026-11-01'].map(date=>({date,units:2}))}]})
const run=input=>api.reviewOperatingInputs(input,current,'2026-10-29').products[0].timeline
const a=run(fixture());assert.equal(a.fulfilled_units,8);assert.equal(a.projected_expired_units,1);assert.equal(a.ending_units,3)
assert.equal(a.daily[0].consumed_lots[0].source_id,'batch:early');assert.equal(a.daily[1].consumed_lots[0].source_id,'receipt:arrival')
assert.equal(a.daily[1].projected_expired_units,1);assert.equal(a.first_projected_expiry_date,'2026-10-30')
assert.equal(a.daily[1].projected_expired_lots[0].source_id,'batch:early');assert.ok(a.recommended_followups[0].includes('2026-10-30'))
assert.equal(a.expiry_outcome_measured,false);assert.equal(a.allocation_optimized,false)
const same=fixture();same.products[0].demand_calendar.forEach(x=>x.units=0);same.products[0].demand_calendar[0].units=10
const shortage=run(same);assert.equal(shortage.daily[0].fulfilled_units,7);assert.equal(shortage.daily[0].unmet_units,3);assert.equal(shortage.daily[1].fulfilled_units,0)
assert.equal(shortage.first_unmet_date,'2026-10-29')
assert.ok(shortage.recommended_followups[0].includes('before 2026-10-29'))
const expiredReserve=fixture();expiredReserve.products[0].protected_reserve=8;expiredReserve.products[0].receipts=[]
const e=run(expiredReserve);assert.equal(e.fulfilled_units,0);assert.equal(e.daily[1].reserve_shortfall_units,3)
const outside=fixture();outside.products[0].receipts[0].expected_on='2026-11-02';outside.products[0].receipts[0].expires_on='2026-11-04'
assert.equal(run(outside).excluded_later_receipt_units,4)
const noTimeline=fixture();delete noTimeline.products[0].horizon_end;delete noTimeline.products[0].demand_calendar;assert.equal(run(noTimeline),null)
const long=fixture();long.products[0].horizon_end='2027-10-29';long.products[0].demand_calendar=Array.from({length:366},(_,i)=>({date:new Date(Date.parse('2026-10-29')+i*86400000).toISOString().slice(0,10),units:0}));assert.equal(run(long).days,366)
const invalid=[d=>d.products[0].demand_calendar.pop(),d=>d.products[0].demand_calendar[1].date='2026-10-29',d=>d.products[0].demand_calendar[1].units=null,d=>d.products[0].demand_calendar[0].units=-1,d=>d.products[0].demand_calendar[0].units=1.2,d=>d.products[0].demand_calendar[0].date='2026-10-28',d=>d.products[0].horizon_end='2026-02-30',d=>d.products[0].horizon_end='2026-10-28',d=>d.products[0].horizon_end='2027-11-01',d=>delete d.products[0].horizon_end,d=>d.products[0].demand_calendar.forEach(x=>x.units=1e9)]
for(const mutate of invalid){const bad=fixture();mutate(bad);assert.throws(()=>run(bad))}
const cases=[]
for(const early of [0,1,3])for(const later of [0,2,5])for(const inbound of [0,4])for(const daily of [0,1,5]){
 const input=fixture(),p=input.products[0];p.batches[0].units=later;p.batches[1].units=early;p.stock_total=early+later;p.protected_reserve=Math.min(1,p.stock_total)
 p.receipts=inbound?[{...p.receipts[0],units:inbound}]:[];p.demand_calendar.forEach(x=>x.units=daily)
 cases.push({input,result:run(input)})
}
const raw=JSON.stringify(fixture()),input=JSON.parse(raw);run(input);assert.equal(JSON.stringify(input),raw)
fs.writeFileSync(path.join(out,'timeline-cases.json'),JSON.stringify(cases,null,2)+'\n')
fs.writeFileSync(path.join(out,'known-example.json'),JSON.stringify({input:fixture(),result:a},null,2)+'\n')
const report={status:'PASS_ENTERED_SUPPLY_TIMELINE_MODEL',grid_cases:cases.length,invalid_timeline_cases_rejected:invalid.length,known_fefo_and_receipt_expiry_order:true,reserve_protection_and_shortfall:true,unmet_not_carried:true,outside_receipts_excluded:true,legacy_snapshot_supported:true,inputs_not_mutated:true,actual_operating_data:false}
fs.writeFileSync(path.join(out,'model-checks.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report))
