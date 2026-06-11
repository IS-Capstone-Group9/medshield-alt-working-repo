import path from 'node:path'
import { existsSync } from 'node:fs'
import { config as loadDotenv } from 'dotenv'
import cors from 'cors'
import express, { Request, Response } from 'express'

import { createLocalAccount, verifyLocalLogin } from './localAuth'
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

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'MedShield API gateway',
    architecture: 'typescript-api-gateway',
    source: supabaseEnabled() ? 'warehouse' : 'reference-export',
    runtime: 'typescript',
    analytics_services: {
      analytics: analyticsServiceUrl,
      product: productServiceUrl,
    },
  })
})

app.get('/api/summary', async (_req: Request, res: Response) => {
  const snapshot = await loadSnapshot()
  res.json(snapshot.totals)
})

app.get('/api/monthly', async (req: Request, res: Response) => {
  const snapshot = await loadSnapshot()
  const year = String(req.query.year ?? '').trim()
  const rows = year
    ? snapshot.monthly.filter((row) => String(row.period ?? '').startsWith(year))
    : snapshot.monthly
  res.json(rows)
})

app.get('/api/by_area', async (_req: Request, res: Response) => {
  const snapshot = await loadSnapshot()
  res.json(snapshot.by_area)
})

app.get('/api/products', async (req: Request, res: Response) => {
  const snapshot = await loadSnapshot()
  const limit = Number(req.query.limit ?? 15)
  res.json(snapshot.top_products.slice(0, Number.isFinite(limit) ? limit : 15))
})

app.get('/api/year_summary', async (_req: Request, res: Response) => {
  const snapshot = await loadSnapshot()
  res.json(snapshot.year_summary)
})

app.get('/api/seasonality', async (_req: Request, res: Response) => {
  const snapshot = await loadSnapshot()
  res.json(snapshot.seasonality)
})

app.options('/api/auth/login', (_req: Request, res: Response) => res.json({}))
app.options('/api/auth/signup', (_req: Request, res: Response) => res.json({}))

app.post('/api/auth/login', async (req: Request, res: Response) => {
  const username = String(req.body?.username ?? '').trim()
  const password = String(req.body?.password ?? '').trim()

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

      const user = rows[0]
      if (!user.is_active) {
        return res.status(403).json({ error: 'Account is disabled' })
      }

      return res.json({
        account_id: user.account_id,
        username: user.username,
        email: user.email,
        role: user.role,
      })
    } catch (error) {
      if (!authBackendUnavailable(error)) {
        console.error('Login error:', error)
        return res.status(500).json({ error: 'Authentication service error' })
      }

      console.warn('Supabase auth unavailable, using local auth store for login')
    }
  }

  const result = await verifyLocalLogin({ username, password })
  if (result.error === 'Account is disabled') {
    return res.status(403).json({ error: 'Account is disabled' })
  }

  if (!result.account) {
    return res.status(401).json({ error: 'Invalid username or password' })
  }

  return res.json(result.account)
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

      console.warn('Supabase auth unavailable, using local auth store for signup')
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

app.listen(port, () => {
  console.log(`MedShield TypeScript API listening on port ${port}`)
})
