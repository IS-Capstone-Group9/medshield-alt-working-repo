import { getSalesDiagnostics } from './diagnostics.service'
import type { DiagnosticScope, SalesDiagnostics } from '@/types/diagnostics.types'

const sectors = ['Government','Private','Internal']
const money = (v: number | null) => v == null ? 'Unavailable' : v.toLocaleString('en-PH',{style:'currency',currency:'PHP',maximumFractionDigits:2})
const percent = (v: number | null | undefined) => v == null ? 'Unavailable' : v.toFixed(2)+'%'
const compactMoney = (value: number) => `${value < 0 ? '−' : value > 0 ? '+' : ''}₱${Math.abs(value).toLocaleString('en-PH', {notation:'compact',maximumFractionDigits:2})}`

// Every sector shares the same peso scale and zero position, including offsets.
function renderContributionChart(container: HTMLElement, data: SalesDiagnostics, selected: string, inspect: (name: string) => void) {
  const rows = data.contributions.sector
  const available = data.totals.delta != null
  container.hidden = !available
  if (!available) return
  const values = sectors.map(name => ({name, row: rows.find(row => row.key === name)}))
  const negative = Math.max(0, ...values.map(({row}) => -(row?.delta ?? 0)))
  const positive = Math.max(0, ...values.map(({row}) => row?.delta ?? 0))
  const span = negative + positive || 1
  const zero = span === 1 && !negative && !positive ? 50 : negative / span * 100
  const summary = document.createElement('div'); summary.className = 'contribution-summary'
  const total = document.createElement('div'); total.className = 'contribution-total'
  const caption = document.createElement('span'); caption.textContent = 'NET SALES CHANGE · ALL SECTORS'
  const amount = document.createElement('strong'); amount.textContent = compactMoney(data.totals.delta!)
  const comparison = document.createElement('span'); comparison.textContent = `${money(data.totals.prior)} → ${money(data.totals.current)}`
  total.append(caption, amount, comparison)
  const explanation = document.createElement('div'); explanation.className = 'contribution-explanation'
  const title = document.createElement('h3'); title.textContent = 'What added to or reduced the change?'
  const hint = document.createElement('p'); hint.textContent = 'Left of zero: decrease · Right of zero: increase. Select a sector to investigate.'
  explanation.append(title, hint); summary.append(total, explanation); container.append(summary)
  const chart = document.createElement('div'); chart.className = 'contribution-chart'; chart.setAttribute('role', 'group'); chart.setAttribute('aria-label', 'Sector contributions to net sales change, in Philippine pesos')
  for (const {name, row} of values) {
    const delta = row?.delta ?? 0
    const item = document.createElement('button'); item.type = 'button'; item.className = 'contribution-row'; item.dataset.sector = name; item.dataset.direction = delta > 0 ? 'increase' : delta < 0 ? 'decrease' : 'zero'
    item.disabled = !row || row.delta == null
    if (name === selected) item.setAttribute('aria-current', 'true')
    const label = document.createElement('span'); label.className = 'contribution-sector'; label.textContent = name
    const track = document.createElement('span'); track.className = 'contribution-track'; track.setAttribute('aria-hidden','true'); track.style.setProperty('--zero', `${zero}%`)
    const bar = document.createElement('span'); bar.className = 'contribution-bar'; bar.style.left = `${delta < 0 ? zero - Math.abs(delta) / span * 100 : zero}%`; bar.style.width = `${Math.abs(delta) / span * 100}%`; track.append(bar)
    const value = document.createElement('span'); value.className = 'contribution-value'; value.textContent = row && row.delta == null ? 'Unavailable' : compactMoney(delta)
    const share = document.createElement('small'); share.textContent = !row ? 'No eligible records' : `${percent(row.contribution_pct)} of net change`; value.append(share)
    item.title = `${name}: ${row?.delta == null && row ? 'Unavailable' : money(delta)}. ${!row ? 'Accounting absence; no eligible records.' : 'Inspect contribution.'}`
    item.onclick = () => inspect(name); item.append(label, track, value); chart.append(item)
  }
  const axis = document.createElement('div'); axis.className = 'contribution-axis'
  const scale = document.createElement('div'); scale.className = 'contribution-scale'
  const zeroLabel = document.createElement('span'); zeroLabel.textContent = '₱0'; zeroLabel.style.left = `${zero}%`; scale.append(zeroLabel); axis.append(scale); chart.append(axis)
  container.append(chart)
  const note = document.createElement('p'); note.className = 'contribution-offset-note'; note.textContent = 'Shares use the signed net change, so they can exceed 100% or be negative when sectors offset one another. No eligible records means accounting absence, not zero demand.'; container.append(note)
}

