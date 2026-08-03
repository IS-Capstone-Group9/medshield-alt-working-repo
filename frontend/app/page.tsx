'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Chart from 'chart.js/auto'
import { MEDSHIELD_MARKUP, MEDSHIELD_SCRIPT, MEDSHIELD_STYLE } from '../lib/medshieldReference'
import { AuthProvider, useAuth } from '../lib/AuthContext'
import {
  getSalesDatasetStatus,
  getSalesSummary,
  getSalesTransactions,
  getWeatherEffects,
  loadDashboardData,
  refreshWeatherData,
  SalesDatasetStatus,
  SalesPage,
  SalesSummary,
  uploadSalesFile,
  WeatherEffects,
} from '../lib/api'
import Login from '../components/Login'
import ModelDashboard from '../components/ModelDashboard'

declare global {
  interface Window {
    Chart?: unknown
    __medshieldAuditInstalled?: boolean
    [key: string]: unknown
  }
}

const DASHBOARD_GLOBAL_HANDLERS = [
  'showPage',
  'toggleTheme',
  'openHelp',
  'closeNavigation',
  'toggleNavigation',
  'setComparisonMode',
  'setYear',
  'setYoYYear',
  'refreshComparison',
  'applyDatasetPatch',
  'buildCharts',
] as const

const CSV_TABLE_PAGE_SIZE = 25
const CSV_TABLE_MAX_BYTES = 10 * 1024 * 1024
const CSV_TABLE_MAX_ROWS = 50_000
const CSV_TABLE_MAX_COLUMNS = 50

type CsvTableRow = {
  values: string[]
  year: string | null
}

type CsvTableState = {
  fileName: string
  headers: string[]
  rows: CsvTableRow[]
  selectedYear: string
  search: string
  page: number
}

type SalesViewState = {
  year: string
  search: string
  qualityStatus: string
  page: number
  pageSize: number
  computation: 'overview' | 'sum' | 'average' | 'count'
  detailLevel: 'compact' | 'full'
}

