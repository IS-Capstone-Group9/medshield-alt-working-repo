/**
 * diagnostic-analytics-runtime.ts
 * Frontend UI & client runtime for MedShield Diagnostic Analytics layer.
 *
 * Answering: "Why might sales or demand have changed?"
 * - Price-Volume-Mix (PVM) mathematical decomposition
 * - 2024 to 2025 Sales Surge Root-Cause Investigation
 * - Epistemic status ledger (Confirmed Fact vs Accounting Delta vs Statistical Association vs Unverified Hypothesis)
 * - Customer & Geographic Concentration (HHI)
 */

export const DIAGNOSTIC_MARKUP = String.raw`
<style>
[data-diagnostic-page] { margin-top: 10px; max-width: 100%; box-sizing: border-box; }
[data-diagnostic-page] .diag-hero-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; margin-bottom: 20px; }
[data-diagnostic-page] .diag-card { background: #FFFFFF; border: 1px solid var(--border); border-radius: 10px; padding: 16px 18px; box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04); }
[data-diagnostic-page] .diag-label { font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
[data-diagnostic-page] .diag-val { font-size: 20px; font-weight: 800; color: var(--text-primary); margin: 6px 0 2px 0; }
[data-diagnostic-page] .diag-sub { font-size: 11px; color: var(--text-secondary); }
[data-diagnostic-page] .epistemic-badge { display: inline-block; font-size: 9px; font-weight: 800; padding: 2px 8px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.4px; }
[data-diagnostic-page] .badge-fact { background: #E0F2FE; color: #0369A1; border: 1px solid #BAE6FD; }
[data-diagnostic-page] .badge-delta { background: #ECFDF5; color: #047857; border: 1px solid #A7F3D0; }
[data-diagnostic-page] .badge-corr { background: #FEF3C7; color: #B45309; border: 1px solid #FDE68A; }
[data-diagnostic-page] .badge-hypo { background: #FEE2E2; color: #B91C1C; border: 1px solid #FECACA; }
@media(max-width:900px){[data-diagnostic-page] .diag-hero-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:600px){[data-diagnostic-page] .diag-hero-grid{grid-template-columns:1fr}}
</style>

<div class="chart-card" data-diagnostic-page>
  <div class="chart-header">
    <div>
      <div class="chart-title" style="display:flex;align-items:center;gap:8px;">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        Diagnostic Analytics — Root-Cause &amp; Variance Decomposition
      </div>
      <div class="chart-subtitle">Why did demand and sales change? · Price-Volume-Mix (PVM) decomposition and 2024→2025 surge audit</div>
    </div>
    <div style="display:flex;gap:8px;">
      <button class="btn btn-secondary" onclick="window.exportDiagnosticCSV()" style="font-size:11px;padding:5px 12px;">Export Diagnostic Evidence CSV</button>
    </div>
  </div>

  <!-- Hero KPI Grid -->
  <div class="diag-hero-grid">
    <div class="diag-card">
      <div class="diag-label">2024→2025 Total Delta</div>
      <div class="diag-val" style="color:#0284c7;">+₱65.9M</div>
      <div class="diag-sub">+90.7% audited net sales growth</div>
    </div>
    <div class="diag-card">
      <div class="diag-label">Primary Volume Effect</div>
      <div class="diag-val" style="color:#059669;">₱44.2M</div>
      <div class="diag-sub">67.1% explained by unit expansion</div>
    </div>
    <div class="diag-card">
      <div class="diag-label">Price Realization Effect</div>
      <div class="diag-val" style="color:#d97706;">₱12.8M</div>
      <div class="diag-sub">19.4% driven by average price shift</div>
    </div>
    <div class="diag-card">
      <div class="diag-label">Top Buyer Concentration</div>
      <div class="diag-val" style="color:#4f46e5;">73.6%</div>
      <div class="diag-sub">Government bidding expansion share</div>
    </div>
  </div>

  <!-- 2024-2025 Surge Deep-Dive Section -->
  <div class="chart-card" style="margin-bottom:20px;background:#F8FAFC;border:1px solid var(--border);">
    <div class="chart-header">
      <div>
        <div class="chart-title" style="font-size:14px;">2024 to 2025 Sales Surge Root-Cause Investigation</div>
        <div class="chart-subtitle">Audited accounting breakdown by buyer cluster and top SKU volume drivers</div>
      </div>
      <span class="status-pill status-ready">AUDITED ERP BASELINE</span>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:14px 0;">
      <!-- Buyer Sector Accounting Breakdown -->
      <div style="background:#fff;padding:14px;border-radius:8px;border:1px solid var(--border);">
        <div style="font-size:12px;font-weight:700;color:var(--text-primary);margin-bottom:8px;">Growth Contribution by Buyer Sector</div>
        <table class="product-table" style="font-size:11px;">
          <thead>
            <tr><th>Sector</th><th>2024 Net Sales</th><th>2025 Net Sales</th><th>Growth (₱)</th><th>Share of Growth</th></tr>
          </thead>
          <tbody>
            <tr><td><strong>Government</strong></td><td>₱38.45M</td><td>₱86.94M</td><td style="color:#059669;font-weight:700;">+₱48.49M</td><td><strong>73.6%</strong></td></tr>
            <tr><td><strong>Private Care</strong></td><td>₱28.12M</td><td>₱44.10M</td><td style="color:#059669;font-weight:700;">+₱15.98M</td><td><strong>24.2%</strong></td></tr>
            <tr><td><strong>Internal</strong></td><td>₱4.11M</td><td>₱5.57M</td><td>+₱1.45M</td><td>2.2%</td></tr>
            <tr><td><strong>Unknown</strong></td><td>₱2.00M</td><td>₱2.00M</td><td>₱0.00</td><td>0.0%</td></tr>
          </tbody>
        </table>
      </div>

      <!-- Top SKU Volume Drivers -->
      <div style="background:#fff;padding:14px;border-radius:8px;border:1px solid var(--border);">
        <div style="font-size:12px;font-weight:700;color:var(--text-primary);margin-bottom:8px;">Top 5 Surge SKU Contributors</div>
        <table class="product-table" style="font-size:11px;">
          <thead>
            <tr><th>Product Description</th><th>Volume Delta (Units)</th><th>Revenue Delta (₱)</th><th>Action</th></tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>IV Fluids 1L (D5LR/0.9 NaCl)</strong></td>
              <td>+110,000 packs</td>
              <td style="color:#059669;font-weight:700;">+₱5.54M</td>
              <td><button class="sales-secondary-button" onclick="window.investigateSkuInForecast('IV Fluids 1L')">View Forecast</button></td>
            </tr>
            <tr>
              <td><strong>Paracetamol 500mg Tablets</strong></td>
              <td>+470,000 units</td>
              <td style="color:#059669;font-weight:700;">+₱2.06M</td>
              <td><button class="sales-secondary-button" onclick="window.investigateSkuInForecast('Paracetamol 500mg')">View Forecast</button></td>
            </tr>
            <tr>
              <td><strong>Doxycycline 100mg Capsules</strong></td>
              <td>+150,000 units</td>
              <td style="color:#059669;font-weight:700;">+₱1.48M</td>
              <td><button class="sales-secondary-button" onclick="window.investigateSkuInForecast('Doxycycline 100mg')">View Forecast</button></td>
            </tr>
            <tr>
              <td><strong>Oral Rehydration Salts (ORS)</strong></td>
              <td>+230,000 sachets</td>
              <td style="color:#059669;font-weight:700;">+₱1.23M</td>
              <td><button class="sales-secondary-button" onclick="window.investigateSkuInForecast('ORS')">View Forecast</button></td>
            </tr>
            <tr>
              <td><strong>Salbutamol Nebules 2mg/5ml</strong></td>
              <td>+90,000 nebules</td>
              <td style="color:#059669;font-weight:700;">+₱1.54M</td>
              <td><button class="sales-secondary-button" onclick="window.investigateSkuInForecast('Salbutamol Nebules')">View Forecast</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Epistemic Findings Ledger -->
    <div style="background:#fff;padding:16px;border-radius:8px;border:1px solid var(--border);margin-top:12px;">
      <div style="font-size:12px;font-weight:800;color:var(--text-primary);margin-bottom:10px;text-transform:uppercase;letter-spacing:0.5px;">
        Epistemic Evidence &amp; Causality Classification Ledger
      </div>
      <div style="display:flex;flex-direction:column;gap:10px;">
        <div style="display:flex;gap:12px;align-items:flex-start;padding:8px 0;border-bottom:1px solid var(--border);">
          <span class="epistemic-badge badge-fact">Confirmed Fact</span>
          <div style="font-size:12px;line-height:1.5;color:var(--text-secondary);">
            <strong>Empirical ERP Sales Growth:</strong> Verified net sales expanded by ₱65.9M (+90.7%) between 2024 and 2025 across audited invoice lines in Databricks Gold table.
          </div>
        </div>
        <div style="display:flex;gap:12px;align-items:flex-start;padding:8px 0;border-bottom:1px solid var(--border);">
          <span class="epistemic-badge badge-delta">Accounting Delta</span>
          <div style="font-size:12px;line-height:1.5;color:var(--text-secondary);">
            <strong>PVM &amp; Institutional Expansion:</strong> 73.6% of dollar growth derived from National Government procurement bids; Volume Effect contributed 67.1% and Price Realization contributed 19.4% of total variation.
          </div>
        </div>
        <div style="display:flex;gap:12px;align-items:flex-start;padding:8px 0;border-bottom:1px solid var(--border);">
          <span class="epistemic-badge badge-corr">Statistical Association</span>
          <div style="font-size:12px;line-height:1.5;color:var(--text-secondary);">
            <strong>Weather &amp; Seasonal Timing:</strong> Q3–Q4 volume acceleration corresponds chronologically with regional rainy season peaks (NASA POWER precipitation index r = 0.38).
          </div>
        </div>
        <div style="display:flex;gap:12px;align-items:flex-start;padding:8px 0;">
          <span class="epistemic-badge badge-hypo">Unverified Hypothesis</span>
          <div style="font-size:12px;line-height:1.5;color:var(--text-secondary);">
            <strong>Unproven Epidemic Causality:</strong> Commercial sales records describe delivered billings, not patient diagnoses. Claiming Dengue caseload caused specific hospital orders is unverified without DOH clinical linkage.
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Cross-Module Workflow Guidance Card -->
  <div class="dss-insight-card">
    <div>
      <div class="insight-badge">Decision Support Workflow</div>
      <div class="insight-title">Next Analytical Action: Demand Forecast &amp; Inventory Replenishment</div>
      <div style="line-height:1.6;margin-top:4px;">
        Identified volume-driver therapeutics require forward replenishment planning. Click below to transition from Diagnostic investigation into Predictive quantity forecasting:
      </div>
      <div style="margin-top:12px;display:flex;gap:10px;">
        <button class="btn btn-primary" onclick="window.navigateToForecast()" style="font-size:12px;padding:6px 16px;">
          Proceed to Forecast Modeling &rarr;
        </button>
        <button class="btn btn-secondary" onclick="window.navigateToPrescriptive()" style="font-size:12px;padding:6px 16px;">
          Proceed to Prescriptive Planning &rarr;
        </button>
      </div>
    </div>
  </div>
</div>
`

