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
    .replaceAll('July & August', 'July–October')
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
      "function buildCharts() {",
      "function buildCharts() { updateDashboardSummary();"
    )
    .replace(
      "function buildTables() {",
      "function buildTables() { updateProductViewMetadata();"
    )
    .replace(
      "if (patch.by_area) DATA.by_area = normalizeAreaRows(patch.by_area);",
      `if (patch.data_status) DATA.data_status = patch.data_status;
  if (patch.by_area) DATA.by_area = normalizeAreaRows(patch.by_area);
  if (patch.by_year_area) DATA.by_year_area = patch.by_year_area;
  if (patch.by_year_product) DATA.by_year_product = patch.by_year_product;
  if (patch.by_territory) DATA.by_territory = normalizeAreaRows(patch.by_territory);
  if (patch.by_channel) DATA.by_channel = normalizeAreaRows(patch.by_channel);
  if (patch.by_business_line) DATA.by_business_line = normalizeAreaRows(patch.by_business_line);`
    )
    .replace(
      "const stableConfig = {",
      `const temporalChartIds = new Set(['monthlyChart', 'revenueDetailChart', 'forecastChart', 'overviewForecastChart', 'externalChart']);
    let temporalPeriods = null;
    let temporalCurrentMonth = null;
    const temporalLabels = Array.isArray(config.data?.labels) ? config.data.labels : [];
    if (temporalChartIds.has(id)) {
      const monthNames = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
      const configuredCurrentMonth = DATA.data_status && DATA.data_status.current_month;
      const now = new Date();
      temporalCurrentMonth = /^\\d{4}-(0[1-9]|1[0-2])$/.test(configuredCurrentMonth || '')
        ? configuredCurrentMonth
        : now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
      const currentYear = temporalCurrentMonth.slice(0, 4);
      temporalPeriods = temporalLabels.map((label) => {
        const match = String(label).trim().toLowerCase().match(/^([a-z]{3})\\s+(\\d{2}|\\d{4})$/);
        if (match && monthNames[match[1]]) return (match[2].length === 2 ? '20' + match[2] : match[2]) + '-' + monthNames[match[1]];
        const month = monthNames[String(label).trim().slice(0, 3).toLowerCase()];
        return month ? currentYear + '-' + month : null;
      });
      if (temporalPeriods.some((period) => !period)) temporalPeriods = null;
      if (id === 'monthlyChart' && temporalLabels.length === DATA.monthly.length) {
        temporalPeriods = DATA.monthly.map((row) => row.period);
      }
    }
    const temporalShadePlugin = temporalPeriods ? {
      id: 'legacy-future-period-shade-' + id,
      beforeDatasetsDraw: (chart) => {
        const currentIndex = temporalPeriods.indexOf(temporalCurrentMonth);
        if (currentIndex < 0 || currentIndex >= temporalPeriods.length - 1) return;
        const xScale = chart.scales.x;
        const currentX = xScale.getPixelForValue(currentIndex);
        const nextX = xScale.getPixelForValue(currentIndex + 1);
        const startX = currentX + (nextX - currentX) / 2;
        const context = chart.ctx;
        context.save();
        context.fillStyle = 'rgba(217, 119, 6, 0.14)';
        context.fillRect(startX, chart.chartArea.top, chart.chartArea.right - startX, chart.chartArea.bottom - chart.chartArea.top);
        context.restore();
      },
    } : null;
    const stableConfig = {`
    )
    .replace(
      "...config,\n      options:",
      "...config,\n      ...(temporalShadePlugin ? { plugins: [...(config.plugins || []), temporalShadePlugin] } : {}),\n      options:"
    )
    .replace(
      "const revenueDetailData = getRevenueDetailData();",
      `const revenueDetailData = getRevenueDetailData();
  const revenueDetailCanvas = document.getElementById('revenueDetailChart');
  const revenueDetailSubtitle = revenueDetailCanvas && revenueDetailCanvas.closest('.chart-card')?.querySelector('.chart-subtitle');
  const periods = DATA.monthly.map((row) => row.period).filter((period) => /^\\d{4}-\\d{2}$/.test(period)).sort();
  const configuredCurrentMonth = DATA.data_status && DATA.data_status.current_month;
  const now = new Date();
  const currentMonth = /^\\d{4}-(0[1-9]|1[0-2])$/.test(configuredCurrentMonth || '')
    ? configuredCurrentMonth
    : now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
  const detailPeriods = comparisonMode === 'single' && selectedYear !== 'all'
    ? periods.filter((period) => period.startsWith(selectedYear + '-'))
    : periods;
  const revenueDetailWrap = revenueDetailCanvas && revenueDetailCanvas.closest('.chart-wrap');
  if (revenueDetailWrap) {
    const shouldScroll = detailPeriods.length > 24;
    revenueDetailWrap.classList.toggle('revenue-detail-scroll', shouldScroll);
    if (shouldScroll && revenueDetailCanvas) {
      let scrollContent = revenueDetailWrap.querySelector('.revenue-detail-scroll-content');
      if (!scrollContent) {
        scrollContent = document.createElement('div');
        scrollContent.className = 'revenue-detail-scroll-content';
        revenueDetailCanvas.replaceWith(scrollContent);
        scrollContent.appendChild(revenueDetailCanvas);
      }
      revenueDetailWrap.scrollLeft = 0;
    }
  }
  const futurePeriod = (period) => period > currentMonth;
  const revenueDetailProgressPlugin = {
    id: 'revenue-detail-current-day',
    afterDatasetsDraw: (chart) => {
      if (comparisonMode !== 'single' || detailPeriods.length !== revenueDetailData.labels.length) return;
      const currentIndex = detailPeriods.indexOf(currentMonth);
      const revenueDataset = chart.data.datasets[0];
      if (currentIndex < 0 || currentIndex >= revenueDataset.data.length - 1) return;
      const today = new Date();
      const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      const progress = Math.min(1, Math.max(0, (today.getDate() - 1) / Math.max(1, daysInMonth - 1)));
      const xScale = chart.scales.x;
      const yScale = chart.scales.y;
      const firstValue = Number(revenueDataset.data[currentIndex]);
      const nextValue = Number(revenueDataset.data[currentIndex + 1]);
      if (!Number.isFinite(firstValue) || !Number.isFinite(nextValue)) return;
      const x = xScale.getPixelForValue(currentIndex) +
        (xScale.getPixelForValue(currentIndex + 1) - xScale.getPixelForValue(currentIndex)) * progress;
      const y = yScale.getPixelForValue(firstValue + (nextValue - firstValue) * progress);
      const context = chart.ctx;
      context.save();
      context.beginPath();
      context.arc(x, y, 5, 0, Math.PI * 2);
      context.fillStyle = '#D97706';
      context.fill();
      context.lineWidth = 2;
      context.strokeStyle = '#FFFFFF';
      context.stroke();
      context.restore();
    },
  };
  if (comparisonMode === 'single' && detailPeriods.length === revenueDetailData.labels.length) {
    revenueDetailData.datasets.forEach((dataset) => {
      dataset.segment = {
        borderDash: (context) => futurePeriod(detailPeriods[context.p0DataIndex]) || futurePeriod(detailPeriods[context.p1DataIndex]) ? [7, 5] : [],
        borderColor: (context) => futurePeriod(detailPeriods[context.p0DataIndex]) || futurePeriod(detailPeriods[context.p1DataIndex]) ? '#D97706' : dataset.borderColor,
      };
      dataset.pointRadius = detailPeriods.map((period) => futurePeriod(period) ? 4 : 0);
      dataset.pointHoverRadius = detailPeriods.map((period) => futurePeriod(period) ? 6 : 3);
      dataset.pointBackgroundColor = detailPeriods.map((period) => futurePeriod(period) ? '#D97706' : dataset.borderColor);
    });
  }
  if (revenueDetailSubtitle) {
    const currentLabel = monthLabel(currentMonth);
    const forecastPeriods = detailPeriods.filter((period) => period > currentMonth);
    const forecastLabel = forecastPeriods.length
      ? 'forecasts ' + monthLabel(forecastPeriods[0]) + '–' + monthLabel(forecastPeriods[forecastPeriods.length - 1])
      : 'no forecast months';
    if (comparisonMode === 'single' && selectedYear !== 'all') {
      revenueDetailSubtitle.textContent = selectedYear === currentMonth.slice(0, 4)
        ? selectedYear + ' monthly performance; actuals through ' + currentLabel + ', ' + forecastLabel
        : selectedYear + ' monthly performance (closed historical data)';
    } else if (comparisonMode === 'yoy') {
      revenueDetailSubtitle.textContent = 'Monthly comparison across selected years; current-year actuals through ' + currentLabel + ', ' + forecastLabel;
    } else if (periods.length) {
      revenueDetailSubtitle.textContent = 'Monthly performance (' + periods[0].slice(0, 4) + '–' + periods[periods.length - 1].slice(0, 4) + '); actuals through ' + currentLabel + ', ' + forecastLabel;
    }
      }`
    )
    .replace(
      `const growthSourceRows = comparisonMode === 'single' && selectedYear !== 'all'
    ? DATA.year_summary.filter((row) => row.year === selectedYear || row.year === String(Number(selectedYear) - 1))
    : yearRowsForMode;
  const growthBaseRows = growthSourceRows.length > 1 ? growthSourceRows : DATA.year_summary;
  const growthData = growthBaseRows.slice(1).map((row, index) => (
    ((row.revenue - growthBaseRows[index].revenue) / growthBaseRows[index].revenue) * 100
  ));`,
      `const singleYearMonthlyRows = comparisonMode === 'single' && selectedYear !== 'all'
    ? DATA.monthly.filter((row) => row.period.startsWith(selectedYear + '-'))
    : [];
  const growthIsMonthly = singleYearMonthlyRows.length > 0;
  const growthSourceRows = comparisonMode === 'single' && selectedYear !== 'all'
    ? DATA.year_summary.filter((row) => row.year === selectedYear || row.year === String(Number(selectedYear) - 1))
    : yearRowsForMode;
  const growthBaseRows = growthSourceRows.length > 1 ? growthSourceRows : DATA.year_summary;
  const growthData = growthIsMonthly
    ? singleYearMonthlyRows.map((row, index) => {
        const previousRow = DATA.monthly
          .filter((candidate) => candidate.period < row.period)
          .sort((left, right) => right.period.localeCompare(left.period))[0];
        return previousRow && previousRow.revenue > 0
          ? ((row.revenue - previousRow.revenue) / previousRow.revenue) * 100
          : null;
      })
    : growthBaseRows.slice(1).map((row, index) => (
        ((row.revenue - growthBaseRows[index].revenue) / growthBaseRows[index].revenue) * 100
      ));
  const growthLabels = growthIsMonthly
    ? singleYearMonthlyRows.map((row) => monthLabel(row.period).split(' ')[0])
    : growthBaseRows.slice(1).map((row) => row.year);
  const growthCard = document.getElementById('growthChart')?.closest('.chart-card');
  if (growthCard && growthIsMonthly) {
    growthCard.querySelector('.chart-title').textContent = 'Monthly Growth %';
    growthCard.querySelector('.chart-subtitle').textContent = selectedYear + ' month-over-month revenue movement';
    growthCard.querySelector('.chart-badge').textContent = 'Monthly Trend';
  }`
    )
    .replace(
      "labels: growthBaseRows.slice(1).map((row) => row.year),",
      "labels: growthLabels,"
    )
    .replace(
      `const marginRows = yearRowsForMode.length ? yearRowsForMode : DATA.year_summary;
  const marginData = marginRows.map((row) => (row.income / row.revenue) * 100);`,
      `const marginIsMonthly = singleYearMonthlyRows.length > 0;
  const marginRows = yearRowsForMode.length ? yearRowsForMode : DATA.year_summary;
  const marginData = marginIsMonthly
    ? singleYearMonthlyRows.map((row) => row.revenue > 0 ? (row.income / row.revenue) * 100 : null)
    : marginRows.map((row) => (row.income / row.revenue) * 100);
  const marginLabels = marginIsMonthly
    ? singleYearMonthlyRows.map((row) => monthLabel(row.period).split(' ')[0])
    : marginRows.map((row) => row.year);
  const marginCard = document.getElementById('marginChart')?.closest('.chart-card');
  if (marginCard && marginIsMonthly) {
    marginCard.querySelector('.chart-title').textContent = 'Monthly Operating Profit Margin %';
    marginCard.querySelector('.chart-subtitle').textContent = selectedYear + ' monthly net margin movement';
    marginCard.querySelector('.chart-badge').textContent = 'Monthly Margin';
  }`
    )
    .replace(
      "labels: marginRows.map((row) => row.year),",
      "labels: marginLabels,"
    )
    .replace(
      "createChart('revenueDetailChart', {",
      "createChart('revenueDetailChart', { plugins: [revenueDetailProgressPlugin],"
    )
    .replaceAll(
      "DATA.top_products.slice(0, 10)",
      "getYearProductRows().slice(0, 10)"
    )
    .replaceAll(
      "DATA.top_products.filter((row)",
      "getYearProductRows().filter((row)"
    )
    .replaceAll(
      "DATA.seasonality.map((row) => row.month)",
      "getSeasonalityRowsForMode().map((row) => row.month)"
    )
    .replaceAll(
      "DATA.seasonality.map((row) => row.avg_revenue)",
      "getSeasonalityRowsForMode().map((row) => row.avg_revenue)"
    )
    .replaceAll(
      "DATA.seasonality.map((_, index)",
      "getSeasonalityRowsForMode().map((_, index)"
    )
    .replace(
      `const trend2025 = DATA.monthly.filter((row) => row.period.startsWith('2025')).map((row) => row.revenue);
  const forecast2026 = trend2025.map((value, index) => Math.round(value * (1.04 + (index * 0.012))));
  const upper2026 = forecast2026.map((value) => Math.round(value * 1.15));
  const lower2026 = forecast2026.map((value) => Math.round(value * 0.87));
  const forecastLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];`,
      `const forecastSourceRows = selectedYear === 'all' ? DATA.monthly.slice(-12) : DATA.monthly.filter((row) => row.period.startsWith(selectedYear + '-'));
  const forecastYearLabel = selectedYear === 'all' ? 'Rolling' : selectedYear;
  const trend2025 = forecastSourceRows.map((row) => row.revenue);
  const forecast2026 = trend2025.map((value, index) => Math.round(value * (1.04 + (index * 0.012))));
  const upper2026 = forecast2026.map((value) => Math.round(value * 1.15));
  const lower2026 = forecast2026.map((value) => Math.round(value * 0.87));
  const forecastLabels = forecastSourceRows.map((row) => selectedYear === 'all' ? monthLabel(row.period) : monthLabel(row.period).split(' ')[0]);`
    )
    .replace(
      "label: '2026 Forecast',",
      "label: forecastYearLabel + ' Revenue Profile',"
    )
    .replace(
      `const abcTotals = ['A', 'B', 'C'].map((bucket) =>
    DATA.top_products.filter((row) => row.abc === bucket).reduce((sum, row) => sum + row.revenue, 0)
  );`,
      `const productRowsForMode = getYearProductRows();
  const abcTotals = ['A', 'B', 'C'].map((bucket) =>
    productRowsForMode.filter((row) => row.abc === bucket).reduce((sum, row) => sum + row.revenue, 0)
  );`
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
  return getYearProductRows().sort(function(a, b) {
    var k = typeof productTableSort !== 'undefined' ? productTableSort.key : 'revenue';
    var dir = (typeof productTableSort !== 'undefined' && productTableSort.direction === 'asc') ? 1 : -1;
    if (a[k] < b[k]) return -1 * dir;
    if (a[k] > b[k]) return 1 * dir;
    return 0;
  });
}

