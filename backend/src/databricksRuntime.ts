import { performance } from 'node:perf_hooks'

export interface RuntimeClock {
  now(): number
  setTimeout(callback: () => void, milliseconds: number): ReturnType<typeof setTimeout>
  clearTimeout(timer: ReturnType<typeof setTimeout>): void
}

export const runtimeClock: RuntimeClock = {
  now: () => performance.now(),
  setTimeout: (callback, milliseconds) => setTimeout(callback, milliseconds),
  clearTimeout: timer => clearTimeout(timer),
}

export class DatabricksRuntimeError extends Error {
  readonly status = 503
  constructor(readonly code: string, message: string) {
    super(message)
    this.name = 'DatabricksRuntimeError'
  }
}

function aborted(reason?: unknown): Error {
  return reason instanceof DatabricksRuntimeError ? reason
    : new DatabricksRuntimeError('DATABRICKS_ABORTED', 'Databricks operation was cancelled.')
}

/** Conservative classification: uncertain SQL, including generic CTEs, is never auto-cancelled. */
export function isSafelyCancellableRead(statement: string): boolean {
  const sql = statement.replace(/^(?:\s|--[^\r\n]*(?:\r?\n|$)|\/\*[\s\S]*?\*\/)+/, '').trim()
  if (!/^(SELECT|SHOW|DESCRIBE)\b/i.test(sql)) return false
  if (sql.replace(/;\s*$/, '').includes(';')) return false
  return !/\b(INSERT|UPDATE|DELETE|MERGE|CREATE|ALTER|DROP|TRUNCATE|GRANT|REVOKE|REPLACE|OPTIMIZE|VACUUM|RESTORE|COPY|SET|USE|CALL|REFRESH|ANALYZE)\b/i.test(sql)
}

/** One monotonic budget, including admission and response-body/chunk reads. */
export class OperationDeadline {
  readonly signal: AbortSignal
  readonly expiresAt: number
  private readonly controller = new AbortController()
  private readonly timer: ReturnType<typeof setTimeout>
  private readonly onCallerAbort: () => void

  constructor(milliseconds: number, private readonly clock: RuntimeClock = runtimeClock, private readonly caller?: AbortSignal) {
    this.signal = this.controller.signal
    this.expiresAt = clock.now() + milliseconds
    this.onCallerAbort = () => this.controller.abort(aborted(caller?.reason))
    this.timer = clock.setTimeout(() => this.expire(), milliseconds)
    if (caller?.aborted) this.onCallerAbort()
    else caller?.addEventListener('abort', this.onCallerAbort, { once: true })
  }

  private expire(): void {
    this.controller.abort(new DatabricksRuntimeError('DATABRICKS_DEADLINE_EXCEEDED', 'Databricks operation exceeded its time budget.'))
  }

  remaining(): number {
    return Math.max(0, this.expiresAt - this.clock.now())
  }

  check(): void {
    if (!this.signal.aborted && this.remaining() === 0) this.expire()
    if (this.signal.aborted) throw aborted(this.signal.reason)
  }

  async run<T>(start: () => Promise<T>): Promise<T> {
    this.check()
    return new Promise<T>((resolve, reject) => {
      const onAbort = () => reject(aborted(this.signal.reason))
      this.signal.addEventListener('abort', onAbort, { once: true })
      let pending: Promise<T>
      try { pending = start() } catch (error) {
        this.signal.removeEventListener('abort', onAbort)
        reject(error)
        return
      }
      pending.then(value => {
        this.signal.removeEventListener('abort', onAbort)
        try { this.check(); resolve(value) } catch (error) { reject(error) }
      }, error => {
        this.signal.removeEventListener('abort', onAbort)
        reject(this.signal.aborted ? aborted(this.signal.reason) : error)
      })
    })
  }

  async sleep(milliseconds: number): Promise<void> {
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      await this.run(() => new Promise<void>(resolve => {
        timer = this.clock.setTimeout(resolve, Math.min(milliseconds, this.remaining()))
      }))
    } finally {
      if (timer !== undefined) this.clock.clearTimeout(timer)
    }
  }

  dispose(): void {
    this.clock.clearTimeout(this.timer)
    this.caller?.removeEventListener('abort', this.onCallerAbort)
  }
}

interface WaitingStatement {
  grant(): void
  reject(error: Error): void
}

/** Shared by all SQL readers rather than just the descriptive query helper. */
export class StatementAdmission {
  private active = 0
  private readonly waiting: WaitingStatement[] = []

  constructor(readonly maxActive: number, readonly maxQueued: number, readonly queueTimeoutMs: number,
    private readonly clock: RuntimeClock = runtimeClock) {
    if (![maxActive, maxQueued, queueTimeoutMs].every(Number.isInteger) || maxActive < 1 || maxQueued < 0 || queueTimeoutMs < 1)
      throw new Error('Invalid Databricks admission limits')
  }

  get counts(): { active: number; queued: number } { return { active: this.active, queued: this.waiting.length } }

