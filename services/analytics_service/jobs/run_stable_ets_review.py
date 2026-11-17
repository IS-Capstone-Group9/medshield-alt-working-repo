"""Register and compare corrected ETS recipes with source-bound retained forecasts."""
import argparse
import csv
from datetime import datetime, timezone
import hashlib
import importlib.metadata
import json
from pathlib import Path
import platform

from ..predictive import stable_ets, metrics, contracts
from ..sales_external_tournament import select_by_lead
from .. import sales_external_tournament

REFERENCES = ('last_value', 'seasonal_naive', 'mean_3', 'mean_6', 'ets_none', 'ets_damped')
STAGES = ('development', 'retrospective_audit', 'inspected_extension')


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write(path, value):
    path.write_text(json.dumps(value, indent=2, allow_nan=False) + '\n', encoding='utf-8')


def specification(source_path, reference_path):
    root = Path(__file__).resolve().parents[3]
    code = [Path(__file__), Path(stable_ets.__file__), Path(metrics.__file__),
            Path(contracts.__file__), Path(sales_external_tournament.__file__)]
    return dict(schema_version='stable_ets_review_v1', method_version=stable_ets.METHOD_VERSION,
        source_sha256=sha(source_path), reference_sha256=sha(reference_path),
        code_sha256={p.relative_to(root).as_posix(): sha(p) for p in code},
        environment=dict(python=platform.python_version(), **{p: importlib.metadata.version(p)
                         for p in ('numpy', 'scipy', 'statsmodels')}),
        recipes=['ets_none_stable_v1', 'ets_damped_stable_v1'],
        references=list(REFERENCES), leads=[1, 3, 6],
        selection='Development only: same MASE/MAE/bias rule as retained tournament; no operational promotion.',
        limitation='All historical outcomes already inspected; this is corrective research, not untouched testing.')


def validate_source(source, reference, source_hash):
    if (reference.get('source_sha256') != source_hash or
            source['source_identity'] != reference['source_identity'] or
            reference.get('publication_approved') is not False or
            reference.get('operational_approval') is not False or source.get('source') != 'databricks'):
        raise ValueError('Expected matching unpublished retained Databricks source and references')
    rows = source['monthly']
    observed = {contracts.month(r['month']): float(r['net_sales_php'])
                if r['net_sales_php'] is not None else None for r in rows}
    if len(observed) != len(rows):
        raise ValueError('Duplicate source month')
    first = contracts.month(reference['protocol']['training_start'])
    series = {p: v for p, v in observed.items() if p >= first}
    if not series or sorted(series) != list(range(first, max(series) + 1)):
        raise ValueError('Missing observed training months; no imputation allowed')
    if any(v is None for v in series.values()):
        raise ValueError('Unavailable source observation')
    return series


def evaluate(source, reference, series):
    points, seen, fits = [], set(), []
    spec = reference['protocol']
    for p in reference['predictions']:
        if p['model_id'] not in REFERENCES:
            continue
        key = (p['stage'], p['model_id'], p['origin_period'], p['lead_months'])
        origin, target = contracts.month(p['origin_period']), contracts.month(p['target_period'])
        if (key in seen or p['stage'] not in STAGES or
                p['origin_period'] not in spec[p['stage'] + '_origins'] or
                p['lead_months'] not in [1, 3, 6] or target - origin != p['lead_months'] or
                p['actual'] != series.get(target)):
            raise ValueError('Retained prediction identity, actual or calendar mismatch')
        seen.add(key)
        points.append(dict(p, prediction_origin='inherited_reference'))
    expected = sum(len(spec[s + '_origins']) for s in STAGES) * 3 * len(REFERENCES)
    if len(points) != expected:
        raise ValueError('Incomplete retained reference population')
    for stage in STAGES:
        for label in spec[stage + '_origins']:
            origin = contracts.month(label)
            training = {p: v for p, v in series.items() if p <= origin}
            scale = metrics.mase_scale(training)
            for damped in (False, True):
                name = 'ets_damped_stable_v1' if damped else 'ets_none_stable_v1'
                values, details = stable_ets.forecast(training, origin, [1, 3, 6], damped=damped)
                fits.append(dict(stage=stage, origin_period=label, model_id=name, **details))
                for lead in (1, 3, 6):
                    points.append(dict(series_id='original_itemized_all_buyers_PHP', target_name='net_sales',
                        model_id=name, origin_period=label, target_period=contracts.period(origin + lead),
                        lead_months=lead, actual=series[origin + lead], prediction=values.get(lead), stage=stage,
                        mase_scale=scale['value'], mase_scale_lag_months=scale['lag_months'],
                        missing_reason=details['reason'], prediction_origin='new_corrective_fit'))
    reports, selection = [], []
    for stage in STAGES:
        for lead in (1, 3, 6):
            subset = [p for p in points if p['stage'] == stage and p['lead_months'] == lead]
            n = len(spec[stage + '_origins'])
            complete = [name for name in sorted({p['model_id'] for p in subset})
                        if sum(p['model_id'] == name and p['prediction'] is not None for p in subset) == n]
            compared = metrics.compare(subset, complete)
            reports.extend(dict(stage=stage, lead_months=lead, model_id=name, **score)
                           for name, score in compared.items())
            if stage == 'development':
                # Old unconditioned ETS are comparison-only after the reproduced defect.
                eligible = {k: v for k, v in compared.items() if k not in ('ets_none', 'ets_damped')}
                selection.append(select_by_lead(eligible, lead))
    return dict(predictions=points, fits=fits, reports=reports, research_selections=selection,
                source_identity=source['source_identity'], target_unit='PHP', retained_source=True,
                fresh_warehouse_query=False, publication_approved=False, operational_approval=False,
                historical_selection_changed=False, untouched_test=False)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--reference', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--mode', choices=['register', 'execute'], required=True)
    args = parser.parse_args()
    registration = specification(args.source, args.reference)
    source, reference = (json.loads(p.read_bytes()) for p in (args.source, args.reference))
    series = validate_source(source, reference, registration['source_sha256'])
    if args.mode == 'register':
        args.output.mkdir(parents=True, exist_ok=False)
        write(args.output / 'registration.json', registration)
        print('REGISTERED_CORRECTIVE_ETS_RESEARCH')
        return
    if json.loads((args.output / 'registration.json').read_bytes()) != registration:
        raise ValueError('Registration source/code/environment changed; register a new execution')
    if (args.output / 'results.json').exists():
        raise ValueError('Refusing to overwrite an executed study')
    from threadpoolctl import threadpool_limits
    with threadpool_limits(limits=1):
        result = evaluate(source, reference, series)
    result.update(registration=registration, executed_at=datetime.now(timezone.utc).isoformat())
    write(args.output / 'results.json', result)
    fields = ['stage', 'lead_months', 'model_id', 'n', 'mae', 'wape', 'normalized_bias', 'mase']
    with (args.output / 'metrics.csv').open('w', encoding='utf-8', newline='') as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        for row in result['reports']:
            writer.writerow(dict(stage=row['stage'], lead_months=row['lead_months'], model_id=row['model_id'],
                **{k: row['common'][k] for k in ('n', 'mae', 'wape', 'normalized_bias')},
                mase=row['common_scaled_error']['mase']))
    print(json.dumps(dict(points=len(result['predictions']), fits=len(result['fits']),
                         converged=sum(f['converged'] for f in result['fits']),
                         research_selections=result['research_selections'])))


if __name__ == '__main__':
    main()