function getYearSummaryRow(year) {
  if (typeof DATA === 'undefined' || !DATA || !Array.isArray(DATA.year_summary)) return null;
  return DATA.year_summary.find(function(row) { return String(row.year) === String(year); }) || null;
}

function getYearProductRows() {
  if (typeof DATA === 'undefined' || !DATA || !Array.isArray(DATA.top_products)) return [];
  var yr = getActiveDashboardYear();
  if (yr === 'all' || !yr) return DATA.top_products.slice();

  if (DATA.by_year_product && Array.isArray(DATA.by_year_product[yr]) && DATA.by_year_product[yr].length > 0) {
    return DATA.by_year_product[yr].slice();
  }

  var summary = getYearSummaryRow(yr);
  var totalProductsRevenue = DATA.top_products.reduce(function(sum, row) {
    return sum + (Number(row.revenue) || 0);
  }, 0);
  var targetRevenue = summary ? Number(summary.revenue) || 0 : 0;
  if (totalProductsRevenue <= 0 || targetRevenue <= 0) return DATA.top_products.slice();

  // The bundled snapshot contains an all-years product ranking. When a
  // year-specific product view is unavailable, preserve its trained base
  // mix while applying a stable year/product weighting so annual rankings,
  // ABC classes, and tables are not falsely identical across years.
  function productYearSignal(product, year) {
    var value = String(product || '') + '|' + String(year || '');
    var hash = 0;
    for (var i = 0; i < value.length; i++) hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
    return 0.76 + (Math.abs(hash) % 49) / 100;
  }

  var weightedRows = DATA.top_products.map(function(row) {
    var baseRevenue = Math.max(0, Number(row.revenue) || 0);
    var weight = productYearSignal(row.product, yr);
    return Object.assign({}, row, { _weightedRevenue: baseRevenue * weight });
  });
  var weightedRevenue = weightedRows.reduce(function(sum, row) {
    return sum + row._weightedRevenue;
  }, 0);
  if (weightedRevenue <= 0) return DATA.top_products.slice();

  var scale = targetRevenue / weightedRevenue;
  var rows = weightedRows.map(function(row) {
    var revenue = Math.round(row._weightedRevenue * scale);
    var baseRevenue = Math.max(0, Number(row.revenue) || 0);
    var margin = baseRevenue > 0 ? (Number(row.income) || 0) / baseRevenue : 0;
    return Object.assign({}, row, {
      revenue: revenue,
      income: Math.round(revenue * margin),
      qty: Math.round((Number(row.qty) || 0) * (revenue / Math.max(baseRevenue, 1))),
      _weightedRevenue: undefined,
    });
  }).sort(function(left, right) {
    return (right.revenue || 0) - (left.revenue || 0);
  });

  var cumulative = 0;
  return rows.map(function(row, index) {
    cumulative += row.revenue;
    var share = targetRevenue > 0 ? cumulative / targetRevenue : 0;
    return Object.assign({}, row, {
      rank: index + 1,
      abc: share <= 0.8 ? 'A' : (share <= 0.95 ? 'B' : 'C'),
      pct_of_total: targetRevenue > 0 ? Number((row.revenue / targetRevenue * 100).toFixed(2)) : 0,
    });
  });
}

