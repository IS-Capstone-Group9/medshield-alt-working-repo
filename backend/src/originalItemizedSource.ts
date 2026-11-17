import {executeDatabricksStatement} from './databricks'
import type {DescriptiveRelease} from './descriptiveSource'
import {readItemizedPreviewSource} from './itemizedPreview'
import {ITEMIZED_PREVIEW_BINDING} from './itemizedPreviewBinding'
import {currentFinancialScope, type FinancialScope} from './financialScope'
import {readContractReviewSource} from './contractReview'
import {decimalMicros} from './itemizedPreview'
import {currentRequestSignal, recordRequestMetric, withoutRequestCancellation} from './requestContext'

let contractValidation:Promise<unknown>|undefined
export async function validateFinancialScope(scope=currentFinancialScope()) {
  if(scope==='itemized') return
  contractValidation ??= withoutRequestCancellation(()=>validateCombinedFinancialSource()).catch(error=>{contractValidation=undefined;throw error})
  await contractValidation
}

/** Distinct ingestion keys and conservation prove the relation, not economic additivity. */
export async function validateCombinedFinancialSource(execute=executeDatabricksStatement) {
  const {quoted}=await readContractReviewSource(execute)
  const itemized=ITEMIZED_PREVIEW_BINDING.itemizedTable.split('.').map(part=>'`'+part+'`').join('.')
  const rows=(await execute(`SELECT COUNT(*) AS records, COUNT(DISTINCT source_record_id) AS unique_records,
    COUNT(CASE WHEN is_net_sales_technically_eligible THEN 1 END) AS eligible_records,
    CAST(SUM(CASE WHEN is_net_sales_technically_eligible THEN net_sales END) AS STRING) AS eligible_net
    FROM (SELECT * FROM ${itemized} VERSION AS OF 0 UNION ALL SELECT * FROM ${quoted} VERSION AS OF 0)`,{rowLimit:1})).rows
  const control=ITEMIZED_PREVIEW_BINDING.expectedGoldReceipt.financial
  const row=rows[0]
  if(rows.length!==1||row.records!==String(control.records)||row.unique_records!==row.records
    ||row.eligible_records!==String(control.technically_eligible_records)
    ||decimalMicros(row.eligible_net??'')!==decimalMicros(control.technically_eligible_net_php))
    throw new Error('Combined original Gold relation failed source-key or financial conservation controls')
  return {records:row.records,eligible_records:row.eligible_records,eligible_net:row.eligible_net,additivity:'unverified'}
}

/** Where the itemized fact rows are read from. 'warehouse' reads exact copies stored with a warehouse release (decision 014). */
export function itemizedFactSource(env=process.env):{mode:'gold'}|{mode:'warehouse';releaseId:string}{
  const mode=env.DATABRICKS_ITEMIZED_SOURCE?.trim()||'gold'
  if(mode==='gold') return {mode}
  const releaseId=env.DATABRICKS_WAREHOUSE_RELEASE_ID?.trim()??''
  if(mode!=='warehouse'||!/^[a-f0-9]{16}$/.test(releaseId)) throw new Error('Invalid itemized fact source configuration')
  return {mode,releaseId}
}

export function warehouseCopyTables(releaseId:string){
  const prefix=`workspace.medshield_warehouse.release_${releaseId}_gold_`
  return {itemized:prefix+'itemized_v0',contracts:prefix+'contracts_v0'}
}

const quote=(name:string)=>name.split('.').map(part=>'`'+part+'`').join('.')
let copyVerification:{key:string;check:Promise<void>}|undefined

