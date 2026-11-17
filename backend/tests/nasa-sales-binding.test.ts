import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import test from 'node:test'
import ts from 'typescript'

function reader(options:{missing?:boolean;unavailable?:boolean}={}) {
  const source=readFileSync(resolve(__dirname,'../src/databricksDashboard.ts'),'utf8')
  const body=source.slice(source.indexOf('async function getNasaPowerWeatherEffects('),source.indexOf('async function getOpenMeteoWeatherEffects('))
  const compiled=ts.transpileModule(body,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText
  const statements:string[]=[]
  const release={dataset_id:'accepted-source',financial_publication:{status:'approved',serving_table:'approved-financial-fact'}}
  const execute=async(sql:string)=>{
    if(!sql.startsWith('SHOW TABLES'))throw new Error('Bypassed descriptive source resolver: '+sql.slice(0,80))
    return {rows:options.missing?[]:[{tableName:'vw_weather_nasa_power_monthly_candidate'}]}
  }
  const query=async(sql:string)=>{
    statements.push(sql)
    if(options.unavailable)throw new Error('Required approved source unavailable')
    assert.match(sql,/__MEDSHIELD_DESCRIPTIVE_FACT__/)
    assert.match(sql,/weather\.territory = 'Quezon'/)
    return [{period:'2025-01',territory:'Quezon',provider:'nasa_power',rainfall_mm:'25',rainy_days:'2',avg_temperature_c:'28',avg_relative_humidity_pct:'80',max_wind_speed_kph:'10',rainfall_severity_proxy:'0',weather_alert_level:'normal',sales_revenue:'123.45',fetched_at:'2026-10-01'}]
  }
  const get=new Function('executeDatabricksStatement','query','FACT','OBSERVED_FACT','NASA_WEATHER','sqlString','nullableNumber','pearsonCorrelation','DatabricksSourceUnavailableError','activeRelease',compiled+';return getNasaPowerWeatherEffects')(
    execute,query,'__MEDSHIELD_DESCRIPTIVE_FACT__','is_analysis_candidate=TRUE','NASA_MONTHLY',(s:string)=>`'${s}'`,(v:unknown)=>v==null?null:Number(v),()=>null,Error,release)
  return {get,statements}
}
test('NASA comparison uses the shared descriptive query resolver and preserves proxy limits',async()=>{
  const r=reader(),value=await r.get('all','Quezon')
  assert.equal(r.statements.length,1)
  assert.equal(value.rows[0].sales_revenue,123.45)
  assert.equal(value.metadata.release.financial_publication.status,'approved')
  assert.equal(value.metadata.is_forecast_eligible,false)
  assert.match(value.metadata.interpretation,/historical grid proxy/)
})
test('NASA comparison source failure remains explicit without substitute sales',async()=>{
  await assert.rejects(reader({unavailable:true}).get('all','Quezon'),/Required approved source unavailable/)
})
test('absent NASA publication returns not-refreshed rather than invented observations',async()=>{
  const r=reader({missing:true}),value=await r.get('all','Quezon')
  assert.equal(value.metadata.status,'not_refreshed');assert.deepEqual(value.rows,[]);assert.equal(r.statements.length,0)
})
