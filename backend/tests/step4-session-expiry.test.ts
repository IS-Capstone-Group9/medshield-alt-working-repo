import assert from 'node:assert/strict'
import test from 'node:test'
import { createSession, verifySessionToken } from '../src/sessionAuth'

// This is isolated development-session evidence, never a real Supabase expiry claim.
for (const remember of [false, true]) {
  test(`development ${remember ? 'remembered' : 'ordinary'} session denies access at the exact expiry boundary`, t => {
    const prior = { NODE_ENV: process.env.NODE_ENV, USE_SUPABASE: process.env.USE_SUPABASE }
    t.after(() => {
      for (const [key, value] of Object.entries(prior)) {
        if (value === undefined) delete process.env[key]
        else process.env[key] = value
      }
    })
    process.env.NODE_ENV = 'development'
    process.env.USE_SUPABASE = 'false'
    let now = Date.UTC(2026, 10, 1)
    t.mock.method(Date, 'now', () => now)
    const user = { account_id: 901, username: 'expiry-fixture', email: 'fixture@example.invalid', role: 'viewer' }
    const session = createSession(user, remember)
    const expiresAt = Date.parse(session.expires_at)
    assert.equal(expiresAt - now, (remember ? 30 * 24 : 8) * 60 * 60 * 1000)
    now = expiresAt - 1
    assert.deepEqual(verifySessionToken(session.access_token), user)
    now = expiresAt
    assert.equal(verifySessionToken(session.access_token), null)
    now++
    assert.equal(verifySessionToken(session.access_token), null)
  })
}
