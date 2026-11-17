import test from 'node:test'
import assert from 'node:assert/strict'
import {fork,type ChildProcess} from 'node:child_process'
import {createServer} from 'node:net'
import {cp,mkdtemp,mkdir,readFile,writeFile,symlink,unlink,rm,lstat,realpath} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import os from 'node:os'
import path from 'node:path'
import {setTimeout as delay} from 'node:timers/promises'
const digest=(raw:Uint8Array)=>createHash('sha256').update(raw).digest('hex')
/** Four actual Express processes in a bounded secret-free scratch copy; never touches the live services. */
test('regional PHP code upgrade, rollback and reapply preserve existing protected routes without external writes',async t=>{
 const repo=path.resolve(__dirname,'../..'),workspace=await mkdtemp(path.join(os.tmpdir(),'medshield-code-rollback-'))
 const backend=path.join(workspace,'backend'),src=path.join(backend,'src'),modules=path.join(backend,'node_modules')
 assert.ok(path.isAbsolute(workspace)&&workspace.startsWith(path.resolve(os.tmpdir())+path.sep+'medshield-code-rollback-'))
 await mkdir(backend,{recursive:true});await cp(path.join(repo,'backend/src'),src,{recursive:true})
 await mkdir(path.join(backend,'tests/fixtures'),{recursive:true})
 await cp(path.join(repo,'backend/tests/fixtures/role-gateway-fixture.cjs'),path.join(backend,'tests/fixtures/role-gateway-fixture.cjs'))
 await cp(path.join(repo,'backend/tsconfig.json'),path.join(backend,'tsconfig.json'))
 await cp(path.join(repo,'backend/package.json'),path.join(backend,'package.json'))
 await cp(path.join(repo,'config'),path.join(workspace,'config'),{recursive:true})
 await symlink(path.join(repo,'backend/node_modules'),modules,'junction')
 const envFile=path.join(workspace,'empty.env');await writeFile(envFile,'')
 let child:ChildProcess|undefined
 t.after(async()=>{
  if(child&&child.exitCode===null)await new Promise<void>(resolve=>{child!.once('exit',()=>resolve());child!.kill()})
  assert.equal(await realpath(workspace),workspace)
  assert.ok(workspace.startsWith(path.resolve(os.tmpdir())+path.sep+'medshield-code-rollback-'))
  assert.ok((await lstat(modules)).isSymbolicLink());await unlink(modules)
  await rm(workspace,{recursive:true,force:true})
 })
 const current=await readFile(path.join(src,'server.ts'))
 // A controlled rollback reverses precisely the additive route/import, preserving every other dirty source byte.
 const text=current.toString('utf8'),newline=text.includes('\r\n')?'\r\n':'\n'
 const normalized=text.replace(/\r\n/g,'\n'),start=normalized.indexOf("app.get('/api/sales/regional-php-research'"),end=normalized.indexOf("app.get('/api/sales/tournament-research'",start)
 assert.ok(start>0&&end>start)
 const baseline=Buffer.from((normalized.slice(0,start)+normalized.slice(end)).replace("import { readRegionalForecastResearch } from './regionalForecastResearch'\n",'').replace(/\n/g,newline),'utf8')
 assert.notEqual(digest(current),digest(baseline))
 const observations:Array<Record<string,unknown>>=[]
 for(const [phase,bytes,available] of [['baseline',baseline,false],['upgrade',current,true],['rollback',baseline,false],['reapply',current,true]] as const){
  await writeFile(path.join(src,'server.ts'),bytes);assert.equal(digest(await readFile(path.join(src,'server.ts'))),digest(bytes))
  const listener=createServer();await new Promise<void>(r=>listener.listen(0,'127.0.0.1',r));const address=listener.address();assert.ok(address&&typeof address!=='string');const port=address.port;await new Promise<void>(r=>listener.close(()=>r()))
  child=fork(path.join(backend,'tests/fixtures/role-gateway-fixture.cjs'),[],{cwd:backend,execArgv:['--import','tsx'],silent:true,env:{...process.env,NODE_ENV:'production',USE_SUPABASE:'true',PORT:String(port),MEDSHIELD_ENV_FILE:envFile,MEDSHIELD_AUDIT_LOG_PATH:path.join(workspace,'audit.jsonl'),SUPABASE_URL:'https://identity.fixture.invalid',SUPABASE_ANON_KEY:'synthetic-publishable',SUPABASE_SECRET_KEY:'sb_secret_synthetic_fixture',SUPABASE_SERVICE_ROLE_KEY:'',DATABRICKS_HOST:'',DATABRICKS_TOKEN:'',DATABRICKS_SQL_WAREHOUSE_ID:''}})
  let stderr='';child.stderr?.on('data',b=>{stderr=(stderr+b.toString()).slice(-1600)})
  const base='http://127.0.0.1:'+port
  let ready=false
  for(let i=0;i<150;i++){assert.equal(child.exitCode,null,stderr);try{if((await fetch(base+'/api/health')).ok){ready=true;break}}catch{}await delay(30)}
  assert.ok(ready,'Scratch gateway must start')
  for(const actor of ['admin','viewer']){
   const headers={authorization:'Bearer synthetic-role-'+actor}
   const old=await fetch(base+'/api/sales/tournament-research',{headers});assert.equal(old.status,503);assert.equal((await old.json() as any).code,'TOURNAMENT_RESEARCH_UNAVAILABLE')
   const regional=await fetch(base+'/api/sales/regional-php-research',{headers});assert.equal(regional.status,available?503:404)
   if(available)assert.equal((await regional.json() as any).code,'REGIONAL_PHP_RESEARCH_UNAVAILABLE')
   observations.push({phase,actor,existing_route_status:old.status,regional_route_status:regional.status,server_sha256:digest(bytes)})
  }
  const denied=await fetch(base+'/api/sales/tournament-research');assert.equal(denied.status,401)
  if(available)assert.equal((await fetch(base+'/api/sales/regional-php-research')).status,401)
  const count=await new Promise<any>((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('No counters')),3000);child!.on('message',function receive(message:any){if(message?.type==='counts'){clearTimeout(timeout);child!.off('message',receive);resolve(message.counts)}});child!.send({type:'counts'})})
  for(const key of ['auditRead','auditAppend','authWrite','external'])assert.equal(count[key],0,key)
  await new Promise<void>(r=>{child!.once('exit',()=>r());child!.kill()});child=undefined
 }
 assert.equal(observations[0].server_sha256,observations[4].server_sha256)
 assert.equal(observations[2].server_sha256,observations[6].server_sha256)
 if(process.env.MEDSHIELD_ROLLBACK_RECEIPT)await writeFile(process.env.MEDSHIELD_ROLLBACK_RECEIPT,JSON.stringify({status:'PASS_ISOLATED_CODE_ROLLBACK_REAPPLY',checked_at:new Date().toISOString(),observations,baseline_sha256:digest(baseline),current_sha256:digest(current),real_external_writes:0,scope:'Actual gateway code route rollback in secret-free scratch copy; source, Gold candidates and running user services unchanged',limits:['Not a hosted deployment, data/model-pointer rollback or live identity acceptance','Native frontend rollback is not inferred from backend route rehearsal']},null,2))
})
