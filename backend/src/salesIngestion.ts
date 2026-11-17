import { createHash } from 'node:crypto'
import { TextDecoder } from 'node:util'
import { CorrectionReviewError, decimalCents, parseCorrectionRequest, reconcileCorrection } from './intakeCorrection'
import { ReviewIntegrityError, verifyCorrectionReview } from './correctionReviewIntegrity'

export const INTAKE_POLICY = 'client_sales_csv_v1'
export const INTAKE_COLUMNS = ['source_record_id', 'delivery_date', 'dr_number', 'product', 'area', 'quantity', 'net_sales', 'gross_profit'] as const
export const INTAKE_LIMIT = 10 * 1024 * 1024
const STAGE_NAMES = ['bronze', 'silver', 'gold'] as const
const STAGE_COUNT_KEYS = ['records', 'received', 'accepted', 'rejected', 'non_transaction', 'category_review'] as const
export class IntakeError extends Error {
  constructor(message: string, readonly status = 400, readonly code = 'INVALID_SALES_INTAKE') { super(message) }
}
type Fetch = typeof fetch
export interface IntakeActor { account_id: number; role: string }
export interface IntakeConfig { host: string; token: string; volume: string; jobId: number; clientExports?: boolean }
const sha = (value: string | Buffer) => createHash('sha256').update(value).digest('hex')
export function intakeConfig(): IntakeConfig {
  const env = process.env
  if (env.DATABRICKS_INGESTION_ENABLED !== 'true') throw new IntakeError('Controlled CSV intake is not enabled. Ask the administrator to complete the ingestion setup.', 503, 'INGESTION_NOT_CONFIGURED')
  const host = env.DATABRICKS_HOST?.trim() ?? ''
  const token = env.DATABRICKS_INGESTION_TOKEN?.trim() || env.DATABRICKS_TOKEN?.trim() || ''
  const volume = env.DATABRICKS_INGESTION_VOLUME?.trim() ?? ''
  const jobId = Number(env.DATABRICKS_INGESTION_JOB_ID)
  let url: URL
  try { url = new URL(host.startsWith('https://') ? host : `https://${host}`) } catch { throw new IntakeError('Invalid ingestion workspace configuration.', 503, 'INGESTION_NOT_CONFIGURED') }
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash || !token || !/^\/Volumes\/[A-Za-z_]\w*\/[A-Za-z_]\w*\/[A-Za-z_]\w*$/.test(volume) || !Number.isSafeInteger(jobId) || jobId <= 0) {
    throw new IntakeError('Complete the server-only ingestion workspace, volume and job configuration.', 503, 'INGESTION_NOT_CONFIGURED')
  }
  return { host: url.origin, token, volume, jobId, ...(env.DATABRICKS_INGESTION_CLIENT_EXPORTS === 'true' && { clientExports: true }) }
}

/** RFC-style quoted CSV parsing; no splitting records on embedded newlines. */
function scanIntakeCsv(bytes: Buffer, maxColumns: number) {
  if (!bytes.length || bytes.length > INTAKE_LIMIT) throw new IntakeError('Select a nonempty CSV no larger than 10 MiB.', 413)
  let text: string
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^\uFEFF/, '') } catch { throw new IntakeError('The CSV must use UTF-8 encoding.') }
  if (text.includes('\0')) throw new IntakeError('The CSV contains unsupported binary data.')
  const rows: string[][] = []; let row: string[] = []; let field = ''; let quoted = false; let closed = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++ }
      else if (ch === '"') { quoted = false; closed = true }
      else field += ch
    } else if (ch === ',' || ch === '\n' || ch === '\r') {
      row.push(field); field = ''; closed = false
      if (row.length > maxColumns) throw new IntakeError('CSV has too many columns.')
      if (ch !== ',') { if (ch === '\r' && text[i + 1] === '\n') i++; rows.push(row); row = [] }
    } else if (ch === '"' && !field && !closed) quoted = true
    else { if (closed || ch === '"') throw new IntakeError('Malformed CSV quoting. Use the supplied template.'); field += ch }
    if (field.length > 10000 || rows.length > 100001) throw new IntakeError('CSV exceeds the 100,000-record or field-length limit.')
  }
  if (quoted) throw new IntakeError('The CSV has an unclosed quoted field.')
  if (field || row.length || closed) { row.push(field); rows.push(row) }
  if (rows.some(r => r.length > maxColumns)) throw new IntakeError('CSV has too many columns.')
  return { rows, text }
}

