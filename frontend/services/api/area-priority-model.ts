import {validRegionalData,sumRegional,type RegionalData,type RegionalMonth} from './regional-sales-model'

export type AreaMonth=RegionalMonth&{area:string}
export type AreaPriorityData={status:string;regional:RegionalData;area_months:AreaMonth[];interpretation:string;account_identity_available:boolean;forecast_approved:boolean}
const n=(value:string)=>BigInt(value.replace('.',''))
const fixed=(value:bigint)=>{const a=value<0n?-value:value;return(value<0n?'-':'')+a/1000000n+'.'+String(a%1000000n).padStart(6,'0')}
export function validAreaPriority(data:AreaPriorityData){
  try{
    if(data?.status!=='confirmed_area_priority_review'||!validRegionalData(data.regional)||data.account_identity_available!==false||data.forecast_approved!==false
      ||data.interpretation!=='observed_signed_area_net_abc_not_predictive_not_inventory_slow_movers'||data.area_months?.length!==1032)return false
    const mapping=new Map(data.regional.mappings.map(row=>[row.recorded_label,row.region])),seen=new Set<string>()
    for(const row of data.area_months){
      const key=row.area+'|'+row.period
      if(!row.area||seen.has(key)||row.region!==(mapping.get(row.area)??'UNALLOCATED')||!/^\d{4}-(0[1-9]|1[0-2])$/.test(row.period))return false
      seen.add(key)
      if(!['records','net_eligible_records','margin_eligible_records','unreviewed_records'].every(key=>Number.isSafeInteger(row[key as keyof AreaMonth])&&Number(row[key as keyof AreaMonth])>=0)
        ||row.records===0||row.net_eligible_records>row.records||row.margin_eligible_records>row.net_eligible_records||row.unreviewed_records>row.records)return false
      for(const key of ['net_sales_php','gross_profit_php','margin_revenue_basis_php'] as const)if(row[key]!==null&&!/^-?\d+\.\d{6}$/.test(row[key]!))return false
      if((row.net_sales_php===null)!==(row.net_eligible_records===0)||(row.gross_profit_php===null)!==(row.margin_eligible_records===0)||(row.margin_revenue_basis_php===null)!==(row.margin_eligible_records===0))return false
    }
    for(const month of data.regional.months){
      const total=sumRegional(data.area_months.filter(row=>row.region===month.region&&row.period===month.period))
      for(const key of ['records','net_eligible_records','margin_eligible_records','unreviewed_records','net_sales_php','gross_profit_php','margin_revenue_basis_php'] as const)if(total[key]!==month[key])return false
    }
    return sumRegional(data.area_months).records===data.regional.company.records
  }catch{return false}
}
export function areaPriorityView(data:AreaPriorityData,year:string,region='ALL'){
  if(year!=='all'&&!/^\d{4}$/.test(year)||!['ALL','CALABARZON','MIMAROPA','BICOL'].includes(region))throw Error('Invalid area scope')
  const selected=data.area_months.filter(row=>year==='all'||row.period.startsWith(year+'-'))
  const company=sumRegional(selected),confirmed=sumRegional(selected.filter(row=>row.region!=='UNALLOCATED')),unallocated=sumRegional(selected.filter(row=>row.region==='UNALLOCATED'))
  const rows=data.regional.mappings.filter(mapping=>region==='ALL'||mapping.region===region).map(mapping=>{
    const source=selected.filter(row=>row.area===mapping.recorded_label),summary=sumRegional(source)
    const matched:Array<{month:string;current:string;previous:string}>=[]
    if(year!=='all')for(let month=1;month<=12;month++){
      const suffix='-'+String(month).padStart(2,'0'),current=source.find(row=>row.period===year+suffix),previous=data.area_months.find(row=>row.area===mapping.recorded_label&&row.period===String(Number(year)-1)+suffix)
      if(current?.net_sales_php!=null&&previous?.net_sales_php!=null)matched.push({month:suffix.slice(1),current:current.net_sales_php,previous:previous.net_sales_php})
    }
    const current=matched.length?fixed(matched.reduce((sum,row)=>sum+n(row.current),0n)):null,previous=matched.length?fixed(matched.reduce((sum,row)=>sum+n(row.previous),0n)):null
    return {...summary,area:mapping.recorded_label,region:mapping.region,matched,current,previous,
      change:current!==null&&previous!==null?fixed(n(current)-n(previous)):null,
      growth_pct:current!==null&&previous!==null&&n(previous)>0n?100*Number(n(current)-n(previous))/Number(n(previous)):null,
      lastRecordedMonth:data.area_months.filter(row=>row.area===mapping.recorded_label).map(row=>row.period).sort().at(-1)??null,
      share_pct:null as number|null,cumulative_pct:null as number|null,abc:'Unavailable'}
  }).sort((a,b)=>a.net_sales_php===null?b.net_sales_php===null?a.area.localeCompare(b.area):1:b.net_sales_php===null?-1:n(a.net_sales_php)===n(b.net_sales_php)?a.area.localeCompare(b.area):n(a.net_sales_php)>n(b.net_sales_php)?-1:1)
  const positive=rows.reduce((sum,row)=>sum+(row.net_sales_php!==null&&n(row.net_sales_php)>0n?n(row.net_sales_php):0n),0n)
  let cumulative=0n
  for(const row of rows){
    if(row.net_sales_php===null)continue
    const value=n(row.net_sales_php)
    if(value<=0n){row.abc='Nonpositive';continue}
    row.abc=cumulative*100n<positive*80n?'A':cumulative*100n<positive*95n?'B':'C'
    cumulative+=value;row.share_pct=100*Number(value)/Number(positive);row.cumulative_pct=100*Number(cumulative)/Number(positive)
  }
  const unresolved=[...new Set(selected.filter(row=>row.region==='UNALLOCATED').map(row=>row.area))].sort().map(area=>({area,...sumRegional(selected.filter(row=>row.area===area))})).sort((a,b)=>Number(b.net_sales_php)-Number(a.net_sales_php)||a.area.localeCompare(b.area))
  return {year,region,company,confirmed,unallocated,rows,unresolved,positive_area_total_php:fixed(positive),
    confirmed_share_pct:confirmed.net_sales_php!==null&&company.net_sales_php!==null&&n(company.net_sales_php)>0n?100*Number(n(confirmed.net_sales_php))/Number(n(company.net_sales_php)):null}
}
export const AREA_ACTION_POLICY='observed_area_sales_follow_up_v1'
type AreaPriorityRow=ReturnType<typeof areaPriorityView>['rows'][number]
/** Review actions use observed financial evidence; they never prescribe stock quantities. */
export function areaRecommendation(row:AreaPriorityRow,year:string){
  const scope=year==='all'?'full recorded history':year
  const common={owner:'Sales lead',status:'review_recommendation_not_purchase_instruction',policy:AREA_ACTION_POLICY}
  if(row.records===0||row.net_sales_php===null)return {...common,code:'confirm_reporting',
    action:'Confirm reporting before setting an area target',
    reason:`${row.area} has no eligible recorded net sales in ${scope}; this does not establish zero demand.`,
    follow_up:'Source owner confirms missing submissions or unavailable amounts before the next area review.'}
  if(n(row.net_sales_php)<=0n)return {...common,code:'review_adjustments',
    action:'Review invoices and signed adjustments',
    reason:`${row.area} has nonpositive signed net sales in ${scope}. This is not evidence of physical returns or low demand.`,
    follow_up:'Reconcile the source entries with finance and record the explanation before setting a sales target.'}
  if(row.change!==null&&n(row.change)<0n)return {...common,code:'investigate_decline',
    action:'Investigate the recorded sales decline',
    reason:`${row.area}: matched-month net sales fell from PHP ${row.previous} to PHP ${row.current} across ${row.matched.length} observed month pairs.`,
    follow_up:'Review the matched-period invoices and delivery records; record supported causes and a sales follow-up. No cause is inferred from the decline.'}
  if(row.abc==='A')return {...common,code:'protect_service',
    action:'Prepare a service and customer-requirements review',
    reason:`${row.area} is an observed A area in ${scope}, based on its share of positive area net sales within this region selection.`,
    follow_up:'Sales lead confirms current customer requirements and delivery issues at the next sales review; inventory staff check stock before any commitment.'}
  return {...common,code:'review_opportunities',
    action:'Check current customer requirements before expanding coverage',
    reason:`${row.area} has positive recorded net sales in ${scope}; its observed class is ${row.abc}. This does not establish unmet demand.`,
    follow_up:'Record customer-confirmed requirements and service constraints before proposing stock or assigning a growth target.'}
}
export function areaPriorityCsv(data:AreaPriorityData,year:string,region='ALL'){
  const view=areaPriorityView(data,year,region),source=data.regional.source
  const header=['raw_area','delivery_region','year','region_filter','net_sales_php','supported_gross_profit_php','matching_margin_revenue_php','records','net_eligible_records','margin_supported_records','observed_abc','positive_area_net_share_pct','cumulative_positive_area_net_pct','matched_months','matched_prior_net_php','matched_current_net_php','matched_change_php','growth_pct','last_recorded_month','company_net_php','confirmed_net_php','unallocated_net_php','dataset_id','source_table','source_delta_version','mapping_sha256','monthly_source_sha256','source_completeness','contracts_excluded','forecast_approved','account_identity_available','interpretation','policy_version','financial_publication_approved','unreviewed_source_records','observation_status','mapping_evidence']
  const records=view.rows.map(row=>[row.area,row.region,year,region,row.net_sales_php,row.gross_profit_php,row.margin_revenue_basis_php,row.records,row.net_eligible_records,row.margin_eligible_records,row.abc,row.share_pct,row.cumulative_pct,row.matched.map(pair=>pair.month).join(';'),row.previous,row.current,row.change,row.growth_pct,row.lastRecordedMonth,view.company.net_sales_php,view.confirmed.net_sales_php,view.unallocated.net_sales_php,source.dataset_id,source.fact_table,source.fact_version,source.mapping_sha256,source.current_monthly_sha256,'unknown',true,false,false,data.interpretation,source.policy_version,false,row.unreviewed_records,row.records===0?'no_source_records':row.net_sales_php===null?'no_eligible_net_sales':'recorded',data.regional.scope.mapping_evidence])
  header.push('recommendation_code','recommended_action','recommendation_reason','suggested_owner','follow_up_check','recommendation_status','recommendation_policy')
  view.rows.forEach((row,index)=>{const action=areaRecommendation(row,year);records[index].push(action.code,action.action,action.reason,action.owner,action.follow_up,action.status,action.policy)})
  const quote=(value:unknown)=>{let text=String(value??'');if(typeof value==='string'&&!/^-?\d+(?:\.\d+)?$/.test(text)&&/^\s*[=+@-]/.test(text))text="'"+text;return '"'+text.replace(/"/g,'""')+'"'}
  return '\uFEFF'+[header,...records].map(row=>row.map(quote).join(',')).join('\r\n')
}
