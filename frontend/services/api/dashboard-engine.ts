import { MEDSHIELD_SCRIPT } from '@/lib/medshieldReference'

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
  'refreshComparison',
  'applyDatasetPatch',
  'buildCharts',
  'downloadTableAsCSV',
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
] as const

export function getExecutableDashboardScript(): string {
  const globalHandlerBridge = DASHBOARD_GLOBAL_HANDLERS
    .map((name) => `if (typeof ${name} === 'function') window.${name} = ${name};`)
    .join('\n')

  let patchedScript = MEDSHIELD_SCRIPT
    .replace(/window\.([a-zA-Z0-9_]+)\s*=\s*\1;?/g, "if (typeof $1 !== 'undefined') window.$1 = $1;")
    .replace("window.addEventListener('DOMContentLoaded', async () => {", `(async () => {\n${globalHandlerBridge}\n`)
    .replaceAll("'#335F78'", "dashboardThemeColor('--chart-label', '#335F78')")
    .replaceAll("'#67879A'", "dashboardThemeColor('--chart-muted', '#67879A')")
    .replaceAll("'rgba(201,219,229,0.65)'", "dashboardThemeColor('--chart-grid', 'rgba(201,219,229,0.65)')")
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
    .replace(
      "const sortedProductRows = getSortedProductRows();",
      "const sortedProductRows = getSortedProductRows();"
    )
    .replace(
      "if (patch.by_area) DATA.by_area = normalizeAreaRows(patch.by_area);",
      `if (patch.by_area) DATA.by_area = normalizeAreaRows(patch.by_area);
  if (patch.by_territory) DATA.by_territory = normalizeAreaRows(patch.by_territory);
  if (patch.by_channel) DATA.by_channel = normalizeAreaRows(patch.by_channel);
  if (patch.by_business_line) DATA.by_business_line = normalizeAreaRows(patch.by_business_line);`
    )
    .replaceAll(
      "DATA.by_area.map((row) => row.area)",
      "getDashboardTerritoryRows().map((row) => row.area)"
    )
    .replaceAll(
      "DATA.by_area.map((row) => row.revenue)",
      "getDashboardTerritoryRows().map((row) => row.revenue)"
    )
    .replace(
      "const topAreaRevenue = (DATA.by_area.length ? DATA.by_area : MOCK_BY_AREA).slice().sort((a, b) => b.revenue - a.revenue).slice(0, 10);",
      "const topAreaRevenue = getDashboardTerritoryRows().slice().sort((a, b) => b.revenue - a.revenue).slice(0, 10);"
    )
    .replace(
      "const topAreaIncome = (DATA.by_area.length ? DATA.by_area : MOCK_BY_AREA).slice().sort((a, b) => b.income - a.income).slice(0, 10);",
      "const topAreaIncome = getDashboardChannelRows().slice().sort((a, b) => b.income - a.income).slice(0, 10);"
    )
    .replace(
      "label: 'Net Income',\\n        data: topAreaIncome.map((row) => row.income),",
      "label: 'Gross Margin',\\n        data: topAreaIncome.map((row) => row.income),"
    )
    .replace(
      "const topAreaMargin = (DATA.by_area.length ? DATA.by_area : MOCK_BY_AREA).slice().sort((a, b) => b.revenue - a.revenue).slice(0, 10);",
      "const topAreaMargin = getDashboardBusinessLineRows().slice().sort((a, b) => b.revenue - a.revenue).slice(0, 10);"
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
// Returns the first array if it has numeric values, otherwise returns the fallback array.
function numericSeriesOrFallback(primary, fallback) {
  if (Array.isArray(primary) && primary.length > 0 && primary.some(function(v) { return typeof v === 'number' && isFinite(v) && v > 0; })) {
    return primary;
  }
  return fallback || [];
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

const DASHBOARD_TERRITORY_LABELS = new Set([
  'BATANGAS', 'QUEZON', 'MARINDUQUE', 'CAMARINES NORTE', 'CAM NORTE',
  'CAMARINES SUR', 'CAM SUR', 'CAVITE', 'LOWER CAVITE', 'LAGUNA',
  'METRO MANILA', 'NCR', 'RIZAL', 'ALBAY', 'LEGASPI',
  'LEGAZPI', 'LUCENA'
]);
const DASHBOARD_CHANNEL_LABELS = new Set(['GOVERNMENT', 'HOSPITAL', 'PHARMA']);
const DASHBOARD_BUSINESS_LINE_LABELS = new Set(['ADMIN', 'SUPPLIES', 'EQUIPMENT', 'PERSONAL', 'LOSSES']);

function dashboardAreaKey(row) {
  return String(row && row.area ? row.area : '').trim().toUpperCase();
}

function sortedDashboardAreaRows(rows, key) {
  const metric = key || 'revenue';
  return (Array.isArray(rows) ? rows : [])
    .filter(function(row) {
      return row && row.area && typeof row.revenue === 'number' && typeof row.income === 'number';
    })
    .slice()
    .sort(function(left, right) {
      return (right[metric] || 0) - (left[metric] || 0);
    });
}

function dashboardRowsOrDerived(field, labels) {
  if (typeof DATA === 'undefined' || !DATA) return [];
  if (Array.isArray(DATA[field]) && DATA[field].length) return DATA[field];
  return (Array.isArray(DATA.by_area) ? DATA.by_area : []).filter(function(row) {
    return labels.has(dashboardAreaKey(row));
  });
}

function getDashboardTerritoryRows() {
  return sortedDashboardAreaRows(dashboardRowsOrDerived('by_territory', DASHBOARD_TERRITORY_LABELS), 'revenue');
}

function getDashboardChannelRows() {
  return sortedDashboardAreaRows(dashboardRowsOrDerived('by_channel', DASHBOARD_CHANNEL_LABELS), 'income');
}

function getDashboardBusinessLineRows() {
  return sortedDashboardAreaRows(dashboardRowsOrDerived('by_business_line', DASHBOARD_BUSINESS_LINE_LABELS), 'revenue');
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
      if (['overview', 'revenue', 'products', 'territory'].includes(name)) {
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
