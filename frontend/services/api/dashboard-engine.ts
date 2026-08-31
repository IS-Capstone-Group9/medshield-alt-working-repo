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
  if (patch.by_year_area) DATA.by_year_area = patch.by_year_area;
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
    .replace(
      "const clusterRows = [",
      "const clusterRows = getDynamicClusterRows(); const _unusedClusterRows = ["
    )
    .replace(
      "const priorityRows = [",
      "const priorityRows = getDynamicPriorityRows(); const _unusedPriorityRows = ["
    )
    .replace(
      "createChart('areaBarChart', {",
      "updateAreaChartHeaders(); createChart('areaBarChart', {"
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
  'LEGAZPI', 'LUCENA', 'PAGBILAO'
]);
const DASHBOARD_CHANNEL_LABELS = new Set([
  'GOVERNMENT', 'HOSPITAL', 'PHARMA', 'QMC', 'PESO', 'ADMIN', 'PROVINCIAL TOURISM OFFICE'
]);
const DASHBOARD_BUSINESS_LINE_LABELS = new Set(['ADMIN', 'SUPPLIES', 'EQUIPMENT', 'PERSONAL', 'LOSSES']);

function dashboardAreaKey(row) {
  return String(row && row.area ? row.area : '').trim().toUpperCase();
}

function sortedDashboardAreaRows(rows, metric) {
  return (rows || [])
    .filter(function(row) {
      return row && row.area && typeof row.revenue === 'number' && typeof row.income === 'number';
    })
    .slice()
    .sort(function(left, right) {
      return (right[metric] || 0) - (left[metric] || 0);
    });
}

function getActiveDashboardYear() {
  if (typeof selectedYear !== 'undefined' && selectedYear) return String(selectedYear);
  if (typeof window !== 'undefined') {
    var select = document.getElementById('topbarYearSelect');
    if (select && select.value) return String(select.value);
  }
  return 'all';
}

function getYearAreaSource() {
  var yr = getActiveDashboardYear();
  if (typeof DATA === 'undefined' || !DATA) return [];
  if (yr === 'all' || !yr) {
    return Array.isArray(DATA.by_area) ? DATA.by_area : [];
  }
  if (DATA.by_year_area && Array.isArray(DATA.by_year_area[yr]) && DATA.by_year_area[yr].length > 0) {
    return DATA.by_year_area[yr];
  }
  if (yr === '2026') {
    if (DATA.by_year_area && typeof DATA.by_year_area === 'object') {
      var recentYears = ['2025', '2024', '2023'].filter(function(y) {
        return Array.isArray(DATA.by_year_area[y]) && DATA.by_year_area[y].length > 0;
      });
      if (recentYears.length > 0) {
        var totalForecastRev = 212000000;
        var forwardMargin = 0.487;
        var weightedShares = {};
        var totalWeight = 0;
        recentYears.forEach(function(y, idx) {
          var weight = recentYears.length - idx; // 3 for 2025, 2 for 2024, 1 for 2023
          totalWeight += weight;
          var rows = DATA.by_year_area[y];
          var yrTotal = rows.reduce(function(sum, r) { return sum + (r.revenue || 0); }, 0);
          if (yrTotal > 0) {
            rows.forEach(function(r) {
              var a = r.area;
              weightedShares[a] = (weightedShares[a] || 0) + ((r.revenue || 0) / yrTotal) * weight;
            });
          }
        });
        if (totalWeight > 0) {
          var estimatedRows = [];
          for (var areaName in weightedShares) {
            var share = weightedShares[areaName] / totalWeight;
            var rev = Math.round(totalForecastRev * share);
            var inc = Math.round(rev * forwardMargin);
            estimatedRows.push({ area: areaName, revenue: rev, income: inc });
          }
          return estimatedRows.sort(function(a, b) { return b.revenue - a.revenue; });
        }
      }
    }
  }
  return Array.isArray(DATA.by_area) ? DATA.by_area : [];
}

function dashboardRowsOrDerived(field, labels) {
  if (typeof DATA === 'undefined' || !DATA) return [];
  var yr = getActiveDashboardYear();
  if (yr === 'all' && Array.isArray(DATA[field]) && DATA[field].length) return DATA[field];
  var source = getYearAreaSource();
  return (Array.isArray(source) ? source : []).filter(function(row) {
    return labels.has(dashboardAreaKey(row));
  });
}

