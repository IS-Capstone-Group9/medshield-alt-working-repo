import { descriptivePortfolio } from './descriptive-products'
import { productAbcDistribution, productChartCurrency, productChartLabel } from './product-chart-view'

// All inline callbacks below are existing DASHBOARD_GLOBAL_HANDLERS.
export const PRODUCT_PRIORITIZATION_SCRIPT = `const descriptivePortfolio = ${descriptivePortfolio.toString()};
const productAbcDistribution = ${productAbcDistribution.toString()};
const productChartLabel = ${productChartLabel.toString()};
const productChartCurrency = ${productChartCurrency.toString()};` + String.raw`
let productCohortPercent = 'all';
let productCategory = 'All';
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
  const result = descriptivePortfolio(rows, 'positive_sales_candidate', productCategory);
  const rate = ['5', '10', '20'].includes(String(productCohortPercent)) ? Number(productCohortPercent) : 100;
  const count = Math.ceil(result.products.length * rate / 100);
  const cohort = result.products.slice(0, count);
  productExportRows = cohort;
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
        : thresholdLabel ? thresholdLabel.rank + ' of ' + result.products.length + ' source labels account for ' + thresholdLabel.cumulativeShare.toFixed(1) + '% of positive sales.'
          : 'No positive-sales concentration can be reported for this selection.';
  const reviewPrompt = document.createElement('p'); reviewPrompt.id = 'productReviewPrompt'; reviewPrompt.className = 'analytical-review-prompt';
  reviewPrompt.textContent = !hasSource || !result.products.length ? 'Select a period with observed source records to review the portfolio.'
    : 'Review ' + (result.unresolvedCount ? result.unresolvedCount + ' unresolved source-label groups' : 'catalog identities')
      + (returnLabels ? ' and ' + returnLabels + ' labels with returns' : '') + ' before using the ranking for inventory decisions.';
  const note = document.createElement('p');
  const summaryNote = document.createElement('p');
  summaryNote.textContent = !hasSource ? 'Product data is loading or unavailable.' : descriptivePeriodLabel() + ' · ' + productCategory + ' · Recorded revenue: ' + formatCurrency(result.revenue) + ' across ' + result.products.length + ' labels.';
  const policyNote = document.createElement('p'); policyNote.textContent = 'ABC policy candidate — CEO approval pending. Source labels; product identities require review.';
  note.textContent = !hasSource ? 'Product data is loading or unavailable. No observed sales total can be reported yet.' : descriptivePeriodLabel() + ' · Candidate source labels; medicine identities and pack conversions require review. '
    + productCategory + ' category; services remain in financial totals. Unresolved identity: ' + result.unresolvedCount + ' groups, ' + formatCurrency(result.unresolvedRevenue) + '. ' + 'Recorded revenue: ' + formatCurrency(result.revenue) + ' across ' + result.products.length + ' labels. '
    + result.estimatedRows + ' gap-estimated rows excluded. Historical contract/product allocations may still be present in this candidate source. '
    + (unboundedRows ? unboundedRows + ' monthly rows cannot be assigned to the exact requested dates and are excluded; select whole months. ' : '')
    + (result.unavailableRows ? result.unavailableRows + ' rows have unavailable revenue. ' : '')
    + 'ABC policy candidate — CEO approval pending. Positive eligible sales basis: ' + formatCurrency(result.contributionTotal) + '. Returns remain in net revenue. '
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
  const displayNote = document.createElement('p'); displayNote.textContent = cohort.length + ' labels in cohort. Sales bars and coverage scatter show up to 10; Pareto shows the complete cohort; ABC summarizes the full selected population. Table shows up to 100; export contains the complete cohort.';
  const categoryLabel = document.createElement('label'); categoryLabel.htmlFor = 'productCategorySelect'; categoryLabel.textContent = 'Category ';
  const categorySelect = document.createElement('select'); categorySelect.id = 'productCategorySelect'; categorySelect.className = 'topbar-select';
  ['All','Medical','Non-Medical','Unclassified'].forEach(value => categorySelect.add(new Option(value,value,false,value===productCategory)));
  categorySelect.onchange = () => { productCategory = categorySelect.value; renderProductPrioritizationTimeline(); };
  const controls=document.createElement('div');controls.style.cssText='display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:12px 0';controls.append(categoryLabel,categorySelect,label,select,exportButton);
  const evidenceDetails = document.createElement('details');
  const evidenceSummary = document.createElement('summary'); evidenceSummary.textContent = 'Evidence, ABC method and display limits';
  evidenceDetails.append(evidenceSummary, note, displayNote);
  scope.append(title, finding, summaryNote, policyNote, reviewPrompt, controls, evidenceDetails);
  // Compare the ranking with both ABC views without moving or recreating canvases.
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
  if (abcCard && abcCard.parentElement !== abcStack) abcStack.append(abcCard);
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
  if (barCanvas) barCanvas.setAttribute('aria-label', 'Top ' + top.length + ' source labels: positive sales and negative returns. Full labels and values are available in the product table.');
  // Horizontal bar chart — product names as readable left-side row labels
  chart('productBarChart', {
    type: 'bar',
    data: {
      labels: top.map(row => row.name),
      datasets: [
        { label: 'Positive sales (₱)', data: top.map(row => result.missingContributionRows ? null : row.positiveSales), backgroundColor: '#1E3A5F', borderRadius: 3, maxBarThickness: 25 },
        { label: 'Returns (₱)', data: top.map(row => result.missingContributionRows ? null : row.returnsValue), backgroundColor: '#C0392B', borderRadius: 3, maxBarThickness: 25 }
      ]
    },
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
  setTitle('productBarChart', 'Top source labels — positive sales and returns', 'Top ' + top.length + ' labels · positive sales ranked · hover for full names.', 'Up to 10 labels from the selected cohort. Positive sales and negative returns share one row; their sum is net sales. Source labels may have unresolved identities. Values are unavailable when sales/returns do not reconcile.');
  const classes = result.abcAvailable ? ['A','B','C','Unclassified'] : ['Unclassified'];
  chart('abcChart', { type: 'bar', data: { labels: classes, datasets: [{ label: 'Source product labels', data: classes.map(code => result.products.filter(row => row.abc === code).length), backgroundColor: ['#1E3A5F','#D97706','#64748B','#CBD5E1'] }] }, options: { ...options, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } } });
  const classShares = classes.map(code => code + ': ' + (result.contributionTotal > 0 ? (result.products.filter(row => row.abc === code).reduce((sum,row) => sum + row.positiveSales, 0) / result.contributionTotal * 100).toFixed(1) + '%' : 'unavailable')).join('; ');
  setTitle('abcChart', 'Candidate ABC — label counts', 'Full selected population · source-label counts.', result.abcAvailable ? 'Positive-sales shares: ' + classShares + '. The label reaching each cutoff stays in its starting class; the largest positive seller is always A. Publication approval pending.' : 'Classification held until the revenue basis is suitable; all labels shown as Unclassified.');
  const distribution = productAbcDistribution(result);
  let shareCard = document.getElementById('productAbcShareCard');
  if (!shareCard) {
    shareCard = document.createElement('section'); shareCard.id = 'productAbcShareCard'; shareCard.className = 'chart-card';
    shareCard.setAttribute('aria-labelledby', 'productAbcShareTitle');
    const header = document.createElement('div'); header.className = 'chart-header';
    const headingGroup = document.createElement('div');
    const heading = document.createElement('h3'); heading.id = 'productAbcShareTitle'; heading.className = 'chart-title'; heading.textContent = 'ABC concentration — sales share versus label share';
    const subtitle = document.createElement('p'); subtitle.className = 'chart-subtitle'; subtitle.textContent = 'Full selected population · two independent 100% totals.';
    headingGroup.append(heading, subtitle); header.append(headingGroup);
    const wrap = document.createElement('div'); wrap.className = 'chart-wrap'; wrap.style.setProperty('height', '250px', 'important');
    const canvas = document.createElement('canvas'); canvas.id = 'productAbcShareChart'; canvas.setAttribute('aria-describedby', 'productAbcShareStatus productAbcShareValues'); wrap.append(canvas);
    const status = document.createElement('p'); status.id = 'productAbcShareStatus'; status.className = 'chart-subtitle'; status.setAttribute('role', 'status');
    const details = document.createElement('details'); details.id = 'productAbcShareValues';
    shareCard.append(header, wrap, status, details);
  }
  if (shareCard.parentElement !== abcStack) abcStack.append(shareCard);
  shareCard.querySelector('.chart-header .chart-subtitle').textContent = distribution.salesAvailable
    ? 'Full selected population · each bar has its own 100% total.'
    : distribution.population ? 'Full selected population · label shares available; sales shares unavailable.' : 'No class shares available for this selection.';
  const shareStatus = document.getElementById('productAbcShareStatus');
  shareStatus.textContent = distribution.reason || distribution.population + ' source labels · ' + formatCurrency(distribution.positiveTotal) + ' positive sales · before cohort filtering.';
  const shareValues = document.getElementById('productAbcShareValues');
  const shareSummary = document.createElement('summary'); shareSummary.textContent = 'View class shares and calculation basis';
  shareValues.replaceChildren(shareSummary);
  distribution.groups.forEach(group => {
    const line = document.createElement('p');
    line.textContent = group.code + ': ' + group.labels + ' labels (' + (group.labelShare == null ? 'share unavailable' : group.labelShare.toFixed(1) + '% of labels') + '); ' + (group.salesShare == null ? 'positive-sales share unavailable' : group.salesShare.toFixed(1) + '% of positive sales · ' + formatCurrency(group.positiveSales)) + '.';
    shareValues.append(line);
  });
  const shareBasis = document.createElement('p');
  shareBasis.textContent = 'Sales shares divide each ABC class’s positive sales by all selected positive sales. Label shares divide its label count by every selected label, including zero-sales and return-only Unclassified labels. Category and period apply before these denominators; Top 5/10/20% does not change them. Returns remain separate from positive sales. An unavailable sales basis is left blank.';
  shareValues.append(shareBasis);
  document.getElementById('productAbcShareChart').setAttribute('aria-label', 'ABC positive-sales share compared with source-label share. Exact class values are available in the following details.');
  chart('productAbcShareChart', {
    type: 'bar',
    data: {
      labels: ['Positive sales', 'Source labels'],
      datasets: distribution.groups.map((group, index) => ({
        label: group.code, data: [group.salesShare, group.labelShare], backgroundColor: ['#1E3A5F','#D97706','#64748B','#CBD5E1'][index], maxBarThickness: 42
      }))
    },
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
    table.replaceChildren();
    const head = table.createTHead().insertRow();
    ['Rank','Source product label','Category','Net sales (₱)','Positive sales (₱)','Returns (₱)','Contribution share (%)','Cumulative share (%)','Candidate ABC','Observed months','Catalog evidence','Inspect'].forEach(text => {
      const th = document.createElement('th'); th.scope = 'col'; th.textContent = text; head.append(th);
    });
    const body = table.createTBody();
    for (const row of cohort.slice(0, 100)) {
      const tr = body.insertRow();
      const inspectCell = document.createElement('td');
      const inspect = document.createElement('button'); inspect.type = 'button'; inspect.className = 'btn btn-secondary'; inspect.textContent = 'Inspect ' + row.name;
      inspect.onclick = () => openDiagnosticDrilldown({product_id:row.id,category:productCategory,label:row.name}); inspectCell.append(inspect);
      [row.rank, row.name, row.metadata.category || 'Unclassified', row.revenue.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), row.positiveSales.toLocaleString('en-PH', {minimumFractionDigits:2,maximumFractionDigits:2}), row.returnsValue.toLocaleString('en-PH', {minimumFractionDigits:2,maximumFractionDigits:2}), row.share == null ? 'Unavailable' : row.share.toFixed(2), row.cumulativeShare == null ? 'Unavailable' : row.cumulativeShare.toFixed(2), row.abc, row.observedMonths].forEach(value => { tr.insertCell().textContent = String(value); });
      const evidenceCell = tr.insertCell();
      const details=document.createElement('details'), summary=document.createElement('summary');
      details.className = 'product-catalog-evidence';
      summary.textContent = 'View evidence'; summary.setAttribute('aria-label', 'View catalog evidence for ' + row.name);
      details.append(summary);
      const evidence = document.createElement('dl');
      for (const [name, value] of [
        ['Product provenance', row.productEvidence], ['Reporting ID', row.id],
        ['Identity status', row.metadata.identity_status || 'needs_review'], ['Item kind', row.metadata.item_kind || 'unknown'],
        ['Packaging', [row.metadata.packaging_unit,row.metadata.pack_count,row.metadata.contained_unit].filter(Boolean).join(' / ') || 'Unknown']
      ]) {
        const term = document.createElement('dt'); term.textContent = name;
        const description = document.createElement('dd'); description.textContent = value;
        evidence.append(term, description);
      }
      details.append(evidence);
      const aliasesTitle = document.createElement('p'); aliasesTitle.textContent = row.aliases.length + ' original alias' + (row.aliases.length === 1 ? '' : 'es'); details.append(aliasesTitle);
      row.aliases.forEach(alias=>{const value=document.createElement('p');value.textContent=alias;details.append(value);});
      if(row.lineage.length){const lineage=document.createElement('p');lineage.textContent='Source-record lineage: '+row.lineage.join('; ');details.append(lineage);}
      evidenceCell.append(details);
      tr.append(inspectCell);
    }
    if (!cohort.length) { const cell = body.insertRow().insertCell(); cell.colSpan = 12; cell.textContent = hasSource ? 'No observed product sales for the selected scope.' : 'Product data is loading or unavailable.'; }
    const card = table.closest('.chart-card');
    card?.querySelectorAll('.chart-subtitle').forEach(sub => { sub.textContent = 'Commercial performance first · expand catalog evidence for identities, aliases and lineage. Quantities are not verified medicine demand.'; });
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
