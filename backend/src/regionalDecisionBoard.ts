import assert from 'node:assert/strict'
import {readRegionalReview, microsText, REGIONAL_BINDING} from './regionalSalesReview'
import {readRegionalStl, regionalStrengthSummary, REGIONAL_STL_BINDING} from './regionalStlReview'
import {decimalMicros} from './itemizedPreview'
import {ITEMIZED_PREVIEW_BINDING} from './itemizedPreviewBinding'
import {readRegionalProductPriority, PRIORITY_POLICY, type RegionalProductPriority} from './regionalProductPriority'

type FinancialReview = Awaited<ReturnType<typeof readRegionalReview>>
type StlReview = Awaited<ReturnType<typeof readRegionalStl>>
export const BOARD_REGIONS = ['CALABARZON', 'MIMAROPA', 'BICOL'] as const
export const BOARD_DOMAINS = ['sales_and_seasonality', 'product_priority', 'unit_forecast',
  'historical_external_signal', 'planning_scenario', 'account_recommendation'] as const
type Region = typeof BOARD_REGIONS[number]
type Domain = typeof BOARD_DOMAINS[number]
type BoardRow = {
  region:Region; domain:Domain; label:string; status:'available'|'partial'|'unavailable'; period:string;
  findings:string; reason:string; next_check:string; evidence_label:'Derived';
  matched_months:string[]; base_net_sales_php:string|null; target_net_sales_php:string|null;
  matched_yoy_pct:number|null; target_margin_pct:number|null;
  stl_segments:{start:string;end:string;months:number;trend_strength:number|null;seasonal_strength:number|null}[];
}
const POPULATION = 'Recorded itemized deliveries; contracts excluded; all buyers; confirmed delivery labels only'
export const BOARD_CSV_COLUMNS = ['Region','Review domain','Status','Period','Findings','Evidence','Reason',
  'Next check','Population','Dataset','Policy','Mapping SHA-256','Official bulletin',
  'Board contract','Product priority policy','Product priority query SHA-256','Product priority aggregate SHA-256'] as const

export type RegionalDecisionBoard = {
  schema_version:'regional_decision_board_v2'; status:'candidate_regional_review';
  source:FinancialReview['source']; population:string; comparison:{base_year:number;target_year:number};
  official_bulletin:{status:'OFFICIAL_LIVE_BULLETIN_UNAVAILABLE';available:false;official_alert:false};
  rows:BoardRow[]; columns:string[]; records:string[][]; evidence_label:'Derived'; assumption_ids:['D4'];
  financial_publication_approved:false; forecast_approved:false; external_join_approved:false;
  procurement_execution_approved:false; limitations:string[];
  product_priority:RegionalProductPriority|null;
}