const MEDSHIELD_STYLE_OVERRIDES = `
.medshield-root { display: contents; }
:root,
:root[data-theme="light"] {
  --bg-base: #eef4f8;
  --bg-surface: #ffffff;
  --bg-elevated: #f8fbfd;
  --border: #d5e2ea;
  --border-strong: #b7ccd8;
  --text-primary: #102f45;
  --text-secondary: #3f6377;
  --text-muted: #6f8796;
  --accent: #126da1;
  --accent-light: #e4f2f9;
  --accent-mid: #1c83b6;
  --blue: #155a91;
  --blue-light: #e6f0f7;
  --amber: #9b7a24;
  --amber-light: #f8efd2;
  --red: #aa3b3b;
  --red-light: #fae3e3;
  --shadow-sm: 0 1px 4px rgba(16, 47, 69, 0.05);
  --shadow-md: 0 10px 24px rgba(16, 47, 69, 0.08);
  --chart-label: #3f6377;
  --chart-muted: #6f8796;
  --chart-grid: rgba(183, 204, 216, 0.62);
}
:root[data-theme="dark"] {
  --bg-base: #0b1620;
  --bg-surface: #111f2b;
  --bg-elevated: #162838;
  --border: #294253;
  --border-strong: #426175;
  --text-primary: #edf6fb;
  --text-secondary: #bdd1dc;
  --text-muted: #8eaaba;
  --accent: #6fbce4;
  --accent-light: rgba(111, 188, 228, 0.16);
  --accent-mid: #4ea7d4;
  --blue: #8ccdf0;
  --blue-light: rgba(140, 205, 240, 0.14);
  --amber: #e5c76d;
  --amber-light: rgba(229, 199, 109, 0.16);
  --red: #f08f8f;
  --red-light: rgba(240, 143, 143, 0.15);
  --shadow-sm: 0 1px 0 rgba(255, 255, 255, 0.03);
  --shadow-md: 0 16px 32px rgba(0, 0, 0, 0.28);
  --chart-label: #bdd1dc;
  --chart-muted: #8eaaba;
  --chart-grid: rgba(83, 112, 130, 0.42);
}
html[data-theme="dark"] body {
  background: var(--bg-base);
  color: var(--text-primary);
}
.content { padding-top: 20px; }
.filterbar {
  align-items: flex-start;
  border-bottom: 1px solid var(--border);
  padding-bottom: 14px;
}
.filterbar-note {
  max-width: 380px;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.topbar {
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
}
.page-title {
  color: var(--text-primary);
}
.page-sub {
  color: var(--text-secondary);
  max-width: 820px;
  line-height: 1.4;
}
.nav-toggle {
  color: var(--text-primary);
  background: var(--bg-elevated);
  border-color: var(--border);
}
.topbar-badge {
  background: var(--accent-light);
  border-color: var(--border);
  color: var(--accent);
}
.filterbar {
  background: var(--bg-elevated);
}
.kpi-grid {
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 10px;
}
.kpi-card,
.chart-card,
.insight-card {
  border-radius: 8px;
}
.kpi-card {
  min-height: 100px;
  padding: 12px 14px;
}
.kpi-value {
  font-size: clamp(21px, 2.2vw, 29px);
  letter-spacing: 0;
}
.chart-grid-2,
.chart-grid-3 {
  align-items: stretch;
}
.chart-card {
  min-width: 0;
  overflow: hidden;
  padding: 14px;
  background: var(--bg-surface);
  border-color: var(--border);
}
.chart-card:hover {
  transform: none;
}
.chart-card[data-model] {
  position: relative;
}
.chart-card[data-model]::before {
  content: attr(data-model);
  position: absolute;
  top: 12px;
  right: 12px;
  max-width: 132px;
  padding: 3px 7px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--bg-elevated);
  color: var(--text-secondary);
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.uploaded-data-panel {
  margin-top: 14px;
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-surface);
  box-shadow: var(--shadow-sm);
}
.uploaded-data-header,
.uploaded-data-toolbar,
.uploaded-data-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.uploaded-data-title {
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
}
.uploaded-data-copy,
.uploaded-data-status {
  margin-top: 4px;
  color: var(--text-secondary);
  font-size: 11px;
  line-height: 1.4;
}
.uploaded-data-copy {
  max-width: 760px;
}
.uploaded-data-toolbar {
  margin: 16px 0 12px;
}
.uploaded-data-field {
  display: grid;
  gap: 5px;
  min-width: 180px;
}
.uploaded-data-field label {
  color: var(--text-muted);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.uploaded-data-field select,
.uploaded-data-field input {
  min-height: 36px;
  padding: 7px 10px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-elevated);
  color: var(--text-primary);
  font: inherit;
  font-size: 12px;
}
.uploaded-data-search {
  flex: 1;
  min-width: 220px;
}
.uploaded-data-table-wrap {
  overflow: auto;
  max-height: 560px;
  border: 1px solid var(--border);
  border-radius: 8px;
}
.uploaded-data-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 11px;
  white-space: nowrap;
}
.uploaded-data-table th,
.uploaded-data-table td {
  padding: 9px 11px;
  border-right: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  text-align: left;
}
.uploaded-data-table th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: var(--bg-elevated);
  color: var(--text-secondary);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.uploaded-data-table tr:last-child td { border-bottom: 0; }
.uploaded-data-table th:last-child,
.uploaded-data-table td:last-child { border-right: 0; }
.uploaded-data-empty {
  padding: 30px 18px;
  color: var(--text-muted);
  text-align: center;
  white-space: normal;
}
.uploaded-data-footer {
  margin-top: 12px;
}
.uploaded-data-pagination {
  display: flex;
  align-items: center;
  gap: 8px;
}
.uploaded-data-page-button {
  min-width: 72px;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-elevated);
  color: var(--text-primary);
  font-size: 11px;
  font-weight: 700;
}
.uploaded-data-page-button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}
.sales-status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(132px, 1fr));
  gap: 8px;
  margin: 10px 0;
}
.sales-status-card {
  padding: 10px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-elevated);
}
.sales-status-label {
  color: var(--text-muted);
  font-size: 9px;
  font-weight: 800;
  letter-spacing: .06em;
  text-transform: uppercase;
}
.sales-status-value {
  margin-top: 5px;
  color: var(--text-primary);
  font-size: 17px;
  font-weight: 800;
}
.sales-quality {
  display: inline-flex;
  padding: 3px 7px;
  border-radius: 999px;
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
}
.sales-quality-valid { background: #dcfce7; color: #166534; }
.sales-quality-warning { background: var(--amber-light); color: var(--amber); }
.sales-quality-rejected { background: var(--red-light); color: var(--red); }
.sales-primary-button {
  padding: 9px 13px;
  border: 1px solid var(--accent);
  border-radius: 8px;
  background: var(--accent);
  color: #fff;
  font-size: 11px;
  font-weight: 800;
}
.sales-primary-button:disabled { opacity: .55; cursor: wait; }
.sales-note {
  padding: 9px 11px;
  border-left: 3px solid var(--accent);
  background: var(--accent-light);
  color: var(--text-secondary);
  font-size: 11px;
  line-height: 1.4;
}
#page-sales-data .uploaded-data-panel,
#page-weather-validation .uploaded-data-panel {
  padding: 0;
  overflow: hidden;
}
#page-sales-data .uploaded-data-header,
#page-weather-validation .uploaded-data-header {
  align-items: flex-start;
  padding: 18px 22px 12px;
  border-bottom: 1px solid var(--border);
}
.sales-header-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
}
#page-sales-data .sales-filter-toolbar,
#page-weather-validation .weather-filter-toolbar {
  align-items: end;
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 14px 22px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-elevated);
}
#page-sales-data .sales-filter-toolbar {
  grid-template-columns: repeat(5, minmax(140px, 1fr)) minmax(240px, 1.6fr);
}
#page-weather-validation .weather-filter-toolbar {
  grid-template-columns: repeat(4, minmax(160px, 1fr));
}
#page-sales-data .sales-filter-toolbar .uploaded-data-field,
#page-weather-validation .weather-filter-toolbar .uploaded-data-field {
  min-width: 0;
}
#page-sales-data #salesPipelineNote,
#page-weather-validation #weatherEffectStatus {
  margin: 0 22px 12px;
  border-left-width: 4px;
  border-radius: 0 8px 8px 0;
}
#page-sales-data #salesComputationGrid {
  grid-template-columns: repeat(4, minmax(150px, 1fr));
  gap: 10px;
  margin: 12px 22px;
}
#page-sales-data #salesComputationGrid .sales-status-card {
  min-height: 64px;
}
#page-sales-data .uploaded-data-table-wrap {
  max-height: calc(100vh - 330px);
  min-height: 430px;
  margin: 8px 22px 0;
}
.dashboard-focus-panel {
  display: grid;
  grid-template-columns: minmax(220px, 0.9fr) minmax(0, 1.7fr);
  gap: 12px;
  align-items: stretch;
  margin-bottom: 12px;
  padding: 14px;
  border: 1px solid var(--border);
  border-left: 3px solid var(--accent);
  border-radius: 8px;
  background: var(--bg-surface);
  box-shadow: var(--shadow-sm);
}
.dashboard-focus-title {
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 800;
}
.dashboard-focus-copy {
  margin-top: 6px;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.4;
}
.dashboard-focus-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(150px, 1fr));
  gap: 8px;
}
.dashboard-focus-card {
  min-height: 70px;
  padding: 10px 11px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-elevated);
}
.dashboard-focus-kicker {
  color: var(--accent);
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}
.dashboard-focus-value {
  margin-top: 5px;
  color: var(--text-primary);
  font-size: 12px;
  font-weight: 800;
}
.dashboard-focus-note {
  margin-top: 4px;
  color: var(--text-secondary);
  font-size: 11px;
  line-height: 1.3;
}
@media (max-width: 980px) {
  .dashboard-focus-panel,
  .dashboard-focus-grid {
    grid-template-columns: 1fr;
  }
}
#page-weather-validation .uploaded-data-table-wrap {
  max-height: calc(100vh - 255px);
  min-height: 520px;
  margin: 0 22px;
}
#page-sales-data .uploaded-data-table th:first-child,
#page-sales-data .uploaded-data-table td:first-child,
#page-weather-validation .uploaded-data-table th:first-child,
#page-weather-validation .uploaded-data-table td:first-child {
  position: sticky;
  left: 0;
  z-index: 2;
  min-width: 96px;
}
#page-sales-data .uploaded-data-table th:first-child,
#page-weather-validation .uploaded-data-table th:first-child {
  z-index: 3;
}
@media (max-width: 680px) {
  .uploaded-data-field,
  .uploaded-data-search {
    width: 100%;
    min-width: 0;
  }
  #page-sales-data .uploaded-data-header,
  #page-weather-validation .uploaded-data-header,
  #page-sales-data .sales-filter-toolbar,
  #page-weather-validation .weather-filter-toolbar {
    padding-left: 14px;
    padding-right: 14px;
  }
  #page-sales-data #salesPipelineNote,
  #page-weather-validation #weatherEffectStatus,
  #page-sales-data #salesComputationGrid,
  #page-sales-data .uploaded-data-table-wrap,
  #page-weather-validation .uploaded-data-table-wrap {
    margin-left: 14px;
    margin-right: 14px;
  }
  #page-sales-data .sales-filter-toolbar,
  #page-weather-validation .weather-filter-toolbar,
  #page-sales-data #salesComputationGrid {
    grid-template-columns: 1fr;
  }
}
.chart-header {
  align-items: center;
  min-height: 36px;
  padding-right: 86px;
}
.chart-title {
  line-height: 1.25;
}
.chart-subtitle {
  line-height: 1.35;
}
.chart-wrap {
  min-height: 200px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-elevated);
}
.chart-wrap::after {
  font-size: 12px;
  line-height: 1.45;
  background: color-mix(in srgb, var(--bg-surface) 88%, transparent);
}
.table-wrap {
  border-radius: 8px;
  overflow-x: auto;
}
table {
  min-width: 680px;
}
th,
td {
  vertical-align: top;
}
.analytics-workflow-panel,
.model-readiness-panel,
.audit-log-panel,
.dashboard-help-modal {
  margin-bottom: 12px;
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-surface);
  box-shadow: var(--shadow-sm);
}
.analytics-workflow-title,
.model-readiness-title,
.audit-log-title,
.dashboard-help-title {
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 800;
  margin-bottom: 6px;
}
.analytics-workflow-copy,
.model-readiness-copy,
.audit-log-copy,
.dashboard-help-copy {
  max-width: 760px;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.4;
}
.analytics-workflow-grid,
.model-readiness-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 8px;
  margin-top: 10px;
}
.analytics-step,
.model-card {
  min-height: 78px;
  padding: 10px 11px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-elevated);
}
.analytics-step-kicker,
.model-card-kicker {
  color: var(--accent);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}
.analytics-step-title,
.model-card-title {
  margin-top: 5px;
  color: var(--text-primary);
  font-size: 12px;
  font-weight: 800;
}
.analytics-step-copy,
.model-card-copy {
  margin-top: 5px;
  color: var(--text-secondary);
  font-size: 11px;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.analytics-workflow-panel {
  border-left: 3px solid var(--accent);
}
.analytics-step[data-status="blocked"] .analytics-step-kicker,
.model-card[data-status="blocked"] .model-card-kicker {
  color: var(--amber);
}
.analytics-step[data-status="pass"] .analytics-step-kicker,
.model-card[data-status="pass"] .model-card-kicker {
  color: #15803d;
}
.upload-zone {
  border-radius: 8px;
  background: var(--bg-surface);
}
.upload-hint {
  line-height: 1.5;
}
.product-table th,
.product-table td {
  border-color: var(--border);
}
.product-table tbody tr:hover {
  background: var(--bg-elevated);
}
.comp-mode-btn,
.yr-btn,
.filterbar select,
.sidebar-footer-btn,
.sidebar-logout-btn {
  color: var(--text-secondary);
}
.filterbar .comp-mode-btn.active,
.filterbar .yr-btn.active {
  background: var(--accent-light);
  color: var(--accent);
}
.audit-log-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
}
.audit-log-list {
  display: grid;
  gap: 8px;
  max-height: 170px;
  overflow: auto;
  margin-top: 12px;
}
.audit-log-entry {
  display: grid;
  grid-template-columns: 132px 1fr;
  gap: 10px;
  padding: 9px 10px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-elevated);
  color: var(--text-secondary);
  font-size: 11px;
}
.audit-log-time {
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}
.audit-log-empty {
  padding: 12px;
  border: 1px dashed var(--border);
  border-radius: 8px;
  color: var(--text-muted);
  font-size: 12px;
}
.audit-log-clear,
.dashboard-help-close {
  padding: 8px 11px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-elevated);
  color: var(--text-primary);
  font-size: 12px;
  font-weight: 800;
}
.dashboard-help-backdrop {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: none;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(5, 14, 21, 0.48);
}
.dashboard-help-backdrop.is-open {
  display: flex;
}
.dashboard-help-modal {
  width: min(560px, 100%);
  margin: 0;
}
.dashboard-help-list {
  display: grid;
  gap: 8px;
  margin: 14px 0 0;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.55;
}
.dashboard-help-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
html[data-theme="dark"] .sidebar {
  background: #081824;
}
html[data-theme="dark"] .sidebar-brand,
html[data-theme="dark"] .sidebar-footer {
  border-color: #203746;
}
html[data-theme="dark"] .brand-icon {
  background: #122838;
  box-shadow: inset 0 0 0 1px #294253;
}
html[data-theme="dark"] .nav-item.active {
  background: #eaf5fb;
  color: #102f45;
}
html[data-theme="dark"] .chart-wrap::before {
  background: linear-gradient(90deg, rgba(34, 56, 72, 0.36) 0%, rgba(59, 86, 103, 0.5) 50%, rgba(34, 56, 72, 0.36) 100%);
}
.sidebar-logout-btn:focus-visible,
.nav-toggle:focus-visible,
.nav-item:focus-visible,
.comp-mode-btn:focus-visible,
.yr-btn:focus-visible,
.audit-log-clear:focus-visible,
.dashboard-help-close:focus-visible {
  outline: 2px solid #7dd3fc;
  outline-offset: 2px;
}
.sidebar-footer-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
}
.sidebar-footer-btn {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #D5E4EC;
  transition: all var(--transition);
  flex-shrink: 0;
}
.sidebar-footer-btn.logout-btn {
  flex: 1;
  width: auto;
  min-width: 0;
  padding: 0 10px;
  gap: 6px;
  font-size: 11px;
  font-weight: 600;
}
.sidebar-footer-btn:hover {
  background: rgba(255, 255, 255, 0.16);
  color: #FFFFFF;
  border-color: rgba(255, 255, 255, 0.24);
}
body.nav-collapsed .sidebar-footer-btn.logout-btn {
  width: 34px;
  padding: 0;
  flex: none;
}
body.nav-collapsed .logout-text {
  display: none;
}
@media (max-width: 820px) {
  .topbar {
    padding: 0 16px;
  }
  .filterbar {
    padding: 14px 16px 0;
  }
  .filterbar-note {
    width: 100%;
    max-width: none;
    text-align: left;
  }
  .content {
    padding: 18px 16px 32px;
  }
  .chart-grid-2,
  .chart-grid-3 {
    grid-template-columns: 1fr;
  }
  .chart-card {
    padding: 16px;
  }
}
`

