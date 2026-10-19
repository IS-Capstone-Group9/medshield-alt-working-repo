import assert from 'node:assert/strict'
import { fork, type ChildProcess } from 'node:child_process'
import { createServer } from 'node:net'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { setTimeout as delay } from 'node:timers/promises'

type Counts = { auth: number; account: number; auditRead: number; auditAppend: number; authWrite: number; external: number }
async function counts(child: ChildProcess): Promise<Counts> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { child.off('message', receive); reject(new Error('Counter timeout')) }, 3000)
    const receive = (message: any) => { if (message?.type === 'counts') { clearTimeout(timeout); child.off('message', receive); resolve(message.counts) } }
    child.on('message', receive); child.send({ type: 'counts' })
  })
}

test('selected Supabase-mode actual gateway enforces linked-role and restricted-session matrix', async t => {
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'medshield-role-fixture-'))
  const emptyEnvironment = path.join(temporary, 'empty.env')
  await writeFile(emptyEnvironment, '')
  const listener = createServer()
  await new Promise<void>(resolve => listener.listen(0, '127.0.0.1', resolve))
  const address = listener.address(); assert.ok(address && typeof address !== 'string')
  const port = address.port
  await new Promise<void>((resolve, reject) => listener.close(error => error ? reject(error) : resolve()))
  const child = fork(path.join(__dirname, 'fixtures/role-gateway-fixture.cjs'), [], {
    cwd: path.resolve(__dirname, '..'), execArgv: ['--import', 'tsx'], silent: true,
    env: { ...process.env, NODE_ENV: 'production', USE_SUPABASE: 'true', PORT: String(port), MEDSHIELD_ENV_FILE: emptyEnvironment,
      MEDSHIELD_AUDIT_LOG_PATH: path.join(temporary, 'audit.jsonl'), SUPABASE_URL: 'https://identity.fixture.invalid',
      SUPABASE_ANON_KEY: 'synthetic-publishable', SUPABASE_SECRET_KEY: 'sb_secret_synthetic_fixture', SUPABASE_SERVICE_ROLE_KEY: '',
      DATABRICKS_HOST: '', DATABRICKS_TOKEN: '', DATABRICKS_SQL_WAREHOUSE_ID: '', CORS_ALLOWED_ORIGINS: 'https://allowed.fixture.invalid' },
  })
  t.after(async () => {
    if (child.exitCode === null) await new Promise<void>(resolve => { child.once('exit', () => resolve()); child.kill() })
    // Exact newly-created fixture directory only; no application/user path.
    assert.ok(path.resolve(temporary).startsWith(path.resolve(os.tmpdir()) + path.sep + 'medshield-role-fixture-'))
    await rm(temporary, { recursive: true, force: true })
  })
  let failureOutput = ''
  child.stderr?.on('data', bytes => { failureOutput += bytes.toString() })
  const base = `http://127.0.0.1:${port}`
  const observations: { actor: string; method: string; route: string; status: number }[] = []
  for (let i = 0; i < 150; i++) {
    if (child.exitCode !== null) throw new Error('Isolated fixture exited: ' + failureOutput)
    try { if ((await fetch(base + '/api/health')).ok) break } catch { /* Startup only. */ }
    if (i === 149) throw new Error('Isolated fixture did not become ready')
    await delay(30)
  }
  const request = async (actor: string, route: string, method = 'GET', body?: unknown) => {
    const response = await fetch(base + route, { method, headers: { ...(actor === 'absent' ? {} : { Authorization: 'Bearer synthetic-role-' + actor }), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
    observations.push({ actor, method, route, status: response.status })
    return { status: response.status, body: await response.json() as Record<string, any> }
  }
  const protectedRoutes: [string, string, unknown?][] = [
    ['GET', '/api/summary'], ['GET', '/api/monthly'], ['GET', '/api/sales/sectors'], ['GET', '/api/sales/sector-trend'], ['GET', '/api/sales/predictive-research'],
    ['GET', '/api/sales/planning-shortlist'], ['POST', '/api/sales/planning-solve', {}], ['GET', '/api/audit'], ['POST', '/api/audit', {}],
    ['GET', '/api/integrations/databricks/status'], ['GET', '/api/integrations/databricks/external/status'],
    ['POST', '/api/integrations/databricks/sync/yearly', {}], ['POST', '/api/weather/refresh', { provider: 'invalid-fixture-provider' }],
    ['POST', '/api/sales/upload', {}], ['GET', '/api/procurement_orders'],
  ]
  await t.test('identity outages fail closed with a distinct 503 code after bounded retries', async () => {
    for (const actor of ['auth_outage', 'account_outage']) {
      const before = await counts(child)
      const result = await request(actor, '/api/summary')
      assert.equal(result.status, 503)
      assert.deepEqual(result.body, { error: 'Authentication service is unavailable', code: 'AUTHENTICATION_UNAVAILABLE' })
      const after = await counts(child)
      assert.equal(after.auth - before.auth, actor === 'auth_outage' ? 3 : 1)
      assert.equal(after.account - before.account, actor === 'account_outage' ? 3 : 0)
      for (const key of ['auditRead', 'auditAppend', 'authWrite', 'external'] as const) assert.equal(after[key], before[key])
    }
  })
  await t.test('two transient resets recover through actual authentication middleware', async () => {
    const before = await counts(child)
    const result = await request('transient', '/api/auth/me')
    assert.equal(result.status, 200)
    assert.equal(result.body.user.role, 'viewer')
    const after = await counts(child)
    assert.equal(after.auth - before.auth, 3)
    assert.equal(after.account - before.account, 1)
  })
  for (const actor of ['absent', 'invalid', 'unlinked', 'inactive', 'reset']) {
    await t.test(`${actor}: all protected routes reject before service side effects`, async () => {
      const before = await counts(child)
      for (const [method, route, body] of protectedRoutes) {
        const result = await request(actor, route, method, body)
        assert.equal(result.status, actor === 'reset' ? 403 : 401, actor + ' ' + route)
        if (actor === 'reset') assert.equal(result.body.code, 'PASSWORD_RESET_REQUIRED')
        assert.ok(!('rows' in result.body))
      }
      const after = await counts(child)
      for (const key of ['auditRead', 'auditAppend', 'authWrite', 'external'] as const) assert.equal(after[key], before[key], actor + '/' + key)
    })
  }
  for (const actor of ['admin', 'manager', 'analyst', 'viewer']) {
    await t.test(`${actor}: source boundaries, privileged operations, audit and disabled upload`, async () => {
      const me = await request(actor, '/api/auth/me'); assert.equal(me.status, 200); assert.equal(me.body.user.role, actor)
      for (const route of ['/api/summary', '/api/monthly', '/api/sales/sectors', '/api/sales/sector-trend']) {
        const response = await request(actor, route); assert.equal(response.status, 503); assert.equal(response.body.code, 'DATABRICKS_SOURCE_UNAVAILABLE')
      }
      const audit = await request(actor, '/api/audit'); assert.equal(audit.status, ['admin', 'manager'].includes(actor) ? 200 : 403)
      const auditWrite = await request(actor, '/api/audit', 'POST', {}); assert.equal(auditWrite.status, 400)
      assert.equal((await request(actor, '/api/sales/upload', 'POST', {})).status, 409)
      const plan = await request(actor, '/api/sales/planning-solve', 'POST', {})
      assert.equal(plan.status, 400); assert.equal(plan.body.code, 'INVALID_DATABRICKS_QUERY')
      for (const route of ['/api/integrations/databricks/status', '/api/integrations/databricks/external/status']) {
        const response = await request(actor, route); assert.equal(response.status, actor === 'admin' ? 503 : 403)
        assert.equal(response.body.code, actor === 'admin' ? 'DATABRICKS_NOT_CONFIGURED' : 'FORBIDDEN_ROLE')
      }
      if (actor !== 'admin') {
        const before = await counts(child)
        const sync = await request(actor, '/api/integrations/databricks/sync/yearly', 'POST', {})
        assert.equal(sync.status, 403); assert.equal(sync.body.code, 'FORBIDDEN_ROLE')
        assert.equal((await counts(child)).auditAppend, before.auditAppend)
      }
      const weather = await request(actor, '/api/weather/refresh', 'POST', { provider: 'invalid-fixture-provider' })
      assert.equal(weather.status, ['admin', 'analyst'].includes(actor) ? 400 : 403)
      if (weather.status === 403) assert.equal(weather.body.code, 'FORBIDDEN_ROLE')
    })
  }
  await t.test('metadata admin claim cannot elevate linked viewer role', async () => {
    assert.equal((await request('metadata_admin', '/api/auth/me')).body.user.role, 'viewer')
    assert.equal((await request('metadata_admin', '/api/audit')).status, 403)
    assert.equal((await request('metadata_admin', '/api/integrations/databricks/status')).status, 403)
  })
  await t.test('reset-exception endpoints still reject invalid and unlinked sessions', async () => {
    for (const actor of ['absent', 'invalid', 'unlinked', 'inactive']) {
      assert.equal((await request(actor, '/api/auth/me')).status, 401)
      assert.equal((await request(actor, '/api/auth/logout', 'POST', {})).status, 401)
      assert.equal((await request(actor, '/api/auth/complete-password-reset', 'POST', {})).status, 401)
    }
  })
  await t.test('reset session can inspect itself and reach reset validation, then logout', async () => {
    assert.equal((await request('reset', '/api/auth/me')).status, 200)
    assert.equal((await request('reset', '/api/auth/complete-password-reset', 'POST', {})).status, 400)
    const before = await counts(child)
    assert.equal((await request('reset', '/api/auth/logout', 'POST', {})).status, 200)
    await delay(20)
    const after = await counts(child); assert.equal(after.authWrite, before.authWrite + 1)
    assert.equal(after.auditAppend, 0); assert.equal(after.external, 0)
  })
  assert.equal((await counts(child)).external, 0)
  if (process.env.MEDSHIELD_ROLE_MATRIX_RECEIPT) {
    await writeFile(process.env.MEDSHIELD_ROLE_MATRIX_RECEIPT, JSON.stringify({
      checked_at_utc: new Date().toISOString(), status: 'PASS', layer: 'Actual Express/Supabase-mode HTTP middleware with mocked synthetic external dependencies',
      observations, counts: await counts(child), no_real_account_or_external_writes: true,
      limits: ['Allowed source503 proves authorization reached the source boundary, not actual data retrieval.',
        'Allowed validation400 proves route entry, not successful planning/refresh/reset execution.',
        'Admin yearly-sync execution intentionally not invoked; no real warehouse, provider or audit mutation.',
        'No live browser/RLS/all-role identity validation is claimed.'],
    }, null, 2))
  }
})
