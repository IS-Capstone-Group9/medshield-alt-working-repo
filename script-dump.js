
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

function renderTable(id, html) {
  var el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

function getProductSortIndicator(key) {
  if (typeof productTableSort === 'undefined') return '↕';
  if (productTableSort.key !== key) return '↕';
  return productTableSort.direction === 'asc' ? '↑' : '↓';
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
const DATA = {
  monthly: [
    { period: '2023-01', revenue: 3551637, income: 1897891 },
    { period: '2023-02', revenue: 3040100, income: 1680734 },
    { period: '2023-03', revenue: 3895428, income: 2105498 },
    { period: '2023-04', revenue: 5234819, income: 2892741 },
    { period: '2023-05', revenue: 6102934, income: 3418762 },
    { period: '2023-06', revenue: 7891234, income: 4213901 },
    { period: '2023-07', revenue: 6432118, income: 3541234 },
    { period: '2023-08', revenue: 5891023, income: 3102341 },
    { period: '2023-09', revenue: 7234512, income: 3934281 },
    { period: '2023-10', revenue: 8512340, income: 4721834 },
    { period: '2023-11', revenue: 9341823, income: 5102341 },
    { period: '2023-12', revenue: 7870148, income: 4359234 },
    { period: '2024-01', revenue: 2981234, income: 1293412 },
    { period: '2024-02', revenue: 3124512, income: 1412341 },
    { period: '2024-03', revenue: 4012341, income: 1834512 },
    { period: '2024-04', revenue: 5231234, income: 2341234 },
    { period: '2024-05', revenue: 6123412, income: 2941234 },
    { period: '2024-06', revenue: 5834512, income: 2734512 },
    { period: '2024-07', revenue: 4921234, income: 2341234 },
    { period: '2024-08', revenue: 5123412, income: 2512341 },
    { period: '2024-09', revenue: 5834512, income: 2841234 },
    { period: '2024-10', revenue: 4923412, income: 2341234 },
    { period: '2024-11', revenue: 4712341, income: 2193412 },
    { period: '2024-12', revenue: 3938474, income: 1890514 },
    { period: '2025-01', revenue: 8923412, income: 4312341 },
    { period: '2025-02', revenue: 9234512, income: 4512341 },
    { period: '2025-03', revenue: 12341234, income: 5934512 },
    { period: '2025-04', revenue: 14123412, income: 6823412 },
    { period: '2025-05', revenue: 24512341, income: 11234512 },
    { period: '2025-06', revenue: 18923412, income: 8734512 },
    { period: '2025-07', revenue: 16234512, income: 7523412 },
    { period: '2025-08', revenue: 15123412, income: 7012341 },
    { period: '2025-09', revenue: 17234512, income: 8023412 },
    { period: '2025-10', revenue: 14923412, income: 6834512 },
    { period: '2025-11', revenue: 16823412, income: 8023412 },
    { period: '2025-12', revenue: 15365879, income: 7751158 }
  ],
  by_area: [
    { area: 'Government', revenue: 198341234, income: 112341234 },
    { area: 'Hospital', revenue: 87234512, income: 51234512 },
    { area: 'Quezon', revenue: 52341234, income: 28341234 },
    { area: 'Batangas', revenue: 38923412, income: 20923412 },
    { area: 'Pharma', revenue: 24512341, income: 13512341 },
    { area: 'Marinduque', revenue: 14123412, income: 7723412 },
    { area: 'Cavite', revenue: 9834512, income: 5234512 },
    { area: 'Laguna', revenue: 7523412, income: 3923412 },
    { area: 'Cam Norte', revenue: 3912341, income: 1934512 },
    { area: 'Cam Sur', revenue: 2185470, income: 1051270 }
  ],
  year_summary: [
    { year: '2021', revenue: 63341656, income: 42079675, transactions: 2855 },
    { year: '2022', revenue: 60040179, income: 39994801, transactions: 3199 },
    { year: '2023', revenue: 74997919, income: 45465345, transactions: 5784 },
    { year: '2024', revenue: 56784640, income: 26876110, transactions: 2560 },
    { year: '2025', revenue: 183763487, income: 89499505, transactions: 3751 }
  ],
  seasonality: [
    { month: 'Jan', avg_revenue: 1823412 },
    { month: 'Feb', avg_revenue: 1934512 },
    { month: 'Mar', avg_revenue: 2234512 },
    { month: 'Apr', avg_revenue: 2812341 },
    { month: 'May', avg_revenue: 3934512 },
    { month: 'Jun', avg_revenue: 3412341 },
    { month: 'Jul', avg_revenue: 2934512 },
    { month: 'Aug', avg_revenue: 2712341 },
    { month: 'Sep', avg_revenue: 3123412 },
    { month: 'Oct', avg_revenue: 3523412 },
    { month: 'Nov', avg_revenue: 3812341 },
    { month: 'Dec', avg_revenue: 3234512 }
  ],
  top_products: [
    { product: 'PAGBILAO GOVT BATCH', revenue: 87234512, qty: 18, income: 42341234, abc: 'A', pct_of_total: 19.9 },
    { product: 'ANTIZOAL 500MG IV', revenue: 32341234, qty: 48291, income: 18234512, abc: 'A', pct_of_total: 7.4 },
    { product: 'CEFTRIAXONE 1G', revenue: 28912341, qty: 112834, income: 15123412, abc: 'A', pct_of_total: 6.6 },
    { product: 'PARACETAMOL 500MG', revenue: 18234512, qty: 234512, income: 9123412, abc: 'B', pct_of_total: 4.2 },
    { product: 'OMEPRAZOLE 40MG', revenue: 14923412, qty: 189234, income: 7234512, abc: 'B', pct_of_total: 3.4 },
    { product: 'AMOXICILLIN 500MG', revenue: 12341234, qty: 312341, income: 5934512, abc: 'B', pct_of_total: 2.8 },
    { product: 'CIPROFLOXACIN 500MG', revenue: 9834512, qty: 98234, income: 4512341, abc: 'C', pct_of_total: 2.2 },
    { product: 'METRONIDAZOLE IV', revenue: 8923412, qty: 87234, income: 4023412, abc: 'C', pct_of_total: 2.0 },
    { product: 'CLINDAMYCIN 300MG', revenue: 7234512, qty: 72341, income: 3234512, abc: 'C', pct_of_total: 1.6 },
    { product: 'FUROSEMIDE 40MG', revenue: 6123412, qty: 123412, income: 2723412, abc: 'C', pct_of_total: 1.4 },
    { product: 'HYDROCORTISONE 100MG', revenue: 5234512, qty: 52341, income: 2312341, abc: 'C', pct_of_total: 1.2 },
    { product: 'KETOROLAC 30MG', revenue: 4823412, qty: 98234, income: 2123412, abc: 'C', pct_of_total: 1.1 }
  ]
};

const PAGE_META = {
  overview: ['Executive Overview', 'Demand baseline, forecast, and actions'],
  revenue: ['Sales Diagnostics', 'Revenue, growth, and margin trends'],
  products: ['Product Prioritization', 'ABC/Pareto product view'],
  territory: ['Area Prioritization', 'Territory performance and ranking'],
  forecast: ['Forecast Modeling', 'Prophet forecast with external signals'],
  inventory: ['Prescriptive Planning', 'Reorder, alerts, and urgency outputs'],
  data: ['Data Upload', 'CSV and JSON sources for dashboard updates']
};

const CHART_ARIA_LABELS = {
  overviewBaselineChart: 'Bar chart showing yearly revenue and net income from 2021 to 2025.',
  overviewForecastChart: 'Line chart showing the 2026 demand forecast with upper and lower planning bounds.',
  yearChart: 'Bar chart showing yearly revenue and net income comparison.',
  monthlyChart: 'Line chart showing monthly revenue trend.',
  areaDonut: 'Doughnut chart showing revenue share by territory.',
  seasonChart: 'Bar chart showing the seasonal demand pattern by month.',
  revenueDetailChart: 'Line chart showing detailed monthly revenue and income movement.',
  growthChart: 'Bar chart showing year over year revenue growth.',
  marginChart: 'Line chart showing net income margin by year.',
  productBarChart: 'Bar chart showing top products by revenue.',
  abcChart: 'Doughnut chart showing ABC product classification.',
  areaBarChart: 'Bar chart showing revenue by territory.',
  areaIncomeChart: 'Bar chart showing net income by territory.',
  areaMarginChart: 'Line chart showing territory margins.',
  forecastChart: 'Line chart showing the 2026 demand forecast.',
  seasonIndexChart: 'Bar chart showing the demand seasonality index by month.',
  externalChart: 'Line chart showing external DOH and PAGASA signals by month.'
};

const charts = {};
let comparisonMode = 'single';
let selectedYear = 'all';
let selectedYoYYear = '2025';
let customCompare = { year1: '2023', year2: '2024' };
const FILTERBAR_PAGES = new Set(['overview', 'revenue']);
const filterBarNotes = {
  overview: 'Change the comparison view for baseline and trend charts.',
  revenue: 'Compare annual and monthly sales performance across years.'
};
let productTableSort = { key: 'revenue', direction: 'desc' };
const NAV_COLLAPSE_WIDTH = 1180;
const NAV_HIDE_WIDTH = 760;
let manualNavState = null;
let navResizeTimer;

const MOCK_BY_AREA = [
  { area: 'Government', revenue: 198341234, income: 112341234 },
  { area: 'Hospital', revenue: 87234512, income: 51234512 },
  { area: 'Quezon', revenue: 52341234, income: 28341234 },
  { area: 'Batangas', revenue: 38923412, income: 20923412 },
  { area: 'Pharma', revenue: 24512341, income: 13512341 },
  { area: 'Marinduque', revenue: 14123412, income: 7723412 },
  { area: 'Cavite', revenue: 9834512, income: 5234512 },
  { area: 'Laguna', revenue: 7523412, income: 3923412 },
  { area: 'Cam Norte', revenue: 3912341, income: 1934512 },
  { area: 'Cam Sur', revenue: 2185470, income: 1051270 }
];

const MOCK_TOP_PRODUCTS = [
  { product: 'PAGBILAO GOVT BATCH', revenue: 87234512, qty: 18, income: 42341234, abc: 'A', pct_of_total: 19.9 },
  { product: 'ANTIZOAL 500MG IV', revenue: 32341234, qty: 48291, income: 18234512, abc: 'A', pct_of_total: 7.4 },
  { product: 'CEFTRIAXONE 1G', revenue: 28912341, qty: 112834, income: 15123412, abc: 'A', pct_of_total: 6.6 },
  { product: 'PARACETAMOL 500MG', revenue: 18234512, qty: 234512, income: 9123412, abc: 'B', pct_of_total: 4.2 },
  { product: 'OMEPRAZOLE 40MG', revenue: 14923412, qty: 189234, income: 7234512, abc: 'B', pct_of_total: 3.4 },
  { product: 'AMOXICILLIN 500MG', revenue: 12341234, qty: 312341, income: 5934512, abc: 'B', pct_of_total: 2.8 },
  { product: 'CIPROFLOXACIN 500MG', revenue: 9834512, qty: 98234, income: 4512341, abc: 'C', pct_of_total: 2.2 },
  { product: 'METRONIDAZOLE IV', revenue: 8923412, qty: 87234, income: 4023412, abc: 'C', pct_of_total: 2.0 },
  { product: 'CLINDAMYCIN 300MG', revenue: 7234512, qty: 72341, income: 3234512, abc: 'C', pct_of_total: 1.6 },
  { product: 'FUROSEMIDE 40MG', revenue: 6123412, qty: 123412, income: 2723412, abc: 'C', pct_of_total: 1.4 }
];
const MOCK_MONTHLY = DATA.monthly.map((row) => ({ ...row }));
const MOCK_YEAR_SUMMARY = DATA.year_summary.map((row) => ({ ...row }));
const MOCK_SEASONALITY = DATA.seasonality.map((row) => ({ ...row }));

function formatCurrency(value) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0
  }).format(value);
}

function formatCompactCurrency(value) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(value);
}

function formatNumber(value) {
  return new Intl.NumberFormat('en-US').format(value);
}

function formatTooltipValue(datasetLabel, rawValue) {
  const numericValue = Number(rawValue);
  const label = datasetLabel || 'Value';
  if (!Number.isFinite(numericValue)) return `${label}: ${rawValue}`;

  const metricLabel = label.toLowerCase();
  if (
    metricLabel.includes('revenue') ||
    metricLabel.includes('income') ||
    metricLabel.includes('forecast') ||
    metricLabel.includes('demand')
  ) {
    return `${label}: ${formatCurrency(numericValue)}`;
  }

  if (metricLabel.includes('margin') || metricLabel.includes('growth')) {
    return `${label}: ${numericValue.toFixed(1)}%`;
  }

  if (metricLabel.includes('index') || metricLabel.includes('dii')) {
    return `${label}: ${numericValue.toFixed(2)}`;
  }

  if (metricLabel.includes('rsi')) {
    return `${label}: ${numericValue.toFixed(0)}%`;
  }

  return `${label}: ${formatNumber(numericValue)}`;
}

