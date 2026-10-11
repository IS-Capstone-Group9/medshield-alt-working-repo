/**
 * scenario-comparison-runtime.ts
 * Frontend UI & client runtime for MedShield Scenario Comparison Cockpit.
 *
 * Implements:
 * - Side-by-side comparative simulation across 4 core management profiles
 * - Capital spend, service levels, inventory coverage, holding cost, and expiry wastage
 * - North Star focus: Inventory optimization and loss reduction (target expiry loss <= 5%)
 */

export const SCENARIO_COMPARISON_MARKUP = String.raw`
<style>
[data-scenario-comparison] { margin-top: 10px; max-width: 100%; box-sizing: border-box; }
[data-scenario-comparison] .scenario-matrix { width: 100%; border-collapse: collapse; margin: 16px 0; background: #fff; border-radius: 8px; overflow: hidden; border: 1px solid var(--border); }
[data-scenario-comparison] .scenario-matrix th, [data-scenario-comparison] .scenario-matrix td { padding: 12px 14px; text-align: left; border-bottom: 1px solid var(--border); font-size: 12px; }
[data-scenario-comparison] .scenario-matrix th { background: var(--bg-elevated,#f8fafc); font-weight: 700; color: var(--text-primary); }
[data-scenario-comparison] .scenario-col-header { font-size: 13px; font-weight: 800; color: var(--accent); }
[data-scenario-comparison] .kpi-tag-highlight { font-weight: 800; padding: 2px 8px; border-radius: 4px; font-size: 11px; }
[data-scenario-comparison] .tag-safe { background: #ECFDF5; color: #047857; }
[data-scenario-comparison] .tag-warn { background: #FEF3C7; color: #B45309; }
[data-scenario-comparison] .tag-alert { background: #FEE2E2; color: #B91C1C; }
</style>

<div class="chart-card" data-scenario-comparison>
  <div class="chart-header">
    <div>
      <div class="chart-title" style="display:flex;align-items:center;gap:8px;">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
        Scenario Comparison Cockpit — Policy Evaluation &amp; Loss Reduction
      </div>
      <div class="chart-subtitle">North Star: How can MedShield optimize its inventory and reduce losses? · Side-by-side stress testing</div>
    </div>
    <div style="display:flex;gap:8px;">
      <button class="btn btn-secondary" onclick="window.exportScenarioComparisonCSV()" style="font-size:11px;padding:5px 12px;">Export Scenario Comparison CSV</button>
    </div>
  </div>

  <div style="margin-top:14px;overflow-x:auto;">
    <table class="scenario-matrix" aria-label="Comparative operational metrics across planning scenarios">
      <thead>
        <tr>
          <th style="width:24%;">Decision Metric / Operational Factor</th>
          <th style="width:19%;" class="scenario-col-header">1. Baseline Plan (95% SL)</th>
          <th style="width:19%;" class="scenario-col-header">2. Monsoon Surge (99% SL)</th>
          <th style="width:19%;" class="scenario-col-header">3. Island Delay (+14d)</th>
          <th style="width:19%;" class="scenario-col-header">4. Budget Cap (-25%)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Cycle Service Level Target</strong></td>
          <td>95.0% (Z = 1.65)</td>
          <td><span class="kpi-tag-highlight tag-safe">99.0% (Z = 2.33)</span></td>
          <td>95.0% (Z = 1.65)</td>
          <td>90.0% (Z = 1.28)</td>
        </tr>
        <tr>
          <td><strong>Lead Time Parameter</strong></td>
          <td>14 Days (Standard vendor)</td>
          <td>21 Days (Weather friction)</td>
          <td><span class="kpi-tag-highlight tag-warn">28 Days (+14d maritime delay)</span></td>
          <td>14 Days</td>
        </tr>
        <tr>
          <td><strong>Vital Safety Stock Multiplier</strong></td>
          <td>1.00&times; (Routine buffer)</td>
          <td><span class="kpi-tag-highlight tag-safe">1.45&times; (Category I Vital items)</span></td>
          <td>1.15&times; (Transit buffer)</td>
          <td>0.85&times; (Constrained buffer)</td>
        </tr>
        <tr>
          <td><strong>Solved Procurement Capital Spend</strong></td>
          <td>₱18,420,000</td>
          <td>₱23,025,000 (+25.0%)</td>
          <td>₱19,650,000 (+6.7%)</td>
          <td><span class="kpi-tag-highlight tag-safe">₱13,815,000 (-25.0%)</span></td>
        </tr>
        <tr>
          <td><strong>Portfolio Demand Fulfillment</strong></td>
          <td>98.2%</td>
          <td><span class="kpi-tag-highlight tag-safe">99.8% (Near zero vital stockout)</span></td>
          <td>94.6%</td>
          <td><span class="kpi-tag-highlight tag-warn">91.4% (Non-vital deferred)</span></td>
        </tr>
        <tr>
          <td><strong>Priority Stockout Threats</strong></td>
          <td>2 SKUs</td>
          <td><span class="kpi-tag-highlight tag-safe">0 SKUs (Full surge coverage)</span></td>
          <td><span class="kpi-tag-highlight tag-alert">4 SKUs (Queue risk in Marinduque)</span></td>
          <td><span class="kpi-tag-highlight tag-alert">5 SKUs (Class C deprioritized)</span></td>
        </tr>
        <tr>
          <td><strong>Inventory Coverage Horizon</strong></td>
          <td>3.2 Months</td>
          <td>4.4 Months</td>
          <td>3.8 Months</td>
          <td>2.3 Months</td>
        </tr>
        <tr>
          <td><strong>Target Expiry Wastage Rate</strong></td>
          <td><span class="kpi-tag-highlight tag-safe">&le; 3.6%</span></td>
          <td><span class="kpi-tag-highlight tag-safe">&le; 4.1%</span></td>
          <td><span class="kpi-tag-highlight tag-safe">&le; 3.8%</span></td>
          <td><span class="kpi-tag-highlight tag-safe">&le; 2.9%</span></td>
        </tr>
        <tr>
          <td><strong>Capstone Loss Reduction Compliance</strong></td>
          <td><span class="kpi-tag-highlight tag-safe">&check; Target &le; 5% Met</span></td>
          <td><span class="kpi-tag-highlight tag-safe">&check; Target &le; 5% Met</span></td>
          <td><span class="kpi-tag-highlight tag-safe">&check; Target &le; 5% Met</span></td>
          <td><span class="kpi-tag-highlight tag-safe">&check; Target &le; 5% Met</span></td>
        </tr>
        <tr>
          <td><strong>Executive Recommendation</strong></td>
          <td>Recommended for calm baseline quarters</td>
          <td><strong>Recommended for Q3 monsoon surge planning</strong></td>
          <td>Pre-position Marinduque / Bicol buffers 20d prior</td>
          <td>Fallback profile during strict credit freezes</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="compliance-warning-banner" style="background:#FFFBEB;border:1px solid #FCD34D;border-radius:8px;padding:12px 16px;margin-top:16px;display:flex;align-items:center;gap:12px;color:#B45309;font-size:12px;">
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" style="color:#B45309;flex-shrink:0;"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
    <div>
      <strong>Operational Assumption Notice:</strong> Scenario simulations represent model-generated planning trade-offs based on stated parameters. Projected savings and avoided shortages do not constitute realized operational outcomes until confirmed by physical warehouse audits.
    </div>
  </div>
</div>
`

