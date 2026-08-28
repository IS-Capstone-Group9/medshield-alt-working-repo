import { ModelEntry, ModelSummary } from './types'

const STATUS_COLORS: Record<string, string> = {
  active: '#48BB78', benchmark: '#63B3ED', primary_chosen: '#4FD1C8',
  scenario: '#F6AD55', planned: '#9F7AEA', partial: '#F6AD55', blocked: '#FC8181',
}

interface ModelReadinessProps {
  summary: ModelSummary | null
}

function ModelRow({ m }: { m: ModelEntry }) {
  const sc = STATUS_COLORS[m.status] ?? '#888'
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', alignItems: 'center', gap: '12px', padding: '10px 14px', borderBottom: '1px solid #EDF2F7', fontSize: '12px' }}>
      <div>
        <div style={{ fontWeight: 700, color: '#1a3a52' }}>{m.model_name}</div>
        <div style={{ fontSize: '10px', color: '#718096', marginTop: '2px' }}>{m.note ?? m.output ?? ''}</div>
        {m.external_correlations && (
          <div style={{ fontSize: '10px', color: '#2F855A', marginTop: '2px' }}>
            {Object.entries(m.external_correlations).map(([k, v]) => (
              <span key={k} style={{ marginRight: '10px' }}>
                {k.replace(/_/g, ' ')}: r={v.r}, {v.p_value}
              </span>
            ))}
          </div>
        )}
      </div>
      <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '12px', background: '#EDF2F7', color: '#4A5568', border: '1px solid #CBD5E0', fontWeight: 700 }}>
        {m.layer}
      </span>
      <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '12px', background: `${sc}22`, color: sc, border: `1px solid ${sc}55`, fontWeight: 700 }}>
        {m.status.replace(/_/g, ' ')}
      </span>
      {m.mae !== undefined ? (
        <div style={{ textAlign: 'right', fontSize: '11px' }}>
          <div style={{ color: '#2D3748', fontWeight: 700 }}>MAE {m.mae.toLocaleString()}</div>
          {m.rmse !== undefined && <div style={{ color: '#718096' }}>RMSE {m.rmse.toLocaleString()}</div>}
        </div>
      ) : <div />}
    </div>
  )
}

export function ModelReadiness({ summary }: ModelReadinessProps) {
  if (!summary) return <div>No model summary available</div>

  const allModels = [
    ...(summary.descriptive || []),
    ...(summary.predictive || []),
    ...(summary.prescriptive || []),
  ]

  return (
    <div>
      <div style={{ background: '#F7FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#1a3a52', marginBottom: '4px' }}>Model Governance &amp; Versioning Registry</h3>
        <p style={{ fontSize: '11px', color: '#4a6fa5' }}>Active production status and validation accuracy stats for each analytical model layer.</p>
        <div style={{ marginTop: '14px', border: '1px solid #E2E8F0', borderRadius: '8px', background: '#FFFFFF', overflow: 'hidden' }}>
          {allModels.map((m, idx) => (
            <ModelRow key={idx} m={m} />
          ))}
        </div>
      </div>

      <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '20px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#1a3a52', marginBottom: '12px' }}>Enterprise Data Ingestion Status</h3>
        <table className="product-table">
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Dataset Name</th>
              <th>Data Period Covered</th>
              <th>Record Rows count</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {summary.data_sources?.map((ds, idx) => (
              <tr key={idx}>
                <td style={{ textAlign: 'left', fontWeight: 700 }}>{ds.name}</td>
                <td>{ds.period}</td>
                <td>{ds.rows?.toLocaleString() ?? 'N/A'}</td>
                <td>
                  <span className={`status-pill ${ds.status === 'validated' ? 'status-ready' : 'status-draft'}`}>
                    {ds.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
