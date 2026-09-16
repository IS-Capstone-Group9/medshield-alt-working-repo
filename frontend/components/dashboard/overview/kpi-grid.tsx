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
        <div className="kpi-value" id="kpiOverviewTotalRevenue">₱438.9M</div>
        <div className="kpi-card-footer">
          <div className="kpi-sub">Audited historical sales</div>
          <span className="kpi-tag up" id="kpiOverviewGrowthTag">+224% (2021–2025)</span>
        </div>
      </Card>

      {/* 2. Rolling Forecast Start Card */}
      <Card className="kpi-card kpi-card-forecast">
        <div className="kpi-card-header">
          <span className="kpi-label">2026 Forecast Start</span>
          <div className="kpi-icon-badge" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v18h18" />
              <path d="m19 9-5 5-4-4-3 3" />
            </svg>
          </div>
        </div>
        <div className="kpi-value">
          ₱9.3M <span className="kpi-ci-chip">(±12.4% CI)</span>
        </div>
        <div className="kpi-card-footer">
          <div className="kpi-sub">Jan projected baseline</div>
          <span className="kpi-tag neutral">Prophet ML</span>
        </div>
      </Card>

      {/* 3. Peak Demand Season Card */}
      <Card className="kpi-card kpi-card-season">
        <div className="kpi-card-header">
          <span className="kpi-label">Peak Demand Season</span>
          <div className="kpi-icon-badge" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
        </div>
        <div className="kpi-value">May &amp; Nov</div>
        <div className="kpi-card-footer">
          <div className="kpi-sub">Highest seasonal lift</div>
          <span className="kpi-tag neutral">Bi-modal Peak</span>
        </div>
      </Card>

      {/* 4. Top Territory Share Card */}
      <Card className="kpi-card kpi-card-territory">
        <div className="kpi-card-header">
          <span className="kpi-label">Top Territory Share</span>
          <div className="kpi-icon-badge" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
        </div>
        <div className="kpi-value">Government</div>
        <div className="kpi-card-footer">
          <div className="kpi-sub">Primary allocation sector</div>
          <span className="kpi-tag neutral">69.9% Volume</span>
        </div>
      </Card>
    </div>
  )
}