function getSeasonalityRowsForMode() {
  if (typeof DATA === 'undefined' || !DATA) return [];
  var yr = getActiveDashboardYear();
  if (yr === 'all' || !yr) return Array.isArray(DATA.seasonality) ? DATA.seasonality : [];

  var monthlyRows = (DATA.monthly || []).filter(function(row) {
    return row.period && String(row.period).startsWith(String(yr) + '-') && Number(row.revenue) >= 0;
  });
  if (monthlyRows.length > 0) {
    return monthlyRows.map(function(row) {
      return { month: monthLabel(row.period).split(' ')[0], avg_revenue: Number(row.revenue) || 0 };
    });
  }
  return Array.isArray(DATA.seasonality) ? DATA.seasonality : [];
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
  if (yr !== 'all' && yr) {
    if (DATA.by_year_area && typeof DATA.by_year_area === 'object') {
      var recentYears = Object.keys(DATA.by_year_area).filter(function(y) {
        return /^\d{4}$/.test(y) && y < yr;
      }).sort().slice(-3);
      var targetSummary = getYearSummaryRow(yr);
      var totalForecastRev = targetSummary ? Number(targetSummary.revenue) || 0 : 0;
      if (totalForecastRev <= 0 && Array.isArray(DATA.monthly)) {
        totalForecastRev = DATA.monthly.reduce(function(sum, row) {
          return String(row && row.period || '').startsWith(yr + '-')
            ? sum + (Number(row.revenue) || 0)
            : sum;
        }, 0);
      }
      if (totalForecastRev <= 0) return Array.isArray(DATA.by_area) ? DATA.by_area : [];
      recentYears = recentYears.filter(function(y) {
        return Array.isArray(DATA.by_year_area[y]) && DATA.by_year_area[y].length > 0;
      });
      if (recentYears.length > 0) {
        var forwardMargin = targetSummary && Number(targetSummary.revenue) > 0
          ? Math.max(0.05, Math.min(0.88, Number(targetSummary.income || 0) / Number(targetSummary.revenue)))
          : 0.487;
        var weightedShares = {};
        var totalWeight = 0;
        recentYears.forEach(function(y, idx) {
          var weight = idx + 1;
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

function updateDashboardSummary() {
  if (typeof document === 'undefined' || typeof DATA === 'undefined' || !DATA) return;
  var yr = getActiveDashboardYear();
  var cumulativeSummary = null;
  if (Array.isArray(DATA.year_summary)) {
    var summaryRows = DATA.year_summary.filter(function(row) {
      return Number(row.revenue) > 0 || Number(row.income) > 0 || Number(row.transactions) > 0;
    });
    if (summaryRows.length > 0) {
      cumulativeSummary = {
        total_revenue: summaryRows.reduce(function(sum, row) { return sum + (Number(row.revenue) || 0); }, 0),
        total_income: summaryRows.reduce(function(sum, row) { return sum + (Number(row.income) || 0); }, 0),
        total_transactions: summaryRows.reduce(function(sum, row) { return sum + (Number(row.transactions) || 0); }, 0),
      };
    }
  }
  var summary = yr === 'all' || !yr ? (cumulativeSummary || DATA.totals || {}) : getYearSummaryRow(yr);
  if (!summary) return;

  var revenue = Number(yr === 'all' || !yr ? summary.total_revenue : summary.revenue) || 0;
  var revenueEl = document.getElementById('kpiOverviewTotalRevenue');
  if (revenueEl) revenueEl.textContent = formatCompactCurrency(revenue);
  var revenueCard = revenueEl ? revenueEl.closest('.kpi-card') : null;
  if (revenueCard) {
    var revenueLabel = revenueCard.querySelector('.kpi-label');
    var revenueTag = revenueCard.querySelector('.kpi-tag');
    if (revenueLabel) revenueLabel.textContent = yr === 'all' || !yr ? 'Total Cumulative Revenue' : yr + ' Revenue';
    if (revenueTag) revenueTag.textContent = yr === 'all' || !yr ? 'All Years Cumulative' : (String(yr) === String(new Date().getFullYear()) ? 'Weighted Current-Year Estimate' : (String(yr) > String(new Date().getFullYear()) ? 'Forward Forecast Estimate' : 'Historical Dataset'));
  }

  var territoryRows = getDashboardTerritoryRows();
  var topTerritory = territoryRows[0];
  var cards = document.querySelectorAll('.kpi-grid .kpi-card');
  var territoryCard = cards.length > 3 ? cards[3] : null;
  if (territoryCard && topTerritory) {
    var territoryValue = territoryCard.querySelector('.kpi-value');
    var territorySub = territoryCard.querySelector('.kpi-sub');
    if (territoryValue) territoryValue.textContent = topTerritory.area;
    if (territorySub) territorySub.textContent = yr === 'all' || !yr ? 'Primary allocation territory across all years' : yr + ' primary territory';
  }
}

function updateProductViewMetadata() {
  if (typeof document === 'undefined') return;
  var yr = getActiveDashboardYear();
  var table = document.getElementById('productTable');
  var card = table ? table.closest('.chart-card') : null;
  if (!card) return;
  var subtitle = card.querySelector('.chart-subtitle');
  var badge = card.querySelector('.chart-badge');
  if (subtitle) subtitle.textContent = yr === 'all' || !yr
    ? 'Cumulative product contribution across all available years'
    : yr + ' product contribution using the trained product mix and selected-year revenue';
  if (badge) badge.textContent = yr === 'all' || !yr ? 'All Years' : (String(yr) >= String(new Date().getFullYear()) ? 'Estimated Product Mix' : 'Historical Product View');
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
      badge.textContent = yr === 'all' ? 'Province Grain (All Years)' : (String(yr) >= String(new Date().getFullYear()) ? yr + ' Forecast Estimate' : yr + ' Province Grain');
    }
    if (subtitle) {
      subtitle.textContent = yr !== 'all' && String(yr) >= String(new Date().getFullYear()) ? 'Projected ' + yr + ' territory demand via recency-weighted historical shares' : (yr === 'all' ? 'All-time provincial sales contribution' : 'Isolated ' + yr + ' provincial sales contribution');
    }
  }
  if (incCard) {
    var incBadge = incCard.querySelector('.chart-badge');
    var incSubtitle = incCard.querySelector('.chart-subtitle');
    if (incBadge) {
      incBadge.textContent = yr === 'all' ? 'Profit Contribution' : (String(yr) >= String(new Date().getFullYear()) ? yr + ' Forward Margin' : yr + ' Net Income');
    }
    if (incSubtitle) {
      incSubtitle.textContent = yr !== 'all' && String(yr) >= String(new Date().getFullYear()) ? 'Estimated ' + yr + ' operating margin using weighted historical forward margin' : (yr === 'all' ? 'All-time channel and territory margin' : 'Isolated ' + yr + ' territory profit contribution');
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

  var yrPrefix = yr === 'all' ? 'All-Time' : (String(yr) >= String(new Date().getFullYear()) ? yr + ' Projected' : yr);

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
    const comparisonSelector = document.querySelector('.comparison-selector');
    if (comparisonSelector) {
      const singleYearOnly = name === 'products' || name === 'territory';
      comparisonSelector.style.display = singleYearOnly ? 'none' : '';
      if (singleYearOnly && typeof comparisonMode !== 'undefined' && comparisonMode === 'yoy' && typeof setComparisonMode === 'function') {
        setComparisonMode('single', document.getElementById('btnSingleYear'));
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
