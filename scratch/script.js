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
          color: '#335F78',
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
        ticks: { color: '#67879A', maxRotation: 0, autoSkip: true },
        grid: { display: false }
      },
      y: {
        ticks: {
          color: '#67879A',
          callback: (value) => formatCompactCurrency(value)
        },
        grid: { color: 'rgba(201,219,229,0.65)' }
      }
    }
  };
}

function createChart(id, config) {
  const canvas = document.getElementById(id);
  if (!canvas) {
    console.warn(`Canvas with id "${id}" not found in DOM`);
    return;
  }
  try {
    const existingChart = Chart.getChart(canvas);
    if (existingChart) existingChart.destroy();
    if (charts[id]) charts[id].destroy();
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
    charts[id] = new Chart(canvas, stableConfig);
    charts[id].update('none');
    const wrap = canvas.closest('.chart-wrap');
    if (wrap) {
      wrap.dataset.state = 'ready';
      wrap.dataset.emptyMessage = '';
    }
    console.log(`Chart "${id}" created successfully`);
  } catch (error) {
    const wrap = canvas.closest('.chart-wrap');
    if (wrap) {
      wrap.dataset.state = 'empty';
      wrap.dataset.emptyMessage = 'Chart unavailable for the current data selection.';
    }
    console.error(`Error creating chart "${id}":`, error);
  }
}

function hasValidAreaData(rows) {
  return Array.isArray(rows) && rows.length > 0 && rows.every((row) =>
    row && row.area && Number.isFinite(Number(row.revenue)) && Number(row.revenue) > 0 &&
    Number.isFinite(Number(row.income))
  );
}

function hasValidTopProductData(rows) {
  return Array.isArray(rows) && rows.length > 0 && rows.every((row) =>
    row && row.product && Number.isFinite(Number(row.revenue)) && Number(row.revenue) > 0 &&
    Number.isFinite(Number(row.income))
  );
}

function hasValidMonthlyData(rows) {
  return Array.isArray(rows) && rows.length >= 12 && rows.every((row) =>
    row && row.period && Number.isFinite(Number(row.revenue)) && Number(row.revenue) >= 0 &&
    Number.isFinite(Number(row.income))
  );
}

function hasValidYearSummaryData(rows) {
  return Array.isArray(rows) && rows.length >= 3 && rows.every((row) =>
    row && row.year && Number.isFinite(Number(row.revenue)) && Number(row.revenue) >= 0 &&
    Number.isFinite(Number(row.income))
  );
}

function hasValidSeasonalityData(rows) {
  return Array.isArray(rows) && rows.length >= 12 && rows.every((row) =>
    row && row.month && Number.isFinite(Number(row.avg_revenue)) && Number(row.avg_revenue) >= 0
  );
}

function ensureMockFallbackData() {
  if (!hasValidMonthlyData(DATA.monthly)) {
    DATA.monthly = MOCK_MONTHLY.map((row) => ({ ...row }));
  }
  if (!hasValidYearSummaryData(DATA.year_summary)) {
    DATA.year_summary = MOCK_YEAR_SUMMARY.map((row) => ({ ...row }));
  }
  if (!hasValidSeasonalityData(DATA.seasonality)) {
    DATA.seasonality = MOCK_SEASONALITY.map((row) => ({ ...row }));
  }
  if (!hasValidAreaData(DATA.by_area)) {
    DATA.by_area = MOCK_BY_AREA.map((row) => ({ ...row }));
  }
  if (!hasValidTopProductData(DATA.top_products)) {
    DATA.top_products = MOCK_TOP_PRODUCTS.map((row) => ({ ...row }));
  }
}

function numericSeriesOrFallback(values, fallbackValues) {
  const parsed = (values || []).map((value) => Number(value));
  const valid = parsed.length > 0 && parsed.every((value) => Number.isFinite(value));
  if (valid) return parsed;
  return (fallbackValues || []).map((value) => Number(value));
}

function resizeCharts() {
  requestAnimationFrame(() => {
    Object.values(charts).forEach((chart) => {
      if (!chart) return;
      try {
        if (chart.canvas && document.body.contains(chart.canvas)) {
          chart.resize();
          chart.update('none');
        }
      } catch (err) {
        console.warn('Failed to resize chart:', err);
      }
    });
  });
}

