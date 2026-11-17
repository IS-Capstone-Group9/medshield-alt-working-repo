import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {retentionSql,validatePlan,validateHistory} from '../scripts/repair-original-snapshot-retention'
import {ITEMIZED_PREVIEW_BINDING as binding} from '../src/itemizedPreviewBinding'
const history=[{version:'2',timestamp:'2026-10-30',operation:'COMPUTE STATS'},
  {version:'1',timestamp:'2026-10-30',operation:'SET TBLPROPERTIES'},
  {version:'0',timestamp:'2026-10-26',operation:'CREATE TABLE AS SELECT'}]
const seal=(value:object)=>({...value,plan_sha256:createHash('sha256').update(JSON.stringify(value)).digest('hex')})
const plan=()=>seal({schema_version:1 as const,table:binding.itemizedTable,dataset_id:binding.datasetId,source_version:0 as const,history,properties:[],sql:retentionSql})
test('original identity and exact allowlisted retention SQL accept a sealed plan',()=>validatePlan(plan()))
test('tampered plans or resealed changes cannot alter table, pin, identity or SQL',()=>{
  for(const change of [{table:'workspace.other.table'},{source_version:2},{dataset_id:'changed'},{sql:retentionSql+'; DROP TABLE x'}]){
    assert.throws(()=>validatePlan({...plan(),...change} as any))
    const {plan_sha256,...base}=plan();assert.throws(()=>validatePlan(seal({...base,...change}) as any))
  }
})
test('history must be complete with only reviewed metadata operations since original staging',()=>{
  validateHistory(history)
  for(const changed of [[],history.slice(0,2),[history[0],history[0],history[2]],history.map((r,i)=>i===1?{...r,operation:'WRITE'}:r),history.map((r,i)=>i===2?{...r,operation:'RESTORE'}:r)])assert.throws(()=>validateHistory(changed))
})
