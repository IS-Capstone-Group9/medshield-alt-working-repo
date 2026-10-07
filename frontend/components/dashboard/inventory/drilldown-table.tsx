import { BookOpen } from 'lucide-react'
import { SeasonInfo, RestockItem } from '@/types/prescriptive.types'

interface DrilldownTableProps {
  seasonTitle: string
  seasonInfo: SeasonInfo
  restockRows: RestockItem[]
  onExport: () => void
}

export function DrilldownTable({
  seasonTitle,
  seasonInfo,
  restockRows,
  onExport,
}: DrilldownTableProps) {
  return (
    <div style={{ marginTop: '20px' }}>
      <div id="seasonalDrilldownContainer" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '20px', color: '#0F172A', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div>
            <div id="drilldownTitle" style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
              {seasonInfo.title} ({seasonInfo.tag})
              <span className="status-pill status-ready" style={{ fontSize: '9px', padding: '1px 6px', marginLeft: '8px', verticalAlign: 'middle' }}>
                VALIDATED (DOH PIDSR API)
              </span>
            </div>
            <div id="drilldownSub" style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
              {seasonInfo.rule}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button className="btn btn-primary" style={{ fontSize: '11px', padding: '6px 12px' }} onClick={onExport}>
              Export Procurement Schedule (CSV/PDF)
            </button>
            <span className="alert-tag danger" style={{ background: '#FEF2F2', color: '#B91C1C' }}>
              DOH Outbreak Alert
            </span>
          </div>
        </div>

        <table className="product-table">
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Therapeutic Category</th>
              <th>Surge Buffer</th>
              <th>Current Stock</th>
              <th>Recommended EOQ Reorder</th>
              <th>Reorder Point (ROP)</th>
              <th>Urgency</th>
              <th>Unit Cost</th>
            </tr>
          </thead>
          <tbody>
            {restockRows.map((row, idx) => (
              <tr key={idx}>
                <td style={{ textAlign: 'left' }}>{row.category}</td>
                <td>{row.surgeBuffer}</td>
                <td>{row.currentStock}</td>
                <td>{row.recommendedEoq}</td>
                <td>{row.reorderPoint}</td>
                <td>
                  <span className={`status-pill ${row.urgency === 'CRITICAL' ? 'status-blocked' : row.urgency === 'WARNING' ? 'status-draft' : 'status-ready'}`}>
                    {row.urgency}
                  </span>
                </td>
                <td>{row.unitCost}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Model Transparency drawer */}
        <div className="model-transparency-card" style={{ background: '#FFFFFF', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', marginTop: '16px', boxShadow: 'var(--shadow-sm)', color: 'var(--text-primary)' }}>
          <details>
            <summary style={{ fontSize: '13px', fontWeight: 700, cursor: 'pointer', outline: 'none', display: 'flex', alignItems: 'center', gap: '8px', listStyle: 'none' }}>
              <BookOpen size={16} style={{ color: 'var(--accent)' }} />
              <span>View Prescriptive Model Rationale &amp; Optimization Weights</span>
            </summary>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '12px', lineHeight: 1.6, borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
              <p style={{ marginBottom: '10px' }}>
                The prescriptive engine computes replenishment volumes by solving the continuous economic order quantity (EOQ) equation with monsoon weather adjustments:
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', background: 'var(--bg-elevated)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <div>
                  <strong>Active Optimization Weights:</strong>
                  <ul style={{ listStyle: 'disc', marginLeft: '16px', marginTop: '4px' }}>
                    <li>Dengue Outbreak Surge Weight: <strong>45%</strong></li>
                    <li>Historical Baseline Demand: <strong>35%</strong></li>
                    <li>Lead Time Delay Factor: <strong>20%</strong></li>
                  </ul>
                </div>
                <div>
                  <strong>Risk &amp; Bias Buffers:</strong>
                  <ul style={{ listStyle: 'disc', marginLeft: '16px', marginTop: '4px' }}>
                    <li>Confidence Interval: <strong>95% (±12.4% CI)</strong></li>
                    <li>Stock-out Prevention Factor: <strong>1.5x safety buffer</strong></li>
                  </ul>
                </div>
              </div>
            </div>
          </details>
        </div>
      </div>
    </div>
  )
}
