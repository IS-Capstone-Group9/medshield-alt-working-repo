with open('frontend/app/overrides.css', 'r', encoding='utf-8') as f:
    content = f.read()

target = """/* The dashboard injects its base styles after this file. Scope these layout
   rules to the dashboard so chart spacing and size stay predictable. */
.medshield-root .chart-grid-2,
.medshield-root .chart-grid-3 {
  gap: 18px;
  margin-bottom: 18px;
}

.medshield-root .chart-grid-2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.medshield-root .chart-full {
  margin-bottom: 18px;
}

.medshield-root .chart-card {
  padding: 20px;
}

.medshield-root .chart-header {
  gap: 8px 12px;
  margin-bottom: 14px;
}

.medshield-root .chart-wrap {
  width: 100%;
  min-width: 0;
  min-height: 0;
  height: 280px;
}

.medshield-root .chart-wrap.h260 {
  height: 260px;
}

.medshield-root .chart-wrap.h300 {
  height: 320px;
}

.seasonal-grid {
  display: grid !important;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 190px), 1fr)) !important;
  gap: 12px !important;
}

.topbar {
  flex-wrap: wrap !important;
  min-height: 64px !important;
  height: auto !important;
  padding: 8px 24px !important;
  gap: 10px !important;
}

.topbar-left, .topbar-right {
  flex-wrap: wrap !important;
  gap: 8px !important;
}

@media (max-width: 1100px) {
  .medshield-root .chart-grid-2 {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 820px) {
  .medshield-root .chart-card {
    padding: 16px;
  }

  .medshield-root .chart-header {
    flex-wrap: wrap;
  }

  .medshield-root .chart-wrap,
  .medshield-root .chart-wrap.h260 {
    height: 240px;
  }

  .medshield-root .chart-wrap.h300 {
    height: 280px;
  }
}"""

