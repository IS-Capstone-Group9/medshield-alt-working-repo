import fs from 'node:fs'
import path from 'node:path'
import { MEDSHIELD_MARKUP, MEDSHIELD_STYLE } from '../lib/medshieldReference'
import { getExecutableDashboardScript } from '../services/api/dashboard-engine'

import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..', '..')
const targetFile = path.join(repoRoot, 'dss_explainer_dashboard.html')

// Extract the exact executable script
const executableScript = getExecutableDashboardScript()

// Executive Story Toolbar and Story Narrative Cards
const STORY_TOOLBAR_HTML = `
<!-- ── EXECUTIVE 5-ACT STORY PROGRESS BAR ── -->
<div class="story-progress-bar" id="storyProgressBar">
  <div class="story-indicator-group">
    <div class="story-badge-kicker">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"></path>
        <path d="M6 6h10M6 10h10M6 14h6"></path>
      </svg>
      <span>Data Story Arc:</span>
    </div>
    <button type="button" class="story-step-btn active" id="storyBtn1" onclick="jumpToStoryAct(1)">
      <span class="story-step-num">1</span> Baseline Context
    </button>
    <button type="button" class="story-step-btn" id="storyBtn2" onclick="jumpToStoryAct(2)">
      <span class="story-step-num">2</span> The Complication
    </button>
    <button type="button" class="story-step-btn" id="storyBtn3" onclick="jumpToStoryAct(3)">
      <span class="story-step-num">3</span> Predictive Foresight
    </button>
    <button type="button" class="story-step-btn" id="storyBtn4" onclick="jumpToStoryAct(4)">
      <span class="story-step-num">4</span> Prescriptive Resolution
    </button>
    <button type="button" class="story-step-btn" id="storyBtn5" onclick="jumpToStoryAct(5)">
      <span class="story-step-num">5</span> Governed Value
    </button>
  </div>
  <div class="story-nav-actions">
    <button type="button" class="story-btn-nav" onclick="prevStoryAct()">◀ Prev</button>
    <button type="button" class="story-btn-nav primary" onclick="nextStoryAct()">Next Chapter ▶</button>
  </div>
</div>
`

const STORY_EXTRA_CSS = `
/* ── EXECUTIVE DATA STORY BAR & NARRATIVE STYLES ── */
.story-progress-bar {
  background: linear-gradient(90deg, #0D1B2A 0%, #162D4A 100%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding: 8px 28px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  color: #FFFFFF;
  position: sticky;
  top: 64px;
  z-index: 45;
  box-shadow: 0 2px 8px rgba(13, 27, 42, 0.15);
}
.story-indicator-group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.story-badge-kicker {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 700;
  color: #F59E0B;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-right: 4px;
}
.story-step-btn {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.14);
  color: #CBD5E1;
  padding: 5px 12px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: inherit;
}
.story-step-btn:hover {
  background: rgba(245, 158, 11, 0.2);
  color: #F4BE47;
  border-color: #F59E0B;
}
.story-step-btn.active {
  background: #F59E0B;
  color: #0D1B2A;
  border-color: #D97706;
  font-weight: 700;
  box-shadow: 0 0 10px rgba(245, 158, 11, 0.4);
}
.story-step-num {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.25);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
}
.story-step-btn.active .story-step-num {
  background: #0D1B2A;
  color: #F59E0B;
}
.story-nav-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}
.story-btn-nav {
  padding: 5px 11px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.14);
  color: #FFFFFF;
  transition: all 0.15s ease;
  font-family: inherit;
}
.story-btn-nav:hover {
  background: rgba(255, 255, 255, 0.16);
}
.story-btn-nav.primary {
  background: linear-gradient(135deg, #F59E0B, #D97706);
  border-color: #D97706;
  color: #0D1B2A;
  font-weight: 700;
}
.story-btn-nav.primary:hover {
  box-shadow: 0 0 12px rgba(245, 158, 11, 0.4);
}

.story-narrative-banner {
  background: #FFFFFF;
  border: 1px solid var(--border);
  border-left: 5px solid #F59E0B;
  border-radius: var(--radius-md);
  padding: 16px 20px;
  margin-bottom: 20px;
  box-shadow: var(--shadow-sm);
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}
.story-narrative-badge {
  display: inline-block;
  background: #FFFBEB;
  color: #B45309;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 6px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 4px;
  border: 1px solid rgba(245, 158, 11, 0.3);
}
.story-narrative-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.01em;
}
.story-narrative-body {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 4px;
  line-height: 1.55;
}

@media (max-width: 1024px) {
  .story-progress-bar {
    top: 0;
    padding: 8px 16px;
  }
}
`

