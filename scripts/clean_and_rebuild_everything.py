# -*- coding: utf-8 -*-
"""
Clean and consolidate medshieldReference.ts:
1. Extract baseline MEDSHIELD_SCRIPT (up to first _fnList exposition block)
2. Append single copies of selectSeasonRestock, exportRestockPlanToCsv, and interactive modals
3. Clean up double-encoded characters
4. Update MEDSHIELD_MARKUP to add notice banner, YoY/Margin/External charts, and remove role selector
5. Re-assemble medshieldReference.ts cleanly without trailing garbage
"""
from pathlib import Path
import re

ts_path = Path("frontend/lib/medshieldReference.ts")
content = ts_path.read_text(encoding="utf-8")

# --- STEP 1: Extract clean MEDSHIELD_STYLE baseline ---
# We will use a modernized style sheet including the clickable-season classes
css_styles = """
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
  --shadow-sm:     0 1px 3px rgba(0, 0, 0, 0.05);
  --shadow-md:     0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
  --shadow-lg:     0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.03);
  --radius-sm:     6px;
  --radius-md:     12px;
  --radius-lg:     12px;
  --font-display:  Inter, -apple-system, BlinkMacSystemFont, sans-serif;
  --font-body:     Inter, -apple-system, BlinkMacSystemFont, sans-serif;
  --sidebar-w:     240px;
  --transition:    0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: var(--font-body);
  background: var(--bg-base);
  color: var(--text-primary);
  display: flex;
  min-height: 100vh;
}
.sidebar {
  width: var(--sidebar-w);
  background: #0F172A;
  border-right: 1px solid rgba(255,255,255,0.06);
  display: flex;
  flex-direction: column;
  position: fixed;
  top: 0; left: 0; bottom: 0;
  z-index: 100;
}
.sidebar-brand {
  padding: 20px;
  border-bottom: 1px solid #1E293B;
}
.brand-logo { display: flex; align-items: center; gap: 12px; }
.brand-icon {
  width: 32px; height: 32px;
  border-radius: 8px;
  background: #FFFFFF;
  display: flex; align-items: center; justify-content: center;
  overflow: hidden;
}
.brand-icon img { width: 100%; height: 100%; object-fit: contain; padding: 2px; }
.brand-name { font-size: 15px; color: #F8FAFC; font-weight: 700; }
.brand-sub { font-size: 9px; color: #94A3B8; letter-spacing: 0.08em; text-transform: uppercase; }

.nav { flex: 1; padding: 16px 12px; }
.nav-section {
  font-size: 10px; font-weight: 700; letter-spacing: 0.1em;
  text-transform: uppercase; color: #64748B; padding: 12px 12px 6px;
}
.nav-item {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 14px; border-radius: 8px;
  color: #94A3B8; font-size: 13px; font-weight: 500;
  cursor: pointer; margin-bottom: 4px; transition: all var(--transition);
}
.nav-item:hover { background: rgba(255,255,255,0.05); color: #F8FAFC; }
.nav-item.active {
  background: rgba(37,99,235,0.15);
  color: #60A5FA;
  font-weight: 600;
  border-right: 2px solid #3B82F6;
  border-radius: 8px 0 0 8px;
}
.nav-icon { width: 16px; height: 16px; opacity: 0.8; }
.nav-item.active .nav-icon { opacity: 1; color: #60A5FA; }

.sidebar-footer { padding: 16px; border-top: 1px solid #1E293B; }
.sidebar-user { display: flex; align-items: center; gap: 10px; }
.sidebar-avatar {
  width: 32px; height: 32px; border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center;
  background: #1E293B; color: #38BDF8; font-size: 11px; font-weight: 700;
}
.sidebar-user-name { font-size: 12px; font-weight: 600; color: #F8FAFC; }
.sidebar-user-role { font-size: 10px; color: #64748B; }
.sidebar-footer-actions { display: flex; gap: 8px; margin-top: 12px; }
.sidebar-footer-btn {
  width: 32px; height: 32px; border-radius: 6px;
  display: inline-flex; align-items: center; justify-content: center;
  background: #1E293B; border: 1px solid #334155; color: #94A3B8;
  cursor: pointer; transition: all var(--transition);
}
.sidebar-footer-btn:hover { background: #334155; color: #F8FAFC; }
.sidebar-footer-btn:active { transform: translateY(0.5px); }
.sidebar-footer-meta { margin-top: 8px; font-size: 10px; color: #64748B; text-align: center; }

.main { margin-left: var(--sidebar-w); flex: 1; display: flex; flex-direction: column; min-height: 100vh; }
.topbar {
  background: var(--bg-surface); border-bottom: 1px solid var(--border);
  padding: 0 24px; min-height: 60px;
  display: flex; align-items: center; justify-content: space-between;
  position: sticky; top: 0; z-index: 50; box-shadow: var(--shadow-sm);
}
.topbar-left { display: flex; align-items: center; gap: 12px; }
.page-title { font-size: 16px; color: var(--text-primary); font-weight: 700; }
.page-sub { font-size: 11px; color: var(--text-muted); }
.topbar-right { display: flex; align-items: center; gap: 16px; }
.topbar-badge {
  display: flex; align-items: center; gap: 6px;
  padding: 4px 10px; background: var(--emerald-light); border-radius: 12px;
  font-size: 10px; color: var(--emerald); font-weight: 600;
}
.live-dot { width: 6px; height: 6px; background: var(--emerald); border-radius: 50%; }

.filterbar-main { display: flex; align-items: center; gap: 8px; }
.comparison-selector, .year-selector {
  display: flex; align-items: center; gap: 4px; padding: 2px;
  background: var(--bg-elevated); border: 1px solid var(--border); border-radius: 8px;
}
.comp-mode-btn, .yr-btn {
  padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600;
  background: transparent; color: var(--text-secondary); cursor: pointer; transition: all var(--transition);
}
.comp-mode-btn.active, .yr-btn.active { background: var(--accent); color: #FFFFFF; }
.comp-mode-btn:hover:not(.active), .yr-btn:hover:not(.active) { background: rgba(0,0,0,0.05); }

.content { width: 100%; max-width: 1400px; margin: 0 auto; padding: 24px; flex: 1; }
.page { display: none; }
.page.active { display: block; }

.kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 20px; }
.kpi-card {
  background: var(--bg-surface); border: 1px solid var(--border);
  border-radius: var(--radius-md); padding: 20px; box-shadow: var(--shadow-sm);
  transition: all var(--transition);
}
.kpi-card:hover { transform: translateY(-1px); border-color: var(--border-strong); }
.kpi-label { font-size: 10px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--text-muted); margin-bottom: 6px; }
.kpi-value { font-size: 24px; color: var(--text-primary); font-weight: 800; letter-spacing: -0.02em; }
.kpi-sub { font-size: 11px; color: var(--text-muted); margin-top: 4px; }
.kpi-tag { display: inline-flex; align-items: center; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; margin-top: 6px; }
.kpi-tag.up { background: var(--emerald-light); color: var(--emerald); }

.chart-grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 16px; }
.chart-card {
  background: var(--bg-surface); border: 1px solid var(--border);
  border-radius: var(--radius-md); padding: 20px; box-shadow: var(--shadow-sm);
}
.chart-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 12px; }
.chart-title { font-size: 14px; color: var(--text-primary); font-weight: 700; }
.chart-subtitle { font-size: 11px; color: var(--text-muted); }
.chart-badge { font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 4px; background: var(--blue-light); color: var(--accent); text-transform: uppercase; }
.chart-wrap { position: relative; width: 100%; border-radius: 8px; background: #FCFDFE; border: 1px solid #F1F5F9; }
.chart-wrap.h260 { height: 260px; }
.chart-wrap.h280 { height: 280px; }
.chart-wrap.h300 { height: 300px; }

.section-title { font-size: 14px; color: var(--text-primary); font-weight: 700; margin: 24px 0 12px; display: flex; align-items: center; gap: 8px; }
.section-title::after { content: ''; flex: 1; height: 1px; background: var(--border); }

/* Tables styling */
.product-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.product-table th {
  text-align: left; padding: 10px 16px; font-size: 10px; font-weight: 700;
  text-transform: uppercase; color: var(--text-muted); background: var(--bg-elevated);
  border-bottom: 1px solid var(--border);
}
.product-table th:not(:first-child) { text-align: right; }
.product-table td { padding: 10px 16px; border-bottom: 1px solid var(--border); color: var(--text-primary); font-weight: 500; }
.product-table td:not(:first-child) { text-align: right; }
.product-table tbody tr:nth-child(even) { background-color: rgba(248, 250, 252, 0.5); }
.product-table tbody tr:hover { background-color: var(--blue-light); }

/* Climate Grid */
.seasonal-planner-banner {
  background: #0F172A; border-radius: var(--radius-md); padding: 20px; margin-bottom: 20px; color: #FFFFFF;
}
.seasonal-planner-title { font-size: 15px; font-weight: 700; color: #FFFFFF; }
.seasonal-planner-sub { font-size: 12px; color: #94A3B8; margin-top: 2px; }
.seasonal-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 16px; }
.season-card {
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
  border-radius: var(--radius-md); padding: 16px; transition: all var(--transition);
  cursor: pointer;
}
.season-card:hover { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.15); transform: translateY(-1px); }
.season-card.active-season { border: 2px solid #0EA5E9 !important; background: rgba(14,165,233,0.1) !important; }
.season-card-tag { font-size: 9px; font-weight: 700; text-transform: uppercase; margin-bottom: 6px; }
.season-card-title { font-size: 13px; font-weight: 700; color: #FFFFFF; margin-bottom: 8px; display: flex; align-items: center; gap: 6px; }
.season-card-list { list-style: none; font-size: 11px; color: #CBD5E1; }
.season-card-list li { margin-bottom: 4px; }
.drilldown-prompt { margin-top: 10px; font-size: 9px; font-weight: 700; color: #60A5FA; text-transform: uppercase; }

/* Status pill styling */
.status-pill {
  padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: 700; text-transform: uppercase; display: inline-block;
}
.status-ready { background: var(--emerald-light); color: var(--emerald); border: 1px solid rgba(4,120,87,0.2); }
.status-draft { background: var(--blue-light); color: var(--accent); border: 1px solid rgba(37,99,235,0.2); }
.status-blocked { background: var(--red-light); color: var(--red); border: 1px solid rgba(185,28,28,0.2); }

/* Semantic alerts */
.alert-grid { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; }
.alert-card {
  display: flex; align-items: center; justify-content: space-between; padding: 12px 16px;
  background: var(--bg-surface); border: 1px solid var(--border); border-radius: var(--radius-md); box-shadow: var(--shadow-sm);
}
.alert-card.danger { border-left: 4px solid var(--red); background: var(--red-light); border-color: rgba(185,28,28,0.15); }
.alert-card.warn { border-left: 4px solid var(--amber); background: var(--amber-light); border-color: rgba(180,83,9,0.15); }
.alert-card.ok { border-left: 4px solid var(--emerald); background: var(--emerald-light); border-color: rgba(4,120,87,0.15); }
.alert-tag { font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 4px; text-transform: uppercase; }
.alert-tag.danger { background: rgba(185,28,28,0.1); color: var(--red); }
.alert-tag.warn { background: rgba(180,83,9,0.1); color: var(--amber); }
.alert-tag.ok { background: rgba(4,120,87,0.1); color: var(--emerald); }
.alert-title { font-size: 12px; font-weight: 700; color: var(--text-primary); }
.alert-body { font-size: 11px; color: var(--text-secondary); margin-top: 2px; }

/* Buttons & spinners */
.btn {
  padding: 6px 14px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer;
  transition: all var(--transition); border: none; display: flex; align-items: center; gap: 6px;
}
.btn-primary { background: var(--accent); color: white; }
.btn-primary:hover { background: var(--accent-mid); }
.btn-primary:active { transform: translateY(0.5px); }
.btn-primary:disabled { opacity: 0.5; pointer-events: none; }
.btn-secondary { background: transparent; border: 1px solid var(--border); color: var(--text-secondary); }
.btn-secondary:hover { background: var(--bg-elevated); color: var(--text-primary); }
.btn-secondary:active { transform: translateY(0.5px); }

/* Modal styles */
.custom-modal-backdrop {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(15, 23, 42, 0.4); z-index: 1000;
  display: flex; align-items: center; justify-content: center;
}
.custom-modal-card {
  background: #FFFFFF; border: 1px solid var(--border);
  border-radius: var(--radius-md); padding: 20px; max-width: 440px; width: 90%;
  box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1);
}
.custom-modal-header { display: flex; align-items: center; gap: 10px; font-weight: 700; }
.custom-modal-body { font-size: 12px; color: var(--text-secondary); margin-top: 10px; line-height: 1.5; }
.custom-modal-footer { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }

/* Ingestion styles */
.upload-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.upload-zone { background: var(--bg-surface); border: 2px dashed var(--border); border-radius: var(--radius-md); padding: 20px; text-align: center; }
.upload-hint { font-size: 11px; color: var(--text-muted); margin-top: 4px; }
.upload-log { padding: 12px; border-radius: 8px; background: var(--bg-elevated); border: 1px solid var(--border); color: var(--text-secondary); font-size: 12px; margin-top: 12px; }

.inline-icon { vertical-align: middle; }
.animate-spin { animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

/* Seasonal styling */
.clickable-season { cursor: pointer !important; position: relative; transition: all 0.2s; }
.clickable-season:hover { transform: translateY(-3px); box-shadow: 0 10px 24px rgba(0,0,0,0.2); border-color: #38BDF8 !important; }
.clickable-season.active-season { border: 2px solid #38BDF8 !important; background: rgba(56,189,248,0.12) !important; box-shadow: 0 0 0 3px rgba(56,189,248,0.2); }
.drilldown-prompt { margin-top: 12px; font-size: 11px; font-weight: 700; color: #38BDF8; text-transform: uppercase; letter-spacing: 0.06em; }
"""

