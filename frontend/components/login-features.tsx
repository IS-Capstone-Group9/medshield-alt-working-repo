import { BarChart3, TrendingUp, Sparkles } from 'lucide-react'

export function LoginFeatures() {
  const items = [
    {
      icon: BarChart3,
      title: 'Descriptive Intelligence',
      desc: 'Multi-year (2017–2025) sales ledger with ABC/Pareto categorization across regional distribution networks.',
      tag: 'Multi-Year ERP',
    },
    {
      icon: TrendingUp,
      title: 'Epidemiological Demand Forecasting',
      desc: 'Prophet time-series models augmented with DOH disease incidence and PAGASA rainfall anomalies.',
      tag: 'Prophet + Climate',
    },
    {
      icon: Sparkles,
      title: 'Prescriptive MCDA & Dynamic EOQ',
      desc: 'Real-time multi-criteria sensitivity ranking and climate-calibrated emergency safety stock reordering.',
      tag: 'Live Sensitivity',
    },
  ]

  return (
    <div className="login-feature-list">
      {items.map((item, idx) => {
        const Icon = item.icon
        return (
          <div key={idx} className="login-feature-card">
            <div className="login-feature-icon-wrap">
              <Icon size={18} />
            </div>
            <div className="login-feature-content">
              <div className="login-feature-header">
                <span className="login-feature-title">{item.title}</span>
                <span className="login-feature-tag">{item.tag}</span>
              </div>
              <p className="login-feature-desc">{item.desc}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
