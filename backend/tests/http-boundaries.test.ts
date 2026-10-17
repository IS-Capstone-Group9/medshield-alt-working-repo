import assert from 'node:assert/strict'
import { fork, type ChildProcess } from 'node:child_process'
import { createServer } from 'node:net'
import path from 'node:path'
import { test } from 'node:test'
import { setTimeout as delay } from 'node:timers/promises'

const fixtures = path.join(__dirname, 'fixtures')

async function unusedPort(): Promise<number> {
  const server = createServer()
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  assert.ok(address && typeof address !== 'string')
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
  return address.port
}

async function gateway(configured: boolean) {
  const port = await unusedPort()
  const child = fork(path.join(fixtures, 'http-gateway-fixture.cjs'), [], {
    cwd: path.resolve(__dirname, '..'), execArgv: ['--import', 'tsx'], silent: true,
    env: { ...process.env, NODE_ENV: 'development', USE_SUPABASE: 'false', PORT: String(port),
      MEDSHIELD_ENV_FILE: path.join(fixtures, 'http-empty-environment.txt'),
      MEDSHIELD_AUDIT_LOG_PATH: path.join(fixtures, 'http-unused-audit.jsonl'),
      SUPABASE_URL: '', SUPABASE_ANON_KEY: '', SUPABASE_SECRET_KEY: '', SUPABASE_SERVICE_ROLE_KEY: '',
      DATABRICKS_HOST: configured ? 'https://warehouse.fixture.invalid' : '',
      DATABRICKS_TOKEN: configured ? 'synthetic-only' : '',
      DATABRICKS_SQL_WAREHOUSE_ID: configured ? 'synthetic-only' : '',
      DATABRICKS_DESCRIPTIVE_FACT_VERSION: '20', CORS_ALLOWED_ORIGINS: 'https://allowed.fixture.invalid',
    },
  })
  let output = ''
  child.stdout?.on('data', data => { output += data.toString() })
  child.stderr?.on('data', data => { output += data.toString() })
  const tokens = await new Promise<Record<string, string>>((resolve, reject) => {
    child.once('error', reject)
    child.once('exit', code => reject(new Error(`Fixture exited before ready (${code}): ${output}`)))
    child.on('message', message => {
      const value = message as { type?: string; tokens?: Record<string, string> }
      if (value.type === 'tokens' && value.tokens) resolve(value.tokens)
    })
  })
  const origin = `http://127.0.0.1:${port}`
  try {
    // Compiler/fixture startup can exceed three seconds on a busy Windows host.
    const readyDeadline = performance.now() + 15000
    while (true) {
      if (child.exitCode !== null) throw new Error(`Fixture exited: ${output}`)
      try { if ((await fetch(`${origin}/api/health`, { signal: AbortSignal.timeout(1000) })).ok) break } catch { /* Startup only. */ }
      if (performance.now() >= readyDeadline) throw new Error(`Fixture failed to start within 15s: ${output}`)
      await delay(75)
    }
  } catch (error) { child.kill(); throw error }
  return { child, origin, tokens }
}

async function stop(child: ChildProcess) {
  if (child.exitCode !== null) return
  await new Promise<void>(resolve => { child.once('exit', () => resolve()); child.kill() })
}

async function warehouseRequests(child: ChildProcess): Promise<number> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      child.off('message', receive)
      reject(new Error('Fixture request-count response timed out'))
    }, 3000)
    const receive = (message: unknown) => {
      const value = message as { type?: string; warehouseRequests?: number }
      if (value.type !== 'counts' || typeof value.warehouseRequests !== 'number') return
      clearTimeout(timeout)
      child.off('message', receive)
      resolve(value.warehouseRequests)
    }
    child.on('message', receive)
    child.send({ type: 'counts' })
  })
}