function getExecutableDashboardScript() {
  const globalHandlerBridge = DASHBOARD_GLOBAL_HANDLERS
    .map((name) => `if (typeof ${name} === 'function') window.${name} = ${name};`)
    .join('\n')

  const patchedScript = MEDSHIELD_SCRIPT
    .replace("window.addEventListener('DOMContentLoaded', async () => {", '(async () => {')
    .replaceAll("'#335F78'", "dashboardThemeColor('--chart-label', '#335F78')")
    .replaceAll("'#67879A'", "dashboardThemeColor('--chart-muted', '#67879A')")
    .replaceAll("'rgba(201,219,229,0.65)'", "dashboardThemeColor('--chart-grid', 'rgba(201,219,229,0.65)')")
    .replace('if (document.startViewTransition &&', 'if (false && document.startViewTransition &&')
    .replace('chart.resize();', "if (!chart.canvas || !chart.canvas.isConnected) return;\n      chart.resize();")
    .replace(
      "if (charts[id]) charts[id].destroy();",
      `
    const existingChart = Chart.getChart ? Chart.getChart(canvas) : charts[id];
    if (existingChart) existingChart.destroy();
    if (charts[id] && charts[id] !== existingChart) charts[id].destroy();`,
    )
    .replace(/\n}\);\s*$/, `\n})();\n${globalHandlerBridge}`)

  return `
const Chart = window.Chart;
function dashboardThemeColor(name, fallback) {
  try {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
  } catch (error) {
    return fallback;
  }
}
${patchedScript}`
}

function setCardModel(root: HTMLElement, canvasId: string, model: string, note?: string) {
  const canvas = root.querySelector(`#${canvasId}`)
  const card = canvas?.closest('.chart-card') as HTMLElement | null
  if (!card) return

  card.dataset.model = model
  if (note) {
    const figureNote = card.querySelector('.figure-note')
    if (figureNote) {
      figureNote.textContent = note
    }
  }
}

type AuditEntry = {
  id: string
  action: string
  detail: string
  at: string
}

const AUDIT_LOG_KEY = 'medshield.dashboardAuditLog'
const MAX_AUDIT_ENTRIES = 80

function readAuditLog(): AuditEntry[] {
  try {
    const raw = localStorage.getItem(AUDIT_LOG_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.slice(0, MAX_AUDIT_ENTRIES) : []
  } catch {
    return []
  }
}

function writeAuditLog(entries: AuditEntry[]) {
  try {
    localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(entries.slice(0, MAX_AUDIT_ENTRIES)))
  } catch {
    // Audit log is best-effort in the browser; production should persist this server-side.
  }
}

function renderAuditLog(root: HTMLElement) {
  const list = root.querySelector('#auditLogList')
  if (!list) return

  const entries = readAuditLog()
  if (!entries.length) {
    list.innerHTML = '<div class="audit-log-empty">No dashboard actions recorded yet.</div>'
    return
  }

  list.innerHTML = entries
    .map(
      (entry) => `
        <div class="audit-log-entry">
          <div class="audit-log-time">${new Date(entry.at).toLocaleString()}</div>
          <div><strong>${entry.action}</strong><br>${entry.detail}</div>
        </div>
      `,
    )
    .join('')
}

function recordAudit(root: HTMLElement, action: string, detail: string) {
  const entries = readAuditLog()
  entries.unshift({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    action,
    detail,
    at: new Date().toISOString(),
  })
  writeAuditLog(entries)
  renderAuditLog(root)
}

