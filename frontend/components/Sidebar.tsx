import Image from 'next/image'

export default function Sidebar() {
  return (
    <aside className="sidebar" aria-hidden={false}>
      <div className="sidebar-brand">
        <div className="brand-logo">
          <div className="brand-icon">
            <Image src="/medshield_logo.svg" alt="MedShield logo" width={40} height={40} />
          </div>
          <div style={{ marginLeft: 10 }}>
            <div className="brand-name">MedShield</div>
            <div className="brand-sub">Decision Support</div>
          </div>
        </div>
      </div>
    </aside>
  )
}
