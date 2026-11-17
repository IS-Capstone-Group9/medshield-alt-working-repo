import type { AuditEvent } from './auditStore'

interface RecoveryAccount {
  account_id: number
  auth_user_id: string | null
  username: string
  email: string
  role: string
  is_active: boolean
  password_hash: string | null
  password_reset_required: boolean
  auth_migrated_at: string | null
}

interface RecoveryAuthUser {
  id: string
  email?: string
  app_metadata?: Record<string, unknown>
}

export interface AuthRecoveryInput {
  accountId: number
  expectedEmail: string
  operator: string
  ownershipReference: string
  ownershipConfirmed: boolean
  operationId: string
  apply?: boolean
  resume?: boolean
  temporaryPassword?: string
}

export interface AuthRecoveryOptions {
  url: string
  serverSecret: string
  request?: typeof fetch
  persistAudit?: (event: AuditEvent) => Promise<{ storage: 'supabase' | 'local' }>
  now?: () => Date
}

export class AuthRecoveryError extends Error {
  constructor(
    readonly code: string,
    readonly phase: string,
    readonly identityMayHaveChanged = false,
  ) {
    super(`${code} (${phase}).${identityMayHaveChanged ? ' Identity may have changed; inspect and resume the same operation without deleting users.' : ''}`)
  }
}

const ACCOUNT_SELECT = 'account_id,auth_user_id,username,email,role,is_active,password_hash,password_reset_required,auth_migrated_at'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,128}$/
const TOKEN = /^[A-Za-z0-9_.:@-]{1,128}$/
const normalizedEmail = (email: string) => email.trim().toLowerCase()

