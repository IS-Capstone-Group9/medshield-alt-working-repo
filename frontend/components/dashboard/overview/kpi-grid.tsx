import { Card } from '@/components/ui/card'

export function KpiGrid() {
  return (
    <div className="kpi-grid">
      {/* 1. Cumulative Revenue Card */}
      <Card className="kpi-card kpi-card-revenue">
        <div className="kpi-card-header">
          <span className="kpi-label">Total Cumulative Revenue</span>
          <div className="kpi-icon-badge" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="M6 10h12M6 14h8" />
              <circle cx="17" cy="14" r="1.5" fill="currentColor" />
            </svg>
          </div>
        </div>
        <div className="kpi-value" id="kpiOverviewTotalRevenue">Loading…</div>
        <div className="kpi-card-footer">
          <div className="kpi-sub">Historical sales from Databricks Gold</div>
          <span className="kpi-tag neutral" id="kpiOverviewGrowthTag">Candidate data</span>
        </div>
      </Card>

      {/* 2. Rolling Forecast Start Card */}
      <Card className="kpi-card kpi-card-forecast">
        <div className="kpi-card-header">
          <span className="kpi-label">Predictive Forecast</span>
          <div className="kpi-icon-badge" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v18h18" />
              <path d="m19 9-5 5-4-4-3 3" />
            </svg>
          </div>
        </div>
        <div className="kpi-value">
          Not published
        </div>
        <div className="kpi-card-footer">
          <div className="kpi-sub">Approved model evidence required</div>
          <span className="kpi-tag neutral">Baseline validation only</span>
        </div>
      </Card>

      {/* 3. Peak Demand Season Card */}
      <Card className="kpi-card kpi-card-season">
        <div className="kpi-card-header">
          <span className="kpi-label">Seasonality</span>
          <div className="kpi-icon-badge" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
        </div>
        <div className="kpi-value">Review trends</div>
        <div className="kpi-card-footer">
          <div className="kpi-sub">Use the selected historical period</div>
          <span className="kpi-tag neutral">Observed sales only</span>
        </div>
      </Card>

      {/* 4. Top Territory Share Card */}
      <Card className="kpi-card kpi-card-territory">
        <div className="kpi-card-header">
          <span className="kpi-label">Buyer Geography</span>
          <div className="kpi-icon-badge" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
        </div>
        <div className="kpi-value">Derived mapping</div>
        <div className="kpi-card-footer">
          <div className="kpi-sub">Owner review is pending</div>
          <span className="kpi-tag neutral">Candidate only</span>
        </div>
      </Card>
    </div>
  )
}