// Narrative Banners to inject in exact DSS tabs
const BANNER_OVERVIEW = `
  <div class="story-narrative-banner">
    <div>
      <span class="story-narrative-badge">Act 1 & 2 · Executive Baseline & Problem Context</span>
      <h3 class="story-narrative-title">The MedShield North Star: Optimizing Inventory to Suppress Expiry Wastage Below ≤ 5%</h3>
      <p class="story-narrative-body">
        MedShield distributes pharmaceuticals across seasonal outbreak zones (CALABARZON, MIMAROPA, Bicol). Across 10 audited years (₱282.8M baseline), procurement historically faced the <strong>Double-Edged Sword</strong>: stockout vulnerability during monsoon surges (28.4% risk) vs. expiry losses from over-ordering (8.7%–12%).
      </p>
    </div>
    <div style="text-align:right; flex-shrink:0;">
      <span style="font-size:10px; font-weight:700; color:var(--emerald); text-transform:uppercase; letter-spacing:0.06em;">Target Cap</span>
      <div style="font-size:22px; font-weight:800; color:var(--emerald);">≤ 5.0%</div>
    </div>
  </div>
`

const BANNER_REVENUE = `
  <div class="story-narrative-banner">
    <div>
      <span class="story-narrative-badge">Act 1 · Descriptive Analytics Baseline</span>
      <h3 class="story-narrative-title">Uncovering 10 Years of Seasonal Surge Multipliers (2017–2026)</h3>
      <p class="story-narrative-body">
        Sales diagnostics across 40,781 transactions separate pure commercial transactions from backward-allocated contracts. STL seasonality heatmaps isolate bi-modal surges in <strong>May</strong> and <strong>Sep–Nov</strong> where antibiotic demand jumps by <strong>+29.6%</strong>.
      </p>
    </div>
  </div>
`

const BANNER_PRODUCTS = `
  <div class="story-narrative-banner">
    <div>
      <span class="story-narrative-badge">Act 3 · Clinical Prioritization & Capital Protection</span>
      <h3 class="story-narrative-title">Pareto 80/20 & ABC-VEN Clinical Decision Matrix</h3>
      <p class="story-narrative-body">
        Top 20% of pharmaceutical SKUs generate 81.2% of total revenue. Combining ABC commercial velocity with VEN clinical criticality ensures zero stockouts for life-saving antibiotics while the Dead-Stock Engine freezes <strong>₱1.18M</strong> in unmoving Class C inventory.
      </p>
    </div>
    <div style="text-align:right; flex-shrink:0;">
      <span style="font-size:10px; font-weight:700; color:var(--red); text-transform:uppercase; letter-spacing:0.06em;">Dead Stock Frozen</span>
      <div style="font-size:22px; font-weight:800; color:var(--red);">₱1.18M</div>
    </div>
  </div>
`

const BANNER_TERRITORY = `
  <div class="story-narrative-banner">
    <div>
      <span class="story-narrative-badge">Act 3 · Territory Vulnerability Matrix</span>
      <h3 class="story-narrative-title">MCDA Territorial Vulnerability & Cosine Expansion Matching</h3>
      <p class="story-narrative-body">
        Multi-Criteria Decision Analysis (MCDA) combines provincial volume with epidemiological risk (DOH DII) and typhoon exposure (PAGASA RSI). Cosine similarity algorithms match regional product lines across public and private hospitals (69.9% volume share).
      </p>
    </div>
  </div>
`

const BANNER_FORECAST = `
  <div class="story-narrative-banner">
    <div>
      <span class="story-narrative-badge">Act 3 · Predictive Foresight</span>
      <h3 class="story-narrative-title">Facebook Prophet ML with Exogenous DII / RSI Climate Regressors</h3>
      <p class="story-narrative-body">
        Rolling horizon projections combine disease intensity surveillance and monsoon rainfall severity with 80% and 95% confidence intervals (±12.4% CI). Validated retrospectively against 2026 actuals, the model achieves a benchmark <strong>MAPE of 11.4%</strong>.
      </p>
    </div>
    <div style="text-align:right; flex-shrink:0;">
      <span style="font-size:10px; font-weight:700; color:var(--purple); text-transform:uppercase; letter-spacing:0.06em;">Model Accuracy</span>
      <div style="font-size:22px; font-weight:800; color:var(--purple);">11.4% MAPE</div>
    </div>
  </div>
`

const BANNER_INVENTORY = `
  <div class="story-narrative-banner">
    <div>
      <span class="story-narrative-badge">Act 4 & 5 · Prescriptive Solver & Governed Value</span>
      <h3 class="story-narrative-title">Mixed-Integer Linear Programming (MILP) Solver: Wastage Capped at ≤ 3.2%</h3>
      <p class="story-narrative-body">
        The prescriptive solver integrates Economic Order Quantity (EOQ), dynamic reorder points (ROP), and budget-constrained MILP allocation. <strong>The Business Result:</strong> Stockouts suppressed from 28.4% to 2.1%, generating <strong>+₱4.15M in net annual savings</strong> and keeping expiry loss strictly $\le 3.6\%$.
      </p>
    </div>
    <div style="text-align:right; flex-shrink:0;">
      <span style="font-size:10px; font-weight:700; color:var(--emerald); text-transform:uppercase; letter-spacing:0.06em;">Annual Value</span>
      <div style="font-size:22px; font-weight:800; color:var(--emerald);">+₱4.15M</div>
    </div>
  </div>
`

