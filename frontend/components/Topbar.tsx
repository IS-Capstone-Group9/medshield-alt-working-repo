export default function Topbar({ title = 'Executive Overview', subtitle = 'Demand baseline, forecast, and actions' }: { title?: string; subtitle?: string }) {
  return (
    <div className="topbar">
      <div className="topbar-left">
        <button className="nav-toggle" type="button" aria-label="Toggle navigation">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M4 6h16" />
            <path d="M4 12h16" />
            <path d="M4 18h16" />
          </svg>
        </button>
        <div className="topbar-title-group">
          <div className="page-title" id="topbar-title">{title}</div>
          <div className="page-sub" id="topbar-sub">{subtitle}</div>
        </div>
      </div>
      <div className="topbar-right">
        <div className="topbar-badge"><div className="live-dot" /> Dataset loaded</div>
      </div>
    </div>
  )
}