/** The copies must equal pinned Gold row for row (count, keys, eligible net, row-hash sum); otherwise fail closed, never fall back. */
export async function verifyWarehouseCopy(releaseId:string,execute=executeDatabricksStatement){
  const gold=quote(ITEMIZED_PREVIEW_BINDING.itemizedTable)
  const pairs=[[gold,warehouseCopyTables(releaseId).itemized],[gold.replace('_itemized_candidates`','_contract_candidates`'),warehouseCopyTables(releaseId).contracts]]
  const profile=(table:string,version:string)=>`SELECT COUNT(*) AS n, COUNT(DISTINCT source_record_id) AS ids,
    CAST(SUM(CASE WHEN is_net_sales_technically_eligible THEN net_sales END) AS STRING) AS net,
    CAST(SUM(CAST(XXHASH64(*) AS DECIMAL(38,0))) AS STRING) AS h FROM ${table}${version}`
  // A newer promoted release would hold months these copies lack; refuse rather than serve a silently stale history.
  const head=(await execute(`SELECT release_id FROM workspace.medshield_warehouse.release_pointer p
    WHERE NOT EXISTS (SELECT 1 FROM workspace.medshield_warehouse.release_pointer q WHERE q.previous_release_id=p.release_id)`,{rowLimit:2})).rows
  if(head.length!==1||head[0].release_id!==releaseId) throw new Error('Configured warehouse release is not the current release; refresh its copies before serving')
  for(const [source,copy] of pairs){
    const rows=(await execute(`SELECT a.n=b.n AND a.ids=b.ids AND a.net<=>b.net AND a.h=b.h AS same FROM (${profile(source,' VERSION AS OF 0')}) a CROSS JOIN (${profile(quote(copy),' VERSION AS OF 0')}) b`,{rowLimit:1})).rows
    if(rows.length!==1||String(rows[0].same)!=='true') throw new Error('Warehouse copy differs from pinned Gold; refusing to serve it')
  }
}

function ensureWarehouseCopy(releaseId:string,execute:typeof executeDatabricksStatement){
  if(execute!==executeDatabricksStatement) return verifyWarehouseCopy(releaseId,execute)
  if(copyVerification?.key!==releaseId){
    const check=withoutRequestCancellation(()=>verifyWarehouseCopy(releaseId,execute)).catch(error=>{copyVerification=undefined;throw error})
    copyVerification={key:releaseId,check}
  }
  return copyVerification.check
}

export const ORIGINAL_ITEMIZED_ADAPTER='original_itemized_v1'
export type OriginalItemizedSource=Omit<Awaited<ReturnType<typeof readItemizedPreviewSource>>,'note'|'live_serving_changed'> & {note:string;application_connection:'main_dashboard_candidate'}

/** A typed Gold adapter is a source-bound candidate connection, never finance/SKU approval. */
async function validateOriginalItemizedRelease(execute: typeof executeDatabricksStatement): Promise<DescriptiveRelease> {
  const source=await readItemizedPreviewSource(execute)
  const factSource=itemizedFactSource()
  if(factSource.mode==='warehouse') await ensureWarehouseCopy(factSource.releaseId,execute)
  const {note:_previewNote,live_serving_changed:_previewFlag,...identity}=source
  return {fact_delta_version:0,dataset_id:source.dataset_id,policy_version:source.policy_version,
    area_mapping_sha256:null,product_master_sha256:ITEMIZED_PREVIEW_BINDING.expectedGoldReceipt.accepted_master_sha256,
    publication_status:'CANDIDATE_PENDING_FINANCIAL_RECONCILIATION_AND_RELEASE',source_table:source.source_table,
    source_audit_table:ITEMIZED_PREVIEW_BINDING.receiptTable,
    original_itemized:{...identity,application_connection:'main_dashboard_candidate',note:'Original Gold itemized sales. Contracts excluded; not complete company sales. Technical candidate; financial release, physical units, geographic mappings and models retain independent acceptance.'}}
}

let originalReleaseInFlight: Promise<DescriptiveRelease> | undefined

