const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),ts=require('../node_modules/typescript')
const api={}
vm.runInNewContext(ts.transpileModule(fs.readFileSync(require('node:path').join(__dirname,'../services/api/unit-research-robustness.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:api})
const errors={last_value:[0,0,9],mean_3:[2,2,2],mean_6:[4,4,4],seasonal_naive_12:[5,5,5]}
const points=Object.entries(errors).flatMap(([method,values])=>values.map((error,i)=>({method,origin:`2026-0${i+1}`,target_month:`2026-0${i+2}`,lead:1,actual:10,prediction:10+error,error})))
const before=JSON.stringify(points),result=api.researchRobustness(points,1),mean=result.rows[1]
assert.equal(mean.meanAbsoluteError,2);assert.equal(mean.betterThanLast,1);assert.equal(mean.worseThanLast,2)
assert.equal(mean.lowestAfterOmission,2);assert.equal(result.rows[0].lowestAfterOmission,1)
assert.equal(mean.omitOneMaeMin,2);assert.equal(mean.omitOneMaeMax,2);assert.equal(mean.overpredictions,3)
assert.equal(mean.worstTargets.length,3);assert.equal(JSON.stringify(points),before)
const zero=points.map(p=>({...p,error:0,prediction:p.actual}))
for(const row of api.researchRobustness(zero,1).rows){assert.equal(row.tiedWithLast,3);assert.equal(row.exactPredictions,3);assert.equal(row.lowestAfterOmission,3);assert.equal(row.omitOneMaeMax,0)}
const mutations=[p=>p.pop(),p=>p[1].origin=p[0].origin,p=>p[3].actual++,p=>p[0].error=NaN,p=>p.push({...p[0],method:'unknown'}),p=>p[0].prediction++]
for(const mutate of mutations){const bad=structuredClone(points);mutate(bad);assert.throws(()=>api.researchRobustness(bad,1))}
assert.throws(()=>api.researchRobustness(points,12));assert.throws(()=>api.researchRobustness(points.filter(p=>p.origin==='2026-01'),1))
console.log('PASS_ROBUSTNESS_HAND_CASES: influential target, ties, fixed predictions, nonmutation and eight invalid inputs')
