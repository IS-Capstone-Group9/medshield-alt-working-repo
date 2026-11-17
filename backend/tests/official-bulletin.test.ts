import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import {OFFICIAL_BULLETIN, buildExternalContext} from '../src/externalContext'

test('compiled context markup and CSV retain unavailable official status even with a claimed proxy alert',()=>{
  const file=readFileSync('../frontend/services/api/external-regression-runtime.ts','utf8')
  const module={exports:{} as Record<string,string>}
  vm.runInNewContext(ts.transpileModule(file,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,
    {module,exports:module.exports})
  assert.match(module.exports.EXTERNAL_REGRESSION_MARKUP,/id="officialBulletinStatus" role="status" data-status="OFFICIAL_LIVE_BULLETIN_UNAVAILABLE"/)
  assert.match(module.exports.EXTERNAL_REGRESSION_MARKUP,/Official live bulletin unavailable/)
  const context=buildExternalContext([{period:'2025-01',sales:'10'}],[],
    {mode:'rainfall',disease:'Dengue',provider:'NASA POWER',lag:1,rainfallLag:1,metric:'revenue'})
  assert.deepEqual(context.official_bulletin,OFFICIAL_BULLETIN)
  let csvBlob:Blob|undefined
  const nodes:Record<string,any>={}
  const sandbox:any={Blob,URL:{createObjectURL:(blob:Blob)=>{csvBlob=blob;return 'blob:fixture'},revokeObjectURL:()=>{}},
    document:{createElement:()=>({click:()=>{}})},setTimeout:()=>{},Chart:function(){},
    el:(id:string)=>nodes[id]??=( {} )}
  vm.createContext(sandbox)
  vm.runInContext(module.exports.EXTERNAL_REGRESSION_SCRIPT,sandbox)
  sandbox.fixture={scope:{sector:'Private',territory:'Quezon',product:''},context:{...context,official_bulletin:{available:true,official_alert:true}},sales_source:{release:{dataset_id:'fixture',policy_version:'fixture'}}}
  vm.runInContext('externalRegressionData=fixture;exportExternalContextCSV()',sandbox)
  return csvBlob!.text().then(csv=>{
    assert.match(csv,/official_bulletin_status/)
    assert.match(csv,/"OFFICIAL_LIVE_BULLETIN_UNAVAILABLE","false"/)
  })
})
