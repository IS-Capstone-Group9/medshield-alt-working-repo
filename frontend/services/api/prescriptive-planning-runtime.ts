export const PLANNING_MARKUP = String.raw`
<style>
[data-planning] p{line-height:1.6;margin:12px 0}[data-planning] .plan-controls{display:flex;gap:16px;flex-wrap:wrap;margin:18px 0}
[data-planning] input[type=number]{width:105px}[data-planning] input,[data-planning] select{padding:8px;border:1px solid var(--border);border-radius:6px;max-width:100%;background:var(--bg-card,#fff);color:var(--text-primary)}
[data-planning] label{font-size:12px}[data-planning] .plan-controls label>input,[data-planning] select{display:block}[data-planning] canvas{max-width:100%}
[data-planning] .plan-scroll{overflow-x:auto;margin:18px 0}[data-planning] .chart-header{flex-wrap:wrap}
</style>
<div class="chart-card" data-planning>
<div class="chart-title">Priority-product allocation scenario</div>
<p>Maximize average fulfillment across shortlisted products, then minimize purchase cost. This objective requires client review. Results are planning scenarios, not purchase orders.</p>
<div class="plan-controls">
<label>Buyer cluster<select id="planSector" onchange="changePlanningScope()"><option>Unknown</option><option>Government</option><option>Private</option></select></label>
<label>Territory<select id="planTerritory" onchange="changePlanningScope()"><option>Quezon</option><option value="all">All within selected cluster</option></select></label>
<label>Planning horizon<select id="planHorizon" onchange="document.getElementById('planAcknowledged').checked=false;invalidatePlan()"><option value="1">1 month</option><option value="3" selected>3 months</option><option value="6">6 months</option><option value="12">12 months</option></select></label>
<label>Purchase budget (₱)<input id="planBudget" type="number" min="0" step="0.01" oninput="invalidatePlan()"></label>
<label>Minimum fulfillment per product (%)<input id="planMinimum" type="number" min="0" max="100" value="0" oninput="invalidatePlan()"></label>
</div>
<p id="planSourceStatus" role="status">Loading priority products…</p>
<p id="planShortlistScope"></p>
<div style="height:260px"><canvas id="planParetoChart" aria-label="Shortlisted products revenue share"></canvas></div>
<p>The shortlist is the top 20% of positive-revenue raw product identities, capped at five, ranked over the latest 12 calendar months in this scope. Its actual revenue share is shown; 80% coverage is not assumed.</p>
<p>Enter total demand for the selected horizon, usable stock, protected stock, pack size in source units, cost per pack, and supplier pack limit. Blank inputs are unknown. Historical quantity is reference evidence—not a forecast. Changing the horizon requires reviewing total demand.</p>
<div class="plan-scroll"><table id="planInputs" class="product-table" aria-label="Product evidence and required scenario inputs"></table></div>
<label><input type="checkbox" id="planAcknowledged" onchange="invalidatePlan()"> I have reviewed demand for this horizon and confirm these are scenario assumptions, not verified inventory or procurement data.</label>
<div class="plan-controls"><button class="btn btn-primary" id="planSolve" onclick="requestPlanSolve()" disabled>Solve allocation scenario</button><button class="btn btn-secondary" id="planExport" onclick="exportPlanningCSV()" disabled>Export scenario CSV</button></div>
<p id="planResultStatus" role="status"></p><p id="planBudgetSummary"></p>
<div style="height:280px"><canvas id="planFulfillmentChart" aria-label="Fulfilled and unmet demand percentages per product"></canvas></div>
<div class="plan-scroll"><table id="planResults" class="product-table"></table></div>
<details><summary>Constraints, source and limitations</summary>
<p>Integer purchased packs × pack size + usable stock − protected stock must cover fulfilled demand. Fulfillment cannot exceed demand or fall below the stated minimum. Purchases cannot exceed supplier limits or budget. Remaining stock includes protected stock and unused pack remainders. Products are not substituted for one another.</p>
<p>The objective weights each product's fulfillment percentage equally. It does not add unlike quantities or maximize gross profit. No clinical priorities, EOQ, lead-time buffers, expiry rules or warehouse limits are inferred. Pack/MOQ, supplier timing, available stock, approved SKU mapping and demand forecasts require operational review before use. Unselected products are outside this pilot.</p>
<p id="planSourceDetails"></p>
</details>
</div>`

