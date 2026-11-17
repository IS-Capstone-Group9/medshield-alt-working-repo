import { API_BASE_URL, authHeaders } from './api-client'

type Requester = (path: string, init: RequestInit) => Promise<Response>
const endpoint = '/api/sales/ingestions'
const idPattern = /^[a-f0-9]{64}$/
class IntakePanelError extends Error {}
type CorrectionSummary = { record_count: number; net_sales_php: string; gross_profit_known_php: string; gross_profit_known_records: number; gross_profit_missing_records: number }
type CorrectionControls = Record<'before' | 'removed' | 'added' | 'after', CorrectionSummary>
type CorrectionReference = { ingestion_id: string; source_sha256: string; record_count: number }
type CorrectionReview = {
  schema_version: 1; review_kind: 'complete_period_replacement_preview'; candidate_only: true; published: false; release_authorized: false
  completeness: 'operator_assertion_not_independently_verified'; period: { start: string; end: string }
  previous: CorrectionReference; corrected: CorrectionReference; category_reference_sha256: string; controls: CorrectionControls
  scope_comparison: { unchanged_records: number; removed_records: number; added_records: number }
  monthly: ({ month: string } & CorrectionControls)[]; plan_sha256: string
}
type CorrectionRecheck = {
  schema_version: 1; status: 'MATCHES_CURRENT_CANDIDATE_CONTROLS'; verification_scope: 'intake_candidate_sources_and_correction_controls'
  plan_sha256: string; checked_at: string; source_revalidated: true; completeness_verified: false
  serving_release_verified: false; release_authorized: false; published: false
}
function correctionRecheck(value: unknown, planHash: string): CorrectionRecheck {
  const keys = ['schema_version', 'status', 'verification_scope', 'plan_sha256', 'checked_at', 'source_revalidated', 'completeness_verified', 'serving_release_verified', 'release_authorized', 'published']
  const invalid = () => new IntakePanelError('Candidate evidence recheck receipt is invalid or does not match this correction review. Generate a fresh preview.')
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).sort().join('|') !== keys.sort().join('|')) throw invalid()
  const v = value as Record<string, unknown>
  if (v.schema_version !== 1 || v.status !== 'MATCHES_CURRENT_CANDIDATE_CONTROLS' || v.verification_scope !== 'intake_candidate_sources_and_correction_controls' || v.plan_sha256 !== planHash || v.source_revalidated !== true || v.completeness_verified !== false || v.serving_release_verified !== false || v.release_authorized !== false || v.published !== false) throw invalid()
  if (typeof v.checked_at !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(v.checked_at) || !Number.isFinite(Date.parse(v.checked_at)) || new Date(v.checked_at).toISOString() !== v.checked_at) throw invalid()
  return value as CorrectionRecheck
}
const monthPattern = /^(?:20[1-9][0-9]|2[1-9][0-9]{2}|[3-9][0-9]{3})-(?:0[1-9]|1[0-2])$/
const count = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) >= 0
const cents = (value: string) => BigInt(value.replace('.', ''))
const summaryKeys = ['record_count', 'net_sales_php', 'gross_profit_known_php', 'gross_profit_known_records', 'gross_profit_missing_records'] as const
const controlKeys = ['before', 'removed', 'added', 'after'] as const
/** Reject unknown fields so a review download cannot silently include raw records or approval. */
function correctionReview(value: unknown, previous: string, corrected: string, start: string, end: string): CorrectionReview {
  const invalid = () => new IntakePanelError('Correction review is invalid or does not match these candidates and months.')
  const object = (value: unknown, keys: readonly string[]): Record<string, any> => {
    if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).sort().join('|') !== [...keys].sort().join('|')) throw invalid()
    return value as Record<string, any>
  }
  const summary = (value: unknown): CorrectionSummary => {
    const s = object(value, summaryKeys)
    if (!count(s.record_count) || !count(s.gross_profit_known_records) || !count(s.gross_profit_missing_records) || s.gross_profit_known_records + s.gross_profit_missing_records !== s.record_count) throw invalid()
    for (const key of ['net_sales_php', 'gross_profit_known_php']) if (typeof s[key] !== 'string' || !/^-?(?:0|[1-9][0-9]{0,22})\.[0-9]{2}$/.test(s[key]) || s[key] === '-0.00') throw invalid()
    if (!s.record_count && (cents(s.net_sales_php) !== 0n || cents(s.gross_profit_known_php) !== 0n) || !s.gross_profit_known_records && cents(s.gross_profit_known_php) !== 0n) throw invalid()
    return s as CorrectionSummary
  }
  const controls = (value: unknown): CorrectionControls => {
    const c = object(value, controlKeys)
    for (const key of controlKeys) summary(c[key])
    for (const key of summaryKeys) {
      const amount = (s: CorrectionSummary) => typeof s[key] === 'string' ? cents(s[key] as string) : BigInt(s[key])
      if (amount(c.before) - amount(c.removed) + amount(c.added) !== amount(c.after)) throw invalid()
    }
    if (c.removed.record_count > c.before.record_count) throw invalid()
    return c as CorrectionControls
  }
  const v = object(value, ['schema_version', 'review_kind', 'candidate_only', 'published', 'release_authorized', 'completeness', 'period', 'previous', 'corrected', 'category_reference_sha256', 'controls', 'scope_comparison', 'monthly', 'plan_sha256'])
  if (v.schema_version !== 1 || v.review_kind !== 'complete_period_replacement_preview' || v.candidate_only !== true || v.published !== false || v.release_authorized !== false || v.completeness !== 'operator_assertion_not_independently_verified' || !idPattern.test(v.plan_sha256) || typeof v.plan_sha256 !== 'string' || typeof v.category_reference_sha256 !== 'string' || !idPattern.test(v.category_reference_sha256)) throw invalid()
  const period = object(v.period, ['start', 'end'])
  if (period.start !== start || period.end !== end) throw invalid()
  for (const [key, id] of [['previous', previous], ['corrected', corrected]]) {
    const ref = object(v[key], ['ingestion_id', 'source_sha256', 'record_count'])
    if (ref.ingestion_id !== id || typeof ref.source_sha256 !== 'string' || !idPattern.test(ref.source_sha256) || !count(ref.record_count) || !ref.record_count) throw invalid()
  }
  const c = controls(v.controls), comparison = object(v.scope_comparison, ['unchanged_records', 'removed_records', 'added_records'])
  if (c.before.record_count !== v.previous.record_count || c.added.record_count !== v.corrected.record_count || !Object.values(comparison).every(count) || comparison.unchanged_records + comparison.removed_records !== c.removed.record_count || comparison.unchanged_records + comparison.added_records !== c.added.record_count) throw invalid()
  if (!Array.isArray(v.monthly) || !v.monthly.length || v.monthly.length > 1200) throw invalid()
  let last = ''
  for (const row of v.monthly) {
    const m = object(row, ['month', ...controlKeys])
    if (typeof m.month !== 'string' || !monthPattern.test(m.month) || m.month < '2017-01' || m.month <= last) throw invalid()
    last = m.month
    const mc = controls(Object.fromEntries(controlKeys.map(key => [key, m[key]])))
    if (!mc.before.record_count && !mc.added.record_count || (m.month < start || m.month > end) && (mc.removed.record_count || mc.added.record_count)) throw invalid()
  }
  for (const control of controlKeys) for (const key of summaryKeys) {
    const amount = (s: CorrectionSummary) => typeof s[key] === 'string' ? cents(s[key] as string) : BigInt(s[key])
    if (v.monthly.reduce((total: bigint, row: Record<string, CorrectionSummary>) => total + amount(row[control]), 0n) !== amount(c[control])) throw invalid()
  }
  return v as CorrectionReview
}
const request: Requester = async (path, init) => fetch(API_BASE_URL + path, {
  ...init, cache: 'no-store', headers: await authHeaders(init.headers),
})

