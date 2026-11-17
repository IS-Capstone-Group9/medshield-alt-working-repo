import assert from 'node:assert/strict'
import { test } from 'node:test'
import { EventEmitter } from 'node:events'
import type { Request, Response as ExpressResponse, NextFunction } from 'express'
import { DatabricksRuntimeError, OperationDeadline, StatementAdmission, isSafelyCancellableRead, type RuntimeClock } from '../src/databricksRuntime'
import { createDatabricksStatementExecutor } from '../src/databricks'
import { requestContextMiddleware } from '../src/requestContext'

class FakeClock implements RuntimeClock {
  time = 0
  private sequence = 0
  private jobs = new Map<number, { at: number; callback: () => void }>()
  now = () => this.time
  setTimeout = (callback: () => void, milliseconds: number) => {
    const id = ++this.sequence
    this.jobs.set(id, { at: this.time + milliseconds, callback })
    return id as unknown as ReturnType<typeof setTimeout>
  }
  clearTimeout = (timer: ReturnType<typeof setTimeout>) => { this.jobs.delete(timer as unknown as number) }
  async flush() { for (let i = 0; i < 25; i++) await Promise.resolve() }
  async tick(milliseconds: number) {
    const target = this.time + milliseconds
    while (true) {
      const next = [...this.jobs].sort((a, b) => a[1].at-b[1].at || a[0]-b[0])[0]
      if (!next || next[1].at > target) break
      this.time = next[1].at
      this.jobs.delete(next[0])
      next[1].callback()
      await this.flush()
    }
    this.time = target
    await this.flush()
  }
  get timers() { return this.jobs.size }
}

test('only conservatively recognized reads can receive automatic SQL cancellation', () => {
  for (const sql of ['SELECT 1', '  -- read only\n SELECT * FROM fact;', '/* scope */\nDESCRIBE HISTORY fact LIMIT 1', 'SHOW TABLES'])
    assert.equal(isSafelyCancellableRead(sql), true, sql)
  for (const sql of ['INSERT INTO fact SELECT 1', 'CREATE TABLE fact AS SELECT 1', 'MERGE INTO fact USING source',
    'WITH source AS (SELECT 1) SELECT * FROM source', 'SELECT 1; DELETE FROM fact', 'SET x=1',
    "SELECT 'DELETE' AS conservative_literal", 'EXPLAIN DELETE FROM fact'])
    assert.equal(isSafelyCancellableRead(sql), false, sql)
})

test('one deadline includes all awaited stages and rejects an abort-ignoring dependency on time', async () => {
  const clock = new FakeClock(), operation = new OperationDeadline(100, clock)
  let finish!: (value: string) => void
  const waiting = operation.run(() => new Promise<string>(resolve => { finish = resolve }))
  const rejected = assert.rejects(waiting, (error: any) => error.code === 'DATABRICKS_DEADLINE_EXCEEDED')
  await clock.tick(100)
  await rejected
  assert.equal(clock.time, 100)
  finish('late result')
  await clock.flush()
  assert.throws(() => operation.check(), DatabricksRuntimeError)
  operation.dispose()
  assert.equal(clock.timers, 0)
})

test('caller cancellation stops a poll sleep and clears its timer', async () => {
  const clock = new FakeClock(), caller = new AbortController(), operation = new OperationDeadline(1000, clock, caller.signal)
  const rejected = assert.rejects(operation.sleep(750), (error: any) => error.code === 'DATABRICKS_ABORTED')
  caller.abort(new Error('private reason must not be echoed'))
  await rejected
  operation.dispose()
  assert.equal(clock.timers, 0)
})

test('shared FIFO admission bounds active/queued work and rejects overload without occupying a slot', async () => {
  const clock = new FakeClock(), admission = new StatementAdmission(1, 1, 100, clock)
  const operations = Array.from({ length: 3 }, () => new OperationDeadline(1000, clock))
  const release = await admission.acquire(operations[0])
  const next = admission.acquire(operations[1])
  await assert.rejects(admission.acquire(operations[2]), (error: any) => error.code === 'DATABRICKS_QUEUE_FULL')
  assert.deepEqual(admission.counts, { active: 1, queued: 1 })
  release(); release()
  const releaseNext = await next
  assert.deepEqual(admission.counts, { active: 1, queued: 0 })
  releaseNext()
  assert.deepEqual(admission.counts, { active: 0, queued: 0 })
  operations.forEach(op => op.dispose())
})