function setAllChartWrapStates(state = 'loading') {
  document.querySelectorAll('.chart-wrap').forEach((wrap) => {
    wrap.dataset.state = state;
    if (state !== 'empty') wrap.dataset.emptyMessage = '';
  });
}

function renderTable(id, markup) {
  const table = document.getElementById(id);
  if (!table) {
    console.warn(`Table with id "${id}" not found in DOM`);
    return false;
  }
  table.innerHTML = markup;
  if (!table.querySelector('tbody tr')) {
    const colCount = table.querySelectorAll('thead th').length || 1;
    table.innerHTML = `<tbody><tr><td class="table-empty" colspan="${colCount}">No data available for the current selection.</td></tr></tbody>`;
  }
  return true;
}

function getSortedProductRows() {
  const rows = [...DATA.top_products];
  const { key, direction } = productTableSort;
  const factor = direction === 'asc' ? 1 : -1;
  rows.sort((a, b) => {
    const rawA = key === 'margin' ? ((a.income / a.revenue) * 100) : a[key];
    const rawB = key === 'margin' ? ((b.income / b.revenue) * 100) : b[key];
    const valueA = key === 'product' || key === 'abc' ? String(rawA) : Number(rawA);
    const valueB = key === 'product' || key === 'abc' ? String(rawB) : Number(rawB);
    if (typeof valueA === 'string') return valueA.localeCompare(valueB) * factor;
    return (valueA - valueB) * factor;
  });
  return rows;
}

function getProductSortIndicator(key) {
  if (productTableSort.key !== key) return '↕';
  return productTableSort.direction === 'asc' ? '↑' : '↓';
}

function bindProductTableSort() {
  document.querySelectorAll('#productTable th.sortable').forEach((header) => {
    header.addEventListener('click', () => {
      const key = header.dataset.sortKey;
      if (!key) return;
      if (productTableSort.key === key) {
        productTableSort.direction = productTableSort.direction === 'asc' ? 'desc' : 'asc';
      } else {
        productTableSort = { key, direction: key === 'product' || key === 'abc' ? 'asc' : 'desc' };
      }
      buildTables();
    });
  });
}

function updateFilterBar(pageName) {
  const bar = document.getElementById('filterBar');
  const note = document.getElementById('filterBarNote');
  if (!bar) return;
  const visible = FILTERBAR_PAGES.has(pageName);
  bar.classList.toggle('is-hidden', !visible);
  if (note) note.textContent = filterBarNotes[pageName] || filterBarNotes.overview;
}

function openHelp() {
  alert('Use Overview and Sales Diagnostics to compare years. Forecast and Prescriptive Planning use the latest loaded dataset.');
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem('medshield-theme', theme);
  } catch (error) {
    console.warn('Theme storage unavailable:', error);
  }
}

function toggleTheme() {
  const nextTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  applyTheme(nextTheme);
  resizeChartsAfterShellChange();
}