function templateRows(rows: string[][]) {
  if (JSON.stringify(rows[0]) !== JSON.stringify(INTAKE_COLUMNS)) throw new IntakeError(`Required header: ${INTAKE_COLUMNS.join(',')}`)
  if (rows.length < 2 || rows.length > 100001 || rows.slice(1).some(r => r.length !== INTAKE_COLUMNS.length)) throw new IntakeError('Provide 1–100,000 records with the template columns. Remove blank lines.')
  return rows
}

export function parseIntakeCsv(bytes: Buffer): string[][] {
  return templateRows(scanIntakeCsv(bytes, INTAKE_COLUMNS.length).rows)
}

// Normalized headers from the reviewed Databricks Silver parser.
const modernHeader = 'area,drnumber,datedelivered,product,qty,cp,totalcp,disc,netcp,tpunit,totaltp,netincome'
const groupedHeader = 'mo,date,area,drnumber,datedelivered,doctor,product,grosssales,,,netsales,,,costofsales,,,grossincome'
const groupedSubheader = ',,,,,,,quantity,cpunit,totalsales,%discount,discount,netsales,quantity,tpunit,totalcost,'
const headerTokens = (row: string[]) => row.map(value => value.toLowerCase().replace(/[^a-z0-9%]/g, ''))

function describeUpload(bytes: Buffer, clientExports?: boolean) {
  if (!clientExports) return { record_count: parseIntakeCsv(bytes).length - 1 }
  const { rows, text } = scanIntakeCsv(bytes, 32)
  if (JSON.stringify(rows[0]) === JSON.stringify(INTAKE_COLUMNS)) return { record_count: templateRows(rows).length - 1 }
  const layouts = rows.flatMap((row, index) => {
    const tokens = headerTokens(row)
    while (tokens.length && tokens.at(-1) === '') tokens.pop()
    const header = tokens.join(',')
    return [modernHeader, modernHeader + ',%', groupedHeader].includes(header) ? [{ header, index }] : []
  })
  const first = layouts[0]
  if (!first || layouts.some(layout => layout.header !== first.header)) throw new IntakeError('Use one supported modern client export layout or the CSV template.')
  const grouped = first.header === groupedHeader
  if (grouped && headerTokens(rows[first.index + 1] ?? []).join(',') !== groupedSubheader) throw new IntakeError('The grouped client export is missing its sales and cost subheader.')
  const record_count = text.split(/\r\n|\r|\n/).length
  if (record_count > 100000 || rows.length <= first.index + (grouped ? 2 : 1)) throw new IntakeError('Provide client data within the 100,000 physical-line limit.')
  return { record_count, source_format: 'client_export' }
}

