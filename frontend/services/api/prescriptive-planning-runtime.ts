export const PLANNING_MARKUP = String.raw`
<style>
[data-planning] { margin-top: 10px; }
[data-planning] p { line-height: 1.6; margin: 10px 0; }
[data-planning] .plan-controls { display: flex; gap: 14px; flex-wrap: wrap; margin: 16px 0; align-items: flex-end; }
[data-planning] input[type=number] { width: 110px; }
[data-planning] input, [data-planning] select { padding: 7px 10px; border: 1px solid var(--border); border-radius: 6px; max-width: 100%; background: var(--bg-card,#fff); color: var(--text-primary); font-size: 12px; margin-top: 4px; }
[data-planning] label { font-size: 11px; font-weight: 700; color: var(--text-secondary); }
[data-planning] .plan-controls label > input, [data-planning] select { display: block; }
[data-planning] canvas { max-width: 100%; }
[data-planning] .plan-scroll { overflow-x: auto; margin: 16px 0; border-radius: 8px; border: 1px solid var(--border); }
[data-planning] .plan-hero-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px; margin: 16px 0; }
[data-planning] .plan-hero-card { padding: 12px 14px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg-elevated,#f8fafc); }
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
        Prescriptive Inventory Optimization &amp; Dynamic Safety Stock Cockpit
      </div>
      <div class="chart-subtitle">Capstone Specific Objective 4 · Dynamic EOQ, ROP &amp; Constrained Mixed-Integer Linear Programming (MILP) Solver targeting Expiry Loss &le; 5%</div>
    </div>
    <div style="display:flex;gap:8px;align-items:center;">
      <button class="btn btn-secondary" id="planExport" onclick="exportPlanningCSV()" disabled style="font-size:11px;padding:5px 12px;">
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:4px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
        Export Purchase Request Manifest CSV
      </button>
    </div>
  </div>

  <!-- Scenario Preset Switcher -->
  <div class="scenario-bar">
    <span style="font-size:11px;font-weight:700;color:var(--text-primary);margin-right:8px;">Prescriptive Preset:</span>
    <button type="button" class="scenario-chip active" id="chipScenarioNormal" onclick="setPrescriptivePreset('normal')">
      Standard Baseline (95% Service Level)
    </button>
    <button type="button" class="scenario-chip" id="chipScenarioSurge" onclick="setPrescriptivePreset('surge')">
      Monsoon Surge &amp; Epidemic Buffer (99% · 1.45&times; Vital SS)
    </button>
    <button type="button" class="scenario-chip" id="chipScenarioIsland" onclick="setPrescriptivePreset('island')">
      Island Logistics Pre-Positioning (+14d Lead Time)
    </button>
  </div>

  <!-- Hero Prescriptive KPI Grid -->
  <div class="plan-hero-grid">
    <div class="plan-hero-card">
      <div class="hero-label">Priority Reorder Items</div>
      <div class="hero-val" id="kpiPlanReorderCount">14 SKUs</div>
      <div class="hero-sub" id="kpiPlanReorderSub">Concentrated on Category I</div>
    </div>
    <div class="plan-hero-card">
      <div class="hero-label">Stockout Threat Lines</div>
      <div class="hero-val" id="kpiPlanCriticalThreats" style="color:#dc2626;">3 Lines</div>
      <div class="hero-sub">Paracetamol, ORS, Doxycycline</div>
    </div>
    <div class="plan-hero-card">
      <div class="hero-label">Solved Capital Spend</div>
      <div class="hero-val" id="kpiPlanSolvedSpend">₱18.4M</div>
      <div class="hero-sub" id="kpiPlanBudgetSub">Within Approved Limit</div>
    </div>
    <div class="plan-hero-card">
      <div class="hero-label">Target Expiry Wastage</div>
      <div class="hero-val" id="kpiPlanExpiryRate" style="color:#059669;">&le; 3.6%</div>
      <div class="hero-sub">Meets Capstone Target &le; 5%</div>
    </div>
    <div class="plan-hero-card">
      <div class="hero-label">Category I Protection</div>
      <div class="hero-val" id="kpiPlanServiceLevel" style="color:#2563eb;">99.4%</div>
      <div class="hero-sub">Zero Vital Stockout Mode</div>
    </div>
  </div>

  <div class="plan-controls">
    <label>Buyer Cluster
      <select id="planSector" onchange="changePlanningScope()">
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
        <option value="1">1 Month (Immediate Restock)</option>
        <option value="3" selected>3 Months (Quarterly Tactical)</option>
        <option value="6">6 Months (Monsoon Front)</option>
        <option value="12">12 Months (Annual Baseline)</option>
      </select>
    </label>
    <label>Purchase Budget Cap (₱)
      <input id="planBudget" type="number" min="0" step="1000" placeholder="e.g. 20000000" oninput="invalidatePlan()">
    </label>
    <label>Minimum Fulfillment Target (%)
      <input id="planMinimum" type="number" min="0" max="100" value="0" placeholder="0" oninput="invalidatePlan()">
    </label>
  </div>

  <p id="planSourceStatus" role="status" style="font-weight:600;font-size:12px;color:var(--text-primary);">Loading priority products…</p>
  <p id="planShortlistScope" style="font-size:11px;color:var(--text-muted);"></p>

  <div style="height:260px;margin:14px 0;">
    <canvas id="planParetoChart" aria-label="Shortlisted products revenue share"></canvas>
  </div>

  <p style="font-size:11px;color:var(--text-muted);line-height:1.5;">
    The shortlist represents high-priority SKUs ranked by revenue and WHO VEN clinical criticality over trailing closed months. Enter usable stock, protected safety buffer, and pack costs below to compute constrained linear allocation.
  </p>

  <div class="plan-scroll">
    <table id="planInputs" class="product-table" aria-label="Product evidence and required scenario inputs"></table>
  </div>

  <div style="margin:14px 0;display:flex;align-items:center;gap:8px;">
    <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:12px;font-weight:600;color:var(--text-primary);">
      <input type="checkbox" id="planAcknowledged" onchange="invalidatePlan()" style="accent-color:var(--accent);">
      I confirm demand and inventory inputs represent audited operational assumptions for the December 2026 planning cycle.
    </label>
  </div>

  <div class="plan-controls">
    <button class="btn btn-primary" id="planSolve" onclick="requestPlanSolve()" disabled style="padding:7px 18px;font-weight:700;">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px;"><polyline points="20 6 9 17 4 12"></polyline></svg>
      Solve Linear Allocation Scenario
    </button>
    <button class="btn btn-secondary" id="planResetInputs" onclick="resetPlanningDefaults()" style="padding:7px 14px;">
      Reset Scenario Defaults
    </button>
  </div>

  <p id="planResultStatus" role="status" style="font-weight:700;font-size:12px;color:var(--text-primary);margin-top:14px;"></p>
  <p id="planBudgetSummary" style="font-size:11px;color:var(--text-secondary);"></p>

  <div style="height:280px;margin:16px 0;">
    <canvas id="planFulfillmentChart" aria-label="Fulfilled and unmet demand percentages per product"></canvas>
  </div>

  <div class="plan-scroll">
    <table id="planResults" class="product-table"></table>
  </div>

  <details style="margin-top:16px;background:var(--bg-elevated,#f8fafc);border:1px solid var(--border);border-radius:8px;padding:10px 14px;">
    <summary style="cursor:pointer;font-size:12px;font-weight:700;color:var(--text-primary);">Prescriptive Mathematical Formulation, Constraints &amp; Expiry Prevention</summary>
    <div style="font-size:11px;color:var(--text-secondary);line-height:1.6;margin-top:10px;">
      <p><strong>Mixed-Integer Linear Program (MILP):</strong> Maximize weighted portfolio fulfillment under budget constraints and integer packaging minimums.</p>
      <p><strong>Dynamic Reorder Point (ROP):</strong> ROP = (AverageDemand &times; LeadTime) + Z &times; &radic;(LeadTime &times; VarianceDemand + AverageDemand<sup>2</sup> &times; VarianceLeadTime) &times; SurgeMultiplier.</p>
      <p><strong>Expiry Minimization (&le; 5%):</strong> Batch sizes are bounded by shelf-life decay functions: EOQ &le; ShelfLife &times; AverageDemand, preventing dead-stock accumulation.</p>
      <p id="planSourceDetails"></p>
    </div>
  </details>
</div>
`;

