"""
Script to apply modern enterprise redesign and text pruning to medshieldReference.ts
"""
from pathlib import Path

target_file = Path("frontend/lib/medshieldReference.ts")

medshield_style = r"""
/* ── MODERN DESIGN SYSTEM TOKENS ── */
:root {
  --bg-base:       #F8FAFC;
  --bg-surface:    #FFFFFF;
  --bg-elevated:   #F1F5F9;
  --border:        #E2E8F0;
  --border-strong: #CBD5E1;
  --text-primary:  #0F172A;
  --text-secondary:#475569;
  --text-muted:    #64748B;
  --accent:        #0EA5E9;
  --accent-light:  #F0F9FF;
  --accent-mid:    #0284C7;
  --amber:         #D97706;
  --amber-light:   #FFFBEB;
  --red:           #EF4444;
  --red-light:     #FEF2F2;
  --blue:          #2563EB;
  --blue-light:    #EFF6FF;
  --emerald:       #10B981;
  --emerald-light: #ECFDF5;
  --shadow-sm:     0 1px 3px rgba(15,23,42,0.05), 0 1px 2px rgba(15,23,42,0.03);
  --shadow-md:     0 4px 14px rgba(15,23,42,0.08);
  --shadow-lg:     0 10px 25px rgba(15,23,42,0.12);
  --radius-sm:     8px;
  --radius-md:     14px;
  --radius-lg:     18px;
  --font-display:  Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-body:     Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --sidebar-expanded-w: 240px;
  --sidebar-collapsed-w: 80px;
  --sidebar-w:     var(--sidebar-expanded-w);
  --transition:    0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

/* ── BASE RESET ── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { font-size: 14px; -webkit-font-smoothing: antialiased; }
body {
  font-family: var(--font-body);
  background: var(--bg-base);
  color: var(--text-primary);
  display: flex;
  min-height: 100vh;
  transition: background var(--transition), color var(--transition);
}
body.nav-collapsed { --sidebar-w: var(--sidebar-collapsed-w); }
body.nav-hidden { --sidebar-w: 0px; }
body.nav-open { overflow: hidden; }
a { text-decoration: none; color: inherit; }
button { border: none; cursor: pointer; font-family: inherit; }

/* ── SIDEBAR ── */
.sidebar {
  width: var(--sidebar-w);
  background: #0F172A;
  border-right: 1px solid #1E293B;
  display: flex;
  flex-direction: column;
  position: fixed;
  top: 0; left: 0; bottom: 0;
  z-index: 100;
  overflow: hidden;
  transition: width var(--transition), transform var(--transition);
}
.sidebar-brand {
  padding: 20px;
  border-bottom: 1px solid #1E293B;
}
.brand-logo {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 40px;
}
.brand-icon {
  width: 38px; height: 38px;
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
  background: #FFFFFF;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}
.brand-icon img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 4px;
}
.brand-name {
  font-family: var(--font-display);
  font-size: 16px;
  color: #F8FAFC;
  line-height: 1.2;
  font-weight: 700;
  letter-spacing: -0.01em;
}
.brand-sub {
  font-size: 10px;
  color: #94A3B8;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-top: 2px;
  font-weight: 600;
}
.brand-text, .nav-label, .nav-section {
  transition: opacity var(--transition), transform var(--transition);
}
.brand-text { max-width: 150px; overflow: hidden; }
.nav-label { display: inline-block; max-width: 170px; overflow: hidden; }
.nav { flex: 1; padding: 16px 12px; overflow-y: auto; overflow-x: hidden; }
.nav-section {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #64748B;
  padding: 12px 12px 6px;
}
.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 42px;
  padding: 10px 14px;
  border-radius: 10px;
  color: #94A3B8;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  position: relative;
  transition: all var(--transition);
  margin-bottom: 4px;
  white-space: nowrap;
}
.nav-item:hover { background: rgba(255,255,255,0.06); color: #F8FAFC; }
.nav-item.active {
  background: #0EA5E9;
  color: #FFFFFF;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(14,165,233,0.35);
}
.nav-icon { width: 18px; height: 18px; opacity: 0.8; flex-shrink: 0; }
.nav-item.active .nav-icon { opacity: 1; stroke-width: 2.2; }
.sidebar-footer { padding: 16px; border-top: 1px solid #1E293B; }
.sidebar-user { display: flex; align-items: center; gap: 10px; }
.sidebar-avatar {
  width: 36px; height: 36px;
  border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center;
  background: #1E293B; color: #38BDF8;
  font-size: 12px; font-weight: 700; flex-shrink: 0;
}
.sidebar-user-name { font-size: 12px; font-weight: 600; color: #F8FAFC; }
.sidebar-user-role { font-size: 10px; color: #64748B; margin-top: 2px; }
.sidebar-footer-actions { display: flex; gap: 8px; margin-top: 14px; }
.sidebar-footer-btn {
  width: 36px; height: 36px;
  border-radius: 8px;
  display: inline-flex; align-items: center; justify-content: center;
  background: #1E293B; border: 1px solid #334155;
  color: #94A3B8; transition: all var(--transition);
}
.sidebar-footer-btn:hover { background: #334155; color: #F8FAFC; }
.sidebar-footer-meta { margin-top: 10px; font-size: 10px; color: #64748B; text-align: center; }

/* ── MAIN & TOPBAR ── */
.main {
  margin-left: var(--sidebar-w);
  flex: 1; display: flex; flex-direction: column;
  min-height: 100vh; min-width: 0;
  transition: margin-left var(--transition);
}
.topbar {
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border);
  padding: 0 32px;
  min-height: 68px;
  display: flex; align-items: center; justify-content: space-between;
  position: sticky; top: 0; z-index: 50;
  box-shadow: var(--shadow-sm);
}
.topbar-left { display: flex; align-items: center; gap: 14px; min-width: 0; }
.page-title { font-family: var(--font-display); font-size: 18px; color: var(--text-primary); font-weight: 700; letter-spacing: -0.02em; }
.page-sub { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
.nav-toggle {
  width: 38px; height: 38px;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: var(--radius-sm); color: var(--text-secondary);
  background: var(--bg-elevated); border: 1px solid var(--border);
  transition: all var(--transition); flex-shrink: 0;
}
.nav-toggle:hover { background: var(--border); color: var(--text-primary); }
.topbar-right { display: flex; align-items: center; gap: 12px; }
.topbar-badge {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 14px; background: var(--emerald-light);
  border: 1px solid rgba(16,185,129,0.2); border-radius: 20px;
  font-size: 11px; color: #047857; font-weight: 600;
}
.live-dot { width: 8px; height: 8px; background: #10B981; border-radius: 50%; animation: pulse 2s infinite; }
@keyframes pulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(0.85); } }

/* ── FILTERBAR & CONTENT ── */
.filterbar {
  display: flex; align-items: center; justify-content: space-between; gap: 16px;
  width: 100%; max-width: 1600px; margin: 0 auto; padding: 20px 32px 0;
}
.filterbar-main { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.filterbar-label { font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-muted); }
.comparison-selector, .year-selector { display: flex; align-items: center; gap: 6px; padding: 4px; background: var(--bg-surface); border: 1px solid var(--border); border-radius: 10px; box-shadow: var(--shadow-sm); }
.comp-mode-btn, .yr-btn {
  padding: 6px 12px; border-radius: 7px; font-size: 12px; font-weight: 600;
  background: transparent; color: var(--text-secondary); transition: all var(--transition);
}
.comp-mode-btn.active, .yr-btn.active { background: var(--accent); color: #FFFFFF; }
.comp-mode-btn:hover:not(.active), .yr-btn:hover:not(.active) { background: var(--bg-elevated); color: var(--text-primary); }
.filterbar-note { font-size: 12px; color: var(--text-muted); }

.content { width: 100%; max-width: 1600px; margin: 0 auto; padding: 28px 32px 48px; flex: 1; }

/* ── PAGES & ANIMATIONS ── */
.page { display: none; }
.page.active { display: block; animation: pageFade 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes pageFade { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

/* ── KPI GRID ── */
.kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 24px; }
.kpi-card {
  background: var(--bg-surface); border: 1px solid var(--border);
  border-radius: var(--radius-md); padding: 22px; box-shadow: var(--shadow-sm);
  transition: all var(--transition); position: relative; overflow: hidden;
}
.kpi-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); border-color: var(--border-strong); }
.kpi-card::before {
  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px;
  background: var(--kpi-accent, var(--accent)); border-radius: var(--radius-md) var(--radius-md) 0 0;
}
.kpi-label { font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-muted); margin-bottom: 10px; }
.kpi-value { font-family: var(--font-display); font-size: clamp(30px, 3vw, 36px); color: var(--text-primary); font-weight: 800; line-height: 1; margin-bottom: 8px; letter-spacing: -0.03em; }
.kpi-sub { font-size: 12px; color: var(--text-secondary); font-weight: 500; }
.kpi-tag { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 6px; }
.kpi-tag.up { background: var(--emerald-light); color: #047857; }

/* ── CHART & CARDS GRID ── */
.chart-grid-2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 20px; margin-bottom: 20px; }
.chart-full { margin-bottom: 20px; }
.chart-card {
  background: var(--bg-surface); border: 1px solid var(--border);
  border-radius: var(--radius-md); padding: 24px; box-shadow: var(--shadow-sm);
  transition: all var(--transition);
}
.chart-card:hover { box-shadow: var(--shadow-md); border-color: var(--border-strong); }
.chart-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; margin-bottom: 18px; }
.chart-title { font-family: var(--font-display); font-size: 16px; color: var(--text-primary); font-weight: 700; letter-spacing: -0.01em; }
.chart-subtitle { font-size: 12px; color: var(--text-muted); margin-top: 3px; }
.chart-badge { font-size: 10px; font-weight: 700; padding: 4px 10px; border-radius: 20px; background: var(--accent-light); color: var(--accent-mid); letter-spacing: 0.06em; text-transform: uppercase; }
.chart-wrap { position: relative; width: 100%; border-radius: 12px; overflow: hidden; background: #FAFBFD; border: 1px solid #F1F5F9; }
.chart-wrap.h180 { height: 190px; }
.chart-wrap.h200 { height: 210px; }
.chart-wrap.h220 { height: 230px; }
.chart-wrap.h260 { height: 270px; }
.chart-wrap.h280 { height: 290px; }
.chart-wrap.h300 { height: 320px; }
.chart-wrap canvas { width: 100% !important; height: 100% !important; }

/* ── PRUNED HERO & INFO PANELS ── */
.hero-panel {
  background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%);
  color: #FFFFFF; border-radius: var(--radius-lg); padding: 28px 32px;
  margin-bottom: 24px; box-shadow: var(--shadow-md);
}
.hero-kicker { font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #38BDF8; margin-bottom: 8px; }
.hero-title { font-family: var(--font-display); font-size: 24px; font-weight: 800; letter-spacing: -0.02em; line-height: 1.25; margin-bottom: 12px; }
.hero-copy { font-size: 13px; color: #94A3B8; line-height: 1.6; max-width: 800px; }
.hero-summary { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 18px; }
.hero-tag { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 20px; font-size: 11px; font-weight: 600; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.14); color: #E2E8F0; }

.info-panel { background: var(--bg-surface); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 20px 24px; margin-bottom: 20px; box-shadow: var(--shadow-sm); }
.info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
.info-item .info-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted); margin-bottom: 4px; }
.info-item .info-val { font-size: 15px; font-weight: 700; color: var(--text-primary); }
.info-item .info-sub { font-size: 12px; color: var(--text-secondary); margin-top: 2px; }

/* ── SEASONAL EPIDEMIC RESTOCK GRID (6 CARDS) ── */
.seasonal-planner-banner {
  background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%);
  border-radius: var(--radius-lg); padding: 26px 30px; margin-bottom: 24px;
  box-shadow: var(--shadow-md); color: #FFFFFF;
}
.seasonal-planner-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.seasonal-planner-title { font-size: 20px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.01em; }
.seasonal-planner-sub { font-size: 13px; color: #94A3B8; margin-top: 4px; max-width: 800px; line-height: 1.5; }
.seasonal-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px; margin-top: 20px; }
.season-card {
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.12);
  border-radius: var(--radius-md); padding: 18px 20px; transition: all var(--transition);
}
.season-card:hover { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.22); transform: translateY(-2px); }
.season-card-tag { font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 6px; }
.season-card-title { font-size: 14px; font-weight: 700; color: #FFFFFF; margin-bottom: 10px; }
.season-card-list { list-style: none; padding: 0; margin: 0; font-size: 12px; color: #CBD5E1; line-height: 1.6; }
.season-card-list li { margin-bottom: 6px; }
.season-card-list strong { color: #F8FAFC; }

/* ── STANDARDIZED ENTERPRISE DATA TABLES ── */
.product-table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 8px; }
.product-table th {
  text-align: left; padding: 14px 18px; font-size: 11px; font-weight: 700;
  letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-muted);
  background: var(--bg-elevated); border-bottom: 1px solid var(--border);
}
.product-table th:not(:first-child) { text-align: right; }
.product-table td { padding: 14px 18px; border-bottom: 1px solid var(--border); color: var(--text-primary); font-weight: 500; }
.product-table td:not(:first-child) { text-align: right; }
.product-table tbody tr:nth-child(even) { background-color: rgba(241, 245, 249, 0.5); }
.product-table tbody tr:hover { background-color: var(--accent-light); }
.product-table tr:last-child td { border-bottom: none; }

.abc-pill {
  display: inline-flex; align-items: center; justify-content: center;
  width: 24px; height: 24px; border-radius: 50%; font-size: 11px; font-weight: 700;
}
.abc-A { background: var(--accent-light); color: var(--accent-mid); border: 1px solid rgba(14,165,233,0.3); }
.abc-B { background: var(--amber-light); color: var(--amber); border: 1px solid rgba(217,119,6,0.3); }
.abc-C { background: var(--blue-light); color: var(--blue); border: 1px solid rgba(37,99,235,0.3); }

/* ── PRESCRIPTIVE ALERT BANNERS ── */
.alert-hero { display: grid; grid-template-columns: minmax(0, 1.8fr) minmax(280px, 1fr); gap: 20px; margin-bottom: 20px; }
.alert-banner {
  background: var(--red-light); border: 1px solid rgba(239,68,68,0.25);
  border-left: 6px solid var(--red); border-radius: var(--radius-md);
  padding: 22px 26px; box-shadow: var(--shadow-sm);
}
.alert-banner-kicker { font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--red); margin-bottom: 6px; }
.alert-banner-title { font-family: var(--font-display); font-size: 18px; font-weight: 800; color: #991B1B; line-height: 1.3; }
.alert-banner-copy { margin-top: 8px; font-size: 13px; color: #7F1D1D; line-height: 1.6; }

.alert-summary { background: var(--bg-surface); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 20px; box-shadow: var(--shadow-sm); }
.alert-summary-label { font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-muted); margin-bottom: 12px; }
.alert-summary-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--border); }
.alert-summary-row:last-child { border-bottom: none; }
.alert-summary-key { font-size: 12px; color: var(--text-secondary); font-weight: 500; }
.alert-summary-value { font-family: var(--font-display); font-size: 18px; font-weight: 800; color: var(--text-primary); }

.alert-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; margin-bottom: 20px; }
.alert-card {
  background: var(--bg-surface); border: 1px solid var(--border);
  border-radius: var(--radius-md); padding: 20px; box-shadow: var(--shadow-sm);
  transition: all var(--transition); border-left: 4px solid var(--border);
}
.alert-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
.alert-card.danger { border-left-color: var(--red); }
.alert-card.warn { border-left-color: var(--amber); }
.alert-card.ok { border-left-color: var(--emerald); }
.alert-title { font-size: 14px; font-weight: 700; color: var(--text-primary); margin-bottom: 6px; }
.alert-body { font-size: 12px; color: var(--text-secondary); line-height: 1.55; }
.alert-tag {
  margin-top: 12px; display: inline-flex; align-items: center; padding: 4px 10px;
  border-radius: 20px; font-size: 10px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
}
.alert-tag.danger { background: var(--red-light); color: var(--red); }
.alert-tag.warn { background: var(--amber-light); color: var(--amber); }
.alert-tag.ok { background: var(--emerald-light); color: #047857; }

/* ── SECTION TITLE ── */
.section-title {
  font-family: var(--font-display); font-size: 18px; color: var(--text-primary);
  font-weight: 700; margin-bottom: 16px; display: flex; align-items: center; gap: 10px;
}
.section-title::after { content: ''; flex: 1; height: 1px; background: var(--border); }

/* ── DATA UPLOAD ── */
.upload-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px; }
.upload-zone { background: var(--bg-surface); border: 2px dashed var(--border-strong); border-radius: var(--radius-md); padding: 24px; text-align: center; }
.upload-hint { font-size: 12px; color: var(--text-muted); margin-top: 8px; }
.upload-zone input[type="file"] { margin-top: 16px; font-size: 13px; }
.upload-log { margin-top: 16px; padding: 16px; border-radius: 12px; background: var(--bg-elevated); border: 1px solid var(--border); color: var(--text-secondary); font-size: 13px; }

/* ── RESPONSIVE MEDIA QUERIES ── */
@media (max-width: 1024px) {
  .info-grid { grid-template-columns: 1fr; }
  .alert-hero { grid-template-columns: 1fr; }
}
"""