  async acquire(operation: OperationDeadline): Promise<() => void> {
    operation.check()
    if (this.active < this.maxActive) {
      this.active += 1
      return this.releaseOnce()
    }
    if (this.waiting.length >= this.maxQueued)
      throw new DatabricksRuntimeError('DATABRICKS_QUEUE_FULL', 'Databricks request capacity is busy. Try again shortly.')
    return new Promise<() => void>((resolve, reject) => {
      let finished = false
      const cleanup = () => {
        this.clock.clearTimeout(timer)
        operation.signal.removeEventListener('abort', onAbort)
        const index = this.waiting.indexOf(waiter)
        if (index !== -1) this.waiting.splice(index, 1)
      }
      const fail = (error: Error) => {
        if (finished) return
        finished = true
        cleanup()
        reject(error)
      }
      const onAbort = () => fail(aborted(operation.signal.reason))
      const waiter: WaitingStatement = {
        grant: () => {
          if (finished) return
          try { operation.check() } catch (error) { fail(error as Error); return }
          finished = true
          cleanup()
          this.active += 1
          resolve(this.releaseOnce())
        },
        reject: fail,
      }
      const timer = this.clock.setTimeout(() => fail(new DatabricksRuntimeError('DATABRICKS_QUEUE_TIMEOUT',
        'Databricks request timed out waiting for capacity.')), this.queueTimeoutMs)
      operation.signal.addEventListener('abort', onAbort, { once: true })
      this.waiting.push(waiter)
    })
  }

  private releaseOnce(): () => void {
    let released = false
    return () => {
      if (released) return
      released = true
      this.active -= 1
      while (this.active < this.maxActive && this.waiting.length) this.waiting[0].grant()
    }
  }
}

interface CachedValue<T> { value: T; expiresAt: number; bytes: number }
interface SharedLoad<T> { promise: Promise<T>; controller: AbortController; consumers: number; settled: boolean }

/** Capacity/byte bounded TTL LRU; failed/abandoned reads are never cached. */
export class BoundedQueryCache<T> {
  private readonly values = new Map<string, CachedValue<T>>()
  private readonly loads = new Map<string, SharedLoad<T>>()
  private bytes = 0

  constructor(private readonly limits: { ttlMs: number; maxEntries: number; maxBytes: number; maxPending: number },
    private readonly clock: RuntimeClock = runtimeClock, private readonly onEvent?: (event: 'hit' | 'miss' | 'shared') => void) {
    if (!Object.values(limits).every(value => Number.isInteger(value) && value > 0)) throw new Error('Invalid query cache limits')
  }

  get counts(): { entries: number; bytes: number; pending: number } {
    this.prune()
    return { entries: this.values.size, bytes: this.bytes, pending: this.loads.size }
  }

  private remove(key: string): void {
    const value = this.values.get(key)
    if (value) this.bytes -= value.bytes
    this.values.delete(key)
  }

  private prune(): void {
    const now = this.clock.now()
    for (const [key, item] of this.values) if (item.expiresAt <= now) this.remove(key)
  }

  private save(key: string, value: T): void {
    this.prune()
    const bytes = Buffer.byteLength(key, 'utf8') + Buffer.byteLength(JSON.stringify(value), 'utf8')
    if (bytes > this.limits.maxBytes) return
    this.remove(key)
    while (this.values.size >= this.limits.maxEntries || this.bytes + bytes > this.limits.maxBytes)
      this.remove(this.values.keys().next().value!)
    this.values.set(key, { value, bytes, expiresAt: this.clock.now() + this.limits.ttlMs })
    this.bytes += bytes
  }

  async getOrLoad(key: string, load: (signal: AbortSignal) => Promise<T>, signal?: AbortSignal): Promise<T> {
    if (signal?.aborted) throw aborted(signal.reason)
    this.prune()
    const cached = this.values.get(key)
    if (cached) {
      this.onEvent?.('hit')
      this.values.delete(key)
      this.values.set(key, cached)
      return cached.value
    }
    let shared = this.loads.get(key)
    this.onEvent?.(shared ? 'shared' : 'miss')
    if (!shared) {
      if (this.loads.size >= this.limits.maxPending)
        throw new DatabricksRuntimeError('DATABRICKS_CACHE_PENDING_LIMIT', 'Databricks request capacity is busy. Try again shortly.')
      shared = { promise: undefined as unknown as Promise<T>, controller: new AbortController(), consumers: 0, settled: false }
      const owner = shared
      owner.promise = Promise.resolve().then(() => {
        if (owner.controller.signal.aborted) throw aborted(owner.controller.signal.reason)
        return load(owner.controller.signal)
      }).then(value => {
        owner.settled = true
        if (!owner.controller.signal.aborted) this.save(key, value)
        return value
      }, error => { owner.settled = true; throw error }).finally(() => {
        if (this.loads.get(key) === owner) this.loads.delete(key)
      })
      this.loads.set(key, owner)
    }
    const owner = shared
    owner.consumers += 1
    return new Promise<T>((resolve, reject) => {
      let finished = false
      const detach = () => {
        if (finished) return false
        finished = true
        signal?.removeEventListener('abort', onAbort)
        owner.consumers -= 1
        if (!owner.settled && owner.consumers === 0) {
          owner.controller.abort()
          if (this.loads.get(key) === owner) this.loads.delete(key)
        }
        return true
      }
      const onAbort = () => { if (detach()) reject(aborted(signal?.reason)) }
      signal?.addEventListener('abort', onAbort, { once: true })
      owner.promise.then(value => { if (detach()) resolve(value) }, error => { if (detach()) reject(error) })
    })
  }
}
