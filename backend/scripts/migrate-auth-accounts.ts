import path from 'node:path'
import { existsSync } from 'node:fs'
import { config as loadDotenv } from 'dotenv'

for (const candidate of [path.resolve(process.cwd(), '.env'), path.resolve(process.cwd(), 'backend', '.env')]) {
  if (existsSync(candidate)) {
    loadDotenv({ path: candidate })
    break
  }
}

const url = process.env.SUPABASE_URL?.trim().replace(/\/$/, '') ?? ''
const secret = process.env.SUPABASE_SECRET_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || ''
if (!url || !secret) {
  throw new Error('Set SUPABASE_URL and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) in backend/.env')
}

const baseHeaders: Record<string, string> = { apikey: secret }
if (!secret.startsWith('sb_secret_')) {
  baseHeaders.Authorization = `Bearer ${secret}`
}

interface LegacyAccount {
  account_id: number
  username: string
  email: string
  password_hash: string | null
  role: string
  is_active: boolean
  auth_user_id: string | null
  password_reset_required: boolean
  auth_migrated_at: string | null
}

interface AuthUser {
  id: string
  email?: string
  app_metadata?: Record<string, unknown>
}

async function checkedJson<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(`${response.status}: ${JSON.stringify(body)}`)
  return body as T
}

function normalizedEmail(value: unknown): string {
  return String(value ?? '').trim().toLowerCase()
}

function supportedLegacyHash(value: string | null): string | null {
  if (!value) return null
  if (!/^\$2[aby]\$\d{2}\$/.test(value)) {
    throw new Error('An active account contains an unsupported legacy password hash')
  }
  return value
}

async function readActiveAccounts(): Promise<LegacyAccount[]> {
  const select = [
    'account_id',
    'username',
    'email',
    'password_hash',
    'role',
    'is_active',
    'auth_user_id',
    'password_reset_required',
    'auth_migrated_at',
  ].join(',')
  const accountResponse = await fetch(`${url}/rest/v1/accounts?select=${select}&is_active=eq.true&order=account_id.asc`, {
    headers: { ...baseHeaders, 'Accept-Profile': 'medshield_identity' },
  })
  return checkedJson<LegacyAccount[]>(accountResponse)
}

async function readAuthUsers(): Promise<AuthUser[]> {
  const usersResponse = await fetch(`${url}/auth/v1/admin/users?page=1&per_page=1000`, { headers: baseHeaders })
  const body = await checkedJson<{ users?: AuthUser[] }>(usersResponse)
  return body.users ?? []
}

function indexAuthUsers(users: AuthUser[]) {
  const byId = new Map<string, AuthUser>()
  const byEmail = new Map<string, AuthUser>()

  for (const user of users) {
    if (!user.id) continue
    byId.set(user.id, user)
    const email = normalizedEmail(user.email)
    const duplicate = email ? byEmail.get(email) : undefined
    if (duplicate && duplicate.id !== user.id) {
      throw new Error(`Multiple Supabase Auth users have the same normalized email: ${email}`)
    }
    if (email) byEmail.set(email, user)
  }

  return { byId, byEmail }
}