medshield_markup = r"""

<!-- SIDEBAR -->
<aside class="sidebar">
  <div class="sidebar-brand">
    <div class="brand-logo">
      <div class="brand-icon">
        <img src="/medshield_logo.png" alt="MedShield logo">
      </div>
      <div class="brand-text">
        <div class="brand-name">MedShield</div>
        <div class="brand-sub">Pharma Corp.</div>
      </div>
    </div>
  </div>

  <nav class="nav">
    <div class="nav-section">Analytics</div>
    <div class="nav-item active" onclick="showPage('overview', this)" data-tooltip="Overview" aria-label="Overview">
      <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
      </svg>
      <span class="nav-label">Overview</span>
    </div>
    <div class="nav-item" onclick="showPage('revenue', this)" data-tooltip="Sales Diagnostics" aria-label="Sales Diagnostics">
      <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
      <span class="nav-label">Sales Diagnostics</span>
    </div>
    <div class="nav-item" onclick="showPage('products', this)" data-tooltip="Product Prioritization" aria-label="Product Prioritization">
      <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
      </svg>
      <span class="nav-label">Product Prioritization</span>
    </div>
    <div class="nav-item" onclick="showPage('territory', this)" data-tooltip="Area Prioritization" aria-label="Area Prioritization">
      <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
      <span class="nav-label">Area Prioritization</span>
    </div>
    <div class="nav-section" style="margin-top:8px;">DSS</div>
    <div class="nav-item" onclick="showPage('forecast', this)" data-tooltip="Forecast Modeling" aria-label="Forecast Modeling">
      <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M2 20h.01M7 20v-4"/><path d="M12 20v-8"/><path d="M17 20V8"/>
        <path d="M22 4l-8 8-4-4-8 8"/>
      </svg>
      <span class="nav-label">Forecast Modeling</span>
    </div>
    <div class="nav-item" onclick="showPage('inventory', this)" data-tooltip="Prescriptive Planning" aria-label="Prescriptive Planning">
      <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
        <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
      </svg>
      <span class="nav-label">Prescriptive Planning</span>
    </div>
    <div class="nav-item" onclick="showPage('data', this)" data-tooltip="Data Upload" aria-label="Data Upload">
      <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 3v12"/>
        <path d="m7 10 5 5 5-5"/>
        <path d="M5 21h14"/>
      </svg>
      <span class="nav-label">Data Upload</span>
    </div>
  </nav>

  <div class="sidebar-footer">
    <div class="sidebar-user">
      <div class="sidebar-avatar">MS</div>
      <div class="sidebar-user-meta">
        <div class="sidebar-user-name">Supply Planner</div>
        <div class="sidebar-user-role">MedShield DSS Operator</div>
      </div>
    </div>
    <div class="sidebar-footer-actions">
      <button class="sidebar-footer-btn" type="button" onclick="toggleTheme()" aria-label="Toggle dark mode">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="4"/>
        </svg>
      </button>
      <button class="sidebar-footer-btn" type="button" onclick="openHelp()" aria-label="Open help">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.82 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>
        </svg>
      </button>
      <button id="sidebarLogoutBtn" class="sidebar-footer-btn logout-btn" type="button" aria-label="Log Out" data-tooltip="Log Out">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
      </button>
    </div>
    <div class="sidebar-footer-meta">v2.5 Enterprise Decision Support</div>
  </div>
</aside>

<!-- MAIN -->
<main class="main">
  <!-- TOPBAR -->
  <div class="topbar">
    <div class="topbar-left">
      <button class="nav-toggle" type="button" onclick="toggleNavigation()" aria-label="Toggle navigation">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/>
        </svg>
      </button>
      <div>
        <div class="page-title" id="topbar-title">Executive Overview</div>
        <div class="page-sub" id="topbar-sub">Centralized demand intelligence, forecasting, and stock actions</div>
      </div>
    </div>
    <div class="topbar-right">
      <div class="topbar-badge"><div class="live-dot"></div> Live System Active</div>
    </div>
  </div>

  <div class="filterbar" id="filterBar">
    <div class="filterbar-main">
      <div class="filterbar-label">Comparison Mode</div>
      <div class="comparison-selector">
        <button class="comp-mode-btn active" onclick="setComparisonMode('single', this)">Single Year</button>
        <button class="comp-mode-btn" onclick="setComparisonMode('yoy', this)">Y/Y Compare</button>
      </div>
      <div class="year-selector" id="yearSelector">
        <button class="yr-btn active" onclick="setYear('all', this)">All</button>
        <button class="yr-btn" onclick="setYear('2021', this)">2021</button>
        <button class="yr-btn" onclick="setYear('2022', this)">2022</button>
        <button class="yr-btn" onclick="setYear('2023', this)">2023</button>
        <button class="yr-btn" onclick="setYear('2024', this)">2024</button>
        <button class="yr-btn" onclick="setYear('2025', this)">2025</button>
      </div>
    </div>
    <div class="filterbar-note" id="filterBarNote">Adjust period slice to re-evaluate baseline metrics</div>
  </div>

  <div class="content">

    <!-- PAGE: OVERVIEW -->
    <div class="page active fade-in" id="page-overview">
      <div class="hero-panel">
        <div class="hero-kicker">EXECUTIVE OVERVIEW</div>
        <div class="hero-title">Centralized Supply Chain Intelligence</div>
        <div class="hero-copy">Monitor baseline performance, evaluate forward demand forecasts, and drive automated inventory replenishment across hospital networks.</div>
        <div class="hero-summary">
          <span class="hero-tag">📊 Descriptive Analytics</span>
          <span class="hero-tag">🔮 Prophet 2026 Forecast</span>
          <span class="hero-tag">🎯 Prescriptive EOQ & ROP</span>
        </div>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card" style="--kpi-accent:#0EA5E9">
          <div class="kpi-label">Total Cumulative Revenue</div>
          <div class="kpi-value">₱438.9M</div>
          <span class="kpi-tag up">+224% growth (2021–2025)</span>
        </div>
        <div class="kpi-card" style="--kpi-accent:#0284C7">
          <div class="kpi-label">2026 Forecast Start</div>
          <div class="kpi-value">₱9.3M</div>
          <div class="kpi-sub">Jan projected demand</div>
        </div>
        <div class="kpi-card" style="--kpi-accent:#D97706">
          <div class="kpi-label">Peak Demand Season</div>
          <div class="kpi-value">May & Nov</div>
          <div class="kpi-sub">Highest seasonal lift</div>
        </div>
        <div class="kpi-card" style="--kpi-accent:#2563EB">
          <div class="kpi-label">Top Territory Share</div>
          <div class="kpi-value">Government</div>
          <div class="kpi-sub">Primary allocation sector</div>
        </div>
      </div>

      <div class="chart-grid-2">
        <div class="chart-card">
          <div class="chart-header">
            <div>
              <div class="chart-title">Baseline Demand & Profitability</div>
              <div class="chart-subtitle">Historical revenue vs net income (2021–2025)</div>
            </div>
            <span class="chart-badge">Historical</span>
          </div>
          <div class="chart-wrap h260"><canvas id="overviewBaselineChart"></canvas></div>
        </div>
        <div class="chart-card">
          <div class="chart-header">
            <div>
              <div class="chart-title">2026 Monthly Demand Forecast</div>
              <div class="chart-subtitle">Prophet time-series outlook with confidence bands</div>
            </div>
            <span class="chart-badge">Predictive</span>
          </div>
          <div class="chart-wrap h260"><canvas id="overviewForecastChart"></canvas></div>
        </div>
      </div>
    </div>

    <!-- PAGE: REVENUE DIAGNOSTICS -->
    <div class="page fade-in" id="page-revenue">
      <div class="info-panel">
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Focus Area</div>
            <div class="info-val">Historical Sales Diagnostic</div>
            <div class="info-sub">5-year revenue trends</div>
          </div>
          <div class="info-item">
            <div class="info-label">Primary Input</div>
            <div class="info-val">Transaction Database</div>
            <div class="info-sub">2021–2025 monthly records</div>
          </div>
          <div class="info-item">
            <div class="info-label">Diagnostic Output</div>
            <div class="info-val">Growth & Margin Trajectory</div>
            <div class="info-sub">48.7% average net margin</div>
          </div>
        </div>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card" style="--kpi-accent:#0EA5E9">
          <div class="kpi-label">2025 Annual Revenue</div>
          <div class="kpi-value">₱183.8M</div>
          <span class="kpi-tag up">+224% vs 2021</span>
        </div>
        <div class="kpi-card" style="--kpi-accent:#D97706">
          <div class="kpi-label">2025 Net Income</div>
          <div class="kpi-value">₱89.5M</div>
          <div class="kpi-sub">48.7% net profit margin</div>
        </div>
        <div class="kpi-card" style="--kpi-accent:#2563EB">
          <div class="kpi-label">Highest Single Month</div>
          <div class="kpi-value">May 2025</div>
          <div class="kpi-sub">Peak transaction volume</div>
        </div>
      </div>

      <div class="chart-full">
        <div class="chart-card">
          <div class="chart-header">
            <div>
              <div class="chart-title">Month-by-Month Revenue Breakdown</div>
              <div class="chart-subtitle">Detailed 3-year monthly performance (2023–2025)</div>
            </div>
          </div>
          <div class="chart-wrap h300"><canvas id="revenueDetailChart"></canvas></div>
        </div>
      </div>
    </div>

    <!-- PAGE: PRODUCT PRIORITIZATION -->
    <div class="page fade-in" id="page-products">
      <div class="info-panel">
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Prioritization Model</div>
            <div class="info-val">ABC Pareto Classification</div>
            <div class="info-sub">80/20 revenue concentration</div>
          </div>
          <div class="info-item">
            <div class="info-label">Active Portfolio</div>
            <div class="info-val">200+ SKU Portfolio</div>
            <div class="info-sub">3 High-Value Class A items</div>
          </div>
          <div class="info-item">
            <div class="info-label">Recommendation Engine</div>
            <div class="info-val">Collaborative Filtering</div>
            <div class="info-sub">Product-region similarity match</div>
          </div>
        </div>
      </div>

      <div class="chart-grid-2">
        <div class="chart-card">
          <div class="chart-header">
            <div>
              <div class="chart-title">Top 10 Products by Revenue</div>
              <div class="chart-subtitle">Cumulative SKU sales contribution</div>
            </div>
            <span class="chart-badge">Pareto</span>
          </div>
          <div class="chart-wrap h300"><canvas id="productBarChart"></canvas></div>
        </div>
        <div class="chart-card">
          <div class="chart-header">
            <div>
              <div class="chart-title">ABC Portfolio Concentration</div>
              <div class="chart-subtitle">Class A (70%), Class B (20%), Class C (10%)</div>
            </div>
          </div>
          <div class="chart-wrap h300"><canvas id="abcChart"></canvas></div>
        </div>
      </div>

      <div class="chart-card chart-full">
        <div class="chart-header">
          <div>
            <div class="chart-title">Product Performance Table</div>
            <div class="chart-subtitle">SKU rankings with ABC class and margin breakdown</div>
          </div>
        </div>
        <table class="product-table" id="productTable"></table>
      </div>

      <div class="section-title">Product-Region Collaborative Filtering Matches</div>
      <div class="chart-card">
        <table class="product-table" id="matchingTable"></table>
      </div>
    </div>

    <!-- PAGE: AREA PRIORITIZATION -->
    <div class="page fade-in" id="page-territory">
      <div class="info-panel">
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Clustering Algorithm</div>
            <div class="info-val">K-Means Territory Tiers</div>
            <div class="info-sub">Scale, stability, and growth</div>
          </div>
          <div class="info-item">
            <div class="info-label">Multi-Criteria Model</div>
            <div class="info-val">MCDA Regional Scoring</div>
            <div class="info-sub">Revenue, growth & disease risk</div>
          </div>
          <div class="info-item">
            <div class="info-label">Coverage Area</div>
            <div class="info-val">10 Regional Sectors</div>
            <div class="info-sub">Government, Hospital, Pharma</div>
          </div>
        </div>
      </div>

      <div class="chart-grid-2">
        <div class="chart-card">
          <div class="chart-header">
            <div>
              <div class="chart-title">Revenue by Territory</div>
              <div class="chart-subtitle">Cumulative area sales contribution</div>
            </div>
          </div>
          <div class="chart-wrap h280"><canvas id="areaBarChart"></canvas></div>
        </div>
        <div class="chart-card">
          <div class="chart-header">
            <div>
              <div class="chart-title">Net Income by Territory</div>
              <div class="chart-subtitle">Regional profit contribution</div>
            </div>
          </div>
          <div class="chart-wrap h280"><canvas id="areaIncomeChart"></canvas></div>
        </div>
      </div>

      <div class="chart-grid-2">
        <div class="chart-card">
          <div class="chart-header">
            <div>
              <div class="chart-title">K-Means Territory Segmentation</div>
              <div class="chart-subtitle">Clustered by revenue scale and purchasing stability</div>
            </div>
          </div>
          <table class="product-table" id="clusterTable"></table>
        </div>
        <div class="chart-card">
          <div class="chart-header">
            <div>
              <div class="chart-title">MCDA Regional Priority Ranking</div>
              <div class="chart-subtitle">Weighted scoring for regional procurement prioritization</div>
            </div>
          </div>
          <table class="product-table" id="priorityTable"></table>
        </div>
      </div>
    </div>

    <!-- PAGE: FORECAST MODELING -->
    <div class="page fade-in" id="page-forecast">
      <div class="info-panel">
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Primary Forecasting Engine</div>
            <div class="info-val">Prophet + Gradient Boosting</div>
            <div class="info-sub">12-month outlook window</div>
          </div>
          <div class="info-item">
            <div class="info-label">External Signals</div>
            <div class="info-val">PAGASA Weather & DOH Outbreaks</div>
            <div class="info-sub">Climate-disease correlations</div>
          </div>
          <div class="info-item">
            <div class="info-label">Model Benchmarking</div>
            <div class="info-val">MAE / RMSE Evaluation</div>
            <div class="info-sub">GBR Regressor vs Naive Baseline</div>
          </div>
        </div>
      </div>

      <div class="chart-full">
        <div class="chart-card">
          <div class="chart-header">
            <div>
              <div class="chart-title">2026 Monthly Demand Forecast</div>
              <div class="chart-subtitle">12-Month Prophet projection with upper and lower planning bounds</div>
            </div>
            <span class="chart-badge">Predictive</span>
          </div>
          <div class="chart-wrap h300"><canvas id="forecastChart"></canvas></div>
        </div>
      </div>

      <div class="section-title">Model Benchmarking & Validation</div>
      <div class="chart-card">
        <table class="product-table" id="evalTable"></table>
      </div>
    </div>

    <!-- PAGE: PRESCRIPTIVE PLANNING & SEASONAL EPIDEMIC -->
    <div class="page fade-in" id="page-inventory">
      <div class="info-panel">
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Prescriptive Rules Engine</div>
            <div class="info-val">EOQ & ROP Replenishment</div>
            <div class="info-sub">Optimal order quantity & safety stock</div>
          </div>
          <div class="info-item">
            <div class="info-label">Urgency Score Model</div>
            <div class="info-val">XGBoost Outbreak Classifier</div>
            <div class="info-sub">Automated stock alert triggers</div>
          </div>
          <div class="info-item">
            <div class="info-label">Procurement Planning</div>
            <div class="info-val">1-Month & 2-Month Orders</div>
            <div class="info-sub">Scheduled replenishment schedule</div>
          </div>
        </div>
      </div>

      <!-- SEASONAL EPIDEMIC RESTOCK GRID -->
      <div class="seasonal-planner-banner">
        <div class="seasonal-planner-header">
          <div>
            <div class="seasonal-planner-title">📅 Seasonal Epidemic & Inventory Restock Planner</div>
            <div class="seasonal-planner-sub">Automated climate-disease mapping and medicine category purchasing schedule for hospital networks.</div>
          </div>
        </div>
        <div class="seasonal-grid">
          <div class="season-card">
            <div class="season-card-tag" style="color:#38BDF8">JANUARY & FEBRUARY</div>
            <div class="season-card-title">❄️ Amihan Cool Dry Season</div>
            <ul class="season-card-list">
              <li><strong>Risks:</strong> Influenza-Like Illness (ILI), Flu, Asthma</li>
              <li><strong>Restock:</strong> Bronchodilators, Antihistamines, Steroids</li>
              <li><strong>Priority:</strong> Salbutamol Nebules, Cetirizine, Paracetamol</li>
            </ul>
          </div>
          <div class="season-card">
            <div class="season-card-tag" style="color:#F59E0B">MARCH & APRIL</div>
            <div class="season-card-title">☀️ Summer Peak Heat Surge</div>
            <ul class="season-card-list">
              <li><strong>Risks:</strong> Acute Gastroenteritis, Dehydration, Typhoid</li>
              <li><strong>Restock:</strong> ORS Packets, Antidiarrheals, GI Anti-infectives</li>
              <li><strong>Priority:</strong> Oral Rehydration Salts, Metronidazole, Omeprazole</li>
            </ul>
          </div>
          <div class="season-card">
            <div class="season-card-tag" style="color:#34D399">MAY & JUNE</div>
            <div class="season-card-title">🌩️ Pre-Monsoon Thunderstorms</div>
            <ul class="season-card-list">
              <li><strong>Risks:</strong> Early Dengue Onset, HFMD, Waterborne GI</li>
              <li><strong>Restock:</strong> Antipyretics, IV Fluids, Broad Antibiotics</li>
              <li><strong>Priority:</strong> Paracetamol 500mg, IV Normal Saline, Co-Amoxiclav</li>
            </ul>
          </div>
          <div class="season-card" style="border-left: 4px solid #EF4444;">
            <div class="season-card-tag" style="color:#EF4444">JULY & AUGUST — CRITICAL</div>
            <div class="season-card-title">🌧️ Peak Monsoon (Habagat) & Floods</div>
            <ul class="season-card-list">
              <li><strong>Risks:</strong> Dengue Outbreaks, Leptospirosis Wave 1, Cholera</li>
              <li><strong>Restock:</strong> Flood Prophylactics, Dengue Antipyretics, IV Fluids</li>
              <li><strong>Priority:</strong> Doxycycline 100mg, Paracetamol, Cefuroxime</li>
            </ul>
          </div>
          <div class="season-card">
            <div class="season-card-tag" style="color:#F87171">SEPTEMBER & OCTOBER</div>
            <div class="season-card-title">🌀 Late Typhoon & Post-Flood Siltation</div>
            <ul class="season-card-list">
              <li><strong>Risks:</strong> Leptospirosis Wave 2, Dengue, Typhoid Fever</li>
              <li><strong>Restock:</strong> Anti-Leptospiral Meds, GI Meds, ORS</li>
              <li><strong>Priority:</strong> Doxycycline 100mg, Ciprofloxacin 500mg, ORS</li>
            </ul>
          </div>
          <div class="season-card">
            <div class="season-card-tag" style="color:#38BDF8">NOVEMBER & DECEMBER</div>
            <div class="season-card-title">🍂 Cold Front Transition & Holiday Peak</div>
            <ul class="season-card-list">
              <li><strong>Risks:</strong> Flu/ILI, Pediatric Respiratory, Asthma Surge</li>
              <li><strong>Restock:</strong> Bronchodilators, Pediatric Syrups, Antibiotics</li>
              <li><strong>Priority:</strong> Salbutamol Nebules, Carbocisteine, Amoxicillin</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- PRESCRIPTIVE ALERTS HERO -->
      <div class="section-title">Active Prescriptive Inventory Alerts</div>
      <div class="alert-hero">
        <div class="alert-banner">
          <div class="alert-banner-kicker">Critical Action Required</div>
          <div class="alert-banner-title">Stock Out Risk Flagged for ANTIZOAL IV</div>
          <div class="alert-banner-copy">Projected demand will exhaust safety stock levels before Jan 2026. Automated EOQ order of 240 units with ROP trigger of 80 units recommended.</div>
        </div>
        <div class="alert-summary">
          <div class="alert-summary-label">Alert Overview</div>
          <div class="alert-summary-row"><span class="alert-summary-key">Open Critical Flags</span><span class="alert-summary-value" style="color:#EF4444">2</span></div>
          <div class="alert-summary-row"><span class="alert-summary-key">Outbreak Watches</span><span class="alert-summary-value" style="color:#F59E0B">1</span></div>
          <div class="alert-summary-row"><span class="alert-summary-key">SKUs Needing Reorder</span><span class="alert-summary-value" style="color:#0EA5E9">5</span></div>
        </div>
      </div>

      <div class="alert-grid">
        <div class="alert-card danger">
          <div class="alert-title">Reorder Trigger — ANTIZOAL IV</div>
          <div class="alert-body">Demand exceeds safety stock threshold. EOQ target: 240 units. ROP: 80 units.</div>
          <span class="alert-tag danger">Critical</span>
        </div>
        <div class="alert-card warn">
          <div class="alert-title">Dengue Season Watch — Q4</div>
          <div class="alert-body">DOH Infection Index above 1.4. Paracetamol and antipyretic demand expected +35%.</div>
          <span class="alert-tag warn">Warning</span>
        </div>
        <div class="alert-card danger">
          <div class="alert-title">Typhoon Pre-Positioning Active</div>
          <div class="alert-body">PAGASA RSI ≥ 45%. Wound care and ORS stock multiplier (+40%) applied for Marinduque.</div>
          <span class="alert-tag danger">High Risk</span>
        </div>
        <div class="alert-card ok">
          <div class="alert-title">Hospital Territory Stock Stable</div>
          <div class="alert-body">Current inventory covers projected hospital demand through Feb 2026.</div>
          <span class="alert-tag ok">Stable</span>
        </div>
      </div>

      <div class="section-title">EOQ & ROP Reorder Recommendations</div>
      <div class="chart-card">
        <table class="product-table" id="eoqTable"></table>
      </div>
    </div>

    <!-- PAGE: DATA UPLOAD -->
    <div class="page fade-in" id="page-data">
      <div class="info-panel">
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Ingestion Mode</div>
            <div class="info-val">Client-Side CSV/JSON Upload</div>
            <div class="info-sub">Real-time validation feedback</div>
          </div>
          <div class="info-item">
            <div class="info-label">Supported Schemas</div>
            <div class="info-val">Sales Records & Datasets</div>
            <div class="info-sub">Period, revenue, income columns</div>
          </div>
          <div class="info-item">
            <div class="info-label">Data Security</div>
            <div class="info-val">In-Memory Processing</div>
            <div class="info-sub">No unauthenticated cloud sync</div>
          </div>
        </div>
      </div>

      <div class="upload-grid">
        <div class="upload-zone">
          <div class="section-title" style="justify-content:center; margin-bottom:8px;">Upload Sales CSV</div>
          <div class="upload-hint">Expected columns: period, revenue, income.</div>
          <input id="salesCsvInput" type="file" accept=".csv,text/csv">
        </div>
        <div class="upload-zone">
          <div class="section-title" style="justify-content:center; margin-bottom:8px;">Upload Dataset JSON</div>
          <div class="upload-hint">Expected structure: monthly, by_area, year_summary, seasonality.</div>
          <input id="datasetJsonInput" type="file" accept=".json,application/json">
        </div>
      </div>

      <div class="chart-card" style="margin-top:20px;">
        <div class="chart-header">
          <div>
            <div class="chart-title">Data Ingestion Audit Log</div>
            <div class="chart-subtitle">Real-time status feed</div>
          </div>
        </div>
        <div id="uploadLog" class="upload-log">No dataset uploaded in current session. Standard 2021–2025 baseline active.</div>
      </div>
    </div>

  </div>
</main>
"""

# Now view existing script content
current_content = target_file.read_text(encoding="utf-8")
script_pos = current_content.find("export const MEDSHIELD_SCRIPT =")

if script_pos != -1:
    script_part = current_content[script_pos:]
    new_file_content = f'export const MEDSHIELD_STYLE = "{medshield_style.replace(chr(10), "\\n").replace(chr(34), "\\\"")}"\n\nexport const MEDSHIELD_MARKUP = "{medshield_markup.replace(chr(10), "\\n").replace(chr(34), "\\\"")}"\n\n{script_part}'
    target_file.write_text(new_file_content, encoding="utf-8")
    print("Successfully updated medshieldReference.ts with redesigned UI and pruned text!")
else:
    print("Error: Could not locate MEDSHIELD_SCRIPT in medshieldReference.ts")