# --- STEP 2: Extract baseline MEDSHIELD_MARKUP with enhancements and NO role selector ---
medshield_markup = """
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
    <div class="nav-item active" onclick="showPage('overview', this)" role="button" tabindex="0">
      <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
      <span class="nav-label">Overview</span>
    </div>
    <div class="nav-item" onclick="showPage('revenue', this)" role="button" tabindex="0">
      <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12\"></polyline></svg>
      <span class="nav-label">Sales Diagnostics</span>
    </div>
    <div class="nav-item" onclick="showPage('products', this)" role="button" tabindex="0">
      <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z\"></path></svg>
      <span class="nav-label">Product Prioritization</span>
    </div>
    <div class="nav-item" onclick="showPage('territory', this)" role="button" tabindex="0">
      <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z\"></path><polyline points="9 22 9 12 15 12 15 22\"></polyline></svg>
      <span class="nav-label">Area Prioritization</span>
    </div>
    <div class="nav-section" style="margin-top:8px;">DSS</div>
    <div class="nav-item" onclick="showPage('forecast', this)" role="button" tabindex="0">
      <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10\"></line><line x1="12" y1="20" x2="12" y2="4\"></line><line x1="6" y1="20" x2="6" y2="14\"></line></svg>
      <span class="nav-label">Forecast Modeling</span>
    </div>
    <div class="nav-item" onclick="showPage('inventory', this)" role="button" tabindex="0">
      <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2\"></rect><line x1="16" y1="2" x2="16" y2="6\"></line><line x1="8" y1="2" x2="8" y2="6\"></line><line x1="3" y1="10" x2="21" y2="10\"></line></svg>
      <span class="nav-label">Prescriptive Planning</span>
    </div>
    <div class="nav-item" onclick="showPage('data', this)" role="button" tabindex="0">
      <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4\"></path><polyline points="17 8 12 3 7 8\"></polyline><line x1="12" y1="3" x2="12" y2="15\"></line></svg>
      <span class="nav-label">Data Upload</span>
    </div>
  </nav>

  <div class="sidebar-footer">
    <div class="sidebar-user">
      <div class="sidebar-avatar">MS</div>
      <div class="sidebar-user-meta">
        <div class="sidebar-user-name">Supply Planner</div>
        <div class="sidebar-user-role" id="userRoleDisplay">Role: Supply Planner [Level 2 - Write Access]</div>
      </div>
    </div>
    
    <div class="sidebar-footer-actions" style="margin-top:12px;">
      <button class="sidebar-footer-btn" type="button" onclick="toggleTheme()" aria-label="Toggle dark mode">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5\"></circle><line x1="12" y1="1" x2="12" y2="3\"></line><line x1="12" y1="21" x2="12" y2="23\"></line></svg>
      </button>
      <button class="sidebar-footer-btn" type="button" onclick="openHelp()" aria-label="Open help">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10\"></circle><path d="M9.09 9a3 3 0 0 1 5.82 1c0 2-3 3-3 3\"></path><line x1="12" y1="17" x2="12.01" y2="17\"></line></svg>
      </button>
      <button id="sidebarLogoutBtn" class="sidebar-footer-btn logout-btn" type="button" aria-label="Log Out">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4\"></path><polyline points="16 17 21 12 16 7\"></polyline><line x1="21" y1="12" x2="9" y2="12\"></line></svg>
      </button>
    </div>
    <div class="sidebar-footer-meta" style="margin-top:8px;">v2.5 Enterprise Decision Support</div>
  </div>
</aside>

<!-- MAIN -->
<main class="main">
  <!-- TOPBAR -->
  <div class="topbar">
    <div class="topbar-left">
      <button class="nav-toggle" type="button" onclick="toggleNavigation()" aria-label="Toggle navigation">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12\"></line><line x1="3" y1="6" x2="21" y2="6\"></line><line x1="3" y1="18" x2="21" y2="18\"></line></svg>
      </button>
      <div>
        <div class="page-title" id="topbar-title">Executive Overview</div>
        <div class="page-sub" id="topbar-sub">Centralized demand intelligence, forecasting, and stock actions</div>
      </div>
    </div>
    <div class="topbar-right">
      <div class="filterbar-main" id="filterBar">
        <div class="comparison-selector">
          <button class="comp-mode-btn active" onclick="setComparisonMode('single', this)">Single Year</button>\n          <button class="comp-mode-btn" onclick="setComparisonMode('yoy', this)">Y/Y Compare</button>\n        </div>
        <div class="year-selector" id="yearSelector">
          <button class="yr-btn active" onclick="setYear('all', this)">All</button>
          <button class="yr-btn" onclick="setYear('2021', this)">2021</button>
          <button class="yr-btn" onclick="setYear('2022', this)">2022</button>
          <button class="yr-btn" onclick="setYear('2023', this)">2023</button>
          <button class="yr-btn" onclick="setYear('2024', this)">2024</button>
          <button class="yr-btn" onclick="setYear('2025', this)">2025</button>
        </div>
      </div>
      <div class="topbar-badge"><div class="live-dot"></div> Live System Active</div>
    </div>
  </div>

  <!-- DATA FRESHNESS GOVERNANCE BAR -->
  <div class="data-freshness-bar" style="background:#FFFFFF; border-bottom:1px solid var(--border); padding:8px 24px; font-size:11px; color:var(--text-muted); display:flex; justify-content:space-between; align-items:center;">
    <div style="display:flex; align-items:center; gap:8px;">
      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" class="inline-icon" style="color:var(--emerald);"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z\"></path><path d="m9 12 2 2 4-4\"></path></svg>
      <span>Data Stream Integrity: <strong>99.4%</strong></span>
      <span style="color:var(--border-strong);">|</span>
      <span>Refresh Schedule: <strong>Daily at 00:00 PHT</strong></span>
      <span style="color:var(--border-strong);">|</span>
      <span>Last Sync: <strong>12 mins ago</strong></span>
    </div>
    <div style="display:flex; align-items:center; gap:6px;">
      <span class="status-pill status-ready" style="font-size:9px; padding:1px 6px;">DOH-PAGASA LINKED</span>
    </div>
  </div>

  <div class="content">

    <!-- PAGE: OVERVIEW -->
    <div class="page active" id="page-overview">
      <!-- Top Row KPI Grid -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-label">Total Cumulative Revenue</div>
          <div class="kpi-value">₱438.9M</div>
          <span class="kpi-tag up">+224% growth (2021–2025)</span>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">2026 Forecast Start</div>
          <div class="kpi-value">₱9.3M <span style="font-size:11px; font-weight:normal; color:var(--text-muted);">(\u00b112.4% CI)</span></div>
          <div class="kpi-sub">Jan projected demand</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Peak Demand Season</div>
          <div class="kpi-value">May &amp; Nov</div>
          <div class="kpi-sub">Highest seasonal lift</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Top Territory Share</div>
          <div class="kpi-value">Government</div>
          <div class="kpi-sub">Primary allocation sector</div>
        </div>
      </div>

      <!-- Compliance Data Quality Warning Banner -->
      <div class="compliance-warning-banner" style="background:#FFFBEB; border:1px solid #FCD34D; border-radius:8px; padding:12px 16px; margin-bottom:20px; display:flex; align-items:center; gap:12px; color:#B45309; font-size:12px;">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" style="color:#B45309; flex-shrink:0;"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z\"></path><line x1="12" y1="9" x2="12" y2="13\"></line><line x1="12" y1="17" x2="12.01" y2="17\"></line></svg>
        <div>
          <strong>Scenario-Only Mode Warning:</strong> External DOH surveillance synchronization is currently pending. Analytics are operating in fallback local data mode.
        </div>
      </div>

      <!-- Middle Row: Interactive Time Series -->
      <div class="chart-card" style="margin-bottom: 20px;">
        <div class="chart-header">
          <div>
            <div class="chart-title">
              Baseline Demand &amp; Profitability
              <span class="status-pill status-ready" style="font-size:9px; padding:1px 6px; margin-left:8px; vertical-align:middle;">VALIDATED (Local ERP)</span>
            </div>
            <div class="chart-subtitle">Historical revenue vs net income (2021–2025) with currency metrics</div>
          </div>
          <span class="chart-badge">Historical Outlook</span>
        </div>
        <div class="chart-wrap h300"><canvas id="overviewBaselineChart"></canvas></div>
      </div>

      <!-- Bottom Row Split: Status & Alerts -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
        <div class="chart-card">
          <div class="chart-header">
            <div>
              <div class="chart-title">Model Publication Status</div>
              <div class="chart-subtitle">Calibration status of current DSS layer models</div>
            </div>
          </div>
          <div style="display:flex; flex-direction:column; gap:10px;">
            <div style="display:flex; align-items:center; justify-content:space-between; padding:8px 0; border-bottom:1px solid var(--border);">
              <span style="font-size:12px; font-weight:600;">Descriptive Analytics Model</span>
              <span class="status-pill status-ready">READY</span>
            </div>
            <div style="display:flex; align-items:center; justify-content:space-between; padding:8px 0; border-bottom:1px solid var(--border);">
              <span style="font-size:12px; font-weight:600;">Predictive Time-Series Model (Prophet)</span>
              <span class="status-pill status-draft">DRAFT</span>
            </div>
            <div style="display:flex; align-items:center; justify-content:space-between; padding:8px 0;">
              <span style="font-size:12px; font-weight:600;">Prescriptive Buffer Model (EOQ/ROP)</span>
              <span class="status-pill status-ready">READY</span>
            </div>
          </div>
        </div>

        <div class="chart-card">
          <div class="chart-header">
            <div>
              <div class="chart-title">Active Decision Focus</div>
              <div class="chart-subtitle">High-priority compliance and stock-out alerts</div>
            </div>
          </div>
          <div style="display:flex; flex-direction:column; gap:8px;">
            <div style="font-size:11px; padding:8px 12px; border-radius:6px; background:#fef2f2; border:1px solid #fca5a5; color:#b91c1c; font-weight:600;">
              CRITICAL: Stock-out threat on Systemic Antipyretics (Non-NSAID) during monsoon peak.
            </div>
            <div style="font-size:11px; padding:8px 12px; border-radius:6px; background:#fffbeb; border:1px solid #fcd34d; color:#b45309; font-weight:600;">
              WARNING: Dengue Alert Level 3 Active in Quezon region. Monitor safety stocks.
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- PAGE: REVENUE DIAGNOSTICS -->
    <div class="page" id="page-revenue">
      <!-- Data Lineage Info Notice Panel -->
      <div class="compliance-warning-banner" style="background:#F0F9FF; border:1px solid #0EA5E9; border-radius:8px; padding:12px 16px; margin-bottom:20px; display:flex; align-items:center; gap:12px; color:#0369A1; font-size:12px;">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" style="color:#0EA5E9; flex-shrink:0;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
        <div>
          <strong>DOH-PAGASA Data Lineage Note:</strong> Weather-disease linkages and therapeutic allocation recommendations are modeled using static historical epidemiological surveillance datasets (DOH PIDSR) and localized regional weather station summaries, rather than live web scraping or direct real-time API integrations.
        </div>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-label">2025 Annual Revenue</div>
          <div class="kpi-value">₱183.8M</div>
          <span class="kpi-tag up">+224% vs 2021</span>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">2025 Net Income</div>
          <div class="kpi-value">₱89.5M</div>
          <div class="kpi-sub">48.7% net profit margin</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Highest Single Month</div>
          <div class="kpi-value">May 2025</div>
          <div class="kpi-sub">Peak transaction volume</div>
        </div>
      </div>

      <div class="chart-full" style="margin-bottom: 20px;">
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

      <!-- YoY Growth & Margins Split Grid -->
      <div class="chart-grid-2" style="margin-bottom: 20px;">
        <div class="chart-card">
          <div class="chart-header">
            <div>
              <div class="chart-title">Year-over-Year Revenue Growth</div>
              <div class="chart-subtitle">Percentage growth rate vs previous periods</div>
            </div>
          </div>
          <div class="chart-wrap h300"><canvas id="growthChart"></canvas></div>
        </div>
        <div class="chart-card">
          <div class="chart-header">
            <div>
              <div class="chart-title">Net Profit Margins</div>
              <div class="chart-subtitle">Net income margin contribution ratio by year</div>
            </div>
          </div>
          <div class="chart-wrap h300"><canvas id="marginChart"></canvas></div>
        </div>
      </div>

      <!-- Seasonality Trend -->
      <div class="chart-full">
        <div class="chart-card">
          <div class="chart-header">
            <div>
              <div class="chart-title">Historical Seasonality Demand Curve</div>
              <div class="chart-subtitle">Monthly average sales patterns showing peak seasons</div>
            </div>
          </div>
          <div class="chart-wrap h300"><canvas id="seasonChart"></canvas></div>
        </div>
      </div>
    </div>

    <!-- PAGE: PRODUCT PRIORITIZATION -->
    <div class="page" id="page-products">
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

      <div class="chart-card" style="margin-bottom: 20px;">
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
    <div class="page" id="page-territory">
      <div class="chart-grid-2">
        <div class="chart-card">
          <div class="chart-header">
            <div>
              <div class="chart-title">Revenue by Territory</div>
              <div class="chart-subtitle">Cumulative area sales contribution</div>
            </div>
          </div>
          <div class="chart-wrap h260"><canvas id="areaBarChart"></canvas></div>
        </div>
        <div class="chart-card">
          <div class="chart-header">
            <div>
              <div class="chart-title">Net Income by Territory</div>
              <div class="chart-subtitle">Regional profit contribution</div>
            </div>
          </div>
          <div class="chart-wrap h260"><canvas id="areaIncomeChart"></canvas></div>
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
    <div class="page" id="page-forecast">
      <div class="chart-card" style="margin-bottom: 20px;">
        <div class="chart-header">
          <div>
            <div class="chart-title">
              2026 Monthly Demand Forecast
              <span class="status-pill status-ready" style="font-size:9px; padding:1px 6px; margin-left:8px; vertical-align:middle;">VALIDATED (PAGASA API)</span>
            </div>
            <div class="chart-subtitle">12-Month Prophet time-series outlook with confidence bands (\u00b112.4% CI)</div>
          </div>
          <span class="chart-badge">Predictive Outlook</span>
        </div>
        <div class="chart-wrap h300"><canvas id="forecastChart"></canvas></div>
      </div>

      <!-- PAGASA Weather & DOH Case Correlation, and Seasonality Index -->
      <div class="chart-grid-2" style="margin-bottom: 20px;">
        <div class="chart-card">
          <div class="chart-header">
            <div>
              <div class="chart-title">PAGASA Weather &amp; DOH Case Correlation</div>
              <div class="chart-subtitle">Rainfall Severity Index vs Dengue Infection Index</div>
            </div>
          </div>
          <div class="chart-wrap h300"><canvas id="externalChart"></canvas></div>
        </div>
        <div class="chart-card">
          <div class="chart-header">
            <div>
              <div class="chart-title">Climate-Disease Seasonality Index</div>
              <div class="chart-subtitle">Calculated demand amplification multiplier by month</div>
            </div>
          </div>
          <div class="chart-wrap h300"><canvas id="seasonIndexChart"></canvas></div>
        </div>
      </div>

      <div class="section-title">Model Benchmarking &amp; Validation</div>
      <div class="chart-card">
        <table class="product-table" id="evalTable"></table>
      </div>
    </div>

    <!-- PAGE: PRESCRIPTIVE PLANNING & SEASONAL EPIDEMIC -->
    <div class="page" id="page-inventory">
      <!-- 4-Card Philippine Seasons Grid -->
      <div class="seasonal-planner-banner">
        <div class="seasonal-planner-header">
          <div>
            <div class="seasonal-planner-title">Prescriptive Seasonal Climate-Disease Mapping</div>
            <div class="seasonal-planner-sub">Select a season card to drill down into generalized DOH/WHO therapeutic category reorder calculations and Econonomic Order Quantities.</div>
          </div>
        </div>
        
        <div class="seasonal-grid">
          <!-- Amihan Card -->
          <div class="season-card clickable-season" onclick="if(window.selectSeasonRestock)window.selectSeasonRestock('amihan',this)">
            <div class="season-card-tag" style="color:#38BDF8">Jan &amp; Feb</div>
            <div class="season-card-title">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" class="inline-icon" style="color:#38BDF8;"><path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25"></path><line x1="8" y1="16" x2="8" y2="22"></line><line x1="12" y1="18" x2="12" y2="22"></line></svg>
              Amihan Cool Dry
            </div>
            <ul class="season-card-list">
              <li><strong>Risks:</strong> Flu/ILI Surges, Pediatric Asthma</li>
              <li><strong>Restock:</strong> Bronchodilators, Antihistamines</li>
              <li><strong>Rule:</strong> Regular base stock buffers active</li>
            </ul>
            <div class="drilldown-prompt">View Reorder Plan</div>
          </div>
          
          <!-- Hot Dry Card -->
          <div class="season-card clickable-season" onclick="if(window.selectSeasonRestock)window.selectSeasonRestock('summer',this)">
            <div class="season-card-tag" style="color:#F59E0B">Mar &amp; Apr</div>
            <div class="season-card-title">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" class="inline-icon" style="color:#F59E0B;"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line></svg>
              Summer Heat Surge
            </div>
            <ul class="season-card-list">
              <li><strong>Risks:</strong> Gastroenteritis, Dehydration, Typhoid</li>
              <li><strong>Restock:</strong> ORS, GI Anti-Infectives, PPIs</li>
              <li><strong>Rule:</strong> Dehydration stock adjustment active</li>
            </ul>
            <div class="drilldown-prompt">View Reorder Plan</div>
          </div>

          <!-- Pre-Monsoon Card -->
          <div class="season-card clickable-season" onclick="if(window.selectSeasonRestock)window.selectSeasonRestock('pre_monsoon',this)">
            <div class="season-card-tag" style="color:#34D399">May &amp; Jun</div>
            <div class="season-card-title">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" class="inline-icon" style="color:#34D399;"><path d="M19 16.9A5 5 0 0 0 18 7h-1.26a8 8 0 1 0-11.62 8.58"></path><polyline points="13 11 9 17 12 17 11 23 15 17 12 17 13 11"></polyline></svg>
              Pre-Monsoon Storms
            </div>
            <ul class="season-card-list">
              <li><strong>Risks:</strong> Early Dengue, HFMD, GI outbreaks</li>
              <li><strong>Restock:</strong> Non-NSAID Antipyretics, IV Fluids</li>
              <li><strong>Rule:</strong> Initial safety buffer uplift active</li>
            </ul>
            <div class="drilldown-prompt">View Reorder Plan</div>
          </div>

          <!-- Monsoon Habagat Card -->
          <div class="season-card clickable-season active-season" onclick="if(window.selectSeasonRestock)window.selectSeasonRestock('monsoon',this)">
            <div class="season-card-tag" style="color:#EF4444">Jul &amp; Aug</div>
            <div class="season-card-title">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" class="inline-icon" style="color:#EF4444;"><line x1="16" y1="13" x2="16" y2="21"></line><line x1="8" y1="13" x2="8" y2="21"></line><line x1="12" y1="15" x2="12" y2="23"></line><path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"></path></svg>
              Monsoon (Habagat)
            </div>
            <ul class="season-card-list">
              <li><strong>Risks:</strong> Dengue Outbreaks, Leptospirosis, Cholera</li>
              <li><strong>Restock:</strong> Antipyretics, Doxycycline, IV Fluids</li>
              <li><strong>Rule:</strong> Buffer: +45% Antipyretics, +40% Doxy, +35% IVF</li>
            </ul>
            <div class="drilldown-prompt">View Reorder Plan</div>
          </div>
        </div>

        <!-- Dynamic Category-Level Table -->
        <div id="seasonalDrilldownContainer" style="margin-top:20px; background:#FFFFFF; border:1px solid #E2E8F0; border-radius:12px; padding:20px; color:#0F172A; box-shadow:var(--shadow-sm);">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:14px;">
            <div>
              <div id="drilldownTitle" style="font-size:14px; font-weight:700; color:#0F172A;">
                July &amp; August — Peak Monsoon (Habagat) &amp; Floods
                <span class="status-pill status-ready" style="font-size:9px; padding:1px 6px; margin-left:8px; vertical-align:middle;">VALIDATED (DOH PIDSR API)</span>
              </div>
              <div id="drilldownSub" style="font-size:11px; color:#64748B; margin-top:2px;">Prescribed Category Procurement Recommendations &amp; Safety Stock Multipliers</div>
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
              <button id="exportCsvBtn" onclick="exportRestockPlanToCsv()" class="btn btn-primary" style="display:none; font-size:11px; padding:6px 12px;">Export Procurement Schedule (CSV/PDF)</button>
              <span id="drilldownBadge" class="alert-tag danger" style="background:#FEF2F2; color:#B91C1C;">DOH Outbreak Alert</span>
            </div>
          </div>
          <table class="product-table">
            <thead><tr>
              <th style="text-align:left">Therapeutic Category</th>
              <th>Surge Buffer</th>
              <th>Current Stock</th>
              <th>Recommended EOQ Reorder</th>
              <th>Reorder Point (ROP)</th>
              <th>Urgency</th>
              <th>Unit Cost</th>
            </tr></thead>
            <tbody id="seasonalDrilldownTable"><tr><td colspan="7" style="text-align:center; padding:20px; color:#64748B;">Select a season card above to load recommendations</td></tr></tbody>
          </table>
        </div>

        <!-- MODEL TRANSPARENCY ACCORDION PANEL -->
        <div class="model-transparency-card" style="background:#FFFFFF; border:1px solid var(--border); border-radius:12px; padding:20px; margin-top:16px; box-shadow:var(--shadow-sm); color:var(--text-primary);">
          <details>
            <summary style="font-size:13px; font-weight:700; cursor:pointer; outline:none; display:flex; align-items:center; gap:8px; list-style:none;">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent);"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
              <span>View Prescriptive Model Rationale &amp; Optimization Weights</span>
            </summary>
            <div style="font-size:12px; color:var(--text-secondary); margin-top:12px; line-height:1.6; border-top:1px solid var(--border); padding-top:12px;">
              <p style="margin-bottom:10px;">The prescriptive engine computes replenishment volumes by solving the continuous economic order quantity (EOQ) equation with monsoon weather adjustments:</p>
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; background:var(--bg-elevated); padding:12px; border-radius:8px; border:1px solid var(--border);">
                <div>
                  <strong>Active Optimization Weights:</strong>
                  <ul style="list-style:disc; margin-left:16px; margin-top:4px;">
                    <li>Dengue Outbreak Surge Weight: <strong>45%</strong></li>
                    <li>Historical Baseline Demand: <strong>35%</strong></li>
                    <li>Lead Time Delay Factor: <strong>20%</strong></li>
                  </ul>
                </div>
                <div>
                  <strong>Risk &amp; Bias Buffers:</strong>
                  <ul style="list-style:disc; margin-left:16px; margin-top:4px;">
                    <li>Confidence Interval: <strong>95% (\u00b112.4% CI)</strong></li>
                    <li>Stock-out Prevention Factor: <strong>1.5x safety buffer</strong></li>
                  </ul>
                </div>
              </div>
            </div>
          </details>
        </div>
      </div>

      <!-- Actionable Alerts & Buffers Management -->
      <div class="section-title">Active Prescriptive Inventory Alerts</div>
      <div class="alert-grid">
        <!-- CRITICAL ALERT -->
        <div class="alert-card danger">
          <div style="display: flex; gap: 12px; align-items: center;">
            <span class="alert-tag danger">CRITICAL</span>
            <div>
              <div class="alert-title">Stock Out Risk: Systemic Antipyretics (Non-NSAID)</div>
              <div class="alert-body">Monsoon demand spike (+45% buffer) will exhaust safety stock levels in Batangas. NSAIDs contraindicated due to Dengue risk.</div>
            </div>
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="btn btn-secondary" onclick="window.openEoqModal()">Override Model Signal</button>
            <button class="btn btn-primary" id="triggerEoqBtn" onclick="window.openEoqModal()">Review EOQ Reorder</button>
          </div>
        </div>

        <!-- WARNING ALERT -->
        <div class="alert-card warn">
          <div style="display: flex; gap: 12px; align-items: center;">
            <span class="alert-tag warn">WARNING</span>
            <div>
              <div class="alert-title">Dengue Alert Level 3 Active</div>
              <div class="alert-body">DOH infection index > 1.4 in Quezon. Buffer recalibration recommended.</div>
            </div>
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="btn btn-secondary" onclick="exportRestockPlanToCsv()">Export Audit Report</button>
            <button class="btn btn-primary" id="recalibrateBtn" onclick="window.recalibrateModelSafetyBuffers(this)">
              Recalibrate Model Safety Buffers
            </button>
          </div>
        </div>
      </div>

      <div class="section-title">EOQ &amp; ROP Reorder Recommendations</div>
      <div class="chart-card">
        <table class="product-table" id="eoqTable"></table>
      </div>
    </div>

    <!-- PAGE: DATA UPLOAD -->
    <div class="page" id="page-data">
      <div class="upload-grid">
        <div class="upload-zone">
          <div class="section-title" style="justify-content:center; margin-bottom:8px; border:none;">Upload Sales CSV</div>
          <div class="upload-hint">Expected columns: period, revenue, income.</div>
          <input id="salesCsvInput" type="file" accept=".csv,text/csv" style="margin-top:16px;">
        </div>
        <div class="upload-zone">
          <div class="section-title" style="justify-content:center; margin-bottom:8px; border:none;">Upload Dataset JSON</div>
          <div class="upload-hint">Expected structure: monthly, by_area, year_summary, seasonality.</div>
          <input id="datasetJsonInput" type="file" accept=".json,application/json" style="margin-top:16px;">
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

<!-- COMPLIANCE SECURITY AUDIT LEDGER MODAL -->
<div id="auditLogModal" class="custom-modal-backdrop" style="display:none;">
  <div class="custom-modal-card">
    <div class="custom-modal-header" style="border-bottom:1px solid var(--border); padding-bottom:10px; margin-bottom:14px; font-size:14px; color:var(--text-primary);">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent);"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path><path d="M12 6v6l4 2"></path></svg>
      <span>DSS Security Audit &amp; Confirmation</span>
    </div>
    <div class="custom-modal-body" style="font-size:12px; color:var(--text-secondary); line-height:1.6;">
      <div style="background:var(--bg-elevated); padding:10px; border-radius:6px; border:1px solid var(--border); margin-bottom:12px;">
        <div><strong>Action Type:</strong> <span id="auditActionType">Trigger EOQ Order</span></div>
        <div><strong>Operator:</strong> <span id="auditOperator">Supply Planner (Level 2)</span></div>
        <div><strong>Previous Value:</strong> <span id="auditPrevVal">Draft Scenario</span></div>
        <div><strong>New Value:</strong> <span id="auditNewVal">Monsoon Restock (Active)</span></div>
        <div><strong>Timestamp:</strong> <span id="auditTimestamp">2026-08-04T21:43:33</span></div>
      </div>
      <p style="margin-bottom:8px;">Please review the model recommendations before executing. This operation will be logged permanently in the SOC 2 compliance ledger.</p>
    </div>
    <div class="custom-modal-footer">
      <button class="btn btn-secondary" onclick="window.closeAuditModal()">Cancel</button>
      <button id="executeOrderBtn" class="btn btn-primary" onclick="window.confirmAndExecuteOrder()">
        Confirm &amp; Execute Order
      </button>
    </div>
  </div>
</div>

<!-- EOQ REORDER MODAL -->
<div id="eoqReorderModal" class="custom-modal-backdrop" style="display:none;">
  <div class="custom-modal-card">
    <div class="custom-modal-header" style="border-bottom:1px solid var(--border); padding-bottom:10px; margin-bottom:14px; font-size:14px; color:var(--text-primary);">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent);"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path><path d="m9 12 2 2 4-4"></path></svg>
      <span>Confirm Economic Order Quantity Reorder</span>
    </div>
    <div class="custom-modal-body" style="font-size:12px; color:var(--text-secondary); line-height:1.6;">
      <p style="margin-bottom:8px;">This will execute an automated reorder purchase contract for the following peak monsoon requirements:</p>
      <ul style="list-style:disc; margin-left:20px; margin-bottom:12px;">
        <li>Systemic Antipyretics (Non-NSAID): <strong>4,000 units</strong></li>
        <li>Flood Prophylactics &amp; Antibiotics (Doxycycline): <strong>1,200 units</strong></li>
        <li>IV Fluids &amp; Isotonic Electrolytes: <strong>500 units</strong></li>
      </ul>
      <p>The action will trigger automated procurement tickets and log this confirmation in the system's compliance audit history.</p>
    </div>
    <div class="custom-modal-footer">
      <button class="btn btn-secondary" onclick="window.closeEoqModal()">Cancel</button>
      <button id="confirmEoqBtn" class="btn btn-primary" onclick="window.executeEoqReorder()">
        Confirm &amp; Purchase
      </button>
    </div>
  </div>
</div>
"""