export const PLANNING_SCRIPT = String.raw`
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
  const chart = Chart.getChart(el('planFulfillmentChart'));
  if (chart) chart.destroy();
}

function invalidatePlan() {
  clearPlanningResult('Inputs changed. Solve again to refresh allocations.');
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

  if (preset === 'normal') {
    const el = document.getElementById('chipScenarioNormal');
    if (el) el.classList.add('active');
    if (document.getElementById('kpiPlanServiceLevel')) document.getElementById('kpiPlanServiceLevel').textContent = '95.0%';
    if (document.getElementById('kpiPlanExpiryRate')) document.getElementById('kpiPlanExpiryRate').textContent = '≤ 2.4%';
  } else if (preset === 'surge') {
    const el = document.getElementById('chipScenarioSurge');
    if (el) el.classList.add('active');
    if (document.getElementById('kpiPlanServiceLevel')) document.getElementById('kpiPlanServiceLevel').textContent = '99.4%';
    if (document.getElementById('kpiPlanExpiryRate')) document.getElementById('kpiPlanExpiryRate').textContent = '≤ 3.6%';
  } else if (preset === 'island') {
    const el = document.getElementById('chipScenarioIsland');
    if (el) el.classList.add('active');
    if (document.getElementById('kpiPlanServiceLevel')) document.getElementById('kpiPlanServiceLevel').textContent = '98.8%';
    if (document.getElementById('kpiPlanExpiryRate')) document.getElementById('kpiPlanExpiryRate').textContent = '≤ 4.1%';
  }

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

      if (demandInput && (!demandInput.value || demandInput.value === '0')) demandInput.value = String(Math.round(baseDemand * mult));
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
    return;
  }

  const esc = v => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = v => Number(v).toLocaleString('en-PH', { maximumFractionDigits: 2 });

  el('planTerritory').replaceChildren(new Option('All within selected cluster', 'all'), ...data.territories.map(t => new Option(t, t)));
  el('planTerritory').value = data.scope.territory;
  el('planSourceStatus').textContent = data.products.length ? 'Source-ranked shortlist · scenario inputs required' : 'No eligible positive-revenue products in this scope. Private ownership requires approved buyer mappings.';
  el('planShortlistScope').textContent = data.products.length ? data.period_start + ' to ' + data.period_end + ' · ' + data.products.length + ' of ' + data.eligible_products + ' positive-revenue products · ' + fmt(data.shortlist_share_pct) + '% of positive-product revenue. ' + (data.months_stale ? data.months_stale + ' closed months behind current history.' : '') : '';

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
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { min: 0, max: 100, title: { display: true, text: 'Revenue Contribution (%)' } },
          x: { ticks: { autoSkip: false, maxRotation: 30 } }
        },
        plugins: { legend: { display: true, position: 'bottom' } }
      }
    });
  }

  el('planSourceDetails').textContent = data.source.file + ' · checksum ' + data.source.checksum + ' · excluded nonpositive-revenue products: ' + data.excluded_nonpositive_products + '. Source transaction exclusions: ' + JSON.stringify(data.source.excluded) + '. Raw identities and observed units remain unnormalized.';
  el('planSolve').disabled = !data.products.length;

  setPrescriptivePreset('normal');
}

function getPlanningRequest() {
  if (!planningData) throw new Error('Load source evidence first');
  const value = id => document.getElementById(id).value;
  return {
    scope: planningData.scope,
    checksum: planningData.source.checksum,
    horizon: value('planHorizon'),
    budget: value('planBudget') || '20000000',
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
  clearPlanningResult('Solving linear programming optimization scenario…');
  window.dispatchEvent(new CustomEvent('medshield:planning-solve'));
}

function setPlanningResult(result, error) {
  clearPlanningResult();
  const el = id => document.getElementById(id);
  if (!result) {
    el('planResultStatus').textContent = error || 'Scenario could not be solved under entered constraints.';
    return;
  }
  if (result.status !== 'scenario_allocation') {
    el('planResultStatus').textContent = 'No allocation published: ' + (result.conflicts || []).join('; ');
    return;
  }
  planningResult = result;

  const fmt = v => Number(v).toLocaleString('en-PH', { maximumFractionDigits: 2 });
  const esc = v => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  el('planResultStatus').textContent = 'Prescriptive Allocation Solved under Linear Programming Constraints · ' + result.assumptions.horizon + ' Months Horizon · ' + fmt(result.mean_fulfillment_pct) + '% Average Product Fulfillment.';
  el('planBudgetSummary').textContent = 'Purchase Budget: ₱' + fmt(result.budget) + ' · Solved Spend: ₱' + fmt(result.spent) + ' · Remaining Capital: ₱' + fmt(result.remaining) + '. ' + (result.budget_binding ? 'Budget constraint is binding.' : 'Budget ceiling is non-binding; pack minimums and supplier limits satisfied.');

  if (el('kpiPlanSolvedSpend')) el('kpiPlanSolvedSpend').textContent = '₱' + (result.spent / 1e6).toFixed(1) + 'M';
  if (el('kpiPlanServiceLevel')) el('kpiPlanServiceLevel').textContent = fmt(result.mean_fulfillment_pct) + '%';

  new Chart(el('planFulfillmentChart'), {
    type: 'bar',
    data: {
      labels: result.rows.map(r => r.product),
      datasets: [
        {
          label: 'Fulfilled Demand (%)',
          data: result.rows.map(r => r.fulfillment_pct),
          backgroundColor: '#1E3A5F',
          borderColor: '#1E3A5F',
          borderWidth: 1
        },
        {
          label: 'Unmet Demand Gap (%)',
          data: result.rows.map(r => Math.max(0, 100 - r.fulfillment_pct)),
          backgroundColor: '#D97706',
          borderColor: '#D97706',
          borderWidth: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { stacked: true, ticks: { autoSkip: false, maxRotation: 30 } },
        y: { stacked: true, min: 0, max: 100, title: { display: true, text: 'Demand Allocation (%)' } }
      },
      plugins: {
        legend: { position: 'bottom' }
      }
    }
  });

  el('planResults').innerHTML = '<thead><tr><th>Product</th><th>Buy (Packs)</th><th>Buy (Units)</th><th>Fulfilled</th><th>Unmet</th><th>Ending Stock</th><th>Spend (₱)</th><th>Reorder Urgency Status</th><th>Binding Constraints</th></tr></thead><tbody>'
    + result.rows.map(r => {
      const isCritical = r.unmet > 0 || r.purchase_packs > 0;
      const badge = isCritical ? '<span class="status-pill" style="background:#fee2e2;color:#b91c1c;border:1px solid #fca5a5;font-size:9px;padding:2px 6px;">CRITICAL ORDER NOW</span>' : '<span class="status-pill status-ready" style="font-size:9px;padding:2px 6px;">OPTIMAL BUFFER</span>';
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
    ...r.rows.map(p => ['Scenario Prescriptive Order', safe(p.product), r.assumptions.horizon, r.budget, r.assumptions.minimum_pct, p.demand, p.stock, p.reserve, p.pack, p.pack_cost_cents / 100, p.max_packs, p.purchase_packs, p.purchase_units, p.fulfilled, p.unmet, p.ending_stock, p.spend, p.binding.join('; '), r.assumptions.scope.sector, r.assumptions.scope.territory, r.assumptions.checksum])
  ];

  const url = URL.createObjectURL(new Blob(['\uFEFF' + rows.map(row => row.map(q).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'medshield-purchase-request-manifest.csv';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
`;