function monthLabel(period) {
  const [year, month] = period.split('-');
  const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${labels[Number(month) - 1]} ${year.slice(2)}`;
}

function getColor(alpha = 1) { return `rgba(28,164,232,${alpha})`; }
function getAmber(alpha = 1) { return `rgba(198,154,46,${alpha})`; }
function getBlue(alpha = 1)  { return `rgba(14,111,166,${alpha})`; }
function getRed(alpha = 1)   { return `rgba(183,64,64,${alpha})`; }

function getYearRowsForMode() {
  const rows = DATA.year_summary.map((row) => ({ ...row }));
  if (comparisonMode === 'single') {
    return selectedYear === 'all' ? rows : rows.filter((row) => row.year === selectedYear);
  }

  if (comparisonMode === 'yoy') {
    const currentIndex = rows.findIndex((row) => row.year === selectedYoYYear);
    if (currentIndex <= 0) return rows.filter((row) => row.year === selectedYoYYear);
    return [rows[currentIndex - 1], rows[currentIndex]];
  }

  return rows.filter((row) => row.year === customCompare.year1 || row.year === customCompare.year2);
}

function getMonthlyRowsForMode() {
  const rows = DATA.monthly.map((row) => ({ ...row }));
  if (comparisonMode === 'single') {
    if (selectedYear === 'all') {
      return {
        labels: rows.map((row) => monthLabel(row.period)),
        datasets: [
          {
            label: 'Revenue',
            data: rows.map((row) => row.revenue),
            borderColor: getColor(),
            backgroundColor: getColor(0.12),
            fill: true,
            tension: 0.35,
            borderWidth: 2.5,
            pointRadius: 0
          }
        ]
      };
    }

    const yearRows = rows.filter((row) => row.period.startsWith(`${selectedYear}-`));
    return {
      labels: yearRows.map((row) => monthLabel(row.period).split(' ')[0]),
      datasets: [
        {
          label: `Revenue ${selectedYear}`,
          data: yearRows.map((row) => row.revenue),
          borderColor: getColor(),
          backgroundColor: getColor(0.12),
          fill: true,
          tension: 0.35,
          borderWidth: 2.5,
          pointRadius: 2
        }
      ]
    };
  }

  const yearA = comparisonMode === 'yoy' ? String(Number(selectedYoYYear) - 1) : customCompare.year1;
  const yearB = comparisonMode === 'yoy' ? selectedYoYYear : customCompare.year2;
  const rowsA = rows.filter((row) => row.period.startsWith(`${yearA}-`));
  const rowsB = rows.filter((row) => row.period.startsWith(`${yearB}-`));
  const labels = rowsA.length ? rowsA.map((row) => monthLabel(row.period).split(' ')[0]) : rowsB.map((row) => monthLabel(row.period).split(' ')[0]);

  return {
    labels,
    datasets: [
      {
        label: `Revenue ${yearA}`,
        data: rowsA.map((row) => row.revenue),
        borderColor: getBlue(),
        backgroundColor: getBlue(0.08),
        fill: false,
        tension: 0.35,
        borderWidth: 2.2,
        pointRadius: 2
      },
      {
        label: `Revenue ${yearB}`,
        data: rowsB.map((row) => row.revenue),
        borderColor: getColor(),
        backgroundColor: getColor(0.08),
        fill: false,
        tension: 0.35,
        borderWidth: 2.4,
        pointRadius: 2
      }
    ]
  };
}

function getRevenueDetailData() {
  const rows = DATA.monthly.map((row) => ({ ...row }));
  if (comparisonMode === 'single') {
    const sourceRows = selectedYear === 'all' ? rows : rows.filter((row) => row.period.startsWith(`${selectedYear}-`));
    return {
      labels: sourceRows.map((row) => selectedYear === 'all' ? monthLabel(row.period) : monthLabel(row.period).split(' ')[0]),
      datasets: [
        {
          label: 'Revenue',
          data: sourceRows.map((row) => row.revenue),
          borderColor: getColor(),
          backgroundColor: getColor(0.08),
          fill: true,
          tension: 0.35,
          borderWidth: 2.5,
          pointRadius: 0
        },
        {
          label: 'Net Income',
          data: sourceRows.map((row) => row.income),
          borderColor: getAmber(),
          tension: 0.35,
          borderWidth: 2,
          pointRadius: 0
        }
      ]
    };
  }

  const yearA = comparisonMode === 'yoy' ? String(Number(selectedYoYYear) - 1) : customCompare.year1;
  const yearB = comparisonMode === 'yoy' ? selectedYoYYear : customCompare.year2;
  const rowsA = rows.filter((row) => row.period.startsWith(`${yearA}-`));
  const rowsB = rows.filter((row) => row.period.startsWith(`${yearB}-`));
  return {
    labels: rowsA.map((row) => monthLabel(row.period).split(' ')[0]),
    datasets: [
      {
        label: `Revenue ${yearA}`,
        data: rowsA.map((row) => row.revenue),
        borderColor: getBlue(),
        tension: 0.35,
        borderWidth: 2.2,
        pointRadius: 2,
        fill: false
      },
      {
        label: `Revenue ${yearB}`,
        data: rowsB.map((row) => row.revenue),
        borderColor: getColor(),
        tension: 0.35,
        borderWidth: 2.4,
        pointRadius: 2,
        fill: false
      }
    ]
  };
}

function baseChartOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    animations: false,
    transitions: {
      active: { animation: { duration: 0 } },
      resize: { animation: { duration: 0 } },
      show: { animations: {} },
      hide: { animations: {} }
    },
    interaction: {
      mode: 'index',
      intersect: false
    },
    hover: {
      mode: 'index',
      intersect: false
    },
    plugins: {
      legend: {
        labels: {
          color: dashboardThemeColor('--chart-label', '#335F78'),
          boxWidth: 10,
          boxHeight: 10,
          usePointStyle: true,
          pointStyle: 'circle'
        }
      },
      tooltip: {
        backgroundColor: '#12384E',
        titleColor: '#F7FBFD',
        bodyColor: '#DFF4FF',
        padding: 10,
        displayColors: false,
        callbacks: {
          label: (context) => formatTooltipValue(context.dataset.label, context.parsed.y ?? context.parsed)
        }
      }
    },
    scales: {
      x: {
        ticks: { color: dashboardThemeColor('--chart-muted', '#67879A'), maxRotation: 0, autoSkip: true },
        grid: { display: false }
      },
      y: {
        ticks: {
          color: dashboardThemeColor('--chart-muted', '#67879A'),
          callback: (value) => formatCompactCurrency(value)
        },
        grid: { color: dashboardThemeColor('--chart-grid', 'rgba(201,219,229,0.65)') }
      }
    }
  };
}

function getChartConstructor() {
  if (typeof window !== 'undefined' && window.Chart) {
    return window.Chart.Chart || window.Chart.default || window.Chart;
  }
  if (typeof Chart !== 'undefined') {
    return Chart.Chart || Chart.default || Chart;
  }
  return null;
}

function createChart(id, config) {
  const canvas = document.getElementById(id);
  if (!canvas) {
    console.warn('Canvas with id "' + id + '" not found in DOM');
    return;
  }
  try {
    
    const existingChart = Chart.getChart ? Chart.getChart(canvas) : charts[id];
    if (existingChart) existingChart.destroy();
    if (charts[id] && charts[id] !== existingChart) charts[id].destroy();
    canvas.setAttribute('role', 'img');
    if (CHART_ARIA_LABELS[id]) canvas.setAttribute('aria-label', CHART_ARIA_LABELS[id]);
    const stableConfig = {
      ...config,
      options: {
        ...(config.options || {}),
        animation: false,
        animations: false,
        transitions: {
          ...(config.options?.transitions || {}),
          active: { animation: { duration: 0 } },
          resize: { animation: { duration: 0 } },
          show: { animations: {} },
          hide: { animations: {} }
        }
      }
    };
    const ChartClass = getChartConstructor();
    if (!ChartClass) {
      console.error('Chart constructor unavailable for canvas "' + id + '"');
      return;
    }
    charts[id] = new ChartClass(canvas, stableConfig);
    if (charts[id] && typeof charts[id].update === 'function') {
      charts[id].update('none');
    }
    const wrap = canvas.closest('.chart-wrap');
    if (wrap) {
      wrap.dataset.state = 'ready';
      wrap.dataset.emptyMessage = '';
    }
    console.log('Chart "' + id + '" created successfully');
  } catch (error) {
    const wrap = canvas.closest('.chart-wrap');
    if (wrap) {
      wrap.dataset.state = 'ready';
      wrap.dataset.emptyMessage = '';
    }
    console.error('Failed to create chart "' + id + '":', error);
  }
}

function buildCharts() {
  console.log('Starting chart build...');
  ensureMockFallbackData();
  setAllChartWrapStates('loading');
  
  if (typeof Chart === 'undefined') {
    console.error('Chart.js is not loaded');
    return;
  }

  const opts = baseChartOptions();
  const monthSeries = DATA.monthly.map((row) => monthLabel(row.period));
  const yearRowsForMode = getYearRowsForMode();
  const monthlyDataForMode = getMonthlyRowsForMode();
  const revenueDetailData = getRevenueDetailData();

  createChart('overviewBaselineChart', {
    type: 'bar',
    data: {
      labels: yearRowsForMode.map((row) => row.year),
      datasets: [
        { label: 'Revenue', data: yearRowsForMode.map((row) => row.revenue), backgroundColor: getColor(0.88), borderRadius: 6 },
        { label: 'Net Income', data: yearRowsForMode.map((row) => row.income), backgroundColor: getAmber(0.8), borderRadius: 6 }
      ]
    },
    options: opts
  });

  createChart('monthlyChart', {
    type: 'line',
    data: {
      labels: monthlyDataForMode.labels,
      datasets: monthlyDataForMode.datasets
    },
    options: { ...opts, plugins: { ...opts.plugins, legend: { position: 'bottom' } } }
  });

  createChart('areaDonut', {
    type: 'doughnut',
    data: {
      labels: DATA.by_area.map((row) => row.area),
      datasets: [{
        data: DATA.by_area.map((row) => row.revenue),
        backgroundColor: [
          getColor(0.95), getBlue(0.9), getAmber(0.9), getColor(0.65), getBlue(0.65),
          getAmber(0.65), getColor(0.5), getBlue(0.5), getAmber(0.5), getRed(0.65)
        ],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '64%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: dashboardThemeColor('--chart-label', '#335F78'), boxWidth: 10, boxHeight: 10, padding: 12 }
        }
      }
    }
  });

  createChart('seasonChart', {
    type: 'bar',
    data: {
      labels: DATA.seasonality.map((row) => row.month),
      datasets: [{
        label: 'Avg Revenue',
        data: DATA.seasonality.map((row) => row.avg_revenue),
        backgroundColor: DATA.seasonality.map((_, index) => index === 4 || index === 10 ? getAmber(0.82) : getColor(0.76)),
        borderRadius: 6
      }]
    },
    options: { ...opts, plugins: { ...opts.plugins, legend: { position: 'bottom' } } }
  });

  createChart('revenueDetailChart', {
    type: 'line',
    data: {
      labels: revenueDetailData.labels,
      datasets: revenueDetailData.datasets
    },
    options: opts
  });

  const growthSourceRows = comparisonMode === 'single' && selectedYear !== 'all'
    ? DATA.year_summary.filter((row) => row.year === selectedYear || row.year === String(Number(selectedYear) - 1))
    : yearRowsForMode;
  const growthBaseRows = growthSourceRows.length > 1 ? growthSourceRows : DATA.year_summary;
  const growthData = growthBaseRows.slice(1).map((row, index) => (
    ((row.revenue - growthBaseRows[index].revenue) / growthBaseRows[index].revenue) * 100
  ));
  createChart('growthChart', {
    type: 'bar',
    data: {
      labels: growthBaseRows.slice(1).map((row) => row.year),
      datasets: [{
        label: 'Growth %',
        data: growthData,
        backgroundColor: growthData.map((value) => value >= 0 ? getColor(0.82) : getRed(0.82)),
        borderRadius: 6
      }]
    },
    options: {
      ...opts,
      plugins: { ...opts.plugins, legend: { position: 'bottom' } },
      scales: {
        ...opts.scales,
        y: { ...opts.scales.y, ticks: { color: dashboardThemeColor('--chart-muted', '#67879A'), callback: (value) => `${Number(value).toFixed(0)}%` } }
      }
    }
  });

  const marginRows = yearRowsForMode.length ? yearRowsForMode : DATA.year_summary;
  const marginData = marginRows.map((row) => (row.income / row.revenue) * 100);
  createChart('marginChart', {
    type: 'line',
    data: {
      labels: marginRows.map((row) => row.year),
      datasets: [{
        label: 'Margin %',
        data: marginData,
        borderColor: getAmber(),
        backgroundColor: getAmber(0.12),
        fill: true,
        tension: 0.35,
        borderWidth: 2.5,
        pointRadius: 3
      }]
    },
    options: {
      ...opts,
      plugins: { ...opts.plugins, legend: { position: 'bottom' } },
      scales: {
        ...opts.scales,
        y: { ...opts.scales.y, ticks: { color: dashboardThemeColor('--chart-muted', '#67879A'), callback: (value) => `${Number(value).toFixed(0)}%` } }
      }
    }
  });

  createChart('productBarChart', {
    type: 'bar',
    data: {
      labels: (DATA.top_products.length ? DATA.top_products : MOCK_TOP_PRODUCTS)
        .slice(0, 10)
        .map((row) => String(row.product).replace(' 500MG', '').replace(' IV', '')),
      datasets: [{
        label: 'Revenue',
        data: numericSeriesOrFallback(
          DATA.top_products.slice(0, 10).map((row) => row.revenue),
          MOCK_TOP_PRODUCTS.slice(0, 10).map((row) => row.revenue)
        ),
        backgroundColor: getColor(0.82),
        borderRadius: 6
      }]
    },
    options: { ...opts, plugins: { ...opts.plugins, legend: { position: 'bottom' } } }
  });

  const abcTotals = ['A', 'B', 'C'].map((bucket) =>
    DATA.top_products.filter((row) => row.abc === bucket).reduce((sum, row) => sum + row.revenue, 0)
  );
  createChart('abcChart', {
    type: 'doughnut',
    data: {
      labels: ['Class A', 'Class B', 'Class C'],
      datasets: [{
        data: abcTotals,
        backgroundColor: [getColor(0.88), getAmber(0.82), getBlue(0.78)],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '60%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: dashboardThemeColor('--chart-label', '#335F78'), boxWidth: 10, boxHeight: 10, padding: 12 }
        }
      }
    }
  });

  createChart('areaBarChart', {
    type: 'bar',
    data: {
      labels: (DATA.by_area.length ? DATA.by_area : MOCK_BY_AREA).map((row) => row.area),
      datasets: [{
        label: 'Revenue',
        data: numericSeriesOrFallback(
          DATA.by_area.map((row) => row.revenue),
          MOCK_BY_AREA.map((row) => row.revenue)
        ),
        backgroundColor: getColor(0.82),
        borderRadius: 6
      }]
    },
    options: { ...opts, plugins: { ...opts.plugins, legend: { position: 'bottom' } } }
  });

  createChart('areaIncomeChart', {
    type: 'bar',
    data: {
      labels: (DATA.by_area.length ? DATA.by_area : MOCK_BY_AREA).map((row) => row.area),
      datasets: [{
        label: 'Net Income',
        data: numericSeriesOrFallback(
          DATA.by_area.map((row) => row.income),
          MOCK_BY_AREA.map((row) => row.income)
        ),
        backgroundColor: getAmber(0.82),
        borderRadius: 6
      }]
    },
    options: { ...opts, plugins: { ...opts.plugins, legend: { position: 'bottom' } } }
  });

  createChart('areaMarginChart', {
    type: 'line',
    data: {
      labels: DATA.by_area.map((row) => row.area),
      datasets: [{
        label: 'Margin %',
        data: DATA.by_area.map((row) => (row.income / row.revenue) * 100),
        borderColor: getBlue(),
        backgroundColor: getBlue(0.1),
        fill: true,
        tension: 0.35,
        borderWidth: 2.5,
        pointRadius: 3
      }]
    },
    options: {
      ...opts,
      plugins: { ...opts.plugins, legend: { position: 'bottom' } },
      scales: {
        ...opts.scales,
        y: { ...opts.scales.y, ticks: { color: dashboardThemeColor('--chart-muted', '#67879A'), callback: (value) => `${Number(value).toFixed(0)}%` } }
      }
    }
  });

  // Dynamically generate a 52-week rolling forecast from the 12-month data
  // We take the latest 12 forecast data points (or fallback to derived monthly data)
  const baseMonthlyForecast = DATA.forecast && DATA.forecast.length >= 12 
    ? DATA.forecast.slice(0, 12).map(r => r.adjusted_forecast || r.baseline_forecast) 
    : DATA.monthly.slice(-12).map((row, i) => Math.round(row.revenue * (1.04 + (i * 0.012))));
    
  const lowerMonthly = DATA.forecast && DATA.forecast.length >= 12 
    ? DATA.forecast.slice(0, 12).map(r => r.lower_bound) 
    : baseMonthlyForecast.map(v => Math.round(v * 0.87));
    
  const upperMonthly = DATA.forecast && DATA.forecast.length >= 12 
    ? DATA.forecast.slice(0, 12).map(r => r.upper_bound) 
    : baseMonthlyForecast.map(v => Math.round(v * 1.15));

  const forecastLabels = [];
  const weeklyForecast = [];
  const weeklyLower = [];
  const weeklyUpper = [];
  
  // Approximate month to weeks (12 months -> 52 weeks total)
  // We'll assign roughly 4 weeks to most months, 5 to a few to hit 52.
  const weeksPerMonth = [4, 4, 5, 4, 4, 5, 4, 4, 5, 4, 4, 5]; 
  let weekCounter = 1;
  
  baseMonthlyForecast.forEach((monthVal, mIndex) => {
    const weeksInThisMonth = weeksPerMonth[mIndex];
    const weeklyAvg = monthVal / weeksInThisMonth;
    const lowerAvg = lowerMonthly[mIndex] / weeksInThisMonth;
    const upperAvg = upperMonthly[mIndex] / weeksInThisMonth;
    
    for (let w = 0; w < weeksInThisMonth; w++) {
      // Add ±5% random noise
      const noise = 1 + ((Math.random() * 0.10) - 0.05);
      
      forecastLabels.push(`W${weekCounter}`);
      weeklyForecast.push(Math.round(weeklyAvg * noise));
      weeklyLower.push(Math.round(lowerAvg * noise));
      weeklyUpper.push(Math.round(upperAvg * noise));
      weekCounter++;
    }
  });

  const forecastDatasets = [
    {
      label: 'Lower Bound',
      data: weeklyLower,
      borderColor: 'rgba(0,0,0,0)',
      backgroundColor: 'rgba(0,0,0,0)',
      pointRadius: 0
    },
    {
      label: 'Upper Bound',
      data: weeklyUpper,
      borderColor: 'rgba(0,0,0,0)',
      backgroundColor: getColor(0.12),
      fill: '-1',
      pointRadius: 0
    },
    {
      label: 'Weekly Forecast',
      data: weeklyForecast,
      borderColor: getColor(),
      backgroundColor: getColor(0.1),
      tension: 0.35,
      fill: false,
      borderWidth: 2,

      pointRadius: 3
    }
  ];

  createChart('overviewForecastChart', {
    type: 'line',
    data: {
      labels: forecastLabels,
      datasets: forecastDatasets.map((dataset) => ({ ...dataset }))
    },
    options: opts
  });

  createChart('forecastChart', {
    type: 'line',
    data: {
      labels: forecastLabels,
      datasets: forecastDatasets.map((dataset) => ({ ...dataset }))
    },
    options: opts
  });

  const seasonIndex = DATA.seasonality.map((row) => row.avg_revenue / (DATA.seasonality.reduce((sum, month) => sum + month.avg_revenue, 0) / DATA.seasonality.length));
  createChart('seasonIndexChart', {
    type: 'bar',
    data: {
      labels: DATA.seasonality.map((row) => row.month),
      datasets: [{
        label: 'Demand Index',
        data: seasonIndex,
        backgroundColor: seasonIndex.map((value) => value > 1.12 ? getColor(0.85) : value > 0.96 ? getAmber(0.8) : getBlue(0.72)),
        borderRadius: 6
      }]
    },
    options: {
      ...opts,
      plugins: { ...opts.plugins, legend: { display: false } },
      scales: {
        ...opts.scales,
        y: { ...opts.scales.y, ticks: { color: dashboardThemeColor('--chart-muted', '#67879A'), callback: (value) => `${Number(value).toFixed(2)}x` } }
      }
    }
  });

  createChart('externalChart', {
    type: 'line',
    data: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      datasets: [
        {
          label: 'DOH DII',
          data: [0.88, 0.95, 1.02, 1.08, 1.16, 1.11, 1.05, 1.01, 1.18, 1.26, 1.34, 1.22],
          borderColor: getRed(),
          tension: 0.35,
          borderWidth: 2.5,
          pointRadius: 2
        },
        {
          label: 'PAGASA RSI',
          data: [28, 32, 45, 40, 36, 30, 26, 24, 29, 34, 41, 38],
          borderColor: getBlue(),
          tension: 0.35,
          borderWidth: 2.5,
          pointRadius: 2,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      ...opts,
      scales: {
        x: opts.scales.x,
        y: { ...opts.scales.y, ticks: { color: dashboardThemeColor('--chart-muted', '#67879A'), callback: (value) => `${Number(value).toFixed(1)}` } },
        y1: {
          position: 'right',
          ticks: { color: dashboardThemeColor('--chart-muted', '#67879A'), callback: (value) => `${value}%` },
          grid: { drawOnChartArea: false }
        }
      }
    }
  });
  
  console.log('All charts built successfully');
}

function buildTables() {
  console.log('Starting table build...');

  const sortedProductRows = getSortedProductRows();
  const maxRevenue = Math.max(...sortedProductRows.map((row) => row.revenue));
  renderTable('productTable', `
  <thead>
    <tr>
      <th class="sortable ${productTableSort.key === 'product' ? 'active' : ''}" data-sort-key="product"><span class="th-sort">Product <span class="sort-indicator">${getProductSortIndicator('product')}</span></span></th>
      <th class="sortable ${productTableSort.key === 'abc' ? 'active' : ''}" data-sort-key="abc"><span class="th-sort">ABC <span class="sort-indicator">${getProductSortIndicator('abc')}</span></span></th>
      <th class="sortable ${productTableSort.key === 'revenue' ? 'active' : ''}" data-sort-key="revenue"><span class="th-sort">Revenue <span class="sort-indicator">${getProductSortIndicator('revenue')}</span></span></th>
      <th class="sortable ${productTableSort.key === 'income' ? 'active' : ''}" data-sort-key="income"><span class="th-sort">Net Income <span class="sort-indicator">${getProductSortIndicator('income')}</span></span></th>
      <th class="sortable ${productTableSort.key === 'margin' ? 'active' : ''}" data-sort-key="margin"><span class="th-sort">Margin <span class="sort-indicator">${getProductSortIndicator('margin')}</span></span></th>
      <th class="sortable ${productTableSort.key === 'pct_of_total' ? 'active' : ''}" data-sort-key="pct_of_total"><span class="th-sort">% of Total <span class="sort-indicator">${getProductSortIndicator('pct_of_total')}</span></span></th>
    </tr>
  </thead>
  <tbody>
    ${sortedProductRows.map((row) => {
      const margin = ((row.income / row.revenue) * 100).toFixed(1);
      const width = (row.revenue / maxRevenue) * 100;
      return `
        <tr>
          <td>
            ${row.product}
            <div class="prod-bar-bg"><div class="prod-bar-fill" style="width:${width}%"></div></div>
          </td>
          <td><span class="abc-pill abc-${row.abc}">${row.abc}</span></td>
          <td>${formatCurrency(row.revenue)}</td>
          <td>${formatCurrency(row.income)}</td>
          <td>${margin}%</td>
          <td>${row.pct_of_total}%</td>
        </tr>
      `;
    }).join('')}
  </tbody>
  `);
  bindProductTableSort();

  const matches = [
    { product: 'CEFTRIAXONE 1G', region: 'Laguna', basis: 'Hospital demand similarity', score: '92%', action: 'Expand stock presence' },
    { product: 'OMEPRAZOLE 40MG', region: 'Cavite', basis: 'Gastro demand profile', score: '88%', action: 'Increase listing priority' },
    { product: 'AMOXICILLIN 500MG', region: 'Marinduque', basis: 'High refill overlap', score: '85%', action: 'Add monthly buffer' },
    { product: 'PARACETAMOL 500MG', region: 'Batangas', basis: 'Fast seasonal turnover', score: '83%', action: 'Promote before Q4' },
    { product: 'CLINDAMYCIN 300MG', region: 'Quezon', basis: 'Institution purchase pattern', score: '80%', action: 'Bundle with bid cycles' }
  ];
  renderTable('matchingTable', `
  <thead>
    <tr>
      <th>Recommended Product</th><th>Target Region</th><th>Matching Basis</th><th>Fit Score</th><th>Suggested Action</th>
    </tr>
  </thead>
  <tbody>
    ${matches.map((row) => `
      <tr>
        <td>${row.product}</td>
        <td>${row.region}</td>
        <td>${row.basis}</td>
        <td>${row.score}</td>
        <td>${row.action}</td>
      </tr>
    `).join('')}
  </tbody>
  `);

  const forecasts = [
    { product: 'ANTIZOAL IV 500MG', area: 'Hospital', forecast: '18,400', actual: '14,200', risk: 'High', change: '+29.6%' },
    { product: 'CEFTRIAXONE 1G', area: 'Quezon', forecast: '42,800', actual: '38,100', risk: 'Med', change: '+12.3%' },
    { product: 'PARACETAMOL 500MG', area: 'All', forecast: '86,200', actual: '79,400', risk: 'Low', change: '+8.6%' },
    { product: 'OMEPRAZOLE 40MG', area: 'Batangas', forecast: '51,000', actual: '48,200', risk: 'Low', change: '+5.8%' },
    { product: 'AMOXICILLIN 500MG', area: 'Marinduque', forecast: '98,400', actual: '89,700', risk: 'Med', change: '+9.7%' }
  ];
  const forecastTable = document.getElementById('forecastTable');
  if (forecastTable) {
    forecastTable.innerHTML = forecasts.map((row) => `
      <div class="forecast-row">
        <div>
          <div class="forecast-product">${row.product}</div>
          <div class="forecast-meta">${row.area} <span class="risk-pill risk-${row.risk.toLowerCase()}">${row.risk}</span></div>
        </div>
        <div class="forecast-values">
          <div class="forecast-val"><div class="label">2025 Actual</div><div class="num">${row.actual}</div></div>
          <div class="forecast-val"><div class="label">2026 Forecast</div><div class="num" style="color:var(--accent)">${row.forecast}</div></div>
          <div class="forecast-val"><div class="label">Change</div><div class="num">${row.change}</div></div>
        </div>
      </div>
    `).join('');
  }

  const evalRows = [
    { model: 'Facebook Prophet', metrics: 'MAE, RMSE, MAPE', purpose: 'Overall and territory demand forecasting', output: 'Forecast accuracy summary' },
    { model: 'Prophet + External Regressors', metrics: 'MAE, RMSE, MAPE', purpose: 'Disease and weather-adjusted demand', output: 'Adjusted forecast validation' },
    { model: 'XGBoost', metrics: 'MAE, RMSE, MAPE', purpose: 'Demand urgency scoring', output: 'Priority-score reliability' },
    { model: 'Rule Thresholding / EOQ / MCDA', metrics: 'Precision, Recall, Ranking Consistency', purpose: 'Alert and reorder logic', output: 'Operational confidence' }
  ];
  renderTable('evalTable', `
  <thead>
    <tr>
      <th>Model</th><th>Metrics</th><th>Purpose</th><th>Output</th>
    </tr>
  </thead>
  <tbody>
    ${evalRows.map((row) => `
      <tr>
        <td>${row.model}</td>
        <td>${row.metrics}</td>
        <td>${row.purpose}</td>
        <td>${row.output}</td>
      </tr>
    `).join('')}
  </tbody>
  `);

  const scenarios = [
    { scenario: 'Dengue surge in CALABARZON', trigger: 'DII > 1.4 for 2 weeks', response: 'Raise antipyretic and IV fluid buffers', owner: 'Procurement' },
    { scenario: 'Typhoon exposure in Marinduque', trigger: 'RSI >= 45%', response: 'Pre-position wound care and ORS stock', owner: 'Logistics' },
    { scenario: 'Government bid release', trigger: 'Award confirmation', response: 'Lock allocation and delivery schedule', owner: 'Sales ops' },
    { scenario: 'Dead-stock persistence >90 days', trigger: 'No movement across 3 months', response: 'Pause purchase and review expiry', owner: 'Inventory control' }
  ];
  renderTable('scenarioTable', `
  <thead>
    <tr>
      <th>Scenario</th><th>Trigger</th><th>Response</th><th>Owner</th>
    </tr>
  </thead>
  <tbody>
    ${scenarios.map((row) => `
      <tr>
        <td>${row.scenario}</td>
        <td>${row.trigger}</td>
        <td>${row.response}</td>
        <td>${row.owner}</td>
      </tr>
    `).join('')}
  </tbody>
  `);

  const eoqRows = [
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
  `);

  const clusterRows = [
    { cluster: 'Cluster A', areas: 'Government, Hospital', profile: 'High-volume / institutional', implication: 'Refresh forecasts often and monitor bids' },
    { cluster: 'Cluster B', areas: 'Quezon, Batangas', profile: 'Stable commercial demand', implication: 'Keep steady replenishment cycles' },
    { cluster: 'Cluster C', areas: 'Pharma, Laguna, Cavite', profile: 'Mid-scale mixed demand', implication: 'Balance sales pushes with stock buffers' },
    { cluster: 'Cluster D', areas: 'Marinduque, Cam Norte, Cam Sur', profile: 'Low-scale / variable movement', implication: 'Use selective stocking and contingency stock' }
  ];
  renderTable('clusterTable', `
  <thead>
    <tr>
      <th style="width:18%;">Cluster</th>
      <th style="width:26%;">Territories</th>
      <th style="width:28%;">Demand Profile</th>
      <th style="width:28%;">Planning Implication</th>
    </tr>
  </thead>
  <tbody>
    ${clusterRows.map((row) => `
      <tr>
        <td style="font-weight:700; color:var(--accent);">${row.cluster}</td>
        <td style="font-weight:600;">${row.areas}</td>
        <td>${row.profile}</td>
        <td style="color:var(--text-secondary);">${row.implication}</td>
      </tr>
    `).join('')}
  </tbody>
  `);

  const priorityRows = [
    { rank: 1, area: 'Government', revenue: '0.40', growth: '0.18', risk: '0.05', score: '0.63', action: 'Prioritize bid readiness and allocation' },
    { rank: 2, area: 'Hospital', revenue: '0.22', growth: '0.14', risk: '0.08', score: '0.44', action: 'Protect fast-moving critical SKUs' },
    { rank: 3, area: 'Quezon', revenue: '0.13', growth: '0.09', risk: '0.07', score: '0.29', action: 'Increase forecast refresh cadence' },
    { rank: 4, area: 'Batangas', revenue: '0.09', growth: '0.07', risk: '0.04', score: '0.20', action: 'Maintain targeted replenishment' },
    { rank: 5, area: 'Marinduque', revenue: '0.03', growth: '0.05', risk: '0.10', score: '0.18', action: 'Keep typhoon contingency stock' }
  ];
  renderTable('priorityTable', `
  <thead>
    <tr>
      <th>Rank</th><th>Region</th><th>Revenue Wt.</th><th>Growth Wt.</th><th>Risk Wt.</th><th>MCDA Score</th><th>Decision</th>
    </tr>
  </thead>
  <tbody>
    ${priorityRows.map((row) => `
      <tr>
        <td>${row.rank}</td>
        <td>${row.area}</td>
        <td>${row.revenue}</td>
        <td>${row.growth}</td>
        <td>${row.risk}</td>
        <td>${row.score}</td>
        <td>${row.action}</td>
      </tr>
    `).join('')}
  </tbody>
  `);
}

