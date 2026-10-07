import { Card } from '@/components/ui/card'

export function StatusSplit() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
      <Card>
        <div className="chart-header">
          <div>
            <div className="chart-title">Evidence and publication status</div>
            <div className="chart-subtitle">Technical availability does not imply business approval.</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: '12px', fontWeight: 600 }}>Historical sales: Databricks Gold candidate data; business approval pending.</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: '12px', fontWeight: 600 }}>Predictive forecast: no approved trained model is published. Sales-only baseline validation is available in Forecast Modeling.</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
            <span style={{ fontSize: '12px', fontWeight: 600 }}>Inventory planning: reviewed scenarios only; live stock, lead time, and cost inputs are unavailable.</span>
          </div>
        </div>
      </Card>

      <Card>
        <div className="chart-header">
          <div>
            <div className="chart-title">Planning review</div>
            <div className="chart-subtitle">No live disease or stock-out alert is published.</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <p>Use historical sales evidence to review product and territory patterns.</p>
          <p>Enter and review operational assumptions before treating a planning scenario as an action.</p>
        </div>
      </Card>
    </div>
  )
}
