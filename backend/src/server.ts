import path from 'node:path'
import { existsSync } from 'node:fs'
import { config as loadDotenv } from 'dotenv'
import cors from 'cors'
import express, { NextFunction, Request, Response } from 'express'

import { createLocalAccount, verifyLocalLogin } from './localAuth'
import { startPythonServices } from './pythonServices'
import { createSession, revokeSessionToken, SessionUser, verifySessionToken } from './sessionAuth'
import { loadSnapshot } from './snapshot'

function loadEnvironment(): void {
  const candidates = [
    process.env.MEDSHIELD_ENV_FILE,
    path.resolve(__dirname, '..', '..', '.env'),
    path.resolve(process.cwd(), '.env'),
  ].filter((entry): entry is string => Boolean(entry))

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      loadDotenv({ path: candidate })
      break
    }
  }
}

loadEnvironment()

const app = express()
const port = Number(process.env.PORT ?? '5000')
const analyticsServiceUrl = (process.env.ANALYTICS_SERVICE_URL ?? 'http://localhost:5101').replace(
  /\/$/,
  '',
)
const productServiceUrl = (process.env.PRODUCT_SERVICE_URL ?? 'http://localhost:5102').replace(
  /\/$/,
  '',
)

app.use(cors())
app.use(express.json())

let authFallbackWarningShown = false

function warnAuthFallback(action: 'login' | 'signup'): void {
  if (authFallbackWarningShown) {
    return
  }

  authFallbackWarningShown = true
  console.warn(
    `Supabase auth unavailable, using local auth store for ${action}. ` +
      'For local development set USE_SUPABASE=false, or configure SUPABASE_URL and SUPABASE_ANON_KEY.',
  )
}

function envBool(name: string, defaultValue = false): boolean {
  const value = process.env[name]
  if (!value) {
    return defaultValue
  }

  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase())
}

function supabaseEnabled(): boolean {
  return envBool('USE_SUPABASE', true) && Boolean(process.env.SUPABASE_URL?.trim()) && Boolean(process.env.SUPABASE_ANON_KEY?.trim())
}

function authBackendUnavailable(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false
  }

  const response = (error as { response?: { status: number; body: string } }).response
  if (!response) {
    return false
  }

  const body = response.body.toLowerCase()
  if (body.includes('invalid api key') || body.includes('apikey') && body.includes('invalid')) {
    return true
  }

  return [401, 403, 429, 502, 503, 504].includes(response.status)
}

app.use((_, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  next()
})

interface AuthenticatedRequest extends Request {
  user?: SessionUser
  accessToken?: string
  authSource?: 'local' | 'supabase'
}

function bearerToken(req: Request): string | null {
  const header = req.header('authorization') ?? ''
  const [scheme, token] = header.split(/\s+/)
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return null
  }

  return token
}

type SupabaseAuthUser = {
  id: string
  email?: string
  app_metadata?: {
    role?: string
    medshield_role?: string
  }
}

function toSessionUserFromSupabase(user: SupabaseAuthUser): SessionUser {
  const email = user.email ?? ''
  return {
    account_id: 0,
    username: email ? email.split('@')[0] : user.id,
    email,
    role: user.app_metadata?.medshield_role ?? user.app_metadata?.role ?? 'viewer',
  }
}

async function supabaseAuthFetch(pathName: string, init: RequestInit): Promise<globalThis.Response> {
  const baseUrl = process.env.SUPABASE_URL?.replace(/\/$/, '')
  const anonKey = process.env.SUPABASE_ANON_KEY ?? ''
  if (!baseUrl || !anonKey) {
    throw new Error('Supabase Auth is not configured')
  }

  const headers = new globalThis.Headers(init.headers)
  headers.set('apikey', anonKey)
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json')
  }

  return fetch(`${baseUrl}/auth/v1${pathName}`, {
    ...init,
    headers,
  })
}

async function getSupabaseAuthUser(token: string): Promise<SessionUser | null> {
  const response = await supabaseAuthFetch('/user', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    return null
  }

  const user = (await response.json()) as SupabaseAuthUser
  if (!user.id) {
    return null
  }

  return toSessionUserFromSupabase(user)
}

async function signInWithSupabasePassword(email: string, password: string): Promise<{
  access_token: string
  token_type: 'Bearer'
  expires_at: string
  user: SessionUser
} | null> {
  const response = await supabaseAuthFetch('/token?grant_type=password', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })

  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>
  if (!response.ok) {
    if (response.status >= 500 || response.status === 429) {
      const error = new Error(`Supabase Auth sign-in failed with status ${response.status}`)
      ;(error as { response?: { status: number; body: string } }).response = {
        status: response.status,
        body: JSON.stringify(body),
      }
      throw error
    }
    return null
  }

  const authUser = body.user as SupabaseAuthUser | undefined
  const expiresIn = Number(body.expires_in ?? 3600)
  if (!body.access_token || !authUser?.id) {
    return null
  }

  return {
    access_token: String(body.access_token),
    token_type: 'Bearer',
    expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
    user: toSessionUserFromSupabase(authUser),
  }
}