export const PLANNING_SCRIPT = String.raw`
let planningData=null,planningResult=null;
function clearPlanningResult(message){
 const el=id=>document.getElementById(id);if(!el('planResultStatus'))return;
 planningResult=null;el('planResultStatus').textContent=message||'';el('planBudgetSummary').textContent='';el('planResults').textContent='';el('planExport').disabled=true;
 const chart=Chart.getChart(el('planFulfillmentChart'));if(chart)chart.destroy();
}
function invalidatePlan(){
 clearPlanningResult('Inputs changed. Solve again to refresh allocations.');
 window.dispatchEvent(new CustomEvent('medshield:plan-invalidated'));
}
function changePlanningScope(){invalidatePlan();window.dispatchEvent(new CustomEvent('medshield:planning-change'));}
function setPlanningData(data,error){
 const el=id=>document.getElementById(id);if(!el('planInputs'))return;
 planningData=data&&Array.isArray(data.products)&&data.source?data:null;
 clearPlanningResult();el('planInputs').textContent='';el('planShortlistScope').textContent='';el('planSourceDetails').textContent='';el('planSolve').disabled=true;el('planAcknowledged').checked=false;
 const chart=Chart.getChart(el('planParetoChart'));if(chart)chart.destroy();
 if(!planningData){el('planSourceStatus').textContent=error||'Shortlist unavailable; no demo products substituted.';return;}
 const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const fmt=v=>Number(v).toLocaleString('en-PH',{maximumFractionDigits:2});
 el('planTerritory').replaceChildren(new Option('All within selected cluster','all'),...data.territories.map(t=>new Option(t,t)));el('planTerritory').value=data.scope.territory;
 el('planSourceStatus').textContent=data.products.length?'Source-ranked shortlist · scenario inputs required':'No eligible positive-revenue products in this scope. Private ownership requires approved buyer mappings.';
 el('planShortlistScope').textContent=data.products.length?data.period_start+' to '+data.period_end+' · '+data.products.length+' of '+data.eligible_products+' positive-revenue products · '+fmt(data.shortlist_share_pct)+'% of positive-product revenue. '+(data.months_stale?data.months_stale+' closed months behind current history.':''):'';
 const fields=[['demand','Horizon demand'],['stock','Usable stock'],['reserve','Protected stock'],['pack','Units per pack'],['pack_cost','Cost per pack (₱)'],['max_packs','Supplier limit (packs)']];
 el('planInputs').innerHTML='<thead><tr><th>Product / historical reference</th>'+fields.map(f=>'<th>'+f[1]+'</th>').join('')+'</tr></thead><tbody>'+data.products.map((p,i)=>'<tr><td>'+esc(p.product)+'<br><small>₱'+fmt(p.revenue)+' · '+fmt(p.quantity)+' source units · '+p.observed_months+'/12 observed months</small></td>'+fields.map(([key,label])=>'<td><input aria-label="'+esc(p.product+' '+label)+'" data-plan-index="'+i+'" data-plan-field="'+key+'" type="number" min="'+(key==='pack_cost'?'0.01':['demand','pack'].includes(key)?'1':'0')+'" step="'+(key==='pack_cost'?'0.01':'1')+'" oninput="invalidatePlan()"></td>').join('')+'</tr>').join('')+'</tbody>';
 if(data.products.length)new Chart(el('planParetoChart'),{type:'bar',data:{labels:data.products.map(p=>p.product),datasets:[{label:'Share of positive-product net sales (%)',data:data.products.map(p=>p.revenue_share_pct),backgroundColor:'#335F78'}]},options:{responsive:true,maintainAspectRatio:false,scales:{y:{min:0,max:100}},plugins:{legend:{display:true}}}});
 el('planSourceDetails').textContent=data.source.file+' · checksum '+data.source.checksum+' · excluded nonpositive-revenue products: '+data.excluded_nonpositive_products+'. Source transaction exclusions: '+JSON.stringify(data.source.excluded)+'. Raw identities and observed units remain unnormalized.';
 el('planSolve').disabled=!data.products.length;
}
function getPlanningRequest(){
 if(!planningData)throw new Error('Load source evidence first');
 const value=id=>document.getElementById(id).value;
 return {scope:planningData.scope,checksum:planningData.source.checksum,horizon:value('planHorizon'),budget:value('planBudget'),minimum_pct:value('planMinimum'),acknowledged:document.getElementById('planAcknowledged').checked,
 items:planningData.products.map((p,i)=>{const row={product:p.product};document.querySelectorAll('[data-plan-index="'+i+'"]').forEach(input=>row[input.dataset.planField]=input.value);return row;})};
}
function requestPlanSolve(){clearPlanningResult('Solving scenario…');window.dispatchEvent(new CustomEvent('medshield:planning-solve'));}
function setPlanningResult(result,error){
 clearPlanningResult();const el=id=>document.getElementById(id);
 if(!result){el('planResultStatus').textContent=error||'Scenario could not be solved';return;}
 if(result.status!=='optimal_scenario'){el('planResultStatus').textContent='No allocation published: '+(result.conflicts||[]).join('; ');return;}
 planningResult=result;
 const fmt=v=>Number(v).toLocaleString('en-PH',{maximumFractionDigits:2}),esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 el('planResultStatus').textContent='Optimal scenario under entered constraints · '+result.assumptions.horizon+' months · '+fmt(result.mean_fulfillment_pct)+'% average product fulfillment. Client approval and operational validation pending.';
 el('planBudgetSummary').textContent='Budget ₱'+fmt(result.budget)+' · spend ₱'+fmt(result.spent)+' · remaining ₱'+fmt(result.remaining)+'. '+(result.budget_binding?'Budget is binding.':'Budget is not fully used; whole packs, demand limits or supplier caps can leave a remainder.');
 new Chart(el('planFulfillmentChart'),{type:'bar',data:{labels:result.rows.map(r=>r.product),datasets:[{label:'Fulfilled (%)',data:result.rows.map(r=>r.fulfillment_pct),backgroundColor:'#335F78'},{label:'Unmet (%)',data:result.rows.map(r=>100-r.fulfillment_pct),backgroundColor:'#D49A23'}]},options:{responsive:true,maintainAspectRatio:false,scales:{x:{stacked:true},y:{stacked:true,min:0,max:100}}}});
 el('planResults').innerHTML='<thead><tr><th>Product</th><th>Buy packs</th><th>Buy source units</th><th>Fulfilled</th><th>Unmet</th><th>Ending stock</th><th>Spend (₱)</th><th>Binding constraints</th></tr></thead><tbody>'+result.rows.map(r=>'<tr><td>'+esc(r.product)+'</td>'+[r.purchase_packs,r.purchase_units,r.fulfilled,r.unmet,r.ending_stock,r.spend].map(v=>'<td>'+fmt(v)+'</td>').join('')+'<td>'+esc(r.binding.join('; ')||'None')+'</td></tr>').join('')+'</tbody>';
 el('planExport').disabled=false;
}
function exportPlanningCSV(){
 const r=planningResult;if(!r)return;
 const safe=v=>/^[=+\-@\t\r]/.test(String(v))?"'"+v:v,q=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
 const rows=[['status','product','horizon_months','budget_pesos','minimum_fulfillment_pct','demand','stock','reserve','units_per_pack','cost_per_pack_pesos','supplier_max_packs','buy_packs','buy_units','fulfilled','unmet','ending_stock','spend_pesos','binding','sector','territory','checksum'],...r.rows.map(p=>['Scenario only',safe(p.product),r.assumptions.horizon,r.budget,r.assumptions.minimum_pct,p.demand,p.stock,p.reserve,p.pack,p.pack_cost_cents/100,p.max_packs,p.purchase_packs,p.purchase_units,p.fulfilled,p.unmet,p.ending_stock,p.spend,p.binding.join('; '),r.assumptions.scope.sector,r.assumptions.scope.territory,r.assumptions.checksum])];
 const url=URL.createObjectURL(new Blob(['\uFEFF'+rows.map(row=>row.map(q).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='priority-allocation-scenario.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
`