# --- STEP 3: Read and extract baseline JS, removing previous duplicate injections ---
# We find export const MEDSHIELD_SCRIPT = " and walk inside the string.
script_match = re.search(r'export const MEDSHIELD_SCRIPT = "(.*?)"\s*$', content, re.DOTALL)
if not script_match:
    script_match = re.search(r'export const MEDSHIELD_SCRIPT = "(.*?)"', content, re.DOTALL)

raw_script_str = script_match.group(1)

# Inside the double quoted string, raw newlines are escaped as \n.
# Let's unescape it to normal JS code so we can process it easily.
js_code = raw_script_str.replace("\\n", "\n").replace('\\"', '"').replace("\\\\", "\\")

# Look for the first occurrence of:
# "if (typeof window !== 'undefined') {" or "_fnList" or "selectSeasonRestock"
split_markers = [
    "if (typeof window !== 'undefined') {\n  window.selectSeasonRestock",
    "if (typeof window !== 'undefined') {\n  window.openEoqModal",
    "if (typeof window !== 'undefined') {\n  var _fnList = ["
]

split_pos = len(js_code)
for marker in split_markers:
    pos = js_code.find(marker)
    if pos != -1 and pos < split_pos:
        split_pos = pos

clean_js_baseline = js_code[:split_pos].strip()

