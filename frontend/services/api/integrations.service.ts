import { authenticatedJson } from './api-client'

export interface DatabricksConnectionStatus {
  connected: true
  source: {
    catalog: string
    schema: string
    view: string
  }
  period: {
    minimum_year: number
    maximum_year: number
    year_count: number
  }
  row_count: number
  checked_at: string
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

export function checkDatabricksConnection(): Promise<DatabricksConnectionStatus> {
  return authenticatedJson<DatabricksConnectionStatus>(
    '/api/integrations/databricks/status',
    { method: 'GET' },
  )
}

export function syncDatabricksYearlyCandidate(): Promise<DatabricksYearlyCandidateSyncResult> {
  return authenticatedJson<DatabricksYearlyCandidateSyncResult>(
    '/api/integrations/databricks/sync/yearly',
    { method: 'POST' },
  )
}
