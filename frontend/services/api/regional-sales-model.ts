export type RegionalMonth={region:string;period:string;records:number;net_eligible_records:number;margin_eligible_records:number;unreviewed_records:number;net_sales_php:string|null;gross_profit_php:string|null;margin_revenue_basis_php:string|null}
export type RegionalData={status:string;scope:{unit:string;contracts_excluded:boolean;source_completeness:string;filter_policy:string;mapping_evidence:string;financial_publication_approved:boolean;forecast_approved:boolean;external_join_approved:boolean};
  source:{dataset_id:string;fact_table:string;fact_version:number;policy_version:string;receipt_sha256:string;mapping_sha256:string;mapping_table:string;current_monthly_sha256:string;calendar_start:string;calendar_end:string;source_months:number};
  mappings:Array<{recorded_label:string;province:string;region:string;delivery_meaning:string}>;unallocated_labels:string[];company:RegionalMonth;summaries:RegionalMonth[];months:RegionalMonth[];
  coverage:{confirmed_labels:number;total_labels:number;mapped_records:number;retained_records:number;mapped_record_pct:number;mapped_signed_net_sales_php:string};limitations:string[]}
export const REGION_NAMES:Record<string,string>={ALL:'All recorded itemized sales',CALABARZON:'CALABARZON',MIMAROPA:'MIMAROPA',BICOL:'Bicol',UNALLOCATED:'Unallocated labels'}
/** Fixed-period review, shown only in its own confirmed regional/year scope. */
export function regionalJuneReview(data:RegionalData,region:string,year:string){
  if(region!=='CALABARZON'||!['all','2026'].includes(year))return null
  const current=data.months.find(m=>m.region===region&&m.period==='2026-06'),previous=data.months.find(m=>m.region===region&&m.period==='2025-06')
  if(!current||!previous||current.net_sales_php===null||previous.net_sales_php===null)return null
  return {current,previous,change:text(micros(current.net_sales_php)-micros(previous.net_sales_php)),
    sourceNoteMatches:data.source.current_monthly_sha256==='3c3732944ea115a3e12465bd48ee1d0322a503beb7c44e60a64e85b54cff586c'
      &&data.source.dataset_id==='e87cae21986db32bcade298d69e652236be9db65f2685db51355003f1439ff10'&&data.source.fact_version===0
      &&data.source.mapping_sha256==='4c5f44013464395efa49c133f2d141646930f9437a23e60e8b05cf0298392df4'}
}
const counts=['records','net_eligible_records','margin_eligible_records','unreviewed_records'] as const
const amounts=['net_sales_php','gross_profit_php','margin_revenue_basis_php'] as const
const index=(m:string)=>Number(m.slice(0,4))*12+Number(m.slice(5,7))-1
const label=(i:number)=>Math.floor(i/12)+'-'+String(i%12+1).padStart(2,'0')
const micros=(value:string)=>{if(!/^-?\d+\.\d{6}$/.test(value))throw Error('Invalid amount');return BigInt(value.replace('.',''))}
const text=(value:bigint)=>{const a=value<0n?-value:value;return(value<0n?'-':'')+a/1000000n+'.'+String(a%1000000n).padStart(6,'0')}
export function sumRegional(rows:RegionalMonth[],region='ALL',period='selected'):RegionalMonth{
  const r:RegionalMonth={region,period,records:0,net_eligible_records:0,margin_eligible_records:0,unreviewed_records:0,net_sales_php:null,gross_profit_php:null,margin_revenue_basis_php:null}
  for(const key of counts)r[key]=rows.reduce((s,row)=>s+row[key],0)
  for(const key of amounts){const observed=rows.filter(row=>row[key]!==null);r[key]=observed.length?text(observed.reduce((s,row)=>s+micros(row[key]!),0n)):null}
  return r
}
export function validRegionalData(data:RegionalData){
  try{
    if(data?.status!=='user_confirmed_regional_financial_review'||data.scope?.unit!=='PHP'||data.scope.contracts_excluded!==true||data.scope.source_completeness!=='unknown'
      ||data.scope.financial_publication_approved!==false||data.scope.forecast_approved!==false||data.scope.external_join_approved!==false
      ||data.scope.filter_policy!=='fixed_itemized_all_buyers_independent_of_analysis_filters'||data.source?.fact_version!==0
      ||![data.source.dataset_id,data.source.receipt_sha256,data.source.mapping_sha256,data.source.current_monthly_sha256].every(h=>/^[a-f0-9]{64}$/.test(h))
      ||data.mappings?.length!==9||new Set(data.mappings.map(m=>m.recorded_label)).size!==9||data.mappings.some(m=>m.delivery_meaning!=='user_confirmed'||!['CALABARZON','MIMAROPA','BICOL'].includes(m.region))
      ||data.summaries?.length!==4||!Array.isArray(data.months)||!data.months.length||!Array.isArray(data.unallocated_labels)||data.unallocated_labels.length!==13)return false
    const seen=new Set<string>()
    for(const m of data.months){
      const key=m.region+'|'+m.period
      if(!['CALABARZON','MIMAROPA','BICOL','UNALLOCATED'].includes(m.region)||!/^\d{4}-(0[1-9]|1[0-2])$/.test(m.period)||seen.has(key))return false
      seen.add(key)
      if(!counts.every(k=>Number.isSafeInteger(m[k])&&m[k]>=0)||m.records===0||m.net_eligible_records>m.records||m.margin_eligible_records>m.net_eligible_records||m.unreviewed_records>m.records)return false
      if((m.net_sales_php===null)!==(m.net_eligible_records===0)||(m.gross_profit_php===null)!==(m.margin_eligible_records===0)||(m.margin_revenue_basis_php===null)!==(m.margin_eligible_records===0))return false
      for(const key of amounts)if(m[key]!==null)micros(m[key]!)
    }
    for(const summary of [...data.summaries,data.company]){
      const actual=sumRegional(data.months.filter(m=>summary.region==='ALL'||m.region===summary.region))
      if(![...counts,...amounts].every(k=>actual[k]===summary[k]))return false
    }
    return data.company.records===40171&&data.company.net_eligible_records===39286&&data.company.net_sales_php==='638015351.530000'
  }catch{return false}
}
export function regionalView(data:RegionalData,region:string,year:string){
  if(!REGION_NAMES[region]||year!=='all'&&!/^\d{4}$/.test(year))throw Error('Invalid regional selection')
  const cohort=data.months.filter(m=>year==='all'||m.period.slice(0,4)===year)
  const summaries=['CALABARZON','MIMAROPA','BICOL','UNALLOCATED'].map(r=>sumRegional(cohort.filter(m=>m.region===r),r))
  const company=sumRegional(cohort),selected=cohort.filter(m=>region==='ALL'||m.region===region),summary=sumRegional(selected,region)
  const first=year==='all'?index(data.source.calendar_start):index(year+'-01'),last=year==='all'?index(data.source.calendar_end):index(year+'-12')
  const months=[]
  for(let i=first;i<=last;i++){
    const period=label(i),sourceRows=data.months.filter(m=>m.period===period),rows=selected.filter(m=>m.period===period)
    const status=i<index(data.source.calendar_start)||i>index(data.source.calendar_end)?'outside_observed_source_period':!sourceRows.length?'no_company_source_month':!rows.length?'no_regional_source_records':rows.every(m=>m.net_sales_php===null)?'no_eligible_net_sales':'recorded'
    months.push({...sumRegional(rows,region,period),status})
  }
  const matched:Array<{month:string;previous:string;current:string}>=[]
  if(year!=='all')for(let month=1;month<=12;month++){
    const suffix='-'+String(month).padStart(2,'0'),current=selected.filter(m=>m.period===year+suffix),prior=data.months.filter(m=>m.period===String(Number(year)-1)+suffix&&(region==='ALL'||m.region===region))
    const c=sumRegional(current),p=sumRegional(prior)
    if(c.net_sales_php!==null&&p.net_sales_php!==null)matched.push({month:String(month).padStart(2,'0'),previous:p.net_sales_php,current:c.net_sales_php})
  }
  const previous=matched.length?text(matched.reduce((s,m)=>s+micros(m.previous),0n)):null,current=matched.length?text(matched.reduce((s,m)=>s+micros(m.current),0n)):null
  return {region,year,company,summary,summaries,months,matched,previous,current,change:previous!==null&&current!==null?text(micros(current)-micros(previous)):null,
    growth_pct:previous!==null&&current!==null&&micros(previous)>0n?100*Number(micros(current)-micros(previous))/Number(micros(previous)):null}
}
export function regionalCsvRecords(data:RegionalData,region:string,year:string){
  return [['region_scope','year_scope','period','observation_status','retained_records','eligible_net_records','net_sales_php','supported_gross_profit_php','matching_margin_revenue_php','margin_supported_records','unreviewed_source_records','dataset_id','source_table','source_delta_version','mapping_sha256','monthly_source_sha256','source_completeness','financial_publication_approved','forecast_approved','contracts_excluded'],
    ...regionalView(data,region,year).months.map(m=>[region,year,m.period,m.status,m.records,m.net_eligible_records,m.net_sales_php,m.gross_profit_php,m.margin_revenue_basis_php,m.margin_eligible_records,m.unreviewed_records,data.source.dataset_id,data.source.fact_table,0,data.source.mapping_sha256,data.source.current_monthly_sha256,'unknown',false,false,true])]
}
export function regionalTotalsCsvRecords(data:RegionalData,year:string){
  const view=regionalView(data,'ALL',year)
  return [['region','year_scope','retained_records','eligible_net_records','net_sales_php','supported_gross_profit_php','matching_margin_revenue_php','margin_supported_records','unreviewed_source_records','dataset_id','mapping_sha256','source_delta_version','source_completeness','financial_publication_approved'],
    ...[...view.summaries,view.company].map(r=>[r.region,year,r.records,r.net_eligible_records,r.net_sales_php,r.gross_profit_php,r.margin_revenue_basis_php,r.margin_eligible_records,r.unreviewed_records,data.source.dataset_id,data.source.mapping_sha256,0,'unknown',false])]
}
/** Signed financial allocation is distinct from retained-record allocation. */
export function regionalCoverage(data:RegionalData,year:string){
  const view=regionalView(data,'ALL',year)
  const confirmed=sumRegional(view.summaries.filter(row=>row.region!=='UNALLOCATED'),'CONFIRMED')
  const unallocated=view.summaries.find(row=>row.region==='UNALLOCATED')!
  const companyNet=view.company.net_sales_php
  return {confirmed,unallocated,company:view.company,
    signed_net_share_pct:confirmed.net_sales_php!==null&&companyNet!==null&&micros(companyNet)>0n
      ?100*Number(micros(confirmed.net_sales_php))/Number(micros(companyNet)):null,
    record_share_pct:view.company.records?100*confirmed.records/view.company.records:null}
}
export function regionalComparisons(data:RegionalData,year:string){
  return ['CALABARZON','MIMAROPA','BICOL'].map(region=>{
    const view=regionalView(data,region,year)
    const selectedObserved=view.months.filter(month=>month.status==='recorded').map(month=>month.period.slice(5))
    return {...view,lastRecordedMonth:data.months.filter(month=>month.region===region).map(month=>month.period).sort().at(-1)??null,
      omittedObservedMonths:year==='all'?[]:selectedObserved.filter(month=>!view.matched.some(pair=>pair.month===month)),
      comparison_status:year==='all'?'select_year':view.matched.length?'matching_recorded_months_not_reporting_completeness':'no_matching_eligible_months'}
  })
}
export function regionalComparisonCsvRecords(data:RegionalData,year:string){
  const coverage=regionalCoverage(data,year)
  return [['region','year_scope','selected_net_sales_php','supported_gross_profit_php','matching_margin_revenue_php','retained_records','margin_supported_records',
    'matched_months','omitted_current_observed_months','matched_prior_net_php','matched_current_net_php','signed_change_php','growth_pct','comparison_status',
    'confirmed_net_sales_php','unallocated_net_sales_php','company_net_sales_php','confirmed_signed_net_share_pct','confirmed_records','company_records',
    'dataset_id','source_table','source_delta_version','mapping_sha256','monthly_source_sha256','source_completeness','contracts_excluded','financial_publication_approved','forecast_approved','last_recorded_regional_month'],
    ...regionalComparisons(data,year).map(view=>[view.region,year,view.summary.net_sales_php,view.summary.gross_profit_php,view.summary.margin_revenue_basis_php,
      view.summary.records,view.summary.margin_eligible_records,view.matched.map(month=>month.month).join(';'),view.omittedObservedMonths.join(';'),
      view.previous,view.current,view.change,view.growth_pct,view.comparison_status,coverage.confirmed.net_sales_php,coverage.unallocated.net_sales_php,
      coverage.company.net_sales_php,coverage.signed_net_share_pct,coverage.confirmed.records,coverage.company.records,data.source.dataset_id,data.source.fact_table,
      data.source.fact_version,data.source.mapping_sha256,data.source.current_monthly_sha256,'unknown',true,false,false,view.lastRecordedMonth])]
}
export type RegionalStlPoint={period:string;observed_net_sales_php:string;trend_php:number;seasonal_php:number;residual_php:number;segment_start:string;segment_end:string}
export type StlStrength={region:string;start:string;end:string;months:number;trend_strength:number|null;seasonal_strength:number|null}
export type RegionalStl={status:string;artifact_sha256:string;candidate_table:string;candidate_version:number;source:RegionalData['source'];
  strength_summary?:StlStrength[];protocol:{period:number;seasonal_window:number;minimum_contiguous_months:number;missing_policy:string;interpretation:string};forecast_approved:boolean;financial_publication_approved:boolean;external_join_approved:boolean;future_forecasts_generated:boolean;
  series:Array<{region:string;maximum_contiguous_observed_months:number;components:RegionalStlPoint[];fitted_segments:Array<{start:string;end:string;months:number}>;
    matched_change:null|{recorded_change_php:string;component_changes_php:{trend_php:number;seasonal_php:number;residual_php:number}}}>;limitations:string[]}
