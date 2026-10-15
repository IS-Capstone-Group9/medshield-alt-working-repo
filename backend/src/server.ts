import { catalogProducts, parseCatalogCategory, CatalogInputError } from './catalogContract'
import { invalidScalarQueryKey } from './monthlyQuery'
import { SalesDiagnosticInputError } from './salesDiagnostics'
import { readPredictiveRelease, PredictiveInputError } from './predictiveRelease'
import path from 'node:path'
import { existsSync } from 'node:fs'
import { config as loadDotenv } from 'dotenv'
import cors from 'cors'
import express, { NextFunction, Request, Response } from 'express'
import rateLimit from 'express-rate-limit'

import { verifyLocalLogin } from './localAuth'
import { authenticateSelectedMode, resolveAuthenticationMode } from './authConfiguration'
import { AuditPersistenceError, createAuditStore } from './auditStore'
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
  getDatabricksStl,
  getDatabricksSalesSectors,
  getDatabricksSalesStatus,
  getDatabricksSalesSummary,
  getDatabricksSalesTransactions,
  getDatabricksSalesDiagnostics,
  getDatabricksWeatherEffects,
  solveDatabricksPlanningScenario,
} from './databricksDashboard'
import {
  DatabricksYearlySyncInProgressError,
  DatabricksYearlySyncValidationError,
  synchronizeDatabricksYearlyCandidate,
} from './databricksYearlySync'
import {
  WeatherProviderUnavailableError,
  WeatherRefreshInputError,
} from './nasaPowerWeather'
import { refreshWeatherProvider } from './weatherProviders'
import { createSession, revokeSessionToken, SessionUser, verifySessionToken } from './sessionAuth'
import { loadSnapshot } from './snapshot'
import { filterMonthlyYear, parseMonthlyYear } from './monthlyQuery'
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
// Fail startup for incomplete Supabase configuration instead of selecting demo auth.
const authenticationMode = resolveAuthenticationMode()

const app = express()
const port = Number(process.env.PORT ?? '5000')

// C-2 fix: restrict CORS to known frontend origins instead of wildcard.
// Set CORS_ALLOWED_ORIGINS to a comma-separated list for production
// (e.g. "https://medshield.example.com,https://staging.medshield.example.com").
// Falls back to localhost development origins when unset.
const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)
if (!allowedOrigins.length) {
  allowedOrigins.push('http://localhost:3000', 'http://localhost:5000')
}

app.use(
  cors({
    origin(requestOrigin, callback) {
      // Allow requests with no origin (server-to-server, curl, health checks)
      if (!requestOrigin || allowedOrigins.includes(requestOrigin)) {
        return callback(null, true)
      }
      return callback(new Error(`CORS: origin ${requestOrigin} is not allowed`))
    },
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
)
app.use(express.json())
app.use('/api', (req, res, next) => {
  const invalid = invalidScalarQueryKey(req.query)
  if (invalid) return res.status(400).json({ error: `Query parameter ${invalid} must occur once with a scalar value.`, code: 'INVALID_QUERY_PARAMETER' })
  next()
})

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

const weatherRefreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 6,
  message: {
    error: 'Too many weather refresh requests. Try again later.',
    code: 'WEATHER_REFRESH_RATE_LIMITED',
  },
  standardHeaders: true,
  legacyHeaders: false,
})

function supabaseEnabled(): boolean {
  return authenticationMode === 'supabase'
}

app.use((_, res, next) => {
  // Security headers only; CORS origin is now handled by cors() middleware above.
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

async function supabaseDbFetch(
  pathName: string,
  init: RequestInit,
  schema: string = 'medshield_identity'
): Promise<globalThis.Response> {
  const baseUrl = process.env.SUPABASE_URL?.replace(/\/$/, '')
  const serviceRoleKey =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
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
    signal: init.signal ?? AbortSignal.timeout(10000),
  })
}

