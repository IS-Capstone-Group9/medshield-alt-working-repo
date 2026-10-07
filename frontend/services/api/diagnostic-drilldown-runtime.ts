/** Compiled inside the dashboard closure so selections retain its exact date scope. */
export const DIAGNOSTIC_DRILLDOWN_SCRIPT = String.raw`
function diagnosticPeriodBounds(period) {
  const text = String(period || '');
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return [text, text];
  if (/^\d{4}-\d{2}$/.test(text)) {
    const end = new Date(Date.UTC(Number(text.slice(0,4)), Number(text.slice(5,7)), 0)).toISOString().slice(0,10);
    return [text + '-01', end];
  }
  if (/^\d{4}$/.test(text)) return [text + '-01-01', text + '-12-31'];
  return null;
}
function getDiagnosticScope() {
  if (descriptivePeriod === 'custom') return { start_date: customDateStart, end_date: customDateEnd, expected_release: DATA.release };
  if (descriptivePeriod !== 'all') {
    const end = descriptiveLatestObservedMonth();
    const start = shiftIsoPeriod(end, -(Number(descriptivePeriod) - 1));
    const bounds = diagnosticPeriodBounds(end);
    return { start_date: start + '-01', end_date: bounds[1] < descriptivePhtDate() ? bounds[1] : descriptivePhtDate(), expected_release: DATA.release };
  }
  const periods = descriptiveAxisPeriods();
  if (!periods.length) return null;
  const first = diagnosticPeriodBounds(periods[0]), last = diagnosticPeriodBounds(periods[periods.length - 1]);
  if (!first || !last) return null;
  return { start_date: first[0], end_date: last[1] < descriptivePhtDate() ? last[1] : descriptivePhtDate(), expected_release: DATA.release };
}
function openDiagnosticDrilldown(selection) {
  const base = getDiagnosticScope();
  if (!base) return;
  const scope = Object.assign({}, base, selection || {});
  if (DATA.release) scope.expected_release = DATA.release;
  if (scope.period) {
    const bounds = diagnosticPeriodBounds(scope.period);
    if (!bounds) return;
    scope.start_date = bounds[0] > base.start_date ? bounds[0] : base.start_date;
    scope.end_date = bounds[1] < base.end_date ? bounds[1] : base.end_date;
    delete scope.period;
  }
  if (scope.start_date > scope.end_date) return;
  window.dispatchEvent(new CustomEvent('medshield:diagnostic-open', { detail: scope }));
}
function attachDiagnosticChartAction(id, config) {
  const supported = ['revenueDetailChart','overviewBaselineChart','salesMovementChart','growthChart','overviewProfitScatter'];
  if (!supported.includes(id)) return;
  config.options = config.options || {};
  config.options.onClick = (event, elements, chart) => {
    const element = elements && elements[0]; if (!element) return;
    const dataset = chart.data.datasets[element.datasetIndex];
    const value = dataset.data[element.index];
    const label = String(dataset.label || '');
    if (value == null || /predict|prior|previous|baseline|trend/i.test(label)) return;
    const evidence = dataset.evidence && dataset.evidence[element.index];
    if (evidence === 'estimate' || evidence === 'missing' || evidence === 'unavailable') return;
    const point = typeof value === 'object' ? value : null;
    const rows = getDescriptiveDisplayRows();
    const row = rows[element.index];
    const axis = String((chart.data.labels || [])[element.index] || '');
    const period = point && point.period || /^\d{4}(?:-\d{2}){0,2}$/.test(axis) && axis || row && row.period;
    if (!period) return;
    openDiagnosticDrilldown({ period, label: String(period) });
  };
}
`
