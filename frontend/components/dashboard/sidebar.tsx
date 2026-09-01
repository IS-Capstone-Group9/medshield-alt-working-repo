import {
  LayoutGrid,
  Activity,
  Layers,
  Map,
  TrendingUp,
  ClipboardList,
  Upload,
  Sun,
  HelpCircle,
  LogOut,
} from 'lucide-react'
import { ActiveTab } from '@/types/dashboard.types'
import Image from 'next/image'

interface SidebarProps {
  activeTab: ActiveTab
  onChangeTab: (tab: ActiveTab) => void
  onLogout: () => void
  accountName?: string
  accountDetail?: string
  /** Retained for callers that still pass role state; no role selector is rendered. */
  userRole?: 'planner' | 'viewer'
  onChangeRole?: (role: 'planner' | 'viewer') => void
}

export function Sidebar({
  activeTab,
  onChangeTab,
  onLogout,
  accountName = 'MedShield Account',
  accountDetail = 'Secure session',
}: SidebarProps) {
  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutGrid, section: 'Analytics' },
    { id: 'revenue', label: 'Sales Diagnostics', icon: Activity },
    { id: 'products', label: 'Product Prioritization', icon: Layers },
    { id: 'territory', label: 'Area Prioritization', icon: Map },
    { id: 'forecast', label: 'Forecast Modeling', icon: TrendingUp, section: 'DSS' },
    { id: 'inventory', label: 'Prescriptive Planning', icon: ClipboardList },
    { id: 'data', label: 'Data Upload', icon: Upload },
  ] as const

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-logo">
          <div className="brand-icon">
            <Image src="/medshield_logo.png" alt="MedShield logo" width={32} height={32} />
          </div>
          <div className="brand-text">
            <div className="brand-name">MedShield</div>
            <div className="brand-sub">Pharma Corp.</div>
          </div>
        </div>
      </div>

      <nav className="nav">
        {navItems.map((item, idx) => {
          const Icon = item.icon
          const showSection = 'section' in item
          return (
            <div key={item.id}>
              {showSection && <div className="nav-section">{item.section}</div>}
              <div
                className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => onChangeTab(item.id)}
                role="button"
                tabIndex={0}
              >
                <Icon className="nav-icon" size={16} />
                <span className="nav-label">{item.label}</span>
              </div>
            </div>
          )
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-account-card" data-testid="sidebar-account-card" role="group" aria-label="Signed-in MedShield account">
            <div className="sidebar-account-mark" aria-hidden="true">MS</div>
            <div className="sidebar-account-content">
              <div className="sidebar-account-kicker">Workspace access</div>
              <div className="sidebar-account-name">{accountName}</div>
              <div className="sidebar-account-status">
                <span className="sidebar-account-status-dot" aria-hidden="true" />
                <span>{accountDetail}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="sidebar-footer-actions" style={{ marginTop: '12px' }}>
          <button className="sidebar-footer-btn" type="button" aria-label="Toggle theme">
            <Sun size={14} />
          </button>
          <button className="sidebar-footer-btn" type="button" aria-label="Help">
            <HelpCircle size={14} />
          </button>
          <button className="sidebar-footer-btn logout-btn" type="button" onClick={onLogout} aria-label="Log Out">
            <LogOut size={14} />
          </button>
        </div>
        <div className="sidebar-footer-meta" style={{ marginTop: '8px' }}>
          v2.5 Enterprise Decision Support
        </div>
      </div>
    </aside>
  )
}