function enhanceDashboardContent(root: HTMLElement) {
  const navigation = root.querySelector('.nav')
  if (navigation && !navigation.querySelector('#salesDataNavItem')) {
    navigation.insertAdjacentHTML(
      'beforeend',
      `
      <div class="nav-item" id="salesDataNavItem" data-tooltip="View Sales Data" aria-label="View Sales Data" role="button" tabindex="0">
        <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 5h16v14H4z"/><path d="M4 10h16M9 5v14"/>
        </svg>
        <span class="nav-label">View Sales Data</span>
      </div>
      `,
    )
  }
  if (navigation && !navigation.querySelector('#weatherValidationNavItem')) {
    navigation.insertAdjacentHTML(
      'beforeend',
      `
      <div class="nav-item" id="weatherValidationNavItem" data-tooltip="Weather API Validation" aria-label="Weather API Validation" role="button" tabindex="0">
        <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 14a8 8 0 0 1 16 0"/><path d="M7 14h10"/><path d="M8 18h8"/><path d="M12 6v3"/>
        </svg>
        <span class="nav-label">Weather API Validation</span>
      </div>
      `,
    )
  }

  const content = root.querySelector('.content')
  if (content && !content.querySelector('#page-sales-data')) {
    content.insertAdjacentHTML(
      'beforeend',
      `
      <div class="page fade-in" id="page-sales-data">
        <section class="uploaded-data-panel" aria-labelledby="salesDataTitle">
          <div class="uploaded-data-header">
            <div>
              <div class="uploaded-data-title" id="salesDataTitle">Cleaned Sales Transactions</div>
              <div class="uploaded-data-copy">
                Accepted sales rows with lineage, quality status, and filtered totals.
              </div>
            </div>
            <div class="sales-header-actions">
              <span class="mini-badge" id="salesDatasetBadge">Loading Dataset...</span>
              <button class="sales-primary-button" id="salesDataUploadButton" type="button">Upload XLSX/CSV</button>
              <input id="salesDataUploadInput" type="file" accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv" hidden />
            </div>
          </div>
          <div class="sales-note" id="salesPipelineNote">
            Uploads are header-mapped, standardized, quality checked, then published only as accepted cleaned rows.
          </div>
          <div class="uploaded-data-toolbar sales-filter-toolbar">
            <div class="uploaded-data-field">
              <label for="salesDataYear">Year</label>
              <select id="salesDataYear"><option value="all">All Years</option></select>
            </div>
            <div class="uploaded-data-field">
              <label for="salesDataQuality">Quality</label>
              <select id="salesDataQuality">
                <option value="all">All Rows</option>
                <option value="valid">Valid</option>
                <option value="warning">Warning</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div class="uploaded-data-field">
              <label for="salesDataPageSize">Rows Per Page</label>
              <select id="salesDataPageSize">
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
            <div class="uploaded-data-field">
              <label for="salesDataComputation">Computation</label>
              <select id="salesDataComputation">
                <option value="overview">Overview KPIs</option>
                <option value="sum">Sums</option>
                <option value="average">Averages</option>
                <option value="count">Counts / SKU</option>
              </select>
            </div>
            <div class="uploaded-data-field">
              <label for="salesDataDetail">Detail</label>
              <select id="salesDataDetail">
                <option value="compact">Compact</option>
                <option value="full">Full Ledger</option>
              </select>
            </div>
            <div class="uploaded-data-field uploaded-data-search">
              <label for="salesDataSearch">Search</label>
              <input id="salesDataSearch" type="search" placeholder="Area, Product, DR Number..." />
            </div>
          </div>
          <div class="sales-status-grid" id="salesComputationGrid"></div>
          <div class="uploaded-data-table-wrap">
            <table class="uploaded-data-table" id="salesDataTable">
              <tbody><tr><td class="uploaded-data-empty">Loading Cleaned Transactions...</td></tr></tbody>
            </table>
          </div>
          <div class="uploaded-data-footer">
            <div class="uploaded-data-status" id="salesDataStatus">Loading...</div>
            <div class="uploaded-data-pagination">
              <button class="uploaded-data-page-button" id="salesDataPrevious" type="button">Previous</button>
              <span class="uploaded-data-status" id="salesDataPage">Page 0 of 0</span>
              <button class="uploaded-data-page-button" id="salesDataNext" type="button">Next</button>
            </div>
          </div>
        </section>
      </div>
      `,
    )
  }
  if (content && !content.querySelector('#page-weather-validation')) {
    content.insertAdjacentHTML(
      'beforeend',
      `
      <div class="page fade-in" id="page-weather-validation">
        <section class="uploaded-data-panel" aria-labelledby="weatherEffectTitle">
          <div class="uploaded-data-header">
            <div>
              <div class="uploaded-data-title" id="weatherEffectTitle">Weather API Validation</div>
              <div class="uploaded-data-copy">
                Provider weather proxy for historical validation. Not an official PAGASA alert.
              </div>
            </div>
            <button class="sales-primary-button" id="refreshWeatherButton" type="button">Refresh Weather</button>
          </div>
          <div class="uploaded-data-toolbar weather-filter-toolbar">
            <div class="uploaded-data-field">
              <label for="weatherProvider">Provider</label>
              <select id="weatherProvider">
                <option value="nasa_power">NASA POWER</option>
                <option value="open_meteo">Open-Meteo Archive</option>
              </select>
            </div>
            <div class="uploaded-data-field">
              <label for="weatherArea">Territory</label>
              <select id="weatherArea">
                <option value="all">All Territories</option>
                <option value="Quezon">Quezon</option>
                <option value="Batangas">Batangas</option>
                <option value="Camarines Norte">Camarines Norte</option>
                <option value="Camarines Sur">Camarines Sur</option>
                <option value="Cavite">Cavite</option>
                <option value="Laguna">Laguna</option>
                <option value="Marinduque">Marinduque</option>
                <option value="Metro Manila">Metro Manila</option>
                <option value="Rizal">Rizal</option>
              </select>
            </div>
            <div class="uploaded-data-field">
              <label for="weatherYear">Year</label>
              <select id="weatherYear">
                <option value="2025">2025</option><option value="2024">2024</option>
                <option value="2023">2023</option><option value="2022">2022</option>
                <option value="2021">2021</option>
              </select>
            </div>
            <div class="uploaded-data-field">
              <label for="weatherGrain">Validation Grain</label>
              <select id="weatherGrain">
                <option value="monthly">Monthly Planning Aggregate</option>
                <option value="daily">Daily API Rows</option>
              </select>
            </div>
          </div>
          <div class="uploaded-data-status sales-note" id="weatherEffectStatus">Choose a territory and year, then refresh weather.</div>
          <div class="uploaded-data-table-wrap">
            <table class="uploaded-data-table" id="weatherEffectTable">
              <tbody><tr><td class="uploaded-data-empty">No Weather Data Loaded Yet.</td></tr></tbody>
            </table>
          </div>
        </section>
      </div>
      `,
    )
  }

  const overview = root.querySelector('#page-overview')
  if (overview && !overview.querySelector('.dashboard-focus-panel')) {
    overview.insertAdjacentHTML(
      'afterbegin',
      `
      <section class="dashboard-focus-panel" aria-label="Dashboard focus guide">
        <div>
          <div class="dashboard-focus-title">Decision Focus</div>
          <div class="dashboard-focus-copy">Start with these three signals. Open detailed pages only when a number needs evidence.</div>
        </div>
        <div class="dashboard-focus-grid">
          <div class="dashboard-focus-card">
            <div class="dashboard-focus-kicker">Primary</div>
            <div class="dashboard-focus-value">Demand and revenue trend</div>
            <div class="dashboard-focus-note">Use overview charts before drilling into ledgers.</div>
          </div>
          <div class="dashboard-focus-card">
            <div class="dashboard-focus-kicker">Review</div>
            <div class="dashboard-focus-value">Product and territory priority</div>
            <div class="dashboard-focus-note">Treat ABC/Pareto as planning signals.</div>
          </div>
          <div class="dashboard-focus-card">
            <div class="dashboard-focus-kicker">Guardrail</div>
            <div class="dashboard-focus-value">Forecasts and scenarios need review</div>
            <div class="dashboard-focus-note">External and inventory outputs are not automatic procurement decisions.</div>
          </div>
        </div>
      </section>
      `,
    )
  }
  if (overview && !overview.querySelector('.analytics-workflow-panel')) {
    overview.insertAdjacentHTML(
      'afterbegin',
      `
      <section class="analytics-workflow-panel" aria-label="Model publication status">
        <div class="analytics-workflow-title">Model Publication Status</div>
        <div class="analytics-workflow-copy">
          Dashboard outputs are historical decision support. Sales-only outputs are draft; disease, PAGASA, and operational inventory models stay blocked or scenario-only until source data is loaded.
        </div>
        <div class="analytics-workflow-grid">
          <div class="analytics-step" data-status="pass">
            <div class="analytics-step-kicker">Ready</div>
            <div class="analytics-step-title">Clean Sales + ABC/Pareto</div>
            <div class="analytics-step-copy">2021-2025 cleaned sales, mapped territories, estimated contract-name allocations.</div>
          </div>
          <div class="analytics-step">
            <div class="analytics-step-kicker">Draft</div>
            <div class="analytics-step-title">Sales Baseline Forecast</div>
            <div class="analytics-step-copy">Seasonal naive baseline with MAE, RMSE, MAPE, and partial-period limitation notes.</div>
          </div>
          <div class="analytics-step" data-status="blocked">
            <div class="analytics-step-kicker">Blocked</div>
            <div class="analytics-step-title">External + Inventory Models</div>
            <div class="analytics-step-copy">Needs DOH, PAGASA/API coverage, inventory, lead time, ordering cost, and holding cost inputs.</div>
          </div>
        </div>
      </section>
      `,
    )
  }

  const dataPage = root.querySelector('#page-data')
  const salesUploadInput = dataPage?.querySelector<HTMLInputElement>('#salesCsvInput')
  if (salesUploadInput) {
    salesUploadInput.accept = '.xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv'
    const uploadZone = salesUploadInput.closest('.upload-zone')
    const title = uploadZone?.querySelector('.section-title')
    const hint = uploadZone?.querySelector('.upload-hint')
    if (title) title.textContent = 'Upload Sales Workbook or CSV'
    if (hint) {
      hint.textContent =
        'Accepted: MedShield .xlsx workbook or .csv export. The system detects the stage, standardizes rows, and publishes a quality report.'
    }
  }
  if (dataPage && !dataPage.querySelector('.model-readiness-panel')) {
    const uploadGrid = dataPage.querySelector('.upload-grid')
    uploadGrid?.insertAdjacentHTML(
      'beforebegin',
      `
      <section class="model-readiness-panel" aria-label="Model readiness checklist">
        <div class="model-readiness-title">Dataset Readiness for All Models</div>
        <div class="model-readiness-copy">
          Publish only reviewed outputs. Missing external and operational inputs must remain blocked, draft, or scenario-only.
        </div>
        <div class="model-readiness-grid">
          <div class="model-card" data-status="pass">
            <div class="model-card-kicker">Ready</div>
            <div class="model-card-title">Sales Workbook</div>
            <div class="model-card-copy">period, product, area, quantity, revenue, income, margin, transaction count.</div>
          </div>
          <div class="model-card" data-status="blocked">
            <div class="model-card-kicker">Scenario Only</div>
            <div class="model-card-title">Stock and Cost Inputs</div>
            <div class="model-card-copy">current stock, lead time, holding cost, ordering cost, service level, demand variation.</div>
          </div>
          <div class="model-card" data-status="blocked">
            <div class="model-card-kicker">Blocked</div>
            <div class="model-card-title">DOH and PAGASA signals</div>
            <div class="model-card-copy">disease intensity, rainfall severity, typhoon flags, area and month alignment.</div>
          </div>
          <div class="model-card">
            <div class="model-card-kicker">Review</div>
            <div class="model-card-title">Decision Outcomes</div>
            <div class="model-card-copy">accepted actions, actual demand, stockouts, fulfillment and allocation results.</div>
          </div>
        </div>
      </section>
      `,
    )
  }

  if (dataPage && !dataPage.querySelector('.audit-log-panel')) {
    dataPage.insertAdjacentHTML(
      'beforeend',
      `
      <section class="audit-log-panel" aria-label="Dashboard audit log">
        <div class="audit-log-title">Audit Log</div>
        <div class="audit-log-copy">
          Browser-session audit trail. Production should persist user, tenant, and request metadata in the backend.
        </div>
        <div class="audit-log-actions">
          <span class="mini-badge">Browser Audit</span>
          <button class="audit-log-clear" type="button" id="clearAuditLogButton">Clear Log</button>
        </div>
        <div class="audit-log-list" id="auditLogList"></div>
      </section>
      `,
    )
  }

  if (!root.querySelector('#dashboardHelpBackdrop')) {
    root.insertAdjacentHTML(
      'beforeend',
      `
      <div class="dashboard-help-backdrop" id="dashboardHelpBackdrop" role="dialog" aria-modal="true" aria-labelledby="dashboardHelpTitle">
        <section class="dashboard-help-modal">
          <div class="dashboard-help-title" id="dashboardHelpTitle">Dashboard Help</div>
          <div class="dashboard-help-copy">
            Use the views in decision order.
          </div>
          <div class="dashboard-help-list">
            <div><strong>Overview:</strong> demand, margin, forecast direction.</div>
            <div><strong>Sales and Products:</strong> accepted rows, ABC, priority signals.</div>
            <div><strong>Forecast and Planning:</strong> draft model outputs and scenarios.</div>
            <div><strong>Data Upload:</strong> source checks before publication.</div>
          </div>
          <div class="dashboard-help-footer">
            <button class="dashboard-help-close" type="button" id="closeDashboardHelpButton">Close</button>
          </div>
        </section>
      </div>
      `,
    )
  }

  setCardModel(root, 'overviewBaselineChart', 'Actual Sales', 'Historical sales baseline.')
  setCardModel(root, 'overviewForecastChart', 'Draft Forecast', 'Sales-only planning signal.')
  setCardModel(root, 'monthlyChart', 'Time Series', 'Monthly sales trend.')
  setCardModel(root, 'areaDonut', 'Territory Mix', 'Area concentration.')
  setCardModel(root, 'forecastChart', 'Forecast Draft', 'External regressors pending.')
  setCardModel(root, 'seasonIndexChart', 'Seasonality', 'Monthly demand pattern.')
  setCardModel(root, 'externalChart', 'External Pending', 'DOH/PAGASA/API inputs required.')
  setCardModel(root, 'areaBarChart', 'Area Rank', 'Territory revenue ranking.')
  setCardModel(root, 'areaIncomeChart', 'Gross Profit', 'Workbook gross margin/profit.')
  setCardModel(root, 'areaMarginChart', 'MCDA Input', 'Margin signal for priority scoring.')
  renderAuditLog(root)
}

