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

async function supabaseRpc(functionName: string, params: Record<string, unknown>): Promise<unknown> {
  const url = `${process.env.SUPABASE_URL?.replace(/\/$/, '')}/rest/v1/rpc/${functionName}`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: process.env.SUPABASE_ANON_KEY ?? '',
      Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY ?? ''}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  })

  if (!response.ok) {
    const body = await response.text()
    const error = new Error(`Supabase RPC failed with status ${response.status}: ${body}`)
    ;(error as { response?: { status: number; body: string } }).response = {
      status: response.status,
      body,
    }
    throw error
  }

  return await response.json()
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
}

function bearerToken(req: Request): string | null {
  const header = req.header('authorization') ?? ''
  const [scheme, token] = header.split(/\s+/)
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return null
  }

  return token
}

function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = bearerToken(req)
  if (!token) {
    return res.status(401).json({ error: 'Authentication token is required' })
  }

  const user = verifySessionToken(token)
  if (!user) {
    return res.status(401).json({ error: 'Session expired or invalid' })
  }

  req.user = user
  req.accessToken = token
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

function analyticsFailure(res: Response, error: unknown): Response {
  console.error('Analytics service request failed:', error)
  return res.status(502).json({
    error: 'Analytics service is unavailable. The gateway tried to auto-start the Python service; check the backend terminal for Python dependency or port errors.',
  })
}

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'MedShield API gateway',
    architecture: 'typescript-api-gateway',
    source: supabaseEnabled() ? 'warehouse' : 'reference-export',
    runtime: 'typescript',
    auth_mode: supabaseEnabled() ? 'supabase-rpc-with-gateway-session' : 'local-session',
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
  const limit = Number(req.query.limit ?? 15)
  res.json(snapshot.top_products.slice(0, Number.isFinite(limit) ? limit : 15))
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
    revokeSessionToken(req.accessToken)
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
      const rows = (await supabaseRpc('verify_login', {
        p_username: username,
        p_password: password,
      })) as Array<Record<string, unknown>>

      if (!rows.length) {
        return res.status(401).json({ error: 'Invalid username or password' })
      }

      const account = rows[0]
      if (!account.is_active) {
        return res.status(403).json({ error: 'Account is disabled' })
      }

      const user = {
        account_id: Number(account.account_id),
        username: String(account.username),
        email: String(account.email),
        role: String(account.role),
      } as SessionUser

      return res.json(createSession(user, remember))
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
      const rows = (await supabaseRpc('create_account', {
        p_username: username,
        p_email: email,
        p_password: password,
        p_role: 'viewer',
      })) as Array<Record<string, unknown>>

      if (!rows.length) {
        return res.status(500).json({ error: 'Failed to create account' })
      }

      const result = rows[0]
      if (result.error_msg) {
        return res.status(409).json({ error: result.error_msg })
      }

      return res.status(201).json({
        account_id: result.account_id,
        username: result.username,
        email: result.email,
        role: result.role,
        message: 'Account created successfully',
      })
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

void startPythonServices(analyticsServiceUrl, productServiceUrl).catch((error) => {
  console.error('Python service auto-start failed:', error)
})

app.listen(port, () => {
  console.log(`MedShield TypeScript API listening on port ${port}`)
})
