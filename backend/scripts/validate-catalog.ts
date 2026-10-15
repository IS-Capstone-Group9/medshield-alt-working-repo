/** Read-only catalog/API reconciliation against the reviewed predecessor. */
import 'dotenv/config'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs'
import {resolve,sep} from 'node:path'
import {descriptiveRelease,getDatabricksSalesSectors,getDatabricksSalesHeatmap} from '../src/databricksDashboard'
import {executeDatabricksStatement} from '../src/databricks'
import type {DatabricksStatementOptions} from '../src/databricks'
import {catalogProducts} from '../src/catalogContract'
import {categoryDecisionCte} from './catalog-validation-decisions'

async function main() {
  const release=await descriptiveRelease()
  const table='workspace.medshield_gold.sales_restart_fact_candidate'
  const fact=`${table} VERSION AS OF ${release.fact_delta_version}`
  const checks: Record<string,unknown>={}
  const queries: unknown[]=[]
  async function query(sql:string,parameters:DatabricksStatementOptions['parameters']=[]) {
    const result=await executeDatabricksStatement(sql,{rowLimit:1000,timeoutMs:120000,parameters})
    queries.push({sql,parameters,rows:result.rows})
    return result.rows
  }
  const contract=JSON.parse(readFileSync(resolve('../databricks/medshield_project/references/catalog_publication.json'),'utf8'))
  assert.equal(contract.schema_version,1)
  assert.ok(['unapproved_draft_metadata_only','category_acceptance_only'].includes(contract.mode))
  const categoryMode=contract.mode==='category_acceptance_only'
  const baseline=contract.baseline_fact_version as number
  assert.ok(Number.isSafeInteger(baseline) && baseline>=0)
  assert.ok(Number(release.fact_delta_version)>baseline,'No newly published candidate: the predecessor cannot validate its own replacement')
  const columns=contract.predecessor_columns as string[]
  assert.ok(columns.length>0 && new Set(columns).size===columns.length && columns.every(name=>/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)))
  const mutable=['category_status','catalog_evidence_source','product_master_sha256','gold_published_at',
    ...(categoryMode?['product_category','display_category','product_scope_status']:[])]
  assert.deepEqual([...contract.mutable_fields].sort(),[...mutable].sort())
  const fields=columns.filter(name=>!mutable.includes(name))
  assert.deepEqual([...contract.immutable_fields].sort(),[...fields].sort())
  const receiptBytes=readFileSync(resolve('..',contract.source_receipt_path))
  assert.equal(createHash('sha256').update(receiptBytes).digest('hex'),contract.source_receipt_sha256)
  const receipt=JSON.parse(receiptBytes.toString('utf8'))
  assert.deepEqual(receipt.identity,contract.baseline_identity)
  assert.equal(receipt.baseline_fact_version,baseline)
  assert.deepEqual(receipt.fact_schema.map((r:{col_name:string})=>r.col_name),columns)
  const beforeSchema=await query(`DESCRIBE QUERY SELECT * FROM ${table} VERSION AS OF ${baseline}`)
  const afterSchema=await query(`DESCRIBE QUERY SELECT * FROM ${fact}`)
  assert.deepEqual(afterSchema.map(r=>[r.col_name,r.data_type]),beforeSchema.map(r=>[r.col_name,r.data_type]),'Fact schema/type changed')
  assert.deepEqual(beforeSchema.map(r=>r.col_name).sort(),[...columns].sort())
  const identityFields=Object.keys(contract.baseline_identity)
  assert.ok(identityFields.every(name=>/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)))
  const predecessor=await query(`SELECT DISTINCT ${identityFields.join(',')} FROM ${table} VERSION AS OF ${baseline}`)
  assert.equal(predecessor.length,1)
  assert.deepEqual(predecessor[0],contract.baseline_identity)
  const proposed=await query(`SELECT DISTINCT product_master_sha256,transaction_evidence_sha256,catalog_helper_sha256,area_mapping_sha256 FROM ${fact}`)
  assert.equal(proposed.length,1)
  assert.deepEqual(proposed[0],contract.proposed)
  const approvals=await query(`SELECT COUNT(*) AS n FROM ${fact} WHERE identity_status='approved' ${categoryMode?'':"OR category_status='approved'"} OR forecast_eligible OR is_approved_medical_demand_eligible OR is_medical_product_approved OR is_external_join_ready`)
  assert.equal(approvals[0].n,'0','Category reporting cannot introduce identity, demand, forecast or external-join approvals')
  const differences=await query(`SELECT COUNT(*) AS n FROM ${table} VERSION AS OF ${baseline} b FULL OUTER JOIN ${fact} f ON b.source_record_id=f.source_record_id
    WHERE b.source_record_id IS NULL OR f.source_record_id IS NULL OR ${fields.map(f=>`NOT(b.${f} <=> f.${f})`).join(' OR ')}`)
  assert.equal(differences[0].n,'0')
  checks.source_financial_eligibility=`PASS exact source-record comparison across all ${fields.length} immutable fields`
  if(categoryMode){
    const acceptancePath=resolve('..',contract.category_acceptance_path)
    const priorPath=resolve('..',contract.prior_product_master_path)
    const projectRoot=resolve('..')+sep
    assert.ok(acceptancePath.startsWith(projectRoot)&&priorPath.startsWith(projectRoot))
    const acceptanceBytes=readFileSync(acceptancePath)
    assert.equal(createHash('sha256').update(acceptanceBytes).digest('hex'),contract.category_acceptance_sha256)
    assert.equal(createHash('sha256').update(readFileSync(priorPath)).digest('hex'),contract.prior_product_master_sha256)
    const acceptance=JSON.parse(acceptanceBytes.toString('utf8'))
    assert.equal(acceptance.schema_version,1)
    assert.equal(acceptance.scope,'reporting_category_only')
    assert.equal(acceptance.requested_by,'Adrian')
    assert.equal(acceptance.recorded_by,'Codex acting on Adrian instruction')
    assert.ok(Number.isFinite(Date.parse(acceptance.recorded_at)))
    for(const field of ['business_release_approval','sku_or_unit_approval','forecast_approval']) assert.equal(acceptance[field],false)
    assert.equal(acceptance.dataset_id,contract.baseline_identity.dataset_id)
    assert.equal(acceptance.baseline_fact_version,baseline)
    assert.equal(acceptance.product_master_sha256,contract.proposed.product_master_sha256)
    assert.equal(acceptance.prior_product_master_sha256,contract.prior_product_master_sha256)
    const decisions=acceptance.decisions as Array<Record<string,string>>
    assert.ok(decisions.length>0&&new Set(decisions.map(d=>d.normalized_product)).size===decisions.length)
    for(const d of decisions){
      assert.equal(d.category_status,'approved')
      assert.equal(d.normalized_product,d.raw_product.trim().replace(/\s+/g,' ').toUpperCase())
      assert.ok(['medicine','medical_supply','medical_equipment','non_medical','unclassified'].includes(d.product_category))
      assert.ok(d.evidence_source&&d.reviewed_by&&d.reviewed_at&&d.rationale)
      assert.equal(d.reviewed_by,acceptance.recorded_by)
      assert.equal(d.reviewed_at,acceptance.recorded_at)
      assert.equal(d.decision,d.product_category==='unclassified'?'accepted_unclassified':'accepted_category')
    }
    const labelCount=await query(`SELECT COUNT(DISTINCT normalized_product) AS n, COUNT_IF(normalized_product IS NULL) AS missing FROM ${fact}`)
    assert.equal(Number(labelCount[0].n),decisions.length)
    assert.equal(Number(labelCount[0].missing),0)
    // Bound each SQL request while still checking every accepted label and source record.
    for(let offset=0;offset<decisions.length;offset+=500){
      const decisionCte=categoryDecisionCte(decisions.slice(offset,offset+500))
      const transitions=await query(`${decisionCte.statementPrefix}
      SELECT COUNT(*) AS n FROM ${table} VERSION AS OF ${baseline} b JOIN ${fact} f ON b.source_record_id=f.source_record_id
      JOIN d ON b.normalized_product=d.normalized_product WHERE
      NOT(f.category_status <=> 'approved') OR NOT(f.product_category <=> d.product_category)
      OR NOT(f.catalog_evidence_source <=> d.evidence_source)
      OR NOT(f.display_category <=> CASE WHEN d.product_category IN ('medicine','medical_supply','medical_equipment') THEN 'Medical' WHEN d.product_category='non_medical' THEN 'Non-Medical' ELSE 'Unclassified' END)
      OR NOT(f.product_scope_status <=> CASE WHEN b.is_contract_label OR b.product_scope_status IN ('CONTRACT_LABEL_CANDIDATE','HASHTAG_LABEL_REQUIRES_REVIEW','MISSING_PRODUCT_IDENTITY') THEN b.product_scope_status ELSE CONCAT(UPPER(d.product_category),'_APPROVED') END)`,decisionCte.parameters)
      assert.equal(transitions[0].n,'0','Category values must equal the accepted per-label decisions')
      const coverage=await query(`${decisionCte.statementPrefix} SELECT COUNT(*) AS n FROM d LEFT ANTI JOIN (SELECT DISTINCT normalized_product FROM ${fact}) f ON d.normalized_product=f.normalized_product`,decisionCte.parameters)
      assert.equal(coverage[0].n,'0','Acceptance contains labels outside the fact')
    }
    checks.category_acceptance={status:'PASS',labels:decisions.length,scope:'descriptive reporting only',quantity_and_forecast_gates:'unchanged'}
  }
  const duplicate=await query(`SELECT source_record_id FROM ${fact} GROUP BY source_record_id HAVING COUNT(*)<>1`)
  assert.equal(duplicate.length,0)
  const monthly=await query(`SELECT CAST(month_start AS STRING) AS period, COUNT(*) AS records, SUM(CASE WHEN is_net_sales_eligible THEN net_sales END) AS net_sales FROM ${fact} GROUP BY month_start ORDER BY month_start`)
  checks.monthly=monthly
  if(release.policy_version==='sales_restart_gold_v7_independent_catalog') {
    const bad=await query(`SELECT COUNT(*) AS n FROM ${fact} WHERE is_approved_medical_demand_eligible AND
      (transaction_evidence='adjusted_estimated_source' OR identity_status<>'approved' OR item_kind<>'physical_product' OR NOT forecast_eligible)`)
    assert.equal(bad[0].n,'0')
    const partitions=await query(`WITH p AS (SELECT month_start,display_category,SUM(CASE WHEN is_net_sales_eligible THEN net_sales END) AS revenue FROM ${fact} GROUP BY ALL),
      c AS (SELECT month_start,SUM(revenue) AS revenue FROM p GROUP BY month_start),
      t AS (SELECT month_start,SUM(CASE WHEN is_net_sales_eligible THEN net_sales END) AS revenue FROM ${fact} GROUP BY month_start)
      SELECT COUNT(*) AS n FROM c FULL OUTER JOIN t USING(month_start) WHERE NOT(c.revenue <=> t.revenue)`)
    assert.equal(partitions[0].n,'0')
    checks.warehouse_catalog='PASS'
  } else checks.warehouse_catalog='NOT_DEPLOYED: legacy release compatibility only'
  const data=await getDatabricksSalesSectors()
  const heatmap=await getDatabricksSalesHeatmap()
  const products=catalogProducts(data.rows,'All',50000)
  assert.equal(data.source.release?.fact_delta_version,release.fact_delta_version)
  assert.equal(heatmap.source.release?.fact_delta_version,release.fact_delta_version)
  const total=data.rows.reduce((n,r)=>n+(r.revenue??0),0)
  assert.ok(Math.abs(total-Number(monthly.reduce((n,r)=>n+Number(r.net_sales||0),0)))<.01)
  assert.ok(Math.abs(total-products.products.reduce((n,r)=>n+(r.revenue??0),0))<.01)
  assert.ok(data.rows.every(r=>/^(SKU|RAW):.+/.test(r.canonical_group_id||'')))
  const categoryTotal=['Medical','Non-Medical','Unclassified'].reduce((n,category)=>n+catalogProducts(data.rows,category,50000).products.reduce((s,r)=>s+(r.revenue??0),0),0)
  assert.ok(Math.abs(total-categoryTotal)<.01)
  assert.ok(heatmap.daily.filter(r=>r.transaction_evidence==='adjusted_estimated_source').every(r=>r.quantity===null))
  checks.api={status:'PASS',net_sales:total,records:data.rows.reduce((n,r)=>n+r.row_count,0),product_groups:products.product_count,
    unresolved_revenue:products.unresolved_revenue,heatmap_rows:heatmap.daily.length}
  const output=resolve('../outputs/catalog_validation',new Date().toISOString().replace(/[:.]/g,'-'))
  mkdirSync(output,{recursive:true})
  const payload=JSON.stringify({release,baseline,checks,queries,mode:'read-only',publication_mode:contract.mode,business_release_approved:false},null,2)+'\n'
  writeFileSync(resolve(output,'evidence.json'),payload)
  writeFileSync(resolve(output,'evidence.sha256'),createHash('sha256').update(payload).digest('hex')+'\n')
  console.log(JSON.stringify({output,release,checks:{...checks,monthly:monthly.length+' months'}},null,2))
}
main().catch(error=>{console.error(error);process.exitCode=1})