function parseCsvRecords(text: string): string[][] {
  const records: string[][] = []
  let record: string[] = []
  let field = ''
  let quoted = false

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]
    const nextCharacter = text[index + 1]

    if (character === '"') {
      if (quoted && nextCharacter === '"') {
        field += '"'
        index += 1
      } else {
        quoted = !quoted
      }
      continue
    }

    if (character === ',' && !quoted) {
      record.push(field.trim())
      field = ''
      continue
    }

    if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && nextCharacter === '\n') index += 1
      record.push(field.trim())
      field = ''
      if (record.some((value) => value.length > 0)) records.push(record)
      record = []
      continue
    }

    field += character
  }

  record.push(field.trim())
  if (record.some((value) => value.length > 0)) records.push(record)
  if (quoted) throw new Error('The CSV contains an unterminated quoted value.')

  return records
}

function normalizeCsvHeader(value: string, index: number) {
  return value.replace(/^\uFEFF/, '').trim() || `Column ${index + 1}`
}

function extractCsvYear(headers: string[], values: string[]) {
  const normalizedHeaders = headers.map((header) => header.toLowerCase().replace(/[^a-z0-9]/g, ''))
  const candidateNames = ['year', 'period', 'datedelivered', 'deliverydate', 'date']

  for (const candidateName of candidateNames) {
    const columnIndex = normalizedHeaders.indexOf(candidateName)
    if (columnIndex < 0) continue
    const match = values[columnIndex]?.match(/\b(19|20)\d{2}\b/)
    if (match) return match[0]
  }

  return null
}

function setUploadedDataMessage(root: HTMLElement, message: string, isError = false) {
  const table = root.querySelector<HTMLTableElement>('#uploadedDataTable')
  const status = root.querySelector<HTMLElement>('#uploadedDataStatus')
  if (table) {
    table.replaceChildren()
    const body = table.createTBody()
    const row = body.insertRow()
    const cell = row.insertCell()
    cell.className = 'uploaded-data-empty'
    cell.textContent = message
  }
  if (status) {
    status.textContent = message
    status.style.color = isError ? 'var(--red)' : ''
  }
}

function renderUploadedDataTable(root: HTMLElement, state: CsvTableState) {
  const table = root.querySelector<HTMLTableElement>('#uploadedDataTable')
  const status = root.querySelector<HTMLElement>('#uploadedDataStatus')
  const pageLabel = root.querySelector<HTMLElement>('#uploadedDataPage')
  const previous = root.querySelector<HTMLButtonElement>('#uploadedDataPrevious')
  const next = root.querySelector<HTMLButtonElement>('#uploadedDataNext')
  if (!table || !status || !pageLabel || !previous || !next) return

  const search = state.search.trim().toLowerCase()
  const filteredRows = state.rows.filter((row) => {
    if (state.selectedYear !== 'all' && row.year !== state.selectedYear) return false
    return !search || row.values.some((value) => value.toLowerCase().includes(search))
  })
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / CSV_TABLE_PAGE_SIZE))
  state.page = Math.min(Math.max(state.page, 1), pageCount)
  const firstIndex = (state.page - 1) * CSV_TABLE_PAGE_SIZE
  const pageRows = filteredRows.slice(firstIndex, firstIndex + CSV_TABLE_PAGE_SIZE)

  table.replaceChildren()
  const head = table.createTHead()
  const headerRow = head.insertRow()
  for (const header of state.headers) {
    const cell = document.createElement('th')
    cell.scope = 'col'
    cell.textContent = header
    headerRow.appendChild(cell)
  }

  const body = table.createTBody()
  if (!pageRows.length) {
    const row = body.insertRow()
    const cell = row.insertCell()
    cell.colSpan = state.headers.length
    cell.className = 'uploaded-data-empty'
    cell.textContent = 'No rows match the selected year and search.'
  } else {
    for (const csvRow of pageRows) {
      const row = body.insertRow()
      for (const value of csvRow.values) {
        const cell = row.insertCell()
        cell.textContent = value || '-'
      }
    }
  }

  const visibleStart = filteredRows.length ? firstIndex + 1 : 0
  const visibleEnd = Math.min(firstIndex + CSV_TABLE_PAGE_SIZE, filteredRows.length)
  status.style.color = ''
  status.textContent = `Showing ${visibleStart}-${visibleEnd} of ${filteredRows.length.toLocaleString()} rows.`
  pageLabel.textContent = `Page ${filteredRows.length ? state.page : 0} of ${filteredRows.length ? pageCount : 0}`
  previous.disabled = state.page <= 1 || !filteredRows.length
  next.disabled = state.page >= pageCount || !filteredRows.length
}

async function loadUploadedCsvTable(root: HTMLElement, file: File, state: CsvTableState) {
  if (file.size > CSV_TABLE_MAX_BYTES) {
    throw new Error('CSV is larger than the 10 MB table-view limit.')
  }

  const records = parseCsvRecords(await file.text())
  if (records.length < 2) throw new Error('CSV must contain a header and at least one data row.')

  const headers = records[0].map(normalizeCsvHeader)
  if (headers.length > CSV_TABLE_MAX_COLUMNS) {
    throw new Error(`CSV has more than ${CSV_TABLE_MAX_COLUMNS} columns.`)
  }

  const dataRecords = records.slice(1)
  if (dataRecords.length > CSV_TABLE_MAX_ROWS) {
    throw new Error(`CSV has more than ${CSV_TABLE_MAX_ROWS.toLocaleString()} rows.`)
  }

  state.fileName = file.name
  state.headers = headers
  state.rows = dataRecords.map((record) => {
    const values = headers.map((_, index) => record[index] ?? '')
    return { values, year: extractCsvYear(headers, values) }
  })
  state.selectedYear = 'all'
  state.search = ''
  state.page = 1

  const years = Array.from(
    new Set(state.rows.map((row) => row.year).filter((year): year is string => Boolean(year))),
  ).sort((left, right) => Number(right) - Number(left))
  const yearSelect = root.querySelector<HTMLSelectElement>('#uploadedDataYear')
  const searchInput = root.querySelector<HTMLInputElement>('#uploadedDataSearch')
  const fileLabel = root.querySelector<HTMLElement>('#uploadedDataFile')

  if (yearSelect) {
    yearSelect.replaceChildren(new Option('All Years', 'all'))
    for (const year of years) yearSelect.add(new Option(year, year))
    yearSelect.disabled = false
    yearSelect.value = 'all'
  }
  if (searchInput) {
    searchInput.disabled = false
    searchInput.value = ''
  }
  if (fileLabel) fileLabel.textContent = `${file.name} - ${state.rows.length.toLocaleString()} rows`

  renderUploadedDataTable(root, state)
}

function renderSalesDatasetStatus(root: HTMLElement, status: SalesDatasetStatus) {
  const summary = status.quality_summary
  const badge = root.querySelector<HTMLElement>('#salesDatasetBadge')
  const note = root.querySelector<HTMLElement>('#salesPipelineNote')
  const yearSelect = root.querySelector<HTMLSelectElement>('#salesDataYear')
  if (badge) badge.textContent = `${status.source_file} - ${status.cleaning_status}`
  if (note) {
    note.textContent =
      `${summary.rows_accepted.toLocaleString()} accepted of ${summary.rows_extracted.toLocaleString()} extracted rows` +
      ` | ${summary.rows_with_warnings.toLocaleString()} warnings` +
      ` | ${summary.rows_rejected.toLocaleString()} rejected` +
      ` | ${status.canonical_columns.length} columns matched`
  }
  if (yearSelect) {
    const current = yearSelect.value || 'all'
    yearSelect.replaceChildren(new Option('All Years', 'all'))
    for (const year of Object.keys(summary.years).sort().reverse()) {
      yearSelect.add(new Option(year, year))
    }
    yearSelect.value = Array.from(yearSelect.options).some((option) => option.value === current)
      ? current
      : 'all'
  }
}

