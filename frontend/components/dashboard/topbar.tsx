import { Menu } from 'lucide-react'
import { ActiveTab, DashboardFilters } from '@/types/dashboard.types'

interface TopbarProps {
  activeTab: ActiveTab
  filters: DashboardFilters
  onUpdateFilters: (updates: Partial<DashboardFilters>) => void
}

const TAB_META: Record<ActiveTab, { title: string; sub: string }> = {
  overview: { title: 'Executive Overview', sub: 'Centralized demand intelligence, forecasting, and stock actions' },
  revenue: { title: 'Sales Diagnostics', sub: 'Historical revenue trends and gross profitability logs' },
  products: { title: 'Product Prioritization', sub: 'ABC classification analysis and prioritization clusters' },
  territory: { title: 'Area Prioritization', sub: 'Regional transaction segmentations and MCDA analysis' },
  forecast: { title: 'Forecast Modeling', sub: 'Gradient boosting and Prophet time-series calculations' },
  inventory: { title: 'Prescriptive Planning', sub: 'Economic Order Quantities and seasonal buffer allocations' },
  data: { title: 'Data Upload', sub: 'CSV transaction loaders and schema catalog validation logs' },
}

export function Topbar({ activeTab, filters, onUpdateFilters }: TopbarProps) {
  const { title, sub } = TAB_META[activeTab]

  return (
    <div className="topbar">
      <div className="topbar-left">
        <button className="nav-toggle" type="button" aria-label="Toggle navigation">
          <Menu size={16} />
        </button>
        <div>
          <div className="page-title">{title}</div>
          <div className="page-sub">{sub}</div>
        </div>
      </div>
      <div className="topbar-right">
        <div className="filterbar-main">
          <div className="comparison-selector">
            <button
              className={`comp-mode-btn ${filters.comparisonMode === 'single' ? 'active' : ''}`}
              onClick={() => onUpdateFilters({ comparisonMode: 'single' })}
            >
              Single Year
            </button>
            <button
              className={`comp-mode-btn ${filters.comparisonMode === 'yoy' ? 'active' : ''}`}
              onClick={() => onUpdateFilters({ comparisonMode: 'yoy' })}
            >
              Y/Y Compare
            </button>
          </div>
          <div className="year-selector">
            {(['all', '2021', '2022', '2023', '2024', '2025'] as const).map((y) => (
              <button
                key={y}
                className={`yr-btn ${filters.year === y ? 'active' : ''}`}
                onClick={() => onUpdateFilters({ year: y })}
              >
                {y === 'all' ? 'All' : y}
              </button>
            ))}
          </div>
        </div>
        <div className="topbar-badge">
          <div className="live-dot" />
          Live System Active
        </div>
      </div>
    </div>
  )
}
