interface McdaEntry {
  territory: string
  abc_class: string
  revenue_share: number
  active_months: number
  revenue_score: number
  growth_score: number
  mcda_score: number
  priority_rank: number
  recommendation: string
}

interface McdaResult {
  model_code: string
  status: string
  label: string
  weights: Record<string, number>
  weight_note: string
  territories: McdaEntry[]
}

interface McdaRankingProps {
  mcda: McdaResult | null
}

export function McdaRanking({ mcda }: McdaRankingProps) {
  if (!mcda) return <div>No MCDA prioritization data available</div>

  return (
    <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div>
          <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#1a3a52', marginBottom: '2px' }}>
            Multi-Criteria Decision Analysis (MCDA) Scoring Matrix
          </h3>
          <p style={{ fontSize: '11px', color: '#64748B' }}>{mcda.weight_note}</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {Object.entries(mcda.weights).map(([k, v]) => (
            <span key={k} style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px', background: '#F0FFF4', color: '#276749', fontWeight: 700 }}>
              {k.toUpperCase()}: {Math.round(v * 100)}%
            </span>
          ))}
        </div>
      </div>

      <table className="product-table">
        <thead>
          <tr>
            <th style={{ textAlign: 'left' }}>Rank</th>
            <th style={{ textAlign: 'left' }}>Hospital Territory</th>
            <th>ABC Class</th>
            <th>Revenue Share</th>
            <th>Active Months</th>
            <th>MCDA Score</th>
            <th style={{ textAlign: 'left' }}>Prescriptive Action</th>
          </tr>
        </thead>
        <tbody>
          {mcda.territories?.map((row) => (
            <tr key={row.priority_rank}>
              <td style={{ textAlign: 'left', fontWeight: 800 }}>#{row.priority_rank}</td>
              <td style={{ textAlign: 'left', fontWeight: 700 }}>{row.territory}</td>
              <td>
                <span className="status-pill status-ready" style={{ background: '#EBF8FF', color: '#2B6CB0', border: '1px solid #BEE3F8' }}>
                  {row.abc_class}
                </span>
              </td>
              <td>{(row.revenue_share * 100).toFixed(1)}%</td>
              <td>{row.active_months} / 12</td>
              <td style={{ fontWeight: 800, color: '#2B6CB0' }}>{row.mcda_score.toFixed(3)}</td>
              <td style={{ textAlign: 'left', color: '#2B6CB0' }}>{row.recommendation}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
