// Isolated selected-Supabase-mode fixture. No external request is permitted.
const path = require('node:path')
const { createHash } = require('node:crypto')
const counts = { auth: 0, account: 0, auditRead: 0, auditAppend: 0, authWrite: 0, external: 0 }
const actors = ['admin', 'manager', 'analyst', 'viewer', 'reset', 'unlinked', 'inactive', 'metadata_admin', 'auth_outage', 'account_outage', 'transient']
let transientAttempts = 0
const tokenActor = new Map(actors.map(actor => ['synthetic-role-' + actor, actor]))
globalThis.fetch = async (input, init = {}) => {
  const url = new URL(String(input))
  if (url.origin !== 'https://identity.fixture.invalid') { counts.external++; throw new Error('Role fixture forbids external network') }
  if (url.pathname === '/auth/v1/user') {
    counts.auth++
    const token = new Headers(init.headers).get('Authorization')?.replace(/^Bearer /, '')
    const actor = tokenActor.get(token)
    if (!actor) return Response.json({ error: 'Synthetic invalid session' }, { status: 401 })
    if (actor === 'auth_outage') return Response.json({}, { status: 503 })
    if (actor === 'transient' && ++transientAttempts < 3) throw new TypeError('fetch failed', { cause: Object.assign(new Error('read ECONNRESET'), { code: 'ECONNRESET' }) })
    return Response.json({ id: actor, email: 'synthetic@example.invalid', app_metadata: { role: actor === 'metadata_admin' ? 'admin' : actor } })
  }
  if (url.pathname === '/rest/v1/accounts') {
    counts.account++
    const actor = (url.searchParams.get('auth_user_id') || '').replace(/^eq\./, '')
    if (actor === 'account_outage') return Response.json({}, { status: 503 })
    if (actor === 'unlinked') return Response.json([])
    return Response.json([{ account_id: 101, auth_user_id: actor, username: 'synthetic-' + actor, email: 'synthetic@example.invalid',
      role: actor === 'reset' ? 'admin' : ['metadata_admin', 'transient'].includes(actor) ? 'viewer' : actor, is_active: actor !== 'inactive', password_reset_required: actor === 'reset' }])
  }
  if (url.pathname === '/rest/v1/audit_logs') { counts.auditRead++; return Response.json([]) }
  if (url.pathname === '/rest/v1/rpc/append_audit_log') {
    counts.auditAppend++
    const body = JSON.parse(init.body)
    const previous_hash = '0'.repeat(64)
    return Response.json([{ ...JSON.parse(body.p_payload), event_id: body.p_event_id, hash_payload: body.p_payload, previous_hash,
      entry_hash: createHash('sha256').update(previous_hash + ':' + body.p_payload, 'utf8').digest('hex'), hash_version: 'sha256-json-v1', chain_id: 'remote-v1', chain_sequence: 1, tamper_evident: false }])
  }
  if (url.pathname === '/auth/v1/logout') { counts.authWrite++; return new Response(null, { status: 204 }) }
  counts.external++; throw new Error('Unexpected identity fixture operation')
}
process.on('message', message => { if (message?.type === 'counts') process.send({ type: 'counts', counts }) })
process.send({ type: 'actors', actors })
require(path.resolve(__dirname, '../../src/server.ts'))
