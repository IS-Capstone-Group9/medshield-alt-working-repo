import {readRegionalReview,microsText,type RegionalMonth} from './regionalSalesReview'
import {decimalMicros} from './itemizedPreview'
import {monthIndex,monthLabel} from './forecastEvidence'

function financialSummary(rows:RegionalMonth[]){
  const sum=(key:'net_sales_php'|'gross_profit_php'|'margin_revenue_basis_php')=>{const values=rows.filter(r=>r[key]!==null);return values.length?microsText(values.reduce((n,r)=>n+decimalMicros(r[key]!),0n)):null}
  const net=sum('net_sales_php'),profit=sum('gross_profit_php'),basis=sum('margin_revenue_basis_php')
  const records=rows.reduce((n,r)=>n+r.records,0),supported=rows.reduce((n,r)=>n+r.margin_eligible_records,0)
  return {records,net_eligible_records:rows.reduce((n,r)=>n+r.net_eligible_records,0),margin_eligible_records:supported,
    net_sales_php:net,gross_profit_php:profit,margin_revenue_basis_php:basis,
    gross_margin_pct:basis!==null&&decimalMicros(basis)!==0n?100*Number(profit)/Number(basis):null,
    financial_support_record_pct:records?100*supported/records:null}
}

/** Area rows are retained during the same validated read as company/region controls. */
export async function readDeliveryAreaReview(reader=readRegionalReview) {
  const regional=await reader()
  const calendar=Array.from({length:monthIndex(regional.source.calendar_end)-monthIndex(regional.source.calendar_start)+1},(_,i)=>monthLabel(monthIndex(regional.source.calendar_start)+i))
  const members=regional.mappings.map((m:{recorded_label:string})=>({area:m.recorded_label,members:[m.recorded_label]})).concat([{area:'CAVITE PROVINCE',members:['CAVITE','LOWER CAVITE']}])
  const coverage=members.map(({area,members}:{area:string;members:string[]})=>{
    const rows=regional.area_months.filter(r=>members.includes(r.area)),observed=[...new Set(rows.filter(r=>r.net_sales_php!==null).map(r=>r.period))].sort()
    return {area,members,first_observed:observed[0]??null,latest_observed:observed.at(-1)??null,observed_months:observed.length,
      missing_or_ineligible_months:calendar.filter(p=>!observed.includes(p)),summary:financialSummary(rows)}
  })
  const studyAreas=['QUEZON','BATANGAS'],targetMonths=Array.from({length:9},(_,i)=>'2026-'+String(i+1).padStart(2,'0'))
  const matched=targetMonths.filter(p=>studyAreas.every(area=>[p,'2025'+p.slice(4)].every(period=>regional.area_months.some(r=>r.area===area&&r.period===period&&r.net_sales_php!==null))))
  const study_comparison={base_year:2025,target_year:2026,requested_months:targetMonths,common_matched_months:matched,excluded_months:targetMonths.filter(p=>!matched.includes(p)),
    areas:studyAreas.map(area=>({area,base:financialSummary(regional.area_months.filter(r=>r.area===area&&matched.some(p=>'2025'+p.slice(4)===r.period))),target:financialSummary(regional.area_months.filter(r=>r.area===area&&matched.includes(r.period)))}))}
  return {status:'delivery_area_review_v1',regional,area_months:regional.area_months,
    coverage,study_comparison,
    comparison_policy:'common_observed_months_and_common_matched_yoy_v1',
    rollup:{label:'CAVITE PROVINCE',members:['CAVITE','LOWER CAVITE'],additive_to_source_labels:false},
    stl:{status:'separate_warehouse_candidate',reason:'Load /api/sales/delivery-area-stl for separately verified historical area components; regional components are not area results.'}}
}