function canonicalTerritoryProvince(name) {
  var u = String(name || '').trim().toUpperCase();
  if (u === 'QUEZON' || u === 'PAGBILAO' || u === 'LUCENA' || u === 'EAST' || u === 'EASTERN' || u === 'EASTERN QUEZON' || u === 'QUEZON PROVINCE' || u === 'QUEZON PROVINCE (EASTERN)' || u === 'GULANG GULANG' || u === 'PADRE BURGOS') return 'Quezon';
  if (u === 'BATANGAS' || u === 'BATNGAS') return 'Batangas';
  if (u === 'LAGUNA' || u === 'LAGUMA') return 'Laguna';
  if (u === 'CAVITE' || u === 'LOWER CAVITE') return 'Cavite';
  if (u === 'MARINDUQUE') return 'Marinduque';
  if (u === 'CAMARINES SUR' || u === 'CAM SUR') return 'Camarines Sur';
  if (u === 'CAMARINES NORTE' || u === 'CAM NORTE') return 'Camarines Norte';
  if (u === 'ALBAY' || u === 'LEGASPI' || u === 'LEGAZPI' || u === 'LAGASPI') return 'Albay';
  if (u === 'RIZAL') return 'Rizal';
  if (u === 'METRO MANILA' || u === 'NCR') return 'Metro Manila';
  return null;
}

function getDashboardTerritoryRows() {
  var source = getYearAreaSource();
  var provinceTotals = {};
  
  (Array.isArray(source) ? source : []).forEach(function(row) {
    if (!row || !row.area) return;
    var prov = canonicalTerritoryProvince(row.area);
    if (!prov) return; // Strictly ignore channels and non-provinces
    if (!provinceTotals[prov]) {
      provinceTotals[prov] = { area: prov, revenue: 0, income: 0 };
    }
    provinceTotals[prov].revenue += (row.revenue || 0);
    provinceTotals[prov].income += (row.income || 0);
  });

  var rows = [];
  for (var prov in provinceTotals) {
    rows.push(provinceTotals[prov]);
  }
  return rows.sort(function(a, b) { return (b.revenue || 0) - (a.revenue || 0); });
}

function getDashboardChannelRows() {
  return sortedDashboardAreaRows(dashboardRowsOrDerived('by_channel', DASHBOARD_CHANNEL_LABELS), 'income');
}

function getDashboardBusinessLineRows() {
  return sortedDashboardAreaRows(dashboardRowsOrDerived('by_business_line', DASHBOARD_BUSINESS_LINE_LABELS), 'revenue');
}

function updateAreaChartHeaders() {
  if (typeof document === 'undefined') return;
  var yr = getActiveDashboardYear();
  var barCard = document.getElementById('areaBarChart') ? document.getElementById('areaBarChart').closest('.chart-card') : null;
  var incCard = document.getElementById('areaIncomeChart') ? document.getElementById('areaIncomeChart').closest('.chart-card') : null;
  if (barCard) {
    var badge = barCard.querySelector('.chart-badge');
    var subtitle = barCard.querySelector('.chart-subtitle');
    if (badge) {
      badge.textContent = yr === 'all' ? 'Province Grain (All Years)' : (yr === '2026' ? '2026 Forecast Estimate' : yr + ' Province Grain');
    }
    if (subtitle) {
      subtitle.textContent = yr === '2026' ? 'Projected 2026 territory demand via recency-weighted historical shares' : (yr === 'all' ? 'All-time provincial sales contribution' : 'Isolated ' + yr + ' provincial sales contribution');
    }
  }
  if (incCard) {
    var incBadge = incCard.querySelector('.chart-badge');
    var incSubtitle = incCard.querySelector('.chart-subtitle');
    if (incBadge) {
      incBadge.textContent = yr === 'all' ? 'Profit Contribution' : (yr === '2026' ? '2026 Forward Margin' : yr + ' Net Income');
    }
    if (incSubtitle) {
      incSubtitle.textContent = yr === '2026' ? 'Estimated 2026 operating margin using weighted historical forward margin' : (yr === 'all' ? 'All-time channel and territory margin' : 'Isolated ' + yr + ' territory profit contribution');
    }
  }
}

