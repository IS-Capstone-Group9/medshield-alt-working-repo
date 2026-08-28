import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export function StatusSplit() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
      <Card>
        <div className="chart-header">
          <div>
            <div className="chart-title">Model Publication Status</div>
            <div className="chart-subtitle">Calibration status of current DSS layer models</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: '12px', fontWeight: 600 }}>Descriptive Analytics Model</span>
            <Badge status="ready" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: '12px', fontWeight: 600 }}>Predictive Time-Series Model (Prophet)</span>
            <Badge status="draft" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
            <span style={{ fontSize: '12px', fontWeight: 600 }}>Prescriptive Buffer Model (EOQ/ROP)</span>
            <Badge status="ready" />
          </div>
        </div>
      </Card>

      <Card>
        <div className="chart-header">
          <div>
            <div className="chart-title">Active Decision Focus</div>
            <div className="chart-subtitle">High-priority compliance and stock-out alerts</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '11px', padding: '8px 12px', borderRadius: '6px', background: '#fef2f2', border: '1px solid #fca5a5', color: '#b91c1c', fontWeight: 600 }}>
            CRITICAL: Stock-out threat on Systemic Antipyretics (Non-NSAID) during monsoon peak.
          </div>
          <div style={{ fontSize: '11px', padding: '8px 12px', borderRadius: '6px', background: '#fffbeb', border: '1px solid #fcd34d', color: '#b45309', fontWeight: 600 }}>
            WARNING: Dengue Alert Level 3 Active in Quezon region. Monitor safety stocks.
          </div>
        </div>
      </Card>
    </div>
  )
}