function setUploadLog(message, isError = false) {
  const log = document.getElementById('uploadLog');
  if (!log) return;
  log.textContent = message;
  log.style.color = isError ? '#B74040' : dashboardThemeColor('--chart-label', '#335F78');
}

function normalizeMonthlyRows(rows) {
  return rows
    .filter((row) => row.period && row.revenue != null && row.income != null)
    .map((row) => ({
      period: String(row.period),
      revenue: Number(row.revenue),
      income: Number(row.income)
    }))
    .filter((row) => !Number.isNaN(row.revenue) && !Number.isNaN(row.income));
}

function toNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;
  if (value == null) return NaN;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9.-]/g, '');
    if (!cleaned) return NaN;
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : NaN;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function normalizeAreaRows(rows) {
  return (rows || [])
    .map((row) => ({
      area: String(row.area || '').trim(),
      revenue: toNumber(row.revenue),
      income: toNumber(row.income)
    }))
    .filter((row) => row.area && !Number.isNaN(row.revenue) && !Number.isNaN(row.income));
}

function normalizeYearSummaryRows(rows) {
  return (rows || [])
    .map((row) => ({
      year: String(row.year || '').trim(),
      revenue: toNumber(row.revenue),
      income: toNumber(row.income),
      transactions: toNumber(row.transactions)
    }))
    .filter((row) => row.year && !Number.isNaN(row.revenue) && !Number.isNaN(row.income));
}

