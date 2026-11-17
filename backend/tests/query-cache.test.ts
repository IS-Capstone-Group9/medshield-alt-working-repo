import assert from 'node:assert/strict'
import { test } from 'node:test'
import { BoundedQueryCache, type RuntimeClock } from '../src/databricksRuntime'

function fixture(limits = {}) {
  let now = 0
  const clock: RuntimeClock = { now: () => now, setTimeout, clearTimeout }
  const cache = new BoundedQueryCache<string[]>({ ttlMs: 100, maxEntries: 2, maxBytes: 1000, maxPending: 2, ...limits }, clock)
  return { cache, advance: (ms: number) => { now += ms } }
}

function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (error: Error) => void
  const promise = new Promise<T>((ok, fail) => { resolve = ok; reject = fail })
  return { promise, resolve, reject }
}

test('bounded TTL cache evicts least recently used keys and expired entries; bytes include keys', async () => {
  const { cache, advance } = fixture()
  let loads = 0
  const load = async () => [String(++loads)]
  await cache.getOrLoad('first', load)
  await cache.getOrLoad('second', load)
  assert.deepEqual(await cache.getOrLoad('first', load), ['1'])
  await cache.getOrLoad('third', load)
  assert.equal(cache.counts.entries, 2)
  assert.deepEqual(await cache.getOrLoad('second', load), ['4'])
  assert.equal(cache.counts.entries, 2)
  advance(100)
  assert.deepEqual(cache.counts, { entries: 0, bytes: 0, pending: 0 })
  assert.deepEqual(await cache.getOrLoad('first', load), ['5'])
})

test('byte cap and oversize keys/values cannot grow retained cache beyond its budget', async () => {
  const { cache } = fixture({ maxEntries: 100, maxBytes: 24 })
  for (let i = 0; i < 20; i++) {
    await cache.getOrLoad(String(i), async () => ['12345'])
    assert.ok(cache.counts.bytes <= 24)
    assert.ok(cache.counts.entries <= 2)
  }
  const before = cache.counts
  assert.deepEqual(await cache.getOrLoad('very-long-key-that-cannot-fit', async () => ['x']), ['x'])
  assert.deepEqual(cache.counts, before)
})

test('resolved source/scope/parameter keys isolate values, while identical active reads share one load', async () => {
  const { cache } = fixture({ maxEntries: 10 })
  const pending = deferred<string[]>(); let calls = 0
  const load = async () => { calls++; return pending.promise }
  const key = JSON.stringify(['itemized', 'dataset-a', 0, 'SELECT :period', '2026'])
  const first = cache.getOrLoad(key, load), second = cache.getOrLoad(key, load)
  await Promise.resolve()
  assert.equal(calls, 1)
  pending.resolve(['itemized-a'])
  assert.deepEqual(await first, await second)
  for (const other of [JSON.stringify(['contracts', 'dataset-a', 0, 'SELECT :period', '2026']),
    JSON.stringify(['itemized', 'dataset-b', 0, 'SELECT :period', '2026']),
    JSON.stringify(['itemized', 'dataset-a', 1, 'SELECT :period', '2026']),
    JSON.stringify(['itemized', 'dataset-a', 0, 'SELECT :period', '2025'])])
    assert.deepEqual(await cache.getOrLoad(other, async () => ['separate']), ['separate'])
  assert.deepEqual(await cache.getOrLoad(key, async () => ['wrong']), ['itemized-a'])
})

test('one abandoned consumer never aborts a shared read still needed by another consumer', async () => {
  const { cache } = fixture()
  const pending = deferred<string[]>(), controller = new AbortController()
  let ownedSignal!: AbortSignal
  const first = cache.getOrLoad('same', signal => { ownedSignal = signal; return pending.promise }, controller.signal)
  const failed = assert.rejects(first, (error: any) => error.code === 'DATABRICKS_ABORTED')
  const second = cache.getOrLoad('same', async () => ['wrong'])
  await Promise.resolve()
  controller.abort()
  await failed
  assert.equal(ownedSignal.aborted, false)
  pending.resolve(['shared'])
  assert.deepEqual(await second, ['shared'])
  assert.deepEqual(await cache.getOrLoad('same', async () => ['wrong']), ['shared'])
})

test('last abandoned consumer aborts owned work, skips late cache writes and allows immediate retry', async () => {
  const { cache } = fixture()
  const pending = deferred<string[]>(), controller = new AbortController()
  let signal!: AbortSignal
  const first = cache.getOrLoad('same', owned => { signal = owned; return pending.promise }, controller.signal)
  const failed = assert.rejects(first, (error: any) => error.code === 'DATABRICKS_ABORTED')
  await Promise.resolve()
  controller.abort()
  await failed
  assert.equal(signal.aborted, true)
  assert.equal(cache.counts.pending, 0)
  assert.deepEqual(await cache.getOrLoad('same', async () => ['new']), ['new'])
  pending.resolve(['old'])
  await Promise.resolve(); await Promise.resolve()
  assert.deepEqual(await cache.getOrLoad('same', async () => ['wrong']), ['new'])
})

test('failures never populate cache; failed loads evict and retries can succeed', async () => {
  const { cache } = fixture()
  await assert.rejects(cache.getOrLoad('bad', async () => { throw Error('source unavailable') }), /source unavailable/)
  assert.deepEqual(cache.counts, { entries: 0, bytes: 0, pending: 0 })
  assert.deepEqual(await cache.getOrLoad('bad', async () => ['recovered']), ['recovered'])
})

test('distinct pending keys are bounded, duplicate waiters reuse admitted work, pre-abort does no work', async () => {
  const { cache } = fixture({ maxPending: 1 })
  const pending = deferred<string[]>()
  const first = cache.getOrLoad('one', async () => pending.promise)
  const duplicate = cache.getOrLoad('one', async () => ['wrong'])
  await assert.rejects(cache.getOrLoad('two', async () => ['wrong']), (error: any) => error.code === 'DATABRICKS_CACHE_PENDING_LIMIT')
  const controller = new AbortController(); controller.abort()
  let calls = 0
  await assert.rejects(cache.getOrLoad('pre-abort', async () => { calls++; return [] }, controller.signal))
  assert.equal(calls, 0)
  pending.resolve(['shared'])
  assert.deepEqual(await first, await duplicate)
  assert.equal(cache.counts.pending, 0)
})
