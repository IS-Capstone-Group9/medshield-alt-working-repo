import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import test from 'node:test'
import ts from 'typescript'
import {buildHistoricalComparison} from '../src/historicalComparison'

function reader(options:{outage?:boolean;drift?:boolean;duplicate?:boolean}={}) {
  const code=readFileSync(resolve(__dirname,'../src/databricksDashboard.ts'),'utf8')
  const body=code.slice(code.indexOf('export async function getDatabricksHistoricalComparison()'),code.indexOf('export async function getDatabricksPlanningShortlist(')).replace(/^export /,'')
  const compiled=ts.transpileModule(body,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText
  const statements:string[]=[];let historyCalls=0
  const release={dataset_id:'accepted-source',fact_delta_version:0,financial_publication:{publication_id:'approved-financial',serving_table:'approved-serving',serving_version:0}}
  const execute=async(sql:string)=>{statements.push(sql);return {rows:[{version:String(options.drift&&historyCalls++>0?3:2)}]}}
  const query=async(sql:string)=>{
    statements.push(sql)
    if(sql.includes('__FACT__'))return [{period:'2024-01',value:'123.45'}]
    if(options.outage&&sql.includes('vw_external_doh'))throw Error('DOH source unavailable')
    if(sql.includes('vw_external_doh'))return [{period:'2024-01',value:'7',source_dataset_version:'DOH-v1',external_dataset_id:'doh-id'}]
    if(sql.includes('external_restart_pagasa'))return [{period:'2024-01',value:'20',station_name:'Tayabas%20Daily%20Data.csv'},...(options.duplicate?[{period:'2024-01',value:'21',station_name:'Tayabas%20Daily%20Data.csv'}]:[]),{period:'2024-01',value:'40',station_name:'Alabat%20Daily%20Data.csv'}]
    if(sql.includes('NASA'))return [{period:'2024-01',value:'25',fetched_at:'2026-09-17'}]
    throw Error('Unexpected analytical source')
  }
  const get=new Function('descriptiveRelease','executeDatabricksStatement','query','FACT','OBSERVED_FACT','NASA_WEATHER','buildHistoricalComparison','DatabricksSourceUnavailableError','checksum',compiled+';return getDatabricksHistoricalComparison')(
    async()=>release,execute,query,'__FACT__','is_analysis_candidate=TRUE','NASA',buildHistoricalComparison,Error,(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex'))
  return {get,statements}
}
test('reader retains approved financial identity, fixed pilot scope, named stations and pinned weather version',async()=>{
  const r=reader(),v=await r.get()
  assert.equal(v.release.financial_publication.publication_id,'approved-financial')
  assert.equal(v.rows.find((row:any)=>row.period==='2024-01').sales,123.45)
  assert.equal(v.rows.find((row:any)=>row.period==='2024-01').disease,7)
  assert.equal(v.sources.pagasa.version,2);assert.equal(v.external_join_approved,false);assert.equal(v.model_fit,false)
  assert.ok(r.statements.some(sql=>sql.includes('VERSION AS OF 2')&&sql.includes('Alabat%20Daily%20Data.csv')))
  assert.ok(r.statements.some(sql=>sql.includes('__FACT__')&&sql.includes("='QUEZON'")&&sql.includes("DATE '2026-01-01'")))
})
test('required source outages, version drift and duplicate station-months fail explicitly',async()=>{
  await assert.rejects(reader({outage:true}).get(),/DOH source unavailable/)
  await assert.rejects(reader({drift:true}).get(),/PAGASA changed/)
  await assert.rejects(reader({duplicate:true}).get(),/Duplicate historical tayabas/)
})
