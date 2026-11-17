import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { test } from 'node:test'
import type { Request, Response, NextFunction } from 'express'
import { currentRequestSignal, recordRequestMetric, requestContextMiddleware, withRequestSignal, withoutRequestCancellation } from '../src/requestContext'

function enter(work: (request: EventEmitter, response: EventEmitter & { writableEnded: boolean }, headers: Map<string, unknown>, sent: unknown[]) => Promise<void>) {
  const request = Object.assign(new EventEmitter(), { method: 'GET', route: { path: '/api/scoped/:id' } })
  const headers = new Map<string, unknown>(), sent: unknown[] = []
  const response = Object.assign(new EventEmitter(), { writableEnded: false, headersSent: false, statusCode: 200,
    setHeader: (name: string, value: unknown) => { headers.set(name, value) },
    json: (body: unknown) => { sent.push(body); return response } })
  return new Promise<void>((resolve, reject) => requestContextMiddleware(request as unknown as Request,
    response as unknown as Response, (() => { work(request, response, headers, sent).then(resolve, reject) }) as NextFunction))
}

test('request counters and signals remain isolated across concurrent async callers', async () => {
  let release!: () => void
  const wait = new Promise<void>(resolve => { release = resolve })
  let firstId: unknown
  await Promise.all([
    enter(async (_req, res, headers) => {
      firstId = headers.get('X-Request-ID')
      recordRequestMetric('warehouseStatements', 2)
      await wait
      ;(res as unknown as Response).json({ ok: true })
      assert.match(String(headers.get('Server-Timing')), /statements;desc="2"/)
    }),
    enter(async (_req, res, headers) => {
      recordRequestMetric('warehouseStatements', 7)
      assert.notEqual(headers.get('X-Request-ID'), firstId)
      ;(res as unknown as Response).json({ ok: true })
      assert.match(String(headers.get('Server-Timing')), /statements;desc="7"/)
      release()
    }),
  ])
  assert.equal(currentRequestSignal(), undefined)
})

test('abandoned response aborts exclusive work but not a shared-source context', async () => {
  await enter(async (_req, res) => {
    const caller = currentRequestSignal()!
    const owner = new AbortController()
    let preserved: AbortSignal | undefined
    await withRequestSignal(owner.signal, async () => {
      preserved = currentRequestSignal()
      res.emit('close')
      assert.equal(caller.aborted, true)
      assert.equal(preserved?.aborted, false)
      await withoutRequestCancellation(async () => {
        await Promise.resolve()
        assert.equal(currentRequestSignal(), undefined)
      })
      assert.equal(currentRequestSignal(), preserved)
    })
    assert.equal(currentRequestSignal(), caller)
  })
})

test('normal completion does not abort; invalid metrics cannot enter timing headers', async () => {
  await enter(async (req, res, headers, sent) => {
    const signal = currentRequestSignal()!
    recordRequestMetric('warehouseMs', 12.125)
    for (const value of [NaN, Infinity, -1]) recordRequestMetric('warehouseMs', value)
    recordRequestMetric('queueWaitMs', 3.5)
    ;(res as unknown as Response).json({ value: 0, absent: null })
    assert.deepEqual(sent, [{ value: 0, absent: null }])
    assert.match(String(headers.get('Server-Timing')), /warehouse;dur=12.125/)
    assert.match(String(headers.get('Server-Timing')), /queue;dur=3.500/)
    assert.doesNotMatch(String(headers.get('Server-Timing')), /NaN|Infinity/)
    res.writableEnded = true
    res.emit('finish')
    res.emit('close')
    req.emit('aborted')
    assert.equal(signal.aborted, false)
  })
})

test('request abort propagates and helpers outside HTTP context are harmless', async () => {
  recordRequestMetric('warehouseStatements')
  assert.equal(withoutRequestCancellation(() => 4), 4)
  await enter(async (req) => {
    const signal = currentRequestSignal()!
    req.emit('aborted')
    assert.equal(signal.aborted, true)
  })
})

test('disconnect metrics are emitted once and contain no request queries or bodies',async()=>{
  const previous=process.env.GATEWAY_REQUEST_METRICS
  const info=console.info,events:Record<string,unknown>[]=[]
  process.env.GATEWAY_REQUEST_METRICS='1'
  console.info=(line:string)=>{events.push(JSON.parse(line))}
  try {
    await enter(async(req,res)=>{
      Object.assign(req,{url:'/api/scoped/private?secret=synthetic',body:{password:'synthetic'}})
      recordRequestMetric('cacheSharedLoads')
      req.emit('aborted');res.emit('close')
    })
    assert.equal(events.length,1)
    assert.equal(events[0].event,'gateway_request_aborted')
    assert.equal(events[0].route,'/api/scoped/:id')
    assert.equal(events[0].cacheSharedLoads,1)
    assert.doesNotMatch(JSON.stringify(events),/private|secret|password|synthetic/)
  } finally {
    console.info=info
    if(previous===undefined)delete process.env.GATEWAY_REQUEST_METRICS;else process.env.GATEWAY_REQUEST_METRICS=previous
  }
})
