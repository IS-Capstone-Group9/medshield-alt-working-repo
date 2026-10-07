import { createHash, randomUUID } from 'node:crypto'
import { mkdir, open, readFile } from 'node:fs/promises'
import path from 'node:path'

export interface AuditEvent {
  username: string
  action: string
  detail: string
  ip_address: string
  user_agent: string
  created_at: string
}

export type AuditRecord = Partial<AuditEvent> & {
  event_id?: string
  chain_id?: string
  chain_sequence?: number
  previous_hash?: string
  entry_hash?: string
  hash_payload?: string
  hash_version?: string
  tamper_evident: false
  storage_source: 'supabase' | 'local'
  [key: string]: unknown
}

export class AuditPersistenceError extends Error {
  readonly code = 'AUDIT_PERSISTENCE_FAILED'
}

export class AuditReadError extends Error {
  readonly code = 'AUDIT_READ_FAILED'
}

type RemoteRequest = (path: string, init: RequestInit) => Promise<Response>
const ZERO_HASH = '0'.repeat(64)
const HASH_VERSION = 'sha256-json-v1'
const localQueues = new Map<string, Promise<void>>()

function hashEntry(previousHash: string, payload: string): string {
  return createHash('sha256').update(`${previousHash}:${payload}`).digest('hex')
}

function normalizeRecord(value: unknown, source: AuditRecord['storage_source']): AuditRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new AuditReadError('An audit record is malformed.')
  // A hash chain alone does not prevent a privileged operator from rewriting history.
  return { ...value, tamper_evident: false, storage_source: source } as AuditRecord
}

async function serializeLocal<T>(logPath: string, work: () => Promise<T>): Promise<T> {
  const run = (localQueues.get(logPath) ?? Promise.resolve()).then(work)
  localQueues.set(logPath, run.then(() => undefined, () => undefined))
  return await run
}

export function createAuditStore(options: {
  logPath: string
  remoteRequest?: RemoteRequest
  warn?: (message: string) => void
}) {
  const logPath = path.resolve(options.logPath)
  const warn = options.warn ?? console.warn

  async function localRecords(): Promise<AuditRecord[]> {
    let raw: string
    try {
      raw = await readFile(logPath, 'utf8')
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
      throw new AuditReadError('The local audit store could not be read.')
    }
    try {
      return raw.split('\n').filter(line => line.trim()).map(line => normalizeRecord(JSON.parse(line), 'local'))
    } catch {
      throw new AuditReadError('The local audit store contains malformed records; repair it before appending.')
    }
  }

  async function appendLocal(event: AuditEvent, eventId: string, payload: string): Promise<AuditRecord> {
    return await serializeLocal(logPath, async () => {
      const records = await localRecords()
      const chain = records.filter(record => record.chain_id === 'local-v1' && record.hash_version === HASH_VERSION)
      let previousHash = ZERO_HASH
      for (let index = 0; index < chain.length; index += 1) {
        const record = chain[index]
        if (record.chain_sequence !== index + 1 || record.previous_hash !== previousHash ||
            typeof record.hash_payload !== 'string' || record.entry_hash !== hashEntry(previousHash, record.hash_payload)) {
          throw new AuditPersistenceError('The local audit chain failed its integrity check.')
        }
        const storedPayload = JSON.parse(record.hash_payload) as Record<string, unknown>
        for (const [key, value] of Object.entries(storedPayload)) {
          if (record[key] !== value) throw new AuditPersistenceError('The local audit payload does not match its stored fields.')
        }
        previousHash = record.entry_hash
      }
      const entry: AuditRecord = {
        ...event, event_id: eventId, chain_id: 'local-v1', chain_sequence: chain.length + 1,
        previous_hash: previousHash, entry_hash: hashEntry(previousHash, payload), hash_payload: payload,
        hash_version: HASH_VERSION, tamper_evident: false, storage_source: 'local',
      }
      await mkdir(path.dirname(logPath), { recursive: true })
      const handle = await open(logPath, 'a')
      try {
        await handle.writeFile(`${JSON.stringify(entry)}\n`, 'utf8')
        await handle.sync()
      } finally {
        await handle.close()
      }
      return entry
    })
  }

  async function persist(event: AuditEvent): Promise<{ ok: true; storage: AuditRecord['storage_source']; entry: AuditRecord }> {
    const eventId = randomUUID()
    const payload = JSON.stringify({ event_id: eventId, ...event })
    if (options.remoteRequest) {
      try {
        const response = await options.remoteRequest('/rpc/append_audit_log', {
          method: 'POST', body: JSON.stringify({ p_event_id: eventId, p_payload: payload }),
        })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const result: unknown = await response.json()
        const entry = normalizeRecord(Array.isArray(result) ? result[0] : result, 'supabase')
        if (entry.event_id !== eventId || entry.hash_payload !== payload || typeof entry.previous_hash !== 'string' ||
            entry.entry_hash !== hashEntry(entry.previous_hash, payload) || entry.hash_version !== HASH_VERSION) {
          throw new Error('Invalid audit append receipt')
        }
        return { ok: true, storage: 'supabase', entry }
      } catch {
        warn('Remote audit persistence failed; using the durable local audit store. Check migration 016 and backend server credentials.')
      }
    }
    try {
      return { ok: true, storage: 'local', entry: await appendLocal(event, eventId, payload) }
    } catch {
      throw new AuditPersistenceError('The audit event could not be durably persisted.')
    }
  }

  async function read(limit = 100): Promise<{ entries: AuditRecord[]; remoteUnavailable: boolean }> {
    let remote: AuditRecord[] = []
    let remoteUnavailable = false
    if (options.remoteRequest) {
      try {
        const response = await options.remoteRequest(`/audit_logs?order=created_at.desc,log_id.desc&limit=${limit}`, { method: 'GET' })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const rows: unknown = await response.json()
        if (!Array.isArray(rows)) throw new Error('Invalid audit result')
        remote = rows.map(row => normalizeRecord(row, 'supabase'))
      } catch {
        remoteUnavailable = true
        warn('Remote audit retrieval failed; returned local audit records are a partial view.')
      }
    }
    // Read the fallback even after a successful remote GET so its records remain discoverable.
    const local = await localRecords()
    if (remoteUnavailable && local.length === 0) throw new AuditReadError('Remote audit retrieval is unavailable and no local records are available.')
    const merged = new Map<string, AuditRecord>()
    local.forEach((record, index) => merged.set(record.event_id ?? `local-legacy-${index}`, record))
    remote.forEach((record, index) => merged.set(record.event_id ?? `remote-legacy-${index}`, record))
    const entries = [...merged.values()].sort((a, b) => String(b.created_at ?? '').localeCompare(String(a.created_at ?? ''))).slice(0, limit)
    return { entries, remoteUnavailable }
  }

  return { persist, read }
}
