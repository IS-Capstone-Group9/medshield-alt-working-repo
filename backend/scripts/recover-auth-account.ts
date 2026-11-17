import path from 'node:path'
import { existsSync } from 'node:fs'
import { config as loadDotenv } from 'dotenv'
import { createAuditStore } from '../src/auditStore'
import { AuthRecoveryError, recoverDeletedAuthAccount, type AuthRecoveryInput } from '../src/authRecovery'

const HELP = `Recover one previously migrated account after Auth deletion.
Default: read-only preflight. Ownership must be checked by an administrator out of band.
Required: --account-id N --expected-email EMAIL --operator ID
          --ownership-reference REF --operation-id UUID
Apply:    --apply --confirm-ownership --password-stdin
Resume:   --apply --confirm-ownership --resume (same operation; no password rotation)
Temporary passwords are accepted only from redirected stdin, never as arguments.
Keep the operation UUID for inspection/resume after partial or uncertain writes.`

function parseArguments(args: string[]): { input: AuthRecoveryInput; passwordStdin: boolean } {
  const values = new Map<string, string>()
  const flags = new Set<string>()
  const valued = ['--account-id', '--expected-email', '--operator', '--ownership-reference', '--operation-id']
  const boolean = ['--apply', '--confirm-ownership', '--password-stdin', '--resume']
  for (let index = 0; index < args.length; index += 1) {
    const key = args[index]
    if (values.has(key) || flags.has(key)) throw new AuthRecoveryError('RECOVERY_ARGUMENTS_INVALID', 'arguments')
    if (boolean.includes(key)) flags.add(key)
    else if (valued.includes(key) && args[index + 1] && !args[index + 1].startsWith('--')) values.set(key, args[++index])
    else throw new AuthRecoveryError('RECOVERY_ARGUMENTS_INVALID', 'arguments')
  }
  if (valued.some(key => !values.has(key)) || !/^[1-9]\d*$/.test(values.get('--account-id') ?? '') ||
      (flags.has('--password-stdin') && (!flags.has('--apply') || flags.has('--resume')))) {
    throw new AuthRecoveryError('RECOVERY_ARGUMENTS_INVALID', 'arguments')
  }
  return { input: {
    accountId: Number(values.get('--account-id')), expectedEmail: values.get('--expected-email')!,
    operator: values.get('--operator')!, ownershipReference: values.get('--ownership-reference')!,
    operationId: values.get('--operation-id')!, ownershipConfirmed: flags.has('--confirm-ownership'),
    apply: flags.has('--apply'), resume: flags.has('--resume'),
  }, passwordStdin: flags.has('--password-stdin') }
}

async function readPassword(): Promise<string> {
  if (process.stdin.isTTY) throw new AuthRecoveryError('RECOVERY_PASSWORD_STDIN_REQUIRED', 'arguments')
  process.stdin.setEncoding('utf8')
  let text = ''
  for await (const chunk of process.stdin) {
    text += chunk.toString('utf8')
    if (Buffer.byteLength(text, 'utf8') > 1024) throw new AuthRecoveryError('RECOVERY_INPUT_INVALID', 'validation')
  }
  return text.replace(/\r?\n$/, '')
}

async function main() {
  const args = process.argv.slice(2)
  if (args.length === 1 && args[0] === '--help') { console.log(HELP); return }
  const { input, passwordStdin } = parseArguments(args)
  if (input.apply && !input.resume && !passwordStdin) throw new AuthRecoveryError('RECOVERY_PASSWORD_STDIN_REQUIRED', 'arguments')
  if (passwordStdin) input.temporaryPassword = await readPassword()

  const backend = path.resolve(__dirname, '..')
  const environment = process.env.MEDSHIELD_ENV_FILE || path.join(backend, '.env')
  if (existsSync(environment)) loadDotenv({ path: environment })
  const url = process.env.SUPABASE_URL?.trim().replace(/\/$/, '') ?? ''
  const serverSecret = process.env.SUPABASE_SECRET_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || ''
  const auditStore = createAuditStore({
    logPath: path.resolve(process.env.MEDSHIELD_AUDIT_LOG_PATH || path.join(backend, 'data/local_audit_logs.jsonl')),
    remoteRequest: async (route, init) => {
      const headers = new Headers(init.headers)
      headers.set('apikey', serverSecret)
      if (!serverSecret.startsWith('sb_secret_')) headers.set('Authorization', `Bearer ${serverSecret}`)
      headers.set('Accept-Profile', 'medshield_identity')
      headers.set('Content-Profile', 'medshield_identity')
      headers.set('Content-Type', 'application/json')
      return fetch(`${url}/rest/v1${route}`, { ...init, headers, redirect: 'error', signal: AbortSignal.timeout(10000) })
    },
  })
  const result = await recoverDeletedAuthAccount(input, { url, serverSecret, persistAudit: auditStore.persist })
  console.log(JSON.stringify(result))
}

void main().catch(error => {
  console.error(JSON.stringify(error instanceof AuthRecoveryError
    ? { status: 'failed', code: error.code, phase: error.phase, identity_may_have_changed: error.identityMayHaveChanged,
      next_action: error.identityMayHaveChanged ? 'Inspect state, then use --resume with the same operation UUID; do not delete users.' : 'Correct the preflight or dependency issue before retrying.' }
    : { status: 'failed', code: 'RECOVERY_FAILED', next_action: 'Inspect configuration and dependencies; no provider error body is printed.' }))
  process.exitCode = 1
})
