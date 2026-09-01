import crypto from 'node:crypto'

export interface SessionUser {
  account_id: number
  username: string
  email: string
  role: string
  password_reset_required?: boolean
}

export interface SessionRecord {
  tokenHash: string
  user: SessionUser
  createdAt: number
  expiresAt: number
}

const DEFAULT_SESSION_TTL_MS = 8 * 60 * 60 * 1000
const REMEMBER_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000

const sessions = new Map<string, SessionRecord>()

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

function cleanupExpiredSessions(now = Date.now()): void {
  for (const [tokenHash, session] of sessions.entries()) {
    if (session.expiresAt <= now) {
      sessions.delete(tokenHash)
    }
  }
}

export function createSession(user: SessionUser, remember = false): {
  access_token: string
  token_type: 'Bearer'
  expires_at: string
  user: SessionUser
} {
  cleanupExpiredSessions()
  const accessToken = crypto.randomBytes(32).toString('base64url')
  const now = Date.now()
  const expiresAt = now + (remember ? REMEMBER_SESSION_TTL_MS : DEFAULT_SESSION_TTL_MS)
  const tokenHash = hashToken(accessToken)

  sessions.set(tokenHash, {
    tokenHash,
    user,
    createdAt: now,
    expiresAt,
  })

  return {
    access_token: accessToken,
    token_type: 'Bearer',
    expires_at: new Date(expiresAt).toISOString(),
    user,
  }
}

export function verifySessionToken(token: string): SessionUser | null {
  cleanupExpiredSessions()
  const session = sessions.get(hashToken(token))
  if (!session) {
    return null
  }

  return session.user
}

export function revokeSessionToken(token: string): void {
  sessions.delete(hashToken(token))
}

