import assert from 'node:assert/strict'
import test from 'node:test'
import { AuthRecoveryError, recoverDeletedAuthAccount, type AuthRecoveryInput } from '../src/authRecovery'

const operationId = 'da5786b8-505f-4a76-a6a4-0e3cfb337c13'
const authId = '3b6c9bad-e383-46d4-9c69-61976ffae57a'
const input: AuthRecoveryInput = { accountId: 7001, expectedEmail: 'planner@example.invalid', operator: 'fixture-operator',
  ownershipReference: 'fixture-review-7001', ownershipConfirmed: true, operationId, apply: true, temporaryPassword: 'Fixture!Temporary-7001' }

function fixture() {
  let account = { account_id: 7001, auth_user_id: null as string | null, username: 'planner', email: 'planner@example.invalid',
    role: 'viewer', is_active: true, password_hash: null, password_reset_required: false, auth_migrated_at: '2026-10-01T00:00:00Z' }
  let user: { id: string; email: string; app_metadata: Record<string, unknown> } | undefined
  const calls: Array<{ route: string; method: string; headers: Headers; body?: Record<string, unknown>; query: URLSearchParams }> = []
  const sequence: string[] = []
  let failCompletionAudit = false
  const request: typeof fetch = async (url, init = {}) => {
    const parsed = new URL(String(url))
    assert.equal(parsed.origin, 'https://identity.fixture.invalid')
    assert.equal(init.redirect, 'error')
    const method = init.method ?? 'GET'
    const body = init.body ? JSON.parse(String(init.body)) as Record<string, unknown> : undefined
    calls.push({ route: parsed.pathname, method, headers: new Headers(init.headers), body, query: parsed.searchParams })
    const response = (value: unknown) => new Response(JSON.stringify(value), { status: 200 })
    if (parsed.pathname === '/rest/v1/accounts' && method === 'GET') {
      if (parsed.searchParams.has('auth_user_id')) return response(account.auth_user_id ? [{ account_id: account.account_id }] : [])
      return response([{ ...account }])
    }
    if (parsed.pathname === '/auth/v1/admin/users' && method === 'GET') return response({ users: user ? [user] : [] })
    if (parsed.pathname === '/auth/v1/admin/users' && method === 'POST') {
      sequence.push('create')
      user = { id: authId, email: String(body?.email), app_metadata: body?.app_metadata as Record<string, unknown> }
      return response(user)
    }
    if (parsed.pathname === '/rest/v1/accounts' && method === 'PATCH') {
      sequence.push('link')
      // The independent fixture enforces the same optimistic concurrency predicate.
      for (const key of ['account_id', 'email', 'role', 'username', 'auth_migrated_at', 'password_reset_required', 'is_active']) {
        assert.equal(parsed.searchParams.get(key), `eq.${account[key as keyof typeof account]}`)
      }
      assert.equal(parsed.searchParams.get('auth_user_id'), 'is.null')
      assert.equal(parsed.searchParams.get('password_hash'), 'is.null')
      account = { ...account, auth_user_id: String(body?.auth_user_id), password_reset_required: body?.password_reset_required === true }
      return response([{ ...account }])
    }
    if (parsed.pathname === `/auth/v1/admin/users/${authId}` && method === 'GET') return response(user)
    throw new Error('Unexpected fixture route; external requests are prohibited')
  }
  return {
    calls, sequence, get account() { return account }, get user() { return user },
    failCompletion() { failCompletionAudit = true }, allowCompletion() { failCompletionAudit = false },
    options: { url: 'https://identity.fixture.invalid', serverSecret: 'sb_secret_fixture_only', request,
      persistAudit: async (event: { action: string; detail: string }) => {
        assert.ok(!event.detail.includes(input.temporaryPassword!))
        sequence.push(event.action)
        if (event.action === 'AUTH_ACCOUNT_RECOVERY_COMPLETED' && failCompletionAudit) throw new Error('unavailable')
        return { storage: 'supabase' as const }
      } },
  }
}

