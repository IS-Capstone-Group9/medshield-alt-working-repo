import {sumRegional,validRegionalData,type RegionalData,type RegionalMonth} from './regional-sales-model'

export const DELIVERY_AREAS=['QUEZON','BATANGAS','CAVITE','LOWER CAVITE','LAGUNA','MARINDUQUE','ALBAY','CAM NORTE','CAM SUR']
export const CAVITE_ROLLUP='CAVITE PROVINCE'
export type AreaMonth=RegionalMonth & {area:string}
export type DeliveryAreaData={status:string;regional:RegionalData;area_months:AreaMonth[];comparison_policy:string;stl:{status:string;reason:string}}
const monthIndex=(s:string)=>Number(s.slice(0,4))*12+Number(s.slice(5))-1
const monthLabel=(n:number)=>`${Math.floor(n/12)}-${String(n%12+1).padStart(2,'0')}`
const difference=(a:string|null,b:string|null)=>a===null||b===null?null:fixed(BigInt(b.replace('.',''))-BigInt(a.replace('.','')))
const fixed=(n:bigint)=>`${n<0n?'-':''}${(n<0n?-n:n)/1000000n}.${String((n<0n?-n:n)%1000000n).padStart(6,'0')}`
export function areaRows(data:DeliveryAreaData,area:string):AreaMonth[]{
  const members=area===CAVITE_ROLLUP?['CAVITE','LOWER CAVITE']:[area]
  const selected=data.area_months.filter(r=>members.includes(r.area))
  return [...new Set(selected.map(r=>r.period))].sort().map(period=>({area,...sumRegional(selected.filter(r=>r.period===period),selected[0].region,period)}))
}
/** Coverage is shown per source label, never ranked by unequal lifetime revenue. */
export function deliveryAreaOverview(data:DeliveryAreaData,year:string,baseYear:string,endMonth=12){
  return DELIVERY_AREAS.map(area=>{
    const rows=areaRows(data,area).filter(r=>r.net_sales_php!==null)
    let run=0,longest=0,previous=-2
    for(const row of rows){const current=monthIndex(row.period);run=current===previous+1?run+1:1;longest=Math.max(longest,run);previous=current}
    const selected=deliveryAreaView(data,[area],year,baseYear,endMonth)
    return {area,province:data.regional.mappings.find(m=>m.recorded_label===area)!.province,
      first:rows[0]?.period??null,latest:rows.at(-1)?.period??null,observed_months:rows.length,
      longest_contiguous_months:longest,stl_history_eligible:longest>=36,
      selected_observed_months:selected.common.length,selected_calendar_months:selected.calendar.length,
      own_matched_yoy_months:year==='history'?null:selected.matched.length}
  })
}
export function deliveryAreaCoverageCsv(data:DeliveryAreaData,year:string,baseYear:string,endMonth:number){
  return [['area','province','first_eligible_month','latest_eligible_month','observed_history_months','longest_contiguous_months','stl_history_eligible','selected_observed_months','selected_calendar_months','own_matched_yoy_months','display_year','base_year','through_month','dataset_id','mapping_sha256','monthly_sha256','source_completeness'],
    ...deliveryAreaOverview(data,year,baseYear,endMonth).map(r=>[r.area,r.province,r.first,r.latest,r.observed_months,r.longest_contiguous_months,r.stl_history_eligible,r.selected_observed_months,r.selected_calendar_months,r.own_matched_yoy_months,year,baseYear,endMonth,data.regional.source.dataset_id,data.regional.source.mapping_sha256,data.regional.source.current_monthly_sha256,'unknown'])]
}
export function validDeliveryAreaData(data:DeliveryAreaData){
  try{
    if(data.status!=='delivery_area_review_v1'||!validRegionalData(data.regional)||data.comparison_policy!=='common_observed_months_and_common_matched_yoy_v1')return false
    const seen=new Set<string>()
    for(const row of data.area_months){
      const key=row.area+'|'+row.period
      if(seen.has(key)||!/^\d{4}-(0[1-9]|1[0-2])$/.test(row.period))return false
      seen.add(key)
      const mapping=data.regional.mappings.find(m=>m.recorded_label===row.area)
      if(row.region!==(mapping?.region??'UNALLOCATED'))return false
      if(!Number.isSafeInteger(row.records)||row.records<1||row.net_eligible_records>row.records||row.margin_eligible_records>row.net_eligible_records)return false
    }
    for(const region of ['ALL','CALABARZON','MIMAROPA','BICOL','UNALLOCATED']){
      const actual=sumRegional(data.area_months.filter(r=>region==='ALL'||r.region===region))
      const expected=region==='ALL'?data.regional.company:data.regional.summaries.find(r=>r.region===region)!
      for(const key of ['records','net_eligible_records','margin_eligible_records','unreviewed_records','net_sales_php','gross_profit_php','margin_revenue_basis_php'] as const)if(actual[key]!==expected[key])return false
    }
    return DELIVERY_AREAS.every(area=>data.regional.mappings.some(m=>m.recorded_label===area))
  }catch{return false}
}
/** Both areas use the same observed period set; YoY also intersects both base years. */
export function deliveryAreaView(data:DeliveryAreaData,areas:string[],year:string,baseYear:string,endMonth=12){
  const rows=areas.map(area=>areaRows(data,area)),start=year==='history'?data.regional.source.calendar_start:year+'-01',end=year==='history'?data.regional.source.calendar_end:year+'-'+String(endMonth).padStart(2,'0')
  const calendar=Array.from({length:monthIndex(end)-monthIndex(start)+1},(_,i)=>monthLabel(monthIndex(start)+i))
  const common=calendar.filter(period=>rows.every(rs=>rs.some(r=>r.period===period&&r.net_sales_php!==null)))
  const matched=year==='history'?[]:common.filter(period=>rows.every(rs=>rs.some(r=>r.period===baseYear+period.slice(4)&&r.net_sales_php!==null)))
  return {year,baseYear,endMonth,calendar,common,matched,excluded:calendar.filter(p=>!common.includes(p)),excludedYoy:calendar.filter(p=>!matched.includes(p)),areas:areas.map((area,i)=>{
    const rs=rows[i],observed=rs.filter(r=>r.net_sales_php!==null),selected=rs.filter(r=>common.includes(r.period)),current=sumRegional(rs.filter(r=>matched.includes(r.period))),previous=sumRegional(rs.filter(r=>matched.some(p=>baseYear+p.slice(4)===r.period)))
    const summary=sumRegional(selected),change=difference(previous.net_sales_php,current.net_sales_php)
    return {area,summary,first:observed[0]?.period??null,latest:observed.at(-1)?.period??null,observed:observed.length,
      selectedObserved:rs.filter(r=>calendar.includes(r.period)&&r.net_sales_php!==null).length,
      margin_pct:summary.margin_revenue_basis_php!==null&&Number(summary.margin_revenue_basis_php)!==0?100*Number(summary.gross_profit_php)/Number(summary.margin_revenue_basis_php):null,
      financial_support_pct:summary.records?100*summary.margin_eligible_records/summary.records:null,
      current:current.net_sales_php,previous:previous.net_sales_php,change,
      growth_pct:change!==null&&Number(previous.net_sales_php)>0?100*Number(change)/Number(previous.net_sales_php):null,
      months:calendar.map(period=>{const row=rs.find(r=>r.period===period);return {period,row:row??null,status:!row?'no_source_records':row.net_sales_php===null?'no_eligible_net_sales':'observed'}})}
  })}
}
export function deliveryAreaCsv(data:DeliveryAreaData,view:ReturnType<typeof deliveryAreaView>){
  return [['area','period','status','included_common_period','included_matched_yoy','records','net_eligible_records','net_sales_php','supported_gross_profit_php','paired_margin_revenue_php','margin_eligible_records','dataset_id','fact_version','policy_version','mapping_sha256','monthly_sha256','financial_publication_approved','display_year','base_year','through_month','comparison_policy'],
    ...view.areas.flatMap(a=>a.months.map(m=>[a.area,m.period,m.status,view.common.includes(m.period),view.matched.includes(m.period),m.row?.records??null,m.row?.net_eligible_records??null,m.row?.net_sales_php??null,m.row?.gross_profit_php??null,m.row?.margin_revenue_basis_php??null,m.row?.margin_eligible_records??null,data.regional.source.dataset_id,data.regional.source.fact_version,data.regional.source.policy_version,data.regional.source.mapping_sha256,data.regional.source.current_monthly_sha256,false,view.year,view.baseYear,view.endMonth,data.comparison_policy]))]
}