export function installOverviewSectorComparison(root: HTMLElement): () => void {
  const page = root.querySelector('#page-overview')
  if (!page) return () => {}
  const section = document.createElement('section'); section.className='chart-card'; section.id='overviewSectorComparison'
  section.innerHTML='<h2 class="chart-title" id="overviewComparisonTitle">Which sector contributed most to the sales change?</h2><p id="overviewComparisonStatus" role="status" aria-live="polite">Loading comparable-period evidence…</p><p id="overviewComparisonFinding"></p><div id="overviewContributionVisual" hidden></div><details id="overviewContributionDetails"><summary>View sales, margins and source details</summary><div class="overview-comparison-scroll" role="region" tabindex="0" aria-label="Scrollable sector comparison"><table id="overviewSectorContributionTable" class="product-table"></table></div></details><div class="diagnostic-controls"><button id="overviewContributionExport" type="button" class="btn btn-secondary" disabled>Export contribution CSV</button><button id="overviewContributionRetry" type="button" class="btn btn-secondary" hidden>Retry comparison</button></div><details class="chart-method" id="overviewComparisonNotes" hidden><summary>How this comparison works</summary><p id="overviewComparisonMethod"></p></details>'
  const style=document.createElement('style'); style.textContent='#overviewSectorControls{min-height:0;margin-bottom:20px}#overviewSectorControls .diagnostic-controls{display:flex;flex-wrap:wrap;gap:14px;align-items:end}#overviewSectorControls label{display:grid;gap:6px}#overviewSectorControls select{padding:8px;max-width:100%}#overviewSectorControls p,#overviewSectorComparison p{font-size:12px;line-height:1.6;margin:10px 0}#overviewSectorControls :focus-visible,#overviewSectorComparison :focus-visible{outline:2px solid #D97706;outline-offset:2px}#overviewSectorComparison{min-height:0;margin:20px 0}#overviewSectorComparison .overview-comparison-scroll{overflow:auto;max-width:100%}#overviewSectorContributionTable{width:100%;min-width:1050px;font-size:12px}#overviewSectorContributionTable th,#overviewSectorContributionTable td{padding:10px;text-align:right;white-space:nowrap}#overviewSectorContributionTable th:first-child,#overviewSectorContributionTable td:first-child{text-align:left}#overviewSectorContributionTable tfoot{font-weight:700}#overviewSectorComparison [hidden]{display:none!important}#overviewComparisonFinding{font-weight:700}#overviewTrendValues{min-width:850px}#overviewSectorScope{font-weight:700}'
  style.textContent += `
#overviewSectorComparison .contribution-summary{display:grid;grid-template-columns:minmax(220px,1fr) 2fr;gap:28px;align-items:center;margin:20px 0 24px}
#overviewSectorComparison .contribution-total{display:grid;gap:7px;padding:16px 20px;background:var(--bg-secondary,#f1f5f9);border-left:3px solid var(--accent,#176b83);border-radius:4px}
#overviewSectorComparison .contribution-total>span:first-child{font-size:10px;font-weight:700;letter-spacing:.08em}
#overviewSectorComparison .contribution-total>strong{font-size:30px;line-height:1.2;font-variant-numeric:tabular-nums}
#overviewSectorComparison .contribution-total>span:last-child{font-size:11px}
#overviewSectorComparison .contribution-explanation h3{font-size:14px;margin:0}
#overviewSectorComparison .contribution-explanation p{color:var(--text-secondary,#526477);margin:6px 0}
#overviewSectorComparison .contribution-row{display:grid;grid-template-columns:112px minmax(40px,1fr) 155px;gap:20px;align-items:center;width:100%;padding:14px 12px;border:1px solid transparent;border-radius:6px;background:transparent;color:inherit;text-align:left;cursor:pointer;font:inherit}
#overviewSectorComparison .contribution-row:hover:not(:disabled){background:var(--bg-secondary,#f1f5f9)}
#overviewSectorComparison .contribution-row[aria-current]{border-color:var(--border-color,#bfd2df);background:var(--accent-light,#eef5fa)}
#overviewSectorComparison .contribution-row:disabled{cursor:default;opacity:1}
#overviewSectorComparison .contribution-sector{font-size:12px;font-weight:600}
#overviewSectorComparison .contribution-track{position:relative;display:block;height:26px;background:var(--bg-secondary,#f1f5f9);border-radius:3px}
#overviewSectorComparison .contribution-track:after{content:"";position:absolute;left:var(--zero);top:-7px;bottom:-7px;border-left:1px solid var(--text-secondary,#64748b)}
#overviewSectorComparison .contribution-bar{position:absolute;top:0;height:100%;background:#157568;border-radius:3px}
#overviewSectorComparison [data-direction=decrease] .contribution-bar{background:#bd5b44}
#overviewSectorComparison .contribution-value{text-align:right;font-size:15px;font-weight:700;font-variant-numeric:tabular-nums}
#overviewSectorComparison .contribution-value small{display:block;font-size:10px;font-weight:400;margin-top:4px;color:var(--text-secondary,#526477)}
#overviewSectorComparison .contribution-axis{display:grid;grid-template-columns:112px minmax(40px,1fr) 155px;gap:20px;padding:0 12px;margin:4px 0 20px}
#overviewSectorComparison .contribution-scale{grid-column:2;position:relative;height:15px}
#overviewSectorComparison .contribution-scale span{position:absolute;transform:translateX(-50%);font-size:10px}
#overviewSectorComparison .contribution-offset-note{color:var(--text-secondary,#526477);max-width:900px}
#overviewContributionDetails{border-top:1px solid var(--border-color,#dce6ed);padding:14px 0;margin-top:16px}
#overviewContributionDetails>summary{font-size:12px;font-weight:600;cursor:pointer}
#overviewSectorComparison .diagnostic-controls{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0}
@media(max-width:600px){#overviewSectorComparison .contribution-summary{grid-template-columns:1fr;gap:16px}#overviewSectorComparison .contribution-row{grid-template-columns:85px minmax(30px,1fr) 95px;gap:8px;padding:12px 4px}#overviewSectorComparison .contribution-axis{grid-template-columns:85px minmax(30px,1fr) 95px;gap:8px;padding:0 4px}#overviewSectorComparison .contribution-value{font-size:12px}#overviewSectorComparison .contribution-sector{font-size:11px}#overviewSectorComparison .contribution-value small{font-size:9px}}
`
  section.append(style)
  const evidence = document.createElement('details')
  evidence.id = 'overviewSectorDetails'
  evidence.className = 'dashboard-supporting-evidence'
  evidence.setAttribute('name', 'overview-sales-evidence')
  const summary = document.createElement('summary')
  summary.textContent = 'Sales change by buyer sector'
  evidence.append(summary, section)
  page.append(evidence)
  const find=<T extends HTMLElement>(id:string)=>section.querySelector<T>('#'+id)!
  const table=find<HTMLTableElement>('overviewSectorContributionTable'), status=find('overviewComparisonStatus'), finding=find('overviewComparisonFinding'), method=find('overviewComparisonMethod')
  const exportButton=find<HTMLButtonElement>('overviewContributionExport'), retry=find<HTMLButtonElement>('overviewContributionRetry')
  let disposed=false, revision=0, current:DiagnosticScope|null=null, exportRows:Record<string,unknown>[]=[]
  const controllers=new Map<string,AbortController>()
  const cache=new Map<string,SalesDiagnostics>(), pending=new Map<string,Promise<SalesDiagnostics>>()
  const render=async(scope:DiagnosticScope, force=false)=>{
    const request=++revision; current={...scope}; find('overviewComparisonNotes').hidden=true; exportRows=[]; exportButton.disabled=true; table.replaceChildren(); find('overviewContributionVisual').replaceChildren(); find('overviewContributionVisual').hidden=true; finding.textContent=''; method.textContent=''; retry.hidden=true
    const year=Number(scope.end_date.slice(0,4)), selected=scope.sector||'All'
    const spansYears=scope.start_date.slice(0,4)!==scope.end_date.slice(0,4)
    find('overviewComparisonTitle').textContent='Itemized sales · '+(spansYears?'Which sector contributed most to the selected-period change?':`Which sector contributed most to the ${year} change?`)
    status.textContent=`Loading ${selected}: ${scope.start_date} – ${scope.end_date} versus the same dates one year earlier…`
    const allScope={...scope,sector:'All'}, key=JSON.stringify({...allScope,label:undefined})
    for(const [old,controller] of controllers){if(force||old!==key){controller.abort();controllers.delete(old);pending.delete(old)}}
    try {
      if(force)cache.delete(key)
      let data=cache.get(key)
      if(!data){
        let work=pending.get(key)
        if(!work){const controller=new AbortController();controllers.set(key,controller);work=getSalesDiagnostics(allScope,{signal:controller.signal});pending.set(key,work);const owned=work;void work.finally(()=>{if(pending.get(key)===owned){pending.delete(key);controllers.delete(key)}}).catch(()=>undefined)}
        data=await work; if(disposed||request!==revision)return;cache.set(key,data)
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
      const priorLabel=spansYears?'Prior-year period':String(year-1),currentLabel=spansYears?'Selected period':String(year)
      for(const label of ['Sector',`${priorLabel} net sales`,`${currentLabel} net sales`,'Peso change','Share of All change',`${priorLabel} gross margin`,`${currentLabel} gross margin`]){const th=document.createElement('th');th.scope='col';th.textContent=label;header.append(th)}
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
      const leader=[...rows].filter(r=>sectors.includes(r.key)&&r.delta!=null&&r.delta!==0).sort((a,b)=>Math.abs(b.delta??0)-Math.abs(a.delta??0))[0]
      renderContributionChart(find('overviewContributionVisual'), data, selected, name => window.dispatchEvent(new CustomEvent('medshield:diagnostic-open',{detail:{...scope,sector:name,label:name+' contribution investigation'}})))
      const unclassified = rows.some(row => !sectors.includes(row.key) && [row.current,row.prior,row.delta].some(value => value != null && value !== 0))
      finding.textContent=data.totals.delta==null?'No comparable recorded change is available.':leader?`The largest sector change was ${leader.label}: ${compactMoney(leader.delta!)}. ${data.totals.delta===0?'Sector increases and decreases offset completely.':'Named-sector increases and decreases are shown below.'}`:'No net sales change across the matched periods.'
      status.textContent=`${selected} · selected detail; table includes All sectors · ${scope.start_date} – ${scope.end_date} vs ${data.scope.prior_start_date} – ${data.scope.prior_end_date} · ${data.totals.matched_months}/${data.totals.expected_months} matched recorded months. Candidate; mapping review pending.`
      if (unclassified) status.textContent += ' All-sector totals also include unclassified records, which are omitted from the named-sector display and CSV.'
      method.textContent='Comparison uses common company month pairs before sector grouping, preserving signed offsets. A missing company month is excluded from both years. An absent sector within matched company periods is an accounting zero, not observed zero demand. Gross margin uses matching eligible profit/revenue; its eligible basis can cover less than total sales and can differ between years. Review the basis in the trend table/CSV before interpreting margin changes. Source row counts refer to the selected comparison period. Inspect a sector, then months → products → raw area labels; original/adjusted evidence stays separate. Raw area labels and client-reference candidates do not establish transaction-to-account linkage or a proven cause.'
      find('overviewComparisonNotes').hidden=false
      exportButton.disabled=!exportRows.length
    }catch(error){if(disposed||request!==revision)return;status.textContent=error instanceof Error?error.message:'Comparable evidence unavailable';table.replaceChildren();find('overviewContributionVisual').replaceChildren();find('overviewContributionVisual').hidden=true;finding.textContent='';exportRows=[];exportButton.disabled=true;retry.hidden=false}
  }
  const onScope=(event:Event)=>{const scope=(event as CustomEvent<DiagnosticScope>).detail;if(JSON.stringify(scope)!==JSON.stringify(current))void render(scope)}
  window.addEventListener('medshield:overview-scope',onScope)
  retry.onclick=()=>{if(current)void render(current,true)}
  exportButton.onclick=()=>{
    if(!exportRows.length)return
    const scopedRows:Record<string,unknown>[]=exportRows.map(row=>({...row,analytical_population:'itemized_sales_contracts_excluded',contracts_excluded:true,financial_release_approved:false}))
    const keys=Object.keys(scopedRows[0]),cell=(v:unknown)=>'"'+String(v??'').replace(/"/g,'""')+'"'
    const csv=[keys,...scopedRows.map(row=>keys.map(k=>row[k]))].map(row=>row.map(cell).join(',')).join('\r\n')
    const url=URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download='medshield-sector-contribution-All.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)
  }
  return()=>{disposed=true;revision++;for(const controller of controllers.values())controller.abort();controllers.clear();pending.clear();cache.clear();window.removeEventListener('medshield:overview-scope',onScope);evidence.remove()}
}
