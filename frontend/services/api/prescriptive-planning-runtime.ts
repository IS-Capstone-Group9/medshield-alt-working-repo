import { productChartLabel } from './product-chart-view'

export const PLANNING_MARKUP = String.raw`
<style>
[data-planning] { margin-top: 10px; width: 100%; min-width: 0; max-width: 100%; box-sizing: border-box; }
[data-planning] p { line-height: 1.6; margin: 10px 0; }
[data-planning] .plan-controls { display: flex; gap: 14px; flex-wrap: wrap; margin: 16px 0; align-items: flex-end; }
[data-planning] input[type=number] { width: 110px; }
[data-planning] input, [data-planning] select { padding: 7px 10px; border: 1px solid var(--border); border-radius: 6px; max-width: 100%; background: var(--bg-card,#fff); color: var(--text-primary); font-size: 12px; margin-top: 4px; }
[data-planning] label { font-size: 11px; font-weight: 700; color: var(--text-secondary); }
[data-planning] .plan-controls label > input, [data-planning] select { display: block; }
[data-planning] canvas { max-width: 100%; }
[data-planning] .plan-scroll { overflow-x: auto; margin: 16px 0; border-radius: 8px; border: 1px solid var(--border); }
[data-planning] .plan-hero-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px; margin: 16px 0; }
[data-planning] .plan-hero-card { padding: 14px 16px; border: 1px solid var(--border); border-radius: 8px; background: #FFFFFF; box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04); }
[data-planning] .plan-hero-card .hero-label { font-size: 10px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
[data-planning] .plan-hero-card .hero-val { font-size: 19px; font-weight: 800; color: var(--text-primary); margin: 4px 0 2px 0; }
[data-planning] .plan-hero-card .hero-sub { font-size: 11px; color: var(--text-secondary); }
[data-planning] .scenario-bar { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; background: var(--bg-elevated,#f8fafc); padding: 10px 14px; border-radius: 8px; border: 1px solid var(--border); align-items: center; }
[data-planning] .scenario-chip { padding: 6px 14px; border-radius: 6px; font-size: 11px; font-weight: 700; border: 1px solid var(--border); background: var(--bg-card,#fff); color: var(--text-secondary); cursor: pointer; transition: all 0.15s ease; }
[data-planning] .scenario-chip.active { background: var(--accent,#1e3a5f); color: #fff; border-color: var(--accent,#1e3a5f); }
@media(max-width:900px){[data-planning] .plan-hero-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:600px){[data-planning] .plan-hero-grid{grid-template-columns:1fr}[data-planning] .chart-header{flex-wrap:wrap}}
</style>

<div class="chart-card" data-planning>
  <div class="chart-header">
    <div>
      <div class="chart-title" style="display:flex;align-items:center;gap:8px;">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
        Purchase allocation scenario
      </div>
      <div class="chart-subtitle">Historical product shortlist with entered demand, stock, packaging and budget assumptions</div>
    </div>
    <div style="display:flex;gap:8px;align-items:center;">
      <button class="btn btn-secondary" id="planExport" onclick="exportPlanningCSV()" disabled style="font-size:11px;padding:5px 12px;">
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:4px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
        Export scenario evidence CSV
      </button>
    </div>
  </div>

  <section class="analytical-output-summary" aria-label="Planning finding and evidence quality">
    <p class="analytical-output-takeaway" id="planTakeaway">No scenario has been calculated.</p>
    <p class="analytical-output-scope" id="planScope">Historical shortlist evidence loading. Demand and inventory values are scenario assumptions.</p>
    <p class="analytical-output-review" id="planReview">Review each product's demand, usable stock, reserve, packaging and supplier costs before solving.</p>
  </section>

  <!-- Illustrative scenario inputs; these are not verified operational data. -->
  <div class="scenario-bar">
    <span style="font-size:11px;font-weight:700;color:var(--text-primary);margin-right:8px;">Fill blank inputs with examples:</span>
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

  <p class="chart-subtitle" id="planPresetNote">Example values are illustrative and fill blank fields only. They are not audited demand, stock, supplier quotes or disease projections.</p>

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
        <option value="all">All within selected cluster</option>
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
      <input id="planBudget" type="number" min="0" step="1000" value="20000000" oninput="invalidatePlan()">
    </label>
    <label>Minimum Fulfillment Target (%)
      <input id="planMinimum" type="number" min="0" max="100" value="0" placeholder="0" oninput="invalidatePlan()">
    </label>
  </div>

  <p id="planSourceStatus" role="status" style="font-weight:600;font-size:12px;color:var(--text-primary);">Loading priority products…</p>
  <p id="planShortlistScope" style="font-size:11px;color:var(--text-muted);"></p>

  <h3 class="chart-title">Historical sales contribution</h3>
  <div class="chart-wrap plan-chart-wrap h260" style="position:relative;margin:14px 0;">
    <canvas id="planParetoChart" role="img" aria-label="Historical shortlisted product shares of positive-product net sales"></canvas>
  </div>

  <p style="font-size:11px;color:var(--text-muted);line-height:1.5;">
    Share of positive-product net sales over trailing closed months. These source labels require identity review; revenue rank does not establish clinical priority. Enter stock, safety buffer and pack costs to calculate a planning scenario.
  </p>

  <div class="plan-scroll">
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
      Calculate allocation scenario
    </button>
    <button class="btn btn-secondary" id="planResetInputs" onclick="resetPlanningDefaults()" style="padding:7px 14px;">
      Fill blank inputs with base example
    </button>
  </div>

  <p id="planResultStatus" role="status" style="font-weight:700;font-size:12px;color:var(--text-primary);margin-top:14px;"></p>
  <p id="planBudgetSummary" style="font-size:11px;color:var(--text-secondary);"></p>
  <p class="chart-subtitle" id="planAssumptions">Scenario only · product-specific source units · entered budget in ₱. No operational inventory, expiry or clinical-priority validation is supplied.</p>

  <div class="plan-hero-grid" aria-label="Calculated scenario summary">
    <div class="plan-hero-card"><div class="hero-label">Scenario purchase products</div><div class="hero-val" id="kpiPlanReorderCount">Not solved</div><div class="hero-sub" id="kpiPlanReorderSub">Products with purchase packs &gt; 0</div></div>
    <div class="plan-hero-card"><div class="hero-label">Scenario unmet products</div><div class="hero-val" id="kpiPlanCriticalThreats">Not solved</div><div class="hero-sub">Products with unmet demand &gt; 0</div></div>
    <div class="plan-hero-card"><div class="hero-label">Scenario spend</div><div class="hero-val" id="kpiPlanSolvedSpend">Not solved</div><div class="hero-sub" id="kpiPlanBudgetSub">Entered cost per pack</div></div>
    <div class="plan-hero-card"><div class="hero-label">Expiry loss</div><div class="hero-val" id="kpiPlanExpiryRate">Unavailable</div><div class="hero-sub">Shelf life and batch data not modeled</div></div>
    <div class="plan-hero-card"><div class="hero-label">Scenario mean fulfillment</div><div class="hero-val" id="kpiPlanServiceLevel">Not solved</div><div class="hero-sub">Equal weight per product; not pooled units</div></div>
  </div>

  <div id="planCalculatedResults" hidden>
  <h3 class="chart-title">Scenario fulfillment by product</h3>
  <p class="chart-subtitle">Fulfilled and unmet demand add to 100% for each scenario product. Exact assumptions and results are in the tables.</p>
  <div class="chart-wrap plan-chart-wrap h280" style="position:relative;margin:16px 0;">
    <canvas id="planFulfillmentChart" role="img" aria-label="Scenario fulfilled and unmet demand percentages per product"></canvas>
  </div>

  <div class="plan-scroll">
    <table id="planResults" class="product-table"></table>
  </div>
  </div>

  <details class="analytical-output-notes" style="margin-top:16px;background:var(--bg-elevated,#f8fafc);border:1px solid var(--border);border-radius:8px;padding:10px 14px;">
    <summary style="cursor:pointer;font-size:12px;font-weight:700;color:var(--text-primary);">Scenario assumptions, allocation method and source</summary>
    <div style="font-size:11px;color:var(--text-secondary);line-height:1.6;margin-top:10px;">
      <p><strong>Allocation:</strong> The live gateway meets entered minimum fulfillment where feasible, then adds affordable integer packs to products with lower fulfillment fractions. This scenario does not establish a globally optimal purchase plan.</p>
      <p><strong>Assumptions:</strong> Demand covers the entire selected horizon. Usable stock, protected reserve, units per pack, pack cost, supplier limit, budget and minimum fulfillment come from the entered values.</p>
      <p><strong>Example inputs:</strong> Base demand is 30% of historical source units, rounded with a 100-unit minimum. Higher-demand examples multiply it by 1.45 or 1.20. Example stock is 40% of base demand; reserve is 15% (35% for the 1.45 example); a pack contains 100 units at ₱250, with a 500-pack supplier limit. These values fill blank fields only and do not vary with the horizon. The initial ₱20,000,000 budget is an editable example.</p>
      <p><strong>Limits:</strong> Product units are not pooled across packaging. EOQ, reorder points, lead times, disease effects, clinical priority and expiry reduction are not computed by this scenario.</p>
      <p id="planSourceDetails"></p>
    </div>
  </details>
</div>
`;

