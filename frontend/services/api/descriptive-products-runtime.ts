import { descriptivePortfolio } from './descriptive-products'
import { productAbcDistribution, productChartCurrency, productChartLabel } from './product-chart-view'

// Controls use listeners inside the dashboard execution closure.
export const PRODUCT_PRIORITIZATION_SCRIPT = `const descriptivePortfolio = ${descriptivePortfolio.toString()};
const productAbcDistribution = ${productAbcDistribution.toString()};
const productChartLabel = ${productChartLabel.toString()};
const productChartCurrency = ${productChartCurrency.toString()};` + String.raw`
let productCohortPercent = 'all';
let productCategory = 'All';
let productExportRows = [];
let productTableSearch = '';
let productTablePage = 1;
let productTableScope = '';
let productTableSource = null;
let productTableHasSource = false;
let productTableBasisAvailable = false;
const productSalesGroupNames = { A: 'A · Largest contributors', B: 'B · Next contributors', C: 'C · Remaining contributors', Unclassified: 'Unclassified · Not grouped' };

function installProductClarityStyles() {
  if (document.getElementById('productClarityStyles')) return;
  const style = document.createElement('style'); style.id = 'productClarityStyles';
  style.textContent = '#page-products .product-table-controls{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:12px 0}#page-products .product-table-controls input{min-width:0;max-width:100%;width:240px}#page-products #productTable{width:100%;min-width:0;table-layout:fixed}#page-products #productTable th,#page-products #productTable td{white-space:normal;overflow-wrap:anywhere;vertical-align:top}#page-products #productTable th:nth-child(1){width:7%}#page-products #productTable th:nth-child(2){width:25%}#page-products #productTable th:nth-child(3){width:17%}#page-products #productTable th:nth-child(4){width:15%}#page-products #productTable th:nth-child(5){width:18%}#page-products #productTable th:nth-child(6){width:18%}#page-products .product-catalog-evidence dl{display:block;margin:10px 0}#page-products .product-catalog-evidence dt{font-weight:600;margin-top:8px}#page-products .product-catalog-evidence dd{margin:2px 0;overflow-wrap:anywhere}#page-products .product-exact-values{margin:10px 0;padding-left:18px;font-size:12px;line-height:1.6;overflow-wrap:anywhere}#page-products #productConcentrationDetails{margin:16px 0;padding:14px;border:1px solid var(--border);border-radius:8px;background:var(--bg-surface)}#page-products #productConcentrationDetails>summary{cursor:pointer;font-weight:600}#page-products #productConcentrationDetails>.chart-card{margin-top:14px;min-width:0}@media(max-width:560px){#page-products #productTable th,#page-products #productTable td{font-size:10px;padding:7px 4px}#page-products .product-table-controls input{width:100%}#page-products #productTable .btn{font-size:10px;padding:6px 4px;white-space:normal}#page-products .product-analytical-layout{grid-template-columns:minmax(0,1fr)}#page-products .product-abc-stack{min-width:0}}';
  style.textContent += '#page-products #productTable .product-catalog-evidence{min-width:0;max-width:100%;text-align:left}#page-products #productTable td:nth-child(2),#page-products #productTable td:nth-child(5){text-align:left}@media(max-width:560px){#page-products #productTable thead{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}#page-products #productTable tbody{display:block}#page-products #productTable tbody tr{display:grid;grid-template-columns:minmax(0,1fr);margin-bottom:12px;border:1px solid var(--border);border-radius:6px}#page-products #productTable tbody td{display:grid;grid-template-columns:100px minmax(0,1fr);text-align:left;gap:8px;padding:8px;min-width:0}#page-products #productTable tbody td::before{content:attr(data-label);font-weight:600;color:var(--text-muted)}#page-products #productTable tbody td[colspan]{display:block}#page-products #productTable .product-catalog-evidence{width:100%}#page-products #productTable .product-catalog-evidence dl{max-height:none}}';
  document.head.append(style);
}

// Draw only labels that fit inside a bar. The visible exact-value keys retain small values.
const productDirectValues = { id: 'productDirectValues', afterDatasetsDraw(chart) {
  const ctx = chart.ctx; ctx.save(); ctx.font = '11px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  chart.data.datasets.forEach((dataset, datasetIndex) => {
    if (!chart.isDatasetVisible(datasetIndex)) return;
    chart.getDatasetMeta(datasetIndex).data.forEach((bar, index) => {
      const value = dataset.data[index]; if (value == null || !Number.isFinite(Number(value)) || Number(value) === 0) return;
      const text = chart.canvas.id === 'productAbcShareChart' ? Number(value).toFixed(1) + '%' : productChartCurrency(value);
      const width = Math.abs(bar.x - bar.base); if (width < ctx.measureText(text).width + 10) return;
      ctx.fillStyle = datasetIndex === 3 ? '#1E293B' : '#FFFFFF'; ctx.fillText(text, (bar.x + bar.base) / 2, bar.y);
    });
  }); ctx.restore();
} };

function renderProductPerformanceTable() {
  const table = document.getElementById('productTable'); if (!table) return;
  const query = productTableSearch.trim().toLocaleLowerCase();
  const filtered = productExportRows.filter(row => !query || [row.name, ...row.aliases].some(value => String(value).toLocaleLowerCase().includes(query)));
  const pages = Math.max(1, Math.ceil(filtered.length / 20)); productTablePage = Math.min(pages, Math.max(1, productTablePage));
  const start = (productTablePage - 1) * 20, displayed = filtered.slice(start, start + 20);
  const status = document.getElementById('productTableStatus');
  if (status) status.textContent = filtered.length ? 'Showing ' + (start + 1) + '–' + (start + displayed.length) + ' of ' + filtered.length + (query ? ' matching names' : ' selected names') + '. Export includes all ' + productExportRows.length + ' selected names.' : !productTableHasSource ? 'Product data is loading or unavailable.' : query ? 'No product names match this search. Export still includes the complete selected cohort.' : 'No observed product sales for the selected scope.';
  const previous = document.getElementById('productTablePrevious'), next = document.getElementById('productTableNext');
  if (previous) previous.disabled = productTablePage <= 1;
  if (next) next.disabled = productTablePage >= pages;
  table.replaceChildren();
  const caption = table.createCaption(); caption.className = 'sr-only'; caption.textContent = 'Selected product names ranked by positive sales. Search and paging affect only this table.';
  const head = table.createTHead().insertRow();
  const headings = ['Rank','Product name from sales records','Net sales (₱)','Share of positive amounts (%)','Sales group (ABC)','Details'];
  headings.forEach(text => { const th = document.createElement('th'); th.scope = 'col'; th.textContent = text; head.append(th); });
  const body = table.createTBody();
  const money = value => Number(value).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const release = salesSectorsData?.source?.release || {};
  for (const row of displayed) {
    const tr = body.insertRow();
    [row.rank, row.name, money(row.revenue), productTableBasisAvailable && row.share != null ? row.share.toFixed(2) : 'Unavailable', productSalesGroupNames[row.abc] || productSalesGroupNames.Unclassified].forEach((value,index) => { const cell = tr.insertCell(); cell.textContent = String(value); cell.dataset.label = headings[index]; });
    const cell = tr.insertCell(), details = document.createElement('details'), summary = document.createElement('summary');
    details.className = 'product-catalog-evidence'; summary.textContent = 'View evidence'; summary.setAttribute('aria-label', 'View evidence for ' + row.name); details.append(summary);
    cell.dataset.label = 'Details';
    const evidence = document.createElement('dl');
    for (const [name, value] of [
      ['Positive amounts', productTableBasisAvailable ? formatCurrency(row.positiveSales) : 'Unavailable: contribution basis does not reconcile'],
      ['Negative adjustments', productTableBasisAvailable ? formatCurrency(row.returnsValue) : 'Unavailable: contribution basis does not reconcile'],
      ['Cumulative positive share', productTableBasisAvailable && row.cumulativeShare != null ? row.cumulativeShare.toFixed(2) + '%' : 'Unavailable'],
      ['Months with source records', row.observedMonths], ['Category', row.metadata.category || 'Unclassified'],
      ['Product provenance', row.productEvidence], ['Reporting ID', row.id], ['Identity status', row.metadata.identity_status || 'needs_review'],
      ['Item kind', row.metadata.item_kind || 'unknown'], ['Packaging', [row.metadata.packaging_unit,row.metadata.pack_count,row.metadata.contained_unit].filter(Boolean).join(' / ') || 'Unknown'],
      ['Dataset ID', release.dataset_id || 'Unavailable'], ['Fact version', release.fact_delta_version ?? 'Unavailable'], ['Transformation policy', release.policy_version || 'Unavailable'],
    ]) { const term = document.createElement('dt'); term.textContent = name; const description = document.createElement('dd'); description.textContent = String(value); evidence.append(term, description); }
    details.append(evidence);
    const limit = document.createElement('p'); limit.textContent = 'Negative adjustments are financial records, not verified physical returns. Months with records do not prove complete reporting or approved medicine demand.'; details.append(limit);
    const aliasesTitle = document.createElement('p'); aliasesTitle.textContent = row.aliases.length + ' original alias' + (row.aliases.length === 1 ? '' : 'es'); details.append(aliasesTitle);
    row.aliases.forEach(alias => { const value = document.createElement('p'); value.textContent = alias; details.append(value); });
    if (row.lineage.length) { const lineage = document.createElement('p'); lineage.textContent = 'Source-record lineage: ' + row.lineage.join('; '); details.append(lineage); }
    const inspect = document.createElement('button'); inspect.type = 'button'; inspect.className = 'btn btn-secondary'; inspect.textContent = 'Inspect records'; inspect.setAttribute('aria-label', 'Inspect records for ' + row.name); inspect.onclick = () => openDiagnosticDrilldown({ product_id: row.id, category: productCategory, label: row.name }); details.append(inspect);
    cell.append(details);
  }
  if (!displayed.length) { const cell = body.insertRow().insertCell(); cell.colSpan = 6; cell.textContent = status?.textContent || 'No observed product sales for the selected scope.'; }
}

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
  installProductClarityStyles();
  page.querySelectorAll('[data-aggregate-scope]').forEach(node => node.remove());
  // The reference markup contains illustrative recommendation rows, not warehouse evidence.
  page.querySelectorAll('table').forEach(table => {
    if (table.id !== 'productTable') {
      const card = table.closest('.chart-card');
      if (card?.previousElementSibling?.classList.contains('section-title')) card.previousElementSibling.remove();
      (card || table).remove();
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
  const result = descriptivePortfolio(rows, 'positive_sales_candidate', productCategory);
  const rate = ['5', '10', '20'].includes(String(productCohortPercent)) ? Number(productCohortPercent) : 100;
  const count = Math.ceil(result.products.length * rate / 100);
  const cohort = result.products.slice(0, count);
  productExportRows = cohort;
  const tableScope = descriptivePeriodLabel() + '|' + productCategory + '|' + productCohortPercent;
  if (productTableScope !== tableScope || productTableSource !== salesSectorsData) productTablePage = 1;
  productTableScope = tableScope; productTableSource = salesSectorsData;
  productTableHasSource = hasSource; productTableBasisAvailable = result.abcAvailable;
  const top = cohort.slice(0, 10);
  const thresholdLabel = result.products.find(row => row.cumulativeShare != null && row.cumulativeShare >= 80);
  const returnLabels = result.products.filter(row => row.returnsValue < 0).length;
  let scope = document.getElementById('productPriorityScope');
  if (!scope) {
    scope = document.createElement('section'); scope.id = 'productPriorityScope'; scope.className = 'chart-card';
    scope.style.cssText = 'margin-bottom:20px;font-size:14px;line-height:1.6';
    page.prepend(scope);
  }
  scope.replaceChildren();
  const title = document.createElement('h2'); title.textContent = 'Product sales and catalog review'; title.style.fontSize = '18px';
  const finding = document.createElement('p'); finding.id = 'productFinding'; finding.className = 'analytical-finding';
  finding.textContent = !hasSource ? 'Product data is loading or unavailable.'
    : !result.products.length ? 'No observed product sales in the selected period and category.'
      : !result.abcAvailable ? 'Positive-sales concentration is unavailable until the contribution basis is reconciled.'
        : thresholdLabel ? thresholdLabel.rank + ' of ' + result.products.length + ' product names account for ' + thresholdLabel.cumulativeShare.toFixed(1) + '% of positive amounts.'
          : 'No positive-sales concentration can be reported for this selection.';
  const reviewPrompt = document.createElement('p'); reviewPrompt.id = 'productReviewPrompt'; reviewPrompt.className = 'analytical-review-prompt';
  reviewPrompt.textContent = !hasSource || !result.products.length ? 'Select a period with observed source records to review the portfolio.'
    : 'Review ' + (result.unresolvedCount ? result.unresolvedCount + ' unresolved source-label groups' : 'catalog identities')
      + (returnLabels ? ' and ' + returnLabels + ' names with negative adjustments' : '') + ' before using the ranking for inventory decisions.';
  const note = document.createElement('p');
  const summaryNote = document.createElement('p');
  summaryNote.textContent = !hasSource ? 'Product data is loading or unavailable.' : descriptivePeriodLabel() + ' · ' + productCategory + ' · Recorded net sales: ' + formatCurrency(result.revenue) + ' across ' + result.products.length + ' names.';
  const policyNote = document.createElement('p'); policyNote.textContent = 'ABC policy candidate — CEO approval pending. Source labels; product identities require review.';
  note.textContent = !hasSource ? 'Product data is loading or unavailable. No observed sales total can be reported yet.' : descriptivePeriodLabel() + ' · Candidate source labels; medicine identities and pack conversions require review. '
    + productCategory + ' category; services remain in financial totals. Unresolved identity: ' + result.unresolvedCount + ' groups, ' + formatCurrency(result.unresolvedRevenue) + '. ' + 'Recorded net sales: ' + formatCurrency(result.revenue) + ' across ' + result.products.length + ' names. '
    + result.estimatedRows + ' gap-estimated rows excluded. Historical contract/product allocations may still be present in this candidate source. '
    + (unboundedRows ? unboundedRows + ' monthly rows cannot be assigned to the exact requested dates and are excluded; select whole months. ' : '')
    + (result.unavailableRows ? result.unavailableRows + ' rows have unavailable revenue. ' : '')
    + 'ABC policy candidate — CEO approval pending. Positive eligible sales basis: ' + formatCurrency(result.contributionTotal) + '. Negative adjustments remain in net sales; they do not establish physical stock returns. '
    + (result.abcAvailable ? 'Candidate ABC: A includes the label reaching 80% of positive sales; B includes subsequent labels through the one reaching 95%; C is the remainder. Full selected population before cohort filtering.'
      : 'ABC unavailable: a reconciled positive-sales contribution basis is required.');
  const label = document.createElement('label'); label.htmlFor = 'productCohortSelect'; label.textContent = 'Positive-sales-ranked cohort ';
  const select = document.createElement('select'); select.id = 'productCohortSelect'; select.className = 'topbar-select';
  for (const [value, text] of [['5','Top 5% of labels'],['10','Top 10% of labels'],['20','Top 20% of labels'],['all','All labels']]) {
    select.add(new Option(text, value, false, String(productCohortPercent) === value));
  }
  select.onchange = () => setProductCohort(select.value);
  const exportButton = document.createElement('button'); exportButton.type = 'button'; exportButton.className = 'btn btn-secondary';
  exportButton.textContent = 'Export selected rows'; exportButton.onclick = exportProductPriorityCSV;
  exportButton.disabled = !hasSource || !productExportRows.length;
  const displayNote = document.createElement('p'); displayNote.id = 'productDisplayScope'; displayNote.textContent = 'Ranking: top ' + top.length + ' of ' + cohort.length + ' selected names. Sales groups: all ' + result.products.length + ' names in this period and category. Pareto and export include the complete selected cohort. Search and 20-row paging affect only the table.';
  const readCue = document.createElement('p'); readCue.id = 'productSalesReadCue'; readCue.textContent = 'Positive amounts plus signed negative adjustments give net sales. Negative adjustments are financial records, not verified physical returns.';
  const categoryLabel = document.createElement('label'); categoryLabel.htmlFor = 'productCategorySelect'; categoryLabel.textContent = 'Category ';
  const categorySelect = document.createElement('select'); categorySelect.id = 'productCategorySelect'; categorySelect.className = 'topbar-select';
  ['All','Medical','Non-Medical','Unclassified'].forEach(value => categorySelect.add(new Option(value,value,false,value===productCategory)));
  categorySelect.onchange = () => { productCategory = categorySelect.value; renderProductPrioritizationTimeline(); };
  const controls=document.createElement('div');controls.style.cssText='display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:12px 0';controls.append(categoryLabel,categorySelect,label,select,exportButton);
  const evidenceDetails = document.createElement('details');
  const evidenceSummary = document.createElement('summary'); evidenceSummary.textContent = 'Evidence, ABC method and display limits';
  evidenceDetails.append(evidenceSummary, note);
  evidenceDetails.append(reviewPrompt, readCue, displayNote);
  scope.append(title, finding, summaryNote, policyNote, controls, evidenceDetails);
  // Keep the primary sales and full-population share comparisons side by side.
  let analyticalLayout = document.getElementById('productAnalyticalLayout');
  if (!analyticalLayout) {
    analyticalLayout = document.createElement('section'); analyticalLayout.id = 'productAnalyticalLayout';
    analyticalLayout.className = 'product-analytical-layout'; analyticalLayout.setAttribute('aria-label', 'Product ranking and ABC concentration');
    scope.after(analyticalLayout);
  }
  let abcStack = document.getElementById('productAbcStack');
  if (!abcStack) { abcStack = document.createElement('div'); abcStack.id = 'productAbcStack'; abcStack.className = 'product-abc-stack'; }
  const rankingCard = document.getElementById('productBarChart')?.closest('.chart-card');
  const abcCard = document.getElementById('abcChart')?.closest('.chart-card');
  const previousGrid = rankingCard?.closest('.chart-grid-2');
  if (rankingCard && rankingCard.parentElement !== analyticalLayout) analyticalLayout.append(rankingCard);
  if (abcStack.parentElement !== analyticalLayout) analyticalLayout.append(abcStack);
  let concentration = document.getElementById('productConcentrationDetails');
  if (!concentration) {
    concentration = document.createElement('details'); concentration.id = 'productConcentrationDetails';
    const summary = document.createElement('summary'); summary.textContent = 'Supporting detail: product counts and cumulative sales'; concentration.append(summary);
    concentration.addEventListener('toggle', () => { if (concentration.open) requestAnimationFrame(() => ['abcChart','paretoCurveChart'].forEach(id => Chart.getChart(document.getElementById(id))?.resize())); });
    analyticalLayout.after(concentration);
  }
  if (abcCard && abcCard.parentElement !== concentration) concentration.append(abcCard);
  const paretoCard = document.getElementById('paretoCurveChart')?.closest('.chart-card');
  if (paretoCard && paretoCard.parentElement !== concentration) concentration.append(paretoCard);
  if (previousGrid && !previousGrid.children.length) previousGrid.remove();
  const setTitle = (id, heading, sub, fullNote) => {
    const card = document.getElementById(id)?.closest('.chart-card');
    const title = card?.querySelector('.chart-title');
    if (title) title.textContent = heading;
    card?.querySelectorAll('.chart-subtitle').forEach(subtitle => { subtitle.textContent = sub; });
    const badge = card?.querySelector('.chart-badge'); if (badge) badge.textContent = 'Candidate';
    if (card) {
      let details = card.querySelector('[data-product-chart-notes]');
      if (!fullNote) { details?.remove(); return; }
      if (!details) { details = document.createElement('details'); details.dataset.productChartNotes = ''; card.append(details); }
      const summary = document.createElement('summary'); summary.textContent = 'Chart notes';
      const body = document.createElement('p'); body.textContent = fullNote;
      details.replaceChildren(summary, body);
    }
  };
  const options = { responsive: true, maintainAspectRatio: false, animation: false, plugins: { legend: { position: 'top', align: 'start', labels: { usePointStyle: true, boxWidth: 8, padding: 12, font: { size: 11 } } } } };
  const chart = (id, config) => {
    const canvas = document.getElementById(id); if (!canvas) return;
    canvas.style.minHeight = '0';
    canvas.style.maxWidth = '100%';
    canvas.setAttribute('role', 'img');
    const old = Chart.getChart(canvas); if (old) old.destroy();
    const wrap = canvas.closest('.chart-wrap');
    if (wrap) wrap.hidden = result.products.length === 0;
    if (!result.products.length) return;
    new Chart(canvas, config);
  };
  const barCanvas = document.getElementById('productBarChart');
  const barWrap = barCanvas?.closest('.chart-wrap');
  const compact = (barWrap?.clientWidth || page.clientWidth) < 560;
  const tooltipWidth = compact ? 34 : 64;
  const barLow = Math.min(0, ...top.map(row => row.returnsValue));
  const barHigh = Math.max(0, ...top.map(row => row.positiveSales));
  if (barWrap) barWrap.style.setProperty('height', Math.max(240, top.length * (compact ? 44 : 40) + 94) + 'px', 'important');
  if (barCanvas) barCanvas.setAttribute('aria-label', 'Top ' + top.length + ' product names: positive amounts and negative adjustments. Exact values follow the chart.');
  // Horizontal bar chart — product names as readable left-side row labels
  chart('productBarChart', {
    type: 'bar',
    data: {
      labels: top.map(row => row.name),
      datasets: [
        { label: 'Positive amounts (₱)', data: top.map(row => result.missingContributionRows ? null : row.positiveSales), backgroundColor: '#1E3A5F', borderRadius: 3, maxBarThickness: 25 },
        { label: 'Negative adjustments (₱)', data: top.map(row => result.missingContributionRows ? null : row.returnsValue), backgroundColor: '#C0392B', borderRadius: 3, maxBarThickness: 25 }
      ]
    },
    plugins: [productDirectValues],
    options: {
      ...options,
      indexAxis: 'y',
      onClick: (event, elements) => {
        const row = top[elements[0]?.index];
        if (row && !result.missingContributionRows) openDiagnosticDrilldown({ product_id: row.id, category: productCategory, label: row.name });
      },
      plugins: { ...options.plugins, tooltip: { callbacks: {
        title: contexts => productChartLabel(contexts[0]?.label || '', tooltipWidth, Number.MAX_SAFE_INTEGER),
        label: context => context.dataset.label + ': ' + formatCurrency(Number(context.raw))
      } } },
      scales: {
        x: { beginAtZero: true, stacked: true, min: barLow * 1.08, max: barHigh > 0 ? barHigh * 1.08 : barLow < 0 ? 0 : 1, ticks: { callback: productChartCurrency, maxTicksLimit: compact ? 4 : 6 }, grid: { display: true }, title: { display: true, text: 'Sales value (₱)' } },
        y: { stacked: true, ticks: { font: { size: 11 }, autoSkip: false, callback: function(value) { return productChartLabel(this.getLabelForValue(value), this.chart.width < 560 ? 20 : 34); } }, grid: { display: false } }
      }
    }
  });
  setTitle('productBarChart', 'Which product names contribute the most sales?', 'Top ' + top.length + ' selected names, ranked by positive amounts.', 'Up to 10 names from the selected cohort. Positive amounts and negative adjustments share one row; their signed sum is net sales. Source identities require review. Values are unavailable when the contribution basis does not reconcile.');
  let salesValues = document.getElementById('productSalesValues');
  if (!salesValues) {
    const details = document.createElement('details'); details.id = 'productExactAmounts'; details.className = 'chart-method';
    const summary = document.createElement('summary'); summary.textContent = 'Exact amounts and negative adjustments'; details.append(summary);
    salesValues = document.createElement('ul'); salesValues.id = 'productSalesValues'; salesValues.className = 'product-exact-values'; details.append(salesValues); rankingCard?.append(details);
  }
  salesValues.replaceChildren();
  top.forEach(row => { const item = document.createElement('li'); item.textContent = row.name + ': ' + (result.missingContributionRows ? 'positive amounts and adjustments unavailable' : 'positive ' + formatCurrency(row.positiveSales) + ', negative adjustments ' + formatCurrency(row.returnsValue)) + ', net sales ' + formatCurrency(row.revenue) + '.'; salesValues.append(item); });
  barCanvas?.setAttribute('aria-describedby', 'productSalesReadCue productSalesValues');
  const classes = result.abcAvailable ? ['A','B','C','Unclassified'] : ['Unclassified'];
  chart('abcChart', { type: 'bar', data: { labels: classes.map(code => productSalesGroupNames[code]), datasets: [{ label: 'Product names', data: classes.map(code => result.products.filter(row => row.abc === code).length), backgroundColor: ['#1E3A5F','#D97706','#64748B','#CBD5E1'] }] }, options: { ...options, scales: { x: { ticks: { callback: function(value) { return classes[value]; } } }, y: { beginAtZero: true, ticks: { precision: 0 } } } } });
  const classShares = classes.map(code => code + ': ' + (result.contributionTotal > 0 ? (result.products.filter(row => row.abc === code).reduce((sum,row) => sum + row.positiveSales, 0) / result.contributionTotal * 100).toFixed(1) + '%' : 'unavailable')).join('; ');
  setTitle('abcChart', 'Candidate ABC — label counts', 'Full selected population · source-label counts.', result.abcAvailable ? 'Positive-sales shares: ' + classShares + '. The label reaching each cutoff stays in its starting class; the largest positive seller is always A. Publication approval pending.' : 'Classification held until the revenue basis is suitable; all labels shown as Unclassified.');
  const distribution = productAbcDistribution(result);
  let shareCard = document.getElementById('productAbcShareCard');
  if (!shareCard) {
    shareCard = document.createElement('section'); shareCard.id = 'productAbcShareCard'; shareCard.className = 'chart-card';
    shareCard.setAttribute('aria-labelledby', 'productAbcShareTitle');
    const header = document.createElement('div'); header.className = 'chart-header';
    const headingGroup = document.createElement('div');
    const heading = document.createElement('h3'); heading.id = 'productAbcShareTitle'; heading.className = 'chart-title'; heading.textContent = 'How concentrated are sales across product names?';
    const subtitle = document.createElement('p'); subtitle.className = 'chart-subtitle'; subtitle.textContent = 'Full selected population · two independent 100% totals.';
    headingGroup.append(heading, subtitle); header.append(headingGroup);
    const wrap = document.createElement('div'); wrap.className = 'chart-wrap'; wrap.style.setProperty('height', '250px', 'important');
    const canvas = document.createElement('canvas'); canvas.id = 'productAbcShareChart'; canvas.setAttribute('aria-describedby', 'productAbcShareStatus productSalesGroupKey productAbcShareValues'); wrap.append(canvas);
    const status = document.createElement('p'); status.id = 'productAbcShareStatus'; status.className = 'chart-subtitle'; status.setAttribute('role', 'status');
    const key = document.createElement('ul'); key.id = 'productSalesGroupKey'; key.className = 'product-exact-values';
    const details = document.createElement('details'); details.id = 'productAbcShareValues';
    shareCard.append(header, wrap, status, key, details);
  }
  if (shareCard.parentElement !== abcStack) abcStack.append(shareCard);
  shareCard.querySelector('.chart-header .chart-subtitle').textContent = distribution.salesAvailable
    ? 'Full selected population · each bar has its own 100% total.'
    : distribution.population ? 'Full selected population · label shares available; sales shares unavailable.' : 'No class shares available for this selection.';
  const shareStatus = document.getElementById('productAbcShareStatus');
  shareStatus.textContent = distribution.reason.replace('source labels', 'product names').replace('returns', 'negative adjustments') || distribution.population + ' product names · ' + formatCurrency(distribution.positiveTotal) + ' positive amounts · before cohort filtering.';
  const shareKey = document.getElementById('productSalesGroupKey'); shareKey.replaceChildren();
  distribution.groups.forEach(group => { const item = document.createElement('li'); item.textContent = productSalesGroupNames[group.code] + ': ' + (group.salesShare == null ? 'positive-amount share unavailable' : group.salesShare.toFixed(1) + '% of positive amounts') + ' · ' + group.labels + ' names (' + (group.labelShare == null ? 'share unavailable' : group.labelShare.toFixed(1) + '% of all names') + ')'; shareKey.append(item); });
  const shareValues = document.getElementById('productAbcShareValues');
  const shareSummary = document.createElement('summary'); shareSummary.textContent = 'View class shares and calculation basis';
  shareValues.replaceChildren(shareSummary);
  distribution.groups.forEach(group => {
    const line = document.createElement('p');
    line.textContent = productSalesGroupNames[group.code] + ': ' + group.labels + ' names (' + (group.labelShare == null ? 'share unavailable' : group.labelShare.toFixed(1) + '% of names') + '); ' + (group.salesShare == null ? 'positive-amount share unavailable' : group.salesShare.toFixed(1) + '% of positive amounts · ' + formatCurrency(group.positiveSales)) + '.';
    shareValues.append(line);
  });
  const shareBasis = document.createElement('p');
  shareBasis.textContent = 'Sales shares divide each ABC class’s positive amounts by all selected positive amounts. Name shares divide its count by every selected name, including zero-sales and adjustment-only Unclassified names. Category and period apply before these denominators; Top 5/10/20% does not change them. Negative adjustments remain separate from positive amounts. An unavailable sales basis is left blank. A starts below 80% cumulative contribution; B starts from 80% to below 95%; C starts from 95%. A name crossing a cutoff stays in its starting class.';
  shareValues.append(shareBasis);
  document.getElementById('productAbcShareChart').setAttribute('aria-label', 'ABC positive-sales share compared with source-label share. Exact class values are available in the following details.');
  chart('productAbcShareChart', {
    type: 'bar',
    data: {
      labels: ['Positive amounts', 'Product names'],
      datasets: distribution.groups.map((group, index) => ({
        label: productSalesGroupNames[group.code], data: [group.salesShare, group.labelShare], backgroundColor: ['#1E3A5F','#D97706','#64748B','#CBD5E1'][index], maxBarThickness: 42
      }))
    },
    plugins: [productDirectValues],
    options: {
      ...options, indexAxis: 'y',
      plugins: { ...options.plugins, tooltip: { callbacks: { label: context => {
        const group = distribution.groups[context.datasetIndex];
        return group.code + ': ' + Number(context.raw).toFixed(1) + '%' + (context.dataIndex === 0 ? ' · ' + formatCurrency(group.positiveSales) : ' · ' + group.labels + ' labels');
      } } } },
      scales: {
        x: { stacked: true, min: 0, max: 100, ticks: { callback: value => value + '%', stepSize: 25 }, title: { display: true, text: 'Share of each full-population total (%)' } },
        y: { stacked: true, grid: { display: false }, ticks: { font: { size: 11 } } }
      }
    }
  });
  chart('productBubbleChart', { type: 'scatter', data: { datasets: [{ label: 'Net sales and observed coverage', data: top.map(row => ({ x: row.revenue, y: row.observedMonths, name: row.name })), backgroundColor: '#1E3A5F' }] }, options: { ...options, plugins: { ...options.plugins, tooltip: { callbacks: { title: contexts => productChartLabel(contexts[0]?.raw.name || '', tooltipWidth, Number.MAX_SAFE_INTEGER), label: context => formatCurrency(context.raw.x) + ' net sales · ' + context.raw.y + ' observed months' } } }, scales: { x: { title: { display: true, text: 'Observed net sales (₱)' }, ticks: { callback: productChartCurrency, maxTicksLimit: compact ? 4 : 5 } }, y: { beginAtZero: true, ticks: { precision: 0 }, title: { display: true, text: 'Months with source records' } } } } });
  setTitle('productBubbleChart', 'Sales value and months with records', 'Top ' + top.length + ' labels · net sales versus months with records.', 'Months with source records describe sales activity, not reporting completeness or clinical priority. Up to 10 positive-sales-ranked labels in the selected cohort; hover for full names.');
  descriptiveOptionalChart('productBubbleChart', 'Inspect recurring versus occasional sellers');
  chart('paretoCurveChart', {
    type: 'line',
    data: {
      labels: cohort.map(row => row.rank),
      datasets: [
        { label: 'Cumulative positive sales (%)', data: cohort.map(row => row.cumulativeShare), borderColor: '#D97706', borderWidth: 2.5, pointRadius: 0, spanGaps: false },
        { label: '80% positive-sales reference', data: cohort.map(() => 80), borderColor: '#1E3A5F', borderDash: [6, 4], borderWidth: 1.5, pointRadius: 0 },
        { label: '95% positive-sales reference', data: cohort.map(() => 95), borderColor: '#64748B', borderDash: [4, 4], borderWidth: 1.5, pointRadius: 0 }
      ]
    },
    options: {
      ...options,
      plugins: { ...options.plugins, tooltip: { callbacks: {
        title: contexts => 'Positive-sales rank ' + contexts[0]?.label,
        beforeBody: contexts => productChartLabel(cohort[contexts[0]?.dataIndex]?.name || '', tooltipWidth, Number.MAX_SAFE_INTEGER),
        label: context => context.dataset.label + ': ' + (context.raw == null ? 'Unavailable' : Number(context.raw).toFixed(1) + '%')
      } } },
      scales: {
        x: { title: { display: true, text: 'Positive sales rank' }, ticks: { maxTicksLimit: 10, autoSkip: true } },
        y: { min: 0, max: 100, title: { display: true, text: 'Cumulative share of full population (%)' }, ticks: { callback: value => value + '%' } }
      }
    }
  });
  setTitle('paretoCurveChart', 'Cumulative positive-sales share', result.abcAvailable ? (thresholdLabel ? thresholdLabel.rank + (thresholdLabel.rank === 1 ? ' label reaches' : ' labels reach') + ' 80% of positive sales.' : 'Full-population positive-sales denominator.') : 'Unavailable while ABC revenue basis is unresolved.', 'The complete selected cohort is plotted against the full-population denominator; a smaller cohort may stop below 80%. The label reaching each threshold stays in its starting ABC class. Hover for the full source label at each rank.');
  const table = document.getElementById('productTable');
  if (table) {
    if (!table.parentElement.hasAttribute('data-product-scroll')) {
      const wrap = document.createElement('div'); wrap.dataset.productScroll = '';
      wrap.style.cssText = 'max-height:560px;overflow:auto';
      wrap.setAttribute('tabindex', '0'); wrap.setAttribute('role', 'region'); wrap.setAttribute('aria-label', 'Scrollable product sales table');
      table.parentElement.insertBefore(wrap, table); wrap.append(table);
    }
    const card = table.closest('.chart-card');
    if (card && !document.getElementById('productTableSearch')) {
      const controls = document.createElement('div'); controls.className = 'product-table-controls';
      const label = document.createElement('label'); label.htmlFor = 'productTableSearch'; label.textContent = 'Search product names';
      const search = document.createElement('input'); search.id = 'productTableSearch'; search.type = 'search'; search.className = 'topbar-select'; search.placeholder = 'Name or original source label'; search.value = productTableSearch;
      search.addEventListener('input', () => { productTableSearch = search.value; productTablePage = 1; renderProductPerformanceTable(); });
      const previous = document.createElement('button'); previous.id = 'productTablePrevious'; previous.type = 'button'; previous.className = 'btn btn-secondary'; previous.textContent = 'Previous'; previous.setAttribute('aria-label', 'Previous product page'); previous.addEventListener('click', () => { productTablePage--; renderProductPerformanceTable(); });
      const next = document.createElement('button'); next.id = 'productTableNext'; next.type = 'button'; next.className = 'btn btn-secondary'; next.textContent = 'Next'; next.setAttribute('aria-label', 'Next product page'); next.addEventListener('click', () => { productTablePage++; renderProductPerformanceTable(); });
      const status = document.createElement('p'); status.id = 'productTableStatus'; status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
      controls.append(label, search, previous, next); table.parentElement.before(controls, status);
    }
    card?.querySelectorAll('.chart-subtitle').forEach(sub => { sub.textContent = 'Search and paging affect this table only. Expand Details for signed adjustments, source coverage and catalog evidence. Export retains the complete selected cohort.'; });
    renderProductPerformanceTable();
  }
  const insight = page.querySelector('.dss-insight-card');
  if (insight) { insight.replaceChildren(); const p = document.createElement('p'); p.id = 'productPublicationLimits'; p.textContent = 'Product-region recommendations are not published. Use revenue concentration to review commercial performance. Product identity, clinical classification, disease effects, inventory levels and procurement decisions require separate validated evidence.'; insight.append(p); }
  const sub = document.getElementById('topbar-sub'); if (sub) sub.textContent = 'Descriptive product sales · Databricks candidate data';
}

function setProductCohort(value) {
  productCohortPercent = ['5','10','20','all'].includes(String(value)) ? String(value) : 'all';
  renderProductPrioritizationTimeline();
}

function exportProductPriorityCSV() {
  if (!salesSectorsData || !Array.isArray(salesSectorsData.rows) || productTableSource !== salesSectorsData || !productExportRows.length) return;
  const escape = value => {
    let text = String(value == null ? '' : value);
    if (typeof value === 'string' && /^[\s]*[=+@\-]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  };
  const release = salesSectorsData?.source?.release || {};
  const rows = [['Rank','Source product label','Net sales PHP','Positive sales PHP','Returns PHP','Contribution share percent','Cumulative share percent','Candidate ABC','Observed months','Reporting scope','Evidence','Product provenance','Policy status','Dataset ID','Fact Delta version','Transformation policy','Reporting ID','Category','Identity status','Item kind','Packaging unit','Pack count','Contained unit','Original aliases','Mapping hash','Brand','Manufacturer','Model','Strength','Concentration','Dosage form','Container size','Bundle specifications','Transaction lineage','Resolution policy','Transaction evidence hash','Catalog helper hash'],
    ...productExportRows.map(row => [row.rank,row.name,row.revenue,row.positiveSales,row.returnsValue,row.share,row.cumulativeShare,row.abc,row.observedMonths,descriptivePeriodLabel(),'Databricks candidate source labels',row.productEvidence,'positive_sales_crossing_inclusive_v2_candidate',release.dataset_id || 'Unavailable',release.fact_delta_version ?? 'Unavailable',release.policy_version || 'Unavailable',row.id,row.metadata.category || 'Unclassified',row.metadata.identity_status || 'needs_review',row.metadata.item_kind || 'unknown',row.metadata.packaging_unit || 'Unknown',row.metadata.pack_count || '',row.metadata.contained_unit || '',row.aliases.join('; '),release.product_master_sha256 || 'Unavailable',row.metadata.brand||'',row.metadata.manufacturer||'',row.metadata.model||'',row.metadata.strength||'',row.metadata.concentration||'',row.metadata.dosage_form||'',row.metadata.container_size||'',row.metadata.bundle_specification||'',row.lineage.join('; '),row.metadata.resolution_policy||'legacy_unresolved',release.transaction_evidence_sha256||'',release.catalog_helper_sha256||''])];
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