const auditStore = createAuditStore({
  logPath: path.resolve(process.env.MEDSHIELD_AUDIT_LOG_PATH || path.resolve(__dirname, '..', 'data', 'local_audit_logs.jsonl')),
  remoteRequest: supabaseEnabled() ? supabaseDbFetch : undefined,
})
const persistAuditLog = auditStore.persist

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

  let user: SessionUser | null
  try {
    user = await authenticateSelectedMode(authenticationMode, token, {
      local: verifySessionToken, supabase: getSupabaseAuthUser,
    })
  } catch (error) {
    console.error('Authentication token validation failed:', error)
    return res.status(503).json({ error: 'Authentication service is unavailable' })
  }

  if (!user) {
    return res.status(401).json({ error: 'Session expired or invalid' })
  }

  req.user = user
  req.accessToken = token
  req.authSource = authenticationMode
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
  if (error instanceof DatabricksDashboardInputError || error instanceof CatalogInputError || error instanceof SalesDiagnosticInputError) {
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
      try {
        await persistAuditLog({
          ...auditBase,
          action: 'DATABRICKS_YEARLY_CANDIDATE_SYNC_BLOCKED',
          detail: 'Yearly candidate synchronization was blocked because a backend-only integration credential is missing.',
        })
      } catch {
        return res.status(503).json({ error: 'Yearly sync was blocked and its audit event could not be persisted.', code: 'AUDIT_PERSISTENCE_FAILED' })
      }
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
      if (error instanceof AuditPersistenceError) {
        return res.status(503).json({
          error: 'Candidate synchronization completed, but its audit event could not be persisted.',
          code: error.code, candidate_sync_completed: true,
        })
      }
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
      try {
        await persistAuditLog({
          ...auditBase,
          action: 'DATABRICKS_YEARLY_CANDIDATE_SYNC_FAILED',
          detail: `Candidate-only yearly synchronization failed with code ${code}. The published dashboard facts were not changed.`,
        })
      } catch {
        return res.status(503).json({ error: 'Candidate synchronization failed and its audit event could not be persisted.', code: 'AUDIT_PERSISTENCE_FAILED', sync_error_code: code })
      }

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
  const year = parseMonthlyYear(req.query.year)
  if (year === null) {
    return res.status(400).json({ error: 'year must be a single four-digit year between 1000 and 9999' })
  }
  return withDashboardSnapshot(res, (snapshot) => {
    return res.json(filterMonthlyYear(snapshot.monthly, year))
  })
})

app.get('/api/by_area', requireAuth, async (_req: Request, res: Response) => {
  return withDashboardSnapshot(res, (snapshot) => res.json(snapshot.by_area))
})

app.get('/api/products', requireAuth, async (req: Request, res: Response) => {
  const rawLimit = req.query.limit ?? 15
  if (typeof rawLimit !== 'string' && typeof rawLimit !== 'number') return res.status(400).json({error: 'Invalid limit'})
  const limit = Number(rawLimit)
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    return res.status(400).json({ error: 'limit must be an integer between 1 and 100' })
  }
  try {
    const category = parseCatalogCategory(req.query.category)
    const data = await getDatabricksSalesSectors()
    const result = catalogProducts(data.rows, category, limit)
    // Preserve the array response consumed by existing clients; metadata accompanies each result.
    return res.json(result.products.map(row => ({...row, release: data.source.release,
      selected_positive_sales: result.denominator, unresolved_count: result.unresolved_count,
      unresolved_revenue: result.unresolved_revenue})))
  } catch (error) { return databricksDashboardFailure(res, error) }
})

app.get('/api/year_summary', requireAuth, async (_req: Request, res: Response) => {
  return withDashboardSnapshot(res, (snapshot) => res.json(snapshot.year_summary))
})

app.get('/api/seasonality/stl', requireAuth, async (_req: Request, res: Response) => {
  try { return res.json(await getDatabricksStl()) }
  catch { return res.status(503).json({ code: 'STL_UNAVAILABLE', error: 'Validated STL is unavailable for the active dataset. Calendar-month averages remain a separate descriptive measure.' }) }
})

app.get('/api/seasonality', requireAuth, async (_req: Request, res: Response) => {
  return withDashboardSnapshot(res, (snapshot) => res.json(snapshot.seasonality))
})

app.get('/api/forecasts', requireAuth, async (_req: Request, res: Response) => {
  if (Object.keys(_req.query).length) {
    try { return res.json(await readPredictiveRelease(_req.query)) }
    catch (error) { return res.status(error instanceof PredictiveInputError ? 400 : 503).json({ code: error instanceof PredictiveInputError ? 'INVALID_FORECAST_FILTER' : 'FORECAST_UNAVAILABLE', error: error instanceof PredictiveInputError ? error.message : 'Published forecast evidence is unavailable.' }) }
  }
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
  if (Object.keys(_req.query).length) {
    try { return res.json(await readPredictiveRelease(_req.query)) }
    catch (error) { return res.status(error instanceof PredictiveInputError ? 400 : 503).json({ code: error instanceof PredictiveInputError ? 'INVALID_FORECAST_FILTER' : 'FORECAST_UNAVAILABLE', error: error instanceof PredictiveInputError ? error.message : 'Published evaluation evidence is unavailable.' }) }
  }
  return withDashboardSnapshot(res, (snapshot) => res.json(snapshot.model_evaluation ?? []))
})