# --- STEP 4: Add sales-data and weather-validation to PAGE_META ---
old_meta_end = "  data: ['Data Upload', 'CSV and JSON sources for dashboard updates']\\n};"
new_meta_end = """  data: ['Data Upload', 'CSV and JSON sources for dashboard updates'],
  'sales-data': ['View Sales Data', 'Standardized and quality-checked transactions'],
  'weather-validation': ['Weather API Validation', 'NASA POWER and Open-Meteo proxy integration']
};"""

if old_meta_end in clean_js_baseline:
    clean_js_baseline = clean_js_baseline.replace(old_meta_end, new_meta_end)
else:
    # Just in case:
    clean_js_baseline = re.sub(
        r"data:\s*\[\s*'Data Upload'\s*,\s*'CSV and JSON sources for dashboard updates'\s*\]\s*\n\s*\};",
        new_meta_end,
        clean_js_baseline
    )

# --- STEP 5: Add ML-Suggested Buffer column to eoqTable generation ---
old_eoq_table_code = """  const eoqRows = [
    { product: 'ANTIZOAL IV 500MG', demand: '18,400', eoq: '240', rop: '80', safety: '32', risk: 'High' },
    { product: 'CEFTRIAXONE 1G', demand: '42,800', eoq: '520', rop: '140', safety: '55', risk: 'Medium' },
    { product: 'PARACETAMOL 500MG', demand: '86,200', eoq: '760', rop: '210', safety: '84', risk: 'Low' },
    { product: 'OMEPRAZOLE 40MG', demand: '51,000', eoq: '480', rop: '130', safety: '50', risk: 'Low' },
    { product: 'AMOXICILLIN 500MG', demand: '98,400', eoq: '810', rop: '240', safety: '96', risk: 'Medium' }
  ];
  renderTable('eoqTable', `
  <thead>
    <tr>
      <th>Product</th><th>Annual Demand</th><th>EOQ (units)</th><th>ROP</th><th>Safety Stock</th><th>Risk</th>
    </tr>
  </thead>
  <tbody>
    ${eoqRows.map((row) => `
      <tr>
        <td>${row.product}</td>
        <td>${row.demand}</td>
        <td>${row.eoq}</td>
        <td>${row.rop}</td>
        <td>${row.safety}</td>
        <td>${row.risk}</td>
      </tr>
    `).join('')}
  </tbody>
  `);"""

