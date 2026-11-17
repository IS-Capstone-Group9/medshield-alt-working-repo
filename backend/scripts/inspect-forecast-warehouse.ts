/** Read-only operator check. Output excludes credentials, SQL, user identities and query IDs. */
import path from 'node:path'
import {config} from 'dotenv'
import {createHash} from 'node:crypto'
import {executeDatabricksStatement} from '../src/databricks'
import {ORIGINAL_RESEARCH_MONTHLY_SQL} from '../src/originalResearch'

config({path:process.env.MEDSHIELD_ENV_FILE||path.resolve(__dirname,'../.env')})

async function main(){
  const raw=process.env.DATABRICKS_HOST||''
  const origin=new URL(raw.includes('://')?raw:'https://'+raw).origin
  if(!origin.startsWith('https://'))throw Error('HTTPS required')
  const warehouse=process.env.DATABRICKS_SQL_WAREHOUSE_ID
  const token=process.env.DATABRICKS_TOKEN
  if(!warehouse||!token)throw Error('Missing server configuration')
  const get=async(url:URL)=>{
    const response=await fetch(url,{method:'GET',redirect:'error',headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(20000)})
    return {http_status:response.status,body:response.ok?await response.json():{}}
  }
  const status=await get(new URL('/api/2.0/sql/warehouses/'+encodeURIComponent(warehouse),origin))
  const fields=['state','cluster_size','min_num_clusters','max_num_clusters','num_clusters','auto_stop_mins','enable_serverless_compute','warehouse_type']
  const url=new URL('/api/2.0/sql/history/queries',origin)
  url.searchParams.set('filter_by.warehouse_ids',warehouse)
  url.searchParams.set('filter_by.query_start_time_range.start_time_ms',String(Date.now()-30*60*1000))
  url.searchParams.set('max_results','20')
  url.searchParams.set('include_metrics','true')
  const history=await get(url)
  let monthlyPlan:Record<string,unknown>|undefined
  if(process.argv.includes('--explain-monthly')){
    // Fixed known SELECT only. EXPLAIN compiles its plan; it does not rebuild data.
    const result=await executeDatabricksStatement('EXPLAIN FORMATTED '+ORIGINAL_RESEARCH_MONTHLY_SQL,{rowLimit:2400})
    const text=result.rows.map(row=>Object.values(row).join('\n')).join('\n')
    if(!text||/ParseException|AnalysisException|Error occurred/i.test(text))throw Error('Monthly plan unavailable')
    const operators=['AdaptiveSparkPlan','PhotonScan','PhotonGroupingAgg','PhotonHashAggregate','PhotonShuffleExchangeSink','HashAggregate',
      'ObjectHashAggregate','Exchange','Project','Filter','Sort','Scan','ColumnarToRow','WholeStageCodegen']
    monthlyPlan={kind:'EXPLAIN FORMATTED',input_sql_sha256:createHash('sha256').update(ORIGINAL_RESEARCH_MONTHLY_SQL).digest('hex'),
      plan_sha256:createHash('sha256').update(text).digest('hex'),plan_lines:text.split('\n').length,
      operator_presence:Object.fromEntries(operators.map(op=>[op,new RegExp('\\b'+op+'\\b').test(text)])),
      source_version:0,scope:'Pinned original-itemized monthly aggregate; no plan text or source records retained'}
  }
  const metrics=['total_time_ms','execution_time_ms','compilation_time_ms','result_fetch_time_ms','result_from_cache',
    'provisioning_queue_start_timestamp','overloading_queue_start_timestamp','query_compilation_start_timestamp']
  console.log(JSON.stringify({checked_at:new Date().toISOString(),read_only:true,
    warehouse_http_status:status.http_status,
    warehouse:Object.fromEntries(fields.filter(k=>k in status.body).map(k=>[k,status.body[k]])),
    history_http_status:history.http_status,history_sample_limit:20,has_next_page:history.body.has_next_page,
    queries:(Array.isArray(history.body.res)?history.body.res:[]).map((q:Record<string,any>)=>({
      status:q.status,statement_type:q.statement_type,duration_ms:q.duration,plans_state:q.plans_state,
      metrics:Object.fromEntries(metrics.filter(k=>k in(q.metrics||{})).map(k=>[k,q.metrics[k]])),
    })),
    monthly_plan:monthlyPlan,
    limits:'Recent history sample can include other readers. Optional fixed monthly EXPLAIN retains operator presence and hashes only; no raw SQL/plan text or sizing change. Missing metrics remain absent.'},null,2))
}
main().catch(()=>{console.log(JSON.stringify({read_only:true,inspection_failed:true}));process.exitCode=1})
