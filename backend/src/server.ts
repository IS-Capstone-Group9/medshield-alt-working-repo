import path from 'node:path'
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { appendFile, readFile } from 'node:fs/promises'
import { config as loadDotenv } from 'dotenv'
import cors from 'cors'
import express, { NextFunction, Request, Response } from 'express'
import rateLimit from 'express-rate-limit'

import { verifyLocalLogin } from './localAuth'
import {
  databricksConfigured,
  getDatabricksConnectionStatus,
  getDatabricksExternalConnectionStatus,
} from './databricks'
import {
  DatabricksDashboardInputError,
  DatabricksSourceUnavailableError,
  getDatabricksExternalRegression,
  getDatabricksForecastValidation,
  getDatabricksPlanningShortlist,
  getDatabricksSalesHeatmap,
  getDatabricksSalesSectors,
  getDatabricksSalesStatus,
  getDatabricksSalesSummary,
  getDatabricksSalesTransactions,
  getDatabricksWeatherEffects,
  solveDatabricksPlanningScenario,
} from './databricksDashboard'
import {
  DatabricksYearlySyncInProgressError,
  DatabricksYearlySyncValidationError,
  synchronizeDatabricksYearlyCandidate,
} from './databricksYearlySync'
import { createSession, revokeSessionToken, SessionUser, verifySessionToken } from './sessionAuth'
import { loadSnapshot } from './snapshot'
import {
  completeRequiredPasswordReset,
  getLinkedAccount,
  signInWithIdentifier,
  SupabaseServerSecretMissingError,
} from './supabaseIdentity'
import { SupabaseWarehouseError, supabaseWarehouseConfigured } from './supabaseWarehouse'

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

const databricksYearlySyncLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    error: 'Too many Databricks yearly synchronization requests. Try again later.',
    code: 'DATABRICKS_YEARLY_SYNC_RATE_LIMITED',
  },
  standardHeaders: true,
  legacyHeaders: false,
})

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
    if (userRole !== 'admin' && !allowed.includes(userRole)) {
      return res.status(403).json({
        error: `Access Denied: Action requires [${allowedRoles.join(', ')}] role clearance. Current role is '${userRole}'.`,
        code: 'FORBIDDEN_ROLE'
      })
    }
    next()
  }
}

function databricksDashboardFailure(res: Response, error: unknown): Response {
  if (error instanceof DatabricksDashboardInputError) {
    return res.status(400).json({ error: error.message, code: 'INVALID_DATABRICKS_QUERY' })
  }
  if (error instanceof DatabricksSourceUnavailableError) {
    return res.status(503).json({ error: error.message, code: 'DATABRICKS_SOURCE_UNAVAILABLE' })
  }
  console.error('Databricks dashboard query failed:', error)
  return res.status(502).json({
    error: 'Live Databricks dashboard data is unavailable. No local or mock fallback was used.',
    code: 'DATABRICKS_QUERY_FAILED',
  })
}

async function withDashboardSnapshot(
  res: Response,
  send: (snapshot: Awaited<ReturnType<typeof loadSnapshot>>) => Response,
): Promise<Response> {
  try {
    return send(await loadSnapshot())
  } catch (error) {
    return databricksDashboardFailure(res, error)
  }
}

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'MedShield API gateway',
    architecture: 'typescript-api-gateway',
    source: 'databricks',
    runtime: 'typescript',
    auth_mode: supabaseEnabled() ? 'supabase-auth-jwt' : 'local-session',
    dashboard_fallback: false,
  })
})

app.get(
  '/api/integrations/databricks/status',
  requireAuth,
  requireRole(['admin']),
  async (_req: AuthenticatedRequest, res: Response) => {
    if (!databricksConfigured()) {
      return res.status(503).json({
        connected: false,
        error: 'Databricks is not configured on the MedShield backend.',
        code: 'DATABRICKS_NOT_CONFIGURED',
      })
    }

    try {
      return res.json(await getDatabricksConnectionStatus())
    } catch (error) {
      console.error(
        'Databricks status check failed:',
        error instanceof Error ? error.message : 'Unknown error',
      )
      return res.status(502).json({
        connected: false,
        error: 'MedShield could not reach the approved Databricks Gold view.',
        code: 'DATABRICKS_CONNECTION_FAILED',
      })
    }
  },
)