export function validRegionalStl(data:RegionalStl,current:RegionalData){
  return data?.status==='regional_stl_review'&&data.candidate_version===0&&/^[a-f0-9]{64}$/.test(data.artifact_sha256)
    &&data.forecast_approved===false&&data.financial_publication_approved===false&&data.external_join_approved===false&&data.future_forecasts_generated===false
    &&data.source?.mapping_sha256===current.source.mapping_sha256&&data.source.current_monthly_sha256===current.source.current_monthly_sha256&&data.source.dataset_id===current.source.dataset_id
    &&data.protocol?.period===12&&data.protocol.seasonal_window===13&&data.protocol.minimum_contiguous_months===36&&data.protocol.missing_policy==='no_imputation_split_at_gaps'
    &&Array.isArray(data.series)&&data.series.length===3&&JSON.stringify(data.series.map(s=>s.region))===JSON.stringify(['CALABARZON','MIMAROPA','BICOL'])
    &&data.series.every(s=>Array.isArray(s.components)&&new Set(s.components.map(p=>p.period)).size===s.components.length&&s.components.every(p=>
      /^\d{4}-(0[1-9]|1[0-2])$/.test(p.period)&&[p.trend_php,p.seasonal_php,p.residual_php].every(n=>typeof n==='number'&&Number.isFinite(n))
      &&current.months.some(m=>m.region===s.region&&m.period===p.period&&m.net_sales_php===p.observed_net_sales_php)
      &&Math.abs(Number(p.observed_net_sales_php)-p.trend_php-p.seasonal_php-p.residual_php)<1e-6))
    &&Array.isArray(data.limitations)&&data.limitations.length>0
    &&validRegionalStrengthSummary(data)
}
function validRegionalStrengthSummary(data:RegionalStl){
  if(data.strength_summary===undefined)return true
  if(!Array.isArray(data.strength_summary))return false
  const expected=regionalStlStrengths(data)
  if(data.strength_summary.length!==expected.length)return false
  return data.strength_summary.every((row,i)=>{
    const reference=expected[i]
    if(JSON.stringify([row.region,row.start,row.end,row.months])!==JSON.stringify([reference.region,reference.start,reference.end,reference.months]))return false
    return (['trend_strength','seasonal_strength'] as const).every(key=>{
      const actual=row[key],value=reference[key]
      return actual===null?value===null:typeof actual==='number'&&Number.isFinite(actual)&&value!==null&&Math.abs(actual-value)<1e-12
    })
  })
}
export function regionalStlStrengths(data:RegionalStl):StlStrength[]{
  const variance=(values:number[])=>{const mean=values.reduce((sum,x)=>sum+x,0)/values.length;return values.reduce((sum,x)=>sum+(x-mean)**2,0)/values.length}
  return data.series.flatMap(series=>series.fitted_segments.map(segment=>{
    const points=series.components.filter(p=>p.segment_start===segment.start&&p.segment_end===segment.end)
    const residual=variance(points.map(p=>p.residual_php))
    const strength=(field:'trend_php'|'seasonal_php')=>{const denominator=variance(points.map(p=>p[field]+p.residual_php));return denominator===0||!points.length?null:Math.max(0,1-residual/denominator)}
    return {region:series.region,start:segment.start,end:segment.end,months:points.length,trend_strength:strength('trend_php'),seasonal_strength:strength('seasonal_php')}
  }))
}
export function regionalStlCsvRecords(data:RegionalStl,region:string,year:string){
  const points=data.series.find(s=>s.region===region)?.components.filter(p=>year==='all'||p.period.startsWith(year+'-'))??[]
  const strengths=regionalStlStrengths(data)
  return [['region','selected_year','period','recorded_net_sales_php','trend_php','seasonal_php','residual_php','segment_start','segment_end','interpretation','dataset_id','mapping_sha256','source_monthly_sha256','analysis_sha256','forecast_approved','full_segment_trend_strength','full_segment_seasonal_strength','evidence_label','assumption_ids','policy_version'],
    ...points.map(p=>{const strength=strengths.find(s=>s.region===region&&s.start===p.segment_start&&s.end===p.segment_end);return [region,year,p.period,p.observed_net_sales_php,p.trend_php,p.seasonal_php,p.residual_php,p.segment_start,p.segment_end,'retrospective_not_origin_safe_forecast_feature',data.source.dataset_id,data.source.mapping_sha256,data.source.current_monthly_sha256,data.artifact_sha256,false,strength?.trend_strength??null,strength?.seasonal_strength??null,'Derived','D4',data.source.policy_version]})]
}