/** Candidate intake is independent of the currently displayed analytical release. */
export function installSalesIntake(root: HTMLElement, role: string, send: Requester = request): () => void {
  const host = root.querySelector('#sourcePageTitle')?.closest('section')
  if (!host || !['admin', 'analyst'].includes(role.toLowerCase())) return () => {}
  const panel = document.createElement('section')
  panel.className = 'sales-intake-panel'
  panel.setAttribute('aria-labelledby', 'intakeTitle')
  panel.innerHTML = `
    <h3 id="intakeTitle">Submit sales for review</h3>
    <p>Send a CSV to the controlled Databricks pipeline. This creates a separate candidate; the dashboard release stays unchanged.</p>
    <p id="intakeFileHelp">Use the template header. Keep original DR numbers and repeated legitimate transactions.</p>
    <details><summary>File rules</summary><p>Source record ID is a unique row reference within this file, not a customer or SKU ID. Give the candidate ID to the data operator for period review.</p><p>For a correction, prepare the complete affected period and give both candidate IDs to the data operator. This form does not replace published records.</p></details>
    <div class="intake-actions btn-row"><button type="button" data-intake-config>Check intake availability</button><button type="button" data-intake-template disabled>Download CSV template</button></div>
    <div class="intake-section">
      <div class="intake-field">
        <label for="intakeFile">Sales CSV (UTF-8, up to 10 MiB)</label>
        <input id="intakeFile" data-intake-file type="file" accept=".csv,text/csv" aria-describedby="intakeFileHelp" disabled>
      </div>
      <button type="button" data-intake-submit disabled>Submit candidate</button>
      <p data-intake-selection role="status">No file selected.</p>
    </div>
    <div class="intake-section">
      <div class="intake-field">
        <label for="intakeId">Candidate ID</label>
        <input id="intakeId" data-intake-id type="text" maxlength="64" autocomplete="off" spellcheck="false" placeholder="64-character candidate ID">
      </div>
      <div class="intake-actions btn-row"><button type="button" data-intake-status disabled>Check candidate status</button><button type="button" data-intake-issues disabled>Download issues</button><button type="button" data-intake-classifications disabled>Download categories</button></div>
    </div>
    <p data-intake-feedback role="status" aria-live="polite">Check availability before submitting. No file is sent until you choose Submit candidate.</p>
    <dl data-intake-result hidden></dl>
    <details data-intake-correction><summary>Review a complete-period correction</summary>
      <p>Use the Candidate ID above as the previous snapshot. Enter the new corrected candidate below. This preview replaces the entire declared period in a proposed row set; it does not append both snapshots, publish data or verify that the source period is complete.</p>
      <div class="intake-field"><label for="intakeCorrectedId">Corrected candidate ID</label><input id="intakeCorrectedId" data-intake-corrected-id type="text" maxlength="64" autocomplete="off" spellcheck="false"></div>
      <div class="intake-field"><label for="intakePeriodStart">First replacement month</label><input id="intakePeriodStart" data-intake-period-start type="month" min="2017-01"></div>
      <div class="intake-field"><label for="intakePeriodEnd">Last replacement month</label><input id="intakePeriodEnd" data-intake-period-end type="month" min="2017-01"></div>
      <label for="intakeComplete"><input id="intakeComplete" data-intake-complete type="checkbox" style="display:inline-block;width:auto;margin-right:8px">I assert that the corrected file contains the complete declared period. This is my assertion, not verified completeness or release approval.</label>
      <div class="intake-actions btn-row"><button type="button" data-intake-preview disabled>Preview correction</button><button type="button" data-intake-review-download disabled>Download correction review JSON</button><button type="button" data-intake-recheck disabled>Recheck candidate evidence</button><button type="button" data-intake-recheck-download disabled>Download source-check receipt JSON</button></div>
      <p data-intake-correction-feedback role="status" aria-live="polite">No correction review loaded. Both candidate files must already be validated.</p>
      <dl data-intake-correction-result hidden></dl>
      <p data-intake-recheck-feedback role="status" aria-live="polite">No point-in-time candidate source check loaded. A recheck does not verify period completeness, the serving release or publication approval.</p>
    </details>`
  host.append(panel)
  const el = <T extends HTMLElement>(name: string) => panel.querySelector<T>(`[data-intake-${name}]`)!
  const file = el<HTMLInputElement>('file'), id = el<HTMLInputElement>('id')
  const feedback = el('feedback'), result = el('result'), selection = el('selection')
  const correctedId = el<HTMLInputElement>('corrected-id'), periodStart = el<HTMLInputElement>('period-start'), periodEnd = el<HTMLInputElement>('period-end'), complete = el<HTMLInputElement>('complete')
  const correctionFeedback = el('correction-feedback'), correctionResult = el('correction-result')
  let review: CorrectionReview | null = null
  let recheck: CorrectionRecheck | null = null
  const recheckFeedback = el('recheck-feedback')
  let enabled = false, busy = false, disposed = false, generation = 0, verifiedId = '', previewInFlight = false
  let controller: AbortController | null = null
  const listeners: [EventTarget, string, EventListener][] = []
  const listen = (target: EventTarget, name: string, handler: EventListener) => {
    target.addEventListener(name, handler); listeners.push([target, name, handler])
  }
  const controls = () => {
    el<HTMLButtonElement>('config').disabled = busy
    el<HTMLButtonElement>('template').disabled = busy || !enabled
    file.disabled = busy || !enabled
    id.disabled = busy
    el<HTMLButtonElement>('submit').disabled = busy || !enabled || !file.files?.length
    el<HTMLButtonElement>('status').disabled = busy || !enabled || !idPattern.test(id.value.trim())
    for (const name of ['issues', 'classifications']) el<HTMLButtonElement>(name).disabled = busy || !enabled || verifiedId !== id.value.trim() || !verifiedId
    for (const input of [correctedId, periodStart, periodEnd, complete]) input.disabled = busy
    const monthsValid = monthPattern.test(periodStart.value) && periodStart.value >= '2017-01' && monthPattern.test(periodEnd.value) && periodEnd.value >= periodStart.value
    el<HTMLButtonElement>('preview').disabled = busy || !enabled || !idPattern.test(id.value.trim()) || !idPattern.test(correctedId.value.trim()) || id.value.trim() === correctedId.value.trim() || !monthsValid || !complete.checked
    el<HTMLButtonElement>('review-download').disabled = busy || !enabled || !review
    el<HTMLButtonElement>('recheck').disabled = busy || !enabled || !review
    el<HTMLButtonElement>('recheck-download').disabled = busy || !enabled || !review || !recheck
    panel.setAttribute('aria-busy', String(busy))
  }
  const clearRecheck = () => { recheck = null; recheckFeedback.textContent = 'No point-in-time candidate source check loaded. A recheck does not verify period completeness, the serving release or publication approval.'; controls() }
  const clearCorrection = () => { review = null; correctionResult.replaceChildren(); correctionResult.hidden = true; correctionFeedback.textContent = 'No correction review loaded. Preview again after reviewing the candidate IDs, period and completeness assertion.'; clearRecheck() }
  const clear = () => { verifiedId = ''; result.replaceChildren(); result.hidden = true; clearCorrection() }
  const download = (blob: Blob, filename: string) => {
    if (disposed || !panel.isConnected) return
    const url = URL.createObjectURL(blob), link = document.createElement('a')
    link.href = url; link.download = filename; link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  const operation = async (work: (call: Requester) => Promise<void>, preserveResult = false, correction = false, rechecking = false) => {
    if (disposed || busy) return
    if (!preserveResult) clear()
    const mine = ++generation
    controller = new AbortController()
    const signal = controller.signal
    busy = true; previewInFlight = correction; controls(); feedback.textContent = 'Contacting controlled intake…'
    const call: Requester = async (path, init) => {
      const response = await send(path, { ...init, signal })
      if (disposed || mine !== generation) throw new IntakePanelError('Request superseded.')
      if (!response.ok) {
        // Provider diagnostics, raw records and configuration details never render here.
        const message = rechecking && response.status === 409 ? 'The saved correction review no longer matches current candidate controls, or evidence is not ready. Generate a fresh preview before rechecking.'
          : rechecking && response.status === 413 ? 'The saved correction review exceeds the 2 MiB request limit. Generate a smaller supported review; do not include source records.'
            : rechecking && (response.status === 400 || response.status === 415) ? 'The saved correction review is invalid. Generate a fresh preview before rechecking candidate evidence.'
              : correction && response.status === 409 ? 'Both candidates need verified validation reports before correction review. Check their status and resolve the review issues.'
          : correction && response.status === 413 ? 'Correction review request exceeds its size limit. Send only candidate IDs, months and the completeness assertion.'
            : correction && (response.status === 400 || response.status === 415) ? 'Correction review could not validate these candidates, months or source controls. Review the candidate IDs, validation reports and complete-period assertion.'
              : response.status === 503 ? 'Intake is not configured or temporarily unavailable. Ask the administrator to check setup.'
          : response.status === 401 || response.status === 403 ? 'Your session or role cannot use sales intake.'
            : response.status === 413 ? 'The CSV exceeds the intake size limit.'
              : response.status === 400 || response.status === 415 ? 'The file or request is invalid. Check the template, UTF-8 encoding and CSV quoting.'
                : rechecking ? 'Candidate evidence recheck could not complete the request. Generate a fresh preview or contact the data operator; no release was authorized.'
                  : correction ? 'Correction review could not complete the request. Recheck candidate status or contact the data operator; published data is unchanged.'
                  : 'Intake could not complete the request. Retry the identical file or check its candidate ID; do not change the file just to bypass a retry.'
        throw new IntakePanelError(message)
      }
      return response
    }
    try { await work(call) }
    catch (error) {
      if (!disposed && mine === generation) {
        clear()
        feedback.textContent = error instanceof IntakePanelError ? error.message : rechecking ? 'Candidate evidence recheck response is unavailable or invalid. Generate a fresh preview.' : 'Intake response is unavailable or invalid. Check availability or retry the identical file.'
      }
    } finally {
      if (!disposed && mine === generation) { busy = false; previewInFlight = false; controller = null; controls() }
    }
  }
  listen(el('config'), 'click', () => { void operation(async call => {
    enabled = false
    const value = await (await call(endpoint + '/configuration', {})).json()
    if (disposed) return
    if (value.enabled !== true || value.policy_version !== 'client_sales_csv_v1' || value.max_bytes !== 10 * 1024 * 1024) throw new IntakePanelError('Intake configuration is incompatible. Contact the administrator.')
    const fileHelp = panel.querySelector('#intakeFileHelp')
    if (fileHelp && value.client_exports === true) fileHelp.textContent = 'Use the CSV template or a supported modern client export. Preserve original DR numbers and legitimate repeated transactions.'
    enabled = true
    feedback.textContent = 'Controlled intake is available. Candidates require data review and a separate release decision.'
  }) })
  listen(file, 'change', () => {
    clear()
    const selected = file.files?.[0]
    if (selected && (!/\.csv$/i.test(selected.name) || selected.size <= 0 || selected.size > 10 * 1024 * 1024)) {
      file.value = ''; selection.textContent = 'Choose a nonempty .csv file up to 10 MiB.'
    } else selection.textContent = selected ? `${selected.name} · ${selected.size.toLocaleString()} bytes. Not submitted.` : 'No file selected.'
    controls()
  })
  listen(id, 'input', () => { complete.checked = false; clear(); feedback.textContent = 'Check this candidate to load its verified status and reports.' })
  for (const input of [correctedId, periodStart, periodEnd, complete]) listen(input, input === complete ? 'change' : 'input', () => { if (input !== complete) complete.checked = false; clearCorrection() })
  listen(root, 'medshield:source-reloaded', () => {
    if (previewInFlight) { generation++; controller?.abort(); controller = null; busy = false; previewInFlight = false }
    complete.checked = false; clearCorrection()
    correctionFeedback.textContent = 'Source reloaded. Prepare a fresh correction preview if needed; no release was changed.'
  })
  listen(el('template'), 'click', () => { void operation(async call => {
    const response = await call(endpoint + '/template', {})
    download(await response.blob(), 'medshield-sales-template.csv')
    feedback.textContent = 'Template downloaded. Preserve source values; leave unavailable optional values blank.'
  }) })
  listen(el('submit'), 'click', () => { void operation(async call => {
    const selected = file.files?.[0]
    if (!enabled || !selected || selected.size <= 0 || selected.size > 10 * 1024 * 1024) throw new IntakePanelError('Choose a valid CSV first.')
    const response = await call(endpoint + '?filename=' + encodeURIComponent(selected.name), {
      method: 'POST', headers: { 'Content-Type': 'text/csv' }, body: selected,
    })
    const value = await response.json()
    if (disposed) return
    if (typeof value.ingestion_id !== 'string' || !idPattern.test(value.ingestion_id) || !Number.isSafeInteger(value.run_id) || value.run_id <= 0 || value.candidate_only !== true || value.published !== false || value.status !== 'QUEUED') throw new IntakePanelError('Candidate receipt is invalid. Ask the data operator to inspect the submission.')
    id.value = value.ingestion_id
    complete.checked = false
    feedback.textContent = 'Candidate queued. Keep its ID and check status. Retrying this identical file uses the same candidate; published data is unchanged.'
  }) })
  listen(el('status'), 'click', () => { void operation(async call => {
    const candidate = id.value.trim()
    if (!idPattern.test(candidate)) throw new IntakePanelError('Enter a valid candidate ID.')
    const value = await (await call(endpoint + '/' + candidate, {})).json()
    if (disposed) return
    const statuses = ['QUEUED', 'PROCESSING', 'FAILED', 'SUBMISSION_INCOMPLETE', 'NEEDS_REVIEW', 'READY_FOR_APPROVAL']
    if (value.ingestion_id !== candidate || value.candidate_only !== true || value.published !== false || !statuses.includes(value.status)) throw new IntakePanelError('Candidate status is invalid. Contact the data operator.')
    const complete = ['NEEDS_REVIEW', 'READY_FOR_APPROVAL'].includes(value.status)
    const items: [string, string][] = [['Candidate', candidate], ['Status', value.status.replaceAll('_', ' ')], ['Published', 'No — dashboard release unchanged']]
    if (value.stages !== undefined) {
      // Stage rows come only from verified Databricks receipts; absent evidence is shown as such, never guessed.
      const names = ['bronze', 'silver', 'gold']
      if (!Array.isArray(value.stages) || value.stages.length !== names.length || value.stages.some((stage: { name?: string; state?: string }, index: number) => stage?.name !== names[index] || !['SUCCEEDED', 'NO_EVIDENCE_YET'].includes(stage?.state ?? ''))) throw new IntakePanelError('Candidate stage evidence is invalid. Contact the data operator.')
      for (const stage of value.stages as { name: string; state: string }[]) items.push([`Stage: ${stage.name}`, stage.state === 'SUCCEEDED' ? 'Done' : 'No evidence yet'])
    }
    if (complete) {
      const c = value.counts
      const keys = ['received', 'accepted', 'rejected', 'category_review']
      if (c?.non_transaction !== undefined) keys.push('non_transaction')
      if (!c || !keys.every(k => Number.isSafeInteger(c[k]) && c[k] >= 0) || c.received !== c.accepted + c.rejected + (c.non_transaction ?? 0) || c.category_review > c.received || c.received < 1) throw new IntakePanelError('Candidate counts are invalid.')
      for (const key of keys) items.push([key.replaceAll('_', ' '), String(c[key])])
      verifiedId = candidate
    }
    result.replaceChildren()
    for (const [label, value] of items) {
      const term = document.createElement('dt'), detail = document.createElement('dd')
      term.textContent = label; detail.textContent = value; result.append(term, detail)
    }
    result.hidden = false
    feedback.textContent = complete ? 'Validation finished. Download issues and categories for review. Ready for approval is not an approved release.'
      : value.status === 'SUBMISSION_INCOMPLETE' ? 'Submission was interrupted. Retry the identical CSV to resume.'
        : value.status === 'FAILED' ? 'The job did not produce a verified report. Give this ID to the data operator.'
          : 'Databricks is processing this candidate. Check status again shortly.'
  }) })
  for (const kind of ['issues', 'classifications'] as const) listen(el(kind), 'click', () => { void operation(async call => {
    const candidate = id.value.trim()
    if (verifiedId !== candidate || !candidate) throw new IntakePanelError('Check candidate status before downloading reports.')
    const response = await call(`${endpoint}/${candidate}/reports/${kind}`, {})
    download(await response.blob(), `medshield-${candidate.slice(0, 12)}-${kind}.csv`)
    feedback.textContent = 'Verified candidate report downloaded. It does not change the published release.'
  }, true) })
  listen(el('preview'), 'click', () => { void operation(async call => {
    const previewGeneration = generation
    const previous = id.value.trim(), corrected = correctedId.value.trim(), start = periodStart.value, end = periodEnd.value
    if (!enabled || !idPattern.test(previous) || !idPattern.test(corrected) || previous === corrected || !monthPattern.test(start) || start < '2017-01' || !monthPattern.test(end) || end < start || !complete.checked) throw new IntakePanelError('Enter distinct candidate IDs, valid replacement months and the completeness assertion.')
    correctionFeedback.textContent = 'Reading candidate evidence and reconciling the proposed replacement…'
    const response = await call(`${endpoint}/${previous}/correction-review`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ corrected_ingestion_id: corrected, period_start: start, period_end: end, complete_period_asserted: true }) })
    const value = await response.json()
    if (disposed || generation !== previewGeneration) return
    review = correctionReview(value, previous, corrected, start, end)
    const labels = { before: 'Before replacement', removed: 'Remove previous period', added: 'Add corrected period', after: 'Proposed result' }
    correctionResult.replaceChildren()
    for (const key of controlKeys) {
      const term = document.createElement('dt'), detail = document.createElement('dd'), s = review.controls[key]
      term.textContent = labels[key]; detail.textContent = `${s.record_count} records · ₱${s.net_sales_php} net sales row-set sum · ${s.gross_profit_missing_records} records with unknown gross profit`
      correctionResult.append(term, detail)
    }
    correctionResult.hidden = false
    correctionFeedback.textContent = 'Correction preview only. Completeness is an operator assertion, not independently verified. Empty row-set sums are accounting controls, not observed zero sales. No release is authorized and published data is unchanged.'
    feedback.textContent = 'Correction preview loaded. Download the review handoff for the data operator; separate source and release decisions remain required.'
  }, false, true) })
  listen(el('review-download'), 'click', () => {
    if (disposed || busy || !review) return
    download(new Blob([JSON.stringify(review, null, 2) + '\n'], { type: 'application/json' }), `medshield-correction-${review.plan_sha256.slice(0, 12)}.json`)
    correctionFeedback.textContent = 'Review JSON downloaded. It contains candidate identities and reconciliation controls, no source records or release authorization.'
  })
  listen(el('recheck'), 'click', () => { void operation(async call => {
    const currentReview = review, recheckGeneration = generation
    if (!enabled || !currentReview) throw new IntakePanelError('Generate a correction preview before rechecking candidate evidence.')
    clearRecheck()
    recheckFeedback.textContent = 'Rechecking candidate sources and correction controls. Published data is unchanged.'
    const body = JSON.stringify(currentReview)
    if (new Blob([body]).size > 2 * 1024 * 1024) throw new IntakePanelError('The saved correction review exceeds the 2 MiB request limit. Generate a smaller supported review.')
    const response = await call(`${endpoint}/${currentReview.previous.ingestion_id}/correction-review/revalidate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })
    const value = await response.json()
    if (disposed || generation !== recheckGeneration || review !== currentReview) return
    recheck = correctionRecheck(value, currentReview.plan_sha256)
    recheckFeedback.textContent = `Candidate sources and correction controls matched at ${recheck.checked_at}. This is a point-in-time source check. Period completeness and the serving release were not verified. No release is authorized and published data is unchanged.`
    feedback.textContent = 'Candidate source check completed. Its receipt is separate from the original correction review and grants no publication approval.'
  }, true, true, true) })
  listen(el('recheck-download'), 'click', () => {
    if (disposed || busy || !review || !recheck || recheck.plan_sha256 !== review.plan_sha256) return
    download(new Blob([JSON.stringify(recheck, null, 2) + '\n'], { type: 'application/json' }), `medshield-source-check-${recheck.plan_sha256.slice(0, 12)}.json`)
    recheckFeedback.textContent = `Source-check receipt downloaded for ${recheck.checked_at}. It is separate from the correction review and does not verify completeness, the serving release or approval.`
  })
  controls()
  return () => {
    disposed = true; generation++; controller?.abort()
    for (const [target, name, handler] of listeners) target.removeEventListener(name, handler)
    panel.remove()
  }
}
