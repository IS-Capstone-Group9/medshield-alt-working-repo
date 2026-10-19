import { getSalesDiagnostics } from './diagnostics.service'
import type { DiagnosticScope, SalesDiagnostics } from '@/types/diagnostics.types'

const sectors = ['Government','Private','Internal','Unknown']
const money = (v: number | null) => v == null ? 'Unavailable' : v.toLocaleString('en-PH',{style:'currency',currency:'PHP',maximumFractionDigits:2})
const percent = (v: number | null | undefined) => v == null ? 'Unavailable' : v.toFixed(2)+'%'

export function installOverviewSectorComparison(root: HTMLElement): () => void {
  const page = root.querySelector('#page-overview')
  if (!page) return () => {}
  const section = document.createElement('section'); section.className='chart-card'; section.id='overviewSectorComparison'
  section.innerHTML='<h2 class="chart-title" id="overviewComparisonTitle">Which sector contributed most to the sales change?</h2><p id="overviewComparisonStatus" role="status" aria-live="polite">Loading comparable-period evidence…</p><p id="overviewComparisonFinding"></p><div class="overview-comparison-scroll" role="region" tabindex="0" aria-label="Scrollable sector comparison"><table id="overviewSectorContributionTable" class="product-table"></table></div><div class="diagnostic-controls"><button id="overviewContributionExport" type="button" class="btn btn-secondary" disabled>Export contribution CSV</button><button id="overviewContributionRetry" type="button" class="btn btn-secondary" hidden>Retry comparison</button></div><details class="chart-method" id="overviewComparisonNotes" hidden><summary>How this comparison works</summary><p id="overviewComparisonMethod"></p></details>'
  const style=document.createElement('style'); style.textContent='#overviewSectorControls{min-height:0;margin-bottom:20px}#overviewSectorControls .diagnostic-controls{display:flex;flex-wrap:wrap;gap:14px;align-items:end}#overviewSectorControls label{display:grid;gap:6px}#overviewSectorControls select{padding:8px;max-width:100%}#overviewSectorControls p,#overviewSectorComparison p{font-size:12px;line-height:1.6;margin:10px 0}#overviewSectorControls :focus-visible,#overviewSectorComparison :focus-visible{outline:2px solid #D97706;outline-offset:2px}#overviewSectorComparison{min-height:0;margin:20px 0}#overviewSectorComparison .overview-comparison-scroll{overflow:auto;max-width:100%}#overviewSectorContributionTable{width:100%;min-width:1050px;font-size:12px}#overviewSectorContributionTable th,#overviewSectorContributionTable td{padding:10px;text-align:right;white-space:nowrap}#overviewSectorContributionTable th:first-child,#overviewSectorContributionTable td:first-child{text-align:left}#overviewSectorContributionTable tfoot{font-weight:700}#overviewSectorComparison [hidden]{display:none!important}#overviewComparisonFinding{font-weight:700}#overviewTrendValues{min-width:850px}#overviewSectorScope{font-weight:700}'
  section.append(style)
  page.querySelector('#overviewBaselineChart')?.closest('.chart-card')?.after(section)
  const find=<T extends HTMLElement>(id:string)=>section.querySelector<T>('#'+id)!
  const table=find<HTMLTableElement>('overviewSectorContributionTable'), status=find('overviewComparisonStatus'), finding=find('overviewComparisonFinding'), method=find('overviewComparisonMethod')
  const exportButton=find<HTMLButtonElement>('overviewContributionExport'), retry=find<HTMLButtonElement>('overviewContributionRetry')
  let disposed=false, revision=0, current:DiagnosticScope|null=null, exportRows:Record<string,unknown>[]=[]
  const cache=new Map<string,SalesDiagnostics>(), pending=new Map<string,Promise<SalesDiagnostics>>()
  const render=async(scope:DiagnosticScope, force=false)=>{
    const request=++revision; current={...scope}; find('overviewComparisonNotes').hidden=true; exportRows=[]; exportButton.disabled=true; table.replaceChildren(); finding.textContent=''; method.textContent=''; retry.hidden=true
    const year=Number(scope.end_date.slice(0,4)), selected=scope.sector||'All'
    find('overviewComparisonTitle').textContent=`Which sector contributed most to the ${year} sales change?`
    status.textContent=`Loading ${selected}: ${scope.start_date} – ${scope.end_date} versus the same dates in ${year-1}…`
    const allScope={...scope,sector:'All'}, key=JSON.stringify({...allScope,label:undefined})
    try {
      if(force)cache.delete(key)
      let data=cache.get(key)
      if(!data){
        let work=pending.get(key)
        if(!work){work=getSalesDiagnostics(allScope);pending.set(key,work);void work.finally(()=>pending.delete(key)).catch(()=>undefined)}
        data=await work; cache.set(key,data)
      }
      if(disposed||request!==revision)return
      if(scope.expected_release&&!Object.keys(scope.expected_release).every(k=>JSON.stringify(scope.expected_release![k])===JSON.stringify(data!.release[k])))throw new Error('The source release changed. Refresh before comparing.')
      const rows=data.contributions.sector
      for(const field of ['current','prior','delta'] as const){
        const expected=data.totals[field]
        if(expected!=null&&Math.abs(rows.reduce((sum,row)=>sum+(row[field]??0),0)-expected)>.02)throw new Error('Sector amounts do not reconcile. Comparison withheld.')
      }
      const included=sectors
      const header=table.createTHead().insertRow()
      for(const label of ['Sector',`${year-1} net sales`,`${year} net sales`,'Peso change','Share of All change',`${year-1} gross margin`,`${year} gross margin`]){const th=document.createElement('th');th.scope='col';th.textContent=label;header.append(th)}
      const body=table.createTBody()
      for(const name of included){
        const row=rows.find(r=>r.key===name), available=data.totals.delta!=null
        const prior=row?.prior??(available?0:null), now=row?.current??(available?0:null), delta=row?.delta??(available?0:null)
        const absence=!available?'No matched company periods; unavailable':!row?'No eligible records; accounting absence':row.current_financial.rows===0||row.prior_financial.rows===0?'Group absent on one side; accounting zero':'Recorded group'
        const tr=body.insertRow(); tr.dataset.sector=name
        if(name===selected){tr.style.backgroundColor='var(--accent-light, #eef5fa)';tr.setAttribute('aria-label',name+' · selected sector')}
        const original=row?.current_financial.original_source_rows??0, adjusted=row?.current_financial.adjusted_estimated_rows??0
        const contribution=row?.contribution_pct??(data.totals.delta?0:null)
        const identity=tr.insertCell()
        const inspect=document.createElement('button');inspect.type='button';inspect.className='btn btn-secondary';inspect.textContent='Inspect '+name;inspect.disabled=!row
        inspect.onclick=()=>window.dispatchEvent(new CustomEvent('medshield:diagnostic-open',{detail:{...scope,sector:name,label:name+' contribution investigation'}}));identity.append(inspect)
        const note=document.createElement('small');note.style.cssText='display:block;white-space:normal;font-size:10px;max-width:180px;margin-top:5px';note.textContent=`${original} original / ${adjusted} adjusted rows. ${absence}.`;identity.append(note)
        for(const value of [money(prior),money(now),money(delta),percent(contribution),percent(row?.prior_financial.margin_pct),percent(row?.current_financial.margin_pct)])tr.insertCell().textContent=value
        exportRows.push({sector:name,prior_start:data.scope.prior_start_date,prior_end:data.scope.prior_end_date,current_start:scope.start_date,current_end:scope.end_date,prior_sales:prior,current_sales:now,peso_change:delta,contribution_pct:contribution,prior_gross_margin_pct:row?.prior_financial.margin_pct??null,current_gross_margin_pct:row?.current_financial.margin_pct??null,prior_gross_profit:row?.prior_financial.income??null,current_gross_profit:row?.current_financial.income??null,prior_margin_revenue_basis:row?.prior_financial.margin_revenue_basis??null,current_margin_revenue_basis:row?.current_financial.margin_revenue_basis??null,current_original_source_rows:original,current_adjusted_source_rows:adjusted,observation_status:absence,matched_company_months:data.totals.matched_months,expected_months:data.totals.expected_months,buyer_mapping_status:'proposed_review_pending',dataset_id:data.release.dataset_id,fact_version:data.release.fact_delta_version,policy_version:data.release.policy_version})
      }
      const footer=table.createTFoot().insertRow()
      for(const value of [selected==='All'?'All sectors':'All sectors · reference',money(data.totals.prior),money(data.totals.current),money(data.totals.delta),data.totals.delta?'100.00%':'Unavailable',percent(data.totals.prior_financial.margin_pct),percent(data.totals.current_financial.margin_pct)])footer.insertCell().textContent=value
      const leader=[...rows].filter(r=>r.delta!=null).sort((a,b)=>(b.delta??0)-(a.delta??0))[0]
      finding.textContent=leader&&data.totals.delta!=null?`${leader.label} contributed the largest signed increase: ${money(leader.delta)} (${percent(leader.contribution_pct)} of the All-sector change of ${money(data.totals.delta)}).`:'No comparable recorded change is available.'
      status.textContent=`${selected} · selected detail; table includes All sectors · ${scope.start_date} – ${scope.end_date} vs ${data.scope.prior_start_date} – ${data.scope.prior_end_date} · ${data.totals.matched_months}/${data.totals.expected_months} matched company months. Candidate; mapping review pending.`
      method.textContent='Comparison uses common company month pairs before sector grouping, preserving signed offsets. A missing company month is excluded from both years. An absent sector within matched company periods is an accounting zero, not observed zero demand. Gross margin uses matching eligible profit/revenue; its eligible basis can cover less than total sales and can differ between years. Review the basis in the trend table/CSV before interpreting margin changes. Source row counts refer to the current comparison year. Inspect a sector, then months → products → raw area labels; original/adjusted evidence stays separate. Raw area labels and client-reference candidates do not establish transaction-to-account linkage or a proven cause.'
      find('overviewComparisonNotes').hidden=false
      exportButton.disabled=!exportRows.length
    }catch(error){if(disposed||request!==revision)return;status.textContent=error instanceof Error?error.message:'Comparable evidence unavailable';table.replaceChildren();finding.textContent='';exportRows=[];exportButton.disabled=true;retry.hidden=false}
  }
  const onScope=(event:Event)=>{const scope=(event as CustomEvent<DiagnosticScope>).detail;if(JSON.stringify(scope)!==JSON.stringify(current))void render(scope)}
  window.addEventListener('medshield:overview-scope',onScope)
  retry.onclick=()=>{if(current)void render(current,true)}
  exportButton.onclick=()=>{
    if(!exportRows.length)return
    const keys=Object.keys(exportRows[0]),cell=(v:unknown)=>'"'+String(v??'').replace(/"/g,'""')+'"'
    const csv=[keys,...exportRows.map(row=>keys.map(k=>row[k]))].map(row=>row.map(cell).join(',')).join('\r\n')
    const url=URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download='medshield-sector-contribution-All.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)
  }
  return()=>{disposed=true;revision++;window.removeEventListener('medshield:overview-scope',onScope);section.remove()}
}