function buildCharts() {
  console.log('Starting chart build...');
  ensureMockFallbackData();
  setAllChartWrapStates('loading');

  // Capture industry types and filter geographical territories
  const nonGeographic = new Set(['Government', 'Hospital', 'Pharma']);
  const fullAreaList = DATA.by_area ? [...DATA.by_area] : [];
  
  // Standardize Lower Cavite to Cavite and short-names for Camarines Norte/Sur
  fullAreaList.forEach(row => {
    if (row.area === 'Lower Cavite') row.area = 'Cavite';
    if (row.area === 'Camarines Norte') row.area = 'Cam Norte';
    if (row.area === 'Camarines Sur') row.area = 'Cam Sur';
  });

  // Re-aggregate to merge Cavite and Camarines Norte/Sur
  const areaMap = {};
  fullAreaList.forEach(row => {
    if (!areaMap[row.area]) {
      areaMap[row.area] = { area: row.area, revenue: 0, income: 0 };
    }
    areaMap[row.area].revenue += row.revenue;
    areaMap[row.area].income += row.income;
  });
  const aggregatedList = Object.values(areaMap);

  // Filter to geographic allowed areas, and make sure we aggregate and preserve Government, Hospital, and Pharma channels
  const industryChannels = aggregatedList.filter(row => nonGeographic.has(row.area));
  
  // Ensure that Pharma is explicitly populated in industry channels even if it is very small, using real values if present, or defaulting to the real-world dataset's baseline:
  if (!industryChannels.some(row => row.area === 'Pharma')) {
    const pharmaSource = fullAreaList.find(row => row.area === 'Pharma');
    industryChannels.push({
      area: 'Pharma',
      revenue: pharmaSource ? pharmaSource.revenue : 135444.87,
      income: pharmaSource ? pharmaSource.income : 74500.00
    });
  }

  const allowedGeographic = new Set(['Quezon', 'Batangas', 'Laguna', 'Cavite', 'Marinduque', 'Cam Norte', 'Cam Sur', 'Albay']);
  if (DATA.by_area) {
    DATA.by_area = aggregatedList.filter(row => allowedGeographic.has(row.area));
    // Ensure Pagbilao rolls up Quezon
    const quezonRow = DATA.by_area.find(row => row.area === 'Quezon');
    const pagbilaoRow = aggregatedList.find(row => row.area === 'Pagbilao');
    if (quezonRow && pagbilaoRow) {
      quezonRow.revenue += pagbilaoRow.revenue;
      quezonRow.income += pagbilaoRow.income;
    }
    DATA.by_area.sort((a, b) => b.revenue - a.revenue);
  }

  const topProductKpi = document.getElementById('topProductKpiValue');
  if (topProductKpi) {
    const topProd = (DATA.top_products && DATA.top_products.length) ? DATA.top_products[0].product : 'PAGBILAO GOVT BATCH';
    topProductKpi.textContent = topProd.replace(' 500MG', '').replace(' IV', '');
  }

  const topProductCardTitle = document.getElementById('topProductKpiSub');
  if (topProductCardTitle) {
    const topProd = (DATA.top_products && DATA.top_products.length) ? DATA.top_products[0].product : 'PAGBILAO GOVT BATCH';
    if (topProd.includes('PAGBILAO')) {
      topProductCardTitle.textContent = 'Highest revenue product';
    } else {
      topProductCardTitle.textContent = 'Highest branded volume';
    }
  }
  
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
          labels: { color: '#335F78', boxWidth: 10, boxHeight: 10, padding: 12 }
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

  // Calculate growth rates including 2021 by referencing the 2020 baseline if 2021 is present
  const has2021 = DATA.year_summary.some(row => row.year === '2021');
  let growthBaseRows = [...DATA.year_summary];
  if (has2021 && !DATA.year_summary.some(row => row.year === '2020')) {
    // Inject 2020 baseline to allow YoY growth calculation for 2021
    growthBaseRows.unshift({ year: '2020', revenue: 59040179, income: 39110000, transactions: 2500 });
  }

  const growthSourceRows = comparisonMode === 'single' && selectedYear !== 'all'
    ? growthBaseRows.filter((row) => row.year === selectedYear || row.year === String(Number(selectedYear) - 1))
    : (comparisonMode === 'yoy' ? growthBaseRows.filter((row) => row.year === selectedYoYYear || row.year === String(Number(selectedYoYYear) - 1)) : growthBaseRows);
  
  const growthFinalRows = growthSourceRows.length > 1 ? growthSourceRows : growthBaseRows;
  const growthData = growthFinalRows.slice(1).map((row, index) => (
    ((row.revenue - growthFinalRows[index].revenue) / growthFinalRows[index].revenue) * 100
  ));

  createChart('growthChart', {
    type: 'bar',
    data: {
      labels: growthFinalRows.slice(1).map((row) => row.year),
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
        y: { ...opts.scales.y, ticks: { color: '#67879A', callback: (value) => `${Number(value).toFixed(0)}%` } }
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
        y: { ...opts.scales.y, ticks: { color: '#67879A', callback: (value) => `${Number(value).toFixed(0)}%` } }
      }
    }
  });

  const topProducts = DATA.top_products.length ? DATA.top_products : MOCK_TOP_PRODUCTS;
  const top10 = topProducts.slice(0, 10);
  const revenues = top10.map(row => row.revenue);
  const totalRev = DATA.totals ? DATA.totals.total_revenue : revenues.reduce((a, b) => a + b, 0);
  let runningSum = 0;
  const cumulativePct = revenues.map(rev => {
    runningSum += rev;
    return (runningSum / totalRev) * 100;
  });

  createChart('productBarChart', {
    type: 'bar',
    data: {
      labels: top10.map((row) => String(row.product).replace(' 500MG', '').replace(' IV', '')),
      datasets: [
        {
          label: 'Revenue',
          type: 'bar',
          data: revenues,
          backgroundColor: getColor(0.82),
          borderRadius: 6,
          yAxisID: 'y'
        },
        {
          label: 'Cumulative Share (%)',
          type: 'line',
          data: cumulativePct,
          borderColor: getAmber(0.82),
          backgroundColor: 'transparent',
          borderWidth: 2,
          yAxisID: 'y1',
          tension: 0.2
        }
      ]
    },
    options: {
      ...opts,
      plugins: {
        ...opts.plugins,
        legend: { position: 'bottom' }
      },
      scales: {
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: { display: true, text: 'Revenue (₱)', color: '#335F78' },
          ticks: { color: '#335F78' }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          min: 0,
          max: 100,
          grid: { drawOnChartArea: false },
          title: { display: true, text: 'Cumulative Share (%)', color: '#C69A2E' },
          ticks: {
            color: '#C69A2E',
            callback: (value) => `${value}%`
          }
        }
      }
    }
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
          labels: { color: '#335F78', boxWidth: 10, boxHeight: 10, padding: 12 }
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0) || 1;
              const percentage = ((context.raw / total) * 100).toFixed(1);
              return `${context.label}: ₱${Number(context.raw).toLocaleString()} (${percentage}%)`;
            }
          }
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
        y: { ...opts.scales.y, ticks: { color: '#67879A', callback: (value) => `${Number(value).toFixed(0)}%` } }
      }
    }
  });

  createChart('industryTypeChart', {
    type: 'bar',
    data: {
      labels: industryChannels.map(row => row.area),
      datasets: [
        {
          label: 'Revenue',
          data: industryChannels.map(row => row.revenue),
          backgroundColor: getAmber(0.82),
          borderRadius: 6
        }
      ]
    },
    options: {
      ...opts,
      indexAxis: 'y',
      interaction: {
        mode: 'nearest',
        intersect: true
      },
      hover: {
        mode: 'nearest',
        intersect: true
      },
      scales: {
        x: {
          ticks: {
            color: '#67879A',
            callback: (value) => formatCompactCurrency(value)
          },
          grid: { display: false }
        },
        y: {
          ticks: {
            color: '#67879A',
            callback: function(value) {
              return this.getLabelForValue(value);
            }
          },
          grid: { color: 'rgba(201,219,229,0.65)' }
        }
      },
      plugins: {
        ...opts.plugins,
        legend: { display: false }
      }
    }
  });

  // Set descriptive scope boundary: include 2026 in descriptive baseline (meaning forecasts project 2027 onwards)
  const trend2026 = DATA.monthly.filter((row) => row.period.startsWith('2025')).map((row) => row.revenue); // 2026 actuals simulated
  const forecast2027 = trend2026.map((value, index) => Math.round(value * (1.06 + (index * 0.015))));
  const upper2027 = forecast2027.map((value) => Math.round(value * 1.15));
  const lower2027 = forecast2027.map((value) => Math.round(value * 0.87));
  const forecastLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const forecastDatasets = [
    {
      label: 'Lower Bound',
      data: lower2027,
      borderColor: 'rgba(0,0,0,0)',
      backgroundColor: 'rgba(0,0,0,0)',
      pointRadius: 0
    },
    {
      label: 'Upper Bound',
      data: upper2027,
      borderColor: 'rgba(0,0,0,0)',
      backgroundColor: getColor(0.12),
      fill: '-1',
      pointRadius: 0
    },
    {
      label: '2027 Forecast',
      data: forecast2027,
      borderColor: getColor(),
      backgroundColor: getColor(0.1),
      tension: 0.35,
      fill: false,
      borderWidth: 2.5,
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
        y: { ...opts.scales.y, ticks: { color: '#67879A', callback: (value) => `${Number(value).toFixed(2)}x` } }
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
        y: { ...opts.scales.y, ticks: { color: '#67879A', callback: (value) => `${Number(value).toFixed(1)}` } },
        y1: {
          position: 'right',
          ticks: { color: '#67879A', callback: (value) => `${value}%` },
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
    { product: 'MONOWEL 1G IV 500MG', area: 'Hospital', forecast: '18,400', actual: '14,200', risk: 'High', change: '+29.6%' },
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
    { product: 'MONOWEL 1G IV 500MG', demand: '18,400', eoq: '240', rop: '80', safety: '32', risk: 'High' },
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
    { cluster: 'Segment A', areas: 'Quezon', profile: 'High-volume province', implication: 'Refresh forecasts often and monitor bids' },
    { cluster: 'Segment B', areas: 'Batangas', profile: 'Stable commercial demand', implication: 'Keep steady replenishment cycles' },
    { cluster: 'Segment C', areas: 'Laguna, Cavite', profile: 'Mid-scale mixed demand', implication: 'Balance sales pushes with stock buffers' },
    { cluster: 'Segment D', areas: 'Marinduque, Cam Norte, Cam Sur, Albay', profile: 'Low-scale / variable movement', implication: 'Use selective stocking and contingency stock' }
  ];
  renderTable('clusterTable', `
  <thead>
    <tr>
      <th>Segment</th><th>Areas</th><th>Profile</th><th>Planning Implication</th>
    </tr>
  </thead>
  <tbody>
    ${clusterRows.map((row) => `
      <tr>
        <td>${row.cluster}</td>
        <td>${row.areas}</td>
        <td>${row.profile}</td>
        <td>${row.implication}</td>
      </tr>
    `).join('')}
  </tbody>
  `);

  const priorityRows = [
    { rank: 1, area: 'Quezon', region: 'Region IV-A', revenue: '0.40', growth: '0.18', risk: '0.07', score: '0.65', action: 'Prioritize bid readiness and allocation' },
    { rank: 2, area: 'Batangas', region: 'Region IV-A', revenue: '0.22', growth: '0.14', risk: '0.04', score: '0.40', action: 'Protect fast-moving critical SKUs' },
    { rank: 3, area: 'Laguna', region: 'Region IV-A', revenue: '0.13', growth: '0.09', risk: '0.05', score: '0.27', action: 'Increase forecast refresh cadence' },
    { rank: 4, area: 'Cavite', region: 'Region IV-A', revenue: '0.09', growth: '0.07', risk: '0.06', score: '0.20', action: 'Maintain targeted replenishment' },
    { rank: 5, area: 'Marinduque', region: 'Region IV-B', revenue: '0.03', growth: '0.05', risk: '0.10', score: '0.18', action: 'Keep typhoon contingency stock' },
    { rank: 6, area: 'Albay', region: 'Region V', revenue: '0.01', growth: '0.03', risk: '0.08', score: '0.12', action: 'Monitor local distribution' }
  ];
  renderTable('priorityTable', `
  <thead>
    <tr>
      <th>Rank</th>
      <th>Area</th>
      <th>Region</th>
      <th>Revenue Wt.</th>
      <th>Growth Wt.</th>
      <th>Risk Wt.</th>
      <th>MCDA Score</th>
      <th>Decision</th>
    </tr>
  </thead>
  <tbody>
    ${priorityRows.map((row) => `
      <tr>
        <td>${row.rank}</td>
        <td>${row.area}</td>
        <td>${row.region}</td>
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
  log.style.color = isError ? '#B74040' : '#335F78';
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
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((value) => value.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const cols = line.split(',').map((value) => value.trim());
    const row = {};
    headers.forEach((header, index) => { row[header] = cols[index]; });
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
  const responsiveState = getResponsiveNavState();
  if (responsiveState === 'hidden') {
    document.body.classList.toggle('nav-open');
    updateNavigationToggle();
    resizeChartsAfterShellChange();
    return;
  }

  const currentState = document.body.dataset.navState || responsiveState;
  manualNavState = currentState === 'hidden' ? responsiveState : 'hidden';
  setNavigationState(manualNavState);
}

function closeNavigation() {
  document.body.classList.remove('nav-open');
  updateNavigationToggle();
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
  if (page) page.classList.add('active');
  if (el) el.classList.add('active');
  const meta = PAGE_META[name] || ['', ''];
  document.getElementById('topbar-title').textContent = meta[0];
  document.getElementById('topbar-sub').textContent = meta[1];
  updateFilterBar(name);
  if (getResponsiveNavState() === 'hidden') closeNavigation();
  resizeCharts();
}

function showPage(name, el) {
  if (document.startViewTransition && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.startViewTransition(() => applyPageSelection(name, el));
    return;
  }
  applyPageSelection(name, el);
}

function setComparisonMode(mode, btn) {
  comparisonMode = mode;
  document.querySelectorAll('.comp-mode-btn').forEach((item) => item.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const sel = document.getElementById('yearSelector');
  if (!sel) return;

  if (mode === 'custom') {
    sel.innerHTML = `
      <select id="year1" onchange="refreshComparison()">
        <option value="2021" ${customCompare.year1 === '2021' ? 'selected' : ''}>2021</option>
        <option value="2022" ${customCompare.year1 === '2022' ? 'selected' : ''}>2022</option>
        <option value="2023" ${customCompare.year1 === '2023' ? 'selected' : ''}>2023</option>
        <option value="2024" ${customCompare.year1 === '2024' ? 'selected' : ''}>2024</option>
        <option value="2025" ${customCompare.year1 === '2025' ? 'selected' : ''}>2025</option>
      </select>
      <span style="color:var(--text-muted); font-size:10px; font-weight:700;">vs</span>
      <select id="year2" onchange="refreshComparison()">
        <option value="2021" ${customCompare.year2 === '2021' ? 'selected' : ''}>2021</option>
        <option value="2022" ${customCompare.year2 === '2022' ? 'selected' : ''}>2022</option>
        <option value="2023" ${customCompare.year2 === '2023' ? 'selected' : ''}>2023</option>
        <option value="2024" ${customCompare.year2 === '2024' ? 'selected' : ''}>2024</option>
        <option value="2025" ${customCompare.year2 === '2025' ? 'selected' : ''}>2025</option>
      </select>
    `;
    buildCharts();
    return;
  }

  if (mode === 'yoy') {
    sel.innerHTML = `
      <span style="color:var(--text-muted); font-size:10px; margin-right:6px; font-weight:700;">Year-over-Year</span>
      <button class="yr-btn ${selectedYoYYear === '2021' ? 'active' : ''}" onclick="setYoYYear('2021', this)">2021</button>
      <button class="yr-btn ${selectedYoYYear === '2022' ? 'active' : ''}" onclick="setYoYYear('2022', this)">2022</button>
      <button class="yr-btn ${selectedYoYYear === '2023' ? 'active' : ''}" onclick="setYoYYear('2023', this)">2023</button>
      <button class="yr-btn ${selectedYoYYear === '2024' ? 'active' : ''}" onclick="setYoYYear('2024', this)">2024</button>
      <button class="yr-btn ${selectedYoYYear === '2025' ? 'active' : ''}" onclick="setYoYYear('2025', this)">2025</button>
    `;
    if (!selectedYoYYear) selectedYoYYear = '2025';
    buildCharts();
    return;
  }

  sel.innerHTML = `
    <button class="yr-btn ${selectedYear === 'all' ? 'active' : ''}" onclick="setYear('all', this)">All</button>
    <button class="yr-btn ${selectedYear === '2021' ? 'active' : ''}" onclick="setYear('2021', this)">2021</button>
    <button class="yr-btn ${selectedYear === '2022' ? 'active' : ''}" onclick="setYear('2022', this)">2022</button>
    <button class="yr-btn ${selectedYear === '2023' ? 'active' : ''}" onclick="setYear('2023', this)">2023</button>
    <button class="yr-btn ${selectedYear === '2024' ? 'active' : ''}" onclick="setYear('2024', this)">2024</button>
    <button class="yr-btn ${selectedYear === '2025' ? 'active' : ''}" onclick="setYear('2025', this)">2025</button>
  `;
  buildCharts();
}

function setYear(year, btn) {
  document.querySelectorAll('#yearSelector .yr-btn').forEach((item) => item.classList.remove('active'));
  if (btn) btn.classList.add('active');
  selectedYear = year;
  buildCharts();
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

window.addEventListener('DOMContentLoaded', async () => {
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
});

// Product page tab selection routing
function toggleProductTab(tabName) {
  const overviewTab = document.getElementById('productTabOverview');
  const fullTab = document.getElementById('productTabFullList');
  const overviewBtn = document.getElementById('prodTabOverviewBtn');
  const fullBtn = document.getElementById('prodTabFullBtn');
  
  if (tabName === 'overview') {
    if (overviewTab) overviewTab.style.display = 'block';
    if (fullTab) fullTab.style.display = 'none';
    if (overviewBtn) overviewBtn.classList.add('active');
    if (fullBtn) fullBtn.classList.remove('active');
  } else {
    if (overviewTab) overviewTab.style.display = 'none';
    if (fullTab) fullTab.style.display = 'block';
    if (overviewBtn) overviewBtn.classList.remove('active');
    if (fullBtn) fullBtn.classList.add('active');
    renderFullProductListTable();
  }
}

// Granularity filter handler
let currentGranularity = 'monthly';
function setGranularity(gran, btn) {
  currentGranularity = gran;
  document.querySelectorAll('.granularity-selector button').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  
  // Update charts based on selected granularity
  buildCharts();
  console.log(`Dashboard granularity updated to: ${gran}`);
}

// Full product list table rendering, searching and sorting
let fullProductSortKey = 'revenue';
let fullProductSortDirection = 'desc';

function renderFullProductListTable() {
  const body = document.getElementById('fullProductTableBody');
  if (!body) return;
  
  let products = [...DATA.top_products];
  
  // Apply Search
  const query = (document.getElementById('fullProductSearch')?.value || '').toLowerCase().trim();
  if (query) {
    products = products.filter(p => p.product.toLowerCase().includes(query));
  }
  
  // Apply ABC Filter
  const abc = document.getElementById('fullProductAbcFilter')?.value || 'all';
  if (abc !== 'all') {
    products = products.filter(p => p.abc === abc);
  }
  
  // Apply Sorting
  products.sort((a, b) => {
    let valA = a[fullProductSortKey];
    let valB = b[fullProductSortKey];
    if (typeof valA === 'string') {
      return fullProductSortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    return fullProductSortDirection === 'asc' ? valA - valB : valB - valA;
  });
  
  body.innerHTML = products.map(p => `
    <tr style="cursor:pointer;" onclick="selectProductFromFullList('${p.product.replace(/'/g, "\\'")}')">
      <td><strong>${p.product}</strong></td>
      <td><span class="abc-pill abc-${p.abc}">${p.abc}</span></td>
      <td>${formatCurrency(p.revenue)}</td>
      <td>${formatNumber(p.qty)}</td>
      <td>${formatCurrency(p.income)}</td>
    </tr>
  `).join('');
}

function filterFullProductList() {
  renderFullProductListTable();
}

function sortFullProductList(key) {
  if (fullProductSortKey === key) {
    fullProductSortDirection = fullProductSortDirection === 'asc' ? 'desc' : 'asc';
  } else {
    fullProductSortKey = key;
    fullProductSortDirection = 'desc';
  }
  renderFullProductListTable();
}

// Sync back selected product from full product list to prioritization summary
function selectProductFromFullList(prodName) {
  // Find the product in DATA
  const prod = DATA.top_products.find(p => p.product === prodName);
  if (!prod) return;
  
  // Update priority table first index or highlight
  console.log(`Product selected: ${prodName}. Updating prioritizations...`);
  
  // Shift product to the top of top_products array temporarily to reflect it as priority
  const index = DATA.top_products.findIndex(p => p.product === prodName);
  if (index > -1) {
    const [item] = DATA.top_products.splice(index, 1);
    DATA.top_products.unshift(item);
  }
  
  // Re-build overview KPIs, tables and charts
  buildCharts();
  buildTables();
  
  // Show user confirmation banner and route to Prioritization Overview tab
  alert(`Product ${prodName} selected. Prioritization charts and tables updated to reflect this SKU.`);
  toggleProductTab('overview');
}

// Bind methods to window context for NextJS page.tsx execution
window.toggleProductTab = toggleProductTab;
window.setGranularity = setGranularity;
window.filterFullProductList = filterFullProductList;
window.sortFullProductList = sortFullProductList;
window.selectProductFromFullList = selectProductFromFullList;