import { createHash } from 'node:crypto'
import { validateRelease } from './predictiveRelease'
import { executeDatabricksStatement } from './databricks'
import { databricksLiteral } from './databricksLiteral'

const GOLD = 'workspace.medshield_gold'
const literal = databricksLiteral
export const artifactHash = (raw: string) => createHash('sha256').update(raw).digest('hex')
export function preparePublication(raw: string, review: any) {
  const release = validateRelease(JSON.parse(raw))
  const hash = artifactHash(raw)
  if (review.decision !== 'approved' || review.artifact_hash !== hash || review.run_id !== release.run_id || review.dataset_id !== release.dataset_id || !review.reviewer || !review.reviewed_at || !review.evidence_reference || !review.review_id) throw new Error('Exact artifact-bound model review required')
  if (release.data_publication_approved !== true || !release.coverage_receipt_sha256 || !release.input_hash || !release.code_hash) throw new Error('Accepted data, coverage and code provenance required')
  const merge = (table: string, keys: string[], row: Record<string, unknown>) => {
    const fields = Object.keys(row)
    return `MERGE INTO ${GOLD}.${table} t USING (SELECT ${fields.map(k => `${literal(row[k])} AS ${k}`).join(', ')}) s ON ${keys.map(k => `t.${k}=s.${k}`).join(' AND ')} WHEN NOT MATCHED THEN INSERT (${fields.join(',')}) VALUES (${fields.map(k => `s.${k}`).join(',')})`
  }
  const statements = [merge('fact_forecast_run_candidate', ['run_id'], { run_id: release.run_id, model_id: release.model_id, dataset_id: release.dataset_id, input_hash: release.input_hash, code_hash: release.code_hash, artifact_hash: hash, training_cutoff: release.training_cutoff + '-01', payload_json: JSON.stringify({ ...release, points: undefined, evaluations: undefined }) })]
  for (const point of release.points) statements.push(merge('fact_forecast_point_candidate', ['run_id', 'model_id', 'series_id', 'origin_period', 'target_period', 'role'], { run_id: release.run_id, model_id: point.model_id, series_id: point.series_id, origin_period: point.origin_period + '-01', target_period: point.target_period + '-01', lead_months: point.lead_months, role: point.role, prediction: point.prediction, payload_json: JSON.stringify(point) }))
  release.evaluations.forEach((row: any, index: number) => statements.push(merge('fact_model_evaluation_candidate', ['run_id', 'evaluation_id'], { run_id: release.run_id, evaluation_id: `${release.run_id}:${index}`, dataset_id: release.dataset_id, protocol: row.protocol, common_key_checksum: row.common_key_checksum, payload_json: JSON.stringify(row) })))
  statements.push(merge('fact_model_review', ['review_id'], { ...Object.fromEntries(['review_id', 'run_id', 'dataset_id', 'artifact_hash', 'reviewer', 'decision', 'reviewed_at', 'evidence_reference'].map(k => [k, review[k]])), payload_json: JSON.stringify(review) }))
  statements.push(merge('model_release_manifest', ['release_id'], { release_id: release.release_id, run_id: release.run_id, artifact_hash: hash, publication_status: 'approved', expected_point_count: release.points.length, expected_evaluation_count: release.evaluations.length, payload_json: raw }))
  return { release, hash, statements, review }
}

// Caller must serialize publication jobs. A failed staging/readback never updates pointer.
export async function publishPrepared(plan: ReturnType<typeof preparePublication>, execute = executeDatabricksStatement) {
  const { release, hash, review } = plan
  const existing = await execute(`SELECT artifact_hash FROM ${GOLD}.fact_forecast_run_candidate WHERE run_id=${literal(release.run_id)}`, { rowLimit: 2 })
  if (existing.rows.some(r => r.artifact_hash !== hash) || existing.rows.length > 1) throw new Error('Run identity is immutable')
  for (const statement of plan.statements) await execute(statement)
  const storedReview = await execute(`SELECT payload_json FROM ${GOLD}.fact_model_review WHERE review_id=${literal(review.review_id)}`, { rowLimit: 2 })
  if (storedReview.rows.length !== 1 || String(storedReview.rows[0].payload_json) !== JSON.stringify(review)) throw new Error('Review identity is immutable')
  const manifest = await execute(`SELECT payload_json, artifact_hash FROM ${GOLD}.model_release_manifest WHERE release_id=${literal(release.release_id)}`, { rowLimit: 2 })
  if (manifest.rows.length !== 1 || manifest.rows[0].artifact_hash !== hash || artifactHash(String(manifest.rows[0].payload_json)) !== hash) throw new Error('Manifest readback mismatch')
  for (const [table, expected] of [['fact_forecast_point_candidate', release.points], ['fact_model_evaluation_candidate', release.evaluations]] as const) {
    const rows = await execute(`SELECT payload_json FROM ${GOLD}.${table} WHERE run_id=${literal(release.run_id)}`, { rowLimit: Math.max(1, expected.length + 1) })
    const canonical = (items: any[]) => items.map(item => JSON.stringify(item)).sort()
    if (JSON.stringify(canonical(rows.rows.map(r => JSON.parse(String(r.payload_json))))) !== JSON.stringify(canonical(expected))) throw new Error(`${table} readback mismatch`)
  }
  const pointer = await execute(`SELECT release_id FROM ${GOLD}.model_release_pointer WHERE channel='company_revenue'`, { rowLimit: 2 })
  if (pointer.rows.length > 1) throw new Error('Ambiguous publication pointer')
  const previous = pointer.rows[0]?.release_id ?? null
  await execute(`MERGE INTO ${GOLD}.model_release_pointer t USING (SELECT 'company_revenue' AS channel, ${literal(release.release_id)} AS release_id) s ON t.channel=s.channel WHEN MATCHED THEN UPDATE SET release_id=s.release_id, previous_release_id=${literal(previous)}, changed_at=current_timestamp(), reviewer=${literal(review.reviewer)}, reason=${literal(review.evidence_reference)} WHEN NOT MATCHED THEN INSERT (channel,release_id,previous_release_id,changed_at,reviewer,reason) VALUES(s.channel,s.release_id,NULL,current_timestamp(),${literal(review.reviewer)},${literal(review.evidence_reference)})`)
  return { release_id: release.release_id, previous_release_id: previous, artifact_hash: hash }
}