app.get(
  '/api/integrations/databricks/external/status',
  requireAuth,
  requireRole(['admin']),
  async (_req: AuthenticatedRequest, res: Response) => {
    if (!databricksConfigured()) {
      return res.status(503).json({
        connected: false,
        error: 'Databricks is not configured on the MedShield backend.',
        code: 'DATABRICKS_NOT_CONFIGURED',
      })
    }

    try {
      return res.json(await getDatabricksExternalConnectionStatus())
    } catch (error) {
      console.error(
        'Databricks external status check failed:',
        error instanceof Error ? error.message : 'Unknown error',
      )
      return res.status(502).json({
        connected: false,
        error: 'MedShield could not validate the Databricks DOH/PAGASA candidate view.',
        code: 'DATABRICKS_EXTERNAL_CONNECTION_FAILED',
      })
    }
  },
)

app.post(
  '/api/integrations/databricks/sync/yearly',
  requireAuth,
  requireRole(['admin']),
  databricksYearlySyncLimiter,
  async (req: AuthenticatedRequest, res: Response) => {
    const username = req.user?.username ?? 'unknown-admin'
    const auditBase = {
      username,
      ip_address: String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || ''),
      user_agent: String(req.headers['user-agent'] || ''),
      created_at: new Date().toISOString(),
    }

    if (!databricksConfigured() || !supabaseWarehouseConfigured()) {
      await persistAuditLog({
        ...auditBase,
        action: 'DATABRICKS_YEARLY_CANDIDATE_SYNC_BLOCKED',
        detail: 'Yearly candidate synchronization was blocked because a backend-only integration credential is missing.',
      })
      return res.status(503).json({
        error: 'Databricks or the protected Supabase warehouse connection is not configured.',
        code: 'YEARLY_SYNC_NOT_CONFIGURED',
      })
    }

    try {
      const result = await synchronizeDatabricksYearlyCandidate(username)
      await persistAuditLog({
        ...auditBase,
        action: 'DATABRICKS_YEARLY_CANDIDATE_SYNC_COMPLETED',
        detail: `Candidate-only yearly cache synchronized: ${result.loaded_rows} rows, ${result.period.minimum_year}-${result.period.maximum_year}, ${result.reconciliation.loaded_transaction_count} transactions, pipeline run ${result.pipeline_run_key}. Published dashboard facts were not replaced.`,
      })
      return res.json(result)
    } catch (error) {
      const code =
        error instanceof DatabricksYearlySyncInProgressError
          ? error.code
          : error instanceof DatabricksYearlySyncValidationError
            ? error.code
            : error instanceof SupabaseWarehouseError
              ? error.code
              : 'DATABRICKS_YEARLY_SYNC_FAILED'

      console.error(
        'Databricks yearly candidate sync failed:',
        error instanceof Error ? `${error.name}: ${error.message}` : 'Unknown error',
      )
      await persistAuditLog({
        ...auditBase,
        action: 'DATABRICKS_YEARLY_CANDIDATE_SYNC_FAILED',
        detail: `Candidate-only yearly synchronization failed with code ${code}. The published dashboard facts were not changed.`,
      })

      if (error instanceof DatabricksYearlySyncInProgressError) {
        return res.status(409).json({ error: error.message, code: error.code })
      }
      if (error instanceof DatabricksYearlySyncValidationError) {
        return res.status(422).json({
          error: error.message,
          code: error.code,
          candidate_cache_preserved: error.candidateCachePreserved,
          pipeline_run_key: error.pipelineRunKey,
        })
      }
      if (error instanceof SupabaseWarehouseError) {
        return res.status(502).json({
          error: 'The protected Supabase yearly-candidate sync is unavailable. Confirm migration 013 is applied.',
          code: error.code,
          candidate_cache_preserved: null,
        })
      }
      return res.status(502).json({
        error: 'MedShield could not synchronize the validated Databricks yearly candidates.',
        code,
        candidate_cache_preserved: null,
      })
    }
  },
)

app.get('/api/summary', requireAuth, async (_req: Request, res: Response) => {
  return withDashboardSnapshot(res, (snapshot) => res.json(snapshot.totals))
})

app.get('/api/dashboard_status', requireAuth, async (_req: Request, res: Response) => {
  return withDashboardSnapshot(res, (snapshot) => res.json(snapshot.data_status))
})