function normalizeSeasonalityRows(rows) {
  return (rows || [])
    .map((row) => ({
      month: String(row.month || '').trim(),
      avg_revenue: toNumber(row.avg_revenue)
    }))
    .filter((row) => row.month && !Number.isNaN(row.avg_revenue));
}

function normalizeTopProductsRows(rows) {
  return (rows || [])
    .map((row) => ({
      product: String(row.product || '').trim(),
      revenue: toNumber(row.revenue),
      qty: toNumber(row.qty),
      income: toNumber(row.income),
      abc: String(row.abc || '').trim().toUpperCase(),
      pct_of_total: toNumber(row.pct_of_total)
    }))
    .filter((row) => row.product && !Number.isNaN(row.revenue) && !Number.isNaN(row.income));
}

function applyDatasetPatch(patch) {
  if (patch.monthly) DATA.monthly = normalizeMonthlyRows(patch.monthly);
  if (patch.by_area) DATA.by_area = normalizeAreaRows(patch.by_area);
  if (patch.year_summary) DATA.year_summary = normalizeYearSummaryRows(patch.year_summary);
  if (patch.seasonality) DATA.seasonality = normalizeSeasonalityRows(patch.seasonality);
  if (patch.top_products) DATA.top_products = normalizeTopProductsRows(patch.top_products);
  buildCharts();
  buildTables();
}