new_eoq_table_code = """  const eoqRows = [
    { product: 'ANTIZOAL IV 500MG', demand: '18,400', eoq: '240', rop: '80', safety: '32', ml_safety: '48', risk: 'High' },
    { product: 'CEFTRIAXONE 1G', demand: '42,800', eoq: '520', rop: '140', safety: '55', ml_safety: '68', risk: 'Medium' },
    { product: 'PARACETAMOL 500MG', demand: '86,200', eoq: '760', rop: '210', safety: '84', ml_safety: '120', risk: 'Low' },
    { product: 'OMEPRAZOLE 40MG', demand: '51,000', eoq: '480', rop: '130', safety: '50', ml_safety: '55', risk: 'Low' },
    { product: 'AMOXICILLIN 500MG', demand: '98,400', eoq: '810', rop: '240', safety: '96', ml_safety: '110', risk: 'Medium' }
  ];
  renderTable('eoqTable', `
  <thead>
    <tr>
      <th style="text-align:left">Product</th>
      <th>Annual Demand</th>
      <th>EOQ (units)</th>
      <th>ROP (units)</th>
      <th>Safety Stock</th>
      <th>ML-Suggested Buffer</th>
      <th>Outbreak Risk</th>
    </tr>
  </thead>
  <tbody>
    ${eoqRows.map((row) => `
      <tr>
        <td style="font-weight:700;text-align:left">${row.product}</td>
        <td>${row.demand}</td>
        <td style="font-weight:700;color:#0EA5E9">${row.eoq}</td>
        <td>${row.rop}</td>
        <td>${row.safety} units</td>
        <td style="font-weight:700;color:#10B981">+${row.ml_safety} units</td>
        <td><span class="status-pill status-${row.risk === 'High' ? 'blocked' : row.risk === 'Medium' ? 'draft' : 'ready'}">${row.risk}</span></td>
      </tr>
    `).join('')}
  </tbody>
  `);"""