async function signUpWithSupabase(email: string, password: string): Promise<{
  account_id: number
  username: string
  email: string
  role: string
  message: string
} | null> {
  const response = await supabaseAuthFetch('/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })

  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>
  if (!response.ok) {
    if (response.status >= 500 || response.status === 429) {
      const error = new Error(`Supabase Auth signup failed with status ${response.status}`)
      ;(error as { response?: { status: number; body: string } }).response = {
        status: response.status,
        body: JSON.stringify(body),
      }
      throw error
    }
    return null
  }

  const authUser = (body.user ?? body) as SupabaseAuthUser
  if (!authUser.id) {
    return null
  }

  const user = toSessionUserFromSupabase(authUser)
  return {
    account_id: user.account_id,
    username: user.username,
    email: user.email,
    role: user.role,
    message: 'Account created successfully. Check the Supabase Auth email settings for confirmation requirements.',
  }
}

async function revokeSupabaseToken(token: string): Promise<void> {
  await supabaseAuthFetch('/logout', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }).catch(() => undefined)
}

async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = bearerToken(req)
  if (!token) {
    return res.status(401).json({ error: 'Authentication token is required' })
  }

  let user = verifySessionToken(token)
  let authSource: AuthenticatedRequest['authSource'] = user ? 'local' : undefined
  if (!user && supabaseEnabled()) {
    try {
      user = await getSupabaseAuthUser(token)
      authSource = user ? 'supabase' : undefined
    } catch (error) {
      console.error('Supabase token validation failed:', error)
      return res.status(503).json({ error: 'Authentication service is unavailable' })
    }
  }

  if (!user) {
    return res.status(401).json({ error: 'Session expired or invalid' })
  }

  req.user = user
  req.accessToken = token
  req.authSource = authSource
  next()
}

async function analyticsJson(
  pathName: string,
  options?: RequestInit,
): Promise<{ status: number; body: unknown }> {
  const response = await fetch(`${analyticsServiceUrl}${pathName}`, options)
  const text = await response.text()
  let body: unknown = {}
  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      body = { error: text }
    }
  }
  return { status: response.status, body }
}

async function serviceGetJson(baseUrl: string, pathName: string): Promise<unknown> {
  const response = await fetch(`${baseUrl}${pathName}`)
  if (!response.ok) {
    throw new Error(`Service at ${baseUrl}${pathName} returned status ${response.status}`)
  }
  return await response.json()
}

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'MedShield API gateway',
    architecture: 'typescript-api-gateway',
    source: supabaseEnabled() ? 'warehouse' : 'reference-export',
    runtime: 'typescript',
    auth_mode: supabaseEnabled() ? 'supabase-auth-jwt' : 'local-session',
    analytics_services: {
      analytics: analyticsServiceUrl,
      product: productServiceUrl,
    },
  })
})

app.get('/api/summary', requireAuth, async (_req: Request, res: Response) => {
  const snapshot = await loadSnapshot()
  res.json(snapshot.totals)
})

app.get('/api/monthly', requireAuth, async (req: Request, res: Response) => {
  const snapshot = await loadSnapshot()
  const year = String(req.query.year ?? '').trim()
  const rows = year
    ? snapshot.monthly.filter((row) => String(row.period ?? '').startsWith(year))
    : snapshot.monthly
  res.json(rows)
})

app.get('/api/by_area', requireAuth, async (_req: Request, res: Response) => {
  const snapshot = await loadSnapshot()
  res.json(snapshot.by_area)
})

app.get('/api/products', requireAuth, async (req: Request, res: Response) => {
  const snapshot = await loadSnapshot()
  const rawLimit = req.query.limit ?? 15
  const limit = Number(rawLimit)
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    return res.status(400).json({ error: 'limit must be an integer between 1 and 100' })
  }
  res.json(snapshot.top_products.slice(0, limit))
})

app.get('/api/year_summary', requireAuth, async (_req: Request, res: Response) => {
  const snapshot = await loadSnapshot()
  res.json(snapshot.year_summary)
})

app.get('/api/seasonality', requireAuth, async (_req: Request, res: Response) => {
  const snapshot = await loadSnapshot()
  res.json(snapshot.seasonality)
})

app.get('/api/forecasts', requireAuth, async (_req: Request, res: Response) => {
  const snapshot = await loadSnapshot()
  res.json(snapshot.forecasts ?? [])
})

app.get('/api/external_signals', requireAuth, async (_req: Request, res: Response) => {
  const snapshot = await loadSnapshot()
  res.json(snapshot.external_signals ?? [])
})

