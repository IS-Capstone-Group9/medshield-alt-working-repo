import {getJson} from './api-client'

const REGIONS=['CALABARZON','MIMAROPA','BICOL']
const DOMAINS=['sales_and_seasonality','product_priority','unit_forecast','historical_external_signal','planning_scenario','account_recommendation']
const COLUMNS=['Region','Review domain','Status','Period','Findings','Evidence','Reason','Next check','Population','Dataset','Policy','Mapping SHA-256','Official bulletin']
const V2_COLUMNS=[...COLUMNS,'Board contract','Product priority policy','Product priority query SHA-256','Product priority aggregate SHA-256']
const PRIORITY_POLICY='matched_regional_recorded_product_net_sales_v1'
type BoardRow={region:string;domain:string;label:string;status:string;period:string;findings:string;reason:string;
  next_check:string;evidence_label:string;base_net_sales_php:string|null;target_net_sales_php:string|null;
  matched_yoy_pct:number|null;target_margin_pct:number|null;matched_months:string[]}
type ProductPriority={schema_version:string;policy:string;source:DecisionBoardResponse['source'];
  query_sha256:string;aggregate_sha256:string;base_year:number;target_year:number;
  product_identity_approved:false;units_approved:false;clinical_priority:false;financial_publication_approved:false;procurement_execution_approved:false;
  regions:Array<{region:string;status:string;matched_months:string[];base_net_sales_php:string|null;target_net_sales_php:string|null;
    base_unreviewed_records:number|null;target_unreviewed_records:number|null;
    positive_product_net_sales_php:string|null;nonpositive_product_net_sales_php:string|null;recorded_products:number;positive_products:number;
    top_products:Array<{product:string;target_net_sales_php:string;base_net_sales_php:string|null;change_php:string|null;
      target_records:number;base_records:number;target_observed_months:number;base_observed_months:number}>}>}
export type DecisionBoardResponse={schema_version:string;status:string;population:string;
  source:{dataset_id:string;policy_version:string;mapping_sha256:string;fact_version:number;current_monthly_sha256:string;fact_table:string;calendar_end:string};
  comparison:{base_year:number;target_year:number};product_priority?:ProductPriority|null;
  rows:BoardRow[];columns:string[];records:string[][];evidence_label:string;assumption_ids:string[];
  official_bulletin:{status:string;available:boolean;official_alert:boolean};
  financial_publication_approved:boolean;forecast_approved:boolean;external_join_approved:boolean;
  procurement_execution_approved:boolean;limitations:string[]}
