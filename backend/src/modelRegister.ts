/**
 * Tested-model register for the "Models tested" page. Evidence metadata mirrored from docs/MODEL_REGISTER.md (update
 * both together). These are recorded test outcomes with evidence paths, not live analytical measures.
 */
export type ModelStatus = 'kept' | 'failed' | 'waiting' | 'benchmark'
export type ModelEntry = {name: string; layer: 'Descriptive' | 'Diagnostic' | 'Predictive' | 'Prescriptive'; status: ModelStatus; result: string; use: string; evidence: string}

export const MODEL_REGISTER_VERSION = '2026-11-17'
export const MODELS: ModelEntry[] = [
  {name: '6-month mean (mean_6)', layer: 'Predictive', status: 'kept', result: 'No challenger beat it (15+ tested); lead-1 WAPE 49.7%', use: 'Reference sales forecast', evidence: 'outputs/model_scorecard_20261107'},
  {name: 'Day-20 month-end estimate', layer: 'Predictive', status: 'kept', result: '28.8% vs 41.8% WAPE, bias −2.3%', use: 'Mid-month estimate of the current month', evidence: 'outputs/accuracy_round2_20261111'},
  {name: 'Large-order frequency (long-run share)', layer: 'Predictive', status: 'kept', result: 'Brier 0.216 vs 0.25 coin flip; narrow pass', use: 'Chance of a large order next month', evidence: 'outputs/large_order_profile_20261115'},
  {name: 'Large-order range (P10–P90, 24 months)', layer: 'Predictive', status: 'kept', result: 'Coverage 83% / 73% (rule 70–90%)', use: 'Floor for next month’s large-order value', evidence: 'outputs/large_order_profile_20261115'},
  {name: 'Government large-order range', layer: 'Predictive', status: 'kept', result: 'Coverage 77.8% / 78.8% (rule 70–90%)', use: 'Readiness amount for government tenders', evidence: 'outputs/new_prediction_targets_20261117'},
  {name: 'Late-reorder flag per area', layer: 'Predictive', status: 'kept', result: 'Late areas lapsed 88% vs 7%; inflated by dormant labels (active areas 42% vs 7%, exploratory)', use: 'Candidate sales follow-up list', evidence: 'outputs/new_prediction_targets_20261117'},
  {name: 'Family ABC–XYZ (mapping v1.1)', layer: 'Descriptive', status: 'kept', result: 'A-X value kept 82% vs 60% random', use: 'Product classes and handling', evidence: 'outputs/family_rerun_20261111'},
  {name: 'Per-family safety stock at 95%', layer: 'Prescriptive', status: 'kept', result: '96.2% service (rule 90–98%)', use: 'Stock buffers', evidence: 'outputs/family_rerun_20261111'},
  {name: 'Data-driven order-up-to policy', layer: 'Prescriptive', status: 'kept', result: '94.4% service vs 91.1% target; 15–52% less stock than a uniform rule (simulated)', use: 'Recommended stock levels', evidence: 'outputs/benefit_sensitivity_20261117'},
  {name: 'Margin mix/rate split, sales-change bridge', layer: 'Diagnostic', status: 'kept', result: 'Exact identities; family mix −17.1 of −21.3 pts', use: 'Why margin fell', evidence: 'outputs/diagnostic_breakdowns_20261115'},
  {name: 'Unusual-month flag (robust z ≥ 3)', layer: 'Diagnostic', status: 'kept', result: '16 of 101 months; 11 of 15 high months were large orders', use: 'Which months were unusual', evidence: 'outputs/unusual_months_20261115'},
  {name: 'New-product early signal', layer: 'Diagnostic', status: 'kept', result: 'Year-2 survival 52% vs 19%, 5 of 5 cohorts', use: 'Which new products tend to last', evidence: 'outputs/product_survival_20261115'},
  {name: 'Surge risk calendar (DOH, PAGASA)', layer: 'Descriptive', status: 'kept', result: 'Observed peaks; Jul–Nov main window', use: 'When to prepare (decision 017)', evidence: 'outputs/surge_preparedness_20261117'},
  {name: 'Seasonal naive', layer: 'Predictive', status: 'benchmark', result: '68.6% WAPE vs 49.7%', use: 'Shows seasonality is too weak to forecast from', evidence: 'docs/MODEL_REGISTER.md'},
  {name: 'SARIMA', layer: 'Predictive', status: 'benchmark', result: '63.3–76.9% WAPE', use: 'Classical seasonal model did not beat mean_6', evidence: 'docs/MODEL_REGISTER.md'},
  {name: 'Ridge, HistGBDT (machine learning)', layer: 'Predictive', status: 'benchmark', result: '77.3–85.2% WAPE', use: 'ML needs more than 81 months', evidence: 'docs/MODEL_REGISTER.md'},
  {name: 'Last value, 12-month mean, 6-month median, combinations', layer: 'Predictive', status: 'benchmark', result: 'None beat mean_6', use: 'Reference was not cherry-picked', evidence: 'docs/MODEL_REGISTER.md'},
  {name: 'Split forecast (routine + large) for the total', layer: 'Predictive', status: 'failed', result: 'Not better than mean_6 at leads 1/3/6', use: '—', evidence: 'outputs/large_document_split_20261111'},
  {name: 'Day-15 mid-month estimate', layer: 'Predictive', status: 'failed', result: 'Bias −5.4% (retry −9.6%)', use: '—', evidence: 'outputs/accuracy_round2_20261111'},
  {name: 'DII and RSI as forecast inputs', layer: 'Predictive', status: 'failed', result: 'No significant association', use: 'RSI kept as territory context', evidence: 'outputs/signal_analysis_20261110'},
  {name: 'Disease link by therapeutic category', layer: 'Diagnostic', status: 'failed', result: '0 of 64 supported after Holm', use: '—', evidence: 'outputs/category_disease_test_20261115'},
  {name: 'Disease and typhoon surge alerts', layer: 'Predictive', status: 'failed', result: '0 usable of 8 (diarrhoeal pass trend-confounded)', use: 'Kept as reminders only', evidence: 'outputs/surge_preparedness_20261117'},
  {name: 'Weather-regime forecast ranges (W1)', layer: 'Predictive', status: 'failed', result: '66.1% coverage vs 75–85% rule', use: '—', evidence: 'outputs/weather_prediction_tests_20261117'},
  {name: 'Typhoon delivery-disruption flag (W2)', layer: 'Predictive', status: 'failed', result: 'Median ratio 1.03, p = 0.43', use: '—', evidence: 'outputs/weather_prediction_tests_20261117'},
  {name: 'Large-order chance by segment, budget cycle (P1)', layer: 'Predictive', status: 'failed', result: 'Brier 0.261 / 0.329; calendar model worse', use: '—', evidence: 'outputs/new_prediction_targets_20261117'},
  {name: 'New-product survival model (P3)', layer: 'Predictive', status: 'failed', result: 'AUC 0.662 vs 0.70; over-predicted', use: 'Survival table kept as description', evidence: 'outputs/new_prediction_targets_20261117'},
  {name: 'Large-order readiness reserve (P90, 12 months)', layer: 'Prescriptive', status: 'failed', result: '69.7% vs 70% rule', use: 'Trade-off table only', evidence: 'outputs/readiness_sizing_20261115'},
  {name: 'Calendar timing of large orders', layer: 'Diagnostic', status: 'failed', result: 'p = 0.134 (rule p < 0.05)', use: '—', evidence: 'outputs/large_order_profile_20261115'},
  {name: 'Demand profile as a planning guide', layer: 'Descriptive', status: 'failed', result: '7 of 13 groups kept class (53.8% vs 60%)', use: 'Description only', evidence: 'outputs/demand_profile_20261115'},
  {name: 'ABC classifiers (XGBoost, logistic)', layer: 'Predictive', status: 'failed', result: 'Barely above majority floor', use: 'Prior-year class kept', evidence: 'docs/MODEL_REGISTER.md'},
  {name: 'Volatility-scaled ranges (PD3)', layer: 'Predictive', status: 'failed', result: 'Narrow coverage; pre-2026 check failed', use: 'Not activated', evidence: 'docs/MODEL_REGISTER.md'},
  {name: 'Hierarchical reconciliation', layer: 'Predictive', status: 'waiting', result: 'No change while every level uses mean_6', use: 'Needs new months', evidence: 'docs/MODEL_REGISTER.md'},
  {name: 'Company 80% prediction ranges', layer: 'Predictive', status: 'waiting', result: '69–71% coverage (rule 75–85%)', use: 'Routine version queued (R2)', evidence: 'outputs/retest_queue_20261112'},
  {name: 'Unit (quantity) forecasts', layer: 'Predictive', status: 'waiting', result: '18% worse than pesos', use: 'Needs verified units', evidence: 'outputs/accuracy_round2_20261111'},
  {name: 'TSB for intermittent products', layer: 'Predictive', status: 'waiting', result: 'Worse than mean_6', use: 'Family version queued (R3)', evidence: 'outputs/retest_queue_20261112'},
  {name: 'ETS, 4-method blend, growth-adjusted mean (R1/R4/R5)', layer: 'Predictive', status: 'waiting', result: 'Registered re-tests', use: 'Needs 12 new months', evidence: 'outputs/retest_queue_20261112'},
]

export function modelRegister() {
  const counts = {kept: 0, failed: 0, waiting: 0, benchmark: 0} as Record<ModelStatus, number>
  for (const m of MODELS) counts[m.status]++
  return {version: MODEL_REGISTER_VERSION, counts, total: MODELS.length, models: MODELS, source: 'docs/MODEL_REGISTER.md',
    note: 'Recorded test outcomes. Passing a test is not business approval; no model authorizes purchases.'}
}