export function readOriginalItemizedRelease(execute = executeDatabricksStatement): Promise<DescriptiveRelease> {
  const caller = currentRequestSignal()
  if (execute !== executeDatabricksStatement) {
    return validateOriginalItemizedRelease(execute)
  }
  if (caller?.aborted) return Promise.reject(caller.reason)
  if (originalReleaseInFlight) {
    recordRequestMetric('cacheSharedLoads')
    return originalReleaseInFlight
  }
  // HTTP and gateway-owned background readers share overlapping validation of
  // the same pinned Gold. Absence of caller cancellation must not duplicate it.
  // The shared read has its own deadline and releases both successes and failures.
  originalReleaseInFlight = withoutRequestCancellation(() => validateOriginalItemizedRelease(execute))
    .finally(() => { originalReleaseInFlight = undefined })
  return originalReleaseInFlight
}

/** Only supported aliases/derived dates are projected. Missing identity/unit/geo facts stay null. */
export function originalItemizedFactSql(release:DescriptiveRelease,scope:FinancialScope='itemized'){
  if(!release.original_itemized||release.source_table!==ITEMIZED_PREVIEW_BINDING.itemizedTable||release.fact_delta_version!==0)
    throw new Error('Original itemized adapter requires the checked source binding')
  const factSource=itemizedFactSource()
  const copies=factSource.mode==='warehouse'?warehouseCopyTables(factSource.releaseId):undefined
  const table=copies?quote(copies.itemized):quote(release.source_table)
  const contractTable=copies?quote(copies.contracts):table.replace('_itemized_candidates`','_contract_candidates`')
  const from=scope==='itemized'?`${table} VERSION AS OF 0`:scope==='contracts'?`${contractTable} VERSION AS OF 0`:
    `(SELECT * FROM ${table} VERSION AS OF 0 UNION ALL SELECT * FROM ${contractTable} VERSION AS OF 0)`
  return `(SELECT f.*,
    YEAR(f.date_delivered) AS calendar_year, CAST(DATE_TRUNC('MONTH',f.date_delivered) AS DATE) AS month_start,
    f.area AS normalized_area, CAST(NULL AS STRING) AS area_raw, f.normalized_product AS product_raw,
    f.recorded_quantity AS quantity, CAST(NULL AS DECIMAL(24,6)) AS unit_selling_price,
    CAST(NULL AS DECIMAL(24,6)) AS unit_acquisition_cost, f.acquisition_cost AS total_acquisition_cost,
    CASE WHEN f.is_gross_margin_technically_eligible AND f.net_sales <> 0
      THEN 100*f.gross_margin_amount/f.net_sales END AS margin_pct,
    FROM_JSON(f.quality_rule_codes_json,'array<string>') AS quality_rule_codes,
    TRUE AS is_analysis_candidate, (f.record_kind = 'contract_summary') AS is_contract_label, FALSE AS is_adjusted_source,
    f.is_net_sales_technically_eligible AS is_net_sales_eligible,
    f.is_gross_sales_technically_eligible AS is_gross_sales_eligible,
    f.is_acquisition_cost_technically_eligible AS is_acquisition_cost_eligible,
    f.is_gross_margin_technically_eligible AS is_gross_margin_eligible,
    FALSE AS is_quantity_observation_eligible, FALSE AS is_quantity_eligible,
    CAST(NULL AS STRING) AS unit_of_measure, CAST(NULL AS STRING) AS source_layout,
    CAST(NULL AS TIMESTAMP) AS gold_published_at,
    'original_source_layers_v1_candidate_only' AS source_adjustment_policy,
    CASE WHEN f.record_kind = 'contract_summary' THEN 'CONTRACT_SUMMARY_UNALLOCATED' ELSE 'ITEMIZED_SOURCE_LABEL' END AS product_scope_status,
    FALSE AS is_geographic_territory_approved, CAST(NULL AS STRING) AS mapped_region,
    CAST(NULL AS STRING) AS mapped_province, CAST(NULL AS STRING) AS territory,
    'unknown' AS proposed_area_type, 'unapproved' AS area_mapping_status,
    'recorded_label_only' AS area_evidence_status
    FROM ${from} AS f)`
}
