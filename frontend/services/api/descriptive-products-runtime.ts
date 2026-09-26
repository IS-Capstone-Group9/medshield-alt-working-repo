import { descriptivePortfolio } from './descriptive-products'

// All inline callbacks below are existing DASHBOARD_GLOBAL_HANDLERS.
export const PRODUCT_PRIORITIZATION_SCRIPT = `const descriptivePortfolio = ${descriptivePortfolio.toString()};` + String.raw`
let productCohortPercent = 'all';
let productExportRows = [];

function configureProductYearControls(pageName) {
  const filterBar = document.getElementById('filterBar');
  if (filterBar && pageName === 'products') filterBar.style.display = 'flex';
  const yearWrap = document.getElementById('singleYearWrap');
  if (yearWrap) yearWrap.style.display = 'none';
  const rangeWrap = document.getElementById('customDateRangeWrap');
  if (rangeWrap) rangeWrap.style.display = descriptivePeriod === 'custom' ? 'flex' : 'none';
  const compareWrap = document.getElementById('descriptiveComparisonWrap');
  const supportsComparison = pageName === 'overview' || pageName === 'revenue';
  if (compareWrap) compareWrap.style.display = supportsComparison ? 'inline-flex' : 'none';
  if (!supportsComparison) {
    comparisonMode = 'single';
    const select = document.getElementById('descriptiveComparisonSelect');
    if (select) select.value = 'single';
  }
}

function renderProductPrioritizationTimeline() {
  const page = document.getElementById('page-products');
  if (!page || !page.classList.contains('active')) return;
  page.querySelectorAll('[data-aggregate-scope]').forEach(node => node.remove());
  // The reference markup contains illustrative recommendation rows, not warehouse evidence.
  page.querySelectorAll('table').forEach(table => {
    if (table.id !== 'productTable') {
      table.replaceChildren();
      const cell = table.createTBody().insertRow().insertCell();
      cell.textContent = 'Product–region recommendations are not published.';
    }
  });
  const hasSource = Boolean(salesSectorsData && Array.isArray(salesSectorsData.rows));
  const source = hasSource ? salesSectorsData.rows : [];
  // Preserve the source grain. A monthly aggregate cannot satisfy a partial-month filter.
  let unboundedRows = 0;
  const rows = source.filter(row => {
    const period = String(row.period || String(row.date || '').slice(0, 7));
    if (descriptiveIsFuturePeriod(period) || !descriptivePeriodIncludes(row.date || period)) return false;
    if (descriptivePeriod === 'custom' && !row.date) {
      const monthEnd = new Date(Date.UTC(Number(period.slice(0, 4)), Number(period.slice(5, 7)), 0)).toISOString().slice(0, 10);
      if (period + '-01' < customDateStart || monthEnd > customDateEnd) { unboundedRows++; return false; }
    }
    return true;
  });
  const result = descriptivePortfolio(rows, 'positive_sales_candidate');
  const rate = ['5', '10', '20'].includes(String(productCohortPercent)) ? Number(productCohortPercent) : 100;
  const count = Math.ceil(result.products.length * rate / 100);
  const cohort = result.products.slice(0, count);
  productExportRows = cohort;
  const top = cohort.slice(0, 10);
  let scope = document.getElementById('productPriorityScope');
  if (!scope) {
    scope = document.createElement('section'); scope.id = 'productPriorityScope'; scope.className = 'chart-card';
    scope.style.cssText = 'margin-bottom:20px;font-size:14px;line-height:1.6';
    page.prepend(scope);
  }
  scope.replaceChildren();
  const title = document.createElement('h2'); title.textContent = 'Observed product sales'; title.style.fontSize = '18px';
  const note = document.createElement('p');
  note.textContent = !hasSource ? 'Product data is loading or unavailable. No observed sales total can be reported yet.' : descriptivePeriodLabel() + ' · Candidate source labels; medicine identities and pack conversions require review. '
    + 'Recorded revenue: ' + formatCurrency(result.revenue) + ' across ' + result.products.length + ' labels. '
    + result.estimatedRows + ' gap-estimated rows excluded. Historical contract/product allocations may still be present in this candidate source. '
    + (unboundedRows ? unboundedRows + ' monthly rows cannot be assigned to the exact requested dates and are excluded; select whole months. ' : '')
    + (result.unavailableRows ? result.unavailableRows + ' rows have unavailable revenue. ' : '')
    + 'ABC policy candidate — CEO approval pending. Positive eligible sales basis: ' + formatCurrency(result.contributionTotal) + '. Returns remain in net revenue. '
    + (result.abcAvailable ? 'Candidate ABC: cumulative positive sales ≤80% A, >80–95% B, >95% C; full selected population before cohort filtering.'
      : 'ABC unavailable: a reconciled positive-sales contribution basis is required.');
  const label = document.createElement('label'); label.htmlFor = 'productCohortSelect'; label.textContent = 'Positive-sales-ranked cohort ';
  const select = document.createElement('select'); select.id = 'productCohortSelect'; select.className = 'topbar-select';
  for (const [value, text] of [['5','Top 5% of labels'],['10','Top 10% of labels'],['20','Top 20% of labels'],['all','All labels']]) {
    select.add(new Option(text, value, false, String(productCohortPercent) === value));
  }
  select.onchange = () => setProductCohort(select.value);
  const exportButton = document.createElement('button'); exportButton.type = 'button'; exportButton.className = 'btn btn-secondary';
  exportButton.textContent = 'Export selected rows'; exportButton.onclick = exportProductPriorityCSV;
  const displayNote = document.createElement('p'); displayNote.textContent = cohort.length + ' labels in cohort. Charts show up to 10; table shows up to 100. Export contains the complete cohort.';
  scope.append(title, note, label, select, exportButton, displayNote);
  const setTitle = (id, heading, sub) => {
    const card = document.getElementById(id)?.closest('.chart-card');
    const title = card?.querySelector('.chart-title');
    if (title) title.textContent = heading;
    card?.querySelectorAll('.chart-subtitle').forEach(subtitle => { subtitle.textContent = sub; });
    const badge = card?.querySelector('.chart-badge'); if (badge) badge.textContent = 'Candidate';
  };
  const options = { responsive: true, maintainAspectRatio: false, animation: false, plugins: { legend: { position: 'bottom' } } };
  const chart = (id, config) => {
    const canvas = document.getElementById(id); if (!canvas) return;
    const old = Chart.getChart(canvas); if (old) old.destroy();
    new Chart(canvas, config);
  };
  chart('productBarChart', { type: 'bar', data: { labels: top.map(row => row.name), datasets: [{ label: 'Observed net sales (₱)', data: top.map(row => row.revenue), backgroundColor: '#1E3A5F' }] }, options });
  setTitle('productBarChart', 'Top products by observed net sales', 'Source labels ranked within the selected period.');
  const classes = result.abcAvailable ? ['A','B','C'] : ['Unclassified'];
  chart('abcChart', { type: 'bar', data: { labels: classes, datasets: [{ label: 'Source product labels', data: classes.map(code => result.products.filter(row => row.abc === code).length), backgroundColor: ['#1E3A5F','#D97706','#64748B'] }] }, options });
  setTitle('abcChart', 'Candidate ABC — positive sales', result.abcAvailable ? 'Positive eligible sales population; thresholds 80% and 95%; policy approval pending.' : 'Classification held until the revenue basis is suitable.');
  chart('productBubbleChart', { type: 'scatter', data: { datasets: [{ label: 'Net sales and observed coverage', data: top.map(row => ({ x: row.revenue, y: row.observedMonths, name: row.name })), backgroundColor: '#1E3A5F' }] }, options: { ...options, plugins: { ...options.plugins, tooltip: { callbacks: { label: context => context.raw.name + ': ' + formatCurrency(context.raw.x) + ', ' + context.raw.y + ' observed months' } } }, scales: { x: { title: { display: true, text: 'Observed net sales (₱)' } }, y: { beginAtZero: true, ticks: { precision: 0 }, title: { display: true, text: 'Months with source records' } } } } });
  setTitle('productBubbleChart', 'Revenue and observed coverage', 'Coverage is the number of months with source records; no clinical priority is inferred.');
  chart('paretoCurveChart', { type: 'line', data: { labels: cohort.map(row => row.rank), datasets: [{ label: 'Cumulative positive sales (%)', data: cohort.map(row => row.cumulativeShare), borderColor: '#D97706', pointRadius: 0, spanGaps: false }] }, options: { ...options, scales: { x: { title: { display: true, text: 'Positive sales rank' } }, y: { min: 0, max: 100, title: { display: true, text: 'Cumulative share of full population (%)' } } } } });
  setTitle('paretoCurveChart', 'Pareto cumulative revenue', result.abcAvailable ? 'The cohort does not reset the denominator to 100%.' : 'Unavailable while ABC revenue basis is unresolved.');
  const table = document.getElementById('productTable');
  if (table) {
    if (!table.parentElement.hasAttribute('data-product-scroll')) {
      const wrap = document.createElement('div'); wrap.dataset.productScroll = '';
      wrap.style.cssText = 'max-height:560px;overflow:auto';
      wrap.setAttribute('tabindex', '0'); wrap.setAttribute('role', 'region'); wrap.setAttribute('aria-label', 'Scrollable product sales table');
      table.parentElement.insertBefore(wrap, table); wrap.append(table);
    }
    table.replaceChildren();
    const head = table.createTHead().insertRow();
    ['Rank','Source product label','Net sales (₱)','Positive sales (₱)','Returns (₱)','Contribution share (%)','Cumulative share (%)','Candidate ABC','Observed months','Product provenance'].forEach(text => {
      const th = document.createElement('th'); th.scope = 'col'; th.textContent = text; head.append(th);
    });
    const body = table.createTBody();
    for (const row of cohort.slice(0, 100)) {
      const tr = body.insertRow();
      [row.rank, row.name, row.revenue.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), row.positiveSales.toFixed(2), row.returnsValue.toFixed(2), row.share == null ? 'Unavailable' : row.share.toFixed(2), row.cumulativeShare == null ? 'Unavailable' : row.cumulativeShare.toFixed(2), row.abc, row.observedMonths, row.productEvidence].forEach(value => { tr.insertCell().textContent = String(value); });
    }
    if (!cohort.length) { const cell = body.insertRow().insertCell(); cell.colSpan = 10; cell.textContent = hasSource ? 'No observed product sales for the selected scope.' : 'Product data is loading or unavailable.'; }
    const card = table.closest('.chart-card');
    card?.querySelectorAll('.chart-subtitle').forEach(sub => { sub.textContent = 'Observed source-label revenue; not verified medicine-demand quantities.'; });
  }
  const insight = page.querySelector('.dss-insight-card');
  if (insight) { insight.replaceChildren(); const p = document.createElement('p'); p.textContent = 'Use revenue concentration to review commercial performance. Product identity, clinical classification, disease effects, inventory levels and procurement decisions require separate validated evidence.'; insight.append(p); }
  const sub = document.getElementById('topbar-sub'); if (sub) sub.textContent = 'Descriptive product sales · Databricks candidate data';
}

function setProductCohort(value) {
  productCohortPercent = ['5','10','20','all'].includes(String(value)) ? String(value) : 'all';
  renderProductPrioritizationTimeline();
}

function exportProductPriorityCSV() {
  const escape = value => {
    let text = String(value == null ? '' : value);
    if (typeof value === 'string' && /^[\s]*[=+@\-]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  };
  const release = salesSectorsData?.source?.release || {};
  const rows = [['Rank','Source product label','Net sales PHP','Positive sales PHP','Returns PHP','Contribution share percent','Cumulative share percent','Candidate ABC','Observed months','Reporting scope','Evidence','Product provenance','Policy status','Dataset ID','Fact Delta version','Transformation policy'],
    ...productExportRows.map(row => [row.rank,row.name,row.revenue,row.positiveSales,row.returnsValue,row.share,row.cumulativeShare,row.abc,row.observedMonths,descriptivePeriodLabel(),'Databricks candidate source labels',row.productEvidence,'positive_sales_candidate_pending_CEO',release.dataset_id || 'Unavailable',release.fact_delta_version ?? 'Unavailable',release.policy_version || 'Unavailable'])];
  const url = URL.createObjectURL(new Blob([rows.map(row => row.map(escape).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = 'medshield-observed-product-sales.csv'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Preserve the product renderer when the legacy table builder runs after navigation.
setTimeout(() => {
  const table = document.getElementById('productTable'); if (!table) return;
  new MutationObserver(() => {
    if (document.getElementById('page-products')?.classList.contains('active') && table.querySelector('th')?.textContent !== 'Rank') {
      setTimeout(renderProductPrioritizationTimeline, 0);
    }
  }).observe(table, { childList: true, subtree: true });
}, 0);
`;