app.get('/api/inventory_recommendations', requireAuth, async (_req: Request, res: Response) => {
  const snapshot = await loadSnapshot()
  res.json(snapshot.inventory_recommendations ?? [])
})

app.get('/api/regional_priorities', requireAuth, async (_req: Request, res: Response) => {
  const snapshot = await loadSnapshot()
  res.json(snapshot.regional_priorities ?? [])
})

app.get('/api/area_clusters', requireAuth, async (_req: Request, res: Response) => {
  const snapshot = await loadSnapshot()
  res.json(snapshot.area_clusters ?? [])
})

app.get('/api/product_priorities', requireAuth, async (_req: Request, res: Response) => {
  const snapshot = await loadSnapshot()
  res.json(snapshot.product_priorities ?? [])
})

app.get('/api/allocation_recommendations', requireAuth, async (_req: Request, res: Response) => {
  const snapshot = await loadSnapshot()
  res.json(snapshot.allocation_recommendations ?? [])
})

app.get('/api/product_region_matches', requireAuth, async (_req: Request, res: Response) => {
  const snapshot = await loadSnapshot()
  res.json(snapshot.product_region_matches ?? [])
})

app.get('/api/decision_alerts', requireAuth, async (_req: Request, res: Response) => {
  const snapshot = await loadSnapshot()
  res.json(snapshot.decision_alerts ?? [])
})

app.get('/api/model_evaluation', requireAuth, async (_req: Request, res: Response) => {
  const snapshot = await loadSnapshot()
  res.json(snapshot.model_evaluation ?? [])
})

app.get('/api/sales/status', requireAuth, async (_req: Request, res: Response) => {
  try {
    const result = await analyticsJson('/sales/status')
    return res.status(result.status).json(result.body)
  } catch (error) {
    return analyticsFailure(res, error)
  }
})

app.get('/api/sales/transactions', requireAuth, async (req: Request, res: Response) => {
  const params = new URLSearchParams()
  for (const name of ['year', 'page', 'page_size', 'search', 'quality_status']) {
    const value = req.query[name]
    if (typeof value === 'string' && value.trim()) params.set(name, value.trim())
  }
  try {
    const result = await analyticsJson(`/sales/transactions?${params.toString()}`)
    return res.status(result.status).json(result.body)
  } catch (error) {
    return analyticsFailure(res, error)
  }
})

app.get('/api/sales/summary', requireAuth, async (req: Request, res: Response) => {
  const params = new URLSearchParams()
  for (const name of ['year', 'search', 'quality_status']) {
    const value = req.query[name]
    if (typeof value === 'string' && value.trim()) params.set(name, value.trim())
  }
  try {
    const result = await analyticsJson(`/sales/summary?${params.toString()}`)
    return res.status(result.status).json(result.body)
  } catch (error) {
    return analyticsFailure(res, error)
  }
})

