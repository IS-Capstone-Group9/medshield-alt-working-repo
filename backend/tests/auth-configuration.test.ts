import assert from 'node:assert/strict'
import test from 'node:test'
import { authenticateSelectedMode, AuthenticationConfigurationError, requireLocalAuthentication, resolveAuthenticationMode } from '../src/authConfiguration'
import { verifyLocalLogin } from '../src/localAuth'
import { createSession, revokeSessionToken, verifySessionToken } from '../src/sessionAuth'

test('production and incomplete Supabase configuration cannot fall back to demo auth', () => {
  for (const env of [
    { NODE_ENV: 'production', USE_SUPABASE: 'true' },
    { NODE_ENV: 'production', USE_SUPABASE: 'false' },
    { NODE_ENV: 'production', SUPABASE_URL: 'https://identity.example' },
    { NODE_ENV: 'development' },
    { NODE_ENV: 'development', USE_SUPABASE: 'typo' },
  ]) assert.throws(() => resolveAuthenticationMode(env), AuthenticationConfigurationError)
  assert.equal(resolveAuthenticationMode({ NODE_ENV: 'production', SUPABASE_URL: 'https://identity.example', SUPABASE_ANON_KEY: 'public-key' }), 'supabase')
  assert.equal(resolveAuthenticationMode({ NODE_ENV: 'development', USE_SUPABASE: 'false' }), 'local')
})

test('local accounts require an explicit development mode before reading or provisioning accounts', async () => {
  assert.throws(() => requireLocalAuthentication({ NODE_ENV: 'production', USE_SUPABASE: 'false' }), AuthenticationConfigurationError)
  const prior = { NODE_ENV: process.env.NODE_ENV, USE_SUPABASE: process.env.USE_SUPABASE }
  try {
    process.env.NODE_ENV = 'production'
    process.env.USE_SUPABASE = 'false'
    await assert.rejects(verifyLocalLogin({ username: 'admin', password: 'medshield2025' }), AuthenticationConfigurationError)
    assert.throws(() => createSession({ account_id: 1, username: 'admin', email: 'admin@example', role: 'admin' }), AuthenticationConfigurationError)
  } finally {
    for (const [key, value] of Object.entries(prior)) value === undefined ? delete process.env[key] : process.env[key] = value
  }
})

test('Supabase mode never consults or accepts the local token validator', async () => {
  let localCalls = 0
  let supabaseCalls = 0
  const validators = {
    local: () => { localCalls += 1; return { username: 'demo-admin' } },
    supabase: async (token: string) => { supabaseCalls += 1; return token === 'valid-jwt' ? { username: 'real-user' } : null },
  }
  assert.equal(await authenticateSelectedMode('supabase', 'local-session-token', validators), null)
  assert.deepEqual(await authenticateSelectedMode('supabase', 'valid-jwt', validators), { username: 'real-user' })
  assert.equal(localCalls, 0)
  assert.equal(supabaseCalls, 2)
  assert.deepEqual(await authenticateSelectedMode('local', 'development-token', validators), { username: 'demo-admin' })
  assert.equal(localCalls, 1)
  assert.equal(supabaseCalls, 2)
})

test('intentional development sessions work, revoke, and cannot be verified in production', () => {
  const prior = { NODE_ENV: process.env.NODE_ENV, USE_SUPABASE: process.env.USE_SUPABASE }
  try {
    process.env.NODE_ENV = 'development'
    process.env.USE_SUPABASE = 'false'
    const user = { account_id: 1, username: 'planner', email: 'planner@example', role: 'analyst' }
    const session = createSession(user)
    assert.deepEqual(verifySessionToken(session.access_token), user)
    assert.equal(verifySessionToken('invalid'), null)
    process.env.NODE_ENV = 'production'
    assert.throws(() => verifySessionToken(session.access_token), AuthenticationConfigurationError)
    process.env.NODE_ENV = 'development'
    revokeSessionToken(session.access_token)
    assert.equal(verifySessionToken(session.access_token), null)
  } finally {
    for (const [key, value] of Object.entries(prior)) value === undefined ? delete process.env[key] : process.env[key] = value
  }
})