if old_eoq_table_code in clean_js_baseline:
    clean_js_baseline = clean_js_baseline.replace(old_eoq_table_code, new_eoq_table_code)
else:
    # Backup replace on a slice
    clean_js_baseline = clean_js_baseline.replace("<th>Product</th><th>Annual Demand</th><th>EOQ (units)</th><th>ROP</th><th>Safety Stock</th><th>Risk</th>", "<th>Product</th><th>Annual Demand</th><th>EOQ (units)</th><th>ROP (units)</th><th>Safety Stock</th><th>ML-Suggested Buffer</th><th>Outbreak Risk</th>")

# --- STEP 6: Consolidate new JavaScript functions and Expose logic ---
js_additions = """
// Interactive season reorder and drilldown recommendations
if (typeof window !== 'undefined') {
  window.selectSeasonRestock = async function(seasonId, cardEl) {
    try {
      var allCards = document.querySelectorAll('.clickable-season');
      allCards.forEach(function(c) { c.classList.remove('active-season'); });
      if (cardEl) { cardEl.classList.add('active-season'); }
      var titleEl = document.getElementById('drilldownTitle');
      var subEl = document.getElementById('drilldownSub');
      var tableEl = document.getElementById('seasonalDrilldownTable');
      if (!tableEl) return;
      tableEl.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;color:#64748B;">Loading prescribed SKU recommendations...</td></tr>';
      var data;
      try {
        var apiBase = window.location.port === '3000' ? 'http://' + window.location.hostname + ':5000' : '';
        var res = await fetch(apiBase + '/api/seasonal_restock_detail?season_id=' + seasonId);
        data = await res.json();
      } catch(e) { console.warn('API fallback active', e); }
      var details = (data && data.detail) ? data.detail : {
        season_name: 'July & August — Peak Monsoon (Habagat)',
        climate_trigger: 'Peak Southwest Monsoon & Urban Inundation',
        skus: [
          {sku:'Systemic Antipyretics (Non-NSAID / Paracetamol)',category:'Antipyretics',current_stock:600,eoq_reorder:4000,rop:1200,urgency:'Critical',unit_cost:'&#8369;8.50'},
          {sku:'Flood Prophylactics & Antibiotics (Doxycycline)',category:'Flood Prophylactics',current_stock:180,eoq_reorder:1200,rop:400,urgency:'Critical',unit_cost:'&#8369;12.00'},
          {sku:'IV Fluids & Isotonic Electrolytes',category:'IV Fluids',current_stock:90,eoq_reorder:500,rop:180,urgency:'High',unit_cost:'&#8369;110.00'},
          {sku:'Oral Rehydration Therapy & GI Anti-Infectives',category:'GI Anti-infectives',current_stock:450,eoq_reorder:1500,rop:300,urgency:'High',unit_cost:'&#8369;22.00'},
          {sku:'Inhaled Bronchodilators & Corticosteroids',category:'Bronchodilators',current_stock:140,eoq_reorder:650,rop:200,urgency:'Medium',unit_cost:'&#8369;45.00'}
        ]
      };
      window.currentSeasonalDetails = details;
      var btn = document.getElementById('exportCsvBtn');
      if (btn) btn.style.display = 'inline-block';

      if (titleEl) titleEl.innerText = details.season_name;
      if (subEl) subEl.innerText = 'Climate Trigger: ' + (details.climate_trigger || 'Seasonal Surge');
      var rows = '';
      details.skus.forEach(function(s) {
        var b = '<span class="alert-tag warn">Medium</span>';
        if (s.urgency === 'Critical') b = '<span class="alert-tag danger">&#9888; Critical</span>';
        else if (s.urgency === 'High') b = '<span class="alert-tag danger">High</span>';
        else if (s.urgency === 'Low') b = '<span class="alert-tag ok">Low</span>';
        var stockColor = (parseInt(s.current_stock) < parseInt(s.rop)) ? 'var(--red)' : 'var(--text-primary)';
        rows += '<tr>' +
          '<td style="font-weight:700;text-align:left">' + s.sku + '</td>' +
          '<td>' + s.category + '</td>' +
          '<td style="color:' + stockColor + ';font-weight:700">' + s.current_stock.toLocaleString() + ' units</td>' +
          '<td style="font-weight:800;color:#0EA5E9">+' + s.eoq_reorder.toLocaleString() + ' units</td>' +
          '<td>' + s.rop.toLocaleString() + ' units</td>' +
          '<td>' + b + '</td>' +
          '<td style="font-weight:600">' + s.unit_cost + '</td>' +
          '</tr>';
      });
      tableEl.innerHTML = rows;
    } catch(err) { console.error('selectSeasonRestock:', err); }
  };

  window.exportRestockPlanToCsv = function() {
    var details = window.currentSeasonalDetails;
    if (!details || !details.skus || !details.skus.length) return alert('No plan loaded to export');
    var csv = 'Therapeutic Category (WHO),Sub-Category,Current Stock,Recommended EOQ Reorder,Reorder Point (ROP),Urgency,Unit Cost\\n';
    details.skus.forEach(function(s) {
      var cleanCost = s.unit_cost.replace('&#8369;', '').replace('₱', '').trim();
      csv += '"' + s.sku.replace(/"/g, '""') + '","' + 
                   s.category.replace(/"/g, '""') + '",' + 
                   s.current_stock + ',' + 
                   s.eoq_reorder + ',' + 
                   s.rop + ',"' + 
                   s.urgency + '",' + 
                   cleanCost + '\\n';
    });
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "MedShield_Reorder_Plan_" + details.season_name.replace(/[^a-z0-9]/gi, '_').toLowerCase() + ".csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  window.openEoqModal = function() {
    const modal = document.getElementById('eoqReorderModal');
    if (modal) modal.style.display = 'flex';
  };

  window.closeEoqModal = function() {
    const modal = document.getElementById('eoqReorderModal');
    if (modal) modal.style.display = 'none';
  };

  window.executeEoqReorder = async function() {
    const btn = document.getElementById('confirmEoqBtn');
    if (!btn) return;
    const originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<svg class="animate-spin inline-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 2v4"></path></svg> Reordering...';
    
    await new Promise(resolve => setTimeout(resolve, 1200));
    
    btn.disabled = false;
    btn.innerHTML = originalHtml;
    window.closeEoqModal();
    alert('Procurement EOQ reorder triggered successfully. Purchase orders created.');
  };

  window.recalibrateModelSafetyBuffers = async function(btn) {
    if (!btn) return;
    const originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<svg class="animate-spin inline-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px;"><circle cx="12" cy="12" r="10"></circle><path d="M12 2v4"></path></svg> Recalibrating...';
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    btn.disabled = false;
    btn.innerHTML = originalHtml;
    alert('Model safety stock buffers recalibrated successfully based on Dengue index > 1.4.');
  };

  setTimeout(function() {
    var activeCard = document.querySelector('.clickable-season.active-season');
    if (window.selectSeasonRestock && activeCard) window.selectSeasonRestock('monsoon', activeCard);
  }, 800);
}

// Expose all onclick-referenced functions to window scope for SSR/Next.js compatibility
if (typeof window !== 'undefined') {
  var _fnList = [
    'showPage','toggleNavigation','closeNavigation','toggleTheme',
    'openHelp','setYear','setYoYYear','setComparisonMode',
    'applyTheme','buildCharts','buildTables','setUploadLog',
    'applyPageSelection','setNavigationState','applyResponsiveNavigation',
    'resizeCharts','updateNavigationToggle','handleNavigationResize',
    'applyResponsiveNavigation','getResponsiveNavState','refreshComparison',
    'bindProductTableSort','renderTable','updateFilterBar','parseCsv',
    'applyDatasetPatch','loadBundledSalesDataset','normalizeMonthlyRows',
    'normalizeAreaRows','normalizeYearSummaryRows','normalizeSeasonalityRows',
    'normalizeTopProductsRows','toNumber','selectSeasonRestock','exportRestockPlanToCsv',
    'openEoqModal','closeEoqModal','executeEoqReorder','recalibrateModelSafetyBuffers'
  ];
  _fnList.forEach(function(n) {
    try { if (typeof eval(n) === 'function') window[n] = eval(n); } catch(e) {}
  });
}
"""