app.post(
  '/api/sales/upload',
  requireAuth,
  express.raw({ type: () => true, limit: '30mb' }),
  async (req: Request, res: Response) => {
    const fileName = String(req.query.file_name ?? '').trim()
    if (!/\.(xlsx|csv)$/i.test(fileName)) {
      return res.status(400).json({ error: 'A .xlsx or .csv file_name is required' })
    }
    const content = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0)
    if (!content.length) {
      return res.status(400).json({ error: 'Uploaded file is empty' })
    }
    try {
      const result = await analyticsJson(
        `/sales/ingest?file_name=${encodeURIComponent(path.basename(fileName))}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/octet-stream' },
          body: Uint8Array.from(content).buffer,
        },
      )
      return res.status(result.status).json(result.body)
    } catch (error) {
      return analyticsFailure(res, error)
    }
  },
)

app.get('/api/weather/effects', requireAuth, async (req: Request, res: Response) => {
  const params = new URLSearchParams()
  if (typeof req.query.year === 'string') params.set('year', req.query.year)
  if (typeof req.query.area === 'string') params.set('area', req.query.area)
  if (typeof req.query.grain === 'string') params.set('grain', req.query.grain)
  try {
    const result = await analyticsJson(`/weather/effects?${params.toString()}`)
    return res.status(result.status).json(result.body)
  } catch (error) {
    return analyticsFailure(res, error)
  }
})

app.post('/api/weather/refresh', requireAuth, async (req: Request, res: Response) => {
  try {
    const result = await analyticsJson('/weather/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body ?? {}),
    })
    return res.status(result.status).json(result.body)
  } catch (error) {
    return analyticsFailure(res, error)
  }
})

app.options('/api/auth/login', (_req: Request, res: Response) => res.json({}))
app.options('/api/auth/signup', (_req: Request, res: Response) => res.json({}))
app.options('/api/auth/me', (_req: Request, res: Response) => res.json({}))
app.options('/api/auth/logout', (_req: Request, res: Response) => res.json({}))

app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  res.json({ user: req.user })
})

app.post('/api/auth/logout', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (req.accessToken) {
    if (req.authSource === 'supabase') {
      void revokeSupabaseToken(req.accessToken)
    } else {
      revokeSessionToken(req.accessToken)
    }
  }

  res.json({ ok: true })
})

app.post('/api/auth/login', async (req: Request, res: Response) => {
  const username = String(req.body?.username ?? '').trim()
  const password = String(req.body?.password ?? '').trim()
  const remember = Boolean(req.body?.remember)

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' })
  }

  if (supabaseEnabled()) {
    try {
      const session = await signInWithSupabasePassword(username, password)
      if (!session) {
        return res.status(401).json({ error: 'Invalid username or password' })
      }
      return res.json(session)
    } catch (error) {
      if (!authBackendUnavailable(error)) {
        console.error('Login error:', error)
        return res.status(500).json({ error: 'Authentication service error' })
      }

      warnAuthFallback('login')
    }
  }

  const result = await verifyLocalLogin({ username, password })
  if (result.error === 'Account is disabled') {
    return res.status(403).json({ error: 'Account is disabled' })
  }

  if (!result.account) {
    return res.status(401).json({ error: 'Invalid username or password' })
  }

  return res.json(createSession(result.account, remember))
})

app.post('/api/auth/signup', async (req: Request, res: Response) => {
  const username = String(req.body?.username ?? '').trim()
  const email = String(req.body?.email ?? '').trim()
  const password = String(req.body?.password ?? '').trim()

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email and password are required' })
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' })
  }

  if (supabaseEnabled()) {
    try {
      const result = await signUpWithSupabase(email, password)
      if (!result) {
        return res.status(500).json({ error: 'Failed to create account' })
      }
      return res.status(201).json(result)
    } catch (error) {
      if (!authBackendUnavailable(error)) {
        console.error('Signup error:', error)
        return res.status(500).json({ error: 'Account creation failed' })
      }

      warnAuthFallback('signup')
    }
  }

  const result = await createLocalAccount({ username, email, password, role: 'viewer' })
  if (result.error) {
    return res.status(409).json({ error: result.error })
  }

  return res.status(201).json({
    account_id: result.account?.account_id,
    username: result.account?.username,
    email: result.account?.email,
    role: result.account?.role,
    message: 'Account created successfully',
  })
})

app.get('/api/classify_medicine', async (req: Request, res: Response) => {
  const name = String(req.query.name ?? '').trim()
  try {
    const payload = await serviceGetJson(productServiceUrl, `/classify_medicine?name=${encodeURIComponent(name)}`)
    return res.json(payload)
  } catch (error) {
    return res.status(500).json({ error: 'Failed to classify medicine' })
  }
})

app.get('/api/therapeutic_categories', async (_req: Request, res: Response) => {
  try {
    const payload = await serviceGetJson(productServiceUrl, '/therapeutic_categories')
    return res.json(payload)
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch therapeutic categories' })
  }
})

app.get('/api/procurement_orders', async (_req: Request, res: Response) => {
  try {
    const payload = await serviceGetJson(productServiceUrl, '/procurement_orders')
    return res.json(payload)
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch procurement order recommendations' })
  }
})

app.get('/api/seasonal_epidemic_matrix', async (_req: Request, res: Response) => {
  try {
    const payload = await serviceGetJson(analyticsServiceUrl, '/seasonal_epidemic_matrix')
    return res.json(payload)
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch seasonal epidemic matrix' })
  }
})

app.get('/api/seasonal_restock_detail', async (req: Request, res: Response) => {
  try {
    const seasonId = req.query.season_id ? String(req.query.season_id) : 'monsoon'
    const payload = await serviceGetJson(analyticsServiceUrl, `/seasonal_restock_detail?season_id=${seasonId}`)
    res.json(payload)
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

app.get('/api/model_summary', async (_req: Request, res: Response) => {
  try {
    const payload = await serviceGetJson(analyticsServiceUrl, '/model_summary')
    return res.json(payload)
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch model summary' })
  }
})

app.get('/api/mcda_territories', async (_req: Request, res: Response) => {
  try {
    const payload = await serviceGetJson(analyticsServiceUrl, '/mcda_territories')
    return res.json(payload)
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch MCDA territory rankings' })
  }
})

app.get('/api/eoq_scenarios', async (_req: Request, res: Response) => {
  try {
    const payload = await serviceGetJson(analyticsServiceUrl, '/eoq_scenarios')
    return res.json(payload)
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch EOQ scenarios' })
  }
})

void startPythonServices(analyticsServiceUrl, productServiceUrl).catch((error) => {
  console.error('Python service auto-start failed:', error)
})

app.listen(port, () => {
  console.log(`MedShield TypeScript API listening on port ${port}`)
})
