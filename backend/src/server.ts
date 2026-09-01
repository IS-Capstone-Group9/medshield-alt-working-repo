import path from 'node:path'
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { appendFile, readFile } from 'node:fs/promises'
import { config as loadDotenv } from 'dotenv'
import cors from 'cors'
import express, { NextFunction, Request, Response } from 'express'
import rateLimit from 'express-rate-limit'

import { verifyLocalLogin } from './localAuth'
import { startPythonServices } from './pythonServices'
import { createSession, revokeSessionToken, SessionUser, verifySessionToken } from './sessionAuth'
import { loadSnapshot } from './snapshot'
import {
  completeRequiredPasswordReset,
  getLinkedAccount,
  signInWithIdentifier,
  SupabaseServerSecretMissingError,
} from './supabaseIdentity'

function loadEnvironment(): void {
  const candidates = [
    process.env.MEDSHIELD_ENV_FILE,
    // Prefer the backend-specific file so server-only secrets are loaded when
    // a repository-level .env also exists.
    path.resolve(__dirname, '..', '.env'),
    path.resolve(process.cwd(), '.env'),
    path.resolve(__dirname, '..', '..', '.env'),
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

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10000, // Increased for local development to prevent lockouts
  message: '{"error": "Too many requests from this IP, please try again after 15 minutes"}',
  standardHeaders: true,
  legacyHeaders: false,
})

app.use(apiLimiter)

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

app.use((_, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  res.setHeader('Referrer-Policy', 'no-referrer-when-downgrade')
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

interface AuditLogEntry {
  username?: string
  action: string
  detail: string
  ip_address?: string
  user_agent?: string
  created_at: string
}

async function supabaseDbFetch(
  pathName: string,
  init: RequestInit,
  schema: string = 'medshield_identity'
): Promise<globalThis.Response> {
  const baseUrl = process.env.SUPABASE_URL?.replace(/\/$/, '')
  const serviceRoleKey =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    ''
  if (!baseUrl || !serviceRoleKey) {
    throw new Error('Supabase DB is not configured')
  }

  const headers = new globalThis.Headers(init.headers)
  headers.set('apikey', serviceRoleKey)
  // Supabase secret keys authenticate through apikey only; legacy
  // service-role JWTs still need the Authorization header.
  if (!serviceRoleKey.startsWith('sb_secret_')) {
    headers.set('Authorization', `Bearer ${serviceRoleKey}`)
  }
  headers.set('Accept-Profile', schema)
  headers.set('Content-Profile', schema)
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json')
  }

  return await fetch(`${baseUrl}/rest/v1${pathName}`, {
    ...init,
    headers,
  })
}

let lastAuditHash = '0000000000000000000000000000000000000000000000000000000000000000'

async function getLastAuditHash(): Promise<string> {
  const logPath = path.resolve(__dirname, '..', 'data', 'local_audit_logs.jsonl')
  if (!existsSync(logPath)) {
    return '0000000000000000000000000000000000000000000000000000000000000000'
  }
  try {
    const raw = await readFile(logPath, 'utf8')
    const lines = raw.trim().split('\n').filter(Boolean)
    if (lines.length > 0) {
      const last = JSON.parse(lines[lines.length - 1])
      if (last.entry_hash) return String(last.entry_hash)
    }
  } catch (err) {
    console.error('Error reading previous audit hash:', err)
  }
  return '0000000000000000000000000000000000000000000000000000000000000000'
}

async function persistAuditLog(rawEntry: {
  username: string
  action: string
  detail: string
  ip_address: string
  user_agent: string
  created_at: string
}): Promise<{ ok: boolean; entry_hash: string; previous_hash: string }> {
  const previous_hash = await getLastAuditHash()
  const hashPayload = `${previous_hash}:${rawEntry.created_at}:${rawEntry.username}:${rawEntry.action}:${rawEntry.detail}`
  const entry_hash = createHash('sha256').update(hashPayload).digest('hex')
  
  const entry = {
    ...rawEntry,
    previous_hash,
    entry_hash,
    tamper_evident: true
  }
  if (supabaseEnabled()) {
    try {
      const response = await supabaseDbFetch('/audit_logs', {
        method: 'POST',
        body: JSON.stringify(entry),
      })
      if (response.ok) {
        return { ok: true, entry_hash, previous_hash }
      }
      console.warn(`Supabase audit log write returned non-OK status: ${response.status}. Falling back to local file.`)
    } catch (err) {
      console.error('Failed to write audit log to Supabase. Falling back to local file.', err)
    }
  }

  // Fallback to local accounts/logs folder
  const logPath = path.resolve(__dirname, '..', 'data', 'local_audit_logs.jsonl')
  try {
    await appendFile(logPath, `${JSON.stringify(entry)}\n`, 'utf8')
  } catch (err) {
    console.error('Failed to write local audit log:', err)
  }

  return { ok: true, entry_hash, previous_hash }
}

async function getSupabaseAuthUser(token: string): Promise<SessionUser | null> {
  const account = await getLinkedAccount(token)
  if (!account) return null
  return {
    account_id: account.account_id,
    username: account.username,
    email: account.email,
    role: account.role,
    password_reset_required: account.password_reset_required,
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

async function authenticateRequest(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
  allowPasswordResetRequired: boolean,
) {
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
  if (user.password_reset_required && !allowPasswordResetRequired) {
    return res.status(403).json({
      error: 'A password change is required before accessing MedShield.',
      code: 'PASSWORD_RESET_REQUIRED',
    })
  }
  next()
}

function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  void authenticateRequest(req, res, next, false)
}

function requireAuthDuringPasswordReset(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  void authenticateRequest(req, res, next, true)
}

function requireRole(allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userRole = (req.user?.role || 'viewer').toLowerCase()
    const allowed = allowedRoles.map(r => r.toLowerCase())
    if (!allowed.includes(userRole) && !allowed.includes('admin')) {
      return res.status(403).json({
        error: `Access Denied: Action requires [${allowedRoles.join(', ')}] role clearance. Current role is '${userRole}'.`,
        code: 'FORBIDDEN_ROLE'
      })
    }
    next()
  }
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 8000): Promise<globalThis.Response> {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal as any,
    })
    clearTimeout(id)
    return response as globalThis.Response
  } catch (error) {
    clearTimeout(id)
    throw error
  }
}