const object=(value:unknown):value is Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value)
const amount=(value:unknown):value is string=>typeof value==='string'&&/^-?\d+\.\d{6}$/.test(value)
const micros=(value:string)=>BigInt(value.replace('.',''))
function validPriority(value:unknown,source:Record<string,unknown>,comparison:unknown){
  if(!object(value)||value.schema_version!=='regional_recorded_product_priority_v1'||value.policy!==PRIORITY_POLICY
    ||!object(value.source)||!Object.keys(source).every(key=>(value.source as Record<string,unknown>)[key]===source[key])
    ||!object(comparison)||value.base_year!==comparison.base_year||value.target_year!==comparison.target_year
    ||!Number.isSafeInteger(value.base_year)||!Number.isSafeInteger(value.target_year)||Number(value.target_year)!==Number(value.base_year)+1
    ||typeof source.calendar_end!=='string'||Number(source.calendar_end.slice(0,4))!==value.target_year)return false
  for(const key of ['query_sha256','aggregate_sha256'])if(typeof value[key]!=='string'||!/^[a-f0-9]{64}$/.test(value[key] as string))return false
  for(const key of ['product_identity_approved','units_approved','clinical_priority','financial_publication_approved','procurement_execution_approved'])if(value[key]!==false)return false
  if(!Array.isArray(value.regions)||value.regions.length!==3)return false
  const seen=new Set<string>()
  for(const r of value.regions){
    if(!object(r)||typeof r.region!=='string'||!REGIONS.includes(r.region)||seen.has(r.region)
      ||!['available','unavailable'].includes(String(r.status))||!Array.isArray(r.matched_months)||r.matched_months.length>12
      ||!r.matched_months.every(m=>typeof m==='string'&&/^(0[1-9]|1[0-2])$/.test(m))
      ||new Set(r.matched_months).size!==r.matched_months.length||JSON.stringify([...r.matched_months].sort())!==JSON.stringify(r.matched_months)
      ||!Number.isSafeInteger(r.recorded_products)||Number(r.recorded_products)<0||!Number.isSafeInteger(r.positive_products)||Number(r.positive_products)<0
      ||Number(r.positive_products)>Number(r.recorded_products)||!Array.isArray(r.top_products)||r.top_products.length!==Math.min(5,Number(r.positive_products)))return false
    seen.add(r.region)
    for(const field of ['base_net_sales_php','target_net_sales_php','positive_product_net_sales_php','nonpositive_product_net_sales_php'])if(r.matched_months.length?!amount(r[field]):r[field]!==null)return false
    for(const field of ['base_unreviewed_records','target_unreviewed_records'])if(r.matched_months.length?(!Number.isSafeInteger(r[field])||Number(r[field])<0):r[field]!==null)return false
    if((r.status==='available')!==Boolean(r.matched_months.length&&Number(r.positive_products)))return false
    if(!r.matched_months.length&&(Number(r.recorded_products)||Number(r.positive_products)))return false
    if(r.matched_months.length&&(micros(r.positive_product_net_sales_php as string)<0n||micros(r.nonpositive_product_net_sales_php as string)>0n
      ||micros(r.positive_product_net_sales_php as string)+micros(r.nonpositive_product_net_sales_php as string)!==micros(r.target_net_sales_php as string)))return false
    const products=new Set<string>();let last:bigint|null=null,total=0n
    for(const p of r.top_products){
      if(!object(p)||typeof p.product!=='string'||!p.product.trim()||p.product.length>1000||/[\u0000-\u001f]/.test(p.product)||products.has(p.product)
        ||!amount(p.target_net_sales_php)||micros(p.target_net_sales_php)<=0n||p.base_net_sales_php!==null&&!amount(p.base_net_sales_php)
        ||p.change_php!==null&&!amount(p.change_php))return false
      for(const key of ['target_records','base_records','target_observed_months','base_observed_months'])if(!Number.isSafeInteger(p[key])||Number(p[key])<0)return false
      if(Number(p.target_records)<1||Number(p.target_observed_months)<1||Number(p.target_observed_months)>r.matched_months.length
        ||Number(p.base_observed_months)>r.matched_months.length||(p.base_net_sales_php===null)!==(Number(p.base_records)===0)
        ||(p.base_net_sales_php===null)!==(Number(p.base_observed_months)===0)
        ||(p.base_net_sales_php===null?p.change_php!==null:!amount(p.change_php)||micros(p.change_php)!==micros(p.target_net_sales_php)-micros(p.base_net_sales_php as string)))return false
      const current=micros(p.target_net_sales_php);if(last!==null&&current>last)return false
      last=current;total+=current;products.add(p.product)
    }
    if(r.matched_months.length&&(total>micros(r.positive_product_net_sales_php as string)||Number(r.positive_products)<=5&&total!==micros(r.positive_product_net_sales_php as string)))return false
  }
  return true
}