app.get('/api/monthly', requireAuth, async (req: Request, res: Response) => {
  return withDashboardSnapshot(res, (snapshot) => {
    const year = String(req.query.year ?? '').trim()
    const rows = year
      ? snapshot.monthly.filter((row) => String(row.period ?? '').startsWith(year))
      : snapshot.monthly
    return res.json(rows)
  })
})

app.get('/api/by_area', requireAuth, async (_req: Request, res: Response) => {
  return withDashboardSnapshot(res, (snapshot) => res.json(snapshot.by_area))
})

app.get('/api/products', requireAuth, async (req: Request, res: Response) => {
  const rawLimit = req.query.limit ?? 15
  const limit = Number(rawLimit)
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    return res.status(400).json({ error: 'limit must be an integer between 1 and 100' })
  }
  return withDashboardSnapshot(res, (snapshot) => res.json(snapshot.top_products.slice(0, limit)))
})

app.get('/api/year_summary', requireAuth, async (_req: Request, res: Response) => {
  return withDashboardSnapshot(res, (snapshot) => res.json(snapshot.year_summary))
})

app.get('/api/seasonality', requireAuth, async (_req: Request, res: Response) => {
  return withDashboardSnapshot(res, (snapshot) => res.json(snapshot.seasonality))
})

app.get('/api/forecasts', requireAuth, async (_req: Request, res: Response) => {
  return withDashboardSnapshot(res, (snapshot) => res.json(snapshot.forecasts ?? []))
})

app.get('/api/external_signals', requireAuth, async (_req: Request, res: Response) => {
  return withDashboardSnapshot(res, (snapshot) => res.json(snapshot.external_signals ?? []))
})

app.get('/api/inventory_recommendations', requireAuth, async (_req: Request, res: Response) => {
  return withDashboardSnapshot(res, (snapshot) => res.json(snapshot.inventory_recommendations ?? []))
})

app.get('/api/regional_priorities', requireAuth, async (_req: Request, res: Response) => {
  return withDashboardSnapshot(res, (snapshot) => res.json(snapshot.regional_priorities ?? []))
})

app.get('/api/area_clusters', requireAuth, async (_req: Request, res: Response) => {
  return withDashboardSnapshot(res, (snapshot) => res.json(snapshot.area_clusters ?? []))
})

app.get('/api/product_priorities', requireAuth, async (_req: Request, res: Response) => {
  return withDashboardSnapshot(res, (snapshot) => res.json(snapshot.product_priorities ?? []))
})

app.get('/api/allocation_recommendations', requireAuth, async (_req: Request, res: Response) => {
  return withDashboardSnapshot(res, (snapshot) => res.json(snapshot.allocation_recommendations ?? []))
})

app.get('/api/product_region_matches', requireAuth, async (_req: Request, res: Response) => {
  return withDashboardSnapshot(res, (snapshot) => res.json(snapshot.product_region_matches ?? []))
})

app.get('/api/decision_alerts', requireAuth, async (_req: Request, res: Response) => {
  return withDashboardSnapshot(res, (snapshot) => res.json(snapshot.decision_alerts ?? []))
})

app.get('/api/model_evaluation', requireAuth, async (_req: Request, res: Response) => {
  return withDashboardSnapshot(res, (snapshot) => res.json(snapshot.model_evaluation ?? []))
})

app.get('/api/sales/status', requireAuth, async (_req: Request, res: Response) => {
  try {
    return res.json(await getDatabricksSalesStatus())
  } catch (error) {
    return databricksDashboardFailure(res, error)
  }
})

app.get('/api/sales/heatmap', requireAuth, async (_req: Request, res: Response) => {
  try {
    return res.json(await getDatabricksSalesHeatmap())
  } catch (error) {
    return databricksDashboardFailure(res, error)
  }
})

app.get('/api/sales/sectors', requireAuth, async (_req: Request, res: Response) => {
  try {
    return res.json(await getDatabricksSalesSectors())
  } catch (error) {
    return databricksDashboardFailure(res, error)
  }
})

app.get('/api/sales/forecast-validation', requireAuth, async (req: Request, res: Response) => {
  try {
    return res.json(await getDatabricksForecastValidation({
      sector: typeof req.query.sector === 'string' ? req.query.sector : undefined,
      product: typeof req.query.product === 'string' ? req.query.product : undefined,
      metric: typeof req.query.metric === 'string' ? req.query.metric : undefined,
    }))
  } catch (error) {
    return databricksDashboardFailure(res, error)
  }
})

