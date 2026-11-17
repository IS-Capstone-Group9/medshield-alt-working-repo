"""Register/evaluate only the joint bounded-intercept extension; no runtime promotion."""
import argparse
import csv
from datetime import datetime, timezone
import importlib.metadata
import json
import math
from pathlib import Path
import platform

from ..predictive import online_baseline_ensemble as affine, contracts, metrics
from . import run_accuracy_improvement as shared, run_stable_ets_review as retained

STAGES = ('development', 'retrospective_audit', 'inspected_extension')


def specification(source_path, reference_path):
    root = Path(__file__).resolve().parents[3]
    files = [Path(__file__), Path(affine.__file__), Path(contracts.__file__),
             Path(metrics.__file__), Path(retained.__file__), Path(shared.__file__)]
    reference = json.loads(reference_path.read_bytes())
    return dict(version=affine.VERSION, delta='Joint bounded signed intercept with simplex weights;prior convex blends and separate bias corrections already evaluated',
        source_sha256=shared.sha(source_path), reference_sha256=shared.sha(reference_path),
        code_sha256={p.relative_to(root).as_posix(): shared.sha(p) for p in files},
        environment=dict(python=platform.python_version(), **{p: importlib.metadata.version(p)
                         for p in ('numpy', 'scipy')}),
        configs=affine.CONFIGS, baseline_ids=list(affine.BASELINES), lead_months=1,
        origins={stage: reference['protocol'][stage + '_origins'] for stage in STAGES},
        intercept='Signed;absolute cap0.2*outer-origin trailing12 mean(abs(observed net sales))',
        training='One-step baseline predictions with12month history;targets<=outer origin;min8;trailing12/24/all',
        selection='Development complete cases:>=5% lower MAE than strongest complete baseline AND abs normalized bias<=5%;else retain mean6',
        user_target='WAPE strictly below10% or5% plus existing strongest-baseline/bias guard;not guaranteed',
        target_unit='PHP', temporal_status='All later outcomes already inspected;retrospective,not untouched',
        historical_selection_changed=False, publication_approved=False)


def register(source_path, reference_path, output):
    spec = specification(source_path, reference_path)
    source, reference = (json.loads(p.read_bytes()) for p in (source_path, reference_path))
    retained.validate_source(source, reference, spec['source_sha256'])
    output.mkdir(parents=True, exist_ok=False)
    shared.write(output / 'registration.json', spec)
    return spec


def choose(rows):
    if any(r['stage'] != 'development' for r in rows):
        raise ValueError('Development-only selection')
    bases = [r for r in rows if r['model_id'] in affine.BASELINES and r['failed'] == 0]
    if len(bases) != len(affine.BASELINES) or len({r['n'] for r in bases}) != 1:
        raise ValueError('Four complete comparable baselines required')
    strongest = min(bases, key=lambda r: (r['mae'], r['model_id']))
    eligible = [r for r in rows if r['model_id'] not in affine.BASELINES and not r['failed']
                and r['n'] == strongest['n'] and r['mae'] <= .95 * strongest['mae']
                and r['normalized_bias'] is not None and abs(r['normalized_bias']) <= 5.]
    selected = min(eligible, key=lambda r: (r['mae'], r['model_id'])) if eligible else next(
        r for r in bases if r['model_id'] == 'mean_6')
    def target(limit):
        return selected in eligible and selected['wape'] is not None and selected['wape'] < limit
    return dict(selected_model=selected['model_id'], best_development_baseline=strongest['model_id'],
        candidate_passes_guard=bool(eligible), below10_with_guard=target(10), below5_with_guard=target(5),
        stage='development', audit_used=False, publication_approved=False)


