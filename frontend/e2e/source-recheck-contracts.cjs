// Actual compiled source-page interaction; no browser/session or remote writes.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),ts=require('../node_modules/typescript')
const root=path.resolve(__dirname,'../..'),api={},markup={}
let reloads=0,fail=false
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,'frontend/services/api/source-recheck.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:api,window:{location:{reload(){reloads++;if(fail)throw Error('Blocked navigation')}}}})
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,'frontend/services/api/dashboard-markup.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:markup})
const status={textContent:'Candidate · Approval pending'},button={disabled:false,addEventListener(type,fn){this.listener=fn}},listeners=[]
api.installSourceRecheck({querySelector:id=>id==='#sourceRecheck'?button:status},listeners)
button.listener();button.listener()
assert.equal(reloads,1);assert.equal(button.disabled,true);assert.match(status.textContent,/reloading/)
assert.equal(listeners[0].target,button);assert.equal(listeners[0].listener,button.listener)
button.disabled=false;fail=true;button.listener()
assert.equal(button.disabled,false);assert.match(status.textContent,/Could not reload/)
api.installSourceRecheck({querySelector:()=>null},[])
assert.match(markup.DATABRICKS_SOURCE_PAGE,/aria-describedby="sourceRecheckHelp"/)
assert.match(markup.DATABRICKS_SOURCE_PAGE,/Direct dashboard uploads are unavailable/)
assert.match(markup.DATABRICKS_SOURCE_PAGE,/Pipeline checks do not grant business approval/)
assert.ok(!/<input[^>]+type="file"/.test(markup.DATABRICKS_SOURCE_PAGE))
console.log('PASS_SOURCE_RECHECK: one reload, pending lock, failure recovery, disposal registration, controlled-ingestion and approval labels')