test('queue timeout, queued abort and operation deadline remove waiters and preserve subsequent capacity', async () => {
  const clock = new FakeClock(), admission = new StatementAdmission(1, 3, 100, clock)
  const first = new OperationDeadline(1000, clock), release = await admission.acquire(first)
  const queued = new OperationDeadline(1000, clock)
  const timeout = assert.rejects(admission.acquire(queued), (error: any) => error.code === 'DATABRICKS_QUEUE_TIMEOUT')
  await clock.tick(100); await timeout
  assert.deepEqual(admission.counts, { active: 1, queued: 0 })
  const caller = new AbortController(), aborted = new OperationDeadline(1000, clock, caller.signal)
  const denied = assert.rejects(admission.acquire(aborted), (error: any) => error.code === 'DATABRICKS_ABORTED')
  caller.abort(); await denied
  const short = new OperationDeadline(50, clock)
  const deadline = assert.rejects(admission.acquire(short), (error: any) => error.code === 'DATABRICKS_DEADLINE_EXCEEDED')
  await clock.tick(50); await deadline
  release()
  assert.deepEqual(admission.counts, { active: 0, queued: 0 })
  for (const op of [first, queued, aborted, short]) op.dispose()
  assert.equal(clock.timers, 0)
})

function providerResponse(payload: unknown): Response {
  return { ok: true, status: 200, json: async () => payload } as Response
}

function success(data = [['value']], total = data.length, next?: string) {
  return { statement_id: 'owned', status: { state: 'SUCCEEDED' },
    manifest: { total_row_count: total, schema: { columns: [{ name: 'result', position: 0 }] } },
    result: { data_array: data, ...(next ? { next_chunk_internal_link: next } : {}) } }
}

function executor(clock: FakeClock, send: typeof fetch, admission = new StatementAdmission(2, 4, 10000, clock)) {
  return { execute: createDatabricksStatementExecutor({ clock, fetch: send, admission,
    configuration: () => ({ host: 'https://warehouse.fixture.invalid', token: 'synthetic-only',
      warehouseId: 'synthetic-warehouse', catalog: 'workspace', schema: 'medshield_gold' }) }), admission }
}

const connectTimeout = () => new TypeError('synthetic connection failure', {cause:{code:'UND_ERR_CONNECT_TIMEOUT'}})

test('one connection-establishment retry recovers a safe read and is visible in request metrics',async()=>{
  const clock=new FakeClock();let calls=0
  const {execute,admission}=executor(clock,(async()=>{
    if(++calls===1)throw connectTimeout()
    return providerResponse(success([['0']]))
  }) as typeof fetch)
  await inRequest(async(_res,headers)=>{
    const pending=execute('SELECT 0')
    await clock.flush();await clock.tick(100)
    assert.deepEqual((await pending).rows,[{result:'0'}])
    ;(_res as unknown as ExpressResponse).json({ok:true})
    assert.match(String(headers.get('Server-Timing')),/connectretry;desc="1"/)
  })
  assert.equal(calls,2)
  assert.deepEqual(admission.counts,{active:0,queued:0})
  assert.equal(clock.timers,0)
})

test('retry is capped; mutations, uncertain reads, resets and HTTP outages never receive a retry',async()=>{
  for(const [sql,kind,expected] of [
    ['SELECT 1','connect',2],['INSERT INTO fact VALUES (1)','connect',1],
    ['WITH x AS (SELECT 1) SELECT * FROM x','connect',1],['SELECT 1','reset',1],['SELECT 1','http',1],
  ] as const){
    const clock=new FakeClock();let calls=0
    const {execute}=executor(clock,(async()=>{
      calls++
      if(kind==='http')return {ok:false,status:503,json:async()=>({})} as Response
      if(kind==='reset')throw new TypeError('synthetic reset',{cause:{code:'ECONNRESET'}})
      throw connectTimeout()
    }) as typeof fetch)
    const denied=assert.rejects(execute(sql))
    await clock.flush();await clock.tick(100);await denied
    assert.equal(calls,expected,sql+' '+kind)
    assert.equal(clock.timers,0)
  }
})

