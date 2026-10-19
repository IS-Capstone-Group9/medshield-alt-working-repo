/** Read-only, aggregate warehouse currency review. Never writes remote objects. */
import 'dotenv/config'
import {mkdir,readFile,writeFile} from 'node:fs/promises'
import path from 'node:path'
import {createHash} from 'node:crypto'
import {executeDatabricksStatement} from '../src/databricks'
import {descriptiveRelease,getDatabricksForecastValidation,getDatabricksStl,getDatabricksExternalRegression} from '../src/databricksDashboard'
import {readPredictiveResearch} from '../src/predictiveResearch'

const out=path.resolve('../outputs/warehouse_review_20261020')
const hash=(s:string)=>createHash('sha256').update(s).digest('hex')
const cleanError=(s:string)=>s.replace(/dapi[A-Za-z0-9]+/g,'[redacted]').replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g,'[redacted]').replace(/'(?:''|[^'])*'/g,"'[redacted]'").slice(0,1200)
const results:Record<string,unknown>={}
const followup=process.argv.includes('--followup')
const marginPreflight=process.argv.includes('--margin-preflight')
const marginCheck=process.argv.includes('--check-margin-patch')
async function save(){await writeFile(path.join(out,marginCheck?'margin-patch-validation.json':marginPreflight?'margin-preflight.json':followup?'live-followup.json':'live-review.json'),JSON.stringify({checked_at:new Date().toISOString(),scope:'read-only aggregates and metadata',results},null,2))}
async function query(name:string,sql:string,limit=1000){
  if(!/^(SELECT|SHOW|DESCRIBE|EXPLAIN)\b/.test(sql.trim())||sql.includes(';'))throw new Error('Review accepts one read-only statement')
  const started=Date.now()
  try{
    const data=await executeDatabricksStatement(sql,{rowLimit:limit})
    if(name.startsWith('analyze_')){
      const plan=data.rows.flatMap(row=>Object.values(row)).filter(Boolean).join('\n')
      if(/Error occurred during query planning|\b(?:AnalysisException|ParseException|UnsupportedOperationException)\b/.test(plan)||!plan.includes('== Physical Plan =='))throw new Error('Prepared margin SQL did not produce a valid physical plan')
    }
    // Delta history may contain user identities or arbitrary commit metadata.
    const rows=name.startsWith('history_')?data.rows.map(r=>({version:r.version,timestamp:r.timestamp,operation:r.operation,operationMetrics:r.operationMetrics})):data.rows
    results[name]={status:'read',sql,sql_sha256:hash(sql),elapsed_ms:Date.now()-started,rows}
    console.log(`${name}: ${rows.length} aggregate/metadata rows`)
    return rows
  }catch(e){const message=cleanError(e instanceof Error?e.message:String(e));results[name]={status:'unavailable',sql,sql_sha256:hash(sql),error:message};console.log(`${name}: unavailable ${message.slice(0,140)}`);return []}
  finally{await save()}
}
async function history(){
  const host=(process.env.DATABRICKS_HOST||'').replace(/\/$/,'')
  if(!host.startsWith('https://')||!process.env.DATABRICKS_TOKEN)throw new Error('Databricks environment unavailable')
  const end=Date.now(),start=end-29*86400000
  const rows:unknown[]=[];let token:string|undefined;let pages=0;let truncated=false
  do{
    const params=new URLSearchParams({'max_results':'250','filter_by.statuses':'FAILED','filter_by.query_start_time_range.start_time_ms':String(start),'filter_by.query_start_time_range.end_time_ms':String(end)})
    if(token)params.set('page_token',token)
    const response=await fetch(`${host}/api/2.0/sql/history/queries?${params}`,{headers:{Authorization:`Bearer ${process.env.DATABRICKS_TOKEN}`},signal:AbortSignal.timeout(20000)})
    if(!response.ok)throw new Error(`Query-history read HTTP ${response.status}`)
    const body=await response.json() as {res?:Array<Record<string,any>>;has_next_page?:boolean;next_page_token?:string}
    for(const r of body.res??[]){
      const sql=String(r.query_text??'')
      if(!/medshield/i.test(sql))continue
      rows.push({query_id:r.query_id,status:r.status,started_at:new Date(Number(r.query_start_time_ms)).toISOString(),duration_ms:r.duration,
        statement_sha256:hash(sql),objects:[...new Set(sql.match(/(?:workspace\.)?medshield_\w+(?:\.[A-Za-z0-9_]+)?/g)??[])],
        error_class:String(r.error_message??'').match(/\[([A-Z_]+(?:\.[A-Z_]+)*)\]/)?.[1]??null,
        error:cleanError(String(r.error_message??'')),query_source:r.query_source??null})
    }
    token=body.has_next_page?body.next_page_token:undefined
    pages++;if(pages>=8&&token){truncated=true;break}
  }while(token)
  await writeFile(path.join(out,'sql-failure-history.json'),JSON.stringify({observed_at:new Date().toISOString(),start:new Date(start).toISOString(),end:new Date(end).toISOString(),pages,truncated,filter:'FAILED;SQL references MedShield',rows},null,2))
  console.log(`sql failure history: ${rows.length} scoped failures; truncated=${truncated}`)
}
async function main(){
  await mkdir(out,{recursive:true})
  const release=await descriptiveRelease();results.active_gateway_release=release;await save()
  const fact='workspace.medshield_gold.sales_restart_fact_candidate'
  if(marginCheck){
    const sql=(await readFile(path.join(out,'margin-patch-preflight.sql'),'utf8')).replace(/^\s*--.*$/gm,'')
    const statements=sql.split(';').map(s=>s.trim()).filter(Boolean)
    for(const [i,statement] of statements.entries())await query('preflight_'+(i+1),statement,1)
    const plan=JSON.parse(await readFile(path.join(out,'margin-patch-contract.json'),'utf8')) as {targets:Array<{table:string}>}
    for(const [i,target] of plan.targets.entries()){
      if(!/^workspace\.medshield_gold\.sales_restart_[a-z_]+_candidate$/.test(target.table))throw new Error('Invalid margin target')
      await query('preview_'+(i+1),`SELECT COUNT(*) AS rows,
        SUM(CASE WHEN corrected_rate IS NULL AND weighted_gross_margin_pct IS NOT NULL OR corrected_rate IS NOT NULL AND weighted_gross_margin_pct IS NULL OR corrected_rate<>weighted_gross_margin_pct THEN 1 ELSE 0 END) AS changed_rate_cells,
        SUM(CASE WHEN margin_net_sales_basis>0 AND (corrected_rate IS NULL AND weighted_gross_margin_pct IS NOT NULL OR corrected_rate IS NOT NULL AND weighted_gross_margin_pct IS NULL OR corrected_rate<>weighted_gross_margin_pct) THEN 1 ELSE 0 END) AS positive_basis_rate_changes,
        SUM(net_sales) AS unchanged_sales,SUM(gross_margin_amount) AS unchanged_profit
        FROM (SELECT *,CASE WHEN margin_net_sales_basis>0 THEN ROUND(gross_margin_amount/margin_net_sales_basis*100,4) END AS corrected_rate FROM ${target.table})`,1)
    }
    // EXPLAIN parses/analyzes the prepared mutation/readback without executing it.
    const patch=(await readFile(path.resolve('../databricks/medshield_project/maintenance/20261020_positive_margin_basis.sql'),'utf8')).replace(/^\s*--.*$/gm,'')
    const analyzed=patch.split(';').map(s=>s.trim()).filter(Boolean).slice(statements.length)
    for(const [i,statement] of analyzed.entries())await query('analyze_'+(i+1),'EXPLAIN '+statement,100)
    if(Object.values(results).some(result=>result&&typeof result==='object'&&(result as {status?:string}).status==='unavailable'))throw new Error('Margin patch validation has unresolved checks')
    return
  }
  if(marginPreflight){
    for(const name of ['sales_restart_product_yearly_candidate','sales_restart_business_product_yearly_candidate','sales_restart_area_yearly_candidate','sales_restart_territory_yearly_candidate']){
      await query('history_'+name,`DESCRIBE HISTORY workspace.medshield_gold.${name} LIMIT 1`,1)
      await query('profile_'+name,`SELECT COUNT(*) AS rows,SUM(CASE WHEN margin_net_sales_basis<=0 AND weighted_gross_margin_pct IS NOT NULL THEN 1 ELSE 0 END) AS affected_rows,SUM(net_sales) AS net_sales,SUM(gross_margin_amount) AS gross_profit,SUM(margin_net_sales_basis) AS margin_basis,COUNT(DISTINCT dataset_id) AS dataset_count,MIN(dataset_id) AS dataset_id,MIN(policy_version) AS policy_version,MIN(product_master_sha256) AS product_master_sha256,MIN(area_mapping_sha256) AS area_mapping_sha256 FROM workspace.medshield_gold.${name}`,1)
    }
    return
  }
  if(followup){
    await query('fact_monthly',`SELECT DATE_FORMAT(month_start,'yyyy-MM') AS period,SUM(CASE WHEN is_net_sales_eligible THEN net_sales END) AS net_sales,SUM(CASE WHEN is_gross_margin_eligible THEN gross_margin_amount END) AS gross_profit,SUM(CASE WHEN is_gross_margin_eligible THEN net_sales END) AS margin_basis FROM ${fact} VERSION AS OF ${release.fact_delta_version} WHERE is_analysis_candidate=TRUE GROUP BY month_start ORDER BY month_start`,200)
    await query('yearly_bridge',`SELECT calendar_year,net_sales_candidate,gross_margin_candidate,weighted_gross_margin_pct_candidate,zero_activity_month_count,month_activity_status FROM workspace.medshield_gold.vw_dashboard_yearly_sales_candidate ORDER BY calendar_year`,20)
    await query('run_manifest',`SELECT run_id,model_id,input_hash,json_object_keys(payload_json) AS payload_keys,get_json_object(payload_json,'$.manifest.fact_delta_version') AS source_fact_version,get_json_object(payload_json,'$.manifest.transformation_policy') AS source_policy,get_json_object(payload_json,'$.identity.input_hash') AS canonical_input_hash,get_json_object(payload_json,'$.selection.model_id') AS selected_model,get_json_object(payload_json,'$.publication_approved') AS publication_approved FROM workspace.medshield_gold.fact_forecast_run_candidate`,20)
    await query('frozen_input_rows',`SELECT input_hash,DATE_FORMAT(period,'yyyy-MM') AS period,target_value,eligible_for_evaluation,eligible_for_publication,json_object_keys(payload_json) AS payload_keys FROM workspace.medshield_gold.mart_forecast_monthly_candidate WHERE fact_delta_version=${release.fact_delta_version} ORDER BY input_hash,period`,500)
    await query('legacy_lineage',`SELECT table_name,view_definition FROM workspace.information_schema.views WHERE table_schema='medshield_gold' ORDER BY table_name`,100)
    const research=await readPredictiveResearch({})
    await writeFile(path.join(out,'research-gateway.json'),JSON.stringify(research,null,2))
    console.log('research gateway evidence saved')
    return
  }
  await query('manifest',`SELECT dataset_id,source_workbook,data_source_year,source_file_sha256,raw_line_count,source_data_status,source_adjustment_policy FROM workspace.medshield_bronze.sales_restart_manifest_candidate ORDER BY data_source_year`)
  await query('layer_counts',`SELECT 'bronze_lines' AS layer,COUNT(*) AS n,COUNT(DISTINCT dataset_id) AS dataset_count FROM workspace.medshield_bronze.sales_restart_rows_candidate UNION ALL SELECT 'silver_assessed',COUNT(*),COUNT(DISTINCT dataset_id) FROM workspace.medshield_silver.sales_restart_assessed_candidate UNION ALL SELECT 'silver_clean',COUNT(*),COUNT(DISTINCT dataset_id) FROM workspace.medshield_silver.sales_restart_clean_candidate UNION ALL SELECT 'gold_fact',COUNT(*),COUNT(DISTINCT dataset_id) FROM ${fact}`)
  await query('silver_dispositions',`SELECT disposition,record_kind,is_analysis_candidate,COUNT(*) AS rows FROM workspace.medshield_silver.sales_restart_assessed_candidate GROUP BY disposition,record_kind,is_analysis_candidate ORDER BY disposition,record_kind`)
  await query('gold_identity',`SELECT dataset_id,policy_version,product_master_sha256,area_mapping_sha256,publication_status,resolution_policy,COUNT(*) AS rows,COUNT(DISTINCT source_record_id) AS source_ids,COUNT(DISTINCT sales_fact_id) AS fact_ids FROM ${fact} GROUP BY ALL`)
  await query('gold_yearly',`SELECT calendar_year,COUNT(*) AS rows,COUNT(DISTINCT CASE WHEN is_net_sales_eligible THEN month_start END) AS sales_months,SUM(CASE WHEN is_net_sales_eligible THEN net_sales END) AS net_sales,SUM(CASE WHEN is_gross_margin_eligible THEN gross_margin_amount END) AS gross_profit,SUM(CASE WHEN is_gross_margin_eligible THEN net_sales END) AS matching_margin_basis,SUM(CASE WHEN is_approved_medical_demand_eligible THEN 1 ELSE 0 END) AS approved_demand_rows,SUM(CASE WHEN is_external_join_ready THEN 1 ELSE 0 END) AS external_join_ready_rows FROM ${fact} WHERE is_analysis_candidate=TRUE GROUP BY calendar_year ORDER BY calendar_year`)
  await query('financial_invariants',`SELECT SUM(CASE WHEN is_gross_margin_eligible AND (gross_margin_amount IS NULL OR net_sales IS NULL) THEN 1 ELSE 0 END) AS missing_margin_measure,SUM(CASE WHEN is_gross_margin_eligible AND total_acquisition_cost IS NOT NULL AND ABS(gross_margin_amount-(net_sales-total_acquisition_cost))>0.02 THEN 1 ELSE 0 END) AS margin_formula_mismatch,SUM(CASE WHEN is_net_sales_eligible AND net_sales IS NULL THEN 1 ELSE 0 END) AS missing_eligible_sales,SUM(CASE WHEN is_duplicate THEN 1 ELSE 0 END) AS duplicate_flags,SUM(CASE WHEN is_external_join_ready AND NOT is_geographic_territory_approved THEN 1 ELSE 0 END) AS unapproved_geography_join_ready FROM ${fact}`)
  await query('monthly',`SELECT DATE_FORMAT(month_start,'yyyy-MM') AS period,transaction_count,net_sales,gross_margin_amount,margin_net_sales_basis,observation_status,source_completeness_status,dataset_id,policy_version,product_master_sha256 FROM workspace.medshield_gold.sales_restart_monthly_candidate ORDER BY month_start`,200)
  await query('gold_mapping',`SELECT identity_status,display_category,area_mapping_status,is_geographic_territory_approved,is_external_join_ready,transaction_evidence,COUNT(*) AS rows FROM ${fact} GROUP BY ALL ORDER BY identity_status,display_category`,500)
  await query('gold_publication',`SELECT * FROM workspace.medshield_audit.sales_restart_gold_publication_candidate`,100)
  await query('external_publication',`SELECT * FROM workspace.medshield_audit.external_restart_publication_candidate`,100)
  await query('external_quality',`SELECT * FROM workspace.medshield_audit.external_restart_silver_quality_candidate`,100)
  await query('external_signals',`SELECT source,signal,MIN(period) AS first_period,MAX(period) AS last_period,COUNT(*) AS rows,COUNT(DISTINCT CONCAT_WS('|',territory,period,signal,source)) AS unique_keys,SUM(CASE WHEN is_external_join_ready THEN 1 ELSE 0 END) AS approved_join_rows,COUNT(DISTINCT external_dataset_id) AS dataset_count FROM workspace.medshield_gold.vw_dss_external_signals_candidate GROUP BY source,signal ORDER BY source,signal`,100)
  await query('predictive_input',`SELECT input_hash,dataset_id,fact_delta_version,series_id,target_name,unit,MIN(period) AS first_period,MAX(period) AS last_period,COUNT(*) AS rows,COUNT(DISTINCT period) AS months,SUM(CASE WHEN eligible_for_evaluation THEN 1 ELSE 0 END) AS evaluation_rows,SUM(CASE WHEN eligible_for_publication THEN 1 ELSE 0 END) AS publication_rows FROM workspace.medshield_gold.mart_forecast_monthly_candidate GROUP BY ALL ORDER BY input_hash`,100)
  await query('predictive_runs',`SELECT run_id,dataset_id,input_hash,artifact_hash,MIN(training_cutoff) AS earliest_cutoff,MAX(training_cutoff) AS latest_cutoff,COUNT(*) AS rows,COUNT(DISTINCT model_id) AS models FROM workspace.medshield_gold.fact_forecast_run_candidate GROUP BY run_id,dataset_id,input_hash,artifact_hash ORDER BY run_id`,100)
  await query('predictive_points',`SELECT run_id,model_id,role,COUNT(*) AS rows,MIN(origin_period) AS first_origin,MAX(origin_period) AS last_origin,MIN(lead_months) AS first_lead,MAX(lead_months) AS last_lead,SUM(CASE WHEN target_period<=origin_period OR lead_months<>CAST(MONTHS_BETWEEN(target_period,origin_period) AS INT) THEN 1 ELSE 0 END) AS invalid_target_keys FROM workspace.medshield_gold.fact_forecast_point_candidate GROUP BY run_id,model_id,role ORDER BY run_id,model_id,role`,1000)
  await query('predictive_duplicate_points',`SELECT run_id,model_id,series_id,origin_period,target_period,lead_months,role,COUNT(*) AS n FROM workspace.medshield_gold.fact_forecast_point_candidate GROUP BY ALL HAVING COUNT(*)>1`,100)
  await query('publication_counts',`SELECT 'model_review' AS object,COUNT(*) AS rows FROM workspace.medshield_gold.fact_model_review UNION ALL SELECT 'release_manifest',COUNT(*) FROM workspace.medshield_gold.model_release_manifest UNION ALL SELECT 'release_pointer',COUNT(*) FROM workspace.medshield_gold.model_release_pointer UNION ALL SELECT 'published_forecast_view',COUNT(*) FROM workspace.medshield_gold.vw_dashboard_forecasts UNION ALL SELECT 'published_evaluation_view',COUNT(*) FROM workspace.medshield_gold.vw_dashboard_model_evaluation`)
  for(const table of ['sales_restart_fact_candidate','sales_restart_monthly_candidate','sales_restart_stl_candidate'])await query('history_'+table,`DESCRIBE HISTORY workspace.medshield_gold.${table} LIMIT 6`,6)
  for(const view of ['vw_dashboard_yearly_sales_candidate','vw_dashboard_monthly_sales_candidate','vw_dashboard_forecasts','vw_dashboard_model_evaluation','vw_dss_external_signals_candidate'])await query('definition_'+view,`SHOW CREATE TABLE workspace.medshield_gold.${view}`,5)
  try{const forecast=await getDatabricksForecastValidation({sector:'All'});const stl=await getDatabricksStl();const context=await getDatabricksExternalRegression({sector:'Private',territory:'Quezon',mode:'combined'});await writeFile(path.join(out,'gateway-evidence.json'),JSON.stringify({checked_at:new Date().toISOString(),forecast,stl,context},null,2));console.log(`gateway: ${forecast.observed_months} sales months;${stl.rows.length} STL months;${context.context.coobserved_months} context months`)}catch(e){results.gateway_error=cleanError(e instanceof Error?e.message:String(e))}
  await save()
  await history()
}
main().catch(e=>{console.error(cleanError(e instanceof Error?e.message:String(e)));process.exitCode=1})
