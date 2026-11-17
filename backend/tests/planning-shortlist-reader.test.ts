import {readFileSync} from 'node:fs'
import assert from 'node:assert/strict'
import test from 'node:test'
import ts from 'typescript'
import {createHash} from 'node:crypto'
import {planningEvidenceChecksum,PLANNING_EVIDENCE_VERSION} from '../src/planningEvidence'

const code=readFileSync('src/databricksDashboard.ts','utf8')
const body=code.slice(code.indexOf('export async function getDatabricksPlanningShortlist('),code.indexOf('export async function solveDatabricksPlanningScenario(')).replace(/^export /,'')
const ast=ts.createSourceFile('dashboard.ts',code,ts.ScriptTarget.Latest,true)
const nullable=ast.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='nullableNumber')!.getText(ast)
const compiled=ts.transpileModule(nullable+'\n'+body,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText
async function read(options:{version?:number;empty?:boolean;outage?:boolean;unknownQuantity?:boolean}={}){
  const release={source_table:'workspace.medshield_gold_source_20261022.sales_restart_fact_candidate',dataset_id:'a'.repeat(64),fact_delta_version:options.version??0,policy_version:'v8',area_mapping_sha256:'b'.repeat(64),product_master_sha256:'c'.repeat(64),publication_status:'candidate'}
  const rows=[{product:'A',revenue:'100.00',quantity:options.unknownQuantity?null:'10',observed_months:'12'},{product:'B',revenue:'50.00',quantity:options.unknownQuantity?null:'5',observed_months:'6'}]
  const query=async(sql:string)=>{if(options.outage)throw Error('warehouse unavailable');if(sql.includes('SELECT DISTINCT'))return[{territory:'Quezon'}];if(sql.includes('MAX(month_start)'))return[{period_end:options.empty?null:'2026-09'}];return rows}
  const dependencies={query,validateSector:()=>{},sectorWhereClause:()=>'',planningHistoryClause:()=>'',sqlString:(v:string)=>`'${v}'`,numberValue:Number,monthNumber:()=>0,periodName:()=> '2025-10',currentClosedMonth:()=>0,OBSERVED_FACT:'observed',FACT:'pinned_fact',activeRelease:release,planningEvidenceChecksum,PLANNING_EVIDENCE_VERSION,databricksSource:(rows:unknown,extra:object={})=>({release,checksum:createHash('sha256').update(JSON.stringify(rows)).digest('hex'),...extra})}
  const fn=new Function(...Object.keys(dependencies),compiled+';return getDatabricksPlanningShortlist')(...Object.values(dependencies))
  return {data:await fn({sector:'All',territory:'Quezon'}),rows,release}
}
test('actual shortlist reader preserves values/rank and carries scope/window/release checksum for populated and empty evidence',async()=>{
  const {data,rows,release}=await read()
  assert.equal(data.products[0].product,'A');assert.equal(data.products[0].revenue,100);assert.equal(data.products[0].revenue_share_pct,100/150*100)
  assert.equal(data.source.checksum_version,PLANNING_EVIDENCE_VERSION)
  assert.equal(data.source.checksum,planningEvidenceChecksum(release,data.scope,data.period_start,data.period_end,rows))
  const changed=(await read({version:1})).data
  assert.deepEqual(changed.products,data.products);assert.notEqual(changed.source.checksum,data.source.checksum)
  const empty=(await read({empty:true})).data
  assert.deepEqual(empty.products,[]);assert.equal(empty.source.checksum_version,PLANNING_EVIDENCE_VERSION);assert.notEqual(empty.source.checksum,data.source.checksum)
})
test('actual shortlist reader propagates required warehouse failures',async()=>{await assert.rejects(read({outage:true}),/warehouse unavailable/)})
test('unknown planning source quantity remains null instead of becoming observed zero',async()=>{
  const {data}=await read({unknownQuantity:true})
  assert.equal(data.products[0].quantity,null)
  assert.equal(data.products[0].revenue,100)
})
