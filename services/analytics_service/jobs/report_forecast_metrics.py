"""Report MASE/DM from retained predictions; never fit, select, or publish models."""
import argparse
import csv
from datetime import datetime
import hashlib
import json
from pathlib import Path
from zoneinfo import ZoneInfo

from services.analytics_service.predictive.contracts import month
from services.analytics_service.predictive.metrics import compare, diebold_mariano, mase_scale


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def report(source, evaluation, registration):
    identity = source['source_identity']
    if identity != evaluation['source_identity'] or identity != registration['protocol']['source_identity']:
        raise ValueError('Retained source identity mismatch')
    observed = {r['month']: float(r['net_sales_php']) if r['net_sales_php'] is not None else None for r in source['monthly']}
    if len(observed) != len(source['monthly']):
        raise ValueError('Duplicate source month')
    registered = {r['period']: float(r['value_php']) if r['value_php'] is not None else None for r in registration['observed_rows']}
    if any(observed.get(period) != registered.get(period) for period in set(observed) | set(registered)):
        raise ValueError('Registered observed rows disagree with retained Gold capture')
    if any(evaluation.get(k) is not False for k in ('publication_approved', 'financial_release_approved')) or evaluation.get('future_forecasts_generated') != 0:
        raise ValueError('Expected retained unpublished retrospective research')
    start = month(registration['protocol']['training_start'])
    points, seen = [], set()
    for raw in evaluation['predictions']:
        p = dict(raw)
        origin, target = month(p['origin_period']), month(p['target_period'])
        if target - origin != p['lead_months'] or p['unit'] != 'PHP':
            raise ValueError('Prediction lead or unit mismatch')
        key = (p['model_id'], p['stage'], p['origin_period'], p['target_period'], p['lead_months'])
        if key in seen:
            raise ValueError('Duplicate prediction key')
        seen.add(key)
        if p['actual'] != observed.get(p['target_period']):
            raise ValueError('Prediction actual differs from source capture')
        training = {month(period): value for period, value in observed.items() if start <= month(period) <= origin}
        scale = mase_scale(training)
        if len(training) != origin - start + 1:
            raise ValueError('Origin-local training history has missing months')
        p.update(series_id='original_itemized_php', target_name='net_sales',
                 mase_scale=scale['value'], mase_scale_lag_months=scale['lag_months'])
        points.append(p)
    models = sorted({p['model_id'] for p in points})
    stages = sorted({p['stage'] for p in points})
    metadata = dict(evidence_label='Derived', dataset_id=identity['dataset_id'],
                    policy_version=identity['policy_version'], assumption_ids='none',
                    unit='PHP', candidate_only=True)
    leaderboard, tests, consequences = [], [], []
    for stage in stages:
        for lead in (1, 3, 6):
            subset = [p for p in points if p['stage'] == stage and p['lead_months'] == lead]
            comparisons = compare(subset, models)
            for model in models:
                values = comparisons[model]
                common = values['common']
                leaderboard.append(dict(stage=stage, model_id=model, lead_months=lead,
                    common_n=common['n'], **{k: common[k] for k in ('mae', 'rmse', 'wape', 'normalized_bias')},
                    mase=values['common_scaled_error']['mase'],
                    interval_80_coverage=None, interval_95_coverage=None,
                    interval_reason='Retained run has no supported intervals',
                    status='retained_prediction_metrics' if common['n'] else 'unavailable_no_retained_lead', **metadata))
                consequences.append(dict(stage=stage, model_id=model, lead_months=lead,
                    mae_php=common['mae'], days_of_unit_demand=None, acquisition_cost_exposure_php=None,
                    status='unavailable', reason='PHP revenue target is not presentation-scoped units; no unit demand or TP conversion is supported', **metadata))
                if model != 'seasonal_naive':
                    tests.append(dict(stage=stage, **diebold_mariano(subset, model, lead=lead),
                        selection_effect='none_frozen_original_selection_preserved',
                        inference_scope='exploratory_unadjusted_multiple_comparisons', **metadata))
    return dict(status='retained_retrospective_metrics_only', source_identity=identity,
        source_extracted_at=source['extracted_at'], original_run_id=evaluation['run_id'],
        original_selection=evaluation['selection'], selection_changed=False,
        new_model_fits=0, source_prediction_count=len(points), model_count=len(models),
        available_leads=sorted({p['lead_months'] for p in points}),
        publication_approved=False, operational_approval=False, objective_scores_changed=False,
        leaderboard=leaderboard, dm_tests=tests, consequences=consequences,
        limitations=['Recomputed retained predictions, not a newly fitted tournament.',
          'Retrospective inspected outcomes; no untouched prospective holdout or actual historical vintages.',
          'DM uses absolute loss, Bartlett HAC through lead minus one and HLN correction; unadjusted exploratory p-values.',
          'MASE averages each point absolute error divided by its own origin-local training seasonal-naive MAE.',
          'Original frozen model selection remains unchanged; new WP4 promotion criteria are not retroactively applied.',
          'Company itemized PHP excludes contracts and is not complete company sales or verified medicine units.',
          'Lead six, unit cohorts, supported forecast intervals and unit-cost consequences remain unavailable.'])


def write_csv(path, rows):
    with path.open('x', encoding='utf-8', newline='') as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--retained-root', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--verification-script', type=Path, required=True)
    args = parser.parse_args()
    files = {'source.json': args.retained_root / 'live-source/source.json',
             'evaluation.json': args.retained_root / 'run/evaluation.json',
             'registration.json': args.retained_root / 'run/execution-registration.json'}
    for name, path in files.items():
        if sha(path) != path.with_suffix('.sha256').read_text().strip():
            raise ValueError(f'Retained checksum mismatch: {name}')
    source, evaluation, registration = [json.loads(files[k].read_text(encoding='utf-8-sig')) for k in files]
    if evaluation['execution_registration_sha256'] != sha(files['registration.json']) or evaluation['live_confirmation_sha256'] != sha(files['source.json']):
        raise ValueError('Evaluation source/registration binding differs')
    result = report(source, evaluation, registration)
    if args.output.exists() and any(path.name != 'verify.py' for path in args.output.iterdir()):
        raise ValueError('Output must be new or contain only the supplied verification script')
    args.output.mkdir(parents=True, exist_ok=True)
    for name, path in files.items():
        (args.output / name).write_bytes(path.read_bytes())
    (args.output / 'verify.py').write_bytes(args.verification_script.read_bytes())
    result['reported_at'] = datetime.now(ZoneInfo('Asia/Manila')).isoformat()
    result['input_sha256'] = {name: sha(path) for name, path in files.items()}
    result['report_code_sha256'] = {'services/analytics_service/jobs/report_forecast_metrics.py': sha(Path(__file__)),
        'services/analytics_service/predictive/metrics.py': sha(Path(__file__).parents[1] / 'predictive/metrics.py')}
    write_csv(args.output / 'T4.1_rolling_tournament_leaderboard.csv', result['leaderboard'])
    write_csv(args.output / 'T4.2_diebold_mariano_vs_seasonal_naive.csv', result['dm_tests'])
    write_csv(args.output / 'T4.3_error_consequence_translation.csv', result['consequences'])
    (args.output / 'results.json').write_text(json.dumps(result, indent=2, allow_nan=False) + '\n', encoding='utf-8')
    print(json.dumps(dict(status=result['status'], predictions=result['source_prediction_count'], output=str(args.output))))


if __name__ == '__main__':
    main()