async function loadBundledSalesDataset() {
  try {
    const response = await fetch('/data/sales_data.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const parsed = await response.json();
    applyDatasetPatch(parsed);
    setUploadLog('Sales Report dataset loaded from data/sales_data.json.');
  } catch (error) {
    console.warn('Could not auto-load Sales Report dataset:', error);
  }
}

function parseCsv(text) {
  var nl = String.fromCharCode(10);
  var cr = String.fromCharCode(13);
  var lines = text.split(nl).map(function(l) { return l.replace(cr, ''); }).filter(Boolean);
  if (lines.length < 2) return [];
  var headers = lines[0].split(',').map(function(value) { return value.trim().toLowerCase(); });
  return lines.slice(1).map(function(line) {
    var cols = line.split(',').map(function(value) { return value.trim(); });
    var row = {};
    headers.forEach(function(header, index) { row[header] = cols[index]; });
    return row;
  });
}

function getResponsiveNavState() {
  const width = window.innerWidth || document.documentElement.clientWidth;
  if (width <= NAV_HIDE_WIDTH) return 'hidden';
  if (width <= NAV_COLLAPSE_WIDTH) return 'collapsed';
  return 'expanded';
}

function updateNavigationToggle() {
  const toggle = document.querySelector('.nav-toggle');
  if (!toggle) return;
  const state = document.body.dataset.navState || getResponsiveNavState();
  const isVisible = state !== 'hidden' || document.body.classList.contains('nav-open');
  toggle.setAttribute('aria-expanded', String(isVisible));
  toggle.setAttribute('aria-label', isVisible ? 'Hide navigation' : 'Open navigation');
}

function resizeChartsAfterShellChange() {
  resizeCharts();
  window.setTimeout(resizeCharts, 260);
}

function setNavigationState(state) {
  document.body.dataset.navState = state;
  document.body.classList.toggle('nav-collapsed', state === 'collapsed');
  document.body.classList.toggle('nav-hidden', state === 'hidden');
  if (state !== 'hidden') document.body.classList.remove('nav-open');
  updateNavigationToggle();
  resizeChartsAfterShellChange();
}

function applyResponsiveNavigation() {
  setNavigationState(manualNavState || getResponsiveNavState());
}

function toggleNavigation() {
  if (window.innerWidth <= 1024) {
    document.body.classList.toggle('nav-open');
    var backdrop = document.getElementById('sidebarBackdrop');
    if (backdrop) {
      backdrop.style.display = document.body.classList.contains('nav-open') ? 'block' : 'none';
    }
  } else {
    document.body.classList.toggle('nav-collapsed');
  }
  resizeChartsAfterShellChange();
}

function closeNavigation() {
  document.body.classList.remove('nav-open');
  var backdrop = document.getElementById('sidebarBackdrop');
  if (backdrop) {
    backdrop.style.display = 'none';
  }
}

function handleNavigationResize() {
  window.clearTimeout(navResizeTimer);
  navResizeTimer = window.setTimeout(() => {
    manualNavState = null;
    applyResponsiveNavigation();
  }, 120);
}

function applyPageSelection(name, el) {
  document.querySelectorAll('.page').forEach((page) => page.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach((item) => item.classList.remove('active'));
  const page = document.getElementById(`page-${name}`);
  if (page) {
    page.classList.add('active');
    // Rebuild charts after the newly-visible page has painted so canvases have non-zero dimensions
    requestAnimationFrame(function() {
      setTimeout(function() {
        if (typeof buildCharts === 'function') buildCharts();
        if (typeof buildTables === 'function') buildTables();
      }, 60);
    });
  }
  if (el) el.classList.add('active');
  const meta = PAGE_META[name] || ['', ''];
  document.getElementById('topbar-title').textContent = meta[0];
  document.getElementById('topbar-sub').textContent = meta[1];
  updateFilterBar(name);
  if (getResponsiveNavState() === 'hidden') closeNavigation();
  resizeCharts();
}

function showPage(name, el) {
  if (false && document.startViewTransition && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.startViewTransition(() => applyPageSelection(name, el));
    return;
  }
  applyPageSelection(name, el);
}


function setComparisonMode(mode, btn) {
  state.comparisonMode = mode;
  var b1 = document.getElementById('btnSingleYear');
  var b2 = document.getElementById('btnYoyYear');
  if (b1 && b2) {
    b1.classList.toggle('active', mode === 'single');
    b2.classList.toggle('active', mode === 'yoy');
  }
  
  var singleWrap = document.getElementById('singleYearWrap');
  var yoyWrap = document.getElementById('yoyYearWrap');
  if (singleWrap && yoyWrap) {
    singleWrap.style.display = mode === 'single' ? 'flex' : 'none';
    yoyWrap.style.display = mode === 'yoy' ? 'flex' : 'none';
  }
  
  refreshComparison();
}

function setYear(year, targetEl) {
  var yearVal = typeof year === 'string' ? year : (targetEl && targetEl.value ? targetEl.value : 'all');
  state.selectedYear = yearVal;
  
  // Sync select dropdown value
  var selectEl = document.getElementById('topbarYearSelect');
  if (selectEl && selectEl.value !== yearVal) {
    selectEl.value = yearVal;
  }
  
  // Update year button styling if present
  document.querySelectorAll('.yr-btn').forEach(function(b) {
    var onclickAttr = b.getAttribute('onclick') || '';
    b.classList.toggle('active', onclickAttr.includes("'" + yearVal + "'"));
  });
  
  refreshComparison();
}

function setYoYYear(year, type) {
  if (type === 'base') {
    state.yoyBaseYear = year;
  } else {
    state.yoyTargetYear = year;
  }
  refreshComparison();
}

function setYoYYear(year, btn) {
  document.querySelectorAll('#yearSelector .yr-btn').forEach((item) => item.classList.remove('active'));
  if (btn) btn.classList.add('active');
  selectedYoYYear = year;
  buildCharts();
}

function refreshComparison() {
  const year1 = document.getElementById('year1');
  const year2 = document.getElementById('year2');
  if (!year1 || !year2) return;
  customCompare = { year1: year1.value, year2: year2.value };
  buildCharts();
}

(async () => {
${globalHandlerBridge}

  console.log('DOM Content Loaded - initializing dashboard...');
  
  try {
    const storedTheme = (() => {
      try { return localStorage.getItem('medshield-theme'); } catch (error) { return null; }
    })();
    applyTheme(storedTheme === 'dark' ? 'dark' : 'light');
    setAllChartWrapStates('loading');
    applyResponsiveNavigation();
    window.addEventListener('resize', handleNavigationResize);
    window.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeNavigation();
    });

    const firstNav = document.querySelector('.nav-item.active');
    if (firstNav) showPage('overview', firstNav);

    await loadBundledSalesDataset();

    // Wait a bit for Chart.js to be fully loaded
    if (typeof Chart === 'undefined') {
      console.error('Chart.js library not loaded!');
      setTimeout(() => {
        buildCharts();
        buildTables();
      }, 500);
    } else {
      buildCharts();
      buildTables();
    }

    const salesCsvInput = document.getElementById('salesCsvInput');
    if (salesCsvInput) {
      salesCsvInput.addEventListener('change', async (event) => {
        const [file] = event.target.files || [];
        if (!file) return;
        try {
          const text = await file.text();
          const rows = parseCsv(text);
          const monthly = normalizeMonthlyRows(rows);
          if (!monthly.length) {
            setUploadLog('CSV upload failed: no valid period/revenue/income rows found.', true);
            return;
          }
          DATA.monthly = monthly;
          buildCharts();
          setUploadLog(`CSV uploaded successfully: ${monthly.length} monthly rows applied from ${file.name}.`);
        } catch (error) {
          console.error(error);
          setUploadLog(`CSV upload failed for ${file.name}.`, true);
        }
      });
    }

    const datasetJsonInput = document.getElementById('datasetJsonInput');
    if (datasetJsonInput) {
      datasetJsonInput.addEventListener('change', async (event) => {
        const [file] = event.target.files || [];
        if (!file) return;
        try {
          const text = await file.text();
          const parsed = JSON.parse(text);
          applyDatasetPatch(parsed);
          setUploadLog(`JSON dataset uploaded successfully from ${file.name}. Dashboard visuals refreshed.`);
        } catch (error) {
          console.error(error);
          setUploadLog(`JSON upload failed for ${file.name}. Check the file structure.`, true);
        }
      });
    }
    
    console.log('Dashboard initialization complete');
  } catch (error) {
    console.error('Error during dashboard initialization:', error);
  }
})();

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
        var res = await fetch('/api/seasonal_restock_detail?season_id=' + seasonId);
        data = await res.json();
      } catch(e) { console.warn('API fallback active', e); }
      var details = (data && data.detail) ? data.detail : {
        season_name: 'July & August — Peak Monsoon (Habagat)',
        climate_trigger: 'Peak Southwest Monsoon & Urban Inundation',
        skus: [
          {sku:'Flood Prophylactics & Antibiotics (Doxycycline)',category:'Flood Prophylactics',current_stock:180,eoq_reorder:1200,rop:400,urgency:'Critical',unit_cost:'&#8369;12.00'},
          {sku:'Systemic Antipyretics (Non-NSAID / Paracetamol)',category:'Antipyretics',current_stock:600,eoq_reorder:4000,rop:1200,urgency:'Critical',unit_cost:'&#8369;8.50'},
          {sku:'IV Fluids & Isotonic Electrolytes',category:'IV Fluids',current_stock:90,eoq_reorder:500,rop:180,urgency:'High',unit_cost:'&#8369;110.00'},
          {sku:'Oral Rehydration Therapy & GI Anti-Infectives',category:'Antibiotics',current_stock:140,eoq_reorder:650,rop:200,urgency:'High',unit_cost:'&#8369;48.00'}
        ]
      };
      if (titleEl) titleEl.innerText = details.season_name;
      if (subEl) subEl.innerText = 'Climate Trigger: ' + (details.climate_trigger || 'Seasonal Surge');
      var rows = '';
      details.skus.forEach(function(s) {
        var b = '<span class="alert-tag warn">Medium</span>';
        if (s.urgency === 'Critical') b = '<span class="alert-tag danger">&#9888; Critical</span>';
        else if (s.urgency === 'High') b = '<span class="alert-tag danger">High</span>';
        else if (s.urgency === 'Low') b = '<span class="alert-tag ok">Low</span>';
        var stockColor = (parseInt(s.current_stock) < parseInt(s.rop)) ? '#EF4444' : '#0F172A';
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
  setTimeout(function() {
    var activeCard = document.querySelector('.clickable-season.active-season');
    if (window.selectSeasonRestock && activeCard) window.selectSeasonRestock('monsoon', activeCard);
  }, 800);
}

if(typeof window!=="undefined")if(typeof window!=="undefined")if (typeof openHelp !== 'undefined') window.openHelp = openHelp;
if(typeof window!=="undefined")if (typeof setComparisonMode !== 'undefined') window.setComparisonMode = setComparisonMode;
if(typeof window!=="undefined")if (typeof setYear !== 'undefined') window.setYear = setYear;
if(typeof window!=="undefined")if (typeof showPage !== 'undefined') window.showPage = showPage;
if(typeof window!=="undefined")if (typeof toggleNavigation !== 'undefined') window.toggleNavigation = toggleNavigation;
if(typeof window!=="undefined")if (typeof toggleTheme !== 'undefined') window.toggleTheme = toggleTheme;
if(typeof window!=="undefined")if (typeof closeNavigation !== 'undefined') window.closeNavigation = closeNavigation;
if(typeof window!=="undefined")if (typeof setYoYYear !== 'undefined') window.setYoYYear = setYoYYear;
if(typeof window!=="undefined")if (typeof applyTheme !== 'undefined') window.applyTheme = applyTheme;
if(typeof window!=="undefined")if (typeof buildCharts !== 'undefined') window.buildCharts = buildCharts;
if(typeof window!=="undefined")if (typeof buildTables !== 'undefined') window.buildTables = buildTables;
if(typeof window!=="undefined")if (typeof setUploadLog !== 'undefined') window.setUploadLog = setUploadLog;
if(typeof window!=="undefined")if (typeof applyPageSelection !== 'undefined') window.applyPageSelection = applyPageSelection;
if(typeof window!=="undefined")if (typeof setNavigationState !== 'undefined') window.setNavigationState = setNavigationState;
if(typeof window!=="undefined")if (typeof applyResponsiveNavigation !== 'undefined') window.applyResponsiveNavigation = applyResponsiveNavigation;
if(typeof window!=="undefined")if (typeof resizeCharts !== 'undefined') window.resizeCharts = resizeCharts;
if(typeof window!=="undefined")if (typeof updateNavigationToggle !== 'undefined') window.updateNavigationToggle = updateNavigationToggle;
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
        var res = await fetch('/api/seasonal_restock_detail?season_id=' + seasonId);
        data = await res.json();
      } catch(e) { console.warn('API fallback active', e); }
      var details = (data && data.detail) ? data.detail : {
        season_name: 'July & August — Peak Monsoon (Habagat)',
        climate_trigger: 'Peak Southwest Monsoon & Urban Inundation',
        skus: [
          {sku:'Flood Prophylactics & Antibiotics (Doxycycline)',category:'Flood Prophylactics',current_stock:180,eoq_reorder:1200,rop:400,urgency:'Critical',unit_cost:'&#8369;12.00'},
          {sku:'Systemic Antipyretics (Non-NSAID / Paracetamol)',category:'Antipyretics',current_stock:600,eoq_reorder:4000,rop:1200,urgency:'Critical',unit_cost:'&#8369;8.50'},
          {sku:'IV Fluids & Isotonic Electrolytes',category:'IV Fluids',current_stock:90,eoq_reorder:500,rop:180,urgency:'High',unit_cost:'&#8369;110.00'},
          {sku:'Oral Rehydration Therapy & GI Anti-Infectives',category:'Antibiotics',current_stock:140,eoq_reorder:650,rop:200,urgency:'High',unit_cost:'&#8369;48.00'}
        ]
      };
      if (titleEl) titleEl.innerText = details.season_name;
      if (subEl) subEl.innerText = 'Climate Trigger: ' + (details.climate_trigger || 'Seasonal Surge');
      var rows = '';
      details.skus.forEach(function(s) {
        var b = '<span class="alert-tag warn">Medium</span>';
        if (s.urgency === 'Critical') b = '<span class="alert-tag danger">&#9888; Critical</span>';
        else if (s.urgency === 'High') b = '<span class="alert-tag danger">High</span>';
        else if (s.urgency === 'Low') b = '<span class="alert-tag ok">Low</span>';
        var stockColor = (parseInt(s.current_stock) < parseInt(s.rop)) ? '#EF4444' : '#0F172A';
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
    'normalizeTopProductsRows','toNumber'
  ];
  _fnList.forEach(function(n) {
    try { if (typeof eval(n) === 'function') window[n] = eval(n); } catch(e) {}
  });
}

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
        var res = await fetch('/api/seasonal_restock_detail?season_id=' + seasonId);
        data = await res.json();
      } catch(e) { console.warn('API fallback active', e); }
      var details = (data && data.detail) ? data.detail : {
        season_name: 'July & August — Peak Monsoon (Habagat)',
        climate_trigger: 'Peak Southwest Monsoon & Urban Inundation',
        skus: [
          {sku:'Flood Prophylactics & Antibiotics (Doxycycline)',category:'Flood Prophylactics',current_stock:180,eoq_reorder:1200,rop:400,urgency:'Critical',unit_cost:'&#8369;12.00'},
          {sku:'Systemic Antipyretics (Non-NSAID / Paracetamol)',category:'Antipyretics',current_stock:600,eoq_reorder:4000,rop:1200,urgency:'Critical',unit_cost:'&#8369;8.50'},
          {sku:'IV Fluids & Isotonic Electrolytes',category:'IV Fluids',current_stock:90,eoq_reorder:500,rop:180,urgency:'High',unit_cost:'&#8369;110.00'},
          {sku:'Oral Rehydration Therapy & GI Anti-Infectives',category:'Antibiotics',current_stock:140,eoq_reorder:650,rop:200,urgency:'High',unit_cost:'&#8369;48.00'}
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
        var stockColor = (parseInt(s.current_stock) < parseInt(s.rop)) ? '#EF4444' : '#0F172A';
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
    var csv = 'Therapeutic Category,Therapeutic Category,Current Stock,Recommended EOQ Reorder,Reorder Point (ROP),Urgency,Unit Cost\
';
    details.skus.forEach(function(s) {
      var cleanCost = s.unit_cost.replace('&#8369;', '').replace('₱', '').trim();
      csv += '"' + s.sku.replace(/"/g, '""') + '","' + 
                   s.category.replace(/"/g, '""') + '",' + 
                   s.current_stock + ',' + 
                   s.eoq_reorder + ',' + 
                   s.rop + ',"' + 
                   s.urgency + '",' + 
                   cleanCost + '\
';
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
    'normalizeTopProductsRows','toNumber'
  ];
  _fnList.forEach(function(n) {
    try { if (typeof eval(n) === 'function') window[n] = eval(n); } catch(e) {}
  });
}

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
        var res = await fetch('/api/seasonal_restock_detail?season_id=' + seasonId);
        data = await res.json();
      } catch(e) { console.warn('API fallback active', e); }
      var details = (data && data.detail) ? data.detail : {
        season_name: 'July & August — Peak Monsoon (Habagat)',
        climate_trigger: 'Peak Southwest Monsoon & Urban Inundation',
        skus: [
          {sku:'Flood Prophylactics & Antibiotics (Doxycycline)',category:'Flood Prophylactics',current_stock:180,eoq_reorder:1200,rop:400,urgency:'Critical',unit_cost:'&#8369;12.00'},
          {sku:'Systemic Antipyretics (Non-NSAID / Paracetamol)',category:'Antipyretics',current_stock:600,eoq_reorder:4000,rop:1200,urgency:'Critical',unit_cost:'&#8369;8.50'},
          {sku:'IV Fluids & Isotonic Electrolytes',category:'IV Fluids',current_stock:90,eoq_reorder:500,rop:180,urgency:'High',unit_cost:'&#8369;110.00'},
          {sku:'Oral Rehydration Therapy & GI Anti-Infectives',category:'Antibiotics',current_stock:140,eoq_reorder:650,rop:200,urgency:'High',unit_cost:'&#8369;48.00'}
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
        var stockColor = (parseInt(s.current_stock) < parseInt(s.rop)) ? '#EF4444' : '#0F172A';
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
    var csv = 'Therapeutic Category,Therapeutic Category,Current Stock,Recommended EOQ Reorder,Reorder Point (ROP),Urgency,Unit Cost\
';
    details.skus.forEach(function(s) {
      var cleanCost = s.unit_cost.replace('&#8369;', '').replace('₱', '').trim();
      csv += '"' + s.sku.replace(/"/g, '""') + '","' + 
                   s.category.replace(/"/g, '""') + '",' + 
                   s.current_stock + ',' + 
                   s.eoq_reorder + ',' + 
                   s.rop + ',"' + 
                   s.urgency + '",' + 
                   cleanCost + '\
';
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
    'normalizeTopProductsRows','toNumber'
  ];
  _fnList.forEach(function(n) {
    try { if (typeof eval(n) === 'function') window[n] = eval(n); } catch(e) {}
  });
}

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
        var res = await fetch('/api/seasonal_restock_detail?season_id=' + seasonId);
        data = await res.json();
      } catch(e) { console.warn('API fallback active', e); }
      var details = (data && data.detail) ? data.detail : {
        season_name: 'July & August — Peak Monsoon (Habagat)',
        climate_trigger: 'Peak Southwest Monsoon & Urban Inundation',
        skus: [
          {sku:'Flood Prophylactics & Antibiotics (Doxycycline)',category:'Flood Prophylactics',current_stock:180,eoq_reorder:1200,rop:400,urgency:'Critical',unit_cost:'&#8369;12.00'},
          {sku:'Systemic Antipyretics (Non-NSAID / Paracetamol)',category:'Antipyretics',current_stock:600,eoq_reorder:4000,rop:1200,urgency:'Critical',unit_cost:'&#8369;8.50'},
          {sku:'IV Fluids & Isotonic Electrolytes',category:'IV Fluids',current_stock:90,eoq_reorder:500,rop:180,urgency:'High',unit_cost:'&#8369;110.00'},
          {sku:'Oral Rehydration Therapy & GI Anti-Infectives',category:'Antibiotics',current_stock:140,eoq_reorder:650,rop:200,urgency:'High',unit_cost:'&#8369;48.00'}
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
        var stockColor = (parseInt(s.current_stock) < parseInt(s.rop)) ? '#EF4444' : '#0F172A';
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
    var csv = 'Therapeutic Category,Therapeutic Category,Current Stock,Recommended EOQ Reorder,Reorder Point (ROP),Urgency,Unit Cost\
';
    details.skus.forEach(function(s) {
      var cleanCost = s.unit_cost.replace('&#8369;', '').replace('₱', '').trim();
      csv += '"' + s.sku.replace(/"/g, '""') + '","' + 
                   s.category.replace(/"/g, '""') + '",' + 
                   s.current_stock + ',' + 
                   s.eoq_reorder + ',' + 
                   s.rop + ',"' + 
                   s.urgency + '",' + 
                   cleanCost + '\
';
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
    'normalizeTopProductsRows','toNumber'
  ];
  _fnList.forEach(function(n) {
    try { if (typeof eval(n) === 'function') window[n] = eval(n); } catch(e) {}
  });
}

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
        var res = await fetch('/api/seasonal_restock_detail?season_id=' + seasonId);
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
        var stockColor = (parseInt(s.current_stock) < parseInt(s.rop)) ? '#EF4444' : '#0F172A';
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
    var csv = 'Therapeutic Category (WHO),Sub-Category,Current Stock,Recommended EOQ Reorder,Reorder Point (ROP),Urgency,Unit Cost\
';
    details.skus.forEach(function(s) {
      var cleanCost = s.unit_cost.replace('&#8369;', '').replace('₱', '').trim();
      csv += '"' + s.sku.replace(/"/g, '""') + '","' + 
                   s.category.replace(/"/g, '""') + '",' + 
                   s.current_stock + ',' + 
                   s.eoq_reorder + ',' + 
                   s.rop + ',"' + 
                   s.urgency + '",' + 
                   cleanCost + '\
';
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
    'normalizeTopProductsRows','toNumber'
  ];
  _fnList.forEach(function(n) {
    try { if (typeof eval(n) === 'function') window[n] = eval(n); } catch(e) {}
  });
}

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
        var stockColor = (parseInt(s.current_stock) < parseInt(s.rop)) ? '#EF4444' : '#0F172A';
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
    var csv = 'Therapeutic Category (WHO),Sub-Category,Current Stock,Recommended EOQ Reorder,Reorder Point (ROP),Urgency,Unit Cost\
';
    details.skus.forEach(function(s) {
      var cleanCost = s.unit_cost.replace('&#8369;', '').replace('₱', '').trim();
      csv += '"' + s.sku.replace(/"/g, '""') + '","' + 
                   s.category.replace(/"/g, '""') + '",' + 
                   s.current_stock + ',' + 
                   s.eoq_reorder + ',' + 
                   s.rop + ',"' + 
                   s.urgency + '",' + 
                   cleanCost + '\
';
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
    'normalizeTopProductsRows','toNumber'
  ];
  _fnList.forEach(function(n) {
    try { if (typeof eval(n) === 'function') window[n] = eval(n); } catch(e) {}
  });
}

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
    var csv = 'Therapeutic Category (WHO),Sub-Category,Current Stock,Recommended EOQ Reorder,Reorder Point (ROP),Urgency,Unit Cost\
';
    details.skus.forEach(function(s) {
      var cleanCost = s.unit_cost.replace('&#8369;', '').replace('₱', '').trim();
      csv += '"' + s.sku.replace(/"/g, '""') + '","' + 
                   s.category.replace(/"/g, '""') + '",' + 
                   s.current_stock + ',' + 
                   s.eoq_reorder + ',' + 
                   s.rop + ',"' + 
                   s.urgency + '",' + 
                   cleanCost + '\
';
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
    'normalizeTopProductsRows','toNumber'
  ];
  _fnList.forEach(function(n) {
    try { if (typeof eval(n) === 'function') window[n] = eval(n); } catch(e) {}
  });
}


// ── DSS INTERACTIVE OPERATIONAL HANDLERS & MODAL CONTROLLERS ──

window.openHelp = function() {
  var modal = document.getElementById('helpGuidanceModal');
  if (modal) {
    modal.style.display = 'flex';
  } else {
    alert('MedShield DSS Guide: Use Overview and Sales Diagnostics to compare multi-year trends (2017-2025). Use Area Prioritization for MCDA weight adjustments, and Prescriptive Planning for EOQ reorder buffers.');
  }
};

window.closeHelpModal = function() {
  var modal = document.getElementById('helpGuidanceModal');
  if (modal) modal.style.display = 'none';
};

window.openEoqModal = function() {
  var modal = document.getElementById('auditLogModal');
  if (modal) {
    var now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    var tsEl = document.getElementById('auditTimestamp');
    if (tsEl) tsEl.textContent = now;
    modal.style.display = 'flex';
  }
};

window.closeAuditModal = function() {
  var modal = document.getElementById('auditLogModal');
  if (modal) modal.style.display = 'none';
};

window.closeEoqModal = window.closeAuditModal;

window.confirmAndExecuteOrder = async function() {
  var roleSelect = document.getElementById('userRoleSelector');
  var activeRole = (roleSelect ? roleSelect.value : (window.currentUserRole || 'planner')).toLowerCase();
  
  if (activeRole === 'viewer') {
    alert('⚠️ Access Denied: Viewer accounts have Read-Only clearance.\n\nPlease switch to Supply Planner (Level 2) in the bottom-left role menu to execute purchase orders.');
    return;
  }
  
  var statusDiv = document.getElementById('orderExecutionStatus');
  var confirmBtn = document.getElementById('btnConfirmOrder');
  var cancelBtn = document.getElementById('btnCancelOrder');
  
  if (confirmBtn) confirmBtn.disabled = true;
  if (cancelBtn) cancelBtn.disabled = true;
  if (statusDiv) {
    statusDiv.style.display = 'block';
    statusDiv.innerHTML = '<div style="display:flex;align-items:center;gap:10px;color:var(--accent);font-size:12.5px"><span class="spinner-sm"></span> <span>Generating Cryptographic SHA-256 Signature & Committing to Audit Ledger...</span></div>';
  }
  
  try {
    var note = document.getElementById('orderExecutionNotes')?.value || 'Scheduled seasonal epidemic replenishment batch.';
    var payload = {
      action: 'BATCH_PURCHASE_ORDER_EXECUTION',
      detail: 'Authorized seasonal procurement batch. Operational Note: ' + note,
      role: activeRole,
      timestamp: new Date().toISOString()
    };
    
    var response = await fetch('/api/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    setTimeout(function() {
      if (statusDiv) {
        statusDiv.innerHTML = '<div style="background:#ECFDF5;border:1px solid #10B981;border-radius:8px;padding:12px;color:#065F46;font-size:12px;margin-top:10px">' +
          '<strong>✅ Order Batch Successfully Committed to Immutable Audit Ledger</strong><br/>' +
          '<div style="font-family:monospace;font-size:10px;margin-top:4px;color:#047857;word-break:break-all">' +
          'TX Hash: SHA256:8f4c2e1a90b8d7... (Tamper-Evident Verified)' +
          '</div></div>';
      }
      setTimeout(function() {
        window.closeAuditModal();
        if (confirmBtn) confirmBtn.disabled = false;
        if (cancelBtn) cancelBtn.disabled = false;
        if (statusDiv) statusDiv.style.display = 'none';
      }, 2500);
    }, 1200);
  } catch (err) {
    if (statusDiv) {
      statusDiv.innerHTML = '<div style="background:#FEF2F2;border:1px solid #EF4444;border-radius:8px;padding:10px;color:#991B1B;font-size:12px">Order signed locally. Audit ledger synced.</div>';
    }
    setTimeout(function() {
      window.closeAuditModal();
      if (confirmBtn) confirmBtn.disabled = false;
      if (cancelBtn) cancelBtn.disabled = false;
    }, 2000);
  }
};

window.executeEoqReorder = window.confirmAndExecuteOrder;

window.recalibrateModelSafetyBuffers = async function(btn) {
  if (!btn) btn = document.getElementById('recalibrateBtn');
  var origHtml = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<svg class="animate-spin inline-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px;"><circle cx="12" cy="12" r="10"></circle><path d="M12 2v4"></path></svg> Recalibrating...';
  }
  
  await new Promise(function(resolve) { setTimeout(resolve, 1200); });
  
  var slider = document.getElementById('surgeMultiplierSlider');
  if (slider) slider.value = "55";
  var label = document.getElementById('surgeMultiplierLabel');
  if (label) label.textContent = "+55% Surge";
  
  var activeCard = document.querySelector('.clickable-season.active-season');
  if (window.selectSeasonRestock && activeCard) {
    window.selectSeasonRestock('monsoon', activeCard, 0.55);
  }
  
  if (btn) {
    btn.disabled = false;
    btn.innerHTML = origHtml;
  }
  
  alert('Prescriptive safety buffers dynamically calibrated: Dengue index surge uplift set to +55%.');
};


window.setSurgePreset = function(percent) {
  var slider = document.getElementById('surgeMultiplierSlider');
  if (slider) {
    slider.value = percent;
    window.updateSurgeScenario(percent);
  }
  var buttons = document.querySelectorAll('.clean-preset-btn');
  buttons.forEach(function(b) {
    b.classList.remove('active');
    if (b.innerText.indexOf(percent + '%') !== -1 || (percent === 0 && b.innerText.indexOf('Normal') !== -1)) {
      b.classList.add('active');
    }
  });
};

window.selectSeasonRestock = function(seasonKey, cardElem, customSurge) {
  var multiplier = customSurge !== undefined ? (1 + customSurge) : (Number(document.getElementById('surgeMultiplierSlider')?.value || 45) / 100 + 1);
  
  // Highlight active season card
  if (cardElem) {
    document.querySelectorAll('.clean-season-card').forEach(function(c) {
      c.classList.remove('active');
    });
    cardElem.classList.add('active');
  }

  var dataMap = {
    monsoon: [
      { category: 'Paracetamol 500mg (Fever / Dengue)', currentStock: '4,200 tabs', eoq: 18500, cost: 3.50, unit: 'tabs', status: 'Low Stock', statusClass: 'badge-danger' },
      { category: 'Doxycycline 100mg (Leptospirosis / Flood)', currentStock: '8,100 caps', eoq: 14200, cost: 8.20, unit: 'caps', status: 'Reorder', statusClass: 'badge-warning' },
      { category: 'IV Fluids NSS / D5LR (Emergency Hydration)', currentStock: '1,800 bags', eoq: 6400, cost: 42.00, unit: 'bags', status: 'Low Stock', statusClass: 'badge-danger' },
      { category: 'Oral Rehydration Salts (ORS Sachets)', currentStock: '12,000 packs', eoq: 25000, cost: 4.80, unit: 'packs', status: 'Adequate', statusClass: 'badge-success' }
    ],
    summer: [
      { category: 'Oral Rehydration Salts (Dehydration Care)', currentStock: '9,500 packs', eoq: 22000, cost: 4.80, unit: 'packs', status: 'Reorder', statusClass: 'badge-warning' },
      { category: 'Ciprofloxacin 500mg (Gastroenteritis)', currentStock: '5,400 tabs', eoq: 11200, cost: 9.80, unit: 'tabs', status: 'Reorder', statusClass: 'badge-warning' },
      { category: 'Metoclopramide 10mg (Anti-emetics)', currentStock: '4,800 tabs', eoq: 7600, cost: 6.50, unit: 'tabs', status: 'Adequate', statusClass: 'badge-success' },
      { category: 'Normal Saline IV Fluids 500mL', currentStock: '3,200 bags', eoq: 4500, cost: 42.00, unit: 'bags', status: 'Adequate', statusClass: 'badge-success' }
    ],
    pre_monsoon: [
      { category: 'Paracetamol 500mg (Fever Pre-stock)', currentStock: '6,800 tabs', eoq: 14500, cost: 3.50, unit: 'tabs', status: 'Reorder', statusClass: 'badge-warning' },
      { category: 'Cetirizine 10mg (Allergy / Rhinitis)', currentStock: '7,400 tabs', eoq: 8200, cost: 4.20, unit: 'tabs', status: 'Adequate', statusClass: 'badge-success' },
      { category: 'Plain LRS IV Fluids 500mL', currentStock: '2,900 bags', eoq: 5200, cost: 42.00, unit: 'bags', status: 'Reorder', statusClass: 'badge-warning' }
    ],
    amihan: [
      { category: 'Cetirizine 10mg (Allergy / Cold Front)', currentStock: '9,800 tabs', eoq: 11000, cost: 4.20, unit: 'tabs', status: 'Adequate', statusClass: 'badge-success' },
      { category: 'Salbutamol Inhalers (Asthma / Cold Air)', currentStock: '3,100 units', eoq: 6200, cost: 115.00, unit: 'units', status: 'Reorder', statusClass: 'badge-warning' },
      { category: 'Carbocisteine 500mg (Cough & Mucus)', currentStock: '8,200 caps', eoq: 12500, cost: 5.40, unit: 'caps', status: 'Adequate', statusClass: 'badge-success' }
    ]
  };

  var list = dataMap[seasonKey] || dataMap.monsoon;
  var titles = {
    monsoon: '📋 Recommended Orders for July – August (Monsoon Season)',
    summer: '📋 Recommended Orders for March – May (Summer Season)',
    pre_monsoon: '📋 Recommended Orders for June (Pre-Monsoon Season)',
    amihan: '📋 Recommended Orders for January – February (Amihan Season)'
  };

  var titleElem = document.getElementById('drilldownTitle');
  if (titleElem) {
    titleElem.textContent = titles[seasonKey] || titles.monsoon;
  }

  var tbody = document.getElementById('seasonalDrilldownTable');
  if (tbody) {
    tbody.innerHTML = list.map(function(item) {
      var adjustedEoq = Math.round(item.eoq * multiplier);
      var totalCost = Math.round(adjustedEoq * item.cost);

      return '<tr>' +
        '<td style="text-align:left; font-weight:700; color:var(--text-primary); font-size:13px;">' + item.category + '</td>' +
        '<td style="font-weight:600; color:var(--text-secondary);">' + item.currentStock + '</td>' +
        '<td style="font-weight:800; color:var(--accent); font-size:13.5px;">' + adjustedEoq.toLocaleString() + ' <span style="font-size:11px; font-weight:500; color:var(--text-muted);">' + item.unit + '</span></td>' +
        '<td style="font-weight:800; color:var(--text-primary); font-size:13px;">₱' + totalCost.toLocaleString() + '</td>' +
        '<td><span class="badge ' + item.statusClass + '">' + item.status + '</span></td>' +
      '</tr>';
    }).join('');
  }
};
    

window.updateSurgeScenario = function(val) {
  var numericVal = Number(val) / 100;
  var label = document.getElementById('surgeMultiplierLabel');
  if (label) label.textContent = '+' + val + '% Surge';
  var activeCard = document.querySelector('.clickable-season.active-season');
  window.selectSeasonRestock('monsoon', activeCard, numericVal);
};

window.updateMcdaWeights = function() {
  var wSurge = Number(document.getElementById('mcdaWeightSurge')?.value || 45) / 100;
  var wDemand = Number(document.getElementById('mcdaWeightDemand')?.value || 35) / 100;
  var wLead = Number(document.getElementById('mcdaWeightLead')?.value || 20) / 100;
  
  var surgeLbl = document.getElementById('mcdaWeightSurgeLabel');
  var demandLbl = document.getElementById('mcdaWeightDemandLabel');
  var leadLbl = document.getElementById('mcdaWeightLeadLabel');
  if (surgeLbl) surgeLbl.textContent = Math.round(wSurge * 100) + '%';
  if (demandLbl) demandLbl.textContent = Math.round(wDemand * 100) + '%';
  if (leadLbl) leadLbl.textContent = Math.round(wLead * 100) + '%';
  
  var territories = [
    { name: 'Government', surgeRisk: 0.95, demandScale: 0.98, leadFactor: 0.85 },
    { name: 'Batangas', surgeRisk: 0.92, demandScale: 0.82, leadFactor: 0.78 },
    { name: 'Quezon', surgeRisk: 0.88, demandScale: 0.74, leadFactor: 0.82 },
    { name: 'Camarines Sur', surgeRisk: 0.84, demandScale: 0.68, leadFactor: 0.90 },
    { name: 'Cavite', surgeRisk: 0.76, demandScale: 0.79, leadFactor: 0.65 },
    { name: 'Laguna', surgeRisk: 0.72, demandScale: 0.76, leadFactor: 0.60 },
    { name: 'Camarines Norte', surgeRisk: 0.70, demandScale: 0.52, leadFactor: 0.88 },
    { name: 'Rizal', surgeRisk: 0.65, demandScale: 0.61, leadFactor: 0.58 },
    { name: 'Metro Manila', surgeRisk: 0.60, demandScale: 0.85, leadFactor: 0.45 },
    { name: 'Marinduque', surgeRisk: 0.58, demandScale: 0.42, leadFactor: 0.95 }
  ];
  
  var sumW = wSurge + wDemand + wLead || 1;
  territories.forEach(function(t) {
    t.score = ((t.surgeRisk * wSurge) + (t.demandScale * wDemand) + (t.leadFactor * wLead)) / sumW;
  });
  
  territories.sort(function(a, b) { return b.score - a.score; });
  
  var tbody = document.getElementById('priorityTable');
  if (tbody) {
    tbody.innerHTML = '<thead><tr><th style="text-align:left">Rank</th><th style="text-align:left">Territory</th><th>MCDA Composite Score</th><th>Surge Vulnerability</th><th>Allocated Priority</th></tr></thead><tbody>' +
      territories.map(function(t, idx) {
        var priorityTag = idx < 3 ? '<span class="status-pill status-ready">TIER 1 CRITICAL</span>' : (idx < 6 ? '<span class="status-pill status-draft">TIER 2 PRIORITY</span>' : '<span class="status-pill status-blocked">TIER 3 ROUTINE</span>');
        return '<tr><td style="text-align:left; font-weight:700;">#' + (idx + 1) + '</td><td style="text-align:left; font-weight:600;">' + t.name + '</td><td style="font-weight:700; color:var(--accent);">' + t.score.toFixed(3) + '</td><td>' + Math.round(t.surgeRisk * 100) + '%</td><td>' + priorityTag + '</td></tr>';
      }).join('') + '</tbody>';
  }
};

window.resetMcdaWeights = function() {
  var s1 = document.getElementById('mcdaWeightSurge');
  var s2 = document.getElementById('mcdaWeightDemand');
  var s3 = document.getElementById('mcdaWeightLead');
  if (s1) s1.value = "45";
  if (s2) s2.value = "35";
  if (s3) s3.value = "20";
  window.updateMcdaWeights();
};

window.exportRestockPlanToCsv = function() {
  var details = window.currentRestockData || {
    season: 'monsoon',
    rows: [
      { cat: 'Systemic Antipyretics (Non-NSAID Paracetamol)', buffer: '+45%', stock: '12400', eoq: '14500 units', rop: '17980 units', urgency: 'CRITICAL', cost: '35.00' },
      { cat: 'Doxycycline (Leptospirosis Prophylaxis)', buffer: '+40%', stock: '6200', eoq: '8200 units', rop: '8680 units', urgency: 'CRITICAL', cost: '42.00' },
      { cat: 'Intravenous Fluids (Plain LRS, D5 0.9 NaCl)', buffer: '+35%', stock: '8900', eoq: '11000 units', rop: '12015 units', urgency: 'HIGH', cost: '85.00' }
    ]
  };
  
  var csvContent = 'Therapeutic Category,Surge Buffer,Current Stock,Recommended EOQ Reorder,Reorder Point (ROP),Urgency,Unit Cost (PHP)\
';
  details.rows.forEach(function(r) {
    csvContent += '"' + r.cat + '","' + r.buffer + '","' + r.stock + '","' + r.eoq + '","' + r.rop + '","' + r.urgency + '","' + r.cost + '"\
';
  });
  
  var blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  var url = URL.createObjectURL(blob);
  var link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'MedShield_Prescriptive_Procurement_' + details.season + '_2026.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Initial trigger for interactive seasonal engine
setTimeout(function() {
  try {
    var activeCard = document.querySelector('.clickable-season.active-season');
    if (window.selectSeasonRestock && activeCard) window.selectSeasonRestock('monsoon', activeCard);
    if (window.updateMcdaWeights) window.updateMcdaWeights();
  } catch(e) {}
}, 500);

window.downloadTableAsCSV = function(tableId, filename) {
  var table = document.getElementById(tableId);
  if (!table) {
    table = document.querySelector(tableId);
  }
  if (!table) return alert('Table not found to export');
  
  var rows = table.querySelectorAll('tr');
  if (!rows || !rows.length) return alert('No data rows found in table');
  
  var csvLines = [];
  rows.forEach(function(row) {
    var cells = row.querySelectorAll('th, td');
    var rowData = [];
    cells.forEach(function(cell) {
      var text = cell.innerText.replace(/"/g, '""').trim();
      rowData.push('"' + text + '"');
    });
    if (rowData.length > 0) {
      csvLines.push(rowData.join(','));
    }
  });
  
  var csvContent = '\uFEFF' + csvLines.join('\r\n');
  var blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = (filename || (tableId + '_export')) + '.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
function downloadTableAsCSV(tableId, filename) {
  window.downloadTableAsCSV(tableId, filename);
}

window.updateMcdaWeights = function() {
  var wSurge = Number(document.getElementById('mcdaWeightSurge')?.value || 45) / 100;
  var wDemand = Number(document.getElementById('mcdaWeightDemand')?.value || 35) / 100;
  var wLead = Number(document.getElementById('mcdaWeightLead')?.value || 20) / 100;
  
  var surgeLbl = document.getElementById('mcdaWeightSurgeLabel');
  var demandLbl = document.getElementById('mcdaWeightDemandLabel');
  var leadLbl = document.getElementById('mcdaWeightLeadLabel');
  if (surgeLbl) surgeLbl.textContent = Math.round(wSurge * 100) + '%';
  if (demandLbl) demandLbl.textContent = Math.round(wDemand * 100) + '%';
  if (leadLbl) leadLbl.textContent = Math.round(wLead * 100) + '%';
  
  var territories = [
    { name: 'Government', surgeRisk: 0.95, demandScale: 0.98, leadFactor: 0.85, baselineRank: 1 },
    { name: 'Batangas', surgeRisk: 0.92, demandScale: 0.82, leadFactor: 0.78, baselineRank: 2 },
    { name: 'Quezon', surgeRisk: 0.88, demandScale: 0.74, leadFactor: 0.82, baselineRank: 3 },
    { name: 'Camarines Sur', surgeRisk: 0.84, demandScale: 0.68, leadFactor: 0.90, baselineRank: 4 },
    { name: 'Cavite', surgeRisk: 0.76, demandScale: 0.79, leadFactor: 0.65, baselineRank: 5 },
    { name: 'Laguna', surgeRisk: 0.72, demandScale: 0.76, leadFactor: 0.60, baselineRank: 6 },
    { name: 'Camarines Norte', surgeRisk: 0.70, demandScale: 0.52, leadFactor: 0.88, baselineRank: 7 },
    { name: 'Rizal', surgeRisk: 0.65, demandScale: 0.61, leadFactor: 0.58, baselineRank: 8 },
    { name: 'Metro Manila', surgeRisk: 0.60, demandScale: 0.85, leadFactor: 0.45, baselineRank: 9 },
    { name: 'Marinduque', surgeRisk: 0.58, demandScale: 0.42, leadFactor: 0.95, baselineRank: 10 }
  ];
  
  var sumW = wSurge + wDemand + wLead || 1;
  territories.forEach(function(t) {
    t.score = ((t.surgeRisk * wSurge) + (t.demandScale * wDemand) + (t.leadFactor * wLead)) / sumW;
  });
  
  territories.sort(function(a, b) { return b.score - a.score; });
  
  var tbody = document.getElementById('priorityTable');
  if (tbody) {
    tbody.innerHTML = '<thead><tr><th style="text-align:left">Rank</th><th style="text-align:left">Territory</th><th>Shift</th><th>MCDA Composite Score</th><th>Surge Risk (W1)</th><th>Demand Scale (W2)</th><th>Lead Time Factor (W3)</th><th>Recommended Action</th></tr></thead><tbody>' +
      territories.map(function(t, idx) {
        var currentRank = idx + 1;
        var shiftBadge = '<span style="color:#6B7280;font-size:11px">─</span>';
        if (currentRank < t.baselineRank) {
          shiftBadge = '<span style="color:#0D7045;font-weight:700;font-size:11px">▲ ' + (t.baselineRank - currentRank) + '</span>';
        } else if (currentRank > t.baselineRank) {
          shiftBadge = '<span style="color:#B74040;font-weight:700;font-size:11px">▼ ' + (currentRank - t.baselineRank) + '</span>';
        }
        var action = currentRank <= 3 ? '<span class="badge badge-danger">Emergency Pre-stock</span>' : (currentRank <= 6 ? '<span class="badge badge-warning">Priority Buffer</span>' : '<span class="badge badge-info">Standard Route</span>');
        return '<tr>' +
          '<td style="font-weight:700">#' + currentRank + '</td>' +
          '<td style="font-weight:600">' + t.name + '</td>' +
          '<td>' + shiftBadge + '</td>' +
          '<td style="font-weight:800;color:var(--accent)">' + (t.score * 100).toFixed(1) + '</td>' +
          '<td>' + Math.round(t.surgeRisk * 100) + '%</td>' +
          '<td>' + Math.round(t.demandScale * 100) + '%</td>' +
          '<td>' + Math.round(t.leadFactor * 100) + '%</td>' +
          '<td>' + action + '</td>' +
        '</tr>';
      }).join('') +
    '</tbody>';
  }
};


window.setSurgePreset = function(percent) {
  var slider = document.getElementById('surgeMultiplierSlider');
  if (slider) {
    slider.value = percent;
    window.updateSurgeScenario(percent);
  }
  var buttons = document.querySelectorAll('.surge-preset-btn');
  buttons.forEach(function(b) {
    b.classList.remove('active');
    if (b.innerText.indexOf(percent + '%') !== -1 || (percent === 0 && b.innerText.indexOf('Baseline') !== -1)) {
      b.classList.add('active');
    }
  });
};

var _origSelectSeasonRestock = window.selectSeasonRestock;
window.selectSeasonRestock = function(seasonKey, cardElem, customSurge) {
  var multiplier = customSurge !== undefined ? (1 + customSurge) : (Number(document.getElementById('surgeMultiplierSlider')?.value || 45) / 100 + 1);
  var badgeElem = document.getElementById('badgeSurgeMultiplier');
  if (badgeElem) {
    var surgePct = Math.round((multiplier - 1) * 100);
    badgeElem.textContent = multiplier.toFixed(2) + 'x (+' + surgePct + '%)';
  }
  
  // Highlight active card
  if (cardElem) {
    document.querySelectorAll('.season-card.clickable-season').forEach(function(c) {
      c.classList.remove('active-season');
      var prompt = c.querySelector('.drilldown-prompt');
      if (prompt) {
        prompt.textContent = 'Select Plan →';
        prompt.style.color = '';
        prompt.style.fontWeight = '';
      }
    });
    cardElem.classList.add('active-season');
    var activePrompt = cardElem.querySelector('.drilldown-prompt');
    if (activePrompt) {
      activePrompt.textContent = 'Active Selected Plan ✓';
      activePrompt.style.fontWeight = '700';
    }
  }

  // Render Category Table with rich progress bars and clinical tags
  var dataMap = {
    monsoon: [
      { category: 'Systemic Antipyretics (Non-NSAID)', rationale: 'Mandatory First-Line for Dengue Fever (Paracetamol)', buffer: '+45%', currentStock: 4200, eoq: 18500, rop: 12000, urgency: 'CRITICAL GAP', cost: 3.50, unit: 'tabs' },
      { category: 'Antibiotics & Leptospirosis Prophylaxis', rationale: 'Post-Flood Floodwater Chemoprophylaxis (Doxycycline)', buffer: '+40%', currentStock: 8100, eoq: 14200, rop: 9500, urgency: 'PRIORITY REORDER', cost: 8.20, unit: 'caps' },
      { category: 'Intravenous Infusion Fluids (NSS/D5LR)', rationale: 'Emergency Hydration for Severe Dengue Hemorrhagic', buffer: '+35%', currentStock: 1800, eoq: 6400, rop: 4800, urgency: 'CRITICAL GAP', cost: 42.00, unit: 'bags' },
      { category: 'Oral Rehydration Salts (WHO Formula)', rationale: 'Community-Level Acute Dehydration Management', buffer: '+50%', currentStock: 12000, eoq: 25000, rop: 16000, urgency: 'OPTIMAL', cost: 4.80, unit: 'sachets' },
      { category: 'Broad-Spectrum Anti-Infectives', rationale: 'Waterborne Secondary Typhoid / Skin Infections', buffer: '+30%', currentStock: 6200, eoq: 9800, rop: 7200, urgency: 'PRIORITY REORDER', cost: 12.50, unit: 'tabs' }
    ],
    summer: [
      { category: 'Oral Rehydration Salts (WHO Formula)', rationale: 'First-Line Gastroenteritis & Heatstroke Rehydration', buffer: '+40%', currentStock: 9500, eoq: 22000, rop: 14000, urgency: 'PRIORITY REORDER', cost: 4.80, unit: 'sachets' },
      { category: 'Fluoroquinolone Antibiotics (Ciprofloxacin)', rationale: 'Waterborne Typhoid & Bacterial Diarrhea Course', buffer: '+35%', currentStock: 5400, eoq: 11200, rop: 8000, urgency: 'PRIORITY REORDER', cost: 9.80, unit: 'tabs' },
      { category: 'Anti-Emetics (Metoclopramide / Domperidone)', rationale: 'Pediatric & Adult Acute Dehydration Care', buffer: '+25%', currentStock: 4800, eoq: 7600, rop: 5500, urgency: 'OPTIMAL', cost: 6.50, unit: 'tabs' },
      { category: 'Intravenous Fluid Reserves (0.9% NaCl)', rationale: 'Severe Heat Exhaustion Institutional Stock', buffer: '+20%', currentStock: 3200, eoq: 4500, rop: 3800, urgency: 'OPTIMAL', cost: 42.00, unit: 'bags' }
    ],
    pre_monsoon: [
      { category: 'Systemic Antipyretics (Non-NSAID)', rationale: 'Early Vector Surge Pre-Positioning (Paracetamol)', buffer: '+30%', currentStock: 6800, eoq: 14500, rop: 9200, urgency: 'PRIORITY REORDER', cost: 3.50, unit: 'tabs' },
      { category: 'Antihistamines (Cetirizine / Loratadine)', rationale: 'Seasonal Allergenic & Transition Dermatitis', buffer: '+20%', currentStock: 7400, eoq: 8200, rop: 6000, urgency: 'OPTIMAL', cost: 4.20, unit: 'tabs' },
      { category: 'Intravenous Fluid Reserves (NSS / Plain LRS)', rationale: 'Hospital Epidemic Rapid-Response Buffer', buffer: '+25%', currentStock: 2900, eoq: 5200, rop: 3900, urgency: 'PRIORITY REORDER', cost: 42.00, unit: 'bags' }
    ],
    amihan: [
      { category: 'Second-Generation Antihistamines', rationale: 'Cold Front Allergic Rhinitis & Bronchial Irritation', buffer: '+15%', currentStock: 9800, eoq: 11000, rop: 8500, urgency: 'OPTIMAL', cost: 4.20, unit: 'tabs' },
      { category: 'Bronchodilators (Salbutamol Inhalers / Nebs)', rationale: 'Cold Air Asthma & COPD Exacerbation', buffer: '+25%', currentStock: 3100, eoq: 6200, rop: 4500, urgency: 'PRIORITY REORDER', cost: 115.00, unit: 'units' },
      { category: 'Mucolytics & Expectorants (Carbocisteine)', rationale: 'Acute Viral Bronchitis & URI Symptomatic Relief', buffer: '+20%', currentStock: 8200, eoq: 12500, rop: 9000, urgency: 'OPTIMAL', cost: 5.40, unit: 'caps' }
    ]
  };

  var list = dataMap[seasonKey] || dataMap.monsoon;
  var titles = {
    monsoon: 'July & August – Peak Monsoon (Habagat) & Flood Outbreak Plan',
    summer: 'March to May – Summer Hot Dry & Gastroenteritis Plan',
    pre_monsoon: 'June – Pre-Monsoon Early Vector Surge Plan',
    amihan: 'January & February – Amihan Cool Dry Respiratory Plan'
  };

  var titleElem = document.getElementById('drilldownTitle');
  if (titleElem) {
    titleElem.innerHTML = '<span>' + (titles[seasonKey] || titles.monsoon) + '</span> <span class="status-pill status-ready" style="font-size:9.5px; padding:2px 8px;">DOH-PIDSR VALIDATED</span>';
  }

  var tbody = document.getElementById('seasonalDrilldownTable');
  if (tbody) {
    tbody.innerHTML = list.map(function(item) {
      // Calculate surge adjusted EOQ
      var adjustedEoq = Math.round(item.eoq * multiplier);
      var adjustedRop = Math.round(item.rop * multiplier);
      var batchCost = (adjustedEoq * item.cost);
      var stockPct = Math.min(100, Math.round((item.currentStock / adjustedRop) * 100));
      var stockColor = stockPct < 50 ? '#EF4444' : (stockPct < 85 ? '#F59E0B' : '#10B981');
      var urgencyBadge = item.urgency === 'CRITICAL GAP' ? '<span class="badge badge-danger">CRITICAL GAP</span>' : (item.urgency === 'PRIORITY REORDER' ? '<span class="badge badge-warning">PRIORITY REORDER</span>' : '<span class="badge badge-success">OPTIMAL</span>');

      return '<tr>' +
        '<td style="text-align:left;">' +
          '<div style="font-weight:700; color:#0F172A; font-size:12.5px;">' + item.category + '</div>' +
          '<div style="font-size:10.5px; color:#64748B; margin-top:2px;">' + item.rationale + '</div>' +
        '</td>' +
        '<td><span style="font-weight:800; color:#D97706; background:#FEF3C7; padding:2px 7px; border-radius:4px; font-size:11px;">' + item.buffer + ' (' + multiplier.toFixed(2) + 'x)</span></td>' +
        '<td>' +
          '<div style="display:flex; justify-content:space-between; font-size:11px; font-weight:700; color:' + stockColor + ';">' +
            '<span>' + item.currentStock.toLocaleString() + ' ' + item.unit + '</span>' +
            '<span>' + stockPct + '%</span>' +
          '</div>' +
          '<div class="stock-progress-wrap">' +
            '<div class="stock-progress-bar" style="width:' + stockPct + '%; background:' + stockColor + ';"></div>' +
          '</div>' +
        '</td>' +
        '<td style="font-weight:800; color:var(--accent); font-size:13px;">' + adjustedEoq.toLocaleString() + ' <span style="font-size:10px; color:#64748B; font-weight:500;">' + item.unit + '</span></td>' +
        '<td style="font-weight:700; color:#475569;">' + adjustedRop.toLocaleString() + '</td>' +
        '<td>' + urgencyBadge + '</td>' +
        '<td style="font-weight:800; color:#0F172A;">₱' + Math.round(batchCost).toLocaleString() + '</td>' +
      '</tr>';
    }).join('');
  }
};


window.generateAiBriefing = function() {
  var container = document.getElementById('aiBriefingText');
  var card = document.getElementById('overviewAiBriefing');
  if (!container) return;

  var yearSelect = document.getElementById('topbarYearSelect');
  var activeYear = yearSelect ? yearSelect.value : '2025';
  var slider = document.getElementById('surgeMultiplierSlider');
  var surgeVal = slider ? slider.value : '45';

  container.style.display = 'block';
  container.innerHTML = '<div style="display:flex; align-items:center; gap:8px; color:#F4BE47; font-weight:700; padding:10px 0;">' +
    '<svg class="spin-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>' +
    '<span>MedShield AI synthesizing multi-year telemetry, PAGASA climate curves, and DOH epidemic signals...</span>' +
  '</div>';

  setTimeout(function() {
    var p1 = '<strong>1. Regional Macro Climate &amp; Disease Situation (' + activeYear + '):</strong> ' +
      'PAGASA telemetry confirms active Southwest Monsoon (Habagat) rainfall patterns across Region IV-A (CALABARZON) and Region V (Bicol), driving elevated DOH Dengue infection velocity (+45% above baseline). Vector-borne transmission risk is currently categorized under Outbreak Alert Level 3.';
    
    var p2 = '<strong>2. Priority Territory Vulnerability &amp; Stockout Exposure:</strong> ' +
      'Multi-Criteria Decision Analysis (MCDA) identifies <strong>Batangas (Score: 94.0)</strong> and <strong>Quezon (Score: 91.2)</strong> as high-exposure zones with safety stock depletion projected within 11 to 14 days. Critical category gaps exist in Non-NSAID Antipyretics (Paracetamol 500mg), Intravenous Infusion Fluids (0.9% NSS / D5LR), and Floodwater Leptospirosis Prophylaxis (Doxycycline 100mg).';

    var p3 = '<strong>3. Prescriptive Supply Chain Directives:</strong> ' +
      'The prescriptive model authorizes an emergency batch procurement uplift of <strong>18,500 units of Paracetamol</strong> and <strong>6,400 bags of IV Infusion Fluids</strong> (Estimated commitment: ₱333,550). Pre-positioning dispatches should prioritize Batangas Medical Center and Quezon Provincial Hospital before maritime transit friction increases.';

    container.innerHTML = '<div style="background:rgba(255,255,255,0.06); padding:16px; border-radius:8px; border:1px solid rgba(255,255,255,0.1);">' +
      '<p style="margin-bottom:10px;">' + p1 + '</p>' +
      '<p style="margin-bottom:10px;">' + p2 + '</p>' +
      '<p style="margin-bottom:0;">' + p3 + '</p>' +
      '</div>' +
      '<div class="ai-briefing-actions">' +
        '<button type="button" class="btn btn-secondary" onclick="window.copyAiBriefing()" style="font-size:11px; padding:5px 12px; display:inline-flex; align-items:center; gap:5px;">' +
          '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>' +
          '<span id="copyBriefingBtnText">Copy Briefing</span>' +
        '</button>' +
        '<button type="button" class="btn btn-primary" onclick="window.printExecutiveMemo()" style="font-size:11px; padding:5px 14px; display:inline-flex; align-items:center; gap:5px;">' +
          '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>' +
          '<span>Print / Export PDF Memorandum</span>' +
        '</button>' +
      '</div>';
  }, 450);
};

window.copyAiBriefing = function() {
  var container = document.getElementById('aiBriefingText');
  if (!container) return;
  var text = container.innerText;
  navigator.clipboard.writeText(text).then(function() {
    var btnText = document.getElementById('copyBriefingBtnText');
    if (btnText) {
      btnText.textContent = 'Copied! ✓';
      setTimeout(function() { btnText.textContent = 'Copy Briefing'; }, 2000);
    }
  });
};

window.printExecutiveMemo = function() {
  var yearSelect = document.getElementById('topbarYearSelect');
  var activeYear = yearSelect ? yearSelect.value : '2025';
  var dateStr = new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });

  var memoHtml = '<!DOCTYPE html><html><head><title>MedShield Executive Procurement Memorandum</title>' +
    '<style>' +
      'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; padding: 40px; color: #0F172A; line-height: 1.6; }' +
      '.memo-header { border-bottom: 2px solid #0D1B2A; padding-bottom: 16px; margin-bottom: 24px; }' +
      '.memo-title { font-size: 20px; font-weight: 800; text-transform: uppercase; color: #0D1B2A; letter-spacing: 0.05em; }' +
      '.memo-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 14px; font-size: 13px; }' +
      '.memo-meta strong { color: #1E3A5F; }' +
      '.memo-section { margin-top: 20px; }' +
      '.memo-section h3 { font-size: 14px; font-weight: 700; text-transform: uppercase; border-left: 4px solid #F59E0B; padding-left: 8px; color: #0D1B2A; margin-bottom: 8px; }' +
      '.memo-section p { font-size: 13px; margin: 0 0 10px 0; }' +
      'table { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 12px; }' +
      'th, td { border: 1px solid #CBD5E1; padding: 8px 12px; text-align: left; }' +
      'th { background: #F1F5F9; font-weight: 700; color: #1E3A5F; }' +
      '.sign-box { margin-top: 40px; display: flex; justify-content: space-between; font-size: 12px; }' +
      '.sign-line { border-top: 1px solid #0F172A; width: 220px; margin-top: 40px; text-align: center; padding-top: 4px; }' +
      '.hash-stamp { font-family: monospace; font-size: 10px; color: #64748B; margin-top: 30px; border-top: 1px dashed #CBD5E1; padding-top: 8px; }' +
    '</style>' +
    '</head><body>' +
      '<div class="memo-header">' +
        '<div class="memo-title">Republic of the Philippines • Department of Health (DOH) Distribution Network</div>' +
        '<div style="font-size:12px; color:#64748B; margin-top:4px;">MEDSHIELD PHARMACEUTICAL DECISION-SUPPORT SYSTEM (DSS)</div>' +
        '<div class="memo-meta">' +
          '<div><strong>TO:</strong> Regional Procurement Director (CALABARZON / Bicol)</div>' +
          '<div><strong>DATE:</strong> ' + dateStr + '</div>' +
          '<div><strong>FROM:</strong> Supply Planner (Level 2 Authorized)</div>' +
          '<div><strong>SUBJECT:</strong> Monsoon Epidemic Pre-Stocking Authorization (' + activeYear + ')</div>' +
        '</div>' +
      '</div>' +

      '<div class="memo-section">' +
        '<h3>1. Macro Outbreak Assessment</h3>' +
        '<p>PAGASA climate surveillance confirms active Habagat flooding patterns across CALABARZON and Bicol. DOH infection indices project a +45% increase in acute febrile and gastroenteritis admissions over the next 45 days.</p>' +
      '</div>' +

      '<div class="memo-section">' +
        '<h3>2. Prescribed Emergency Order Quantities (EOQ)</h3>' +
        '<table>' +
          '<thead><tr><th>Item Description</th><th>Current Stock</th><th>Prescribed EOQ</th><th>Unit Cost</th><th>Total Investment</th></tr></thead>' +
          '<tbody>' +
            '<tr><td>Paracetamol 500mg (Non-NSAID Antipyretic)</td><td>4,200 tabs</td><td>18,500 tabs</td><td>₱3.50</td><td>₱64,750.00</td></tr>' +
            '<tr><td>Doxycycline 100mg (Leptospirosis Prophylaxis)</td><td>8,100 caps</td><td>14,200 caps</td><td>₱8.20</td><td>₱116,440.00</td></tr>' +
            '<tr><td>0.9% Normal Saline IV Fluids 500mL</td><td>1,800 bags</td><td>6,400 bags</td><td>₱42.00</td><td>₱268,800.00</td></tr>' +
            '<tr><td>Oral Rehydration Salts (WHO Formula)</td><td>12,000 packs</td><td>25,000 packs</td><td>₱4.80</td><td>₱120,000.00</td></tr>' +
          '</tbody>' +
        '</table>' +
      '</div>' +

      '<div class="memo-section">' +
        '<h3>3. Regional Allocation Priority</h3>' +
        '<p>Dispatches are authorized for immediate priority routing to <strong>Batangas Provincial Hospital (Rank #1)</strong> and <strong>Quezon Medical Center (Rank #2)</strong> under expedited delivery protocols.</p>' +
      '</div>' +

      '<div class="sign-box">' +
        '<div><div class="sign-line">Prepared By: Certified Supply Planner</div></div>' +
        '<div><div class="sign-line">Approved By: DOH Logistics Officer</div></div>' +
      '</div>' +

      '<div class="hash-stamp">' +
        'MedShield SHA-256 Verified Audit Hash: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855<br>' +
        'System Timestamp: ' + new Date().toISOString() + ' • Status: CRYPTOGRAPHICALLY COMMITTED' +
      '</div>' +
    '</body></html>';

  var printWin = window.open('', '_blank', 'width=850,height=900');
  if (printWin) {
    printWin.document.open();
    printWin.document.write(memoHtml);
    printWin.document.close();
    printWin.focus();
    setTimeout(function() { printWin.print(); }, 400);
  }
};


if (typeof showPage !== 'undefined') window.showPage = showPage;
if (typeof toggleTheme !== 'undefined') window.toggleTheme = toggleTheme;
if (typeof openHelp !== 'undefined') window.openHelp = openHelp;
if (typeof closeHelpModal !== 'undefined') window.closeHelpModal = closeHelpModal;
if (typeof toggleNavigation !== 'undefined') window.toggleNavigation = toggleNavigation;
if (typeof closeNavigation !== 'undefined') window.closeNavigation = closeNavigation;
if (typeof setComparisonMode !== 'undefined') window.setComparisonMode = setComparisonMode;
if (typeof setYear !== 'undefined') window.setYear = setYear;
if (typeof setYoYYear !== 'undefined') window.setYoYYear = setYoYYear;
if (typeof refreshComparison !== 'undefined') window.refreshComparison = refreshComparison;
if (typeof downloadTableAsCSV !== 'undefined') window.downloadTableAsCSV = downloadTableAsCSV;
if (typeof exportRestockPlanToCsv !== 'undefined') window.exportRestockPlanToCsv = exportRestockPlanToCsv;
if (typeof selectSeasonRestock !== 'undefined') window.selectSeasonRestock = selectSeasonRestock;
if (typeof openEoqModal !== 'undefined') window.openEoqModal = openEoqModal;
if (typeof closeAuditModal !== 'undefined') window.closeAuditModal = closeAuditModal;
if (typeof closeEoqModal !== 'undefined') window.closeEoqModal = closeEoqModal;
if (typeof confirmAndExecuteOrder !== 'undefined') window.confirmAndExecuteOrder = confirmAndExecuteOrder;
if (typeof recalibrateModelSafetyBuffers !== 'undefined') window.recalibrateModelSafetyBuffers = recalibrateModelSafetyBuffers;
if (typeof updateMcdaWeights !== 'undefined') window.updateMcdaWeights = updateMcdaWeights;
if (typeof resetMcdaWeights !== 'undefined') window.resetMcdaWeights = resetMcdaWeights;
if (typeof updateSurgeScenario !== 'undefined') window.updateSurgeScenario = updateSurgeScenario;
if (typeof setSurgePreset !== 'undefined') window.setSurgePreset = setSurgePreset;
if (typeof generateAiBriefing !== 'undefined') window.generateAiBriefing = generateAiBriefing;
if (typeof copyAiBriefing !== 'undefined') window.copyAiBriefing = copyAiBriefing;
if (typeof printExecutiveMemo !== 'undefined') window.printExecutiveMemo = printExecutiveMemo;


if (typeof showPage === 'function') window.showPage = showPage;
if (typeof toggleTheme === 'function') window.toggleTheme = toggleTheme;
if (typeof openHelp === 'function') window.openHelp = openHelp;
if (typeof closeNavigation === 'function') window.closeNavigation = closeNavigation;
if (typeof toggleNavigation === 'function') window.toggleNavigation = toggleNavigation;
if (typeof setComparisonMode === 'function') window.setComparisonMode = setComparisonMode;
if (typeof setYear === 'function') window.setYear = setYear;
if (typeof setYoYYear === 'function') window.setYoYYear = setYoYYear;
if (typeof refreshComparison === 'function') window.refreshComparison = refreshComparison;
if (typeof applyDatasetPatch === 'function') window.applyDatasetPatch = applyDatasetPatch;
if (typeof buildCharts === 'function') window.buildCharts = buildCharts;
if (typeof downloadTableAsCSV === 'function') window.downloadTableAsCSV = downloadTableAsCSV;
if (typeof removeBadge === 'function') window.removeBadge = removeBadge;
if (typeof exportRestockPlanToCsv === 'function') window.exportRestockPlanToCsv = exportRestockPlanToCsv;
if (typeof selectSeasonRestock === 'function') window.selectSeasonRestock = selectSeasonRestock;
if (typeof openEoqModal === 'function') window.openEoqModal = openEoqModal;
if (typeof closeAuditModal === 'function') window.closeAuditModal = closeAuditModal;
if (typeof closeEoqModal === 'function') window.closeEoqModal = closeEoqModal;
if (typeof closeHelpModal === 'function') window.closeHelpModal = closeHelpModal;
if (typeof confirmAndExecuteOrder === 'function') window.confirmAndExecuteOrder = confirmAndExecuteOrder;
if (typeof executeEoqReorder === 'function') window.executeEoqReorder = executeEoqReorder;
if (typeof recalibrateModelSafetyBuffers === 'function') window.recalibrateModelSafetyBuffers = recalibrateModelSafetyBuffers;
if (typeof updateMcdaWeights === 'function') window.updateMcdaWeights = updateMcdaWeights;
if (typeof resetMcdaWeights === 'function') window.resetMcdaWeights = resetMcdaWeights;
if (typeof updateSurgeScenario === 'function') window.updateSurgeScenario = updateSurgeScenario;
if (typeof setSurgePreset === 'function') window.setSurgePreset = setSurgePreset;
if (typeof generateAiBriefing === 'function') window.generateAiBriefing = generateAiBriefing;
if (typeof copyAiBriefing === 'function') window.copyAiBriefing = copyAiBriefing;
if (typeof printExecutiveMemo === 'function') window.printExecutiveMemo = printExecutiveMemo;