async function analyticsJson(
  pathName: string,
  options?: RequestInit,
): Promise<{ status: number; body: unknown }> {
  const response: globalThis.Response = await fetchWithTimeout(`${analyticsServiceUrl}${pathName}`, options)
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

async function serviceGetJson(baseUrl: string, pathName: string, timeoutMs = 8000): Promise<unknown> {
  const response: globalThis.Response = await fetchWithTimeout(`${baseUrl}${pathName}`, {}, timeoutMs)
  if (!response.ok) {
    throw new Error(`Service at ${baseUrl}${pathName} returned status ${response.status}`)
  }
  return await response.json()
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

app.get('/api/dashboard_status', requireAuth, async (_req: Request, res: Response) => {
  const snapshot = await loadSnapshot()
  res.json(snapshot.data_status)
})

app.get('/api/monthly', requireAuth, async (req: Request, res: Response) => {
  const snapshot = await loadSnapshot()
  const year = String(req.query.year ?? '').trim()
  const rows = year
    ? snapshot.monthly.filter((row) => String(row.period ?? '').startsWith(year))
    : snapshot.monthly
  res.json(rows)
})

app.get('/api/by_area', requireAuth, async (req: Request, res: Response) => {
  const snapshot = await loadSnapshot()
  const year = typeof req.query.year === 'string' ? req.query.year : null
  if (year && snapshot.by_year_area && snapshot.by_year_area[year]) {
    return res.json(snapshot.by_year_area[year])
  }
  res.json(snapshot.by_area)
})

app.get('/api/by_year_area', requireAuth, async (_req: Request, res: Response) => {
  const snapshot = await loadSnapshot()
  res.json(snapshot.by_year_area ?? {})
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
app.options('/api/auth/me', (_req: Request, res: Response) => res.json({}))
app.options('/api/auth/logout', (_req: Request, res: Response) => res.json({}))
app.options('/api/auth/complete-password-reset', (_req: Request, res: Response) => res.json({}))

app.get('/api/auth/me', requireAuthDuringPasswordReset, (req: AuthenticatedRequest, res: Response) => {
  res.json({ user: req.user })
})

const authLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts. Try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
})

app.post('/api/auth/logout', requireAuthDuringPasswordReset, (req: AuthenticatedRequest, res: Response) => {
  if (req.accessToken) {
    if (req.authSource === 'supabase') {
      void revokeSupabaseToken(req.accessToken)
    } else {
      revokeSessionToken(req.accessToken)
    }
  }

  res.json({ ok: true })
})

app.post('/api/auth/login', authLoginLimiter, async (req: Request, res: Response) => {
  const username = String(req.body?.username ?? '').trim()
  // Passwords are opaque credentials; trimming would change valid leading or trailing spaces.
  const password = typeof req.body?.password === 'string' ? req.body.password : ''
  const remember = Boolean(req.body?.remember)

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' })
  }

  if (supabaseEnabled()) {
    try {
      const session = await signInWithIdentifier(username, password)
      if (!session) {
        return res.status(401).json({ error: 'Invalid username or password' })
      }
      return res.json({
        ...session,
        user: {
          account_id: session.user.account_id,
          username: session.user.username,
          email: session.user.email,
          role: session.user.role,
          password_reset_required: session.user.password_reset_required,
        },
      })
    } catch (error) {
      if (error instanceof SupabaseServerSecretMissingError) {
        return res.status(503).json({
          error: 'Account migration is not configured on the server. Ask an administrator to configure the Supabase server secret.',
          code: 'SUPABASE_SERVER_SECRET_REQUIRED',
        })
      }
      console.error('Login error:', error)
      return res.status(503).json({ error: 'Authentication service is unavailable' })
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

app.post(
  '/api/auth/complete-password-reset',
  requireAuthDuringPasswordReset,
  async (req: AuthenticatedRequest, res: Response) => {
    if (req.authSource !== 'supabase' || !req.accessToken) {
      return res.status(400).json({ error: 'Password migration applies only to Supabase Auth accounts' })
    }

    const currentPassword = String(req.body?.current_password ?? '')
    const newPassword = String(req.body?.new_password ?? '')
    const passwordComplexityRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/
    if (!passwordComplexityRegex.test(newPassword)) {
      return res.status(400).json({
        error: 'New password must be at least 12 characters and include uppercase, lowercase, number, and special characters.',
      })
    }
    if (currentPassword === newPassword) {
      return res.status(400).json({ error: 'New password must be different from the current password.' })
    }

    try {
      const updated = await completeRequiredPasswordReset(req.accessToken, currentPassword, newPassword)
      if (!updated) return res.status(401).json({ error: 'Current password is incorrect or reset is not required.' })
      await persistAuditLog({
        username: req.user?.username ?? 'unknown',
        action: 'PASSWORD_RESET_COMPLETED',
        detail: 'Required Supabase Auth migration password change completed.',
        ip_address: String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || ''),
        user_agent: String(req.headers['user-agent'] || ''),
        created_at: new Date().toISOString(),
      })
      return res.json({ ok: true, message: 'Password updated. Sign in again with your new password.' })
    } catch (error) {
      console.error('Required password reset failed:', error)
      return res.status(503).json({ error: 'Password update could not be completed. Please try again.' })
    }
  },
)

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

app.get('/api/dss/prescriptive', async (_req: Request, res: Response) => {
  try {
    const payload = await serviceGetJson(analyticsServiceUrl, '/dss/prescriptive')
    return res.json(payload)
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch prescriptive model data' })
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

app.get('/api/mcda_territories', requireAuth, async (_req: Request, res: Response) => {
  try {
    const payload = await serviceGetJson(analyticsServiceUrl, '/mcda_territories', 20000)
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

app.post('/api/audit', async (req: Request, res: Response) => {
  const token = bearerToken(req)
  let username = 'unauthenticated'
  if (token) {
    const user = verifySessionToken(token) || (supabaseEnabled() ? await getSupabaseAuthUser(token).catch(() => null) : null)
    if (user) {
      username = user.username
    }
  }

  const action = String(req.body?.action ?? '').trim()
  const detail = String(req.body?.detail ?? '').trim()

  if (!action || !detail) {
    return res.status(400).json({ error: 'Action and detail are required' })
  }

  const ipAddress = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '')
  const userAgent = String(req.headers['user-agent'] || '')

  const entry = {
    username,
    action,
    detail,
    ip_address: ipAddress,
    user_agent: userAgent,
    created_at: new Date().toISOString(),
  }

  await persistAuditLog(entry)
  res.json({ ok: true })
})

app.get('/api/audit', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const role = req.user?.role ?? 'viewer'
  if (role !== 'admin' && role !== 'manager') {
    return res.status(403).json({ error: 'Access denied: compliance auditor role required' })
  }

  if (supabaseEnabled()) {
    try {
      const response = await supabaseDbFetch('/audit_logs?order=created_at.desc&limit=100', {
        method: 'GET',
      })
      if (response.ok) {
        const data = await response.json()
        return res.json(data)
      }
      console.warn(`Supabase audit log read returned non-OK status: ${response.status}. Falling back to local file.`)
    } catch (err) {
      console.error('Failed to read audit logs from Supabase. Falling back to local file.', err)
    }
  }

  const logPath = path.resolve(__dirname, '..', 'data', 'local_audit_logs.jsonl')
  if (!existsSync(logPath)) {
    return res.json([])
  }
  try {
    const raw = await readFile(logPath, 'utf8')
    const lines = raw.trim().split('\n').filter(Boolean).map(line => JSON.parse(line))
    lines.reverse()
    res.json(lines.slice(0, 100))
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve local audit logs' })
  }
})

void startPythonServices(analyticsServiceUrl, productServiceUrl).catch((error) => {
  console.error('Python service auto-start failed:', error)
})

app.listen(port, () => {
  console.log(`MedShield TypeScript API listening on port ${port}`)
})
