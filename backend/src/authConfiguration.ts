export type AuthenticationMode = 'local' | 'supabase'

export class AuthenticationConfigurationError extends Error {
  readonly code = 'AUTH_CONFIGURATION_INVALID'
}

// Credentials determine readiness, never whether development authentication is enabled.
export function resolveAuthenticationMode(env: NodeJS.ProcessEnv = process.env): AuthenticationMode {
  const requested = env.USE_SUPABASE?.trim().toLowerCase()
  const localRequested = requested !== undefined && ['0', 'false', 'no', 'off'].includes(requested)
  if (requested !== undefined && !localRequested && !['1', 'true', 'yes', 'on'].includes(requested)) {
    throw new AuthenticationConfigurationError('USE_SUPABASE must explicitly enable or disable Supabase Auth.')
  }
  if (localRequested) {
    if (env.NODE_ENV === 'production') {
      throw new AuthenticationConfigurationError('Production requires Supabase Auth; local authentication is development-only.')
    }
    return 'local'
  }
  if (!env.SUPABASE_URL?.trim() || !env.SUPABASE_ANON_KEY?.trim()) {
    throw new AuthenticationConfigurationError('Supabase Auth requires SUPABASE_URL and SUPABASE_ANON_KEY. Set USE_SUPABASE=false only for local development.')
  }
  return 'supabase'
}

export function requireLocalAuthentication(env: NodeJS.ProcessEnv = process.env): void {
  if (resolveAuthenticationMode(env) !== 'local') {
    throw new AuthenticationConfigurationError('Local accounts and sessions are disabled in Supabase authentication mode.')
  }
}

export async function authenticateSelectedMode<T>(
  mode: AuthenticationMode,
  token: string,
  validators: { local: (token: string) => T | null; supabase: (token: string) => Promise<T | null> },
): Promise<T | null> {
  return mode === 'local' ? validators.local(token) : await validators.supabase(token)
}
