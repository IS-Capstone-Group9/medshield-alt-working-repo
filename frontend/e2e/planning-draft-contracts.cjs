// Isolated validation checks against an actual downloaded QA draft; no browser automation.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),ts=require('../node_modules/typescript')
const root=path.resolve(__dirname,'../..'),source=path.join(root,'outputs/so5_workflow_review_20261029'),out=path.resolve(process.argv[2]||source)
fs.mkdirSync(out,{recursive:true})
const api={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,'frontend/services/api/planning-drafts.ts'),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,{exports:api})
const draft=JSON.parse(fs.readFileSync(path.join(source,'full-draft.json'),'utf8')),current=draft.request
const raw=JSON.stringify(draft)
assert.equal(api.validatePlanningDraft(draft,current),draft)
const blank=JSON.parse(fs.readFileSync(path.join(source,'incomplete-draft.json'),'utf8'))
assert.equal(api.validatePlanningDraft(blank,current),blank);assert.equal(blank.request.items[0].demand,'');assert.equal(blank.request.items[0].stock,'0');assert.equal(blank.request.budget,'0')
const mutations=[d=>d.schema_version=2,d=>d.classification='approved',d=>d.created_at='invalid',d=>d.request.acknowledged=true,d=>d.request.checksum='stale',d=>d.request.scope.territory='other',d=>d.request.scope.sector='other',d=>d.request.horizon='2',d=>d.request.items.pop(),d=>d.request.items[0].product='unknown',d=>d.request.items[0].product=d.request.items[1].product,d=>d.request.items[0].demand=true,d=>d.request.items[0].stock=null,d=>d.request.items[0].pack_cost='Infinity',d=>d.request.budget='=1+1',d=>d.request.minimum_pct='-1']
for(const mutate of mutations){const bad=structuredClone(draft);mutate(bad);const before=JSON.stringify(bad);assert.throws(()=>api.validatePlanningDraft(bad,current));assert.equal(JSON.stringify(bad),before)}
const textForms=structuredClone(draft);textForms.request.budget='1e3';textForms.request.items[0].pack_cost='.25';assert.equal(api.validatePlanningDraft(textForms,current),textForms)
assert.equal(JSON.stringify(draft),raw)
const policy=structuredClone(draft);Object.assign(policy.request.items[0],{annual_demand:'365',order_cost:'10',holding_cost:'2',lead_days:'5',on_order:'0',backorders:'0'})
assert.equal(api.validatePlanningDraft(policy,current),policy)
const partial=structuredClone(draft);partial.request.items[0].annual_demand='';assert.equal(api.validatePlanningDraft(partial,current),partial)
for(const field of ['annual_demand','order_cost','holding_cost','lead_days','on_order','backorders'])for(const value of [null,false,{},'Infinity','=1']){const bad=structuredClone(policy);bad.request.items[0][field]=value;assert.throws(()=>api.validatePlanningDraft(bad,current))}
const weighted=structuredClone(policy);Object.assign(weighted.request,{allocation_method:'weighted',revenue_weight:'50',growth_weight:'50',outbreak_weight:'0'});Object.assign(weighted.request.items[0],{revenue_score:'100',growth_score:'0',outbreak_score:''});assert.equal(api.validatePlanningDraft(weighted,current),weighted)
const incomplete=structuredClone(weighted);incomplete.request.revenue_weight='';assert.equal(api.validatePlanningDraft(incomplete,current),incomplete)
for(const field of ['revenue_weight','growth_weight','outbreak_weight'])for(const value of [null,false,{},'Infinity','=1']){const bad=structuredClone(weighted);bad.request[field]=value;assert.throws(()=>api.validatePlanningDraft(bad,current))}
for(const field of ['revenue_score','growth_score','outbreak_score'])for(const value of [null,false,{},'Infinity','=1']){const bad=structuredClone(weighted);bad.request.items[0][field]=value;assert.throws(()=>api.validatePlanningDraft(bad,current))}
const badMethod=structuredClone(weighted);badMethod.request.allocation_method='unknown';assert.throws(()=>api.validatePlanningDraft(badMethod,current))
const shelf=structuredClone(weighted);shelf.request.items[0].shelf_life_days='0';shelf.request.items[0].policy_input_reference='Synthetic reference';assert.equal(api.validatePlanningDraft(shelf,current),shelf)
for(const value of [null,false,{},'Infinity','=1']){const bad=structuredClone(shelf);bad.request.items[0].shelf_life_days=value;assert.throws(()=>api.validatePlanningDraft(bad,current))}
for(const value of [null,false,{},'x'.repeat(201),'line\nbreak']){const bad=structuredClone(shelf);bad.request.items[0].policy_input_reference=value;assert.throws(()=>api.validatePlanningDraft(bad,current))}
const report={status:'PASS_COMPILED_PLANNING_DRAFT_VALIDATION',valid_cases:8,rejected_cases:mutations.length+71,optional_policy_fields:true,weighted_fields:true,shelf_and_reference_fields:true,legacy_drafts_supported:true,validation_does_not_mutate:true,scope:'isolated validator; actual browser round-trip/rejections retained separately'}
fs.writeFileSync(path.join(out,'compiled-validation.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report))