test('retry backoff cannot extend the original deadline or ignore a caller abort',async()=>{
  for(const cancel of [false,true]){
    const clock=new FakeClock(),controller=new AbortController();let calls=0
    const {execute,admission}=executor(clock,(async()=>{
      calls++
      if(!cancel)await new Promise(resolve=>clock.setTimeout(resolve,4900))
      throw connectTimeout()
    }) as typeof fetch)
    const denied=assert.rejects(execute('SELECT 1',{timeoutMs:5000,signal:controller.signal}),
      (error:any)=>error.code===(cancel?'DATABRICKS_ABORTED':'DATABRICKS_DEADLINE_EXCEEDED'))
    await clock.flush()
    if(cancel)controller.abort()
    await clock.tick(cancel?100:5000);await denied
    assert.equal(calls,1)
    assert.deepEqual(admission.counts,{active:0,queued:0})
    assert.equal(clock.timers,0)
  }
})

test('actual executor shares one deadline across initial submission and poll sleeps with best-effort owned read cancel', async () => {
  const clock = new FakeClock(), calls: Array<{ url: string; at: number }> = []
  const send = (async (url: string | URL | Request) => {
    calls.push({ url: String(url), at: clock.time })
    if (String(url).endsWith('/cancel')) return providerResponse({})
    await new Promise<void>(resolve => clock.setTimeout(resolve, 2000))
    return providerResponse({ statement_id: 'owned', status: { state: 'RUNNING' } })
  }) as typeof fetch
  const { execute, admission } = executor(clock, send)
  const rejected = assert.rejects(execute('SELECT 1', { timeoutMs: 5000 }), (error: any) => error.code === 'DATABRICKS_DEADLINE_EXCEEDED')
  await clock.flush(); await clock.tick(5000); await rejected
  assert.deepEqual(calls.map(call => call.at), [0, 2750, 5000])
  assert.ok(calls[2].url.endsWith('/owned/cancel'))
  assert.deepEqual(admission.counts, { active: 0, queued: 0 })
  await clock.tick(10000)
  assert.equal(calls.length, 3, 'no late polls after expiry')
  assert.equal(clock.timers, 0)
})

test('chunk response/body processing shares the submission deadline and never cancels completed SQL', async () => {
  const clock = new FakeClock(), calls: string[] = []
  const send = (async (url: string | URL | Request) => {
    calls.push(String(url))
    if (calls.length === 1) return providerResponse(success([['one']], 4))
    await new Promise<void>(resolve => clock.setTimeout(resolve, 3000))
    return providerResponse({ data_array: [['next']] })
  }) as typeof fetch
  const { execute, admission } = executor(clock, send)
  const rejected = assert.rejects(execute('SELECT result FROM fact', { timeoutMs: 5000 }), (error: any) => error.code === 'DATABRICKS_DEADLINE_EXCEEDED')
  await clock.flush(); await clock.tick(5000); await rejected
  assert.equal(calls.length, 3)
  assert.ok(calls.every(url => !url.endsWith('/cancel')))
  assert.deepEqual(admission.counts, { active: 0, queued: 0 })
  await clock.tick(10000)
  assert.equal(calls.length, 3, 'late chunk completion cannot schedule another chunk')
})

test('unresponsive response body cannot exceed the deadline or retain capacity', async () => {
  const clock = new FakeClock()
  const { execute, admission } = executor(clock, (async () => ({ ok: true, status: 200,
    json: () => new Promise(() => undefined) }) as Response) as typeof fetch)
  const rejected = assert.rejects(execute('SELECT 1', { timeoutMs: 5000 }), (error: any) => error.code === 'DATABRICKS_DEADLINE_EXCEEDED')
  await clock.flush(); await clock.tick(5000); await rejected
  assert.deepEqual(admission.counts, { active: 0, queued: 0 })
})

test('all direct executor readers share configured admission, overload fails, and queue time counts toward deadline', async () => {
  const clock = new FakeClock(), pending: Array<(response: Response) => void> = []
  const admission = new StatementAdmission(1, 1, 10000, clock)
  let submissions = 0
  const { execute } = executor(clock, (async () => {
    submissions++
    return new Promise<Response>(resolve => pending.push(resolve))
  }) as typeof fetch, admission)
  const first = execute('SELECT financial_source', { timeoutMs: 60000 })
  await clock.flush()
  const second = assert.rejects(execute('DESCRIBE HISTORY research_source', { timeoutMs: 5000 }),
    (error: any) => error.code === 'DATABRICKS_DEADLINE_EXCEEDED')
  await assert.rejects(execute('SHOW TABLES'), (error: any) => error.code === 'DATABRICKS_QUEUE_FULL')
  await clock.tick(5000); await second
  assert.equal(submissions, 1, 'expired queue entry never submits SQL')
  assert.deepEqual(admission.counts, { active: 1, queued: 0 })
  pending[0](providerResponse(success()))
  assert.deepEqual(await first, { columns: ['result'], rows: [{ result: 'value' }] })
  assert.deepEqual(admission.counts, { active: 0, queued: 0 })
})

