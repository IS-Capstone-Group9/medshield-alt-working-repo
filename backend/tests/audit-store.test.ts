import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { AuditEvent, AuditPersistenceError, AuditReadError, createAuditStore } from '../src/auditStore'

const event: AuditEvent = {
  username: 'planner', action: 'FILTER_CHANGED', detail: 'Year: 2026; currency: ₱',
  ip_address: '127.0.0.1', user_agent: 'test-browser', created_at: '2026-10-05T02:00:00.000Z',
}

async function fixture() {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'medshield-audit-test-'))
  return { directory, logPath: path.join(directory, 'nested', 'audit.jsonl') }
}

test('local persistence creates its directory, serializes concurrent writers, and resumes the durable chain', async () => {
  const { directory, logPath } = await fixture()
  try {
    const first = createAuditStore({ logPath })
    const other = createAuditStore({ logPath })
    await Promise.all(Array.from({ length: 20 }, (_, index) => (index % 2 ? first : other).persist({ ...event, detail: `Write ${index}` })))
    const restarted = createAuditStore({ logPath })
    await restarted.persist({ ...event, detail: 'After restart' })
    const rows = (await readFile(logPath, 'utf8')).trim().split('\n').map(line => JSON.parse(line))
    assert.equal(rows.length, 21)
    let previous = '0'.repeat(64)
    rows.forEach((row, index) => {
      assert.equal(row.chain_sequence, index + 1)
      assert.equal(row.previous_hash, previous)
      assert.equal(row.entry_hash, createHash('sha256').update(`${previous}:${row.hash_payload}`).digest('hex'))
      assert.equal(row.tamper_evident, false)
      assert.equal(JSON.parse(row.hash_payload).ip_address, event.ip_address)
      assert.equal(JSON.parse(row.hash_payload).user_agent, event.user_agent)
      previous = row.entry_hash
    })
    assert.equal((await restarted.read()).entries.length, 21)
  } finally { await rm(directory, { recursive: true, force: true }) }
})

test('both exhausted persistence paths reject instead of acknowledging a lost event', async () => {
  const { directory } = await fixture()
  try {
    const blocked = path.join(directory, 'file-instead-of-directory')
    await writeFile(blocked, 'blocker')
    for (const remoteRequest of [undefined, async () => new Response('', { status: 503 })]) {
      const store = createAuditStore({ logPath: path.join(blocked, 'audit.jsonl'), remoteRequest, warn: () => undefined })
      await assert.rejects(store.persist(event), AuditPersistenceError)
    }
  } finally { await rm(directory, { recursive: true, force: true }) }
})

test('fallback records remain discoverable after a successful remote read and legacy records make no integrity claim', async () => {
  const { directory, logPath } = await fixture()
  try {
    const warnings: string[] = []
    const store = createAuditStore({ logPath, warn: message => warnings.push(message), remoteRequest: async (_url, init) => {
      if (init.method === 'POST') return new Response('', { status: 404 })
      return Response.json([{ username: 'remote-user', action: 'LOGIN', detail: 'Remote legacy event', created_at: '2026-10-05T01:00:00Z', tamper_evident: true }])
    } })
    const result = await store.persist(event)
    assert.equal(result.ok, true)
    assert.equal(result.storage, 'local')
    const read = await store.read()
    assert.equal(read.remoteUnavailable, false)
    assert.deepEqual(read.entries.map(row => row.storage_source), ['local', 'supabase'])
    assert.ok(read.entries.every(row => row.tamper_evident === false))
    assert.equal(warnings.length, 1)
  } finally { await rm(directory, { recursive: true, force: true }) }
})

test('remote RPC receipt is checked and a committed remote event with a lost receipt is deduplicated from fallback', async () => {
  const { directory, logPath } = await fixture()
  try {
    let committed: Record<string, unknown> | undefined
    const store = createAuditStore({ logPath, warn: () => undefined, remoteRequest: async (url, init) => {
      if (init.method === 'GET') return Response.json([committed])
      assert.equal(url, '/rpc/append_audit_log')
      const body = JSON.parse(String(init.body))
      const payload = JSON.parse(body.p_payload)
      committed = { ...payload, chain_id: 'remote-v1', chain_sequence: 1, previous_hash: '0'.repeat(64),
        hash_payload: body.p_payload, hash_version: 'sha256-json-v1',
        entry_hash: createHash('sha256').update(`${'0'.repeat(64)}:${body.p_payload}`).digest('hex') }
      throw new Error('Receipt lost after transaction commit')
    } })
    assert.equal((await store.persist(event)).storage, 'local')
    const read = await store.read()
    assert.equal(read.entries.length, 1)
    assert.equal(read.entries[0].storage_source, 'supabase')
  } finally { await rm(directory, { recursive: true, force: true }) }
})

test('valid remote receipts use the remote durable chain, including its predecessor', async () => {
  const { directory, logPath } = await fixture()
  try {
    let previousHash = 'a'.repeat(64)
    let sequence = 5
    const store = createAuditStore({ logPath, remoteRequest: async (_url, init) => {
      const request = JSON.parse(String(init.body))
      const entryHash = createHash('sha256').update(`${previousHash}:${request.p_payload}`).digest('hex')
      const receipt = { ...JSON.parse(request.p_payload), previous_hash: previousHash, entry_hash: entryHash,
        chain_id: 'remote-v1', chain_sequence: ++sequence, hash_payload: request.p_payload, hash_version: 'sha256-json-v1' }
      previousHash = entryHash
      return Response.json(receipt)
    } })
    const first = await store.persist(event)
    const second = await store.persist(event)
    assert.equal(first.storage, 'supabase')
    assert.equal(second.entry.previous_hash, first.entry.entry_hash)
    await assert.rejects(readFile(logPath), { code: 'ENOENT' })
  } finally { await rm(directory, { recursive: true, force: true }) }
})

test('corruption blocks append and cannot silently reset the chain; read failures cannot hide fallback evidence', async () => {
  const { directory, logPath } = await fixture()
  try {
    const store = createAuditStore({ logPath })
    await store.persist(event)
    const row = JSON.parse((await readFile(logPath, 'utf8')).trim())
    row.ip_address = 'changed'
    await writeFile(logPath, `${JSON.stringify(row)}\n`)
    await assert.rejects(store.persist(event), AuditPersistenceError)
    await writeFile(logPath, '{bad json}\n')
    await assert.rejects(store.persist(event), AuditPersistenceError)
    const withRemote = createAuditStore({ logPath, remoteRequest: async () => Response.json([]) })
    await assert.rejects(withRemote.read(), AuditReadError)
  } finally { await rm(directory, { recursive: true, force: true }) }
})

test('remote outages explicitly mark partial reads and reject an empty unavailable view', async () => {
  const { directory, logPath } = await fixture()
  try {
    const store = createAuditStore({ logPath, remoteRequest: async () => new Response('', { status: 503 }), warn: () => undefined })
    await assert.rejects(store.read(), AuditReadError)
    await store.persist(event)
    const result = await store.read()
    assert.equal(result.remoteUnavailable, true)
    assert.equal(result.entries.length, 1)
  } finally { await rm(directory, { recursive: true, force: true }) }
})
