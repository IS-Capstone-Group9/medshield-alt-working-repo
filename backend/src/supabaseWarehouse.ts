const YEARLY_SYNC_RPC = '/rest/v1/rpc/sync_databricks_yearly_sales_candidate'

interface SupabaseWarehouseConfiguration {
  baseUrl: string
  serviceKey: string
}

export class SupabaseWarehouseError extends Error {
  readonly code = 'SUPABASE_WAREHOUSE_REQUEST_FAILED'
  readonly status: number
  readonly remoteCode?: string

  constructor(message: string, status: number, remoteCode?: string) {
    super(message)
    this.name = 'SupabaseWarehouseError'
    this.status = status
    this.remoteCode = remoteCode
  }
}

function configuration(): SupabaseWarehouseConfiguration {
  const rawBaseUrl = process.env.SUPABASE_URL?.trim().replace(/\/$/, '')
  const serviceKey = (
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  ).trim()
  if (!rawBaseUrl || !serviceKey) {
    throw new Error('Supabase warehouse service credentials are not configured')
  }

  const url = new URL(rawBaseUrl)
  const isLocal = ['localhost', '127.0.0.1', '::1'].includes(url.hostname)
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && isLocal)) {
    throw new Error('SUPABASE_URL must use HTTPS unless it targets a local Supabase instance')
  }
  return { baseUrl: url.origin, serviceKey }
}

export function supabaseWarehouseConfigured(): boolean {
  return Boolean(
    process.env.SUPABASE_URL?.trim() &&
      (process.env.SUPABASE_SECRET_KEY?.trim() ||
        process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()),
  )
}

export async function invokeDatabricksYearlyCandidateSync(
  payload: Record<string, unknown>,
): Promise<unknown> {
  const config = configuration()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30_000)
  const headers = new Headers({
    apikey: config.serviceKey,
    'Content-Type': 'application/json',
  })

  // New Supabase sb_secret_* keys authenticate through apikey. Legacy
  // service-role JWTs additionally require a Bearer header.
  if (!config.serviceKey.startsWith('sb_secret_')) {
    headers.set('Authorization', `Bearer ${config.serviceKey}`)
  }

  try {
    const response = await fetch(`${config.baseUrl}${YEARLY_SYNC_RPC}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
    const text = await response.text()
    let body: unknown = null
    if (text) {
      try {
        body = JSON.parse(text)
      } catch {
        body = null
      }
    }

    if (!response.ok) {
      const remoteCode =
        body && typeof body === 'object' && 'code' in body
          ? String((body as { code?: unknown }).code ?? '') || undefined
          : undefined
      throw new SupabaseWarehouseError(
        'Supabase rejected the protected yearly-candidate synchronization request',
        response.status,
        remoteCode,
      )
    }
    return body
  } finally {
    clearTimeout(timeout)
  }
}
