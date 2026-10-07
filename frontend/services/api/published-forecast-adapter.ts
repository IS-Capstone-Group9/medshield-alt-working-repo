/** Adapt one coherent gateway release to the existing Chart.js evidence contract. */
export function publishedForecastEvidence(release: any) {
  if (release.schema_version !== '2' || release.status !== 'published') return null
  const model = release.model_id
  const latestOrigin = [...release.backtests].map((p: any) => p.origin_period).sort().at(-1)
  const backtest = release.backtests.filter((p: any) => p.origin_period === latestOrigin)
  const point = (p: any) => {
    const band = (p.intervals || []).find((b: any) => b.level === 0.8 && b.lower != null && b.upper != null)
    return { ...p, period: p.target_period, origin: p.origin_period, lead: p.lead_months,
      lower: band?.lower ?? null, upper: band?.upper ?? null, interval_level: band?.level ?? null,
      band_sample_count: band?.support ?? 0, interval_reason: band ? null : 'insufficient_calibration_support' }
  }
  const evaluation = release.evaluations.find((e: any) => e.model_id === model)
  return { status: 'published', publication_status: release.publication_status, run_id: release.run_id, release_id: release.release_id,
    scope: { sector: 'All', product: '', metric: 'revenue', unit: release.unit }, products: [], models: Object.fromEntries(release.evaluations.map((e: any) => [e.model_id, e.model_id])),
    origin: release.training_cutoff, last_actual_period: release.last_actual_period, observed_months: release.actuals.length,
    months_since_origin: Math.max(0, release.freshness_gap_months - 1),
    actuals: release.actuals.map((p: any) => ({ period: p.target_period, actual: p.actual })),
    source: { file: `Databricks model release ${release.release_id}; fact version ${release.fact_delta_version}; dataset ${release.dataset_id}`, checksum: release.source_checksum, as_of: new Date().toISOString().slice(0, 10) },
    limitations: release.limitations ?? [],
    views: Object.fromEntries([3, 6, 12].map(h => [String(h), { evaluation_protocol: release.evaluation_protocol,
      training_end: latestOrigin, evaluation_start: backtest[0]?.target_period, evaluation_end: backtest.at(-1)?.target_period,
      common_scored_months: evaluation?.comparison_metrics?.n ?? evaluation?.metrics?.n ?? 0,
      comparison_label: 'Comparison table: frozen development origins; headline metrics and plotted backtest: final retrospective audit.',
      comparisons: Object.fromEntries(release.evaluations.map((e: any) => [e.model_id, { comparison_metrics: e.comparison_metrics ?? {}, selection_reason: e.model_id === model ? release.selection?.reason : 'Not selected on development evidence' }])),
      models: { [model]: {
        backtest: backtest.map(point), forecast: release.points.slice(0, h).map(point),
        metrics: evaluation?.metrics ?? {}, comparison_metrics: evaluation?.metrics ?? {}, band_coverage: evaluation?.band_coverage ?? {} } } }])) }
}
