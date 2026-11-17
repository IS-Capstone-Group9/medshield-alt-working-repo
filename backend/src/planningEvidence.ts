import {createHash} from 'node:crypto'
import type {DescriptiveRelease} from './descriptiveSource'

export const PLANNING_EVIDENCE_VERSION = 'planning_shortlist_release_scope_window_v1'

/** Equal totals from a new release/window must not validate an older draft. */
export function planningEvidenceChecksum(release:DescriptiveRelease|undefined,scope:{sector:string;territory:string},start:string|null,end:string|null,rows:unknown[]) {
  if(!release?.source_table || !release.dataset_id || !Number.isSafeInteger(release.fact_delta_version)) throw new Error('Planning release identity is unavailable')
  const publication=release.financial_publication
  const identity={
    dataset_id:release.dataset_id,source_table:release.source_table,fact_delta_version:release.fact_delta_version,
    policy_version:release.policy_version,product_master_sha256:release.product_master_sha256,area_mapping_sha256:release.area_mapping_sha256,
    transaction_evidence_sha256:release.transaction_evidence_sha256??null,catalog_helper_sha256:release.catalog_helper_sha256??null,
    financial_publication_id:publication?.publication_id??null,financial_manifest_sha256:publication?.manifest_sha256??null,
    serving_table:publication?.serving_table??release.source_table,serving_version:publication?.serving_version??release.fact_delta_version,
    analytical_integrity_id:release.analytical_integrity?.id??null,
    analytical_integrity_sha256:release.analytical_integrity?.manifest_sha256??null,
    corrected_serving_table:release.analytical_integrity?.serving_table??null,
  }
  return createHash('sha256').update(JSON.stringify({version:PLANNING_EVIDENCE_VERSION,identity,scope:{sector:scope.sector,territory:scope.territory},period_start:start,period_end:end,rows})).digest('hex')
}
