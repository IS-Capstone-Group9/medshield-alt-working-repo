import { Card } from '@/components/ui/card'

export function KpiGrid() {
  return (
    <div className="kpi-grid">
      <Card>
        <div className="kpi-label">Total Cumulative Revenue</div>
        <div className="kpi-value">₱438.9M</div>
        <span className="kpi-tag up">+224% growth (2021–2025)</span>
      </Card>
      <Card>
        <div className="kpi-label">2026 Forecast Start</div>
        <div className="kpi-value">
          ₱9.3M <span style={{ fontSize: '11px', fontWeight: 'normal', color: 'var(--text-muted)' }}>(±12.4% CI)</span>
        </div>
        <div className="kpi-sub">Jan projected demand</div>
      </Card>
      <Card>
        <div className="kpi-label">Peak Demand Season</div>
        <div className="kpi-value">May &amp; Nov</div>
        <div className="kpi-sub">Highest seasonal lift</div>
      </Card>
      <Card>
        <div className="kpi-label">Top Territory Share</div>
        <div className="kpi-value">Government</div>
        <div className="kpi-sub">Primary allocation sector</div>
      </Card>
    </div>
  )
}
