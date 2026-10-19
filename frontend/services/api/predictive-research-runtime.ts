export const PREDICTIVE_RESEARCH_MARKUP = `
<section class="chart-card" data-predictive-research aria-labelledby="predictiveResearchTitle" style="margin-top:20px;min-width:0;overflow-wrap:anywhere">
  <h2 class="chart-title" id="predictiveResearchTitle">Stored predictive research</h2>
  <p class="chart-subtitle">Company-revenue research · Not approved for operational use.</p>
  <div class="uploaded-data-toolbar" style="display:flex;flex-wrap:wrap;gap:12px;align-items:end">
    <div class="uploaded-data-field" style="min-width:0;flex:2 1 220px;grid-template-columns:minmax(0,1fr)"><label for="researchRun">Stored experiment</label><select id="researchRun" style="min-width:0;width:100%;max-width:100%" onchange="changePredictiveResearch('run')" disabled><option value="">Unavailable</option></select></div>
    <div class="uploaded-data-field" style="min-width:0;flex:1 1 180px;grid-template-columns:minmax(0,1fr)"><label for="researchStage">Evidence stage</label><select id="researchStage" style="min-width:0;width:100%;max-width:100%" onchange="changePredictiveResearch('stage')"><option value="development">Development evaluation</option><option value="retrospective_audit">Retrospective audit · Previously inspected</option><option value="projections">Stored candidate projections</option></select></div>
    <div class="uploaded-data-field" style="min-width:0;flex:1 1 180px;grid-template-columns:minmax(0,1fr)"><label for="researchLead">Forecast lead range</label><select id="researchLead" style="min-width:0;width:100%;max-width:100%" onchange="changePredictiveResearch('lead')"><option value="3">1–3 months</option><option value="6">1–6 months</option><option value="12" selected>1–12 months</option></select></div>
    <div class="uploaded-data-field" style="min-width:0;flex:1 1 190px;grid-template-columns:minmax(0,1fr)"><label for="researchModel">Detail model</label><select id="researchModel" style="min-width:0;width:100%;max-width:100%" onchange="changePredictiveResearch('model')" disabled><option value="">Unavailable</option></select></div>
    <button type="button" class="sales-secondary-button" id="researchRefresh" onclick="changePredictiveResearch('refresh')">Refresh research</button>
    <button type="button" class="sales-secondary-button" id="researchExport" onclick="exportPredictiveResearchCSV()" disabled>Export research CSV</button>
  </div>
  <p id="researchStatus" class="analytical-output-scope" role="status" aria-live="polite">Stored research evidence unavailable.</p>
  <p id="researchScope" class="chart-subtitle"></p>
  <p id="researchSelection" class="chart-subtitle"></p>
  <p id="researchUseSummary" class="analytical-output-scope" aria-live="polite">Forecast use unavailable.</p>
  <div id="researchComparisonWrap" style="max-width:100%;overflow-x:auto" tabindex="0" role="region" aria-label="Research model comparison"><table id="researchComparison" class="product-table" style="min-width:1000px;white-space:nowrap;overflow-wrap:normal" aria-label="Research models on common historical cases"></table></div>
  <h3 id="researchDetailTitle" class="chart-title">Origin and target month evidence</h3>
  <div style="max-width:100%;overflow-x:auto" tabindex="0" role="region" aria-label="Selected research model evidence"><table id="researchPoints" class="product-table" style="min-width:1000px;white-space:nowrap;overflow-wrap:normal" aria-label="Origin keyed research evidence"></table></div>
  <p id="researchPointCount" class="chart-subtitle"></p>
  <details class="analytical-output-notes"><summary>Research source and interpretation</summary>
    <p id="researchSource"></p><p id="researchLimitations"></p>
    <p>MAE is mean absolute error in pesos. WAPE is total absolute error divided by total absolute actuals on the same scored cases; it is unavailable when that denominator is zero. Signed bias is prediction minus actual: positive means overforecasting. Forecast YoY change is the prediction minus eligible prior-year net sales, divided by those prior-year net sales, expressed as a percentage. It is derived forecast change; actual growth and forecast error require target-month actuals. A zero, negative, missing or ineligible baseline leaves the percentage unavailable. Repeated target months at different origins are separate cases; cumulative lead groups overlap. Revenue is recorded net sales by delivery month, not verified medicine quantities or total demand.</p>
  </details>
</section>`