export function validRegionalDecisionBoard(input:unknown):input is DecisionBoardResponse{
  if(!object(input)||!['regional_decision_board_v1','regional_decision_board_v2'].includes(String(input.schema_version))||input.status!=='candidate_regional_review'
    ||input.evidence_label!=='Derived'||typeof input.population!=='string'||!input.population
    ||!object(input.source)||!object(input.official_bulletin))return false
  const source=input.source,official=input.official_bulletin
  const v2=input.schema_version==='regional_decision_board_v2'
  if(v2?(input.product_priority!==null&&!validPriority(input.product_priority,source,input.comparison)):input.product_priority!==undefined)return false
  if(source.dataset_id!=='e87cae21986db32bcade298d69e652236be9db65f2685db51355003f1439ff10'
    ||source.fact_table!=='workspace.medshield_original_gold_20261026.original_fd95b9e3abab028c8e41_itemized_candidates'
    ||source.policy_version!=='original_source_layers_v1_candidate_only'||source.fact_version!==0
    ||source.mapping_sha256!=='4c5f44013464395efa49c133f2d141646930f9437a23e60e8b05cf0298392df4'
    ||source.current_monthly_sha256!=='3c3732944ea115a3e12465bd48ee1d0322a503beb7c44e60a64e85b54cff586c'
    ||official.status!=='OFFICIAL_LIVE_BULLETIN_UNAVAILABLE'||official.available!==false||official.official_alert!==false)return false
  for(const flag of ['financial_publication_approved','forecast_approved','external_join_approved','procurement_execution_approved'])if(input[flag]!==false)return false
  if(JSON.stringify(input.columns)!==JSON.stringify(v2?V2_COLUMNS:COLUMNS)||JSON.stringify(input.assumption_ids)!=='["D4"]'
    ||!Array.isArray(input.rows)||input.rows.length!==18||!Array.isArray(input.records)||input.records.length!==18
    ||!Array.isArray(input.limitations)||!input.limitations.every(value=>typeof value==='string'))return false
  const seen=new Set<string>()
  for(let i=0;i<input.rows.length;i++){
    const row=input.rows[i],record=input.records[i]
    if(!object(row)||typeof row.region!=='string'||!REGIONS.includes(row.region)||typeof row.domain!=='string'||!DOMAINS.includes(row.domain)
      ||typeof row.status!=='string'||!['available','partial','unavailable'].includes(row.status)||row.evidence_label!=='Derived')return false
    const key=row.region+'|'+row.domain;if(seen.has(key))return false;seen.add(key)
    for(const field of ['label','period','findings','reason','next_check'])if(typeof row[field]!=='string')return false
    for(const field of ['base_net_sales_php','target_net_sales_php'])if(row[field]!==null&&(typeof row[field]!=='string'||! /^-?\d+(\.\d+)?$/.test(row[field] as string)))return false
    for(const field of ['matched_yoy_pct','target_margin_pct'])if(row[field]!==null&&(typeof row[field]!=='number'||!Number.isFinite(row[field])))return false
    const priority=object(input.product_priority)?input.product_priority:null
    const p=row.domain==='product_priority'&&priority?(priority.regions as Array<Record<string,unknown>>).find(p=>p.region===row.region):null
    if(p){
      if(row.status!==p.status||row.base_net_sales_php!==p.base_net_sales_php||row.target_net_sales_php!==p.target_net_sales_php
        ||JSON.stringify(row.matched_months)!==JSON.stringify(p.matched_months)||row.matched_yoy_pct!==null||row.target_margin_pct!==null)return false
    }else if(row.domain!=='sales_and_seasonality'&&(row.status!=='unavailable'||row.base_net_sales_php!==null
      ||row.target_net_sales_php!==null||row.matched_yoy_pct!==null||row.target_margin_pct!==null))return false
    const expected=[row.region,row.label,row.status,row.period,row.findings,row.evidence_label,row.reason,
      row.next_check,input.population,source.dataset_id,source.policy_version,source.mapping_sha256,official.status]
    if(v2)expected.push('regional_decision_board_v2',priority?.policy??'unavailable',priority?.query_sha256??'unavailable',priority?.aggregate_sha256??'unavailable')
    if(!Array.isArray(record)||!record.every(value=>typeof value==='string')||JSON.stringify(record)!==JSON.stringify(expected))return false
  }
  return true
}

