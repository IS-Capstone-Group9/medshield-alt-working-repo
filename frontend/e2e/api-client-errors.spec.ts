import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import ts from 'typescript'

async function client(response: Response) {
  const compiled = ts.transpileModule(await readFile(path.resolve('services/api/api-client.ts'), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText
  const compiledModule = { exports: {} as any }
  new Function('require', 'module', 'exports', 'fetch', compiled)((name: string) => {
    if (name === '@/lib/supabase/client') return { isSupabaseBrowserConfigured: () => false }
    if (name === '@/lib/auth-tokens') return { getStoredToken: () => 'synthetic-test-token' }
    throw new Error('Unexpected dependency: ' + name)
  }, compiledModule, compiledModule.exports, async () => response)
  return compiledModule.exports
}

test('API failures retain status, endpoint and gateway reason without query parameters', async () => {
  const api = await client(Response.json({ error: 'Authentication service is unavailable', code: 'AUTHENTICATION_UNAVAILABLE' }, { status: 503 }))
  const error = await api.getJson('/api/monthly?private_filter=synthetic').catch((failure: unknown) => failure)
  expect(error).toBeInstanceOf(api.ApiRequestError)
  expect(error.status).toBe(503)
  expect(error.code).toBe('AUTHENTICATION_UNAVAILABLE')
  expect(error.path).toBe('/api/monthly')
  expect(error.message).toContain('Authentication service is unavailable')
  expect(error.message).not.toContain('private_filter')
})

test('non-JSON and empty failures keep their HTTP status; successful JSON is unchanged', async () => {
  for (const response of [new Response('<html>Unavailable</html>', { status: 503, statusText: 'Service Unavailable' }), new Response(null, { status: 502 })]) {
    const api = await client(response)
    await expect(api.getJson('/api/monthly')).rejects.toMatchObject({ name: 'ApiRequestError', status: response.status, path: '/api/monthly' })
  }
  const api = await client(Response.json({ observed: 0, missing: null }))
  await expect(api.getJson('/api/monthly')).resolves.toEqual({ observed: 0, missing: null })
})
