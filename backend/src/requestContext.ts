import { AsyncLocalStorage } from 'node:async_hooks'
import { randomUUID } from 'node:crypto'
import { performance } from 'node:perf_hooks'
import type { RequestHandler } from 'express'

export type RequestMetricName = 'warehouseStatements' | 'warehouseMs' | 'queueWaitMs' | 'cacheHits' | 'cacheMisses' | 'cacheSharedLoads' | 'connectionRetries'
type Counters = Record<RequestMetricName, number>
type Context = { requestId: string; signal: AbortSignal | undefined; counters: Counters }
const storage = new AsyncLocalStorage<Context>()

export function currentRequestSignal(): AbortSignal | undefined {
  return storage.getStore()?.signal
}

/** Shared source promises own their work; one HTTP consumer cannot cancel them. */
export function withRequestSignal<T>(signal: AbortSignal | undefined, work: () => T): T {
  const context = storage.getStore()
  if (!context) return work()
  return storage.run({ ...context, signal }, work)
}

export function withoutRequestCancellation<T>(work: () => T): T {
  return withRequestSignal(undefined, work)
}

export function recordRequestMetric(name: RequestMetricName, amount = 1): void {
  const counters = storage.getStore()?.counters
  if (counters && Object.hasOwn(counters, name) && Number.isFinite(amount) && amount >= 0) {
    counters[name] = Math.min(Number.MAX_SAFE_INTEGER, counters[name] + amount)
  }
}

/** Header/log metadata only: never includes request bodies, SQL, tokens or query strings. */
export const requestContextMiddleware: RequestHandler = (req, res, next) => {
  const controller = new AbortController()
  const context: Context = { requestId: randomUUID(), signal: controller.signal,
    counters: { warehouseStatements: 0, warehouseMs: 0, queueWaitMs: 0, cacheHits: 0, cacheMisses: 0, cacheSharedLoads: 0, connectionRetries: 0 } }
  const started = performance.now()
  const elapsed = () => Math.max(0, performance.now() - started)
  const abort = () => {
    if (controller.signal.aborted) return
    controller.abort(new Error('HTTP caller disconnected'))
    if (process.env.GATEWAY_REQUEST_METRICS === '1') {
      console.info(JSON.stringify({event:'gateway_request_aborted',request_id:context.requestId,
        method:req.method,route:typeof req.route?.path==='string'?req.route.path:'unmatched',
        elapsed_ms:Number(elapsed().toFixed(3)),...context.counters}))
    }
  }
  req.once('aborted', abort)
  res.once('close', () => { if (!res.writableEnded) abort() })
  res.setHeader('X-Request-ID', context.requestId)
  const json = res.json.bind(res)
  res.json = body => {
    if (!res.headersSent) {
      const c = context.counters
      res.setHeader('Server-Timing', [`app;dur=${elapsed().toFixed(3)}`, `warehouse;dur=${c.warehouseMs.toFixed(3)}`,
        `queue;dur=${c.queueWaitMs.toFixed(3)}`, `statements;desc="${c.warehouseStatements}"`,
        `cachehit;desc="${c.cacheHits}"`, `cachemiss;desc="${c.cacheMisses}"`, `shared;desc="${c.cacheSharedLoads}"`,
        `connectretry;desc="${c.connectionRetries}"`].join(', '))
    }
    return json(body)
  }
  res.once('finish', () => {
    req.removeListener('aborted', abort)
    if (process.env.GATEWAY_REQUEST_METRICS === '1') {
      console.info(JSON.stringify({ event: 'gateway_request', request_id: context.requestId,
        method: req.method, route: typeof req.route?.path === 'string' ? req.route.path : 'unmatched',
        status: res.statusCode, elapsed_ms: Number(elapsed().toFixed(3)), ...context.counters }))
    }
  })
  storage.run(context, next)
}