test('caller abort cancels known running SELECT only; mutation, generic WITH and explicit never policy retain operator semantics', async () => {
  for (const [sql, cancellation, shouldCancel] of [
    ['SELECT 1', undefined, true], ['SELECT 1', 'never', false],
    ['INSERT INTO fact SELECT 1', undefined, false], ['WITH data AS (SELECT 1) SELECT * FROM data', undefined, false],
  ] as const) {
    const clock = new FakeClock(), controller = new AbortController(), calls: string[] = []
    const { execute, admission } = executor(clock, (async (url: string | URL | Request) => {
      calls.push(String(url))
      return providerResponse(String(url).endsWith('/cancel') ? {} : { statement_id: 'owned', status: { state: 'RUNNING' } })
    }) as typeof fetch)
    const rejected = assert.rejects(execute(sql, { signal: controller.signal, cancellation }),
      (error: any) => error.code === 'DATABRICKS_ABORTED')
    await clock.flush(); controller.abort(); await rejected; await clock.flush()
    assert.equal(calls.filter(url => url.endsWith('/cancel')).length, shouldCancel ? 1 : 0, sql)
    assert.deepEqual(admission.counts, { active: 0, queued: 0 })
    await clock.tick(10000)
    assert.equal(calls.filter(url => !url.endsWith('/cancel')).length, 1)
  }
})

test('pre-aborted callers submit nothing and failed cancellation is bounded without masking original abort', async () => {
  const clock = new FakeClock(), calls: string[] = [], controller = new AbortController()
  const { execute, admission } = executor(clock, (async (url: string | URL | Request) => {
    calls.push(String(url))
    if (String(url).endsWith('/cancel')) throw Error('synthetic provider cancellation denial')
    return providerResponse({ statement_id: 'owned', status: { state: 'RUNNING' } })
  }) as typeof fetch)
  const before = new AbortController(); before.abort()
  await assert.rejects(execute('SELECT 1', { signal: before.signal }), (error: any) => error.code === 'DATABRICKS_ABORTED')
  assert.equal(calls.length, 0)
  const rejected = assert.rejects(execute('SELECT 1', { signal: controller.signal }), (error: any) => error.code === 'DATABRICKS_ABORTED')
  await clock.flush(); controller.abort(); await rejected; await clock.flush()
  assert.equal(calls.length, 2)
  assert.deepEqual(admission.counts, { active: 0, queued: 0 })
  assert.equal(clock.timers, 0)
})

test('manifest bounds and same-origin chunk validation prevent excess/truncated reads and credential forwarding', async () => {
  for (const payload of [success([['one']], 2, 'https://unexpected.fixture.invalid/result'),
    { ...success(), manifest: { ...success().manifest, truncated: true } }, success([['one']], 50001)]) {
    const clock = new FakeClock(); let requests = 0
    const { execute, admission } = executor(clock, (async () => { requests++; return providerResponse(payload) }) as typeof fetch)
    await assert.rejects(execute('SELECT 1'), /chunk|limit|manifest|truncated/i)
    assert.equal(requests, 1)
    assert.deepEqual(admission.counts, { active: 0, queued: 0 })
  }
})

function inRequest(work: (response: EventEmitter & { writableEnded: boolean }, headers: Map<string, unknown>) => Promise<void>) {
  const request = Object.assign(new EventEmitter(), { method: 'GET', route: { path: '/fixture' } })
  const headers = new Map<string, unknown>()
  const response = Object.assign(new EventEmitter(), { writableEnded: false, headersSent: false, statusCode: 200,
    setHeader: (name: string, value: unknown) => headers.set(name, value), json: (_body: unknown) => response })
  return new Promise<void>((resolve, reject) => requestContextMiddleware(request as unknown as Request,
    response as unknown as ExpressResponse, (() => { work(response, headers).then(resolve, reject) }) as NextFunction))
}

