"""Registered, offline company-PHP experiment for calendar leads 13–24.

This separate runner leaves the original twelve-month contracts/selection intact.
Historical snapshots are already inspected: no untouched-test claim is made.
"""
import argparse
import csv
from datetime import datetime, timezone
import hashlib
import importlib.metadata
import json
import math
from pathlib import Path
import platform
import warnings

from .contracts import eligible, month, period, validate_input
from .metrics import score
from .models import forecast

ROOT = Path(__file__).resolve().parents[3]
CONFIGS = [
    {'model_id': 'last_value'}, {'model_id': 'seasonal_naive'},
    {'model_id': 'mean_3', 'window': 3}, {'model_id': 'mean_6', 'window': 6},
    {'model_id': 'ets_none', 'family': 'ets', 'damped': False},
    {'model_id': 'ets_damped', 'family': 'ets', 'damped': True},
    {'model_id': 'sarima_ar_seasonal', 'family': 'sarima24', 'order': [1, 0, 0],
     'seasonal_order': [1, 0, 0, 12], 'trend': 'c', 'maxiter': 200},
    {'model_id': 'sarima_airline', 'family': 'sarima24', 'order': [0, 1, 1],
     'seasonal_order': [0, 1, 1, 12], 'trend': 'n', 'maxiter': 200},
]
LEADS = list(range(13, 25))
ORIGINS = ['2022-12', '2023-03', '2023-06', '2023-09', '2023-12']


def require(condition, message):
    if not condition:
        raise ValueError(message)


