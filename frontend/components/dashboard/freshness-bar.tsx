import { CheckCircle } from 'lucide-react'

export function FreshnessBar() {
  return (
    <div className="data-freshness-bar" style={{ background: '#FFFFFF', borderBottom: '1px solid var(--border)', padding: '8px 24px', fontSize: '11px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <CheckCircle size={12} className="inline-icon" style={{ color: 'var(--emerald)' }} />
        <span>Data source: <strong>Pending verification</strong></span>
        <span style={{ color: 'var(--border-strong)' }}>|</span>
        <span>Refresh schedule: <strong>Not configured</strong></span>
        <span style={{ color: 'var(--border-strong)' }}>|</span>
        <span>Last loaded: <strong>Unavailable</strong></span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span className="status-pill status-ready" style={{ fontSize: '9px', padding: '1px 6px' }}>
          EXTERNAL SOURCES NOT VERIFIED
        </span>
      </div>
    </div>
  )
}