def execute(source_path, reference_path, output):
    spec = specification(source_path, reference_path)
    if json.loads((output / 'registration.json').read_bytes()) != spec:
        raise ValueError('Registration source/code/environment changed')
    # Refuse a retry after partial or completed output; preserve all attempts.
    if {p.name for p in output.iterdir()} != {'registration.json'}:
        raise ValueError('Execution directory is not empty beyond registration')
    source, reference = (json.loads(p.read_bytes()) for p in (source_path, reference_path))
    series = retained.validate_source(source, reference, spec['source_sha256'])
    points, reports = [], []
    for stage in STAGES:
        if stage != 'development' and not (output / 'selection.json').exists():
            raise ValueError('Development selection must be frozen before later scoring')
        expected = reference['protocol'][stage + '_origins']
        inherited = [p for p in reference['predictions'] if p['stage'] == stage
                     and p['lead_months'] == 1 and p['model_id'] in affine.BASELINES]
        for name in affine.BASELINES:
            baseline = [p for p in inherited if p['model_id'] == name]
            if len(baseline) != len(expected) or sorted(p['origin_period'] for p in baseline) != sorted(expected):
                raise ValueError('Baseline cohort mismatch')
            for p in baseline:
                if contracts.month(p['target_period']) != contracts.month(p['origin_period']) + 1 or p['actual'] != series.get(contracts.month(p['target_period'])):
                    raise ValueError('Baseline target/source identity mismatch')
                recomputed = affine.baseline_vector(series, contracts.month(p['origin_period']))[affine.BASELINES.index(name)]
                if not math.isclose(recomputed, p['prediction'], rel_tol=1e-12, abs_tol=1e-6):
                    raise ValueError('Baseline prediction formula mismatch')
                points.append(dict(p, inherited=True, failure=None))
        for label in expected:
            origin = contracts.month(label)
            known = {p: v for p, v in series.items() if p <= origin}
            for config in affine.CONFIGS:
                prediction, trace, failure = None, None, None
                try:
                    prediction, trace = affine.predict(known, origin, config)
                except ValueError as error:
                    failure = str(error)
                points.append(dict(stage=stage, model_id=config['model_id'], origin_period=label,
                    target_period=contracts.period(origin + 1), lead_months=1, actual=series[origin + 1],
                    prediction=prediction, trace=trace, failure=failure, inherited=False))
        stage_reports = []
        for name in (*affine.BASELINES, *(c['model_id'] for c in affine.CONFIGS)):
            rows = [p for p in points if p['stage'] == stage and p['model_id'] == name]
            failures = sum(p['failure'] is not None for p in rows)
            # A failed case makes the whole group unavailable, never a smaller scored cohort.
            scored = metrics.score([] if failures else [(p['actual'], p['prediction']) for p in rows])
            stage_reports.append(dict(stage=stage, model_id=name, expected_n=len(expected),
                                      failed=failures, **scored))
        reports.extend(stage_reports)
        if stage == 'development':
            shared.write(output / 'development.json', dict(points=points, reports=stage_reports))
            shared.write(output / 'selection.json', choose(stage_reports))
    result = dict(points=points, reports=reports, selection=json.loads((output / 'selection.json').read_bytes()),
        source_identity=source['source_identity'], target_unit='PHP', untouched_test=False,
        publication_approved=False, operational_approval=False, executed_at=datetime.now(timezone.utc).isoformat())
    shared.write(output / 'results.json', result)
    with (output / 'metrics.csv').open('w', encoding='utf-8', newline='') as handle:
        writer = csv.DictWriter(handle, fieldnames=list(reports[0])); writer.writeheader(); writer.writerows(reports)
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--mode', choices=('register', 'execute'), required=True)
    for name in ('source', 'reference', 'output'):
        parser.add_argument('--' + name, type=Path, required=True)
    args = parser.parse_args()
    if args.mode == 'register':
        register(args.source, args.reference, args.output)
        print('REGISTERED_NARROW_JOINT_AFFINE_EXTENSION_BEFORE_FIT')
    else:
        result = execute(args.source, args.reference, args.output)
        print(json.dumps(dict(points=len(result['points']), selection=result['selection'],
                              failed=sum(p['failure'] is not None for p in result['points']))))


if __name__ == '__main__':
    main()