def checksum(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write_json(path, value):
    path.write_text(json.dumps(value, indent=2, allow_nan=False) + '\n', encoding='utf-8')


def load_input(path):
    require(checksum(path) == path.with_suffix('.sha256').read_text().strip(), 'Input checksum mismatch')
    data = json.loads(path.read_text(encoding='utf-8'))
    require(not validate_input(data), 'Frozen input has research-contract blockers')
    rows = [r for r in data['rows'] if '2020-01' <= r['period'] <= '2025-12']
    require(len(rows) == 72 and all(eligible(r) for r in rows), 'Require 72 eligible observed months')
    series = {month(r['period']): r['target_value'] for r in rows}
    require(sorted(series) == list(range(month('2020-01'), month('2025-12') + 1)), 'Window not contiguous')
    return data, series


def specification(path):
    return {'version': 'long_horizon_company_php_v1', 'input_sha256': checksum(path),
            'code_sha256': {p.name: checksum(p) for p in [Path(__file__),
                Path(__file__).with_name('models.py'), Path(__file__).with_name('contracts.py'),
                Path(__file__).with_name('metrics.py')]},
            'runtime': {'python': platform.python_version(), **{name: importlib.metadata.version(name)
                        for name in ('numpy', 'scipy', 'statsmodels')}},
            'target': 'company_month_net_sales_PHP', 'window': ['2020-01', '2025-12'],
            'minimum_training_months': 36, 'leads': LEADS, 'origins': ORIGINS,
            'configs': CONFIGS, 'seed': 20261017,
            'selection': 'Lowest complete-model MAE on first four origins; model_id alphabetical tie-break. Freeze before fitting later origin. No later-origin reselection.',
            'later_origin': 'Already-inspected overlapping historical diagnostic, not an independent test.',
            'qualification': 'Report same-cohort last-value and seasonal-naive differences; no approved client tolerance or activation.',
            'missing_policy': 'No imputation, clipping, dropped target cases or partial-fold comparison.',
            'projection': 'Selected frozen recipe fitted to 72 observed months; research-only Jan–Dec 2027 leads13–24. No intervals from sparse support.',
            'publication_approved': False}


def predict(series, origin, config):
    """The adapter only receives values at or before the declared origin."""
    training = {p: v for p, v in series.items() if p <= origin}
    require(sorted(training) == list(range(month('2020-01'), origin + 1)), 'Training gap')
    require(len(training) >= 36, 'Insufficient training')
    if config.get('family') != 'sarima24':
        result, reason = forecast(training, origin, LEADS, config, seed=20261017)
    else:
        import numpy as np
        from statsmodels.tsa.statespace.sarimax import SARIMAX
        values = np.asarray([training[p] for p in sorted(training)], dtype=float)
        scale = float(np.std(values)) or max(map(abs, values)) or 1.0
        fit = SARIMAX(values / scale, order=config['order'], seasonal_order=config['seasonal_order'],
                      trend=config['trend'], enforce_stationarity=True,
                      enforce_invertibility=True, simple_differencing=False, missing='raise').fit(
                          method='lbfgs', maxiter=config['maxiter'], disp=False, cov_type='none')
        if not fit.mle_retvals.get('converged', False):
            return {}, 'SARIMA optimizer did not converge within registered iteration budget'
        values = fit.forecast(24) * scale
        result, reason = {lead: float(values[lead - 1]) for lead in LEADS}, None
    if reason:
        return {}, reason
    if set(result) != set(LEADS) or not all(math.isfinite(v) for v in result.values()):
        return {}, 'Incomplete or nonfinite twelve-target prediction'
    return result, None


def run_fold(series, origin_text, config):
    origin = month(origin_text)
    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter('always')
        try:
            predictions, reason = predict(series, origin, config)
        except Exception as error:
            predictions, reason = {}, type(error).__name__ + ': ' + str(error)
    return {'model_id': config['model_id'], 'origin_period': origin_text,
            'training_end': origin_text, 'training_months': origin - month('2020-01') + 1,
            'warnings': [str(w.message) for w in caught], 'reason': reason,
            'points': [{'origin_period': origin_text, 'target_period': period(origin + lead),
                        'lead_months': lead, 'actual': series.get(origin + lead),
                        'prediction': predictions.get(lead)} for lead in LEADS]}


def evaluate(folds, origins):
    result = []
    expected = len(origins) * 12
    for config in CONFIGS:
        subset = [f for f in folds if f['model_id'] == config['model_id'] and f['origin_period'] in origins]
        points = [p for f in subset for p in f['points']]
        complete = len(subset) == len(origins) and len(points) == expected and all(
            p['prediction'] is not None and p['actual'] is not None for p in points)
        result.append({'model_id': config['model_id'], 'complete': complete, 'expected_cases': expected,
                       'available_cases': sum(p['prediction'] is not None and p['actual'] is not None for p in points),
                       'metrics': score([(p['actual'], p['prediction']) for p in points]) if complete else score([]),
                       'by_lead': {str(lead): score([(p['actual'], p['prediction']) for p in points if p['lead_months'] == lead]) for lead in LEADS} if complete else {},
                       'failures': [f['reason'] for f in subset if f['reason']]})
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--prepare', action='store_true')
    args = parser.parse_args()
    data, series = load_input(args.input)
    spec = specification(args.input)
    out = args.output
    if args.prepare:
        out.mkdir(parents=True, exist_ok=False)
        write_json(out / 'protocol.json', {'registered_at': datetime.now(timezone.utc).isoformat(), 'specification': spec})
        (out / 'protocol.sha256').write_text(checksum(out / 'protocol.json') + '\n')
        print('REGISTERED: 8 fixed recipes; 5 origins; leads13–24; no models fitted', flush=True)
        return
    require(checksum(out / 'protocol.json') == (out / 'protocol.sha256').read_text().strip(), 'Protocol checksum changed')
    require(json.loads((out / 'protocol.json').read_text())['specification'] == spec, 'Code/input/runtime or protocol changed after registration')
    # Exclusive marker prevents accidental rerunning/tuning into the same packet.
    with (out / 'execution-started.json').open('x') as handle:
        json.dump({'started_at': datetime.now(timezone.utc).isoformat()}, handle)
    folds = []
    for origin in ORIGINS[:4]:
        for config in CONFIGS:
            folds.append(run_fold(series, origin, config))
        print('Completed exploratory selection origin ' + origin, flush=True)
    development = evaluate(folds, ORIGINS[:4])
    complete = [m for m in development if m['complete']]
    selected = min(complete, key=lambda m: (m['metrics']['mae'], m['model_id']))['model_id'] if complete else None
    selection = {'model_id': selected, 'rule': spec['selection'], 'frozen_at': datetime.now(timezone.utc).isoformat(),
                 'selected_before_later_origin_fits': True, 'original_selection_changed': False}
    write_json(out / 'selection.json', selection)
    for config in CONFIGS:
        folds.append(run_fold(series, ORIGINS[-1], config))
    later = evaluate(folds, ORIGINS[-1:])
    pooled = evaluate(folds, ORIGINS)
    write_json(out / 'folds.json', folds)
    write_json(out / 'scores.json', {'exploratory_selection': development, 'later_origin_diagnostic': later, 'pooled_descriptive': pooled})
    projections = run_fold(series, '2025-12', next(c for c in CONFIGS if c['model_id'] == selected)) if selected else None
    if projections:
        for p in projections['points']:
            require(p['actual'] is None and p['target_period'].startswith('2027-'), 'Projection must not manufacture actuals')
            p.update(lower=None, upper=None, interval_reason='Insufficient lead-specific support; no calibrated interval',
                     status='unpublished_research_projection_not_operational')
    write_json(out / 'projections-2027.json', {'generated_at': datetime.now(timezone.utc).isoformat(),
               'training_cutoff': '2025-12', 'selected_recipe': selected, 'result': projections,
               'forecast_issue_date_is_not_training_cutoff': True, 'publication_approved': False})
    with (out / 'historical-predictions.csv').open('w', newline='', encoding='utf-8') as handle:
        fields = ['model_id', 'origin_period', 'target_period', 'lead_months', 'actual', 'prediction', 'signed_error_php', 'absolute_error_php']
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        for fold in folds:
            for p in fold['points']:
                error = p['prediction'] - p['actual'] if p['prediction'] is not None else None
                writer.writerow({'model_id': fold['model_id'], **p, 'signed_error_php': error,
                                 'absolute_error_php': abs(error) if error is not None else None})
    lines = ['# Exploratory 2027-horizon model comparison', '',
             'Company monthly recorded net sales, PHP. Registered before execution. Target leads13–24; revised 2020–2025 snapshot. No untouched test, live publication or procurement approval.', '',
             'Selected recipe on first four origins: **' + str(selected) + '**. Frozen before later-origin fits; no reselection.', '',
             '| Model | Selection n | Selection MAE (PHP) | Selection WAPE (%) | Later n | Later MAE (PHP) | Later WAPE (%) | Later mean bias (PHP) |',
             '|---|---:|---:|---:|---:|---:|---:|---:|']
    def number(value):
        return f'{value:,.2f}' if value is not None else 'Unavailable'
    for a, b in zip(development, later):
        x, y = a['metrics'], b['metrics']
        lines.append(f"| {a['model_id']} | {x['n']} | {number(x['mae'])} | {number(x['wape'])} | {y['n']} | {number(y['mae'])} | {number(y['wape'])} | {number(y['bias'])} |")
    lines += ['', 'Positive bias means overforecasting; negative means underforecasting. Errors in pesos and percent describe historical cases, not 2027 realized error. WAPE is total absolute error divided by total absolute actuals; it is not accuracy.', '',
              'Selection cohort: 48 cases from four overlapping origins; later diagnostic: 12 cases at December 2023, targeting 2025. Some targets overlap selection cases. Pooled scores have 60 cases but only 24 distinct target months. All target years were already available for prior inspection.', '',
              'Original 1–12-month models and selection remain unchanged. No client tolerance is invented. No independent later actuals or physical-unit/inventory validation is supplied. No statistically calibrated interval is claimed from five origins per lead. All warnings/failures remain in folds.json; incomplete recipes receive no partial-case ranking.', '',
              'The selected recipe is refitted once to the 72 observed months for a separate unpublished 2027 research projection. Its generated timestamp differs from the December 2025 training cutoff. No 2026 synthetic actuals are inserted. Do not use this packet as a dashboard fallback or operational allocation instruction.', '',
              'Deployment decision: do not activate automatically. Review same-cohort baseline comparisons and historical errors, client limits, sparse support and revised-snapshot provenance. A research-only projection is not approval for a dependable 2027 budget or procurement forecast.']
    (out / 'RESULTS.md').write_text('\n'.join(lines) + '\n', encoding='utf-8')
    write_json(out / 'run.json', {'status': 'COMPLETED_EXPLORATORY_NOT_PUBLISHED', 'completed_at': datetime.now(timezone.utc).isoformat(),
               'protocol_sha256': checksum(out / 'protocol.json'), 'selection': selection,
               'source_release': {k: data['manifest'][k] for k in ('dataset_id', 'fact_delta_version', 'transformation_policy')},
               'model_count': len(CONFIGS), 'fold_count': len(folds), 'publication_approved': False, 'remote_writes': False})
    write_json(out / 'artifact-hashes.json', {p.name: checksum(p) for p in sorted(out.iterdir()) if p.is_file()})
    print('COMPLETED: ' + str(selected) + '; unpublished research only', flush=True)


if __name__ == '__main__':
    main()
