import { productChartLabel } from './product-chart-view'

export const PLANNING_MARKUP = String.raw`
<style>
[data-planning] { margin-top: 10px; width: 100%; min-width: 0; max-width: 100%; box-sizing: border-box; }
[data-planning] p { line-height: 1.6; margin: 10px 0; }
[data-planning] .plan-controls { display: flex; gap: 14px; flex-wrap: wrap; margin: 16px 0; align-items: flex-end; }
[data-planning] input[type=number] { width: 110px; }
[data-planning] input, [data-planning] select { padding: 7px 10px; border: 1px solid var(--border); border-radius: 6px; max-width: 100%; background: var(--bg-card,#fff); color: var(--text-primary); font-size: 12px; margin-top: 4px; }
[data-planning] label { font-size: 12px; font-weight: 700; color: var(--text-secondary); }
[data-planning] .plan-controls label > input, [data-planning] select { display: block; }
[data-planning] canvas { max-width: 100%; }
[data-planning] .plan-scroll { overflow-x: auto; margin: 16px 0; border-radius: 8px; border: 1px solid var(--border); }
[data-planning] .plan-scroll:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
[data-planning] .plan-hero-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px; margin: 16px 0; }
[data-planning] .plan-hero-card { padding: 14px 16px; border: 1px solid var(--border); border-radius: 8px; background: #FFFFFF; box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04); }
[data-planning] .plan-hero-card .hero-label { font-size: 10px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
[data-planning] .plan-hero-card .hero-val { font-size: 19px; font-weight: 800; color: var(--text-primary); margin: 4px 0 2px 0; }
[data-planning] .plan-hero-card .hero-sub { font-size: 12px; color: var(--text-secondary); }
[data-planning] .scenario-bar { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; background: var(--bg-elevated,#f8fafc); padding: 10px 14px; border-radius: 8px; border: 1px solid var(--border); align-items: center; }
[data-planning] .scenario-chip { padding: 6px 14px; border-radius: 6px; font-size: 12px; font-weight: 700; border: 1px solid var(--border); background: var(--bg-card,#fff); color: var(--text-secondary); cursor: pointer; transition: all 0.15s ease; }
[data-planning] .scenario-chip.active { background: var(--accent,#1e3a5f); color: #fff; border-color: var(--accent,#1e3a5f); }
@media(max-width:900px){[data-planning] .plan-hero-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:600px){[data-planning] .plan-hero-grid{grid-template-columns:1fr}[data-planning] .chart-header{flex-wrap:wrap}}
</style>

<div class="chart-card" data-planning>
  <div class="chart-header">
    <div>
      <h2 class="chart-title" style="display:flex;align-items:center;gap:8px;margin:0;">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
        Purchase allocation scenario
      </h2>
      <div class="chart-subtitle">Enter demand, stock, packaging and supplier costs.</div>
    </div>
    <div style="display:flex;gap:8px;align-items:center;">
      <button class="btn btn-secondary" id="planExport" onclick="exportPlanningCSV()" disabled style="font-size:12px;padding:5px 12px;">
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:4px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
        Export scenario CSV
      </button>
    </div>
  </div>

  <style>#planSummary[data-state="unavailable"]{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px var(--space-3);padding:var(--space-2) var(--space-3);border-left-width:3px;border-left-color:var(--warning,#b7791f)}#planSummary[data-state="unavailable"] p{margin:0;font-size:13px}#planSummary[data-state="unavailable"] .analytical-output-takeaway{font-size:13px;font-weight:600}</style>
  <section class="analytical-output-summary" id="planSummary" aria-label="Planning finding and evidence quality">
    <p class="analytical-output-takeaway" id="planTakeaway">No scenario has been calculated.</p>
    <p class="analytical-output-scope" id="planScope">Historical shortlist evidence loading. Demand and inventory values are scenario assumptions.</p>
  </section>
  <p class="chart-subtitle">Scenario only · Entered assumptions · No purchase is executed.</p>

  <!-- Illustrative scenario inputs; these are not verified operational data. -->
  <div class="scenario-bar">
    <span style="font-size:12px;font-weight:700;color:var(--text-primary);margin-right:8px;">Fill blank inputs with examples:</span>
    <button type="button" class="scenario-chip active" id="chipScenarioNormal" onclick="setPrescriptivePreset('normal')">
      Base example
    </button>
    <button type="button" class="scenario-chip" id="chipScenarioSurge" onclick="setPrescriptivePreset('surge')">
      Higher demand example (1.45&times;)
    </button>
    <button type="button" class="scenario-chip" id="chipScenarioIsland" onclick="setPrescriptivePreset('island')">
      Higher demand example (1.20&times;)
    </button>
  </div>

  <div class="plan-controls">
    <label>Buyer Cluster
      <select id="planSector" onchange="changePlanningScope()">
        <option>All</option>
        <option>Unknown</option>
        <option>Government</option>
        <option>Private</option>
        <option>Internal</option>
      </select>
    </label>
    <label>Territory Scope
      <select id="planTerritory" onchange="changePlanningScope()">
        <option>Quezon</option>
        <option value="all" selected>All within selected cluster</option>
      </select>
    </label>
    <label>Planning Horizon
      <select id="planHorizon" onchange="document.getElementById('planAcknowledged').checked=false;invalidatePlan()">
        <option value="1">1 month</option>
        <option value="3" selected>3 months</option>
        <option value="6">6 months</option>
        <option value="12">12 months</option>
      </select>
    </label>
    <label>Purchase Budget Cap (₱)
      <input id="planBudget" type="number" min="0" step="1000" value="20000000" oninput="invalidatePlan(true)">
    </label>
    <label>Minimum Fulfillment Target (%)
      <input id="planMinimum" type="number" min="0" max="100" value="0" placeholder="0" oninput="invalidatePlan(true)">
    </label>
    <label>Allocation method<select id="planAllocationMethod" onchange="invalidatePlan(true)"><option value="balanced">Balance fulfillment (greedy)</option><option value="weighted">Weighted priority (integer packs)</option></select></label>
  </div>
  <details><summary>Optional shared purchase capacity</summary><p>Limit newly purchased units across products with the same entered unit. Leave the cap blank to apply no shared limit; zero permits no purchases. Enter a matching unit label for every product below. This is a scenario assumption, not verified storage capacity; existing stock is excluded.</p><div class="plan-controls"><label>Shared purchase cap (units)<input id="planPurchaseCapacity" type="number" min="0" max="1000000000" step="1" oninput="invalidatePlan(true)"></label><label>Common unit label<input id="planCapacityUnit" type="text" maxlength="80" placeholder="e.g. ampoules" oninput="invalidatePlan(true)"></label></div></details>
  <details id="planWeights"><summary>Weights for weighted allocation</summary><p>Enter integer weights adding to 100. Higher normalized product scores mean higher priority. These are scenario assumptions; outbreak scores are not official alerts. A zero-weight criterion may stay blank in the product scores. Weights are unused in balanced mode.</p><div class="plan-controls"><label>Revenue contribution weight (%)<input id="planRevenueWeight" type="number" min="0" max="100" step="1" oninput="invalidatePlan(true)"></label><label>Demand growth weight (%)<input id="planGrowthWeight" type="number" min="0" max="100" step="1" oninput="invalidatePlan(true)"></label><label>Outbreak risk weight (%)<input id="planOutbreakWeight" type="number" min="0" max="100" step="1" oninput="invalidatePlan(true)"></label></div></details>

  <p id="planSourceStatus" role="status" style="font-weight:600;font-size:12px;color:var(--text-primary);">Loading priority products…</p>
  <p id="planShortlistScope" style="font-size:12px;color:var(--text-muted);"></p>

  <details id="planSalesContribution">
  <summary>Historical sales contribution</summary>
  <div class="chart-wrap plan-chart-wrap h260" style="position:relative;margin:14px 0;">
    <canvas id="planParetoChart" role="img" aria-label="Historical shortlisted product shares of positive-product net sales"></canvas>
  </div>

  <p style="font-size:12px;color:var(--text-muted);line-height:1.5;">
    Share of historical positive-product net sales · Commercial ranking only.
  </p>
  </details>

  <h3 class="chart-title plan-section-title">Review scenario inputs</h3>
  <div class="plan-scroll" tabindex="0" role="region" aria-label="Scenario input table, scroll horizontally for all fields">
    <table id="planInputs" class="product-table" aria-label="Product evidence and required scenario inputs"></table>
  </div>

  <div style="margin:14px 0;display:flex;align-items:center;gap:8px;">
    <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:12px;font-weight:600;color:var(--text-primary);">
      <input type="checkbox" id="planAcknowledged" onchange="invalidatePlan()" style="accent-color:var(--accent);">
      I reviewed these inputs as scenario assumptions. MedShield has not verified the demand, inventory or supplier values.
    </label>
  </div>

  <div class="plan-controls">
    <button class="btn btn-primary" id="planSolve" onclick="requestPlanSolve()" disabled style="padding:7px 18px;font-weight:700;">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px;"><polyline points="20 6 9 17 4 12"></polyline></svg>
      Calculate scenario
    </button>
    <button class="btn btn-secondary" id="planResetInputs" onclick="resetPlanningDefaults()" style="padding:7px 14px;">
      Fill blank inputs with base example
    </button>
  </div>

  <p id="planResultStatus" role="status" style="font-weight:700;font-size:12px;color:var(--text-primary);margin-top:14px;"></p>
  <p id="planBudgetSummary" style="font-size:12px;color:var(--text-secondary);"></p>
  <p id="planCapacitySummary" role="status" style="font-size:12px;color:var(--text-secondary);"></p>
  <p id="planBaselineSummary" style="font-size:12px;line-height:1.6;"></p>
  <p id="planOptimizationSummary" role="status" style="font-size:12px;line-height:1.6;"></p>
  <p id="planFeasibilitySummary" role="status" style="font-size:12px;line-height:1.6;"></p>

  <div class="plan-hero-grid" aria-label="Calculated scenario summary">
    <div class="plan-hero-card"><div class="hero-label">Scenario purchase products</div><div class="hero-val" id="kpiPlanReorderCount">Not solved</div><div class="hero-sub" id="kpiPlanReorderSub">Products with purchase packs &gt; 0</div></div>
    <div class="plan-hero-card"><div class="hero-label">Scenario unmet products</div><div class="hero-val" id="kpiPlanCriticalThreats">Not solved</div><div class="hero-sub">Products with unmet demand &gt; 0</div></div>
    <div class="plan-hero-card"><div class="hero-label">Scenario spend</div><div class="hero-val" id="kpiPlanSolvedSpend">Not solved</div><div class="hero-sub" id="kpiPlanBudgetSub">Entered cost per pack</div></div>
    <div class="plan-hero-card"><div class="hero-label">Expiry loss</div><div class="hero-val" id="kpiPlanExpiryRate">Unavailable</div><div class="hero-sub">Shelf life and batch data not modeled</div></div>
    <div class="plan-hero-card"><div class="hero-label">Scenario mean fulfillment</div><div class="hero-val" id="kpiPlanServiceLevel">Not solved</div><div class="hero-sub">Equal weight per product; not pooled units</div></div>
  </div>

  <div id="planCalculatedResults" hidden>
  <details><summary>Lead-time and expiry checks</summary><p>Constant-rate screens from entered annual demand. Lead-time gaps protect reserve and deduct backorders. Inbound timing is unverified. Shelf capacity is a gross upper ceiling for the new lot after receipt; competing stock and batch expiry dates are not modeled. These screens do not constrain the allocation, prove expiry safety or measure wastage.</p><div class="plan-scroll" tabindex="0" role="region" aria-label="Lead-time and expiry table, scroll horizontally"><table id="planFeasibilityTable" class="product-table" aria-label="Entered lead-time and gross expiry capacity screens"></table></div></details>
  <details><summary>What do the scenario purchases add?</summary><p>Compare the same entered demand with usable stock after protecting the reserve, first without new purchases and then with scenario purchases. Units stay product-specific. Demand and stock are entered assumptions; fulfillment is not a service guarantee. Review the selected method's proof status separately.</p><div class="plan-scroll" tabindex="0" role="region" aria-label="Scenario baseline table, scroll horizontally"><table id="planBaselineTable" class="product-table" aria-label="Entered-stock baseline and additional scenario coverage"></table></div></details>
  <details><summary>EOQ and reorder-point review</summary><p>Optional entered-input model: constant annual demand, a 365-day year and fixed calendar lead time. The safety reserve is added once to the reorder point; inventory position includes usable stock, inbound due within lead time and backorders. EOQ lot checks compare one lot with the total budget and supplier cap; they do not reserve budget across products. Inbound and backorders affect this review only, not the allocation above. Ordering/cycle-holding cost excludes purchases, reserve holding cost and expiry. No expiry benefit or service level is estimated.</p><div class="plan-scroll" tabindex="0" role="region" aria-label="EOQ and reorder-point table, scroll horizontally"><table id="planPolicyTable" class="product-table" aria-label="Entered-input EOQ and reorder-point review"></table></div></details>
  <h3 class="chart-title">Scenario fulfillment by product</h3>
  <p class="chart-subtitle">Fulfilled and unmet demand add to 100% for each scenario product. Exact assumptions and results are in the tables.</p>
  <div class="chart-wrap plan-chart-wrap h280" style="position:relative;margin:16px 0;">
    <canvas id="planFulfillmentChart" role="img" aria-label="Scenario fulfilled and unmet demand percentages per product"></canvas>
  </div>

  <div class="plan-scroll" tabindex="0" role="region" aria-label="Scenario allocation table, scroll horizontally">
    <table id="planResults" class="product-table" aria-label="Calculated scenario allocation"></table>
  </div>
  </div>

  <details class="analytical-output-notes" style="margin-top:16px;background:var(--bg-elevated,#f8fafc);border:1px solid var(--border);border-radius:8px;padding:10px 14px;">
    <summary style="cursor:pointer;font-size:12px;font-weight:700;color:var(--text-primary);">Scenario assumptions, allocation method and source</summary>
    <div style="font-size:12px;color:var(--text-secondary);line-height:1.6;margin-top:10px;">
      <p id="planAssumptions">Scenario only · Product-specific units and entered costs. Operational inventory, expiry and clinical priority are unverified. No purchase is executed.</p>
      <p id="planPresetNote">Examples fill blanks only. Demand, stock and supplier values are unverified assumptions.</p>
      <p id="planReview">Review demand, usable stock, reserve, packaging and supplier costs before solving.</p>
      <p><strong>Allocation:</strong> Balanced mode meets entered minimum fulfillment, then greedily adds affordable packs to lower-fulfillment products. Weighted mode maximizes entered-priority-weighted fulfillment with integer packs and a capped branch-and-bound search. Review its proof status and gap; an optimal result applies only to this entered objective and constraints, not actual procurement.</p>
      <p><strong>Assumptions:</strong> Demand covers the entire selected horizon. Usable stock, protected reserve, units per pack, pack cost, supplier limit, budget and minimum fulfillment come from the entered values.</p>
      <p><strong>Example inputs:</strong> Base demand is 30% of historical source units, rounded with a 100-unit minimum. Higher-demand examples multiply it by 1.45 or 1.20. Example stock is 40% of base demand; reserve is 15% (35% for the 1.45 example); a pack contains 100 units at ₱250, with a 500-pack supplier limit. These values fill blank fields only and do not vary with the horizon. The initial ₱20,000,000 budget is an editable example.</p>
      <p><strong>Limits:</strong> Product units are not pooled across packaging. Optional EOQ/reorder-point inputs produce a separate constant-demand model review. Revenue/growth/outbreak scores and weights are entered assumptions. Disease effects, clinical priority and expiry reduction are not computed.</p>
      <p id="planSourceDetails"></p>
    </div>
  </details>
</div>
`;

