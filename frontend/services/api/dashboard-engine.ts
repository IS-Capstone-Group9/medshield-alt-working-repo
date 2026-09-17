import { PLANNING_SCRIPT } from './prescriptive-planning-runtime'
import { EXTERNAL_REGRESSION_SCRIPT } from './external-regression-runtime'
import { FORECAST_VALIDATION_SCRIPT } from './forecast-validation-runtime'
import { SALES_SECTORS_SCRIPT } from './sales-sectors-runtime'
import { MEDSHIELD_SCRIPT } from '@/lib/medshieldReference'
import { SALES_DIAGNOSTICS_SCRIPT } from './sales-diagnostics-runtime'
import { SALES_HEATMAP_SCRIPT } from './sales-heatmap-runtime'
import { patchOverviewMonthlyChart } from './overview-monthly-runtime'
import { CURRENT_YEAR_SCRIPT } from './current-year-runtime'
import { PRODUCT_PRIORITIZATION_SCRIPT } from './product-prioritization-runtime'
import {
  DESCRIPTIVE_PERIOD_SCRIPT,
  patchDescriptivePeriodFilters,
} from './descriptive-period-runtime'

export type ListenerRecord = {
  target: EventTarget
  type: string
  listener: EventListenerOrEventListenerObject
  options?: boolean | AddEventListenerOptions
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
  'setDescriptivePeriod',
  'setDescriptiveComparisonMode',
  'setCustomDateRange',
  'configureProductYearControls',
  'refreshComparison',
  'applyDatasetPatch',
  'buildCharts',
  'downloadTableAsCSV',
  'exportSalesGrowthCSV',
  'setPlanningData', 'setPlanningResult', 'getPlanningRequest', 'invalidatePlan', 'changePlanningScope', 'requestPlanSolve', 'exportPlanningCSV',
  'setExternalRegressionData',
  'renderExternalRegression',
  'changeRegressionScope',
  'exportExternalRegressionCSV',
  'setForecastValidationData',
  'renderForecastValidation',
  'changeForecastScope',
  'exportForecastValidationCSV',
  'setSalesSectorsData',
  'renderSalesSectors',
  'setAreaPriorityWeights',
  'setSalesHeatmapData',
  'changeHeatmapCategory',
  'renderSalesHeatmap',
  'exportSalesHeatmapCSV',
  'removeBadge',
  'exportRestockPlanToCsv',
  'selectSeasonRestock',
  'openEoqModal',
  'closeAuditModal',
  'closeEoqModal',
  'closeHelpModal',
  'confirmAndExecuteOrder',
  'executeEoqReorder',
  'recalibrateModelSafetyBuffers',
  'updateMcdaWeights',
  'resetMcdaWeights',
  'updateSurgeScenario',
  'setSurgePreset',
  'generateAiBriefing',
  'copyAiBriefing',
  'printExecutiveMemo',
  'buildTables',
  'buildShowcaseCharts',
  'renderShowcaseDOMVisuals',
  'renderProductPrioritizationTimeline',
] as const