test('recovery dry-run is read-only; apply audits before creating and linking with both reset guards', async () => {
  const f = fixture()
  assert.equal((await recoverDeletedAuthAccount({ ...input, apply: false, ownershipConfirmed: false, temporaryPassword: undefined }, f.options)).status, 'ready')
  assert.deepEqual(f.sequence, [])
  assert.ok(f.calls.every(call => call.method === 'GET'))
  const result = await recoverDeletedAuthAccount(input, f.options)
  assert.equal(result.status, 'completed')
  assert.equal(f.account.auth_user_id, authId)
  assert.equal(f.account.password_hash, null)
  assert.equal(f.account.password_reset_required, true)
  assert.equal(f.user?.app_metadata.must_reset_password, true)
  assert.equal(f.user?.app_metadata.medshield_role, 'viewer')
  assert.deepEqual(f.sequence, ['AUTH_ACCOUNT_RECOVERY_INTENT', 'create', 'link', 'AUTH_ACCOUNT_RECOVERY_COMPLETED'])
  assert.ok(!JSON.stringify(result).includes(input.temporaryPassword!))
  assert.ok(f.calls.every(call => !call.headers.has('Authorization')))
  const creation = f.calls.find(call => call.method === 'POST')!
  assert.equal(creation.body?.password, input.temporaryPassword)
  assert.equal(creation.body?.password_hash, undefined)
})

test('missing ownership attestation, weak credentials and malformed operator fail before any request', async () => {
  for (const change of [{ ownershipConfirmed: false }, { temporaryPassword: 'weak' }, { operator: undefined }]) {
    const f = fixture()
    await assert.rejects(recoverDeletedAuthAccount({ ...input, ...change } as AuthRecoveryInput, f.options), error =>
      error instanceof AuthRecoveryError && error.code === 'RECOVERY_INPUT_INVALID' && !error.identityMayHaveChanged)
    assert.equal(f.calls.length, 0)
    assert.equal(f.sequence.length, 0)
  }
})

test('uncertain create is retained for explicit operation-bound resume, never deleted or falsely rolled back', async () => {
  const f = fixture()
  const request: typeof fetch = async (url, init) => {
    const response = await f.options.request(url, init)
    if (init?.method === 'POST') throw new Error('Synthetic reply loss; operation may be committed')
    return response
  }
  await assert.rejects(recoverDeletedAuthAccount(input, { ...f.options, request }), error =>
    error instanceof AuthRecoveryError && error.phase === 'auth-create' && error.identityMayHaveChanged)
  assert.equal(f.account.auth_user_id, null)
  assert.ok(f.user)
  assert.ok(f.calls.every(call => call.method !== 'DELETE'))
  const result = await recoverDeletedAuthAccount({ ...input, resume: true, temporaryPassword: undefined }, f.options)
  assert.equal(result.status, 'completed')
  assert.equal(f.calls.filter(call => call.method === 'POST').length, 1)
})

test('completion-audit failure reports linked partial state; resume adds audit without changing credentials', async () => {
  const f = fixture()
  f.failCompletion()
  await assert.rejects(recoverDeletedAuthAccount(input, f.options), error =>
    error instanceof AuthRecoveryError && error.phase === 'completion-audit' && error.identityMayHaveChanged)
  assert.equal(f.account.auth_user_id, authId)
  const writes = f.calls.filter(call => call.method !== 'GET').length
  f.allowCompletion()
  assert.equal((await recoverDeletedAuthAccount({ ...input, resume: true, temporaryPassword: undefined }, f.options)).status, 'completed')
  assert.equal(f.calls.filter(call => call.method !== 'GET').length, writes)
})

test('failed remote audit prevents credential or account writes even if local audit is durable', async () => {
  const f = fixture()
  await assert.rejects(recoverDeletedAuthAccount(input, { ...f.options, persistAudit: async () => ({ storage: 'local' }) }), error =>
    error instanceof AuthRecoveryError && error.code === 'RECOVERY_REMOTE_AUDIT_REQUIRED' && !error.identityMayHaveChanged)
  assert.ok(f.calls.every(call => call.method === 'GET'))
})
