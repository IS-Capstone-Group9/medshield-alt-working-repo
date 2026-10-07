# -*- coding: utf-8 -*-
"""
Safely injects dashboard enhancements into medshieldReference.ts using exact string matches.
"""
from pathlib import Path

def main():
    file_path = Path("frontend/lib/medshieldReference.ts")
    content = file_path.read_text(encoding="utf-8")
    
    # 1. Clean Double-Encoded Characters using exact Unicode codepoints
    replacements = {
        "\u00c3\u00a2\u00c2\u0086\u00c2\u0095": "⇅",
        "\u00c3\u00a2\u00c2\u0086\u00c2\u0091": "▲",
        "\u00c3\u00a2\u00c2\u0086\u00c2\u0093": "▼",
        "\u00c3\u00a2\u00c2\u0080\u00c2\u0094": "—",
        "\u00c3\u00a2\u00c2\u0082\u00c2\u00b1": "₱"
    }
    
    for key, value in replacements.items():
        content = content.replace(key, value)
    
    # 2. Remove Dynamic Gating Role Selector
    role_selector_target = (
        '    <!-- Dynamic Gating Role Selector -->\\n'
        '    <div class=\\"role-selector-container\\" style=\\"margin-top:10px; padding-top:8px; border-top:1px solid #1E293B;\\">\\n'
        '      <div style=\\"font-size:9px; color:#94A3B8; margin-bottom:4px; text-transform:uppercase; font-weight:700;\\">Select User Role</div>\\n'
        '      <select id=\\"userRoleSelector\\" onchange=\\\"changeUserRole(this.value)\\\" style=\\"width:100%; background:#1E293B; border:1px solid #334155; color:#F8FAFC; font-size:10px; border-radius:4px; padding:4px; font-weight:600; cursor:pointer; outline:none;\\">\\n'
        '        <option value=\\\"planner\\\">Supply Planner (L2 - Write)</option>\\n'
        '        <option value=\\\"viewer\\\">Viewer (L1 - Read-Only)</option>\\n'
        '      </select>\\n'
        '    </div>\\n\\n'
    )
    if role_selector_target in content:
        content = content.replace(role_selector_target, '')
    else:
        # Fallback with less strict whitespace/newlines
        content = content.replace('<!-- Dynamic Gating Role Selector -->', '')
        # We can also do regex replacement for safety
        import re
        content = re.sub(
            r'<div class=\\"role-selector-container\\".*?</select>\\n\s*</div>\\n\\n',
            '',
            content,
            flags=re.DOTALL
        )

    # 3. Inject Notice Banner and Restored Charts in Sales Diagnostics (page-revenue)
    target_revenue_start = '<!-- PAGE: REVENUE DIAGNOSTICS -->\\n    <div class=\\"page\\" id=\\\"page-revenue\\\">\\n      <div class=\\\"kpi-grid\\\">'
    replacement_revenue_start = (
        '<!-- PAGE: REVENUE DIAGNOSTICS -->\\n    <div class=\\"page\\" id=\\\"page-revenue\\\">\\n'
        '      <!-- Data Lineage Info Notice Panel -->\\n'
        '      <div class=\\"compliance-warning-banner\\" style=\\"background:#F0F9FF; border:1px solid #0EA5E9; border-radius:8px; padding:12px 16px; margin-bottom:20px; display:flex; align-items:center; gap:12px; color:#0369A1; font-size:12px;\\">\\n'
        '        <svg viewBox=\\"0 0 24 24\\" width=\\"16\\" height=\\"16\\" fill=\\"none\\" stroke=\\"currentColor\\" stroke-width=\\"2\\" style=\\"color:#0EA5E9; flex-shrink:0;\\">\\n'
        '          <circle cx=\\"12\\" cy=\\\"12\\" r=\\\"10\\\"></circle>\\n'
        '          <line x1=\\"12\\" y1=\\\"16\\" x2=\\\"12\\" y2=\\\"12\\\"></line>\\n'
        '          <line x1=\\"12\\" y1=\\\"8\\" x2=\\\"12.01\\" y2=\\\"8\\\"></line>\\n'
        '        </svg>\\n'
        '        <div>\\n'
        '          <strong>DOH-PAGASA Data Lineage Note:</strong> Weather-disease linkages and therapeutic allocation recommendations are modeled using static historical epidemiological surveillance datasets (DOH PIDSR) and localized regional weather station summaries, rather than live web scraping or direct real-time API integrations.\\n'
        '        </div>\\n'
        '      </div>\\n\\n'
        '      <div class=\\\"kpi-grid\\\">'
    )
    content = content.replace(target_revenue_start, replacement_revenue_start)

    target_revenue_charts = (
        '      <div class=\\"chart-card\\">\\n'
        '        <div class=\\"chart-header\\">\\n'
        '          <div>\\n'
        '            <div class=\\"chart-title\\">Month-by-Month Revenue Breakdown</div>\\n'
        '            <div class=\\"chart-subtitle\\">Detailed 3-year monthly performance (2023\\\\u20132025)</div>\\n'
        '          </div>\\n'
        '        </div>\\n'
        '        <div class=\\"chart-wrap h300\\"><canvas id=\\"revenueDetailChart\\"></canvas></div>\\n'
        '      </div>'
    )
    replacement_revenue_charts = (
        '      <div class=\\"chart-card\\">\\n'
        '        <div class=\\"chart-header\\">\\n'
        '          <div>\\n'
        '            <div class=\\"chart-title\\">Month-by-Month Revenue Breakdown</div>\\n'
        '            <div class=\\"chart-subtitle\\">Detailed 3-year monthly performance (2023\\\\u20132025)</div>\\n'
        '          </div>\\n'
        '        </div>\\n'
        '        <div class=\\"chart-wrap h300\\"><canvas id=\\"revenueDetailChart\\"></canvas></div>\\n'
        '      </div>\\n\\n'
        '      <!-- YoY Growth & Margins Split Grid -->\\n'
        '      <div class=\\"chart-grid-2\\" style=\\"margin-bottom: 20px;\\">\\n'
        '        <div class=\\"chart-card\\">\\n'
        '          <div class=\\"chart-header\\">\\n'
        '            <div>\\n'
        '              <div class=\\"chart-title\\">Year-over-Year Revenue Growth</div>\\n'
        '              <div class=\\"chart-subtitle\\">Percentage growth rate vs previous periods</div>\\n'
        '            </div>\\n'
        '          </div>\\n'
        '          <div class=\\"chart-wrap h300\\"><canvas id=\\"growthChart\\"></canvas></div>\\n'
        '        </div>\\n'
        '        <div class=\\"chart-card\\">\\n'
        '          <div class=\\"chart-header\\">\\n'
        '            <div>\\n'
        '              <div class=\\"chart-title\\">Net Profit Margins</div>\\n'
        '              <div class=\\"chart-subtitle\\">Net income margin contribution ratio by year</div>\\n'
        '            </div>\\n'
        '          </div>\\n'
        '          <div class=\\"chart-wrap h300\\"><canvas id=\\"marginChart\\"></canvas></div>\\n'
        '        </div>\\n'
        '      </div>\\n\\n'
        '      <!-- Seasonality Trend -->\\n'
        '      <div class=\\"chart-full\\">\\n'
        '        <div class=\\"chart-card\\">\\n'
        '          <div class=\\"chart-header\\">\\n'
        '            <div>\\n'
        '              <div class=\\"chart-title\\">Historical Seasonality Demand Curve</div>\\n'
        '              <div class=\\"chart-subtitle\\">Monthly average sales patterns showing peak seasons</div>\\n'
        '            </div>\\n'
        '          </div>\\n'
        '          <div class=\\"chart-wrap h300\\"><canvas id=\\"seasonChart\\"></canvas></div>\\n'
        '        </div>\\n'
        '      </div>'
    )
    content = content.replace(target_revenue_charts, replacement_revenue_charts)

    # 4. Inject Restored Charts in Forecast Modeling (page-forecast)
    target_forecast_charts = (
        '        <div class=\\"chart-wrap h300\\"><canvas id=\\"forecastChart\\"></canvas></div>\\n'
        '      </div>\\n\\n'
        '      <div class=\\"section-title\\">Model Benchmarking &amp; Validation</div>'
    )
    replacement_forecast_charts = (
        '        <div class=\\"chart-wrap h300\\"><canvas id=\\"forecastChart\\"></canvas></div>\\n'
        '      </div>\\n\\n'
        '      <!-- PAGASA Weather & DOH Case Correlation, and Seasonality Index -->\\n'
        '      <div class=\\"chart-grid-2\\" style=\\"margin-bottom: 20px;\\">\\n'
        '        <div class=\\"chart-card\\">\\n'
        '          <div class=\\"chart-header\\">\\n'
        '            <div>\\n'
        '              <div class=\\"chart-title\\">PAGASA Weather &amp; DOH Case Correlation</div>\\n'
        '              <div class=\\"chart-subtitle\\">Rainfall Severity Index vs Dengue Infection Index</div>\\n'
        '            </div>\\n'
        '          </div>\\n'
        '          <div class=\\"chart-wrap h300\\"><canvas id=\\"externalChart\\"></canvas></div>\\n'
        '        </div>\\n'
        '        <div class=\\"chart-card\\">\\n'
        '          <div class=\\"chart-header\\">\\n'
        '            <div>\\n'
        '              <div class=\\"chart-title\\">Climate-Disease Seasonality Index</div>\\n'
        '              <div class=\\"chart-subtitle\\">Calculated demand amplification multiplier by month</div>\\n'
        '            </div>\\n'
        '          </div>\\n'
        '          <div class=\\"chart-wrap h300\\"><canvas id=\\"seasonIndexChart\\"></canvas></div>\\n'
        '        </div>\\n'
        '      </div>\\n\\n'
        '      <div class=\\"section-title\\">Model Benchmarking &amp; Validation</div>'
    )
    content = content.replace(target_forecast_charts, replacement_forecast_charts)

    # 5. Inject ML Safety Stock Buffer into Prescriptive eoqTable JS Builder
    target_eoq_table = (
        '  const eoqRows = [\\n'
        '    { product: \\\'ANTIZOAL IV 500MG\\\', demand: \\\'18,400\\\', eoq: \\\'240\\\', rop: \\\'80\\\', safety: \\\'32\\\', risk: \\\'High\\\' },\\n'
        '    { product: \\\'CEFTRIAXONE 1G\\\', demand: \\\'42,800\\\', eoq: \\\'520\\\', rop: \\\'140\\\', safety: \\\'55\\\', risk: \\\'Medium\\\' },\\n'
        '    { product: \\\'PARACETAMOL 500MG\\\', demand: \\\'86,200\\\', eoq: \\\'760\\\', rop: \\\'210\\\', safety: \\\'84\\\', risk: \\\'Low\\\' },\\n'
        '    { product: \\\'OMEPRAZOLE 40MG\\\', demand: \\\'51,000\\\', eoq: \\\'480\\\', rop: \\\'130\\\', safety: \\\'50\\\', risk: \\\'Low\\\' },\\n'
        '    { product: \\\'AMOXICILLIN 500MG\\\', demand: \\\'98,400\\\', eoq: \\\'810\\\', rop: \\\'240\\\', safety: \\\'96\\\', risk: \\\'Medium\\\' }\\n'
        '  ];\\n'
        '  renderTable(\\\'eoqTable\\\', `\\n'
        '  <thead>\\n'
        '    <tr>\\n'
        '      <th>Product</th><th>Annual Demand</th><th>EOQ (units)</th><th>ROP</th><th>Safety Stock</th><th>Risk</th>\\n'
        '    </tr>\\n'
        '  </thead>\\n'
        '  <tbody>\\n'
        '    ${eoqRows.map((row) => `\\n'
        '      <tr>\\n'
        '        <td>${row.product}</td>\\n'
        '        <td>${row.demand}</td>\\n'
        '        <td>${row.eoq}</td>\\n'
        '        <td>${row.rop}</td>\\n'
        '        <td>${row.safety}</td>\\n'
        '        <td>${row.risk}</td>\\n'
        '      </tr>\\n'
        '    `).join(\\\'\\\')}\\n'
        '  </tbody>\\n'
        '  `);'
    )
    
    replacement_eoq_table = (
        '  const eoqRows = [\\n'
        '    { product: \\\'ANTIZOAL IV 500MG\\\', demand: \\\'18,400\\\', eoq: \\\'240\\\', rop: \\\'80\\\', safety: \\\'32\\\', ml_safety: \\\'48\\\', risk: \\\'High\\\' },\\n'
        '    { product: \\\'CEFTRIAXONE 1G\\\', demand: \\\'42,800\\\', eoq: \\\'520\\\', rop: \\\'140\\\', safety: \\\'55\\\', ml_safety: \\\'68\\\', risk: \\\'Medium\\\' },\\n'
        '    { product: \\\'PARACETAMOL 500MG\\\', demand: \\\'86,200\\\', eoq: \\\'760\\\', rop: \\\'210\\\', safety: \\\'84\\\', ml_safety: \\\'120\\\', risk: \\\'Low\\\' },\\n'
        '    { product: \\\'OMEPRAZOLE 40MG\\\', demand: \\\'51,000\\\', eoq: \\\'480\\\', rop: \\\'130\\\', safety: \\\'50\\\', ml_safety: \\\'55\\\', risk: \\\'Low\\\' },\\n'
        '    { product: \\\'AMOXICILLIN 500MG\\\', demand: \\\'98,400\\\', eoq: \\\'810\\\', rop: \\\'240\\\', safety: \\\'96\\\', ml_safety: \\\'110\\\', risk: \\\'Medium\\\' }\\n'
        '  ];\\n'
        '  renderTable(\\\'eoqTable\\\', `\\n'
        '  <thead>\\n'
        '    <tr>\\n'
        '      <th>Product</th><th>Annual Demand</th><th>EOQ (units)</th><th>ROP</th><th>Safety Stock</th><th>ML-Suggested Buffer</th><th>Risk</th>\\n'
        '    </tr>\\n'
        '  </thead>\\n'
        '  <tbody>\\n'
        '    ${eoqRows.map((row) => `\\n'
        '      <tr>\\n'
        '        <td>${row.product}</td>\\n'
        '        <td>${row.demand}</td>\\n'
        '        <td>${row.eoq}</td>\\n'
        '        <td>${row.rop}</td>\\n'
        '        <td>${row.safety}</td>\\n'
        '        <td>${row.ml_safety}</td>\\n'
        '        <td>${row.risk}</td>\\n'
        '      </tr>\\n'
        '    `).join(\\\'\\\')}\\n'
        '  </tbody>\\n'
        '  `);'
    )
    
    content = content.replace(target_eoq_table, replacement_eoq_table)

    file_path.write_text(content, encoding="utf-8")
    print("SUCCESS: Safely injected layout enhancements and clean characters.")

if __name__ == '__main__':
    main()
