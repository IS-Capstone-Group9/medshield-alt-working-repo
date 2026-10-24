import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { Client } from 'pg'

async function main() {
  if (process.argv[2] !== '--apply' || !process.env.OPERATIONS_DATABASE_URL) throw new Error('Requires --apply and OPERATIONS_DATABASE_URL for a reviewed operational database.')
  const client = new Client({ connectionString: process.env.OPERATIONS_DATABASE_URL, connectionTimeoutMillis: 5000 })
  await client.connect()
  try {
    const existing = await client.query("SELECT to_regclass('medshield_operations.schema_version') AS table_name")
    if (existing.rows[0].table_name) {
      const version = await client.query('SELECT version FROM medshield_operations.schema_version WHERE version=1')
      if (version.rowCount) { console.log('Migration 1 already applied'); return }
      throw new Error('Partial schema found; manual review required')
    }
    await client.query(await readFile(path.resolve(__dirname, '../migrations/commercial/001_operations.sql'), 'utf8'))
    console.log('Operational migration 1 applied. Provision the read-only server role separately.')
  } finally { await client.end() }
}
main().catch(() => { console.error('Migration failed. Verify the target, migration state, and database permissions; credentials are not logged.'); process.exitCode = 1 })
