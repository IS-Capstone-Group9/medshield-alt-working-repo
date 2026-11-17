import assert from 'node:assert/strict'
import {EventEmitter} from 'node:events'
import {test} from 'node:test'
import type {Request,Response as ExpressResponse,NextFunction} from 'express'
import {ORIGINAL_RESEARCH_MONTHLY_SQL,readOriginalResearchMonthly} from '../src/originalResearch'
import {requestContextMiddleware} from '../src/requestContext'

test('overlapping monthly readers survive a disconnect; success/failure are evicted before a fresh read',async()=>{
  const env={DATABRICKS_HOST:'https://monthly.fixture.invalid',DATABRICKS_TOKEN:'synthetic-only',DATABRICKS_SQL_WAREHOUSE_ID:'synthetic-id'}
  const saved=Object.fromEntries(Object.keys(env).map(key=>[key,process.env[key]]))
  const savedFetch=globalThis.fetch
  Object.assign(process.env,env)
  let release!:()=>void,started!:()=>void
  const gate=new Promise<void>(resolve=>{release=resolve})
  const began=new Promise<void>(resolve=>{started=resolve})
  let calls=0,fail=false
  globalThis.fetch=(async(_input,init)=>{
    calls++
    const body=JSON.parse(String(init?.body))
    assert.equal(body.statement,ORIGINAL_RESEARCH_MONTHLY_SQL)
    started()
    await gate
    assert.equal(init?.signal?.aborted,false)
    if(fail)return Response.json({}, {status:503})
    return Response.json({statement_id:'synthetic',status:{state:'SUCCEEDED'},
      manifest:{total_row_count:1,schema:{columns:[{name:'month',position:0},{name:'net_sales_php',position:1}]}},
      result:{data_array:[['2026-09','0.000000']]}})
  }) as typeof fetch
  const request=(abandoned=false)=>{
    const req=Object.assign(new EventEmitter(),{method:'GET',route:{path:'/fixture'}})
    const res=Object.assign(new EventEmitter(),{writableEnded:false,json(){return this},setHeader(){}})
    const result=new Promise<Awaited<ReturnType<typeof readOriginalResearchMonthly>>>((resolve,reject)=>{
      requestContextMiddleware(req as unknown as Request,res as unknown as ExpressResponse,(()=>{
        if(abandoned)req.emit('aborted')
        readOriginalResearchMonthly().then(resolve,reject)
      }) as NextFunction)
    })
    return {req,res,result}
  }
  try {
    await assert.rejects(request(true).result,/disconnected/)
    assert.equal(calls,0)
    const first=request()
    await began
    const second=request(),background=readOriginalResearchMonthly()
    first.res.emit('close')
    release()
    const [a,b,c]=await Promise.all([first.result,second.result,background])
    assert.equal(a,b)
    assert.equal(a,c)
    assert.deepEqual(a.rows,[{month:'2026-09',net_sales_php:'0.000000'}])
    assert.equal(calls,1,'three readers submit one source query')
    fail=true
    const denied=await Promise.allSettled([request().result,request().result])
    assert.ok(denied.every(row=>row.status==='rejected'&&/HTTP 503/.test(String(row.reason))))
    assert.equal(calls,2,'completed success must not substitute for a fresh source failure')
    fail=false
    await request().result
    assert.equal(calls,3,'failed read is evicted and can recover')
  } finally {
    globalThis.fetch=savedFetch
    for(const [key,value] of Object.entries(saved))if(value===undefined)delete process.env[key];else process.env[key]=value
  }
})

test('injected monthly executors stay isolated',async()=>{
  let calls=0
  const execute=async()=>({rows:[{source:String(++calls)}],columns:['source'],totalRowCount:1})
  const [a,b]=await Promise.all([readOriginalResearchMonthly(execute),readOriginalResearchMonthly(execute)])
  assert.equal(calls,2)
  assert.notEqual(a.rows[0].source,b.rows[0].source)
})