export const PLANNING_SCRIPT = String.raw`
const planningChartLabel = ${productChartLabel.toString()};
function planningChartRows(id, count) {
  const wrap = document.getElementById(id)?.closest('.chart-wrap');
  if (wrap) wrap.dataset.chartSize = count <= 3 ? 'small' : count <= 5 ? 'medium' : 'large';
}
let planningData = null;
let planningResult = null;
let activePrescriptivePreset = 'normal';

function clearPlanningResult(message) {
  const el = id => document.getElementById(id);
  if (!el('planResultStatus')) return;
  planningResult = null;
  el('planResultStatus').textContent = message || '';
  el('planBudgetSummary').textContent = '';
  if (el('planCapacitySummary')) el('planCapacitySummary').textContent = '';
  if (el('planBaselineSummary')) el('planBaselineSummary').textContent = '';
  if (el('planBaselineTable')) el('planBaselineTable').textContent = '';
  el('planResults').textContent = '';
  el('planPolicyTable').textContent = '';
  el('planOptimizationSummary').textContent = '';
  el('planFeasibilityTable').textContent = '';
  el('planFeasibilitySummary').textContent = '';
  el('planExport').disabled = true;
  el('planCalculatedResults').hidden = true;
  ['kpiPlanReorderCount','kpiPlanCriticalThreats','kpiPlanSolvedSpend','kpiPlanServiceLevel'].forEach(id => { if (el(id)) el(id).textContent = 'Not solved'; });
  if (el('kpiPlanExpiryRate')) el('kpiPlanExpiryRate').textContent = 'Unavailable';
  if (el('kpiPlanBudgetSub')) el('kpiPlanBudgetSub').textContent = 'Entered cost per pack';
  el('planTakeaway').textContent = message || 'No scenario has been calculated.';
  el('planReview').textContent = 'Review each product’s demand, usable stock, reserve, packaging and supplier costs before solving.';
  el('planAssumptions').textContent = 'Scenario only · Product-specific units and entered costs. Operational inventory, expiry and clinical priority are unverified. No purchase is executed.';
  const chart = Chart.getChart(el('planFulfillmentChart'));
  if (chart) chart.destroy();
}

function invalidatePlan(inputsChanged = false) {
  if (inputsChanged) document.getElementById('planAcknowledged').checked = false;
  clearPlanningResult('Inputs changed. Calculate the scenario again to refresh allocations.');
  window.dispatchEvent(new CustomEvent('medshield:plan-invalidated'));
}

function changePlanningScope() {
  invalidatePlan();
  window.dispatchEvent(new CustomEvent('medshield:planning-change'));
}

function setPrescriptivePreset(preset) {
  activePrescriptivePreset = preset;
  ['chipScenarioNormal', 'chipScenarioSurge', 'chipScenarioIsland'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('active');
  });

  const chip = document.getElementById(preset === 'surge' ? 'chipScenarioSurge' : preset === 'island' ? 'chipScenarioIsland' : 'chipScenarioNormal');
  if (chip) chip.classList.add('active');
  const note = document.getElementById('planPresetNote');
  if (note) note.textContent = (preset === 'surge' ? '1.45× demand example' : preset === 'island' ? '1.20× demand example' : 'Base example') + ' fills blank fields only; existing entries stay unchanged. Example values are not audited demand, stock or supplier quotes. Review the assumptions below.';

  if (planningData && planningData.products) {
    let unknownSourceQuantity = false;
    planningData.products.forEach((p, i) => {
      const demandInput = document.querySelector('[data-plan-index="' + i + '"][data-plan-field="demand"]');
      const stockInput = document.querySelector('[data-plan-index="' + i + '"][data-plan-field="stock"]');
      const reserveInput = document.querySelector('[data-plan-index="' + i + '"][data-plan-field="reserve"]');
      const packInput = document.querySelector('[data-plan-index="' + i + '"][data-plan-field="pack"]');
      const costInput = document.querySelector('[data-plan-index="' + i + '"][data-plan-field="pack_cost"]');
      const maxInput = document.querySelector('[data-plan-index="' + i + '"][data-plan-field="max_packs"]');

      const hasSourceQuantity = typeof p.quantity === 'number' && Number.isFinite(p.quantity);
      const baseDemand = hasSourceQuantity ? Math.max(100, Math.round(p.quantity * 0.3)) : null;
      if (!hasSourceQuantity) unknownSourceQuantity = true;
      const mult = preset === 'surge' ? 1.45 : (preset === 'island' ? 1.2 : 1.0);

      if (baseDemand !== null && demandInput && !demandInput.value) demandInput.value = String(Math.round(baseDemand * mult));
      if (baseDemand !== null && stockInput && !stockInput.value) stockInput.value = String(Math.round(baseDemand * 0.4));
      if (baseDemand !== null && reserveInput && !reserveInput.value) reserveInput.value = String(Math.round(baseDemand * (preset === 'surge' ? 0.35 : 0.15)));
      if (packInput && !packInput.value) packInput.value = '100';
      if (costInput && !costInput.value) costInput.value = '250';
      if (maxInput && !maxInput.value) maxInput.value = '500';
    });
    if (unknownSourceQuantity && note) note.textContent += ' Source Qty is unavailable; demand, stock and reserve remain blank unless already entered. Supply reviewed scenario assumptions.';
  }

  invalidatePlan(true);
}

function resetPlanningDefaults() {
  setPrescriptivePreset('normal');
}

function setPlanningData(data, error) {
  const el = id => document.getElementById(id);
  if (!el('planInputs')) return;

  planningData = data && Array.isArray(data.products) && data.source ? data : null;
  clearPlanningResult();
  el('planInputs').textContent = '';
  el('planShortlistScope').textContent = '';
  el('planSourceDetails').textContent = '';
  el('planSolve').disabled = true;
  el('planAcknowledged').checked = false;
  el('planPurchaseCapacity').value = '';
  el('planCapacityUnit').value = '';

  const canvas = el('planParetoChart');
  const chart = Chart.getChart(canvas);
  if (chart) chart.destroy();
  const loading = !planningData && /^Loading/i.test(error || '');
  const wrap = canvas?.closest?.('.chart-wrap');
  if (wrap) {
    wrap.classList.toggle('skeleton', loading);
    wrap.hidden = !loading && !planningData?.products.length;
  }
  if (loading) appendTableSkeletonRows(el('planInputs'), 1);

  el('planSummary').dataset.state = planningData ? 'ready' : (loading ? 'loading' : 'unavailable');
  if (!planningData) {
    el('planSourceStatus').textContent = error || 'Shortlist unavailable; no demo products substituted.';
    el('planScope').textContent = 'Historical shortlist unavailable · scenario has no source evidence.';
    el('planTakeaway').textContent = 'Planning source evidence unavailable.';
    el('planReview').textContent = 'Restore shortlist evidence before entering and solving a scenario.';
    return;
  }

  const esc = v => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = v => Number(v).toLocaleString('en-PH', { maximumFractionDigits: 2 });

  const territoryOptions = [new Option('All within selected cluster', 'all'), ...data.territories.map(t => new Option(t, t))];
  // Preserve the requested scope when refreshed evidence no longer offers it.
  // An explicit unavailable choice must not silently become the all-territory scope.
  if (data.scope.territory !== 'all' && !data.territories.includes(data.scope.territory)) {
    const unavailable = new Option(data.scope.territory + ' — unavailable in current source', data.scope.territory);
    unavailable.disabled = true;
    territoryOptions.push(unavailable);
  }
  el('planTerritory').replaceChildren(...territoryOptions);
  el('planTerritory').value = data.scope.territory;
  el('planSourceStatus').textContent = data.products.length ? 'Source-ranked shortlist · scenario inputs required' : 'No eligible positive-revenue products in this scope. Private ownership requires approved buyer mappings.';
  el('planShortlistScope').textContent = data.products.length ? data.period_start + ' to ' + data.period_end + ' · ' + data.products.length + ' of ' + data.eligible_products + ' positive-revenue products · ' + fmt(data.shortlist_share_pct) + '% of positive-product revenue. ' + (data.months_stale ? data.months_stale + ' closed months behind current history.' : '') : '';
  el('planScope').textContent = data.scope.sector + ' · ' + data.scope.territory + ' · historical net sales in ₱ · ' + (data.period_start || 'Unavailable') + ' to ' + (data.period_end || 'Unavailable') + '. Scenario inputs are separate from the observed source values.';

  const fields = [
    ['demand', 'Horizon Demand (Units)'],
    ['stock', 'Usable Stock (Units)'],
    ['reserve', 'Safety Reserve (Units)'],
    ['pack', 'Units Per Pack'],
    ['pack_cost', 'Cost Per Pack (₱)'],
    ['max_packs', 'Supplier Max Limit (Packs)']
  ];

  const policyFields=[['annual_demand','Annual demand (product units)'],['order_cost','Cost per order (₱)'],['holding_cost','Holding cost per unit per year (₱)'],['lead_days','Lead time (calendar days)'],['on_order','Inbound due within lead time (units)'],['backorders','Backordered units'],['shelf_life_days','Optional usable shelf life after receipt (days)']];
  const priorityFields=[['revenue_score','Normalized revenue contribution score'],['growth_score','Normalized demand growth score'],['outbreak_score','Normalized outbreak risk score']];
  el('planInputs').innerHTML = '<thead><tr><th>Product / Historical Reference</th><th data-plan-shared-unit>Product unit for shared cap</th>' + fields.map(f => '<th>' + f[1] + '</th>').join('') + '<th>EOQ / reorder-point inputs</th></tr></thead><tbody>'
    + data.products.map((p, i) => '<tr><td><strong>' + esc(p.product) + '</strong><br><small style="color:var(--text-muted);">₱' + fmt(p.revenue) + ' · ' + (typeof p.quantity === 'number' && Number.isFinite(p.quantity) ? fmt(p.quantity) + ' source Qty (unit unverified)' : 'Source Qty unavailable') + ' · ' + p.observed_months + '/12 observed months</small></td>'
      + '<td data-plan-shared-unit><input aria-label="' + esc(p.product + ' scenario unit label') + '" data-plan-index="' + i + '" data-plan-field="unit_label" type="text" maxlength="80" placeholder="Same unit as shared cap" oninput="invalidatePlan(true)"></td>'
      + fields.map(([key, label]) => '<td><input aria-label="' + esc(p.product + ' ' + label) + '" data-plan-index="' + i + '" data-plan-field="' + key + '" type="number" min="' + (key === 'pack_cost' ? '0.01' : ['demand', 'pack'].includes(key) ? '1' : '0') + '" step="' + (key === 'pack_cost' ? '0.01' : '1') + '" oninput="invalidatePlan(true)"></td>').join('')
      + '<td><details><summary>Optional model inputs</summary><p>Leave the first six fields blank to skip. Otherwise enter all six, including explicit zeros. Shelf life and input reference remain optional. Use the same product unit as stock and pack; Safety Reserve supplies the reorder-point safety stock. No values are inferred from sales.</p>'
      + policyFields.map(([key,label])=>'<label style="display:block">'+label+'<input aria-label="'+esc(p.product+' '+label)+'" data-plan-index="'+i+'" data-plan-field="'+key+'" type="number" min="'+(['order_cost','holding_cost'].includes(key)?'0.01':key==='annual_demand'?'1':'0')+'" step="'+(['order_cost','holding_cost'].includes(key)?'0.01':'1')+'" oninput="invalidatePlan(true)"></label>').join('')+'<label style="display:block">Input reference (optional, no personal data)<input aria-label="'+esc(p.product+' policy input reference')+'" data-plan-index="'+i+'" data-plan-field="policy_input_reference" type="text" maxlength="200" oninput="invalidatePlan(true)"></label></details><details data-plan-weighted><summary>Weighted priority scores</summary><p>Integer 0–100, higher means higher priority. Required only for criteria with positive weights. These do not verify revenue rank, growth or outbreak risk.</p>'+priorityFields.map(([key,label])=>'<label style="display:block">'+label+'<input aria-label="'+esc(p.product+' '+label)+'" data-plan-index="'+i+'" data-plan-field="'+key+'" type="number" min="0" max="100" step="1" oninput="invalidatePlan(true)"></label>').join('')+'</details></td></tr>').join('')
    + (data.products.length ? '' : '<tr><td colspan="' + (fields.length + 3) + '">No products in this scope.</td></tr>')
    + '</tbody>';

  if (data.products.length) {
    planningChartRows('planParetoChart', data.products.length);
    new Chart(el('planParetoChart'), {
      type: 'bar',
      data: {
        labels: data.products.map(p => p.product),
        datasets: [{
          label: 'Share of Positive-Product Net Sales (%)',
          data: data.products.map(p => p.revenue_share_pct),
          backgroundColor: '#1E3A5F',
          borderColor: '#1E3A5F',
          borderWidth: 1
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { min: 0, max: 100, ticks: { callback: value => value + '%' }, title: { display: true, text: 'Share of positive-product net sales (%)' } },
          y: { ticks: { autoSkip: false, callback: function(value) { return planningChartLabel(this.getLabelForValue(value), window.innerWidth < 600 ? 18 : 34, 2); } } }
        },
        plugins: { legend: { display: false }, tooltip: { callbacks: { title: contexts => planningChartLabel(data.products[contexts[0]?.dataIndex]?.product, window.innerWidth < 600 ? 34 : 64, Number.MAX_SAFE_INTEGER), label: context => Number(context.raw).toFixed(1) + '% of positive-product net sales' } } }
      }
    });
  }

  el('planSourceDetails').textContent = data.source.file + ' · checksum ' + data.source.checksum + ' · excluded nonpositive-revenue products: ' + data.excluded_nonpositive_products + '. Source transaction exclusions: ' + JSON.stringify(data.source.excluded) + '. Raw identities and observed units remain unnormalized.';
  el('planSolve').disabled = !data.products.length;

  // Keep new source-bound scenarios blank until examples are explicitly requested.
  ['chipScenarioNormal','chipScenarioSurge','chipScenarioIsland'].forEach(id => el(id).classList.remove('active'));
  el('planTakeaway').textContent = data.products.length ? 'The historical shortlist captures ' + fmt(data.shortlist_share_pct) + '% of positive-product net sales across ' + data.products.length + ' products. No scenario result has been calculated.' : 'No eligible historical products are available for a scenario in this scope.';
}

function getPlanningRequest(forDraft = false) {
  if (!planningData) throw new Error('Load source evidence first');
  const value = id => document.getElementById(id).value;
  const request = {
    scope: planningData.scope,
    checksum: planningData.source.checksum,
    horizon: value('planHorizon'),
    budget: value('planBudget'),
    minimum_pct: value('planMinimum') || '0',
    allocation_method: value('planAllocationMethod'),revenue_weight:value('planRevenueWeight'),growth_weight:value('planGrowthWeight'),outbreak_weight:value('planOutbreakWeight'),
    acknowledged: document.getElementById('planAcknowledged').checked,
    items: planningData.products.map((p, i) => {
      const row = { product: p.product };
      document.querySelectorAll('[data-plan-index="' + i + '"]').forEach(input => {
        row[input.dataset.planField] = input.value;
      });
      return row;
    })
  };
  const capacity = value('planPurchaseCapacity');
  if (forDraft || capacity !== '') {
    request.purchase_capacity_units = capacity;
    request.capacity_unit_label = value('planCapacityUnit');
  }
  return request;
}

function requestPlanSolve() {
  clearPlanningResult('Calculating allocation scenario from the entered assumptions…');
  window.dispatchEvent(new CustomEvent('medshield:planning-solve'));
}

function setPlanningResult(result, error) {
  clearPlanningResult();
  const el = id => document.getElementById(id);
  if (!result) {
    el('planResultStatus').textContent = error || 'Scenario could not be solved under entered constraints.';
    el('planTakeaway').textContent = 'No scenario result is available.';
    return;
  }
  if (result.status !== 'scenario_allocation') {
    el('planResultStatus').textContent = 'No scenario allocation calculated: ' + (result.conflicts || []).join('; ');
    el('planTakeaway').textContent = 'Entered constraints did not produce a scenario allocation.';
    el('planReview').textContent = 'Review the reported conflicts and entered budget, stock, supplier limits and minimum fulfillment.';
    return;
  }
  const requestedCapacity = el('planPurchaseCapacity')?.value ?? '';
  const returnedCapacity = result.purchase_capacity;
  const validCapacity = requestedCapacity === '' ? !returnedCapacity : returnedCapacity
    && returnedCapacity.units === Number(requestedCapacity) && returnedCapacity.unit_label === el('planCapacityUnit').value
    && [returnedCapacity.units,returnedCapacity.used_units,returnedCapacity.remaining_units].every(value => Number.isSafeInteger(value) && value >= 0)
    && returnedCapacity.used_units + returnedCapacity.remaining_units === returnedCapacity.units
    && result.rows.every(row => Number.isSafeInteger(row.purchase_units) && row.purchase_units >= 0)
    && result.rows.reduce((sum,row) => sum + row.purchase_units,0) === returnedCapacity.used_units
    && returnedCapacity.evidence_label === 'Assumed' && returnedCapacity.physical_storage_verified === false;
  if (!validCapacity) {
    el('planResultStatus').textContent = 'Purchase-capacity result does not match your inputs. Reload planning data and calculate again.';
    el('planTakeaway').textContent = 'No matching capacity result is available.';
    return;
  }
  planningResult = result;

  const fmt = v => Number(v).toLocaleString('en-PH', { maximumFractionDigits: 2 });
  const esc = v => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const optimization=result.optimization;
  const shelfExcess=result.rows.filter(row=>row.expiry_screen?.status==='exceeds_gross_capacity').length;
  const leadGaps=result.rows.filter(row=>row.inventory_policy?.feasibility.gap_without_receipts_units>0).length;
  const unknownShelf=result.rows.filter(row=>!row.expiry_screen||row.expiry_screen.status==='unavailable').length;
  el('planFeasibilitySummary').textContent='Review screens: '+shelfExcess+' purchase lots exceed gross entered demand before expiry; '+leadGaps+' products need lead-time stock/inbound review; '+unknownShelf+' have no shelf-life screen. '+(shelfExcess?'Revise flagged lots or supplier shelf-life assumptions before considering purchase. ':'')+'Screens do not constrain allocation or verify expiry safety. Expand Lead-time and expiry checks for details.';
  el('planFeasibilityTable').innerHTML='<thead><tr><th>Product</th><th>Lead-time review</th><th>Gap: no inbound / all inbound timely (units)</th><th>Gross shelf capacity (units)</th><th>Scenario purchase review</th><th>Input reference</th></tr></thead><tbody>'+result.rows.map(row=>{
    const f=row.inventory_policy?.feasibility;
    return '<tr><td>'+esc(row.product)+'</td>'+(f?'<td>'+esc(f.lead_review)+'</td><td>'+fmt(f.gap_without_receipts_units)+' / '+fmt(f.gap_even_if_inbound_timely_units)+'</td><td>'+(f.gross_demand_capacity_before_expiry_units===null?'Unavailable':fmt(f.gross_demand_capacity_before_expiry_units))+'</td><td>'+esc(row.expiry_screen?.review??'Unavailable')+'</td><td>'+esc(f.input_reference??'Not supplied')+' · entered/unverified</td>':'<td colspan="5">Enter optional policy inputs for lead-time and shelf-life screens.</td>')+'</tr>';
  }).join('')+'</tbody>';
  const gapText=optimization&&optimization.absolute_gap_pp>0&&optimization.absolute_gap_pp<.01?'<0.01':optimization?fmt(optimization.absolute_gap_pp):'';
  el('planOptimizationSummary').textContent=optimization?(optimization.proof_status==='optimal'?'Optimal for the entered weighted fulfillment objective. ':'Feasible weighted result; optimality not proved. ')+'Weighted fulfillment '+fmt(optimization.weighted_fulfillment_pct)+'%; certified upper bound '+fmt(optimization.upper_bound_pct)+'%; absolute gap '+gapText+' percentage points. '+optimization.nodes_visited+' / '+optimization.node_limit+' search nodes. Scores are entered assumptions; no secondary cost optimum or procurement approval.':'Balanced greedy allocation; no proof of global optimality.';
  el('planPolicyTable').innerHTML='<thead><tr><th>Product</th><th>Continuous EOQ (units)</th><th>Model lot (packs / units)</th><th>Reorder point (units)</th><th>Inventory position (units)</th><th>Review action</th><th>Single-lot limits</th></tr></thead><tbody>'+result.rows.map(row=>{
    const p=row.inventory_policy;
    return '<tr><td>'+esc(row.product)+'</td>'+(p?'<td>'+fmt(p.continuous_eoq_units)+'</td><td>'+fmt(p.economic_lot_packs)+' / '+fmt(p.economic_lot_units)+'</td><td>'+fmt(p.reorder_point_units)+'</td><td>'+fmt(p.inventory_position_units)+'</td><td>'+esc(p.recommendation)+'</td><td>'+esc(p.review_constraints.join('; ')||'One lot fits entered budget and supplier cap; shared allocation still required')+'</td>':'<td colspan="6">Optional policy inputs not entered; no EOQ or reorder-point result.</td>')+'</tr>';
  }).join('')+'</tbody>';

  const purchased = result.rows.filter(r => r.purchase_packs > 0).length;
  const unmet = result.rows.filter(r => r.unmet > 0).length;
  el('planTakeaway').textContent = 'Scenario spend ₱' + fmt(result.spent) + ' produces ' + fmt(result.mean_fulfillment_pct) + '% mean product fulfillment; ' + unmet + '/' + result.rows.length + ' products retain unmet scenario demand.';
  el('planReview').textContent = unmet ? 'Review unmet products, pack costs and supplier limits. Validate operational inputs before considering any purchase.' : 'Review costs, packaging and operational inputs before considering any purchase; scenario fulfillment is not a service-level guarantee.';
  el('planResultStatus').textContent = 'Scenario allocation calculated · ' + result.assumptions.horizon + '-month horizon · scenario evidence for review.';
  el('planBudgetSummary').textContent = 'Entered scenario budget: ₱' + fmt(result.budget) + ' · scenario spend: ₱' + fmt(result.spent) + ' · scenario remaining budget: ₱' + fmt(result.remaining) + '. ' + (result.budget_binding ? 'Budget fully used.' : 'Budget not fully used.');
  const capacity = result.purchase_capacity;
  if (el('planCapacitySummary')) el('planCapacitySummary').textContent = capacity
    ? 'Assumed purchase cap: ' + fmt(capacity.units) + ' ' + capacity.unit_label + ' · purchased: ' + fmt(capacity.used_units) + ' · remaining: ' + fmt(capacity.remaining_units) + '. Existing stock is excluded; physical storage is not verified.'
    : capacity === null ? 'No shared purchase-capacity constraint was applied.' : 'Purchase-capacity status is unavailable in this response; calculate the scenario again.';
  const baselineAvailable = Number.isFinite(result.baseline_mean_fulfillment_pct) && Number.isFinite(result.additional_mean_fulfillment_pp)
    && result.rows.every(r => ['baseline_fulfilled','baseline_unmet','baseline_fulfillment_pct','additional_fulfilled','additional_fulfillment_pct','purchased_units_not_needed_for_entered_demand'].every(key => Number.isFinite(r[key])) && Array.isArray(r.unmet_reasons));
  if (el('planBaselineSummary')) el('planBaselineSummary').textContent = baselineAvailable
    ? 'Compared with no new purchases: mean product fulfillment rises from ' + fmt(result.baseline_mean_fulfillment_pct) + '% to ' + fmt(result.mean_fulfillment_pct) + '% (+' + fmt(result.additional_mean_fulfillment_pp) + ' percentage points). Each product has equal weight; incompatible units are not pooled. ' + (result.allocation_stop_reasons || []).join('; ') + '. Scenario assumptions only; no purchase is executed.'
    : 'No-purchase comparison is unavailable in this response. Recalculate with the current gateway; no baseline values were substituted.';
  if (el('planBaselineTable') && baselineAvailable) el('planBaselineTable').innerHTML = '<thead><tr><th>Product</th><th>Without purchases (units)</th><th>Added coverage (units)</th><th>With purchases (units)</th><th>Remaining gap (units)</th><th>Purchased units beyond entered demand</th><th>Remaining-gap explanation</th></tr></thead><tbody>'
    + result.rows.map(r => '<tr><td>' + esc(r.product) + '</td>' + [r.baseline_fulfilled,r.additional_fulfilled,r.fulfilled,r.unmet,r.purchased_units_not_needed_for_entered_demand].map(value => '<td>' + fmt(value) + '</td>').join('') + '<td>' + esc(r.unmet_reasons.join('; ') || 'Entered demand covered') + '</td></tr>').join('') + '</tbody>';
  el('planAssumptions').textContent = 'Scenario only · ' + result.assumptions.scope.sector + ' · ' + result.assumptions.scope.territory + ' · ' + result.assumptions.horizon + '-month entered demand · ' + fmt(result.assumptions.minimum_pct) + '% minimum fulfillment target · source units per product and entered pack costs in ₱. Mean fulfillment gives each product equal weight.';
  el('planCalculatedResults').hidden = false;

  if (el('kpiPlanReorderCount')) el('kpiPlanReorderCount').textContent = String(purchased);
  if (el('kpiPlanCriticalThreats')) el('kpiPlanCriticalThreats').textContent = String(unmet);
  if (el('kpiPlanSolvedSpend')) el('kpiPlanSolvedSpend').textContent = '₱' + fmt(result.spent);
  if (el('kpiPlanServiceLevel')) el('kpiPlanServiceLevel').textContent = fmt(result.mean_fulfillment_pct) + '%';

  planningChartRows('planFulfillmentChart', result.rows.length);
  new Chart(el('planFulfillmentChart'), {
    type: 'bar',
    data: {
      labels: result.rows.map(r => r.product),
      datasets: [
        {
          label: 'Scenario fulfilled demand (%)',
          data: result.rows.map(r => r.fulfillment_pct),
          backgroundColor: '#1E3A5F',
          borderColor: '#1E3A5F',
          borderWidth: 1
        },
        {
          label: 'Scenario unmet demand (%)',
          data: result.rows.map(r => Math.max(0, 100 - r.fulfillment_pct)),
          backgroundColor: '#D97706',
          borderColor: '#D97706',
          borderWidth: 1
        }
      ]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { stacked: true, ticks: { autoSkip: false, callback: function(value) { return planningChartLabel(this.getLabelForValue(value), window.innerWidth < 600 ? 18 : 34, 2); } } },
        x: { stacked: true, min: 0, max: 100, ticks: { callback: value => value + '%' }, title: { display: true, text: 'Scenario demand (%)' } }
      },
      plugins: {
        legend: { labels: { boxWidth: 10 } },
        tooltip: { callbacks: { title: contexts => planningChartLabel(result.rows[contexts[0]?.dataIndex]?.product, window.innerWidth < 600 ? 34 : 64, Number.MAX_SAFE_INTEGER), label: context => context.dataset.label + ': ' + Number(context.raw).toFixed(1) + '%' } }
      }
    }
  });

  el('planResults').innerHTML = '<thead><tr><th>Product</th><th>Scenario buy (packs)</th><th>Scenario buy (units)</th><th>Scenario fulfilled</th><th>Scenario unmet</th><th>Scenario ending stock</th><th>Scenario spend (₱)</th><th>Review cue</th><th>Constraints reported</th></tr></thead><tbody>'
    + result.rows.map(r => {
      const badge = r.unmet > 0 ? '<span class="status-pill" style="background:#fff7ed;color:#9a3412;border:1px solid #fed7aa;font-size:10px;padding:3px 7px;">Review unmet demand</span>' : '<span class="status-pill" style="font-size:10px;padding:3px 7px;">Scenario demand met</span>';
      return '<tr><td><strong>' + esc(r.product) + '</strong>'+(r.priority?'<br><small>Entered priority '+fmt(r.priority.composite_score/100)+' / 100</small>':'')+'</td>'
        + [r.purchase_packs, r.purchase_units, r.fulfilled, r.unmet, r.ending_stock, r.spend].map(v => '<td>' + fmt(v) + '</td>').join('')
        + '<td>' + badge + '</td>'
        + '<td>' + esc(r.binding.join('; ') || 'None') + '</td></tr>';
    }).join('')
    + '</tbody>';

  el('planExport').disabled = false;
}

function exportPlanningCSV() {
  const r = planningResult;
  if (!r) return;
  const safe = v => /^[=+\-@\t\r]/.test(String(v)) ? "'" + v : v;
  const q = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  const rows = [
    ['status', 'product', 'horizon_months', 'budget_pesos', 'minimum_fulfillment_pct', 'demand', 'stock', 'reserve', 'units_per_pack', 'cost_per_pack_pesos', 'supplier_max_packs', 'buy_packs', 'buy_units', 'fulfilled', 'unmet', 'ending_stock', 'spend_pesos', 'binding', 'sector', 'territory', 'checksum',
      'without_purchase_fulfilled','without_purchase_unmet','without_purchase_fulfillment_pct','additional_fulfilled','additional_fulfillment_pp','purchased_units_beyond_entered_demand','unmet_reasons','baseline_mean_fulfillment_pct','additional_mean_fulfillment_pp','allocation_method','comparison_policy','operational_inputs_verified','procurement_execution_approved','expiry_outcome_measured'],
    ...r.rows.map(p => ['Scenario allocation for review', safe(p.product), r.assumptions.horizon, r.budget, r.assumptions.minimum_pct, p.demand, p.stock, p.reserve, p.pack, p.pack_cost_cents / 100, p.max_packs, p.purchase_packs, p.purchase_units, p.fulfilled, p.unmet, p.ending_stock, p.spend, p.binding.join('; '), r.assumptions.scope.sector, r.assumptions.scope.territory, r.assumptions.checksum,
      p.baseline_fulfilled,p.baseline_unmet,p.baseline_fulfillment_pct,p.additional_fulfilled,p.additional_fulfillment_pct,p.purchased_units_not_needed_for_entered_demand,(p.unmet_reasons || []).join('; '),r.baseline_mean_fulfillment_pct,r.additional_mean_fulfillment_pp,r.assumptions.method,r.assumptions.comparison_policy,false,false,false])
  ];
  rows[0].push('capacity_constraint_status','shared_purchase_capacity_units','capacity_unit_label','capacity_used_units','capacity_remaining_units','capacity_evidence_label','physical_storage_verified');
  r.rows.forEach((row,index)=>{const c=r.purchase_capacity;rows[index+1].push(c?'applied':c===null?'not_applied':'unavailable',c?.units??null,safe(c?.unit_label??''),c?.used_units??null,c?.remaining_units??null,c?.evidence_label??null,c?.physical_storage_verified??null);});
  rows[0].push('inventory_policy','annual_demand_units','cost_per_order_php','holding_cost_per_unit_year_php','lead_days','inbound_within_lead_units','backordered_units','days_per_year','continuous_eoq_units','economic_lot_packs','economic_lot_units','annual_ordering_cycle_holding_php','reorder_point_units','inventory_position_units','reorder_triggered','single_lot_budget_fits','single_lot_supplier_fits','policy_review_constraints','policy_recommendation');
  r.rows.forEach((row,index)=>{const p=row.inventory_policy;rows[index+1].push(p?.policy??null,p?.annual_demand??null,p?.order_cost??null,p?.holding_cost??null,p?.lead_days??null,p?.on_order??null,p?.backorders??null,p?.days_per_year??null,p?.continuous_eoq_units??null,p?.economic_lot_packs??null,p?.economic_lot_units??null,p?.annual_ordering_and_cycle_holding_cost??null,p?.reorder_point_units??null,p?.inventory_position_units??null,p?.reorder_triggered??null,p?.budget_covers_single_lot??null,p?.supplier_covers_single_lot??null,p?.review_constraints.join('; ')??null,p?.recommendation??null);});
  rows[0].push('revenue_weight','growth_weight','outbreak_weight','revenue_score','growth_score','outbreak_score','composite_priority_score','priority_evidence','proof_status','weighted_fulfillment_pct','certified_upper_bound_pct','absolute_gap_pp','search_nodes','node_limit','objective_numerator','certified_upper_bound_numerator','objective_denominator');
  r.rows.forEach((row,index)=>{const p=row.priority,o=r.optimization,w=r.assumptions.weights;rows[index+1].push(w?.revenue??null,w?.growth??null,w?.outbreak??null,p?.revenue??null,p?.growth??null,p?.outbreak??null,p?.composite_score??null,p?.evidence??null,o?.proof_status??null,o?.weighted_fulfillment_pct??null,o?.upper_bound_pct??null,o?.absolute_gap_pp??null,o?.nodes_visited??null,o?.node_limit??null,o?.objective_numerator??null,o?.certified_upper_bound_numerator??null,o?.objective_denominator??null);});
  rows[0].push('feasibility_policy','policy_input_reference','policy_input_status','lead_demand_ceiling_units','available_without_receipts_units','gap_without_receipts_units','gap_even_if_inbound_timely_units','lead_time_review','usable_shelf_life_days_after_receipt','gross_shelf_demand_capacity_units','gross_shelf_demand_capacity_packs','eoq_lot_exceeds_gross_shelf_capacity','purchase_expiry_screen_status','purchase_expiry_review','allocation_constrained_by_expiry');
  r.rows.forEach((row,index)=>{const f=row.inventory_policy?.feasibility,e=row.expiry_screen;rows[index+1].push(f?.policy??null,safe(f?.input_reference??''),f?.input_status??null,f?.lead_demand_ceiling_units??null,f?.available_before_new_receipts_units??null,f?.gap_without_receipts_units??null,f?.gap_even_if_inbound_timely_units??null,f?.lead_review??null,f?.usable_shelf_life_days_after_receipt??null,f?.gross_demand_capacity_before_expiry_units??null,f?.gross_demand_capacity_before_expiry_packs??null,row.inventory_policy?.eoq_lot_exceeds_gross_shelf_capacity??null,e?.status??null,e?.review??null,false);});

  const url = URL.createObjectURL(new Blob(['\uFEFF' + rows.map(row => row.map(q).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'medshield-allocation-scenario.csv';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
`;