js_full_script = clean_js_baseline + "\n" + js_additions

# --- STEP 7: Resolve double-encoding issue ---
js_full_script = js_full_script.replace("Ã¢Â†Â•", "⇅")
js_full_script = js_full_script.replace("Ã¢Â†Â‘", "▲")
js_full_script = js_full_script.replace("Ã¢Â†Â“", "▼")
js_full_script = js_full_script.replace("Ã¢Â€Â”", "—")
js_full_script = js_full_script.replace("Ã¢Â‚Â±", "₱")

medshield_markup = medshield_markup.replace("Ã¢Â†Â•", "⇅").replace("Ã¢Â†Â‘", "▲").replace("Ã¢Â†Â“", "▼").replace("Ã¢Â€Â”", "—").replace("Ã¢Â‚Â±", "₱")
css_styles = css_styles.replace("Ã¢Â†Â•", "⇅").replace("Ã¢Â†Â‘", "▲").replace("Ã¢Â†Â“", "▼").replace("Ã¢Â€Â”", "—").replace("Ã¢Â‚Â±", "₱")

# --- STEP 8: Escape strings for output inside double quotes in TS file ---
style_escaped = css_styles.replace("\n", "\\n").replace('"', '\\"')
markup_escaped = medshield_markup.replace("\n", "\\n").replace('"', '\\"')
script_escaped = js_full_script.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n")

# --- STEP 9: Re-assemble cleanly ---
new_reference_content = (
    "// @ts-nocheck\n"
    f'export const MEDSHIELD_STYLE = "{style_escaped}"\n\n'
    f'export const MEDSHIELD_MARKUP = "{markup_escaped}"\n\n'
    f'export const MEDSHIELD_SCRIPT = "{script_escaped}"\n'
)

ts_path.write_text(new_reference_content, encoding="utf-8")
print("medshieldReference.ts rewritten and cleaned up completely!")
