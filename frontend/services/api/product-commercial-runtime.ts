import { productCommercialQueue, productCommercialReview, productCommercialRecommendation } from './product-commercial-review'

export const PRODUCT_COMMERCIAL_SCRIPT = 'const productCommercialReview = '+productCommercialReview.toString()+';\nconst productCommercialQueue = '+productCommercialQueue.toString()+';\nconst productCommercialRecommendation = '+productCommercialRecommendation.toString()+';' + String.raw`
let productCommercialFocus = 'contributors';
function renderProductCommercialReview(anchor, selectedRows, sourceRows, category, dateScope, release, hasSource) {
  let section = document.getElementById('productCommercialReview');
  if (!section) {
    const details = document.createElement('details');
    details.id = 'productCommercialDetails';
    details.className = 'dashboard-supporting-evidence';
    const label = document.createElement('summary');
    label.textContent = 'Commercial review';
    section = document.createElement('section');
    section.id = 'productCommercialReview';
    section.className = 'chart-card';
    details.append(label, section);
    anchor.after(details);
  }
  const commercialDisclosure = section.parentElement;
  if (anchor.nextElementSibling !== commercialDisclosure) anchor.after(commercialDisclosure);
  section.replaceChildren(); section.setAttribute('aria-labelledby','productCommercialTitle');
  const style = document.createElement('style');
  style.textContent = '#productCommercialReview .commercial-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin:14px 0}#productCommercialReview dt{font-size:12px;color:var(--text-muted)}#productCommercialReview dd{margin:5px 0 0;font-weight:600;overflow-wrap:anywhere}#productCommercialReview .commercial-controls{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:12px 0}#productCommercialReview .commercial-scroll{overflow:auto;max-height:470px}#productCommercialReview table{min-width:850px;width:100%}#productCommercialReview td{vertical-align:top}#productCommercialReview .commercial-note{font-size:12px;line-height:1.55;color:var(--text-secondary)}@media(max-width:700px){#productCommercialReview .commercial-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}}';
  const title = document.createElement('h3'); title.id = 'productCommercialTitle'; title.className = 'chart-title'; title.textContent = 'Commercial review';
  const intro = document.createElement('p'); intro.className = 'commercial-note'; intro.textContent = 'Itemized sales only; contracts excluded. Use recorded sales, supported gross profit and coverage to choose what to investigate. This review uses the selected period and category, before the Top % display filter.';
  style.textContent += '#productCommercialReview .commercial-actions-list{padding-left:24px}#productCommercialReview .commercial-actions-list li{margin:12px 0;overflow-wrap:anywhere}';
  section.append(style,title,intro);
  if (!hasSource) { const status = document.createElement('p'); status.setAttribute('role','status'); status.textContent = 'Product financial evidence is loading or unavailable.'; section.append(status); return; }
  const model = productCommercialReview(sourceRows,selectedRows,category,dateScope);
  const money = value => value == null ? 'Unavailable' : formatCurrency(value);
  const pct = value => value == null ? 'Unavailable' : value.toFixed(2)+'%';
  const metrics = document.createElement('dl'); metrics.className = 'commercial-metrics';
  for (const [name,value] of [['Recorded net sales',money(model.summary.revenue)],['Supported gross profit',money(model.summary.grossProfit)],
    ['Margin on matching revenue',pct(model.summary.marginPct)],['Margin record coverage',pct(model.summary.marginCoveragePct)]]) {
    const group = document.createElement('div'), dt = document.createElement('dt'), dd = document.createElement('dd'); dt.textContent=name; dd.textContent=value; group.append(dt,dd); metrics.append(group);
  }
  const controls = document.createElement('div'); controls.className='commercial-controls';
  const label = document.createElement('label'); label.htmlFor='productCommercialFocus'; label.textContent='Review focus';
  const focus = document.createElement('select'); focus.id='productCommercialFocus'; focus.className='topbar-select';
  for (const [value,text] of [['contributors','Largest positive-sales contributors'],['declines',model.comparison.available?'Recorded sales declines ('+model.counts.declines+')':'Recorded sales declines — comparison unavailable'],
    ['negative_profit','Negative supported gross profit ('+model.counts.negativeProfit+')'],['margin_gaps','Margin gaps by unsupported net sales ('+model.counts.marginGaps+')']]) {
    const option=new Option(text,value,false,value===productCommercialFocus);option.disabled=value==='declines'&&!model.comparison.available;focus.add(option);
  }
  focus.onchange = () => { productCommercialFocus=focus.value; renderProductCommercialReview(scopeCard,selectedRows,sourceRows,category,dateScope,release,hasSource); document.getElementById('productCommercialFocus')?.focus(); };
  const queue=productCommercialQueue(model,productCommercialFocus);
  const exportButton=document.createElement('button'); exportButton.type='button'; exportButton.className='btn btn-secondary'; exportButton.textContent='Export review rows'; exportButton.disabled=!queue.length;
  exportButton.onclick=()=>{
    const cell=value=>{let text=String(value??'');if(typeof value==='string'&&/^[\s]*[=+@-]/.test(text))text="'"+text;return '"'+text.replace(/"/g,'""')+'"';};
    const headers=['Source product label','Reporting ID','Net sales PHP','Positive amounts PHP','Supported gross profit PHP','Matching margin revenue PHP','Margin percent','Retained records','Net eligible records','Margin supported records','Margin record coverage percent','Matched current net PHP','Matched prior net PHP','Recorded change PHP','Growth percent','Comparison status','Review focus','Selected period','Category','Current start','Current end','Prior start','Prior end','Matched current months','Omitted months','Dataset ID','Fact Delta version','Policy','Contracts excluded','Publication approved','Source status','Source table','Receipt SHA256','Metric policy','Net sales without margin support PHP'];
    const records=queue.map(row=>[row.name,row.id,row.revenue,row.positiveSales,row.grossProfit,row.marginBasis,row.marginPct,row.records,row.netRecords,row.marginRecords,row.marginCoveragePct,
      row.matchedCurrent,row.matchedPrior,row.change,row.growthPct,row.comparisonStatus,productCommercialFocus,descriptivePeriodLabel(),category,
      model.comparison.currentStart,model.comparison.currentEnd,model.comparison.priorStart,model.comparison.priorEnd,model.comparison.matchedMonths.join(';'),model.comparison.omittedMonths.join(';'),
      release?.dataset_id??'Unavailable',release?.fact_delta_version??'Unavailable',release?.policy_version??'Unavailable',true,false,row.sourceStatus,
      release?.source_table??'Unavailable',release?.original_itemized?.receipt_sha256??'Unavailable','supported_pair_and_matched_months_v2_value_exposure_candidate',row.netWithoutMarginSupport]);
    headers.push('Recommendation code','Recommended action','Recommendation reason','Suggested owner','Follow-up check','Recommendation status','Recommendation policy');
    queue.forEach((row,index)=>{const action=productCommercialRecommendation(row);records[index].push(action.code,action.action,action.reason,action.owner,action.followUp,action.status,action.policy);});
    const url=URL.createObjectURL(new Blob(['\uFEFF'+[headers,...records].map(row=>row.map(cell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8;'}));
    const link=document.createElement('a');link.href=url;link.download='medshield-commercial-review.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  controls.append(label,focus,exportButton);
  const actions=document.createElement('section');actions.id='productCommercialActions';actions.setAttribute('aria-labelledby','productCommercialActionsTitle');
  const actionsTitle=document.createElement('h4');actionsTitle.id='productCommercialActionsTitle';actionsTitle.textContent='Recommended next actions';
  const actionScope=document.createElement('p');actionScope.className='commercial-note';actionScope.textContent='Up to three leading labels in this review focus. Suggested review actions; benefits have not been measured. Export includes an action and follow-up for every label in the queue.';
  actions.append(actionsTitle,actionScope);
  const actionList=document.createElement('ol');actionList.className='commercial-actions-list';
  for(const row of queue.slice(0,3)){
    const action=productCommercialRecommendation(row),item=document.createElement('li'),heading=document.createElement('strong');
    heading.textContent=row.name+' — '+action.action;item.append(heading);
    const evidence=document.createElement('p');evidence.className='commercial-note';evidence.textContent='Net sales '+money(row.revenue)+'; supported gross profit '+money(row.grossProfit)+'; matching-month change '+money(row.change)+'.';item.append(evidence);
    for(const text of ['Suggested owner: '+action.owner,'Next check: '+action.followUp]){const note=document.createElement('p');note.className='commercial-note';note.textContent=text;item.append(note);}
    const more=document.createElement('details'),moreTitle=document.createElement('summary');moreTitle.textContent='Sales evidence';more.append(moreTitle);
    const reason=document.createElement('p');reason.className='commercial-note';reason.textContent=action.reason;more.append(reason);
    item.append(more);
    actionList.append(item);
  }
  if(queue.length)actions.append(actionList);else{const empty=document.createElement('p');empty.className='commercial-note';empty.textContent='No labels meet this focus. Select another review focus or period; missing observations do not establish zero demand.';actions.append(empty);}
  const status=document.createElement('p'); status.id='productCommercialStatus'; status.className='commercial-note'; status.setAttribute('role','status');
  status.textContent='Showing '+Math.min(queue.length,15)+' of '+queue.length+' review rows; export includes all '+queue.length+'. '
    +(model.comparison.available ? 'Change compares '+model.comparison.currentStart+' to '+model.comparison.currentEnd+' against '+model.comparison.priorStart+' to '+model.comparison.priorEnd
      +' over '+model.comparison.matchedMonths.length+' matching observed company months. '+(model.comparison.omittedMonths.length ? 'Excluded unmatched months: '+model.comparison.omittedMonths.sort().join(', ')+'. ' : '') : model.comparison.reason+' ')
    +'Missing product observations remain unavailable; they are not zero sales.';
  const wrap=document.createElement('div');wrap.className='commercial-scroll';wrap.tabIndex=0;wrap.setAttribute('role','region');wrap.setAttribute('aria-label','Scrollable commercial review rows');
  const table=document.createElement('table');table.id='productCommercialReviewTable';table.className='product-table';
  const caption=table.createCaption();caption.className='sr-only';caption.textContent='Product financial review with matching support and comparison evidence.';
  const head=table.createTHead().insertRow();
  for(const name of ['Product name','Net sales','Supported gross profit','Paired margin','Matched sales change','Evidence and action']){const th=document.createElement('th');th.scope='col';th.textContent=name;head.append(th);}
  const body=table.createTBody();
  for(const row of queue.slice(0,15)){
    const tr=body.insertRow();
    for(const value of [row.name,money(row.revenue),money(row.grossProfit),pct(row.marginPct),row.change==null?'Unavailable':money(row.change)+' · '+pct(row.growthPct)]){const td=tr.insertCell();td.textContent=value;}
    const td=tr.insertCell(), note=document.createElement('p'); note.className='commercial-note';
    note.textContent='Net sales without paired margin support: '+money(row.netWithoutMarginSupport)+'. Margin support: '+(row.marginRecords==null||row.records==null?'record counts unavailable':row.marginRecords+' / '+row.records+' records')+'. Source status: '+row.sourceStatus+'. '+row.comparisonStatus+'.';
    const button=document.createElement('button');button.type='button';button.className='btn btn-secondary';button.textContent='Inspect records';button.setAttribute('aria-label','Inspect records for '+row.name);
    button.onclick=()=>openDiagnosticDrilldown({product_id:row.id,category,label:row.name});td.append(note,button);
  }
  if(!queue.length){const cell=body.insertRow().insertCell();cell.colSpan=6;cell.textContent=productCommercialFocus==='declines'&&!model.comparison.available?model.comparison.reason:'No recorded labels meet this review focus in the selected scope.';}
  wrap.append(table);
  const details=document.createElement('details'), summary=document.createElement('summary');summary.textContent='Definitions and evidence limits';
  const method=document.createElement('p');method.className='commercial-note';method.textContent='Gross profit is before operating expenses and uses rows with both supported profit and matching revenue. Margin divides their summed amounts; a nonpositive basis has no percentage. Record coverage is supported records / retained records, not reporting completeness. Rows without eligible revenue remain in that denominator. Aggregate rows without eligible record counts have unavailable coverage. Growth requires eligible observations on both sides and a positive prior baseline; signed changes remain available on nonpositive baselines. Exact dates and matching observed company months apply before category filtering; product completeness is unverified. Leap-day bounds clamp to February 28. Estimates are excluded. These are itemized financial labels: contracts, verified medicine-unit demand, clinical priority, stock availability and operational approval are outside this review. A decline or C class alone does not justify reducing stock. Negative profit warrants checking costs, discounts and source records. No predictive ABC model is activated.';
  const exposure=document.createElement('p');exposure.id='productMarginExposure';exposure.className='commercial-note';exposure.textContent='Net sales without paired margin support: '+money(model.summary.netWithoutMarginSupport)+'. Record counts and monetary exposure answer different questions; missing profit is not filled.';
  details.append(summary,method);section.append(metrics,exposure,controls,status,actions,wrap,details);
}
`;
