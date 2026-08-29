export interface MedShieldAccount {
  account_id: number
  auth_user_id: string | null
  username: string
  email: string
  role: string
  is_active: boolean
  password_reset_required: boolean
}

export interface SupabaseIdentityUser {
  id: string
  email?: string
  app_metadata?: Record<string, unknown>
}

export interface SupabaseIdentitySession {
  access_token: string
  refresh_token: string
  token_type: 'Bearer'
  expires_at: string
  user: MedShieldAccount
}

export class SupabaseServerSecretMissingError extends Error {
  constructor() {
    super('Supabase server secret is not configured')
  }
}

function configuration() {
  const url = process.env.SUPABASE_URL?.trim().replace(/\/$/, '') ?? ''
  const publishableKey =
    process.env.SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    ''
  const serverSecret =
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    ''

  if (!url || !publishableKey) {
    throw new Error('Supabase Auth is not configured')
  }

  return { url, publishableKey, serverSecret }
}

async function authFetch(pathName: string, init: RequestInit, useServerSecret = false) {
  const { url, publishableKey, serverSecret } = configuration()
  if (useServerSecret && !serverSecret) throw new SupabaseServerSecretMissingError()
  const key = useServerSecret ? serverSecret : publishableKey
  const headers = new Headers(init.headers)
  headers.set('apikey', key)
  if (useServerSecret) headers.set('Authorization', `Bearer ${key}`)
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  return fetch(`${url}/auth/v1${pathName}`, { ...init, headers })
}

async function identityDbFetch(pathName: string, init: RequestInit) {
  const { url, serverSecret } = configuration()
  if (!serverSecret) throw new SupabaseServerSecretMissingError()
  const headers = new Headers(init.headers)
  headers.set('apikey', serverSecret)
  headers.set('Authorization', `Bearer ${serverSecret}`)
  headers.set('Accept-Profile', 'medshield_identity')
  headers.set('Content-Profile', 'medshield_identity')
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  return fetch(`${url}/rest/v1${pathName}`, { ...init, headers })
}

async function responseJson(response: Response): Promise<Record<string, unknown>> {
  return (await response.json().catch(() => ({}))) as Record<string, unknown>
}

async function resolveIdentifier(identifier: string): Promise<MedShieldAccount | null> {
  const response = await identityDbFetch('/rpc/resolve_login_identifier', {
    method: 'POST',
    body: JSON.stringify({ p_identifier: identifier }),
  })
  if (!response.ok) throw new Error(`Identity lookup failed with status ${response.status}`)
  const rows = (await response.json()) as MedShieldAccount[]
  return rows[0] ?? null
}

async function resolveAuthUser(authUserId: string): Promise<MedShieldAccount | null> {
  const query = new URLSearchParams({
    select: 'account_id,auth_user_id,username,email,role,is_active,password_reset_required',
    auth_user_id: `eq.${authUserId}`,
    limit: '1',
  })
  const response = await identityDbFetch(`/accounts?${query.toString()}`, { method: 'GET' })
  if (!response.ok) throw new Error(`Linked account lookup failed with status ${response.status}`)
  const rows = (await response.json()) as MedShieldAccount[]
  return rows[0] ?? null
}

async function getAuthUser(accessToken: string): Promise<SupabaseIdentityUser | null> {
  const response = await authFetch('/user', {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!response.ok) return null
  const user = (await response.json()) as SupabaseIdentityUser
  return user.id ? user : null
}

async function passwordSignIn(email: string, password: string) {
  const response = await authFetch('/token?grant_type=password', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  return { response, body: await responseJson(response) }
}

export async function signInWithIdentifier(
  identifier: string,
  password: string,
): Promise<SupabaseIdentitySession | null> {
  const account = await resolveIdentifier(identifier)
  if (!account?.is_active || !account.auth_user_id) return null

  const { response, body } = await passwordSignIn(account.email, password)
  if (!response.ok) {
    if (response.status >= 500 || response.status === 429) {
      throw new Error(`Supabase Auth sign-in failed with status ${response.status}`)
    }
    return null
  }

  const authUser = body.user as SupabaseIdentityUser | undefined
  if (!authUser?.id || authUser.id !== account.auth_user_id) return null
  if (!body.access_token || !body.refresh_token) return null
  const expiresIn = Number(body.expires_in ?? 3600)

  return {
    access_token: String(body.access_token),
    refresh_token: String(body.refresh_token),
    token_type: 'Bearer',
    expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
    user: account,
  }
}

export async function getLinkedAccount(accessToken: string): Promise<MedShieldAccount | null> {
  const authUser = await getAuthUser(accessToken)
  if (!authUser) return null
  const account = await resolveAuthUser(authUser.id)
  return account?.is_active ? account : null
}

export async function completeRequiredPasswordReset(
  accessToken: string,
  currentPassword: string,
  newPassword: string,
): Promise<boolean> {
  const authUser = await getAuthUser(accessToken)
  if (!authUser?.id || !authUser.email) return false
  const account = await resolveAuthUser(authUser.id)
  if (!account?.is_active || !account.password_reset_required) return false

  const reauthentication = await passwordSignIn(authUser.email, currentPassword)
  const signedInUser = reauthentication.body.user as SupabaseIdentityUser | undefined
  if (!reauthentication.response.ok || signedInUser?.id !== authUser.id) return false

  const appMetadata = {
    ...(authUser.app_metadata ?? {}),
    account_id: account.account_id,
    username: account.username,
    medshield_role: account.role,
    must_reset_password: false,
  }
  const updateResponse = await authFetch(`/admin/users/${encodeURIComponent(authUser.id)}`, {
    method: 'PUT',
    body: JSON.stringify({ password: newPassword, app_metadata: appMetadata }),
  }, true)
  if (!updateResponse.ok) throw new Error(`Auth password update failed with status ${updateResponse.status}`)

  const query = new URLSearchParams({ auth_user_id: `eq.${authUser.id}` })
  const accountResponse = await identityDbFetch(`/accounts?${query.toString()}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ password_reset_required: false, updated_at: new Date().toISOString() }),
  })
  if (!accountResponse.ok) throw new Error(`Account reset flag update failed with status ${accountResponse.status}`)
  return true
}