function getDynamicClusterRows() {
  var yr = getActiveDashboardYear();
  var territories = getDashboardTerritoryRows();
  
  if (!territories.length) {
    return [
      { cluster: 'Tier 1 - High Volume', areas: 'Quezon, Batangas', profile: 'Primary provincial volume hubs', implication: 'Pre-allocate critical therapeutic safety stock' },
      { cluster: 'Tier 2 - Regional Hubs', areas: 'Marinduque, Laguna, Cavite', profile: 'Stable regional retail flow', implication: 'Maintain steady replenishment and monsoon buffer' },
      { cluster: 'Tier 3 - Outlying Zones', areas: 'Camarines Sur, Camarines Norte, Albay', profile: 'Transit-sensitive coastal provinces', implication: 'Stage contingency stocks before adverse weather seasons' }
    ];
  }

  var sortedNames = territories.map(function(r) { return r.area; });
  var tier1 = sortedNames.slice(0, 2).join(', ');
  var tier2 = sortedNames.slice(2, 5).join(', ');
  var tier3 = sortedNames.slice(5).join(', ') || 'Peripheral provincial zones';

  var yrPrefix = yr === 'all' ? 'All-Time' : (yr === '2026' ? '2026 Projected' : yr);

  return [
    { cluster: 'Tier 1 - High Volume (' + yrPrefix + ')', areas: tier1, profile: 'Primary provincial volume leaders', implication: 'Prioritize automated safety buffer pre-stocking' },
    { cluster: 'Tier 2 - Regional Hubs (' + yrPrefix + ')', areas: tier2, profile: 'Stable commercial & clinic flow', implication: 'Maintain bi-weekly replenishment and epidemic reserves' },
    { cluster: 'Tier 3 - Outlying Zones (' + yrPrefix + ')', areas: tier3, profile: 'Transit-sensitive coastal provinces', implication: 'Stage contingency stocks before adverse weather seasons' }
  ];
}

function getDynamicPriorityRows() {
  var yr = getActiveDashboardYear();
  var territories = getDashboardTerritoryRows();
  var actions = {
    'Quezon': 'Pre-allocate critical therapeutic safety stock & flood buffer',
    'Batangas': 'Maintain targeted replenishment and monsoon buffer',
    'Marinduque': 'Stage island contingency stocks prior to ferry suspension',
    'Laguna': 'Ensure bi-weekly warehouse staging and clinic reserves',
    'Cavite': 'Balance commercial distribution with emergency reserves',
    'Camarines Norte': 'Pre-position antipyretics ahead of rainfall surges',
    'Camarines Sur': 'Deploy mobile emergency distribution hubs',
    'Albay': 'Maintain volcanic and typhoon buffer stock reserves',
    'Rizal': 'Coordinate transit buffers with Metro Manila distribution',
    'Metro Manila': 'Maintain rapid-dispatch central warehouse reserves'
  };

  var totalRev = territories.reduce(function(sum, r) { return sum + (r.revenue || 0); }, 0) || 1;
  var surgeWeights = {
    'Quezon': 0.95, 'Batangas': 0.90, 'Marinduque': 0.88, 'Laguna': 0.82,
    'Cavite': 0.78, 'Camarines Sur': 0.85, 'Camarines Norte': 0.80,
    'Albay': 0.82, 'Rizal': 0.75, 'Metro Manila': 0.70
  };

  return territories.map(function(t, idx) {
    var share = (t.revenue || 0) / totalRev;
    var risk = surgeWeights[t.area] || 0.75;
    var score = (share * 0.45) + (risk * 0.35) + (0.20 * (1 - (idx / Math.max(territories.length, 1))));
    return {
      rank: idx + 1,
      area: t.area,
      revenue: share.toFixed(2),
      growth: (0.10 + share * 0.2).toFixed(2),
      risk: risk.toFixed(2),
      score: score.toFixed(2),
      action: actions[t.area] || 'Maintain targeted safety buffer'
    };
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
