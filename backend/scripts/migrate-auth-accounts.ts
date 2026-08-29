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

const baseHeaders = { apikey: secret, Authorization: `Bearer ${secret}` }

async function checkedJson(response: Response) {
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(`${response.status}: ${JSON.stringify(body)}`)
  return body
}

async function main() {
  const accountResponse = await fetch(`${url}/rest/v1/accounts?select=account_id,username,email,password_hash,role,is_active,auth_user_id&is_active=eq.true`, {
    headers: { ...baseHeaders, 'Accept-Profile': 'medshield_identity' },
  })
  const accounts = await checkedJson(accountResponse) as Array<Record<string, unknown>>

  const usersResponse = await fetch(`${url}/auth/v1/admin/users?page=1&per_page=1000`, { headers: baseHeaders })
  const existingUsersBody = await checkedJson(usersResponse) as { users?: Array<Record<string, unknown>> }
  const users = existingUsersBody.users ?? []

  for (const account of accounts) {
    const email = String(account.email).toLowerCase()
    let authUser = users.find((user) => String(user.email ?? '').toLowerCase() === email)
    const appMetadata = {
      account_id: Number(account.account_id),
      username: String(account.username),
      medshield_role: String(account.role),
      must_reset_password: true,
    }

    if (!authUser) {
      if (!account.password_hash) throw new Error(`Account ${account.username} has no legacy password hash to import`)
      const createResponse = await fetch(`${url}/auth/v1/admin/users`, {
        method: 'POST',
        headers: { ...baseHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password_hash: account.password_hash,
          email_confirm: true,
          app_metadata: appMetadata,
        }),
      })
      authUser = await checkedJson(createResponse) as Record<string, unknown>
    } else {
      const updateResponse = await fetch(`${url}/auth/v1/admin/users/${encodeURIComponent(String(authUser.id))}`, {
        method: 'PUT',
        headers: { ...baseHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ app_metadata: appMetadata }),
      })
      authUser = await checkedJson(updateResponse) as Record<string, unknown>
    }

    if (!authUser.id) throw new Error(`Supabase Auth did not return an id for ${account.username}`)
    const linkQuery = new URLSearchParams({ account_id: `eq.${account.account_id}` })
    const linkResponse = await fetch(`${url}/rest/v1/accounts?${linkQuery.toString()}`, {
      method: 'PATCH',
      headers: {
        ...baseHeaders,
        'Content-Profile': 'medshield_identity',
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        auth_user_id: authUser.id,
        auth_migrated_at: new Date().toISOString(),
        password_reset_required: true,
        password_hash: null,
      }),
    })
    if (!linkResponse.ok) throw new Error(`Failed to link ${account.username}: ${linkResponse.status}`)
    console.log(`Linked ${account.username} to Supabase Auth.`)
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