app.get('/api/sales/external-regression', requireAuth, async (req: Request, res: Response) => {
  try {
    const input = Object.fromEntries(
      ['sector', 'territory', 'product', 'metric', 'mode', 'provider', 'disease', 'lag', 'rainfall_lag']
        .map((name) => [name, typeof req.query[name] === 'string' ? req.query[name] as string : undefined]),
    )
    return res.json(await getDatabricksExternalRegression(input))
  } catch (error) {
    return databricksDashboardFailure(res, error)
  }
})

app.get('/api/sales/planning-shortlist', requireAuth, async (req: Request, res: Response) => {
  try {
    return res.json(await getDatabricksPlanningShortlist({
      sector: typeof req.query.sector === 'string' ? req.query.sector : undefined,
      territory: typeof req.query.territory === 'string' ? req.query.territory : undefined,
    }))
  } catch (error) { return databricksDashboardFailure(res, error) }
})

app.post('/api/sales/planning-solve', requireAuth, async (req: Request, res: Response) => {
  try {
    return res.json(await solveDatabricksPlanningScenario(req.body ?? {}))
  } catch (error) { return databricksDashboardFailure(res, error) }
})

app.get('/api/sales/transactions', requireAuth, async (req: Request, res: Response) => {
  try {
    return res.json(await getDatabricksSalesTransactions({
      year: typeof req.query.year === 'string' ? req.query.year : undefined,
      page: typeof req.query.page === 'string' ? req.query.page : undefined,
      pageSize: typeof req.query.page_size === 'string' ? req.query.page_size : undefined,
      search: typeof req.query.search === 'string' ? req.query.search : undefined,
      qualityStatus: typeof req.query.quality_status === 'string' ? req.query.quality_status : undefined,
    }))
  } catch (error) {
    return databricksDashboardFailure(res, error)
  }
})

app.get('/api/sales/summary', requireAuth, async (req: Request, res: Response) => {
  try {
    return res.json(await getDatabricksSalesSummary({
      year: typeof req.query.year === 'string' ? req.query.year : undefined,
      search: typeof req.query.search === 'string' ? req.query.search : undefined,
      qualityStatus: typeof req.query.quality_status === 'string' ? req.query.quality_status : undefined,
    }))
  } catch (error) {
    return databricksDashboardFailure(res, error)
  }
})

app.post(
  '/api/sales/upload',
  requireAuth,
  express.raw({ type: () => true, limit: '30mb' }),
  async (_req: Request, res: Response) => {
    return res.status(409).json({
      error: 'Browser uploads are disabled because Databricks is the dashboard system of record. Ingest and validate files in the Databricks pipeline.',
      code: 'DATABRICKS_INGESTION_REQUIRED',
    })
  },
)

app.get('/api/weather/effects', requireAuth, async (req: Request, res: Response) => {
  try {
    return res.json(await getDatabricksWeatherEffects({
      year: typeof req.query.year === 'string' ? req.query.year : undefined,
      area: typeof req.query.area === 'string' ? req.query.area : undefined,
      grain: typeof req.query.grain === 'string' ? req.query.grain : undefined,
    }))
  } catch (error) {
    return databricksDashboardFailure(res, error)
  }
})

app.post('/api/weather/refresh', requireAuth, async (_req: Request, res: Response) => {
  return res.status(409).json({
    error: 'Browser weather refresh is disabled. Refresh PAGASA data through the Databricks external-source pipeline.',
    code: 'DATABRICKS_INGESTION_REQUIRED',
  })
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
  max: 500,
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

app.all(
  [
    '/api/classify_medicine',
    '/api/therapeutic_categories',
    '/api/procurement_orders',
    '/api/seasonal_epidemic_matrix',
    '/api/dss/prescriptive',
    '/api/seasonal_restock_detail',
    '/api/model_summary',
    '/api/mcda_territories',
    '/api/eoq_scenarios',
  ],
  requireAuth,
  (_req: Request, res: Response) => res.status(503).json({
    error: 'This legacy local-analysis endpoint is disabled. Publish an approved Databricks Gold view before exposing this result.',
    code: 'DATABRICKS_VIEW_REQUIRED',
  }),
)

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

app.listen(port, () => {
  console.log(`MedShield TypeScript API listening on port ${port}`)
})
