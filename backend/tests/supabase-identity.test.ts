import assert from 'node:assert/strict'
import test from 'node:test'
import { getLinkedAccount, signInWithIdentifier } from '../src/supabaseIdentity'

test('identity dependency recovery never bypasses current token and account checks', async t => {
  const keys = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SECRET_KEY'] as const
  const prior = Object.fromEntries(keys.map(key => [key, process.env[key]]))
  const originalFetch = globalThis.fetch
  Object.assign(process.env, { SUPABASE_URL: 'https://identity.fixture.invalid', SUPABASE_ANON_KEY: 'synthetic-public', SUPABASE_SECRET_KEY: 'sb_secret_synthetic' })
  t.after(() => {
    globalThis.fetch = originalFetch
    for (const key of keys) prior[key] === undefined ? delete process.env[key] : process.env[key] = prior[key]
  })
  const account = { account_id: 1, auth_user_id: 'fixture-user', username: 'fixture', email: 'fixture@example.invalid', role: 'viewer', is_active: true, password_reset_required: false }
  const reset = () => new TypeError('fetch failed', { cause: Object.assign(new Error('read ECONNRESET'), { code: 'ECONNRESET' }) })

  for (const failingStage of ['user', 'accounts']) {
    await t.test(`recovers two connection resets at ${failingStage} without skipping either check`, async () => {
      let userCalls = 0, accountCalls = 0
      globalThis.fetch = async (input, init) => {
        assert.ok(init?.signal instanceof AbortSignal, 'Each identity read needs a timeout')
        const isUser = new URL(String(input)).pathname === '/auth/v1/user'
        const calls = isUser ? ++userCalls : ++accountCalls
        if ((isUser ? 'user' : 'accounts') === failingStage && calls < 3) throw reset()
        return Response.json(isUser ? { id: 'fixture-user' } : [account])
      }
      assert.deepEqual(await getLinkedAccount('synthetic-token'), account)
      assert.equal(userCalls, failingStage === 'user' ? 3 : 1)
      assert.equal(accountCalls, failingStage === 'accounts' ? 3 : 1)
    })
  }
  await t.test('persistent transport failure exhausts three attempts and denies access', async () => {
    let calls = 0
    globalThis.fetch = async () => { calls++; throw reset() }
    await assert.rejects(getLinkedAccount('synthetic-token'), /fetch failed/)
    assert.equal(calls, 3)
  })
  await t.test('attempt timeout and interrupted response body recover within the same bounded policy', async () => {
    for (const failure of ['timeout', 'body-timeout', 'body']) {
      let calls = 0
      globalThis.fetch = async input => {
        if (new URL(String(input)).pathname !== '/auth/v1/user') return Response.json([account])
        calls++
        if (calls === 1) {
          if (failure === 'timeout') throw new DOMException('Synthetic timeout', 'TimeoutError')
          if (failure === 'body-timeout') throw new DOMException('Synthetic body timeout', 'AbortError')
          return new Response(new ReadableStream({ start(controller) { controller.error(reset()) } }))
        }
        return Response.json({ id: 'fixture-user' })
      }
      assert.deepEqual(await getLinkedAccount('synthetic-token'), account)
      assert.equal(calls, 2)
    }
  })
  await t.test('temporary upstream 503 recovers; persistent 503 is unavailable, never an invalid session', async () => {
    let calls = 0
    globalThis.fetch = async input => {
      if (new URL(String(input)).pathname !== '/auth/v1/user') return Response.json([account])
      calls++
      return calls < 3 ? Response.json({}, { status: 503 }) : Response.json({ id: 'fixture-user' })
    }
    assert.deepEqual(await getLinkedAccount('synthetic-token'), account)
    assert.equal(calls, 3)
    calls = 0
    globalThis.fetch = async () => { calls++; return Response.json({}, { status: 503 }) }
    await assert.rejects(getLinkedAccount('synthetic-token'), /503/)
    assert.equal(calls, 3)
  })
  for (const status of [401, 403]) {
    await t.test(`invalid session ${status} is denied once without retry or account lookup`, async () => {
      let calls = 0
      globalThis.fetch = async () => { calls++; return Response.json({}, { status }) }
      assert.equal(await getLinkedAccount('synthetic-token'), null)
      assert.equal(calls, 1)
    })
  }
  await t.test('later requests revalidate active status and linked role instead of caching authority', async () => {
    let current = { ...account }
    globalThis.fetch = async input => Response.json(new URL(String(input)).pathname === '/auth/v1/user' ? { id: 'fixture-user' } : [current])
    assert.equal((await getLinkedAccount('synthetic-token'))?.role, 'viewer')
    current = { ...account, role: 'analyst' }
    assert.equal((await getLinkedAccount('synthetic-token'))?.role, 'analyst')
    current.is_active = false
    assert.equal(await getLinkedAccount('synthetic-token'), null)
  })
  await t.test('permission and malformed responses fail without automatic retries', async () => {
    for (const response of [Response.json({}, { status: 403 }), new Response('invalid json')]) {
      let calls = 0
      globalThis.fetch = async input => {
        if (new URL(String(input)).pathname === '/auth/v1/user') return Response.json({ id: 'fixture-user' })
        calls++; return response
      }
      await assert.rejects(getLinkedAccount('synthetic-token'))
      assert.equal(calls, 1)
    }
  })
  await t.test('password sign-in POST is never replayed on transport failure', async () => {
    let calls = 0
    globalThis.fetch = async input => {
      if (new URL(String(input)).pathname === '/rest/v1/rpc/resolve_login_identifier') return Response.json([account])
      calls++; throw reset()
    }
    await assert.rejects(signInWithIdentifier('fixture', 'synthetic-password'), /fetch failed/)
    assert.equal(calls, 1)
  })
})