export const PLANNING_SCRIPT = String.raw`
const planningChartLabel = ${productChartLabel.toString()};
function planningChartRows(id, count) {
  const wrap = document.getElementById(id)?.closest('.chart-wrap');
  if (wrap) wrap.style.setProperty('height', Math.max(240, count * 44 + 70) + 'px', 'important');
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
  el('planResults').textContent = '';
  el('planExport').disabled = true;
  el('planCalculatedResults').hidden = true;
  ['kpiPlanReorderCount','kpiPlanCriticalThreats','kpiPlanSolvedSpend','kpiPlanServiceLevel'].forEach(id => { if (el(id)) el(id).textContent = 'Not solved'; });
  if (el('kpiPlanExpiryRate')) el('kpiPlanExpiryRate').textContent = 'Unavailable';
  if (el('kpiPlanBudgetSub')) el('kpiPlanBudgetSub').textContent = 'Entered cost per pack';
  el('planTakeaway').textContent = message || 'No scenario has been calculated.';
  el('planReview').textContent = 'Review each product’s demand, usable stock, reserve, packaging and supplier costs before solving.';
  el('planAssumptions').textContent = 'Scenario only · product-specific source units · entered budget in ₱. No operational inventory, expiry or clinical-priority validation is supplied.';
  const chart = Chart.getChart(el('planFulfillmentChart'));
  if (chart) chart.destroy();
}

function invalidatePlan() {
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
    planningData.products.forEach((p, i) => {
      const demandInput = document.querySelector('[data-plan-index="' + i + '"][data-plan-field="demand"]');
      const stockInput = document.querySelector('[data-plan-index="' + i + '"][data-plan-field="stock"]');
      const reserveInput = document.querySelector('[data-plan-index="' + i + '"][data-plan-field="reserve"]');
      const packInput = document.querySelector('[data-plan-index="' + i + '"][data-plan-field="pack"]');
      const costInput = document.querySelector('[data-plan-index="' + i + '"][data-plan-field="pack_cost"]');
      const maxInput = document.querySelector('[data-plan-index="' + i + '"][data-plan-field="max_packs"]');

      const baseDemand = Math.max(100, Math.round(p.quantity * 0.3));
      const mult = preset === 'surge' ? 1.45 : (preset === 'island' ? 1.2 : 1.0);

      if (demandInput && !demandInput.value) demandInput.value = String(Math.round(baseDemand * mult));
      if (stockInput && !stockInput.value) stockInput.value = String(Math.round(baseDemand * 0.4));
      if (reserveInput && !reserveInput.value) reserveInput.value = String(Math.round(baseDemand * (preset === 'surge' ? 0.35 : 0.15)));
      if (packInput && !packInput.value) packInput.value = '100';
      if (costInput && !costInput.value) costInput.value = '250';
      if (maxInput && !maxInput.value) maxInput.value = '500';
    });
  }

  invalidatePlan();
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

  const chart = Chart.getChart(el('planParetoChart'));
  if (chart) chart.destroy();

  if (!planningData) {
    el('planSourceStatus').textContent = error || 'Shortlist unavailable; no demo products substituted.';
    el('planScope').textContent = 'Historical shortlist unavailable · scenario has no source evidence.';
    el('planTakeaway').textContent = 'Planning source evidence unavailable.';
    el('planReview').textContent = 'Restore shortlist evidence before entering and solving a scenario.';
    return;
  }

  const esc = v => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = v => Number(v).toLocaleString('en-PH', { maximumFractionDigits: 2 });

  el('planTerritory').replaceChildren(new Option('All within selected cluster', 'all'), ...data.territories.map(t => new Option(t, t)));
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

  el('planInputs').innerHTML = '<thead><tr><th>Product / Historical Reference</th>' + fields.map(f => '<th>' + f[1] + '</th>').join('') + '</tr></thead><tbody>'
    + data.products.map((p, i) => '<tr><td><strong>' + esc(p.product) + '</strong><br><small style="color:var(--text-muted);">₱' + fmt(p.revenue) + ' · ' + fmt(p.quantity) + ' units · ' + p.observed_months + '/12 observed months</small></td>'
      + fields.map(([key, label]) => '<td><input aria-label="' + esc(p.product + ' ' + label) + '" data-plan-index="' + i + '" data-plan-field="' + key + '" type="number" min="' + (key === 'pack_cost' ? '0.01' : ['demand', 'pack'].includes(key) ? '1' : '0') + '" step="' + (key === 'pack_cost' ? '0.01' : '1') + '" oninput="invalidatePlan()"></td>').join('')
      + '</tr>').join('')
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

  setPrescriptivePreset('normal');
  el('planTakeaway').textContent = data.products.length ? 'The historical shortlist captures ' + fmt(data.shortlist_share_pct) + '% of positive-product net sales across ' + data.products.length + ' products. No scenario result has been calculated.' : 'No eligible historical products are available for a scenario in this scope.';
}

function getPlanningRequest() {
  if (!planningData) throw new Error('Load source evidence first');
  const value = id => document.getElementById(id).value;
  return {
    scope: planningData.scope,
    checksum: planningData.source.checksum,
    horizon: value('planHorizon'),
    budget: value('planBudget'),
    minimum_pct: value('planMinimum') || '0',
    acknowledged: document.getElementById('planAcknowledged').checked,
    items: planningData.products.map((p, i) => {
      const row = { product: p.product };
      document.querySelectorAll('[data-plan-index="' + i + '"]').forEach(input => {
        row[input.dataset.planField] = input.value;
      });
      return row;
    })
  };
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
  planningResult = result;

  const fmt = v => Number(v).toLocaleString('en-PH', { maximumFractionDigits: 2 });
  const esc = v => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const purchased = result.rows.filter(r => r.purchase_packs > 0).length;
  const unmet = result.rows.filter(r => r.unmet > 0).length;
  el('planTakeaway').textContent = 'Scenario spend ₱' + fmt(result.spent) + ' produces ' + fmt(result.mean_fulfillment_pct) + '% mean product fulfillment; ' + unmet + '/' + result.rows.length + ' products retain unmet scenario demand.';
  el('planReview').textContent = unmet ? 'Review unmet products, pack costs and supplier limits. Validate operational inputs before considering any purchase.' : 'Review costs, packaging and operational inputs before considering any purchase; scenario fulfillment is not a service-level guarantee.';
  el('planResultStatus').textContent = 'Scenario allocation calculated · ' + result.assumptions.horizon + '-month horizon · scenario evidence for review.';
  el('planBudgetSummary').textContent = 'Entered scenario budget: ₱' + fmt(result.budget) + ' · scenario spend: ₱' + fmt(result.spent) + ' · scenario remaining budget: ₱' + fmt(result.remaining) + '. ' + (result.budget_binding ? 'Budget fully used.' : 'Budget not fully used.');
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
        legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } },
        tooltip: { callbacks: { title: contexts => planningChartLabel(result.rows[contexts[0]?.dataIndex]?.product, window.innerWidth < 600 ? 34 : 64, Number.MAX_SAFE_INTEGER), label: context => context.dataset.label + ': ' + Number(context.raw).toFixed(1) + '%' } }
      }
    }
  });

  el('planResults').innerHTML = '<thead><tr><th>Product</th><th>Scenario buy (packs)</th><th>Scenario buy (units)</th><th>Scenario fulfilled</th><th>Scenario unmet</th><th>Scenario ending stock</th><th>Scenario spend (₱)</th><th>Review cue</th><th>Constraints reported</th></tr></thead><tbody>'
    + result.rows.map(r => {
      const badge = r.unmet > 0 ? '<span class="status-pill" style="background:#fff7ed;color:#9a3412;border:1px solid #fed7aa;font-size:10px;padding:3px 7px;">Review unmet demand</span>' : '<span class="status-pill" style="font-size:10px;padding:3px 7px;">Scenario demand met</span>';
      return '<tr><td><strong>' + esc(r.product) + '</strong></td>'
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
    ['status', 'product', 'horizon_months', 'budget_pesos', 'minimum_fulfillment_pct', 'demand', 'stock', 'reserve', 'units_per_pack', 'cost_per_pack_pesos', 'supplier_max_packs', 'buy_packs', 'buy_units', 'fulfilled', 'unmet', 'ending_stock', 'spend_pesos', 'binding', 'sector', 'territory', 'checksum'],
    ...r.rows.map(p => ['Scenario allocation for review', safe(p.product), r.assumptions.horizon, r.budget, r.assumptions.minimum_pct, p.demand, p.stock, p.reserve, p.pack, p.pack_cost_cents / 100, p.max_packs, p.purchase_packs, p.purchase_units, p.fulfilled, p.unmet, p.ending_stock, p.spend, p.binding.join('; '), r.assumptions.scope.sector, r.assumptions.scope.territory, r.assumptions.checksum])
  ];

  const url = URL.createObjectURL(new Blob(['\uFEFF' + rows.map(row => row.map(q).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'medshield-allocation-scenario.csv';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
`;