// Inject banners and story stepper into exact MEDSHIELD_MARKUP
let markup = MEDSHIELD_MARKUP

// Inject Story Progress Bar inside main container, right after topbar
markup = markup.replace(
  '</header>',
  '</header>\n' + STORY_TOOLBAR_HTML
)

// Inject narrative banners at the top of each page content
markup = markup.replace(
  '<div class="page active" id="page-overview">',
  '<div class="page active" id="page-overview">\n' + BANNER_OVERVIEW
)

markup = markup.replace(
  '<div class="page" id="page-revenue">',
  '<div class="page" id="page-revenue">\n' + BANNER_REVENUE
)

markup = markup.replace(
  '<div class="page" id="page-products">',
  '<div class="page" id="page-products">\n' + BANNER_PRODUCTS
)

markup = markup.replace(
  '<div class="page" id="page-territory">',
  '<div class="page" id="page-territory">\n' + BANNER_TERRITORY
)

markup = markup.replace(
  '<div class="page" id="page-forecast">',
  '<div class="page" id="page-forecast">\n' + BANNER_FORECAST
)

markup = markup.replace(
  '<div class="page" id="page-inventory">',
  '<div class="page" id="page-inventory">\n' + BANNER_INVENTORY
)

// Story stepper helper script
const STORY_STEPPER_SCRIPT = `
// ── STORY STEPPER RUNTIME ENGINE ──
let currentStoryAct = 1;

function updateStoryActUI(actNum) {
  currentStoryAct = actNum;
  for (let i = 1; i <= 5; i++) {
    const btn = document.getElementById('storyBtn' + i);
    if (btn) {
      if (i === actNum) btn.classList.add('active');
      else btn.classList.remove('active');
    }
  }
}

function jumpToStoryAct(actNum) {
  updateStoryActUI(actNum);
  if (actNum === 1) {
    if (typeof showPage === 'function') showPage('overview', document.querySelector('.nav-item[onclick*="overview"]'));
  } else if (actNum === 2) {
    if (typeof showPage === 'function') showPage('revenue', document.querySelector('.nav-item[onclick*="revenue"]'));
  } else if (actNum === 3) {
    if (typeof showPage === 'function') showPage('forecast', document.querySelector('.nav-item[onclick*="forecast"]'));
  } else if (actNum === 4) {
    if (typeof showPage === 'function') showPage('inventory', document.querySelector('.nav-item[onclick*="inventory"]'));
  } else if (actNum === 5) {
    if (typeof showPage === 'function') showPage('inventory', document.querySelector('.nav-item[onclick*="inventory"]'));
  }
}

function nextStoryAct() {
  const next = currentStoryAct >= 5 ? 1 : currentStoryAct + 1;
  jumpToStoryAct(next);
}

function prevStoryAct() {
  const prev = currentStoryAct <= 1 ? 5 : currentStoryAct - 1;
  jumpToStoryAct(prev);
}

// Synchronize story stepper when user clicks sidebar navigation directly
const originalShowPage = window.showPage;
window.showPage = function(name, el) {
  if (originalShowPage) originalShowPage(name, el);
  if (name === 'overview') updateStoryActUI(1);
  else if (name === 'revenue') updateStoryActUI(2);
  else if (name === 'products' || name === 'territory' || name === 'forecast') updateStoryActUI(3);
  else if (name === 'inventory') updateStoryActUI(4);
};
`

// Combine into standalone HTML document
const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MedShield Executive Decision Support System (DSS) — Live Data Story Cockpit</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
${MEDSHIELD_STYLE}
${STORY_EXTRA_CSS}
  </style>
</head>
<body>
${markup}

  <!-- BACKDROP FOR MOBILE -->
  <div id="sidebarBackdrop" onclick="if (typeof closeNavigation === 'function') closeNavigation()"></div>

  <!-- RUNTIME SCRIPTS -->
  <script>
${executableScript}
${STORY_STEPPER_SCRIPT}

    // Auto-initialize charts and tables on load
    window.addEventListener('DOMContentLoaded', function() {
      if (typeof buildCharts === 'function') buildCharts();
      if (typeof buildTables === 'function') buildTables();
      if (typeof showPage === 'function') showPage('overview', document.querySelector('.nav-item.active'));
    });
  </script>
</body>
</html>
`

fs.writeFileSync(targetFile, fullHtml, 'utf-8')
console.log(`Successfully generated exact DSS UI in ${targetFile} (${fullHtml.length} bytes).`)