export const PREDICTIVE_RESEARCH_SCRIPT = String.raw`
let predictiveResearchData = null;
let predictiveResearchExport = [];

function changePredictiveResearch(field) {
  if (field === 'run' || field === 'refresh') {
    const run = document.getElementById('researchRun');
    window.dispatchEvent(new CustomEvent('medshield:predictive-research-change', {detail:{run_id:run?.value || ''}}));
  } else {
    if (field === 'model') {
      const control = document.getElementById('researchModel');
      if (control) control.dataset.selected = control.value;
    }
    renderPredictiveResearch();
  }
}

function setPredictiveResearchData(data, error) {
  // This boundary is deliberately separate from the approved publication adapter.
  const release = data?.source?.release;
  const sourceIdentified = data?.source?.system_of_record === 'databricks' && release
    && typeof release.dataset_id === 'string' && release.dataset_id.length > 0
    && typeof release.policy_version === 'string' && release.policy_version.length > 0
    && Number.isInteger(release.fact_delta_version) && release.fact_delta_version >= 0;
  const runsValid = Array.isArray(data?.runs) && data.runs.every(run => run && typeof run === 'object' && typeof run.run_id === 'string' && typeof run.source_matches_active === 'boolean');
  const selected = runsValid ? data.runs.find(run => run.run_id === data.selected_run_id) : null;
  const selectedMatches = data?.status === 'empty' || selected?.source_matches_active === true;
  const projectionUnpublished = !data?.candidate_projections || (data.candidate_projections.publication_approved === false && data.candidate_projections.activation_allowed === false);
  const valid = data && data.schema_version === 'predictive-research.v1' && ['research_candidate_unpublished', 'empty'].includes(data.status)
    && data.publication_approved === false && data.activation_allowed === false
    && runsValid && sourceIdentified && selectedMatches && projectionUnpublished;
  predictiveResearchData = valid ? data : null;
  if (data && !valid) error = 'Stored research response rejected: unpublished status and source identity are required.';
  try { renderPredictiveResearch(error); }
  catch {
    predictiveResearchData = null;
    renderPredictiveResearch('Stored research response rejected: malformed evidence. No local results substituted.');
  }
}

function renderPredictiveResearch(error) {
  const el = id => document.getElementById(id);
  if (!el('researchStatus')) return;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const finite = value => typeof value === 'number' && Number.isFinite(value);
  const fmt = value => finite(value) ? value.toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2}) : 'Unavailable';
  const php = value => finite(value) ? '₱' + fmt(value) : 'Unavailable';
  const pct = value => finite(value) ? fmt(value) + '%' : 'Unavailable';
  const yoyReason = point => point.forecast_yoy_unavailable_reason || (finite(point.forecast_yoy_percent) ? '' : 'baseline evidence unavailable');
  const data = predictiveResearchData;
  predictiveResearchExport = [];
  ['researchComparison','researchPoints','researchScope','researchSelection','researchSource','researchLimitations','researchPointCount'].forEach(id => el(id).textContent = '');
  el('researchUseSummary').textContent = 'Forecast use unavailable.';
  el('researchDetailTitle').textContent = 'Origin and target month evidence';
  el('researchComparisonWrap').hidden = false;
  el('researchLead').disabled = false;
  el('researchExport').disabled = true;
  el('researchRun').disabled = !data || !data.runs.length;
  el('researchModel').disabled = true;
  el('researchRun').replaceChildren();
  el('researchModel').replaceChildren();
  if (!data) {
    el('researchRun').add(new Option('Unavailable',''));
    el('researchModel').add(new Option('Unavailable',''));
    el('researchStatus').textContent = error || 'Stored research evidence unavailable. No local results substituted.';
    return;
  }
  data.runs.forEach(run => el('researchRun').add(new Option(String(run.configuration_count ?? '?') + ' configurations · ' + run.run_id, run.run_id)));
  el('researchRun').value = data.selected_run_id || '';
  const run = data.runs.find(r => r.run_id === data.selected_run_id);
  const release = data.source.release || {};
  el('researchStatus').textContent = data.status === 'empty' ? 'No stored experiment matches the active source. No candidate results available.' : 'Unpublished research candidate · activation unavailable · no approved model established';
  el('researchSource').textContent = 'Databricks Gold · dataset ' + (release.dataset_id || 'Unavailable') + ' · fact version ' + (release.fact_delta_version ?? 'Unavailable') + ' · policy ' + (release.policy_version || 'Unavailable') + ' · experiment ' + (run?.run_id || 'Unavailable') + ' · source run ' + (run?.source_run_id || 'Unavailable') + ' · artifact ' + (run?.artifact_hash || 'Unavailable') + ' · active source match ' + String(run?.source_matches_active ?? false) + '.';
  el('researchLimitations').textContent = (data.limitations || []).map(String).join(' ');
  const selection = data.original_selection;
  el('researchSelection').textContent = 'Stored original selection: ' + (typeof selection === 'string' ? selection : selection?.model_id || selection?.selected_model || 'Unavailable') + '. Selecting a detail model does not change this decision or approve publication. Experiment order is not a ranking of model quality.';
  if (!run || run.source_matches_active !== true || data.status === 'empty') return;
  const names = data.model_names || {};
  const previous = el('researchModel').dataset.selected || '';
  const stage = el('researchStage').value;
  const lead = el('researchLead').value;
  const projections = stage === 'projections';
  el('researchLead').disabled = projections;
  el('researchComparisonWrap').hidden = projections;
  const group = data.cohorts?.[stage]?.groups?.[lead];
  const candidate = data.candidate_projections;
  const models = projections ? (candidate?.model_id ? [candidate.model_id] : []) : Object.keys(group?.models || {});
  models.forEach(id => el('researchModel').add(new Option(names[id] || id,id)));
  if (models.includes(previous)) el('researchModel').value = previous;
  const model = el('researchModel').value;
  el('researchModel').dataset.selected = model;
  el('researchModel').disabled = !models.length || projections;
  if (!models.length) {
    el('researchModel').add(new Option('Unavailable',''));
    el('researchScope').textContent = projections ? 'No candidate projections stored for this experiment. ' + (candidate?.unavailable_reason || '') : 'No evidence for this stage and cumulative lead group.';
    return;
  }
  if (projections && !candidate.points?.length) {
    el('researchScope').textContent = 'No candidate projections stored for this experiment. ' + (candidate.unavailable_reason || 'Prediction values unavailable.');
    return;
  }
  // Detail selectors do not deduplicate by target period: origin + target + lead is the evaluation key.
  const result = projections ? null : group.models[model];
  const points = projections ? (candidate.points || []) : (result.points || []);
  const identity = {dataset_id:release.dataset_id ?? '',fact_delta_version:release.fact_delta_version ?? '',policy_version:release.policy_version ?? '',area_mapping_sha256:release.area_mapping_sha256 ?? '',product_master_sha256:release.product_master_sha256 ?? '',publication_status:release.publication_status ?? '',run_id:run.run_id,source_run_id:run.source_run_id ?? '',artifact_hash:run.artifact_hash ?? '',source_matches_active:run.source_matches_active,model_id:model,model_name:names[model] || model,evidence_role:projections ? 'unpublished_candidate_projection' : stage,cumulative_lead_group:projections ? '' : '1-' + lead,publication_approved:false,activation_allowed:false,training_cutoff:projections ? candidate.training_cutoff : run.training_cutoff,generated_at:projections ? candidate.generated_at : '',comparison_basis:group?.comparison_basis || ''};
  if (projections) {
    el('researchScope').textContent = 'Stored candidate projections only · generated ' + (candidate.generated_at || 'Unavailable') + ' · training cutoff ' + (candidate.training_cutoff || 'Unavailable') + '. Elapsed/current/future labels refer to the generation date. Forecast YoY change compares each prediction with eligible prior-year net sales from the same frozen input. Actuals and forecast errors are unavailable; these are not forecasts issued before all displayed months.';
    el('researchDetailTitle').textContent = 'Stored candidate projections — no measured future errors';
    el('researchPoints').innerHTML = '<thead><tr><th>Origin cutoff</th><th>Target month</th><th>Calendar lead</th><th>Prediction (₱)</th><th style="white-space:normal;min-width:160px;max-width:220px">Forecast YoY change (%)</th><th>Prior-year month</th><th>Prior-year net sales (₱)</th><th>At generation</th><th>Actual / error</th><th>Stored interval evidence</th></tr></thead><tbody>' + points.map(p => {
      const intervals = (p.intervals || []).map(i => (finite(i.level) ? pct(i.level * 100) + ': ' : '') + (finite(i.lower) && finite(i.upper) && i.lower <= i.upper && !i.reason ? php(i.lower) + ' to ' + php(i.upper) : 'Unavailable — ' + (i.reason || 'unsupported interval')) + ' · ' + (i.method || 'method unavailable') + ' · n=' + (i.sample_count ?? 'Unavailable')).join('; ');
      const reason = yoyReason(p);
      return '<tr><td>' + esc(p.origin_period) + '</td><td>' + esc(p.target_period) + '</td><td>' + esc(p.lead_months) + '</td><td data-research-field="prediction">' + php(p.prediction) + '</td><td data-research-field="forecast_yoy_percent" style="white-space:normal;min-width:160px;max-width:220px">' + (reason ? 'Unavailable — ' + esc(reason) : pct(p.forecast_yoy_percent)) + '</td><td data-research-field="prior_year_period">' + esc(p.prior_year_period || 'Unavailable') + '</td><td data-research-field="prior_year_net_sales_php">' + php(p.prior_year_net_sales_php) + '<br><small>' + esc(p.prior_year_value_status || 'status unavailable') + ' · ' + esc(p.prior_year_coverage_status || 'coverage unavailable') + '</small></td><td data-research-field="temporal_status_at_generation">' + esc(p.temporal_status_at_generation || 'Unavailable') + '</td><td>Unavailable — actuals not supplied</td><td>' + esc(intervals || 'No intervals stored') + '</td></tr>';
    }).join('') + '</tbody>';
  } else {
    el('researchScope').textContent = (stage === 'development' ? 'Development evaluation' : 'Already inspected retrospective audit') + ' · cumulative leads 1–' + lead + ' · ' + group.target_start + ' to ' + group.target_end + ' · ' + group.n + ' expected origin–target–lead cases · ' + group.distinct_target_months + ' distinct target months · origins: ' + (group.origins || []).join(', ') + '. Comparisons use complete models on the same expected cases.';
    el('researchDetailTitle').textContent = 'Origin and target month evidence · ' + (names[model] || model);
    el('researchComparison').innerHTML = '<thead><tr><th>Model</th><th>Scored cases</th><th>MAE (₱)</th><th>RMSE (₱)</th><th>WAPE (%)</th><th>Mean signed bias (₱)</th><th>Normalized bias (%)</th><th>Availability</th></tr></thead><tbody>' + Object.entries(group.models).map(([id,value]) => { const m = value.metrics || {}; return '<tr><td>' + esc(names[id] || id) + '</td><td>' + esc(m.n ?? 0) + '</td><td>' + php(m.mae) + '</td><td>' + php(m.rmse) + '</td><td>' + pct(m.wape) + '</td><td>' + php(m.bias) + '</td><td>' + pct(m.normalized_bias) + '</td><td>' + esc(value.available ? 'Complete common cases' : 'Excluded from comparison: ' + (value.exclusion_reason || 'incomplete evidence') + ' · individually scored ' + (value.individual_scored_count ?? 0)) + '</td></tr>'; }).join('') + '</tbody>';
    el('researchPoints').innerHTML = '<thead><tr><th>Origin cutoff</th><th>Target month</th><th>Calendar lead</th><th>Actual (₱)</th><th>Prediction (₱)</th><th>Signed error (₱)</th><th>Absolute error (₱)</th><th>Absolute percentage error</th><th>Error status</th></tr></thead><tbody>' + points.map(p => { const ape = finite(p.absolute_error_php) && finite(p.actual) && p.actual !== 0 ? p.absolute_error_php / Math.abs(p.actual) * 100 : null; return '<tr><td>' + esc(p.origin_period) + '</td><td>' + esc(p.target_period) + '</td><td>' + esc(p.lead_months) + '</td><td>' + php(p.actual) + '</td><td>' + php(p.prediction) + '</td><td>' + php(p.signed_error_php) + '</td><td>' + php(p.absolute_error_php) + '</td><td>' + pct(ape) + '</td><td>' + esc(p.error_unavailable_reason || (p.actual === 0 ? 'Peso error available; percentage denominator zero' : 'Scored')) + '</td></tr>'; }).join('') + '</tbody>';
  }
  const m = result?.metrics || {};
  el('researchUseSummary').textContent = 'Exploratory revenue estimates · Sales outlook and revenue-budget discussion only. '
    + (projections ? 'Actuals and forecast errors unavailable.' : !result?.available ? 'Selected model excluded from the common-case comparison.'
      : 'Selected model: MAE ' + php(m.mae) + ' · WAPE ' + pct(m.wape) + ' · signed bias ' + php(m.bias) + '.')
    + ' Operational reliability is not established.';
  identity.forecast_use = 'exploratory_review_only';
  identity.error_context = projections ? 'actuals_unavailable' : stage;
  predictiveResearchExport = points.map(p => ({...identity,origin_period:p.origin_period,target_period:p.target_period,lead_months:p.lead_months,actual:projections ? null : p.actual,prediction:p.prediction,signed_error_php:projections ? null : p.signed_error_php,absolute_error_php:projections ? null : p.absolute_error_php,absolute_percentage_error:!projections && finite(p.actual) && p.actual !== 0 && finite(p.absolute_error_php) ? p.absolute_error_php / Math.abs(p.actual) * 100 : null,error_unavailable_reason:projections ? 'actual_unavailable' : p.error_unavailable_reason ?? '',...(projections ? {prior_year_period:p.prior_year_period ?? '',prior_year_net_sales_php:finite(p.prior_year_net_sales_php) ? p.prior_year_net_sales_php : null,prior_year_value_status:p.prior_year_value_status ?? '',prior_year_coverage_status:p.prior_year_coverage_status ?? '',forecast_yoy_percent:yoyReason(p) ? null : p.forecast_yoy_percent,forecast_yoy_unavailable_reason:yoyReason(p),baseline_input_storage_hash:p.baseline_input_storage_hash ?? '',baseline_input_content_hash:p.baseline_input_content_hash ?? ''} : {}),temporal_status_at_generation:projections ? p.temporal_status_at_generation ?? '' : '',intervals:projections ? JSON.stringify(p.intervals || []) : '',comparison_available:result?.available ?? false,comparison_n:m.n ?? 0,comparison_mae_php:m.mae ?? null,comparison_rmse_php:m.rmse ?? null,comparison_wape_percent:m.wape ?? null,comparison_bias_php:m.bias ?? null,comparison_normalized_bias_percent:m.normalized_bias ?? null}));
  el('researchPointCount').textContent = points.length + ' rows displayed and exported · ' + (projections ? 'no actuals or measured errors. Scroll the table horizontally to view all baseline and interval fields' : 'origin keys preserved, including repeated target months') + '.';
  el('researchExport').disabled = !points.length;
}

function exportPredictiveResearchCSV() {
  if (!predictiveResearchExport.length) return;
  const keys = Object.keys(predictiveResearchExport[0]);
  // Preserve finite signed numbers, and neutralize text that spreadsheets could execute.
  const cell = value => { let text = value == null ? '' : String(value); if (typeof value !== 'number' && /^[=+\-@\t\r\n]|^\s+[=+\-@]/.test(text)) text = "'" + text; return '"' + text.replace(/"/g,'""') + '"'; };
  const csv = [keys.map(cell).join(','), ...predictiveResearchExport.map(row => keys.map(key => cell(row[key])).join(','))].join('\r\n');
  const url = URL.createObjectURL(new Blob(['\uFEFF',csv],{type:'text/csv;charset=utf-8;'}));
  const a = document.createElement('a'); a.href = url; a.download = 'medshield-predictive-research-' + predictiveResearchExport[0].evidence_role + '.csv'; a.click(); URL.revokeObjectURL(url);
}
`