test('actual protected gateway HTTP boundaries with no configured warehouse', async t => {
  const { child, origin, tokens } = await gateway(false)
  t.after(() => stop(child))
  const request = async (route: string, token?: string, init: RequestInit = {}) => {
    const response = await fetch(origin + route, { ...init, headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init.headers,
    } })
    const text = await response.text()
    return { response, text, json: () => JSON.parse(text) as Record<string, unknown> }
  }
  await t.test('authentication precedes repeated and structured scalar validation', async () => {
    for (const query of ['?year=2025&year=2024', '?year[value]=2025']) {
      for (const token of [undefined, 'invalid-synthetic-session']) {
        const result = await request('/api/monthly' + query, token)
        assert.equal(result.response.status, 401)
        assert.match(result.response.headers.get('content-type') ?? '', /application\/json/)
      }
      const result = await request('/api/monthly' + query, tokens.viewer)
      assert.equal(result.response.status, 400)
      assert.equal(result.json().code, 'INVALID_QUERY_PARAMETER')
    }
  })
  await t.test('password-reset and role restrictions remain forbidden', async () => {
    const reset = await request('/api/monthly?year=2025&year=2024', tokens.reset)
    assert.equal(reset.response.status, 403)
    assert.equal(reset.json().code, 'PASSWORD_RESET_REQUIRED')
    assert.equal((await request('/api/auth/me', tokens.reset)).response.status, 200)
    const role = await request('/api/integrations/databricks/status', tokens.viewer)
    assert.equal(role.response.status, 403)
    assert.equal(role.json().code, 'FORBIDDEN_ROLE')
  })
  await t.test('public login validation and malformed JSON remain 400', async () => {
    const invalid = await request('/api/auth/login', undefined, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
    })
    assert.equal(invalid.response.status, 400)
    const malformed = await request('/api/auth/login', undefined, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{',
    })
    assert.equal(malformed.response.status, 400)
    assert.equal((await request('/api/auth/login?year=1&year=2', undefined, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
    })).json().code, 'INVALID_QUERY_PARAMETER')
  })
  await t.test('seven missing-source routes return 503 JSON and no analytical fallback', async () => {
    for (const route of ['/summary', '/monthly?year=2035', '/sales/status', '/sales/heatmap', '/sales/sectors', '/sales/transactions', '/sales/summary']) {
      const result = await request('/api' + route, tokens.viewer)
      assert.equal(result.response.status, 503, route)
      assert.equal(result.json().code, 'DATABRICKS_SOURCE_UNAVAILABLE', route)
      assert.equal(typeof result.json().error, 'string')
      assert.ok(!Array.isArray(result.json()))
      assert.ok(!('rows' in result.json()))
    }
  })
  await t.test('CORS rejects actual requests and preflights with generic 403 JSON', async () => {
    for (const method of ['GET', 'OPTIONS']) {
      const result = await request('/api/health', undefined, {
        method, headers: { Origin: 'https://untrusted.fixture.invalid', 'Access-Control-Request-Method': 'GET' },
      })
      assert.equal(result.response.status, 403)
      assert.equal(result.json().code, 'CORS_ORIGIN_DENIED')
      assert.equal(result.response.headers.get('access-control-allow-origin'), null)
      assert.ok(!result.text.includes('untrusted.fixture.invalid'))
      assert.ok(!result.text.includes('Error:'))
      assert.ok(!result.text.includes('server.ts'))
    }
    const allowed = await request('/api/health', undefined, { headers: { Origin: 'https://allowed.fixture.invalid' } })
    assert.equal(allowed.response.status, 200)
    assert.equal(allowed.response.headers.get('access-control-allow-origin'), 'https://allowed.fixture.invalid')
    const preflight = await request('/api/health', undefined, { method: 'OPTIONS', headers: {
      Origin: 'https://allowed.fixture.invalid', 'Access-Control-Request-Method': 'GET',
    } })
    assert.equal(preflight.response.status, 204)
    assert.equal(preflight.response.headers.get('access-control-allow-origin'), 'https://allowed.fixture.invalid')
    assert.equal((await request('/api/health')).response.status, 200)
  })
  assert.equal(await warehouseRequests(child), 0, 'missing configuration and rejected requests must not reach the warehouse')
})

test('configured actual release query failure retains upstream 502 JSON', async t => {
  const { child, origin, tokens } = await gateway(true)
  t.after(() => stop(child))
  const response = await fetch(origin + '/api/sales/status', { headers: { Authorization: `Bearer ${tokens.viewer}` } })
  assert.equal(response.status, 502)
  const body = await response.json() as Record<string, unknown>
  assert.equal(body.code, 'DATABRICKS_QUERY_FAILED')
  assert.ok(!JSON.stringify(body).includes('FIXTURE_UPSTREAM_FAILURE'))
  assert.ok(!JSON.stringify(body).includes('synthetic-only'))
  assert.equal(await warehouseRequests(child), 1, 'configured failure must exercise one actual statement request')
})