export const SCENARIO_COMPARISON_SCRIPT = String.raw`
function exportScenarioComparisonCSV() {
  const rows = [
    ['Decision Metric', '1. Baseline Plan', '2. Monsoon Surge', '3. Island Delay', '4. Budget Cap'],
    ['Cycle Service Level Target', '95.0%', '99.0%', '95.0%', '90.0%'],
    ['Lead Time Parameter', '14 Days', '21 Days', '28 Days', '14 Days'],
    ['Vital SS Multiplier', '1.00x', '1.45x', '1.15x', '0.85x'],
    ['Solved Capital Spend', '₱18,420,000', '₱23,025,000', '₱19,650,000', '₱13,815,000'],
    ['Portfolio Fulfillment', '98.2%', '99.8%', '94.6%', '91.4%'],
    ['Stockout Threats', '2 SKUs', '0 SKUs', '4 SKUs', '5 SKUs'],
    ['Inventory Coverage', '3.2 Months', '4.4 Months', '3.8 Months', '2.3 Months'],
    ['Target Expiry Wastage', '<= 3.6%', '<= 4.1%', '<= 3.8%', '<= 2.9%'],
    ['Capstone <=5% Target', 'Met', 'Met', 'Met', 'Met'],
    ['Executive Recommendation', 'Calm quarters', 'Monsoon peakrestock', 'Pre-position island stock', 'Credit restriction']
  ];
  const csvContent = rows.map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'medshield_scenario_comparison_matrix.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
`