/** Compose only existing validated Gold contracts; missing domains have no adapter or analytical fallback. */
export function buildRegionalDecisionBoard(financial:FinancialReview, stl:StlReview,priority:RegionalProductPriority|null=null):RegionalDecisionBoard {
  assert.equal(financial.status,'user_confirmed_regional_financial_review')
  assert.equal(stl.status,'regional_stl_review')
  assert.deepEqual(financial.source,stl.source)
  assert.equal(financial.source.dataset_id,ITEMIZED_PREVIEW_BINDING.datasetId)
  assert.equal(financial.source.policy_version,ITEMIZED_PREVIEW_BINDING.policy)
  assert.equal(financial.source.fact_table,ITEMIZED_PREVIEW_BINDING.itemizedTable)
  assert.equal(financial.source.fact_version,0)
  assert.equal(financial.source.mapping_sha256,REGIONAL_BINDING.mappingSha256)
  assert.equal(financial.source.current_monthly_sha256,REGIONAL_BINDING.monthlySha256)
  assert.equal(stl.artifact_sha256,REGIONAL_STL_BINDING.artifactSha256)
  assert.equal(financial.scope.contracts_excluded,true)
  for (const flag of ['financial_publication_approved','forecast_approved','external_join_approved'] as const) {
    assert.equal(financial.scope[flag],false); assert.equal(stl[flag],false)
  }
  const targetYear=Number(financial.source.calendar_end.slice(0,4)),baseYear=targetYear-1
  assert.ok(Number.isSafeInteger(targetYear)&&targetYear>=2017)
  if(priority){
    assert.deepEqual(priority.source,financial.source);assert.equal(priority.policy,PRIORITY_POLICY)
    assert.equal(priority.base_year,baseYear);assert.equal(priority.target_year,targetYear)
  }
  const strengths=regionalStrengthSummary(stl.series)
  const rows:BoardRow[]=[]
  const sum=(months:FinancialReview['months'],field:'net_sales_php'|'gross_profit_php'|'margin_revenue_basis_php')=>{
    const eligible=months.filter(m=>m[field]!==null)
    return eligible.length?microsText(eligible.reduce((total,m)=>total+decimalMicros(m[field]!),0n)):null
  }
  const definitions:{domain:Domain;label:string;reason:string;next:string}[]=[
    {domain:'product_priority',label:'Recorded product sales priorities',reason:'Validated regional product detail is unavailable or inconsistent; no partial or substitute ranking is used.',next:'Reload the review; Sales/source owner checks source records and comparable labels before interpreting sales priority.'},
    {domain:'unit_forecast',label:'Regional unit forecast',reason:'No accepted regional presentation-scoped unit forecast is connected; company PHP and channel pilots cannot supply it.',next:'Model owner binds reviewed region, presentation, origin and lead-specific release.'},
    {domain:'historical_external_signal',label:'Historical external signal',reason:'No reviewed regional therapeutic/provider signal contract is connected. Weather proxies are not official alerts.',next:'Analyst verifies D3/provider/as-of joins and historical event evidence.'},
    {domain:'planning_scenario',label:'Entered planning scenario',reason:'No complete user-entered scenario is supplied to this review. Sales or research outputs never populate blank operating inputs.',next:'Open Prescriptive Planning and explicitly enter demand, stock, costs, lead time and expiry assumptions.'},
    {domain:'account_recommendation',label:'Account recommendations',reason:'No reviewed D2 account linkage and source-compatible recommendation contract is connected.',next:'Source owner verifies account linkage; analyst evaluates recommendations before any integration.'},
  ]
  for(const region of BOARD_REGIONS){
    const months=financial.months.filter(m=>m.region===region&&m.net_sales_php!==null)
    const base=new Map(months.filter(m=>m.period.startsWith(baseYear+'-')).map(m=>[m.period.slice(5),m]))
    const target=new Map(months.filter(m=>m.period.startsWith(targetYear+'-')).map(m=>[m.period.slice(5),m]))
    const common=[...target.keys()].filter(month=>base.has(month)).sort()
    const baseNet=sum(common.map(m=>base.get(m)!),'net_sales_php')
    const targetNet=sum(common.map(m=>target.get(m)!),'net_sales_php')
    const paired=common.map(m=>target.get(m)!).filter(m=>m.gross_profit_php!==null&&m.margin_revenue_basis_php!==null)
    const margin=sum(paired,'gross_profit_php'),marginBasis=sum(paired,'margin_revenue_basis_php')
    const yoy=baseNet!==null&&targetNet!==null&&decimalMicros(baseNet)!==0n?
      100*Number(decimalMicros(targetNet)-decimalMicros(baseNet))/Number(decimalMicros(baseNet)):null
    const marginPct=margin!==null&&marginBasis!==null&&decimalMicros(marginBasis)!==0n?
      100*Number(decimalMicros(margin))/Number(decimalMicros(marginBasis)):null
    const segments=strengths.filter(s=>s.region===region).map(s=>({start:s.start,end:s.end,months:s.months,
      trend_strength:s.trend_strength,seasonal_strength:s.seasonal_strength}))
    const finding=[common.length?`${baseYear} matched net PHP ${baseNet}; ${targetYear} matched net PHP ${targetNet}; YoY ${yoy===null?'unavailable':yoy.toFixed(6)+'%'}; paired target margin ${marginPct===null?'unavailable':marginPct.toFixed(6)+'%'}.`:'Matched-year finances unavailable: no common eligible regional months.',
      ...segments.map(s=>`STL ${s.start}–${s.end} (${s.months} months): trend strength ${s.trend_strength===null?'unavailable':s.trend_strength.toFixed(6)}, seasonal strength ${s.seasonal_strength===null?'unavailable':s.seasonal_strength.toFixed(6)}.`)]
    if(!segments.length)finding.push('STL unavailable: no qualifying retained contiguous fitted segment.')
    const reason=[!common.length?'Missing regional observations remain unavailable, never zero.':baseNet!==null&&decimalMicros(baseNet)===0n?'Zero matched baseline: YoY rate unavailable.':'',
      !segments.length?'Insufficient qualifying contiguous history for retained STL.':'',
      'Full-segment STL is retrospective, not an origin-safe forecast feature.'].filter(Boolean).join(' ')
    const period=`${baseYear} vs ${targetYear}; common months ${common.join(', ')||'none'}`
    rows.push({region,domain:'sales_and_seasonality',label:'Matched sales and historical seasonality',
      status:common.length&&segments.length?'available':common.length||segments.length?'partial':'unavailable',
      period,findings:finding.join(' '),reason,next_check:'Review Territory baseline and retained monthly coverage; source completeness remains unknown.',
      evidence_label:'Derived',matched_months:common,base_net_sales_php:baseNet,target_net_sales_php:targetNet,
      matched_yoy_pct:yoy,target_margin_pct:marginPct,stl_segments:segments})
    for(const definition of definitions){
      const p=definition.domain==='product_priority'?priority?.regions.find(p=>p.region===region):null
      if(p){
        assert.deepEqual(p.matched_months,common)
        assert.equal(p.base_net_sales_php,baseNet);assert.equal(p.target_net_sales_php,targetNet)
        const findings=p.top_products.map((product,index)=>`${index+1}. ${product.product}: target PHP ${product.target_net_sales_php}; prior ${product.base_net_sales_php??'unavailable'}; change ${product.change_php??'unavailable'}; eligible records ${product.target_records}/${product.base_records}; observed target/prior months ${product.target_observed_months}/${product.base_observed_months}.`).join(' ')
        rows.push({region,domain:'product_priority',label:'Recorded product sales priorities',status:p.status,
          period,findings:p.status==='available'?findings:'Unavailable: no matched regional months with positive product net sales.',
          reason:`Signed current product totals reconcile to regional net. Positive product net PHP ${p.positive_product_net_sales_php??'unavailable'}; nonpositive product net PHP ${p.nonpositive_product_net_sales_php??'unavailable'}. Unreviewed-export records in matched target/prior windows: ${p.target_unreviewed_records??'unavailable'}/${p.base_unreviewed_records??'unavailable'}. Source labels are not verified medicine identities, units, clinical urgency or inventory needs. Missing product periods are not zero demand.`,
          next_check:'Sales/source owner: inspect recorded labels, cost support and comparable history; verify unit, stock and supplier facts before considering purchase.',
          evidence_label:'Derived',matched_months:common,base_net_sales_php:baseNet,target_net_sales_php:targetNet,matched_yoy_pct:null,target_margin_pct:null,stl_segments:[]})
        continue
      }
      rows.push({region,domain:definition.domain,label:definition.label,status:'unavailable',
      period:`No accepted input for ${targetYear} review`,findings:'Unavailable',reason:definition.reason,next_check:definition.next,
      evidence_label:'Derived',matched_months:[],base_net_sales_php:null,target_net_sales_php:null,
      matched_yoy_pct:null,target_margin_pct:null,stl_segments:[]})
    }
  }
  const records=rows.map(row=>[row.region,row.label,row.status,row.period,row.findings,row.evidence_label,row.reason,
    row.next_check,POPULATION,financial.source.dataset_id,financial.source.policy_version,financial.source.mapping_sha256,
    'OFFICIAL_LIVE_BULLETIN_UNAVAILABLE','regional_decision_board_v2',priority?.policy??'unavailable',priority?.query_sha256??'unavailable',priority?.aggregate_sha256??'unavailable'])
  return {schema_version:'regional_decision_board_v2',status:'candidate_regional_review',source:{...financial.source},product_priority:priority,
    population:POPULATION,comparison:{base_year:baseYear,target_year:targetYear},rows,columns:[...BOARD_CSV_COLUMNS],records,
    evidence_label:'Derived',assumption_ids:['D4'],official_bulletin:{status:'OFFICIAL_LIVE_BULLETIN_UNAVAILABLE',available:false,official_alert:false},
    financial_publication_approved:false,forecast_approved:false,external_join_approved:false,procurement_execution_approved:false,
    limitations:['Source-validated Gold financial/STL and reconciled recorded-product sales priorities are supported; optional detail failure remains unavailable.',
      'Region-specific matched months can differ; do not sum comparisons into a company result.',
      'Missing domain inputs remain unavailable; no company PHP, proxy, offline result or planning default is substituted.',
      'Research review is not publication, procurement execution or proof of operational benefit.']}
}

export async function readRegionalDecisionBoard(
  financialReader:()=>Promise<FinancialReview>=()=>readRegionalReview(),
  stlReader:(current:FinancialReview)=>Promise<StlReview>=current=>readRegionalStl(undefined,async()=>current),
  priorityReader:(current:FinancialReview)=>Promise<RegionalProductPriority|null>=current=>readRegionalProductPriority(current),
):Promise<RegionalDecisionBoard>{
  const financial=await financialReader()
  const stl=await stlReader(financial)
  let priority:RegionalProductPriority|null=null
  try{priority=await priorityReader(financial)}catch{/* Optional domain fails closed; no local or partial ranking substitutes. */}
  return buildRegionalDecisionBoard(financial,stl,priority)
}