/** Server-admin recovery only. Ownership is an operator attestation, not an email match. */
export async function recoverDeletedAuthAccount(input: AuthRecoveryInput, options: AuthRecoveryOptions) {
  const email = typeof input.expectedEmail === 'string' ? normalizedEmail(input.expectedEmail) : ''
  if (!Number.isSafeInteger(input.accountId) || input.accountId <= 0 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      typeof input.operationId !== 'string' || !UUID.test(input.operationId) ||
      typeof input.operator !== 'string' || !TOKEN.test(input.operator) ||
      typeof input.ownershipReference !== 'string' || !TOKEN.test(input.ownershipReference) ||
      (input.apply !== undefined && typeof input.apply !== 'boolean') ||
      (input.resume !== undefined && typeof input.resume !== 'boolean') ||
      (input.apply && input.ownershipConfirmed !== true) ||
      (input.apply && !input.resume && (typeof input.temporaryPassword !== 'string' || !PASSWORD.test(input.temporaryPassword)))) {
    throw new AuthRecoveryError('RECOVERY_INPUT_INVALID', 'validation')
  }
  let base: URL
  try { base = new URL(options.url) } catch { throw new AuthRecoveryError('RECOVERY_CONFIGURATION_INVALID', 'configuration') }
  if (typeof options.serverSecret !== 'string' || !options.serverSecret.trim() || base.protocol !== 'https:' || base.username || base.password || base.search || base.hash ||
      (base.pathname !== '/' && base.pathname !== '')) {
    throw new AuthRecoveryError('RECOVERY_CONFIGURATION_INVALID', 'configuration')
  }
  const origin = base.origin
  const request = options.request ?? fetch
  const now = options.now ?? (() => new Date())
  let phase = 'preflight'
  let identityMayHaveChanged = false
  const fail = (code: string): never => { throw new AuthRecoveryError(code, phase, identityMayHaveChanged) }

  async function api<T>(route: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers)
    headers.set('apikey', options.serverSecret)
    if (!options.serverSecret.startsWith('sb_secret_')) headers.set('Authorization', `Bearer ${options.serverSecret}`)
    if (route.startsWith('/rest/')) {
      headers.set('Accept-Profile', 'medshield_identity')
      headers.set('Content-Profile', 'medshield_identity')
    }
    if (init.body) headers.set('Content-Type', 'application/json')
    let response: Response
    try { response = await request(origin + route, { ...init, headers, redirect: 'error', signal: AbortSignal.timeout(10000) }) }
    catch { return fail('RECOVERY_UPSTREAM_UNAVAILABLE') }
    // Provider bodies may echo credentials or personal data; never propagate them.
    if (!response.ok) return fail('RECOVERY_UPSTREAM_REJECTED')
    try { return await response.json() as T } catch { return fail('RECOVERY_RESPONSE_INVALID') }
  }

  async function readAccount(): Promise<RecoveryAccount> {
    const query = new URLSearchParams({ account_id: `eq.${input.accountId}`, select: ACCOUNT_SELECT, limit: '2' })
    const rows = await api<RecoveryAccount[]>(`/rest/v1/accounts?${query}`)
    if (!Array.isArray(rows) || rows.length !== 1 || !rows[0] || typeof rows[0] !== 'object' || Array.isArray(rows[0])) return fail('RECOVERY_ACCOUNT_NOT_UNIQUE')
    return rows[0]
  }

  const account = await readAccount()
  if (account.account_id !== input.accountId || account.is_active !== true || typeof account.email !== 'string' ||
      normalizedEmail(account.email) !== email || account.password_hash !== null || typeof account.auth_migrated_at !== 'string' || !account.auth_migrated_at ||
      !Number.isFinite(Date.parse(account.auth_migrated_at)) || typeof account.username !== 'string' || !account.username ||
      !['admin', 'manager', 'analyst', 'viewer'].includes(account.role) ||
      typeof account.password_reset_required !== 'boolean' ||
      (account.auth_user_id !== null && (typeof account.auth_user_id !== 'string' || !UUID.test(account.auth_user_id)))) {
    return fail('RECOVERY_ACCOUNT_INELIGIBLE')
  }

  const users: RecoveryAuthUser[] = []
  let exhausted = false
  for (let page = 1; page <= 100; page += 1) {
    const body = await api<{ users: RecoveryAuthUser[] }>(`/auth/v1/admin/users?page=${page}&per_page=200`)
    if (!body || typeof body !== 'object' || !Array.isArray(body.users) ||
        body.users.some(user => !user || typeof user !== 'object' || !UUID.test(user.id) || typeof user.email !== 'string')) {
      return fail('RECOVERY_RESPONSE_INVALID')
    }
    users.push(...body.users)
    if (body.users.length < 200) { exhausted = true; break }
  }
  if (!exhausted) return fail('RECOVERY_AUTH_DISCOVERY_INCOMPLETE')
  const matches = users.filter(user => normalizedEmail(user.email!) === email)
  if (matches.length > 1) return fail('RECOVERY_AUTH_CONFLICT')
  const ownsOperation = (user: RecoveryAuthUser) =>
    user.app_metadata?.medshield_recovery_operation_id === input.operationId &&
    user.app_metadata?.account_id === account.account_id &&
    user.app_metadata?.username === account.username &&
    user.app_metadata?.medshield_role === account.role &&
    user.app_metadata?.must_reset_password === true && typeof user.email === 'string' && normalizedEmail(user.email) === email
  let authUser = matches[0]
  if (authUser && (!input.resume || !ownsOperation(authUser))) return fail('RECOVERY_AUTH_CONFLICT')
  if (account.auth_user_id !== null && (!input.resume || !authUser || account.auth_user_id !== authUser.id || !account.password_reset_required)) {
    return fail('RECOVERY_ACCOUNT_ALREADY_LINKED')
  }
  if (input.resume && !authUser) return fail('RECOVERY_RESUME_NOT_FOUND')
  if (authUser) {
    identityMayHaveChanged = true
    const query = new URLSearchParams({ auth_user_id: `eq.${authUser.id}`, select: 'account_id', limit: '2' })
    const claims = await api<Array<{ account_id: number }>>(`/rest/v1/accounts?${query}`)
    if (!Array.isArray(claims) || claims.some(claim => !claim || typeof claim !== 'object' || claim.account_id !== account.account_id) || claims.length > 1) {
      return fail('RECOVERY_AUTH_CONFLICT')
    }
  }
  if (!input.apply) return { status: 'ready' as const, accountId: account.account_id, operationId: input.operationId, passwordResetRequired: true as const }
  if (!options.persistAudit) return fail('RECOVERY_AUDIT_REQUIRED')

  async function audit(action: string) {
    try {
      const result = await options.persistAudit!({
        username: input.operator,
        action,
        detail: JSON.stringify({ operation_id: input.operationId, account_id: account.account_id,
          ownership_reference: input.ownershipReference, ownership_attested: true, version: 1 }),
        ip_address: 'server-cli', user_agent: 'medshield-auth-recovery', created_at: now().toISOString(),
      })
      if (result.storage !== 'supabase') return fail('RECOVERY_REMOTE_AUDIT_REQUIRED')
    } catch (error) {
      if (error instanceof AuthRecoveryError) throw error
      return fail('RECOVERY_AUDIT_UNAVAILABLE')
    }
  }

  phase = 'intent-audit'
  await audit('AUTH_ACCOUNT_RECOVERY_INTENT')
  if (!authUser) {
    phase = 'auth-create'
    // Auth creation and account linking are separate services. Preserve any
    // ambiguous result for explicit resume; never delete a potentially linked user.
    identityMayHaveChanged = true
    authUser = await api<RecoveryAuthUser>('/auth/v1/admin/users', {
      method: 'POST', body: JSON.stringify({ email, password: input.temporaryPassword, email_confirm: true,
        app_metadata: { account_id: account.account_id, username: account.username, medshield_role: account.role,
          must_reset_password: true, medshield_recovery_operation_id: input.operationId } }),
    })
    if (!authUser || typeof authUser !== 'object' || !UUID.test(authUser.id) || !ownsOperation(authUser)) return fail('RECOVERY_AUTH_RECEIPT_INVALID')
  }

  if (account.auth_user_id === null) {
    phase = 'account-link'
    identityMayHaveChanged = true
    const query = new URLSearchParams({ account_id: `eq.${account.account_id}`, auth_user_id: 'is.null',
      is_active: 'eq.true', password_hash: 'is.null', email: `eq.${account.email}`, role: `eq.${account.role}`,
      username: `eq.${account.username}`, auth_migrated_at: `eq.${account.auth_migrated_at}`,
      password_reset_required: `eq.${account.password_reset_required}`, select: ACCOUNT_SELECT })
    const rows = await api<RecoveryAccount[]>(`/rest/v1/accounts?${query}`, { method: 'PATCH',
      headers: { Prefer: 'return=representation' }, body: JSON.stringify({ auth_user_id: authUser.id, password_reset_required: true,
        updated_at: now().toISOString() }) })
    if (!Array.isArray(rows) || rows.length !== 1 || !rows[0] || typeof rows[0] !== 'object' || rows[0].account_id !== account.account_id ||
        rows[0].auth_user_id !== authUser.id || rows[0].password_reset_required !== true || rows[0].password_hash !== null) {
      return fail('RECOVERY_LINK_NOT_VERIFIED')
    }
  }
  phase = 'readback'
  const linked = await readAccount()
  const verifiedUser = await api<RecoveryAuthUser>(`/auth/v1/admin/users/${encodeURIComponent(authUser.id)}`)
  if (linked.auth_user_id !== authUser.id || !linked.is_active || !linked.password_reset_required || linked.password_hash !== null ||
      linked.email !== account.email || linked.role !== account.role || linked.username !== account.username ||
      linked.auth_migrated_at !== account.auth_migrated_at || !verifiedUser || typeof verifiedUser !== 'object' ||
      verifiedUser.id !== authUser.id || !ownsOperation(verifiedUser)) {
    return fail('RECOVERY_READBACK_FAILED')
  }
  phase = 'completion-audit'
  await audit('AUTH_ACCOUNT_RECOVERY_COMPLETED')
  return { status: 'completed' as const, accountId: account.account_id, operationId: input.operationId,
    authUserId: authUser.id, passwordResetRequired: true as const }
}

