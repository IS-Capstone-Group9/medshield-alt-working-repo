import {
  DatabricksYearlyValidationError,
  getDatabricksYearlyCandidateExtract,
} from './databricks'
import { invokeDatabricksYearlyCandidateSync } from './supabaseWarehouse'

const CANDIDATE_WARNING =
  'Candidate financial measures remain pending Finance/business-owner approval and have not replaced published dashboard facts.'

interface SyncRpcSuccess {
  ok: true
  pipeline_run_key: number
  extracted_rows: number
  loaded_rows: number
  minimum_year: number
  maximum_year: number
  year_count: number
  source_transaction_count: number
  loaded_transaction_count: number
  checksums_match: true
  candidate_only: true
  synced_at: string
}

export interface DatabricksYearlyCandidateSyncResult {
  ok: true
  status: 'candidate_cache_synchronized'
  pipeline_run_key: number
  source: {
    catalog: string
    schema: string
    view: string
  }
  extracted_rows: number
  loaded_rows: number
  period: {
    minimum_year: number
    maximum_year: number
    year_count: number
  }
  reconciliation: {
    source_transaction_count: number
    loaded_transaction_count: number
    matched: boolean
  }
  candidate_only: true
  warning: string
  synced_at: string
}

export class DatabricksYearlySyncInProgressError extends Error {
  readonly code = 'DATABRICKS_YEARLY_SYNC_IN_PROGRESS'

  constructor() {
    super('A Databricks yearly candidate synchronization is already running')
    this.name = 'DatabricksYearlySyncInProgressError'
  }
}

export class DatabricksYearlySyncValidationError extends Error {
  readonly code = 'DATABRICKS_YEARLY_SYNC_VALIDATION_FAILED'
  readonly pipelineRunKey?: number
  readonly candidateCachePreserved: boolean | null

  constructor(
    message: string,
    pipelineRunKey?: number,
    candidateCachePreserved: boolean | null = true,
  ) {
    super(message)
    this.name = 'DatabricksYearlySyncValidationError'
    this.pipelineRunKey = pipelineRunKey
    this.candidateCachePreserved = candidateCachePreserved
  }
}

let synchronizationInProgress = false

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function requiredNumber(value: unknown, field: string): number {
  if (value === null || value === undefined || value === '') {
    throw new DatabricksYearlySyncValidationError(
      `Supabase sync response is missing numeric field ${field}`,
      undefined,
      false,
    )
  }
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    throw new DatabricksYearlySyncValidationError(
      `Supabase sync response is missing numeric field ${field}`,
      undefined,
      false,
    )
  }
  return parsed
}

function parseSuccessfulRpc(value: unknown): SyncRpcSuccess {
  if (!isRecord(value)) {
    throw new DatabricksYearlySyncValidationError(
      'Supabase returned an invalid sync response',
      undefined,
      null,
    )
  }
  if (value.ok !== true) {
    const pipelineRunKey = Number.isFinite(Number(value.pipeline_run_key))
      ? Number(value.pipeline_run_key)
      : undefined
    throw new DatabricksYearlySyncValidationError(
      'Supabase rejected the candidate rows; the previous candidate cache was preserved',
      pipelineRunKey,
      value.candidate_cache_preserved === true ? true : null,
    )
  }

  const syncedAt = typeof value.synced_at === 'string' ? value.synced_at : ''
  if (value.checksums_match !== true || value.candidate_only !== true || !syncedAt) {
    throw new DatabricksYearlySyncValidationError(
      'Supabase did not confirm candidate-only checksum reconciliation',
      requiredNumber(value.pipeline_run_key, 'pipeline_run_key'),
      false,
    )
  }

  const parsed: SyncRpcSuccess = {
    ok: true,
    pipeline_run_key: requiredNumber(value.pipeline_run_key, 'pipeline_run_key'),
    extracted_rows: requiredNumber(value.extracted_rows, 'extracted_rows'),
    loaded_rows: requiredNumber(value.loaded_rows, 'loaded_rows'),
    minimum_year: requiredNumber(value.minimum_year, 'minimum_year'),
    maximum_year: requiredNumber(value.maximum_year, 'maximum_year'),
    year_count: requiredNumber(value.year_count, 'year_count'),
    source_transaction_count: requiredNumber(
      value.source_transaction_count,
      'source_transaction_count',
    ),
    loaded_transaction_count: requiredNumber(
      value.loaded_transaction_count,
      'loaded_transaction_count',
    ),
    checksums_match: true,
    candidate_only: true,
    synced_at: syncedAt,
  }
  return parsed
}

export async function synchronizeDatabricksYearlyCandidate(
  requestedBy: string,
): Promise<DatabricksYearlyCandidateSyncResult> {
  if (synchronizationInProgress) {
    throw new DatabricksYearlySyncInProgressError()
  }
  synchronizationInProgress = true

  try {
    const extract = await getDatabricksYearlyCandidateExtract()
    const rpc = parseSuccessfulRpc(
      await invokeDatabricksYearlyCandidateSync({
        p_rows: extract.rows,
        p_source_checksum: extract.source_checksum,
        p_source_checked_at: extract.checked_at,
        p_requested_by: requestedBy,
      }),
    )

    const reconciliationMatches =
      rpc.extracted_rows === extract.rows.length &&
      rpc.loaded_rows === extract.rows.length &&
      rpc.minimum_year === extract.period.minimum_year &&
      rpc.maximum_year === extract.period.maximum_year &&
      rpc.year_count === extract.period.year_count &&
      rpc.source_transaction_count === extract.source_transaction_count &&
      rpc.loaded_transaction_count === extract.source_transaction_count

    if (!reconciliationMatches) {
      throw new DatabricksYearlySyncValidationError(
        'Databricks and Supabase reconciliation values did not match',
        rpc.pipeline_run_key,
        false,
      )
    }

    return {
      ok: true,
      status: 'candidate_cache_synchronized',
      pipeline_run_key: rpc.pipeline_run_key,
      source: extract.source,
      extracted_rows: rpc.extracted_rows,
      loaded_rows: rpc.loaded_rows,
      period: {
        minimum_year: rpc.minimum_year,
        maximum_year: rpc.maximum_year,
        year_count: rpc.year_count,
      },
      reconciliation: {
        source_transaction_count: rpc.source_transaction_count,
        loaded_transaction_count: rpc.loaded_transaction_count,
        matched: true,
      },
      candidate_only: true,
      warning: CANDIDATE_WARNING,
      synced_at: rpc.synced_at,
    }
  } catch (error) {
    if (error instanceof DatabricksYearlyValidationError) {
      throw new DatabricksYearlySyncValidationError(error.message)
    }
    throw error
  } finally {
    synchronizationInProgress = false
  }
}