test('exclusive executor inherits actual HTTP context cancellation and records safe timing counters', async () => {
  const clock = new FakeClock(), calls: string[] = []
  const { execute } = executor(clock, (async (url: string | URL | Request) => {
    calls.push(String(url))
    return providerResponse(String(url).endsWith('/cancel') ? {} : { statement_id: 'owned', status: { state: 'RUNNING' } })
  }) as typeof fetch)
  await inRequest(async (response, headers) => {
    const failed = assert.rejects(execute('SELECT 1'), (error: any) => error.code === 'DATABRICKS_ABORTED')
    await clock.flush(); await clock.tick(100)
    response.emit('close')
    await failed; await clock.flush()
    ;(response as unknown as ExpressResponse).json({ unavailable: true })
    assert.match(String(headers.get('Server-Timing')), /statements;desc="1"/)
    assert.match(String(headers.get('Server-Timing')), /warehouse;dur=100.000/)
    assert.ok(calls[1].endsWith('/cancel'))
  })
})

test('HTTP disconnect leaves an already submitted mutation under its own deadline', async () => {
  const clock = new FakeClock()
  let complete!: (response: Response) => void
  let submittedSignal: AbortSignal | null | undefined
  const { execute, admission } = executor(clock, (async (_url, init) => {
    submittedSignal = init?.signal
    return new Promise<Response>(resolve => { complete = resolve })
  }) as typeof fetch)
  await inRequest(async response => {
    const result = execute('INSERT INTO fact SELECT 1')
    await clock.flush()
    response.emit('close')
    assert.equal(submittedSignal?.aborted, false)
    complete(providerResponse({ statement_id: 'owned', status: { state: 'SUCCEEDED' }, manifest: { total_row_count: 0 } }))
    assert.deepEqual(await result, { columns: [], rows: [] })
    assert.equal(admission.counts.active, 0)
  })
})

test('actual shared pinned and research validation promises survive one HTTP caller leaving', async () => {
  const names = ['DATABRICKS_HOST', 'DATABRICKS_TOKEN', 'DATABRICKS_SQL_WAREHOUSE_ID',
    'DATABRICKS_DESCRIPTIVE_ADAPTER', 'DATABRICKS_DESCRIPTIVE_FACT_VERSION', 'DATABRICKS_RESEARCH_FACT_VERSION']
  const saved = Object.fromEntries(names.map(name => [name, process.env[name]]))
  const originalFetch = globalThis.fetch
  process.env.DATABRICKS_HOST = 'https://shared.fixture.invalid'
  process.env.DATABRICKS_TOKEN = 'synthetic-only'
  process.env.DATABRICKS_SQL_WAREHOUSE_ID = 'synthetic-warehouse'
  delete process.env.DATABRICKS_DESCRIPTIVE_ADAPTER
  process.env.DATABRICKS_DESCRIPTIVE_FACT_VERSION = '15'
  process.env.DATABRICKS_RESEARCH_FACT_VERSION = '15'
  try {
    const { descriptiveRelease } = await import('../src/databricksDashboard')
    const { researchRelease } = await import('../src/descriptiveSource')
    for (const reader of [descriptiveRelease, researchRelease]) {
      let finish!: (response: Response) => void, started!: () => void
      const began = new Promise<void>(resolve => { started = resolve })
      let signal: AbortSignal | null | undefined, requests = 0
      globalThis.fetch = (async (_url, init) => {
        requests++; signal = init?.signal; started()
        return new Promise<Response>(resolve => { finish = resolve })
      }) as typeof fetch
      const first = inRequest(async response => {
        const shared = reader()
        await began
        response.emit('close')
        await shared
      })
      await began
      const second = inRequest(async () => {
        const shared = reader()
        const row = { dataset_id: 'shared-validation', policy_version: 'legacy', area_mapping_sha256: 'fixture-area',
          product_master_sha256: 'fixture-master', publication_status: 'CANDIDATE' }
        finish(providerResponse({ statement_id: 'validation', status: { state: 'SUCCEEDED' },
          manifest: { total_row_count: 1, schema: { columns: Object.keys(row).map((name, position) => ({ name, position })) } },
          result: { data_array: [Object.values(row)] } }))
        assert.equal((await shared).dataset_id, 'shared-validation')
      })
      await Promise.all([first, second])
      assert.equal(signal?.aborted, false, 'global shared source owns its signal/deadline')
      assert.equal(requests, 1, 'both callers share one source validation')
    }
  } finally {
    globalThis.fetch = originalFetch
    for (const name of names) saved[name] === undefined ? delete process.env[name] : process.env[name] = saved[name]
  }
})
