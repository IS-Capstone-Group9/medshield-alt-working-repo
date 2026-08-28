import crypto from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'

export type AccountRole = 'admin' | 'analyst' | 'manager' | 'viewer'

export interface LocalAccount {
  account_id: number
  username: string
  email: string
  password_hash: string
  role: AccountRole
  is_active: boolean
  last_login_at: string | null
  created_at: string
  updated_at: string
}

const STORE_PATH = path.resolve(__dirname, '..', 'data', 'local_accounts.json')
const DEMO_ADMIN_USERNAME = 'admin'
const DEMO_ADMIN_EMAIL = 'admin@medshield.local'
const DEMO_ADMIN_PASSWORD = 'medshield2025'
const SCRYPT_N = 32768
const SCRYPT_R = 8
const SCRYPT_P = 1
const SCRYPT_KEYLEN = 64
const SCRYPT_MAXMEM = 128 * 1024 * 1024

let writeChain = Promise.resolve()

function nowIso(): string {
  return new Date().toISOString()
}

async function scryptAsync(password: string, salt: string, keylen: number): Promise<Buffer> {
  return await new Promise((resolve, reject) => {
    crypto.scrypt(
      password,
      salt,
      keylen,
      { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P, maxmem: SCRYPT_MAXMEM },
      (error, derivedKey) => {
        if (error) {
          reject(error)
          return
        }
        resolve(Buffer.from(derivedKey))
      },
    )
  })
}

function isAccount(value: unknown): value is LocalAccount {
  if (!value || typeof value !== 'object') {
    return false
  }

  const account = value as Partial<LocalAccount>
  return (
    typeof account.account_id === 'number' &&
    typeof account.username === 'string' &&
    typeof account.email === 'string' &&
    typeof account.password_hash === 'string' &&
    typeof account.role === 'string' &&
    typeof account.is_active === 'boolean' &&
    typeof account.created_at === 'string' &&
    typeof account.updated_at === 'string'
  )
}

async function loadAccounts(): Promise<LocalAccount[]> {
  if (!existsSync(STORE_PATH)) {
    return []
  }

  const raw = await readFile(STORE_PATH, 'utf8')
  if (!raw.trim()) {
    return []
  }

  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed.filter(isAccount)
  } catch {
    return []
  }
}

async function saveAccounts(accounts: LocalAccount[]): Promise<void> {
  await mkdir(path.dirname(STORE_PATH), { recursive: true })
  const tmpPath = `${STORE_PATH}.tmp`
  await writeFile(tmpPath, `${JSON.stringify(accounts, null, 2)}\n`, 'utf8')
  await rename(tmpPath, STORE_PATH)
}

function parseScryptHash(hash: string): {
  salt: string
  digest: Buffer
  keylen: number
} | null {
  const [params, salt, digestHex] = hash.split('$')
  if (!params || !params.startsWith('scrypt:') || !salt || !digestHex) {
    return null
  }

  const [, nStr, rStr, pStr] = params.split(':')
  const n = Number(nStr)
  const r = Number(rStr)
  const p = Number(pStr)
  const digest = Buffer.from(digestHex, 'hex')

  if (!Number.isInteger(n) || !Number.isInteger(r) || !Number.isInteger(p) || digest.length === 0) {
    return null
  }

  return { salt, digest, keylen: digest.length }
}

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString('hex')
  const digest = await scryptAsync(password, salt, SCRYPT_KEYLEN)
  return `scrypt:${SCRYPT_N}:${SCRYPT_R}:${SCRYPT_P}$${salt}$${digest.toString('hex')}`
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const parsed = parseScryptHash(hash)
  if (!parsed) {
    return false
  }

  const digest = await scryptAsync(password, parsed.salt, parsed.keylen)
  return digest.length === parsed.digest.length && crypto.timingSafeEqual(digest, parsed.digest)
}

function normalizeAccount(account: LocalAccount): LocalAccount {
  return {
    ...account,
    role: account.role ?? 'viewer',
    is_active: account.is_active ?? true,
    last_login_at: account.last_login_at ?? null,
  }
}

function nextAccountId(accounts: LocalAccount[]): number {
  return accounts.reduce((max, account) => Math.max(max, account.account_id), 0) + 1
}

async function ensureDemoAdmin(accounts: LocalAccount[]): Promise<void> {
  const hasAdmin = accounts.some(
    (account) => account.username === DEMO_ADMIN_USERNAME || account.email === DEMO_ADMIN_EMAIL,
  )
  if (hasAdmin) {
    return
  }

  accounts.push({
    account_id: nextAccountId(accounts),
    username: DEMO_ADMIN_USERNAME,
    email: DEMO_ADMIN_EMAIL,
    password_hash: await hashPassword(DEMO_ADMIN_PASSWORD),
    role: 'admin',
    is_active: true,
    last_login_at: null,
    created_at: nowIso(),
    updated_at: nowIso(),
  })
}

async function withStore<T>(handler: (accounts: LocalAccount[]) => Promise<T>): Promise<T> {
  const run = writeChain.then(async () => {
    const accounts = (await loadAccounts()).map(normalizeAccount)
    await ensureDemoAdmin(accounts)
    const result = await handler(accounts)
    await saveAccounts(accounts)
    return result
  })

  writeChain = run.then(
    () => undefined,
    () => undefined,
  )

  return await run
}

export interface LocalAuthResult {
  account_id: number
  username: string
  email: string
  role: AccountRole
}

export async function createLocalAccount(input: {
  username: string
  email: string
  password: string
  role?: AccountRole
}): Promise<{ account?: LocalAuthResult; error?: string }> {
  const role = input.role ?? 'viewer'
  if (!['admin', 'analyst', 'manager', 'viewer'].includes(role)) {
    return { error: 'Invalid role' }
  }

  return await withStore(async (accounts) => {
    if (accounts.some((account) => account.username === input.username)) {
      return { error: 'Username already taken' }
    }

    if (accounts.some((account) => account.email === input.email)) {
      return { error: 'Email already registered' }
    }

    const now = nowIso()
    const account: LocalAccount = {
      account_id: nextAccountId(accounts),
      username: input.username,
      email: input.email,
      password_hash: await hashPassword(input.password),
      role,
      is_active: true,
      last_login_at: null,
      created_at: now,
      updated_at: now,
    }

    accounts.push(account)

    return {
      account: {
        account_id: account.account_id,
        username: account.username,
        email: account.email,
        role: account.role,
      },
    }
  })
}

export async function verifyLocalLogin(input: {
  username: string
  password: string
}): Promise<{ account?: LocalAuthResult; error?: string }> {
  return await withStore(async (accounts) => {
    const account = accounts.find(
      (entry) => entry.username === input.username || entry.email === input.username,
    )

    if (!account) {
      return {}
    }

    if (!account.is_active) {
      return { error: 'Account is disabled' }
    }

    const valid = await verifyPassword(input.password, account.password_hash)
    if (!valid) {
      return {}
    }

    const now = nowIso()
    account.last_login_at = now
    account.updated_at = now

    return {
      account: {
        account_id: account.account_id,
        username: account.username,
        email: account.email,
        role: account.role,
      },
    }
  })
}