export function createIntakeService(config: IntakeConfig, request: Fetch = fetch) {
  const invalidReport = () => new IntakeError('Intake evidence is invalid. Contact the data operator.', 502, 'INGESTION_REPORT_INVALID')
  const object = (value: unknown): Record<string, any> => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw invalidReport()
    return value as Record<string, any>
  }
  const parse = (bytes: Buffer) => {
    try { return object(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))) }
    catch { throw invalidReport() }
  }
  const actorCheck = (actor: IntakeActor) => {
    if (!actor || !Number.isSafeInteger(actor.account_id) || actor.account_id <= 0 || typeof actor.role !== 'string') throw new IntakeError('A linked account is required.', 403, 'INGESTION_FORBIDDEN')
  }
  const filePath = (path: string) => '/api/2.0/fs/files' + path.split('/').map(encodeURIComponent).join('/')
  async function call(path: string, init: RequestInit = {}): Promise<Response> {
    try {
      return await request(config.host + path, { ...init, redirect: 'error', headers: { Authorization: `Bearer ${config.token}`, ...init.headers }, signal: AbortSignal.timeout(30000) })
    } catch { throw new IntakeError('Databricks intake is unavailable. Retry the same file; do not alter it to bypass a retry.', 502, 'INGESTION_PROVIDER_UNAVAILABLE') }
  }
  function providerFailure(response: Response): never {
    throw new IntakeError(response.status === 403 ? 'Databricks denied intake access. Ask the administrator to check Jobs and volume permissions.' : 'Databricks could not complete the intake operation. Retry the same file.', 502, 'INGESTION_PROVIDER_UNAVAILABLE')
  }
  async function bounded(response: Response, limit: number): Promise<Buffer> {
    const length = response.headers.get('content-length')
    if (length && (!/^\d+$/.test(length) || Number(length) > limit)) { await response.body?.cancel(); throw invalidReport() }
    if (!response.body) return Buffer.alloc(0)
    const reader = response.body.getReader(); const parts: Buffer[] = []; let size = 0
    try {
      while (true) {
        const next = await reader.read()
        if (next.done) break
        size += next.value.byteLength
        if (size > limit) { await reader.cancel(); throw invalidReport() }
        parts.push(Buffer.from(next.value))
      }
      return Buffer.concat(parts)
    } catch (error) {
      if (error instanceof IntakeError) throw error
      throw new IntakeError('Databricks intake response was interrupted. Retry the same operation.', 502, 'INGESTION_PROVIDER_UNAVAILABLE')
    } finally { reader.releaseLock() }
  }
  async function read(path: string, optional = false, limit = 1024 * 1024): Promise<Buffer | null> {
    const response = await call(filePath(path), { cache: 'no-store' })
    if (optional && response.status === 404) return null
    if (!response.ok) providerFailure(response)
    return bounded(response, limit)
  }
  async function immutable(path: string, bytes: Buffer) {
    const response = await call(filePath(path) + '?overwrite=false', { method: 'PUT', headers: { 'Content-Type': 'application/octet-stream' }, body: new Uint8Array(bytes) })
    if (!response.ok && response.status !== 409) providerFailure(response)
    const stored = await read(path, false, bytes.length)
    if (!stored?.equals(bytes)) throw new IntakeError('Stored intake evidence conflicts with this request. Contact the data operator.', 409, 'INGESTION_IDENTITY_CONFLICT')
  }
  async function json(path: string, init?: RequestInit) {
    const response = await call(path, init)
    if (!response.ok) providerFailure(response)
    return parse(await bounded(response, 1024 * 1024))
  }
  const base = (id: string) => {
    if (!/^[a-f0-9]{64}$/.test(id)) throw new IntakeError('Invalid upload ID.')
    return `${config.volume}/submissions/${id}`
  }
  async function manifest(id: string, actor: IntakeActor) {
    actorCheck(actor)
    const bytes = await read(base(id) + '/manifest.json', true)
    if (!bytes) throw new IntakeError('Upload not found.', 404, 'INGESTION_NOT_FOUND')
    const value = parse(bytes)
    if (value.account_id !== actor.account_id && actor.role.toLowerCase() !== 'admin') throw new IntakeError('Upload not found.', 404, 'INGESTION_NOT_FOUND')
    if (value.schema_version !== 1 || value.ingestion_id !== id || value.policy_version !== INTAKE_POLICY || !Number.isSafeInteger(value.account_id) || value.account_id <= 0 || !/^[a-f0-9]{64}$/.test(value.source_sha256) || sha(`${INTAKE_POLICY}:${value.account_id}:${value.source_sha256}`) !== id || !Number.isSafeInteger(value.source_bytes) || value.source_bytes < 1 || value.source_bytes > INTAKE_LIMIT || !Number.isSafeInteger(value.record_count) || value.record_count < 1 || value.record_count > 100000 || (value.source_format !== undefined && value.source_format !== 'client_export')) throw invalidReport()
    return value
  }
  async function verifiedReport(id: string, source: Record<string, any>) {
    const bytes = await read(base(id) + '/report.json', true)
    if (!bytes) return null
    const report = parse(bytes)
    if (report.schema_version !== 1 || report.ingestion_id !== id || report.source_sha256 !== source.source_sha256 || report.policy_version !== INTAKE_POLICY || report.candidate_only !== true || report.published !== false || !['NEEDS_REVIEW', 'READY_FOR_APPROVAL'].includes(report.status) || !/^[a-f0-9]{64}$/.test(report.category_reference_sha256) || typeof report.net_sales_candidate !== 'string' || !/^-?\d+(?:\.\d{1,2})?$/.test(report.net_sales_candidate)) throw invalidReport()
    const counts = object(report.counts)
    const nonTransaction = counts.non_transaction === undefined ? 0 : counts.non_transaction
    if (['received','accepted','rejected','category_review'].some(key => !Number.isSafeInteger(counts[key]) || counts[key] < 0 || counts[key] > source.record_count) || !Number.isSafeInteger(nonTransaction) || nonTransaction < 0 || nonTransaction > source.record_count || (source.source_format !== 'client_export' && nonTransaction !== 0) || counts.received !== source.record_count || counts.accepted + counts.rejected + nonTransaction !== counts.received || (report.status === 'READY_FOR_APPROVAL' && (counts.rejected || counts.category_review))) throw invalidReport()
    const reports = object(report.reports)
    const resultReports: Record<string, { sha256: string; bytes: number }> = {}
    for (const kind of ['issues', 'classifications']) {
      const entry = object(reports[kind])
      if (!/^[a-f0-9]{64}$/.test(entry.sha256) || !Number.isSafeInteger(entry.bytes) || entry.bytes < 1 || entry.bytes > 64 * 1024 * 1024) throw invalidReport()
      resultReports[kind] = { sha256: entry.sha256, bytes: entry.bytes }
    }
    return { schema_version: 1, ingestion_id: id, source_sha256: source.source_sha256, policy_version: INTAKE_POLICY, category_reference_sha256: report.category_reference_sha256, candidate_only: true, published: false, status: report.status as string,
      counts: { received: counts.received, accepted: counts.accepted, rejected: counts.rejected, category_review: counts.category_review, ...(source.source_format === 'client_export' && { non_transaction: nonTransaction }) }, net_sales_candidate: report.net_sales_candidate as string, reports: resultReports,
      message: 'Candidate staged. Review issues and record release approval; the dashboard release has not changed.' }
  }
  /** Evidence-backed stage progress from immutable, hash-chained receipts written by the Databricks Job. Never guessed from run state. */
  async function stageEvidence(id: string, source: Record<string, any>) {
    const files = await Promise.all(STAGE_NAMES.map(name => read(base(id) + `/stages/stage_${name}.json`, true, 64 * 1024)))
    const stages: { name: string; state: 'SUCCEEDED' | 'NO_EVIDENCE_YET'; counts?: Record<string, number> }[] = []
    let previous: string | null = null
    let gap = false
    for (const [index, name] of STAGE_NAMES.entries()) {
      const bytes = files[index]
      if (!bytes) { gap = true; stages.push({ name, state: 'NO_EVIDENCE_YET' }); continue }
      if (gap) throw invalidReport()
      const receipt = parse(bytes)
      if (receipt.schema_version !== 1 || receipt.stage !== name || receipt.state !== 'SUCCEEDED' || receipt.ingestion_id !== id || receipt.source_sha256 !== source.source_sha256 || receipt.candidate_only !== true || receipt.published !== false || receipt.previous_receipt_sha256 !== previous) throw invalidReport()
      const raw = object(receipt.counts)
      const counts: Record<string, number> = {}
      for (const key of STAGE_COUNT_KEYS) {
        if (!(key in raw)) continue
        if (!Number.isSafeInteger(raw[key]) || raw[key] < 0) throw invalidReport()
        counts[key] = raw[key]
      }
      previous = sha(bytes)
      stages.push({ name, state: 'SUCCEEDED', counts })
    }
    return stages
  }
  async function correctionReview(id: string, actor: IntakeActor, input: unknown) {
    try {
      const request = parseCorrectionRequest(input)
      if (id === request.corrected_ingestion_id) throw new CorrectionReviewError('Choose two distinct candidates for correction review.')
      const previous = await manifest(id, actor)
      const corrected = await manifest(request.corrected_ingestion_id, actor)
      if (previous.source_format || corrected.source_format) throw new CorrectionReviewError('Use the Databricks promotion preview to compare client export periods.')
      if (previous.account_id !== corrected.account_id) throw new CorrectionReviewError('Correction candidates must belong to the same source account.')
      const previousReport = await verifiedReport(id, previous)
      const correctedReport = await verifiedReport(request.corrected_ingestion_id, corrected)
      if (!previousReport || !correctedReport) throw new IntakeError('Both candidates need completed verified validation reports.', 409, 'INGESTION_REPORT_NOT_READY')
      if (previousReport.counts.rejected || correctedReport.counts.rejected) throw new CorrectionReviewError('Resolve rejected source rows before correction reconciliation.')
      if (previousReport.category_reference_sha256 !== correctedReport.category_reference_sha256) throw new CorrectionReviewError('Category reference identities differ; reconcile the policy before correction review.')
      const sourceRows = async (candidate: Record<string, any>) => {
        const bytes = await read(base(candidate.ingestion_id) + '/source.csv', false, candidate.source_bytes)
        if (!bytes || bytes.length !== candidate.source_bytes || sha(bytes) !== candidate.source_sha256) throw invalidReport()
        const rows = parseIntakeCsv(bytes)
        if (rows.length - 1 !== candidate.record_count) throw invalidReport()
        return rows
      }
      const reconciliation = reconcileCorrection(await sourceRows(previous), await sourceRows(corrected), request)
      if (decimalCents(reconciliation.controls.before.net_sales_php) !== decimalCents(previousReport.net_sales_candidate) || decimalCents(reconciliation.controls.added.net_sales_php) !== decimalCents(correctedReport.net_sales_candidate)) throw invalidReport()
      const identity = (candidate: Record<string, any>) => ({ ingestion_id: candidate.ingestion_id as string, source_sha256: candidate.source_sha256 as string, record_count: candidate.record_count as number })
      const result = { schema_version: 1, review_kind: 'complete_period_replacement_preview', candidate_only: true, published: false, release_authorized: false,
        completeness: 'operator_assertion_not_independently_verified', period: { start: request.period_start, end: request.period_end }, previous: identity(previous), corrected: identity(corrected),
        category_reference_sha256: previousReport.category_reference_sha256, ...reconciliation }
      return { ...result, plan_sha256: sha(JSON.stringify(result)) }
    } catch (error) {
      if (error instanceof CorrectionReviewError) throw new IntakeError(error.message, 400, 'INVALID_CORRECTION_REVIEW')
      throw error
    }
  }
  return {
    correctionReview,
    async revalidateCorrectionReview(id: string, actor: IntakeActor, input: unknown) {
      let verified: ReturnType<typeof verifyCorrectionReview>
      try { verified = verifyCorrectionReview(input) }
      catch (error) {
        if (error instanceof ReviewIntegrityError) throw new IntakeError('Saved correction review is invalid. Generate a fresh preview.', 400, 'INVALID_CORRECTION_REVIEW')
        throw error
      }
      const review = input as { previous: { ingestion_id: string }; corrected: { ingestion_id: string }; period: { start: string; end: string } }
      if (review.previous.ingestion_id !== id) throw new IntakeError('Review does not match the requested previous candidate.', 400, 'INVALID_CORRECTION_REVIEW')
      // Never use saved totals as live facts: read and reconcile both candidates again.
      const current = await correctionReview(id, actor, { corrected_ingestion_id: review.corrected.ingestion_id, period_start: review.period.start, period_end: review.period.end, complete_period_asserted: true })
      if (current.plan_sha256 !== verified.plan_sha256) throw new IntakeError('Current candidate controls differ from this handoff. Generate a fresh preview.', 409, 'INGESTION_CORRECTION_CHANGED')
      return { schema_version: 1, status: 'MATCHES_CURRENT_CANDIDATE_CONTROLS', verification_scope: 'intake_candidate_sources_and_correction_controls', plan_sha256: current.plan_sha256,
        checked_at: new Date().toISOString(), source_revalidated: true, completeness_verified: false, serving_release_verified: false, release_authorized: false, published: false }
    },
    async submit(bytes: Buffer, filename: string, actor: IntakeActor) {
      actorCheck(actor)
      if (!/^[^\\/\x00-\x1f\x7f]{1,120}\.csv$/i.test(filename)) throw new IntakeError('Choose a CSV filename of at most 124 characters without path separators.')
      const upload = describeUpload(bytes, config.clientExports)
      const sourceHash = sha(bytes)
      const id = sha(`${INTAKE_POLICY}:${actor.account_id}:${sourceHash}`)
      // Filename is descriptive only; retry identity is stable across renames.
      const descriptor = { schema_version: 1, policy_version: INTAKE_POLICY, ingestion_id: id, account_id: actor.account_id, source_sha256: sourceHash, source_bytes: bytes.length, ...upload }
      const directory = await call('/api/2.0/fs/directories' + base(id).split('/').map(encodeURIComponent).join('/'), { method: 'PUT' })
      if (!directory.ok) providerFailure(directory)
      await immutable(base(id) + '/source.csv', bytes)
      await immutable(base(id) + '/manifest.json', Buffer.from(JSON.stringify(descriptor)))
      const run = await json('/api/2.2/jobs/run-now', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ job_id: config.jobId, idempotency_token: id, job_parameters: { ingestion_id: id } }) })
      if (!Number.isSafeInteger(run.run_id) || run.run_id <= 0) throw new IntakeError('Databricks returned no valid run identity.', 502, 'INGESTION_PROVIDER_UNAVAILABLE')
      await immutable(base(id) + '/run.json', Buffer.from(JSON.stringify({ job_id: config.jobId, run_id: run.run_id })))
      return { ingestion_id: id, run_id: run.run_id as number, status: 'QUEUED', candidate_only: true, published: false }
    },
    async status(id: string, actor: IntakeActor) {
      const source = await manifest(id, actor)
      // Report first: the Job writes the last receipt before the report, so this order cannot show a finished run missing its final stage.
      const report = await verifiedReport(id, source)
      const stages = await stageEvidence(id, source)
      if (report) return { ...report, stages }
      const receiptBytes = await read(base(id) + '/run.json', true)
      if (!receiptBytes) return { ingestion_id: id, status: 'SUBMISSION_INCOMPLETE', candidate_only: true, published: false, stages, message: 'Retry the identical CSV to resume job submission.' }
      const receipt = parse(receiptBytes)
      if (receipt.job_id !== config.jobId || !Number.isSafeInteger(receipt.run_id) || receipt.run_id <= 0) throw invalidReport()
      const run = await json(`/api/2.2/jobs/runs/get?run_id=${receipt.run_id}`)
      if (run.job_id !== config.jobId || run.run_id !== receipt.run_id) throw invalidReport()
      const state = run.state?.life_cycle_state
      if (!['PENDING','RUNNING','TERMINATING','TERMINATED','SKIPPED','INTERNAL_ERROR','BLOCKED','WAITING_FOR_RETRY','QUEUED'].includes(state)) throw invalidReport()
      const failed = ['TERMINATED', 'SKIPPED', 'INTERNAL_ERROR'].includes(state)
      // A run that reports success but left no verified report is missing evidence, not a clean result.
      const evidenceMissing = state === 'TERMINATED' && run.state?.result_state === 'SUCCESS'
      return { ingestion_id: id, run_id: receipt.run_id as number, status: failed ? 'FAILED' : state === 'RUNNING' ? 'PROCESSING' : 'QUEUED', candidate_only: true, published: false, stages, ...(evidenceMissing ? { evidence_missing: true } : {}),
        message: evidenceMissing ? 'Databricks finished the job but no verified report exists. Ask the data operator to inspect the run.' : failed ? 'Processing did not produce a verified report. Ask the data operator to inspect the job run.' : 'Processing in Databricks.' }
    },
    async report(id: string, actor: IntakeActor, kind: 'issues' | 'classifications') {
      if (kind !== 'issues' && kind !== 'classifications') throw new IntakeError('Unknown report.')
      const source = await manifest(id, actor)
      const report = await verifiedReport(id, source)
      if (!report) throw new IntakeError('The report is not ready.', 409, 'INGESTION_REPORT_NOT_READY')
      const expected = report.reports[kind]
      const bytes = await read(base(id) + `/${kind}.csv`, true, expected.bytes)
      if (!bytes) throw new IntakeError('The report is not ready.', 409, 'INGESTION_REPORT_NOT_READY')
      if (bytes.length !== expected.bytes || sha(bytes) !== expected.sha256) throw invalidReport()
      return bytes
    },
  }
}