export const DIAGNOSTIC_SCRIPT = String.raw`
function exportDiagnosticCSV() {
  const csvRows = [
    ['Category', 'Finding / Metric', 'Classification', 'Evidence Basis'],
    ['Total Net Sales Delta', '+₱65,927,149 (+90.7%)', 'CONFIRMED_FACT', 'Databricks Gold Fact 2024 vs 2025'],
    ['Primary Volume Effect', '₱44,230,000 (67.1%)', 'ACCOUNTING_DELTA', 'Price-Volume-Mix Decomposition'],
    ['Price Realization Effect', '₱12,800,000 (19.4%)', 'ACCOUNTING_DELTA', 'Price-Volume-Mix Decomposition'],
    ['Government Sector Growth', '₱48,490,000 (73.6% share)', 'ACCOUNTING_DELTA', 'Buyer Sector Mapping CLI-0002'],
    ['Private Care Sector Growth', '₱15,982,000 (24.2% share)', 'ACCOUNTING_DELTA', 'Territory Pharmacy Aggregates'],
    ['Top SKU Driver: IV Fluids', '+110,000 packs (+₱5.54M)', 'ACCOUNTING_DELTA', 'Delivered DR Quantity Lines'],
    ['Top SKU Driver: Paracetamol', '+470,000 units (+₱2.06M)', 'ACCOUNTING_DELTA', 'Delivered DR Quantity Lines'],
    ['Weather Association', 'Q3-Q4 precipitation correlation r=0.38', 'STATISTICAL_ASSOCIATION', 'NASA POWER Monthly Archive'],
    ['Epidemic Causality Claim', 'Dengue caseload directly drove sales', 'UNVERIFIED_HYPOTHESIS', 'Sales files lack patient clinical diagnoses']
  ];
  const csvContent = csvRows.map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'medshield_diagnostic_pvm_surge_audit.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function investigateSkuInForecast(sku) {
  const forecastNav = document.querySelector('.nav-item[onclick*="forecast"]');
  if (typeof showPage === 'function') showPage('forecast', forecastNav);
  const productInput = document.getElementById('forecastProduct');
  if (productInput) {
    productInput.value = sku;
    if (typeof changeForecastScope === 'function') changeForecastScope('product');
  }
}

function navigateToForecast() {
  const forecastNav = document.querySelector('.nav-item[onclick*="forecast"]');
  if (typeof showPage === 'function') showPage('forecast', forecastNav);
}

function navigateToPrescriptive() {
  const invNav = document.querySelector('.nav-item[onclick*="inventory"]');
  if (typeof showPage === 'function') showPage('inventory', invNav);
}

function setGlobalViewingMode(mode) {
  if (!['actual', 'estimated', 'both'].includes(mode)) return;
  window._medshieldViewingMode = mode;
  try { localStorage.setItem('medshieldViewingMode', mode); } catch (e) {}

  document.querySelectorAll('.view-mode-btn').forEach(function(btn) {
    var text = btn.textContent || '';
    if (mode === 'actual' && text.indexOf('Actual Only') !== -1) btn.classList.add('active');
    else if (mode === 'estimated' && text.indexOf('Estimated Only') !== -1) btn.classList.add('active');
    else if (mode === 'both' && text.indexOf('Actual + Estimated') !== -1) btn.classList.add('active');
    else btn.classList.remove('active');
  });

  window.dispatchEvent(new CustomEvent('medshield:viewing-mode-change', { detail: { mode: mode } }));
  console.log('[MedShield DSS] Global viewing mode set to:', mode);
}
`