replacement = """/* ==========================================================================
   UNIFIED CHART & CARD LAYOUT SCALE (MedShield DSS Design System)
   ========================================================================== */

/* 1. Card Container & Spacing Rhythm */
.medshield-root .chart-card {
  position: relative;
  min-width: 0;
  overflow: hidden;
  padding: 20px 22px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: var(--shadow-sm, 0 1px 3px rgba(26, 43, 60, 0.05));
  margin-bottom: 20px;
  transition: box-shadow 0.2s ease, border-color 0.2s ease;
}

.medshield-root .chart-card:hover {
  box-shadow: var(--shadow-md, 0 4px 12px rgba(26, 43, 60, 0.08));
}

/* Reset bottom margin for cards inside grid containers */
.medshield-root .chart-grid-2 .chart-card,
.medshield-root .chart-grid-3 .chart-card {
  margin-bottom: 0;
}

/* 2. Grid System */
.medshield-root .chart-grid-2 {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.medshield-root .chart-grid-3 {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.medshield-root .chart-full {
  width: 100%;
  margin-bottom: 20px;
}

/* 3. Header & Typography Hierarchy */
.medshield-root .chart-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px 16px;
  margin-bottom: 16px;
  min-height: 36px;
  width: 100%;
  flex-wrap: wrap;
}

.medshield-root .chart-header > :first-child {
  flex: 1 1 240px;
  min-width: 0;
}

.medshield-root .chart-header > .chart-badge,
.medshield-root .chart-header > .status-pill,
.medshield-root .chart-header > button {
  flex: 0 0 auto;
  margin-left: auto;
}

.medshield-root .chart-title {
  font-family: var(--font-display, var(--font-body));
  font-size: 14.5px;
  font-weight: 700;
  line-height: 1.35;
  color: var(--text-primary);
  letter-spacing: -0.015em;
  overflow-wrap: break-word;
  word-break: break-word;
}

.medshield-root .chart-subtitle {
  font-size: 11px;
  line-height: 1.45;
  color: var(--text-muted);
  margin-top: 3px;
  overflow-wrap: break-word;
  word-break: break-word;
}

/* 4. Chart Wrappers & Canvas Enclosures */
.medshield-root .chart-wrap,
.medshield-root .area-chart-wrap,
.medshield-root .reg-wrap {
  position: relative;
  width: 100%;
  min-width: 0;
  min-height: 0;
  border-radius: 8px;
  overflow: hidden;
  background: var(--bg-elevated, #F8FAFC);
  border: 1px solid var(--border, rgba(213, 223, 233, 0.6));
  box-sizing: border-box;
}

.medshield-root .chart-wrap canvas,
.medshield-root .area-chart-wrap canvas,
.medshield-root .reg-wrap canvas {
  display: block;
  width: 100% !important;
  height: 100% !important;
  box-sizing: border-box;
}

/* 5. Chart Height Scale Hierarchy */

/* Base default chart height */
.medshield-root .chart-wrap {
  height: 300px;
}

/* Hero / Full-Width Charts */
.medshield-root .chart-full .chart-wrap,
.medshield-root .chart-card.chart-full .chart-wrap,
#page-overview > .chart-card:not(.chart-grid-2 .chart-card) > .chart-wrap,
#page-revenue > .chart-card:not(.chart-grid-2 .chart-card):not([data-sales-heatmap]):not([data-sales-growth-detail]) > .chart-wrap,
.medshield-root .chart-wrap.chart-hero,
.medshield-root .forecast-chart-wrap {
  height: 360px;
}

/* Standard Grid Charts */
.medshield-root .chart-wrap.h300,
.medshield-root [data-sector-analysis] .area-chart-wrap {
  height: 310px;
}

/* Compact Charts */
.medshield-root .chart-wrap.h260,
.medshield-root .chart-wrap.plan-chart-wrap,
.medshield-root [data-external-regression] .reg-wrap {
  height: 260px;
}

/* 6. Metadata, Legends, and Footers */
.medshield-root .chart-legend,
.medshield-root .figure-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 14px;
  font-size: 11px;
  color: var(--text-secondary);
}

.medshield-root .figure-note {
  margin-top: 10px;
  font-size: 11px;
  line-height: 1.55;
  color: var(--text-secondary);
}

.seasonal-grid {
  display: grid !important;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 190px), 1fr)) !important;
  gap: 12px !important;
}

.topbar {
  flex-wrap: wrap !important;
  min-height: 64px !important;
  height: auto !important;
  padding: 8px 24px !important;
  gap: 10px !important;
}

.topbar-left, .topbar-right {
  flex-wrap: wrap !important;
  gap: 8px !important;
}

/* 7. Responsive Breakpoints */

/* Tablet & Intermediate Desktop (<= 1024px) */
@media (max-width: 1024px) {
  .medshield-root .chart-full .chart-wrap,
  .medshield-root .chart-card.chart-full .chart-wrap,
  #page-overview > .chart-card:not(.chart-grid-2 .chart-card) > .chart-wrap,
  #page-revenue > .chart-card:not(.chart-grid-2 .chart-card):not([data-sales-heatmap]):not([data-sales-growth-detail]) > .chart-wrap,
  .medshield-root .chart-wrap.chart-hero,
  .medshield-root .forecast-chart-wrap {
    height: 320px;
  }
}

/* Small Tablet & Phablet (<= 820px) */
@media (max-width: 820px) {
  .medshield-root .chart-grid-2,
  .medshield-root .chart-grid-3 {
    grid-template-columns: minmax(0, 1fr);
    gap: 16px;
    margin-bottom: 16px;
  }

  .medshield-root .chart-card {
    padding: 16px 18px;
    margin-bottom: 16px;
  }

  .medshield-root .chart-wrap,
  .medshield-root .chart-wrap.h300,
  .medshield-root [data-sector-analysis] .area-chart-wrap {
    height: 270px;
  }

  .medshield-root .chart-wrap.h260,
  .medshield-root .chart-wrap.plan-chart-wrap,
  .medshield-root [data-external-regression] .reg-wrap {
    height: 235px;
  }

  .medshield-root .chart-full .chart-wrap,
  .medshield-root .chart-card.chart-full .chart-wrap,
  #page-overview > .chart-card:not(.chart-grid-2 .chart-card) > .chart-wrap,
  #page-revenue > .chart-card:not(.chart-grid-2 .chart-card):not([data-sales-heatmap]):not([data-sales-growth-detail]) > .chart-wrap,
  .medshield-root .chart-wrap.chart-hero,
  .medshield-root .forecast-chart-wrap {
    height: 290px;
  }
}

/* Mobile Devices (<= 480px) */
@media (max-width: 480px) {
  .medshield-root .chart-card {
    padding: 14px;
    margin-bottom: 14px;
    border-radius: 10px;
  }

  .medshield-root .chart-header {
    margin-bottom: 12px;
    gap: 6px 10px;
  }

  .medshield-root .chart-wrap,
  .medshield-root .chart-wrap.h300,
  .medshield-root [data-sector-analysis] .area-chart-wrap {
    height: 250px;
  }

  .medshield-root .chart-wrap.h260,
  .medshield-root .chart-wrap.plan-chart-wrap,
  .medshield-root [data-external-regression] .reg-wrap {
    height: 215px;
  }

  .medshield-root .chart-full .chart-wrap,
  .medshield-root .chart-card.chart-full .chart-wrap,
  #page-overview > .chart-card:not(.chart-grid-2 .chart-card) > .chart-wrap,
  #page-revenue > .chart-card:not(.chart-grid-2 .chart-card):not([data-sales-heatmap]):not([data-sales-growth-detail]) > .chart-wrap,
  .medshield-root .chart-wrap.chart-hero,
  .medshield-root .forecast-chart-wrap {
    height: 260px;
  }
}"""

# Normalize line endings for replacement
norm_content = content.replace('\r\n', '\n')
norm_target = target.replace('\r\n', '\n')

if norm_target in norm_content:
    norm_content = norm_content.replace(norm_target, replacement)
    with open('frontend/app/overrides.css', 'w', encoding='utf-8') as f:
        f.write(norm_content)
    print("SUCCESS: Updated overrides.css")
else:
    print("ERROR: Target content not found in overrides.css")