export function getExecutableDashboardScript(): string {
  const globalHandlerBridge = DASHBOARD_GLOBAL_HANDLERS
    .map((name) => `if (typeof ${name} === 'function') window.${name} = ${name};`)
    .join('\n')

  let patchedScript = patchDescriptivePeriodFilters(patchOverviewMonthlyChart(MEDSHIELD_SCRIPT))
    // The design reference still contains its original demonstration payload.
    // Empty it before the script executes so no local numbers can be rendered,
    // even during the hidden initialization phase before Databricks responds.
    .replace(
      /const DATA = \{[\s\S]*?\n\};\n\nconst PAGE_META/,
      `const DATA = {
  monthly: [],
  by_area: [],
  year_summary: [],
  seasonality: [],
  top_products: []
};

const PAGE_META`,
    )
    .replace(
      /const MOCK_BY_AREA = \[[\s\S]*?\n\];\n\nconst MOCK_TOP_PRODUCTS/,
      'const MOCK_BY_AREA = [];\n\nconst MOCK_TOP_PRODUCTS',
    )
    .replace(
      /const MOCK_TOP_PRODUCTS = \[[\s\S]*?\n\];\nconst MOCK_MONTHLY/,
      'const MOCK_TOP_PRODUCTS = [];\nconst MOCK_MONTHLY',
    )
    .replace("data: ['Data Upload', 'CSV and JSON sources for dashboard updates']", "data: ['Databricks Source', 'Live Gold provenance and ingestion policy']")
    .replace(/window\.([a-zA-Z0-9_]+)\s*=\s*\1;?/g, "if (typeof $1 !== 'undefined') window.$1 = $1;")
    .replace("window.addEventListener('DOMContentLoaded', async () => {", `(async () => {\n${globalHandlerBridge}\n`)
    .replaceAll("'#335F78'", "dashboardThemeColor('--chart-label', '#335F78')")
    .replaceAll("'#67879A'", "dashboardThemeColor('--chart-muted', '#67879A')")
    .replaceAll("'rgba(201,219,229,0.65)'", "dashboardThemeColor('--chart-grid', 'rgba(201,219,229,0.65)')")
    .replaceAll('animation: false', 'animation: dashboardChartAnimation()')
    .replaceAll('animations: false', 'animations: dashboardChartAnimations()')
    .replace("charts[id].update('none');", "if (dashboardReducedMotion()) charts[id].update('none');")
    .replace('if (document.startViewTransition &&', 'if (false && document.startViewTransition &&')
    .replace('chart.resize();', "if (!chart.canvas || !chart.canvas.isConnected) return;\n      chart.resize();")
    // After making a page active, rebuild charts so canvases render at correct dimensions
    .replace(
      "if (page) page.classList.add('active');",
      `if (page) {
    page.classList.add('active');
    // Rebuild charts after the newly-visible page has painted so canvases have non-zero dimensions
    requestAnimationFrame(function() {
      setTimeout(function() {
        if (typeof buildCharts === 'function') buildCharts();
        if (typeof buildTables === 'function') buildTables();
        if (typeof configureProductYearControls === 'function') configureProductYearControls(name);
        if (typeof renderProductPrioritizationTimeline === 'function') renderProductPrioritizationTimeline();
        if (typeof renderSalesSectors === 'function') renderSalesSectors();
        if (typeof renderForecastValidation === 'function') renderForecastValidation();
        if (typeof renderExternalRegression === 'function') renderExternalRegression();
        if (typeof renderSalesHeatmap === 'function') renderSalesHeatmap();
        if (typeof renderShowcaseDOMVisuals === 'function') renderShowcaseDOMVisuals();
      }, 60);
    });
  }`
    )
    .replace(
      "if (charts[id]) charts[id].destroy();",
      `
    const existingChart = Chart.getChart ? Chart.getChart(canvas) : charts[id];
    if (existingChart) existingChart.destroy();
    if (charts[id] && charts[id] !== existingChart) charts[id].destroy();`,
    )
  // Robust closing of the (async () => { ... })() IIFE block before utility functions
  if (patchedScript.includes("});\n\nif (typeof window !== 'undefined')")) {
    patchedScript = patchedScript.replace("});\n\nif (typeof window !== 'undefined')", "})();\n\nif (typeof window !== 'undefined')")
  } else if (patchedScript.includes("});\nif (typeof window !== 'undefined')")) {
    patchedScript = patchedScript.replace("});\nif (typeof window !== 'undefined')", "})();\nif (typeof window !== 'undefined')")
  } else {
    // Fallback regex replacement if there are no utility functions appended
    patchedScript = patchedScript.replace(/\n}\);\s*$/, `\n})();`)
  }

  return `
const Chart = (window.Chart && (window.Chart.Chart || window.Chart.default || window.Chart)) || window.Chart;
function dashboardThemeColor(name, fallback) {
  try {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
  } catch (error) {
    return fallback;
  }
}
function dashboardReducedMotion() {
  return Boolean(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
}
function dashboardChartAnimation() {
  if (dashboardReducedMotion()) return false;
  return {
    duration: 850,
    easing: 'easeOutQuart',
    delay: function(context) {
      return context.type === 'data' ? Math.min((context.dataIndex || 0) * 12, 240) : 0;
    }
  };
}
function dashboardChartAnimations() {
  if (dashboardReducedMotion()) return false;
  return {
    y: {
      duration: 850,
      easing: 'easeOutQuart',
      from: function(context) {
        var dataset = context.chart.data.datasets[context.datasetIndex] || {};
        var scale = context.chart.scales[dataset.yAxisID || 'y'];
        return scale ? scale.getPixelForValue(0) : undefined;
      }
    }
  };
}
// Returns the first array if it has numeric values, otherwise returns the fallback array.
function numericSeriesOrFallback(primary, fallback) {
  if (Array.isArray(primary) && primary.length > 0 && primary.some(function(v) { return typeof v === 'number' && isFinite(v) && v > 0; })) {
    return primary;
  }
  return fallback || [];
}

function applyDatasetPatch(patch) {
  if (!patch || typeof patch !== 'object') return;
  if (typeof DATA === 'undefined' || !DATA) return;
  if (Array.isArray(patch.monthly)) DATA.monthly = patch.monthly;
  if (Array.isArray(patch.by_area)) DATA.by_area = patch.by_area;
  if (Array.isArray(patch.top_products)) DATA.top_products = patch.top_products;
  if (Array.isArray(patch.year_summary)) DATA.year_summary = patch.year_summary;
  if (Array.isArray(patch.seasonality)) DATA.seasonality = patch.seasonality;
  if (typeof buildCharts === 'function') buildCharts();
  if (typeof buildTables === 'function') buildTables();
  if (typeof refreshComparison === 'function') refreshComparison();
}

function getSortedProductRows() {
  if (typeof DATA === 'undefined' || !DATA || !DATA.top_products) return [];
  return [...DATA.top_products].sort(function(a, b) {
    var k = typeof productTableSort !== 'undefined' ? productTableSort.key : 'revenue';
    var dir = (typeof productTableSort !== 'undefined' && productTableSort.direction === 'asc') ? 1 : -1;
    if (a[k] < b[k]) return -1 * dir;
    if (a[k] > b[k]) return 1 * dir;
    return 0;
  });
}

function renderTable(id, html) {
  var el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

function getProductSortIndicator(key) {
  if (typeof productTableSort === 'undefined') return '\u2195';
  if (productTableSort.key !== key) return '\u2195';
  return productTableSort.direction === 'asc' ? '\u2191' : '\u2193';
}

function bindProductTableSort() {
  if (typeof productTableSort === 'undefined') return;
  var ths = document.querySelectorAll('#productTable th.sortable');
  for (var i = 0; i < ths.length; i++) {
    ths[i].addEventListener('click', function(e) {
      var key = e.currentTarget.getAttribute('data-sort-key');
      if (productTableSort.key === key) {
        productTableSort.direction = productTableSort.direction === 'asc' ? 'desc' : 'asc';
      } else {
        productTableSort.key = key;
        productTableSort.direction = 'desc';
      }
      if (typeof buildTables === 'function') buildTables();
    });
  }
}

function applyTheme(theme) {
  try {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  } catch (error) {
    console.error(error);
  }
}
function ensureMockFallbackData() {
  // Handled by static DATA structure initialization
}
function setAllChartWrapStates(state) {
  try {
    document.querySelectorAll('.chart-wrap').forEach((wrap) => {
      wrap.setAttribute('data-state', state);
      if (wrap.dataset) {
        wrap.dataset.state = state;
      }
    });
  } catch (error) {
    console.error(error);
  }
}
function updateFilterBar(name) {
  try {
    const bar = document.getElementById('filterBar');
    if (bar) {
      if (['overview', 'revenue', 'territory'].includes(name)) {
        bar.style.display = 'flex';
      } else {
        bar.style.display = 'none';
      }
    }
  } catch (error) {
    console.error(error);
  }
}
function resizeCharts() {
  try {
    if (typeof charts !== 'undefined') {
      for (const id in charts) {
        const ch = charts[id];
        if (ch && typeof ch.resize === 'function') {
          try {
            if (!ch.canvas || !ch.canvas.isConnected) continue;
            ch.resize();
            if (typeof ch.update === 'function') ch.update('none');
          } catch (e) {
            // ignore per-chart resize errors
          }
        }
      }
    }
  } catch (error) {
    console.error(error);
  }
}
${SALES_DIAGNOSTICS_SCRIPT}
${CURRENT_YEAR_SCRIPT}
${DESCRIPTIVE_PERIOD_SCRIPT}
${PRODUCT_PRIORITIZATION_SCRIPT}
${SALES_HEATMAP_SCRIPT}
${SALES_SECTORS_SCRIPT}
${FORECAST_VALIDATION_SCRIPT}
${EXTERNAL_REGRESSION_SCRIPT}
${PLANNING_SCRIPT}
${patchedScript}
\n${globalHandlerBridge}
`
}

export async function runDashboardScript(script: string): Promise<ListenerRecord[]> {
  const addedListeners: ListenerRecord[] = []
  const originalAddEventListener = EventTarget.prototype.addEventListener

  EventTarget.prototype.addEventListener = function (
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ) {
    addedListeners.push({ target: this, type, listener, options })
    originalAddEventListener.call(this, type, listener, options)
  }

  try {
    const run = new Function(script)
    run()
  } finally {
    EventTarget.prototype.addEventListener = originalAddEventListener
  }

  return addedListeners
}