app.get('/api/sales/status', requireAuth, async (_req: Request, res: Response) => {
  try {
    return res.json(await getDatabricksSalesStatus())
  } catch (error) {
    return databricksDashboardFailure(res, error)
  }
})

app.get('/api/sales/heatmap', requireAuth, async (req: Request, res: Response) => {
  try {
    return res.json(await getDatabricksSalesHeatmap(parseCatalogCategory(req.query.category)))
  } catch (error) {
    return databricksDashboardFailure(res, error)
  }
})

app.get('/api/sales/sectors', requireAuth, async (req: Request, res: Response) => {
  try {
    return res.json(await getDatabricksSalesSectors(parseCatalogCategory(req.query.category)))
  } catch (error) {
    return databricksDashboardFailure(res, error)
  }
})

app.get('/api/sales/forecast-validation', requireAuth, async (req: Request, res: Response) => {
  try {
    const invalid = invalidScalarQueryKey(req.query)
    if (invalid || Object.keys(req.query).some(key => !['sector', 'product', 'metric'].includes(key))) return res.status(400).json({ code: 'INVALID_FORECAST_FILTER', error: 'Forecast filters must be recognized scalar values.' })
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

function salesEvidenceQuery(req: Request) {
  return { startDate: req.query.start_date, endDate: req.query.end_date, productId: req.query.product_id,
    area: req.query.area, sector: req.query.sector, region: req.query.region, territory: req.query.territory, category: req.query.category }
}

app.get('/api/sales/diagnostics', requireAuth, async (req: Request, res: Response) => {
  try {
    return res.json(await getDatabricksSalesDiagnostics(salesEvidenceQuery(req)))
  } catch (error) { return databricksDashboardFailure(res, error) }
})

app.get('/api/sales/transactions', requireAuth, async (req: Request, res: Response) => {
  try {
    return res.json(await getDatabricksSalesTransactions({
      ...salesEvidenceQuery(req),
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
      ...salesEvidenceQuery(req),
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
      provider: typeof req.query.provider === 'string' ? req.query.provider : undefined,
    }))
  } catch (error) {
    return databricksDashboardFailure(res, error)
  }
})

app.post(
  '/api/weather/refresh',
  requireAuth,
  requireRole(['analyst']),
  weatherRefreshLimiter,
  async (req: Request, res: Response) => {
    try {
      return res.json(await refreshWeatherProvider(req.body ?? {}))
    } catch (error) {
      if (error instanceof WeatherRefreshInputError || error instanceof WeatherProviderUnavailableError) {
        return res.status(error.status).json({ error: error.message, code: error.code })
      }
      return databricksDashboardFailure(res, error)
    }
  },
)

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
      if (error instanceof AuditPersistenceError) {
        return res.status(503).json({
          error: 'The password was updated, but its audit event could not be persisted. Sign in again with your new password.',
          code: error.code, password_updated: true,
        })
      }
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

app.post('/api/audit', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const action = String(req.body?.action ?? '').trim()
  const detail = String(req.body?.detail ?? '').trim()

  if (!action || !detail) {
    return res.status(400).json({ error: 'Action and detail are required' })
  }

  const ipAddress = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '')
  const userAgent = String(req.headers['user-agent'] || '')

  const entry = {
    username: req.user?.username ?? 'unknown',
    action,
    detail,
    ip_address: ipAddress,
    user_agent: userAgent,
    created_at: new Date().toISOString(),
  }

  try {
    const receipt = await persistAuditLog(entry)
    return res.json({ ok: true, storage: receipt.storage, event_id: receipt.entry.event_id })
  } catch (error) {
    console.error('Audit persistence failed:', error instanceof Error ? error.message : 'Unknown error')
    return res.status(503).json({ error: 'The audit event could not be persisted. Please retry.', code: 'AUDIT_PERSISTENCE_FAILED' })
  }
})

app.get('/api/audit', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const role = req.user?.role ?? 'viewer'
  if (role !== 'admin' && role !== 'manager') {
    return res.status(403).json({ error: 'Access denied: compliance auditor role required' })
  }

  try {
    const result = await auditStore.read()
    res.setHeader('X-MedShield-Audit-Read-Degraded', String(result.remoteUnavailable))
    res.setHeader('Access-Control-Expose-Headers', 'X-MedShield-Audit-Read-Degraded')
    return res.json(result.entries)
  } catch (error) {
    console.error('Audit retrieval failed:', error instanceof Error ? error.message : 'Unknown error')
    return res.status(503).json({ error: 'The audit record view is unavailable.', code: 'AUDIT_READ_FAILED' })
  }
})

app.listen(port, () => {
  console.log(`MedShield TypeScript API listening on port ${port}`)
})