async function main() {
  const accounts = await readActiveAccounts()
  const users = await readAuthUsers()
  const { byId, byEmail } = indexAuthUsers(users)
  const claimedUserIds = new Set<string>()
  const accountEmails = new Set<string>()

  for (const account of accounts) {
    const email = normalizedEmail(account.email)
    if (!email) throw new Error(`Account ${account.username} has no email address`)
    if (accountEmails.has(email)) throw new Error(`Multiple active accounts use ${email}`)
    accountEmails.add(email)

    const linkedUser = account.auth_user_id ? byId.get(account.auth_user_id) : undefined
    const emailUser = byEmail.get(email)
    if (linkedUser && normalizedEmail(linkedUser.email) !== email) {
      throw new Error(`Account ${account.username} is linked to an Auth user with a different email`)
    }
    if (linkedUser && emailUser && linkedUser.id !== emailUser.id) {
      throw new Error(`Account ${account.username} has conflicting Auth id and email matches`)
    }

    let authUser = linkedUser ?? emailUser
    const legacyHash = supportedLegacyHash(account.password_hash)
    const passwordResetRequired = legacyHash ? true : Boolean(account.password_reset_required)
    const metadataAccountId = authUser?.app_metadata?.account_id
    if (metadataAccountId !== undefined && Number(metadataAccountId) !== account.account_id) {
      throw new Error(`Auth user for ${account.username} is already assigned to another MedShield account`)
    }
    const appMetadata = {
      ...(authUser?.app_metadata ?? {}),
      account_id: account.account_id,
      username: account.username,
      medshield_role: account.role,
      must_reset_password: passwordResetRequired,
    }

    if (!authUser) {
      if (!legacyHash) throw new Error(`Account ${account.username} has no Auth user or legacy password hash to import`)
      const createResponse = await fetch(`${url}/auth/v1/admin/users`, {
        method: 'POST',
        headers: { ...baseHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password_hash: legacyHash,
          email_confirm: true,
          app_metadata: appMetadata,
        }),
      })
      authUser = await checkedJson<AuthUser>(createResponse)
    } else {
      const updateBody: Record<string, unknown> = { app_metadata: appMetadata }
      if (legacyHash) {
        // Importing the hash for an existing email is essential during recovery:
        // only clear the legacy copy after Supabase Auth accepts this update.
        updateBody.password_hash = legacyHash
        updateBody.email_confirm = true
      }
      const updateResponse = await fetch(`${url}/auth/v1/admin/users/${encodeURIComponent(String(authUser.id))}`, {
        method: 'PUT',
        headers: { ...baseHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify(updateBody),
      })
      authUser = await checkedJson<AuthUser>(updateResponse)
    }

    if (!authUser.id) throw new Error(`Supabase Auth did not return an id for ${account.username}`)
    if (claimedUserIds.has(authUser.id)) throw new Error(`Supabase Auth user ${authUser.id} matched more than one account`)
    claimedUserIds.add(authUser.id)
    byId.set(authUser.id, authUser)
    byEmail.set(email, authUser)

    const linkQuery = new URLSearchParams({
      account_id: `eq.${account.account_id}`,
      select: 'account_id,auth_user_id,password_reset_required',
    })
    const linkChanged = account.auth_user_id !== authUser.id
    const linkResponse = await fetch(`${url}/rest/v1/accounts?${linkQuery.toString()}`, {
      method: 'PATCH',
      headers: {
        ...baseHeaders,
        'Accept-Profile': 'medshield_identity',
        'Content-Profile': 'medshield_identity',
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        auth_user_id: authUser.id,
        auth_migrated_at:
          linkChanged || legacyHash || !account.auth_migrated_at
            ? new Date().toISOString()
            : account.auth_migrated_at,
        password_reset_required: passwordResetRequired,
        password_hash: null,
      }),
    })
    const linkedRows = await checkedJson<Array<Pick<LegacyAccount, 'account_id' | 'auth_user_id' | 'password_reset_required'>>>(linkResponse)
    if (linkedRows.length !== 1 || linkedRows[0].auth_user_id !== authUser.id) {
      throw new Error(`Failed to verify the Auth link for ${account.username}`)
    }
    console.log(`Verified Supabase Auth link for ${account.username}.`)
  }

  const verifiedAccounts = await readActiveAccounts()
  const verifiedUsers = await readAuthUsers()
  const verifiedUsersById = indexAuthUsers(verifiedUsers).byId
  const failures: string[] = []
  const linkedIds = new Set<string>()

  if (verifiedAccounts.length !== accounts.length) {
    failures.push('the active account set changed while the migration was running')
  }
  for (const account of verifiedAccounts) {
    if (!account.auth_user_id) {
      failures.push(`${account.username} is not linked`)
      continue
    }
    if (linkedIds.has(account.auth_user_id)) failures.push(`${account.username} shares an Auth user link`)
    linkedIds.add(account.auth_user_id)
    const user = verifiedUsersById.get(account.auth_user_id)
    if (!user) failures.push(`${account.username} links to a missing Auth user`)
    else if (normalizedEmail(user.email) !== normalizedEmail(account.email)) {
      failures.push(`${account.username} has an Auth email mismatch`)
    }
    if (account.password_hash !== null) failures.push(`${account.username} still has a legacy password hash`)
  }

  if (failures.length) throw new Error(`Post-migration verification failed: ${failures.join('; ')}`)
  console.log(
    `Authentication migration complete: ${verifiedAccounts.length} active accounts, ${linkedIds.size} valid Auth links, 0 legacy password hashes.`,
  )
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