export function regionalDecisionBoardCsv(data:DecisionBoardResponse):string{
  if(!validRegionalDecisionBoard(data))throw Error('Invalid regional decision board')
  const quote=(value:string)=>'"'+(/^[=+@\-\t\r]/.test(value)?"'":'')+value.replace(/"/g,'""')+'"'
  return [data.columns,...data.records].map(row=>row.map(quote).join(',')).join('\r\n')+'\r\n'
}

/** Native listeners only; one in-flight request, no stale table or export during reload/failure. */
export function installRegionalDecisionBoard(root:HTMLElement):()=>void{
  const host=root.querySelector<HTMLElement>('[data-regional-decision-board-host]')
    ??root.querySelector<HTMLElement>('[data-sales-output-panel="so1"]')
  if(!host)return()=>{}
  const panel=document.createElement('section');panel.className='chart-card regional-decision-board'
  panel.setAttribute('aria-label','Regional decision board')
  panel.innerHTML=`<style>
    .regional-decision-board{min-width:0;overflow-wrap:anywhere}.regional-decision-board p{line-height:1.55}
    .regional-decision-board .board-controls{display:flex;gap:12px;flex-wrap:wrap;margin:14px 0}
    .regional-decision-board .board-scroll{overflow:auto;max-height:520px;max-width:100%}
    .regional-decision-board table{border-collapse:collapse;width:100%;font-size:12px}
    .regional-decision-board th,.regional-decision-board td{text-align:left;vertical-align:top;padding:10px;border-bottom:1px solid var(--border,#dbe1e8);min-width:130px;max-width:340px;white-space:normal;overflow-wrap:anywhere}
    .regional-decision-board th{position:sticky;top:0;background:var(--bg-card,#fff)}
    .regional-decision-board button:focus-visible{outline:2px solid var(--accent,#365d80);outline-offset:3px}
    .regional-decision-board button:hover:not(:disabled){filter:brightness(.96)}
    .regional-decision-board button:disabled{opacity:.5;cursor:not-allowed}
    .regional-decision-board .board-bulletin{padding:10px;border-left:3px solid #b7791f;background:#fffaeb;color:#734a13}
    @media(max-width:600px){.regional-decision-board{padding:14px}.regional-decision-board .board-controls button{width:100%}}
  </style><h2 class="chart-title">Regional decision board</h2>
  <p>Three confirmed delivery regions · Recorded itemized sales · Contracts excluded · All buyers. Analysis filters do not apply here.</p>
  <p>Product sales priorities rank positive signed net sales over matched regional months. Names remain separate source labels; this is not clinical urgency or stock need. Missing product periods remain unavailable, not zero demand.</p>
  <p class="board-bulletin"><strong>Official live bulletin unavailable.</strong> No verified official alert feed is connected. Historical observations and provider proxies do not supply an official warning.</p>
  <div class="board-controls"><button type="button" class="btn btn-secondary" data-board-load>Load regional decision board</button>
  <button type="button" class="btn btn-secondary" data-board-export disabled>Export decision board</button></div>
  <p data-board-status role="status">Open Territory baseline or load the board to review source-matched domains.</p>
  <p data-board-source></p><div class="board-scroll" tabindex="0" aria-label="Regional decision review table; scroll for source columns"><table class="cluster-table" data-board-table aria-label="Regional domain status, findings and source"></table></div>
  <p data-board-limits></p>`
  host.append(panel)
  const loadButton=panel.querySelector<HTMLButtonElement>('[data-board-load]')!
  const exportButton=panel.querySelector<HTMLButtonElement>('[data-board-export]')!
  const status=panel.querySelector<HTMLElement>('[data-board-status]')!
  const source=panel.querySelector<HTMLElement>('[data-board-source]')!
  const limits=panel.querySelector<HTMLElement>('[data-board-limits]')!
  const table=panel.querySelector<HTMLTableElement>('[data-board-table]')!
  let data:DecisionBoardResponse|null=null,loading=false,loaded=false,disposed=false,sequence=0
  const clear=()=>{data=null;exportButton.disabled=true;table.replaceChildren();source.replaceChildren();limits.replaceChildren()}
  let loadController: AbortController | null = null
  const load=async()=>{
    if(disposed||loading)return
    loading=true;loadController?.abort();loadController=new AbortController();loaded=true;loadButton.disabled=true;clear();status.textContent='Loading source-matched regional review…'
    const request=++sequence
    try{
      const value=await getJson<unknown>('/api/sales/regional-decision-board',{signal:loadController.signal})
      if(disposed||request!==sequence)return
      if(!validRegionalDecisionBoard(value))throw Error('Invalid decision board')
      data=value
      const header=table.createTHead().insertRow()
      for(const label of value.columns){const th=document.createElement('th');th.scope='col';th.textContent=label;header.append(th)}
      const body=table.createTBody()
      for(const record of value.records){const row=body.insertRow();for(const text of record)row.insertCell().textContent=text}
      source.textContent=`Dataset ${value.source.dataset_id} · policy ${value.source.policy_version} · Gold Delta ${value.source.fact_version}.`
      limits.textContent=value.limitations.join(' ')
      status.textContent='18 region/domain reviews loaded. Unavailable means the required input or eligible comparison is absent, or validation failed; no substitute values were used.'
      exportButton.disabled=false
    }catch{
      if(!disposed&&request===sequence){clear();status.textContent='Regional decision board unavailable. Reload to retry; no substitute or previous values are shown.'}
    }finally{
      if(!disposed&&request===sequence){loading=false;loadButton.disabled=false}
    }
  }
  const download=()=>{
    if(!data||exportButton.disabled||loading)return
    const url=URL.createObjectURL(new Blob([regionalDecisionBoardCsv(data)],{type:'text/csv;charset=utf-8'}))
    const link=document.createElement('a');link.href=url;link.download='medshield-regional-decision-board.csv';link.click()
    setTimeout(()=>URL.revokeObjectURL(url),1000)
  }
  const activate=(event:Event)=>{if((event as CustomEvent).detail?.name==='so1'&&!loaded)void load()}
  const invalidate=()=>{loadController?.abort();sequence++;loading=false;loaded=false;loadButton.disabled=false;clear();status.textContent='Source changed. Reload the decision board before reviewing or exporting.'}
  loadButton.addEventListener('click',load);exportButton.addEventListener('click',download)
  root.addEventListener('medshield:sales-output-change',activate);root.addEventListener('medshield:source-reloaded',invalidate)
  return()=>{disposed=true;loadController?.abort();sequence++;clear();root.removeEventListener('medshield:sales-output-change',activate);
    root.removeEventListener('medshield:source-reloaded',invalidate);panel.remove()}
}
