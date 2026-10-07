interface EoqEntry {
  category: string
  representative_sku: string
  annual_demand_units: number
  assumed_unit_cost_php: number
  eoq_units: number
  safety_stock_units: number
  reorder_point_units: number
  orders_per_year: number
}

interface EoqResult {
  model_code: string
  status: string
  label: string
  assumptions: Record<string, number>
  formula: string
  scenarios: EoqEntry[]
}

interface EoqScenariosProps {
  eoq: EoqResult | null
}

export function EoqScenarios({ eoq }: EoqScenariosProps) {
  if (!eoq) return <div>No EOQ scenarios data available</div>

  return (
    <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div>
          <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#1a3a52', marginBottom: '2px' }}>
            Draft EOQ and Reorder-Point Scenario
          </h3>
          <p style={{ fontSize: '11px', color: '#64748B' }}>
            Formula: <code>{eoq.formula}</code> | Assumed order cost: ₱{eoq.assumptions?.ordering_cost_php?.toLocaleString()}
          </p>
        </div>
        <span className="status-pill status-draft">SCENARIO - REVIEW REQUIRED</span>
      </div>

      <table className="product-table">
        <thead>
          <tr>
            <th style={{ textAlign: 'left' }}>Representative SKU</th>
            <th style={{ textAlign: 'left' }}>Therapeutic Category</th>
            <th>Annual Demand</th>
            <th>Unit Cost</th>
            <th>Calculated EOQ</th>
            <th>ROP Buffer</th>
            <th>Orders/Yr</th>
          </tr>
        </thead>
        <tbody>
          {eoq.scenarios?.map((row, idx) => (
            <tr key={idx}>
              <td style={{ textAlign: 'left', fontWeight: 700 }}>{row.representative_sku}</td>
              <td style={{ textAlign: 'left', color: '#4A5568' }}>{row.category}</td>
              <td>{row.annual_demand_units.toLocaleString()} units</td>
              <td>₱{row.assumed_unit_cost_php.toFixed(2)}</td>
              <td style={{ fontWeight: 800, color: '#2B6CB0' }}>{row.eoq_units.toLocaleString()} units</td>
              <td style={{ fontWeight: 700, color: '#D69E2E' }}>{row.reorder_point_units.toLocaleString()} units</td>
              <td>{row.orders_per_year.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