function formatSalesValue(value: unknown, type: 'text' | 'number' | 'money' | 'percent' = 'text') {
  if (value === null || value === undefined || value === '') return '-'
  if (type === 'number') return Number(value).toLocaleString(undefined, { maximumFractionDigits: 4 })
  if (type === 'money') {
    return Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  if (type === 'percent') return `${(Number(value) * 100).toFixed(2)}%`
  return String(value)
}

function renderSalesComputation(root: HTMLElement, summary: SalesSummary, mode: SalesViewState['computation']) {
  const grid = root.querySelector<HTMLElement>('#salesComputationGrid')
  if (!grid) return

  const money = (value: number | undefined) => formatSalesValue(value ?? 0, 'money')
  const number = (value: number | undefined) => formatSalesValue(value ?? 0, 'number')
  const percent = (value: number | undefined) => formatSalesValue(value ?? 0, 'percent')
  const cards =
    mode === 'sum'
      ? [
          ['Quantity', number(summary.sums.quantity)],
          ['Net CP', money(summary.sums.net_cost)],
          ['Gross Profit', money(summary.sums.net_income)],
          ['Total TP', money(summary.sums.total_trade_price)],
        ]
      : mode === 'average'
        ? [
            ['Avg Quantity', number(summary.averages.quantity)],
            ['Avg Unit CP', money(summary.averages.unit_cost)],
            ['Avg Gross Profit', money(summary.averages.net_income)],
            ['Avg Margin', percent(summary.averages.margin_pct)],
          ]
        : mode === 'count'
          ? [
              ['Filtered Rows', number(summary.counts.rows)],
              ['Accepted Rows', number(summary.counts.accepted_rows)],
              ['SKUs', number(summary.counts.sku_count)],
              ['DR Numbers', number(summary.counts.unique_dr_numbers)],
            ]
          : [
              ['Net CP', money(summary.sums.net_cost)],
              ['Gross Profit', money(summary.sums.net_income)],
              ['Average Margin', percent(summary.averages.margin_pct)],
              ['Top Area', summary.top.area || '-'],
            ]

  grid.innerHTML = cards
    .map(([label, value]) => `
      <div class="sales-status-card">
        <div class="sales-status-label">${label}</div>
        <div class="sales-status-value">${value}</div>
      </div>
    `)
    .join('')
}

function renderSalesPage(root: HTMLElement, result: SalesPage) {
  const table = root.querySelector<HTMLTableElement>('#salesDataTable')
  const status = root.querySelector<HTMLElement>('#salesDataStatus')
  const pageLabel = root.querySelector<HTMLElement>('#salesDataPage')
  const previous = root.querySelector<HTMLButtonElement>('#salesDataPrevious')
  const next = root.querySelector<HTMLButtonElement>('#salesDataNext')
  if (!table || !status || !pageLabel || !previous || !next) return

  const compactColumns: Array<[string, keyof SalesPage['rows'][number], 'text' | 'number' | 'money' | 'percent']> = [
    ['Date', 'date_delivered', 'text'],
    ['Area', 'area', 'text'],
    ['Product', 'product', 'text'],
    ['Qty', 'quantity', 'number'],
    ['Total TP', 'total_trade_price', 'money'],
    ['Gross Profit', 'net_income', 'money'],
  ]
  const fullColumns: Array<[string, keyof SalesPage['rows'][number], 'text' | 'number' | 'money' | 'percent']> = [
    ['Area', 'area', 'text'],
    ['DR Number', 'dr_number', 'text'],
    ['Date Delivered', 'date_delivered', 'text'],
    ['Product', 'product', 'text'],
    ['Qty', 'quantity', 'number'],
    ['CP', 'unit_cost', 'money'],
    ['Total CP', 'total_cost', 'money'],
    ['Disc', 'discount', 'money'],
    ['Net CP', 'net_cost', 'money'],
    ['TP/Unit', 'trade_price_unit', 'money'],
    ['Total TP', 'total_trade_price', 'money'],
    ['Gross Profit', 'net_income', 'money'],
    ['%', 'margin_pct', 'percent'],
  ]
  const detailLevel = root.querySelector<HTMLSelectElement>('#salesDataDetail')?.value === 'full' ? 'full' : 'compact'
  const columns = detailLevel === 'full' ? fullColumns : compactColumns
  table.replaceChildren()
  const head = table.createTHead()
  const headerRow = head.insertRow()
  for (const [label] of columns) {
    const cell = document.createElement('th')
    cell.scope = 'col'
    cell.textContent = label
    headerRow.appendChild(cell)
  }
  const qualityHeader = document.createElement('th')
  qualityHeader.scope = 'col'
  qualityHeader.textContent = 'Quality'
  headerRow.appendChild(qualityHeader)

  const body = table.createTBody()
  if (!result.rows.length) {
    const row = body.insertRow()
    const cell = row.insertCell()
    cell.colSpan = columns.length + 1
    cell.className = 'uploaded-data-empty'
    cell.textContent = 'No transactions match the selected filters.'
  } else {
    for (const item of result.rows) {
      const row = body.insertRow()
      for (const [, field, type] of columns) {
        row.insertCell().textContent = formatSalesValue(item[field], type)
      }
      const qualityCell = row.insertCell()
      const quality = document.createElement('span')
      quality.className = `sales-quality sales-quality-${item.quality_status}`
      quality.textContent = item.quality_status
      quality.title = item.quality_notes || 'No quality issue'
      qualityCell.appendChild(quality)
    }
  }

  const pagination = result.pagination
  const start = pagination.total_rows ? (pagination.page - 1) * pagination.page_size + 1 : 0
  const end = Math.min(pagination.page * pagination.page_size, pagination.total_rows)
  status.textContent = `Showing ${start}-${end} of ${pagination.total_rows.toLocaleString()} cleaned records.`
  pageLabel.textContent = `Page ${pagination.page_count ? pagination.page : 0} of ${pagination.page_count}`
  previous.disabled = pagination.page <= 1
  next.disabled = pagination.page_count === 0 || pagination.page >= pagination.page_count
}

function setSalesViewError(root: HTMLElement, message: string) {
  const table = root.querySelector<HTMLTableElement>('#salesDataTable')
  const status = root.querySelector<HTMLElement>('#salesDataStatus')
  if (table) {
    table.replaceChildren()
    const body = table.createTBody()
    const row = body.insertRow()
    const cell = row.insertCell()
    cell.className = 'uploaded-data-empty'
    cell.textContent = message
  }
  if (status) status.textContent = message
}

function weatherProviderLabel(provider: string) {
  if (provider === 'nasa_power') return 'NASA POWER'
  if (provider === 'open_meteo') return 'Open-Meteo Archive'
  return provider
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

async function loadSalesDataView(root: HTMLElement, state: SalesViewState) {
  const [datasetStatus, page, summary] = await Promise.all([
    getSalesDatasetStatus(),
    getSalesTransactions({
      year: state.year,
      page: state.page,
      pageSize: state.pageSize,
      search: state.search,
      qualityStatus: state.qualityStatus,
    }),
    getSalesSummary({
      year: state.year,
      search: state.search,
      qualityStatus: state.qualityStatus,
    }),
  ])
  state.page = page.pagination.page
  renderSalesDatasetStatus(root, datasetStatus)
  renderSalesComputation(root, summary, state.computation)
  renderSalesPage(root, page)
}

function renderWeatherEffects(root: HTMLElement, result: WeatherEffects) {
  const table = root.querySelector<HTMLTableElement>('#weatherEffectTable')
  const status = root.querySelector<HTMLElement>('#weatherEffectStatus')
  if (!table || !status) return
  const metadata = result.metadata ?? {}
  const grain = String(metadata.grain ?? root.querySelector<HTMLSelectElement>('#weatherGrain')?.value ?? 'monthly')
  const provider = String(metadata.provider ?? 'not refreshed')
  const period = metadata.period_start && metadata.period_end
    ? `${String(metadata.period_start)} to ${String(metadata.period_end)}`
    : 'no period loaded'
  const summary = result.summary?.[0] ?? {}
  const periods = String(metadata.rows_returned ?? summary.periods ?? result.rows.length)
  const salesMatches = String(metadata.sales_matched_rows ?? summary.sales_matched_periods ?? 0)
  const correlation = summary.rainfall_revenue_correlation == null
    ? 'association needs more matched months'
    : `association ${String(summary.rainfall_revenue_correlation)}`
  table.replaceChildren()
  const isDaily = grain === 'daily'
  const headers = isDaily
    ? ['Date', 'Area', 'Provider', 'Rainfall', 'Rainy Day', 'Temp', 'Humidity', 'Wind', 'Severity Proxy', 'Alert', 'Daily Sales Net CP', 'Planning Uplift']
    : ['Period', 'Area', 'Provider', 'Rainfall', 'Rainy Days', 'Avg Temp', 'Avg Humidity', 'Max Wind', 'Severity Proxy', 'Alert', 'Monthly Sales Net CP', 'Planning Uplift']
  const head = table.createTHead()
  const headerRow = head.insertRow()
  for (const label of headers) {
    const cell = document.createElement('th')
    cell.textContent = label
    headerRow.appendChild(cell)
  }
  const body = table.createTBody()
  if (!result.rows.length) {
    const row = body.insertRow()
    const cell = row.insertCell()
    cell.colSpan = headers.length
    cell.className = 'uploaded-data-empty'
    cell.textContent = String(result.metadata.message ?? 'No weather rows match the selected territory and year.')
  } else {
    for (const item of result.rows) {
      const temperature = isDaily ? item.temperature_c : item.avg_temperature_c
      const humidity = isDaily ? item.relative_humidity_pct : item.avg_relative_humidity_pct
      const wind = isDaily ? item.wind_speed_kph : item.max_wind_speed_kph
      const values = [
        isDaily ? item.date ?? item.period : item.period,
        item.area,
        item.provider,
        `${item.rainfall_mm.toFixed(1)} mm`,
        isDaily ? (item.rainy_day ? 'Yes' : 'No') : String(item.rainy_days ?? 0),
        `${Number(temperature ?? 0).toFixed(1)} C`,
        humidity == null ? '-' : `${Number(humidity).toFixed(1)}%`,
        `${Number(wind ?? 0).toFixed(1)} km/h`,
        item.rainfall_severity_proxy.toFixed(3),
        item.weather_alert_level,
        formatSalesValue(item.sales_revenue, 'money'),
        `${item.planning_demand_uplift_pct.toFixed(1)}%`,
      ]
      const row = body.insertRow()
      for (const value of values) row.insertCell().textContent = value
    }
  }
  status.textContent = result.rows.length
    ? `${weatherProviderLabel(provider)} | ${grain === 'daily' ? 'Daily rows' : 'Monthly aggregate'} | ${period} | ${periods} weather rows | ${salesMatches} sales matches | ${correlation}`
    : 'No weather rows match the selected territory and year.'
}

async function loadWeatherEffectView(root: HTMLElement) {
  const year = root.querySelector<HTMLSelectElement>('#weatherYear')?.value ?? '2025'
  const area = root.querySelector<HTMLSelectElement>('#weatherArea')?.value ?? 'all'
  const grain = (root.querySelector<HTMLSelectElement>('#weatherGrain')?.value ?? 'monthly') as 'daily' | 'monthly'
  renderWeatherEffects(root, await getWeatherEffects({ year, area, grain }))
}

function openDashboardHelp(root: HTMLElement) {
  root.querySelector('#dashboardHelpBackdrop')?.classList.add('is-open')
  recordAudit(root, 'Help Opened', 'Dashboard help modal opened.')
}

function closeDashboardHelp(root: HTMLElement) {
  root.querySelector('#dashboardHelpBackdrop')?.classList.remove('is-open')
}

function wrapDashboardAction(
  root: HTMLElement,
  name: string,
  audit: (...args: unknown[]) => { action: string; detail: string },
) {
  const current = window[name]
  if (typeof current !== 'function') return

  window[name] = (...args: unknown[]) => {
    const result = current(...args)
    const entry = audit(...args)
    recordAudit(root, entry.action, entry.detail)
    return result
  }
}

function installDashboardEnhancements(root: HTMLElement) {
  if (root.dataset.enhancementsInstalled === 'true') return
  root.dataset.enhancementsInstalled = 'true'
  window.__medshieldAuditInstalled = true

  const originalOpenHelp = window.openHelp
  if (typeof originalOpenHelp === 'function') {
    window.openHelp = () => openDashboardHelp(root)
  }

  wrapDashboardAction(root, 'showPage', (page) => ({
    action: 'Navigation',
    detail: `Opened ${String(page)} page.`,
  }))
  const originalToggleTheme = window.toggleTheme
  if (typeof originalToggleTheme === 'function') {
    window.toggleTheme = (...args: unknown[]) => {
      const result = originalToggleTheme(...args)
      if (typeof window.buildCharts === 'function') {
        const buildCharts = window.buildCharts as () => void
        window.setTimeout(() => buildCharts(), 0)
      }
      recordAudit(root, 'Theme Changed', `Theme set to ${document.documentElement.dataset.theme ?? 'light'}.`)
      return result
    }
  }
  wrapDashboardAction(root, 'setComparisonMode', (mode) => ({
    action: 'Comparison Mode',
    detail: `Comparison mode set to ${String(mode)}.`,
  }))
  wrapDashboardAction(root, 'setYear', (year) => ({
    action: 'Year Filter',
    detail: `Year filter set to ${String(year)}.`,
  }))
  wrapDashboardAction(root, 'setYoYYear', (year) => ({
    action: 'YoY Filter',
    detail: `Year-over-year focus set to ${String(year)}.`,
  }))
  wrapDashboardAction(root, 'refreshComparison', () => ({
    action: 'Custom Comparison',
    detail: 'Custom year comparison refreshed.',
  }))
  wrapDashboardAction(root, 'applyDatasetPatch', () => ({
    action: 'Dataset Applied',
    detail: 'Dashboard dataset was refreshed from an uploaded file, gateway response, or bundled fallback.',
  }))

  root.querySelector('#closeDashboardHelpButton')?.addEventListener('click', () => closeDashboardHelp(root))
  root.querySelector('#dashboardHelpBackdrop')?.addEventListener('click', (event) => {
    if (event.target === event.currentTarget) closeDashboardHelp(root)
  })
  root.querySelector('#clearAuditLogButton')?.addEventListener('click', () => {
    writeAuditLog([])
    renderAuditLog(root)
  })

  const salesState: SalesViewState = {
    year: 'all',
    search: '',
    qualityStatus: 'all',
    page: 1,
    pageSize: 25,
    computation: 'overview',
    detailLevel: 'compact',
  }

  const refreshSalesView = () =>
    loadSalesDataView(root, salesState).catch((error: unknown) => {
      setSalesViewError(root, error instanceof Error ? error.message : 'Sales data could not be loaded.')
    })

  const openSalesPage = () => {
    const navItem = root.querySelector('#salesDataNavItem')
    root.querySelectorAll('.page').forEach((page) => page.classList.remove('active'))
    root.querySelectorAll('.nav-item').forEach((item) => item.classList.remove('active'))
    root.querySelector('#page-sales-data')?.classList.add('active')
    navItem?.classList.add('active')
    const title = root.querySelector('#topbar-title')
    const subtitle = root.querySelector('#topbar-sub')
    const filterBar = root.querySelector<HTMLElement>('#filterBar')
    if (title) title.textContent = 'View Sales Data'
    if (subtitle) subtitle.textContent = 'Cleaned Transactions, Quality Status, Pagination, and Weather Alignment'
    if (filterBar) filterBar.style.display = 'none'
    const closeNavigation = window.closeNavigation
    if (typeof closeNavigation === 'function' && window.innerWidth <= 720) {
      ;(closeNavigation as () => void)()
    }
    recordAudit(root, 'Navigation', 'Opened View Sales Data page.')
    void refreshSalesView()
  }

  const openWeatherValidationPage = () => {
    const navItem = root.querySelector('#weatherValidationNavItem')
    root.querySelectorAll('.page').forEach((page) => page.classList.remove('active'))
    root.querySelectorAll('.nav-item').forEach((item) => item.classList.remove('active'))
    root.querySelector('#page-weather-validation')?.classList.add('active')
    navItem?.classList.add('active')
    const title = root.querySelector('#topbar-title')
    const subtitle = root.querySelector('#topbar-sub')
    const filterBar = root.querySelector<HTMLElement>('#filterBar')
    if (title) title.textContent = 'Weather API Validation'
    if (subtitle) subtitle.textContent = 'NASA POWER/Open-Meteo Validation, Provenance, and Sales Alignment'
    if (filterBar) filterBar.style.display = 'none'
    const closeNavigation = window.closeNavigation
    if (typeof closeNavigation === 'function' && window.innerWidth <= 720) {
      ;(closeNavigation as () => void)()
    }
    recordAudit(root, 'Navigation', 'Opened Weather API Validation page.')
    void loadWeatherEffectView(root).catch(() => undefined)
  }

  const salesNavItem = root.querySelector('#salesDataNavItem')
  salesNavItem?.addEventListener('click', openSalesPage)
  salesNavItem?.addEventListener('keydown', (event) => {
    if (event instanceof KeyboardEvent && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault()
      openSalesPage()
    }
  })
  const weatherNavItem = root.querySelector('#weatherValidationNavItem')
  weatherNavItem?.addEventListener('click', openWeatherValidationPage)
  weatherNavItem?.addEventListener('keydown', (event) => {
    if (event instanceof KeyboardEvent && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault()
      openWeatherValidationPage()
    }
  })
  root.querySelectorAll('.nav-item:not(#salesDataNavItem):not(#weatherValidationNavItem)').forEach((item) => {
    item.addEventListener('click', () => {
      const filterBar = root.querySelector<HTMLElement>('#filterBar')
      if (filterBar) filterBar.style.display = ''
    })
  })

  root.querySelector('#salesDataYear')?.addEventListener('change', (event) => {
    salesState.year = (event.target as HTMLSelectElement).value
    salesState.page = 1
    void refreshSalesView()
  })
  root.querySelector('#salesDataQuality')?.addEventListener('change', (event) => {
    salesState.qualityStatus = (event.target as HTMLSelectElement).value
    salesState.page = 1
    void refreshSalesView()
  })
  root.querySelector('#salesDataPageSize')?.addEventListener('change', (event) => {
    salesState.pageSize = Number((event.target as HTMLSelectElement).value)
    salesState.page = 1
    void refreshSalesView()
  })
  root.querySelector('#salesDataComputation')?.addEventListener('change', (event) => {
    const value = (event.target as HTMLSelectElement).value
    salesState.computation = ['overview', 'sum', 'average', 'count'].includes(value)
      ? (value as SalesViewState['computation'])
      : 'overview'
    void refreshSalesView()
  })
  root.querySelector('#salesDataDetail')?.addEventListener('change', (event) => {
    const value = (event.target as HTMLSelectElement).value
    salesState.detailLevel = value === 'full' ? 'full' : 'compact'
    void refreshSalesView()
  })
  let searchTimer = 0
  root.querySelector('#salesDataSearch')?.addEventListener('input', (event) => {
    window.clearTimeout(searchTimer)
    salesState.search = (event.target as HTMLInputElement).value
    salesState.page = 1
    searchTimer = window.setTimeout(() => void refreshSalesView(), 250)
  })
  root.querySelector('#salesDataPrevious')?.addEventListener('click', () => {
    salesState.page = Math.max(1, salesState.page - 1)
    void refreshSalesView()
  })
  root.querySelector('#salesDataNext')?.addEventListener('click', () => {
    salesState.page += 1
    void refreshSalesView()
  })

  const processSalesUpload = (input: HTMLInputElement, file: File) => {
    const uploadLog = root.querySelector<HTMLElement>('#uploadLog')
    const salesUploadStatus = root.querySelector<HTMLElement>('#salesPipelineNote')
    const pendingMessage = `Uploading and Cleaning ${file.name}...`
    if (uploadLog) uploadLog.textContent = pendingMessage
    if (salesUploadStatus) salesUploadStatus.textContent = pendingMessage
    recordAudit(root, 'Sales Upload Selected', `Selected ${file.name}.`)
    void uploadSalesFile(file)
      .then(async (result) => {
        const mergeYears = result.persistence.local.years_replaced?.length
          ? ` Replaced year(s): ${result.persistence.local.years_replaced.join(', ')}.`
          : ''
        const warehouse = result.persistence.warehouse.persisted
          ? `Warehouse run ${result.persistence.warehouse.pipeline_run_key}`
          : result.persistence.warehouse.message ?? 'Local processed dataset'
        const message =
          `${result.quality.rows_accepted.toLocaleString()} rows accepted, ` +
          `${result.quality.rows_rejected.toLocaleString()} rejected. ${warehouse}.${mergeYears}`
        if (uploadLog) uploadLog.textContent = message
        if (salesUploadStatus) salesUploadStatus.textContent = message
        recordAudit(
          root,
          'Sales Dataset Cleaned',
          `${file.name}: ${result.quality.rows_accepted.toLocaleString()} accepted and ${result.quality.rows_rejected.toLocaleString()} rejected.`,
        )
        salesState.page = 1
        await refreshSalesView()
        await refreshDashboardFromGateway()
        openSalesPage()
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'Upload failed.'
        if (uploadLog) uploadLog.textContent = message
        if (salesUploadStatus) salesUploadStatus.textContent = message
        recordAudit(root, 'Sales Upload Rejected', `${file.name}: ${message}`)
      })
      .finally(() => {
        input.value = ''
      })
  }

  const installSalesUploadInput = (selector: string) => {
    const originalUploadInput = root.querySelector<HTMLInputElement>(selector)
    if (!originalUploadInput) return
    const uploadInput = originalUploadInput.cloneNode(true) as HTMLInputElement
    originalUploadInput.replaceWith(uploadInput)
    uploadInput.addEventListener('change', (event) => {
      event.preventDefault()
      event.stopImmediatePropagation()
      const input = event.target as HTMLInputElement
      const file = input.files?.[0]
      if (!file) return
      processSalesUpload(input, file)
    }, { capture: true })
  }

  installSalesUploadInput('#salesCsvInput')
  installSalesUploadInput('#salesDataUploadInput')
  root.addEventListener('change', (event) => {
    const input = event.target
    if (!(input instanceof HTMLInputElement)) return
    if (!['salesCsvInput', 'salesDataUploadInput'].includes(input.id)) return
    event.preventDefault()
    event.stopImmediatePropagation()
    const file = input.files?.[0]
    if (!file) return
    processSalesUpload(input, file)
  }, { capture: true })
  root.querySelector('#salesDataUploadButton')?.addEventListener('click', () => {
    root.querySelector<HTMLInputElement>('#salesDataUploadInput')?.click()
  })

  const reloadWeather = () =>
    loadWeatherEffectView(root).catch((error: unknown) => {
      const status = root.querySelector<HTMLElement>('#weatherEffectStatus')
      if (status) status.textContent = error instanceof Error ? error.message : 'Weather data could not be loaded.'
    })
  root.querySelector('#weatherArea')?.addEventListener('change', () => void reloadWeather())
  root.querySelector('#weatherYear')?.addEventListener('change', () => void reloadWeather())
  root.querySelector('#weatherGrain')?.addEventListener('change', () => void reloadWeather())
  root.querySelector('#refreshWeatherButton')?.addEventListener('click', (event) => {
    const button = event.currentTarget as HTMLButtonElement
    const provider = (root.querySelector<HTMLSelectElement>('#weatherProvider')?.value ??
      'nasa_power') as 'nasa_power' | 'open_meteo'
    const area = root.querySelector<HTMLSelectElement>('#weatherArea')?.value ?? 'all'
    const year = root.querySelector<HTMLSelectElement>('#weatherYear')?.value ?? '2025'
    const status = root.querySelector<HTMLElement>('#weatherEffectStatus')
    const providerDisplay = weatherProviderLabel(provider)
    const areaDisplay = area === 'all' ? 'All Territories' : area
    button.disabled = true
    if (status) status.textContent = `Fetching ${providerDisplay} Daily Observations for ${areaDisplay}, ${year}...`
    void refreshWeatherData({
      start: `${year}-01-01`,
      end: `${year}-12-31`,
      areas: area === 'all' ? [] : [area],
      provider,
    })
      .then(async () => {
        recordAudit(root, 'Weather Refreshed', `${providerDisplay}, ${areaDisplay}, ${year}.`)
        await reloadWeather()
      })
      .catch((error: unknown) => {
        if (status) status.textContent = error instanceof Error ? error.message : 'Weather refresh failed.'
      })
      .finally(() => {
        button.disabled = false
      })
  })

  void refreshSalesView()
  root.querySelector('#datasetJsonInput')?.addEventListener('change', (event) => {
    const input = event.target as HTMLInputElement
    const fileName = input.files?.[0]?.name ?? 'unknown JSON'
    recordAudit(root, 'JSON Upload Selected', `Selected ${fileName}.`)
  })
  root.addEventListener('keydown', (event) => {
    if (event instanceof KeyboardEvent && event.key === 'Escape') closeDashboardHelp(root)
  })

  recordAudit(root, 'Session Active', 'Dashboard initialized for authenticated user.')
}

async function refreshDashboardFromGateway() {
  const applyDatasetPatch = window.applyDatasetPatch
  if (typeof applyDatasetPatch !== 'function') {
    return
  }

  const data = await loadDashboardData()
  applyDatasetPatch({
    monthly: data.monthly,
    by_area: data.byArea,
    top_products: data.products,
    year_summary: data.yearSummary,
    seasonality: data.seasonality,
  })
}

type ListenerRecord = {
  target: EventTarget
  type: string
  listener: EventListenerOrEventListenerObject
  options?: boolean | AddEventListenerOptions
}

async function runDashboardScript(script: string): Promise<ListenerRecord[]> {
  const registeredListeners: ListenerRecord[] = []
  const originalAddEventListener = EventTarget.prototype.addEventListener
  let restored = false

  const restorePrototype = () => {
    if (restored) return
    restored = true
    EventTarget.prototype.addEventListener = originalAddEventListener
  }

  EventTarget.prototype.addEventListener = function (
    this: EventTarget,
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ) {
    registeredListeners.push({ target: this, type, listener, options })
    return originalAddEventListener.call(this, type, listener, options)
  }

  try {
    const runtime = new Function(script)
    await Promise.resolve(runtime())
    return registeredListeners
  } finally {
    restorePrototype()
  }
}

function Dashboard({ onLogout }: { onLogout: () => Promise<void> }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const onLogoutRef = useRef(onLogout)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null)

  onLogoutRef.current = onLogout

  const handleLogout = () => {
    if (isLoggingOut) return
    const root = rootRef.current
    if (root) {
      recordAudit(root, 'Logout', 'User requested logout from the dashboard sidebar.')
    }
    setIsLoggingOut(true)
    void onLogoutRef.current().finally(() => setIsLoggingOut(false))
  }

  useEffect(() => {
    const root = rootRef.current
    if (!root) return undefined

    let disposed = false
    let activeListeners: ListenerRecord[] = []

    root.innerHTML = MEDSHIELD_MARKUP
    window.Chart = Chart
    enhanceDashboardContent(root)

    void runDashboardScript(getExecutableDashboardScript())
      .then((listeners) => {
        activeListeners = listeners
        if (disposed) {
          for (const { target, type, listener, options } of activeListeners) {
            target.removeEventListener(type, listener, options)
          }
          return
        }
        installDashboardEnhancements(root)
        const inventoryPageEl = root.querySelector('#page-inventory')
        if (inventoryPageEl) {
          const container = document.createElement('div')
          container.id = 'model-dashboard-portal-container'
          container.style.marginTop = '32px'
          container.style.marginBottom = '32px'
          inventoryPageEl.appendChild(container)
          setPortalContainer(container)
        }

        const logoutBtn = root.querySelector('#sidebarLogoutBtn')
        if (logoutBtn) {
          logoutBtn.addEventListener('click', handleLogout)
          activeListeners.push({ target: logoutBtn, type: 'click', listener: handleLogout })
        }
        void refreshDashboardFromGateway().catch((error) => {
          console.warn('Dashboard is using the bundled fallback dataset:', error)
        })
      })
      .catch((error) => {
        console.error('Failed to initialize the MedShield dashboard runtime:', error)
      })

    return () => {
      disposed = true
      setPortalContainer(null)
      for (const { target, type, listener, options } of activeListeners) {
        target.removeEventListener(type, listener, options)
      }
      root.innerHTML = ''
      for (const name of DASHBOARD_GLOBAL_HANDLERS) {
        delete window[name]
      }
      delete window.__medshieldAuditInstalled
      delete root.dataset.enhancementsInstalled
      document.body.classList.remove('nav-collapsed', 'nav-hidden', 'nav-open')
      delete document.body.dataset.navState
    }
  }, [])

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `${MEDSHIELD_STYLE}\n${MEDSHIELD_STYLE_OVERRIDES}` }} />
      <div ref={rootRef} className="medshield-root" />
      {portalContainer && createPortal(<ModelDashboard />, portalContainer)}
    </>
  )
}

function AppContent() {
  const { isAuthenticated, isAuthLoading, logout } = useAuth()

  if (isAuthLoading) {
    return (
      <main
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: '#e5e7fb',
          color: '#155a91',
          fontFamily: 'Inter, DM Sans, Open Sans, system-ui, sans-serif',
          fontWeight: 700,
        }}
      >
        Restoring Secure Session...
      </main>
    )
  }

  if (!isAuthenticated) {
    return <Login onLoginSuccess={() => undefined} />
  }

  return <Dashboard onLogout={logout} />
}

export default function Page() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
