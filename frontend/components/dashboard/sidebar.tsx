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
  userRole: 'planner' | 'viewer'
  onChangeRole: (role: 'planner' | 'viewer') => void
  onLogout: () => void
}

export function Sidebar({
  activeTab,
  onChangeTab,
  userRole,
  onChangeRole,
  onLogout,
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
          <div className="sidebar-avatar">MS</div>
          <div className="sidebar-user-meta">
            <div className="sidebar-user-name">Supply Planner</div>
            <div className="sidebar-user-role" id="userRoleDisplay">
              Role:{' '}
              {userRole === 'planner'
                ? 'Supply Planner [Level 2 - Write Access]'
                : 'Viewer [Level 1 - Read-Only]'}
            </div>
          </div>
        </div>

        <div className="role-selector-container" style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #1E293B' }}>
          <div style={{ fontSize: '9px', color: '#94A3B8', marginBottom: '4px', transform: 'uppercase', fontWeight: 700 }}>
            Select User Role
          </div>
          <select
            id="userRoleSelector"
            value={userRole}
            onChange={(e) => onChangeRole(e.target.value as 'planner' | 'viewer')}
            style={{
              width: '100%',
              background: '#1E293B',
              border: '1px solid #334155',
              color: '#F8FAFC',
              fontSize: '10px',
              borderRadius: '4px',
              padding: '4px',
              fontWeight: 600,
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="planner">Supply Planner (L2 - Write)</option>
            <option value="viewer">Viewer (L1 - Read-Only)</option>
          </select>
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
