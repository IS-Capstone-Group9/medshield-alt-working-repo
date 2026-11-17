"""Explicit recorded-itemized-subset research, separate from company approval gates.

Never changes complete-company coverage decisions, model pointers or runtime data.
Prepare freezes source, target, methods, calendar and code before any fitting.
"""
import argparse
from collections import defaultdict
from copy import deepcopy
from datetime import datetime, timezone
from decimal import Decimal
import hashlib
import json
from pathlib import Path
import warnings

from .contracts import digest, month, period
from .engine import DEFAULT_SCHEDULE, CRITERIA, evaluate_fold, package_versions, select_model
from .metrics import compare, score
from .models import BENCHMARKS, CHALLENGERS, EXTENDED_CHALLENGERS


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def write(path, value):
    raw = (json.dumps(value, indent=2, sort_keys=True, allow_nan=False) + '\n').encode()
    with path.open('xb') as stream:
        stream.write(raw)
    return sha(raw)


def source_values(source):
    """Independent Decimal conservation of daily, area/month and annual controls."""
    truth = source['release'].get('analytical_integrity', {})
    if (truth.get('policy') != 'original_itemized_sales_v1' or truth.get('scope') != 'itemized_product_sales'
            or truth.get('serving_version') != 0 or truth.get('kept_rows') != 40160):
        raise ValueError('Expected verified original-itemized correction, pinned at Delta 0')
    if source['source'] != 'databricks' or source['warehouse_writes'] != 0:
        raise ValueError('Read-only Gold receipt required')
    queries = source['queries']
    daily, monthly, annual = {}, {}, {}
    for row in queries['daily']['rows']:
        key = (row['day'], row['normalized_area'], row['is_adjusted_source'])
        if key in daily:
            raise ValueError('Duplicate daily aggregate')
        daily[key] = row
    grouped = defaultdict(list)
    for row in daily.values():
        grouped[row['normalized_area'], row['day'][:7]].append(row)
    for row in queries['monthly_control']['rows']:
        key = row['normalized_area'], row['month'][:7]
        if key in monthly:
            raise ValueError('Duplicate monthly control')
        monthly[key] = row
        rows = grouped.get(key, [])
        for field in ('records', 'eligible_records'):
            if sum(int(r[field]) for r in rows) != int(row[field]):
                raise ValueError('Daily/monthly count differs')
        amounts = [Decimal(r['revenue']) for r in rows if r['revenue'] is not None]
        actual = sum(amounts) if amounts else None
        expected = Decimal(row['revenue']) if row['revenue'] is not None else None
        if actual != expected:
            raise ValueError('Daily/monthly exact revenue differs')
    if set(monthly) != set(grouped):
        raise ValueError('Daily/monthly calendar differs')
    for row in queries['annual_control']['rows']:
        year = row['year']
        if year in annual:
            raise ValueError('Duplicate annual control')
        annual[year] = row
        rows = [r for r in monthly.values() if r['month'].startswith(year)]
        for field in ('records', 'eligible_records'):
            if sum(int(r[field]) for r in rows) != int(row[field]):
                raise ValueError('Monthly/annual count differs')
        if sum(Decimal(r['revenue']) for r in rows if r['revenue'] is not None) != Decimal(row['revenue']):
            raise ValueError('Monthly/annual exact revenue differs')
    if sum(int(r['records']) for r in annual.values()) != truth['kept_rows']:
        raise ValueError('Extracted population differs from correction manifest')
    values = defaultdict(list)
    for row in monthly.values():
        if row['revenue'] is not None:
            values[row['month'][:7]].append(Decimal(row['revenue']))
    start, end = month('2017-01'), month('2026-09')
    return [dict(period=period(p), value_php=str(sum(values[period(p)])) if values[period(p)] else None,
                 coverage='recorded_subset_not_verified_company_completeness') for p in range(start, end + 1)]


def code_hashes():
    return {name: sha(Path(__file__).with_name(name).read_bytes()) for name in
            ('corrected_research.py', 'contracts.py', 'engine.py', 'models.py', 'metrics.py')}


def prepare(source_path, output):
    raw = source_path.read_bytes()
    if sha(raw) != source_path.with_suffix('.sha256').read_text().strip():
        raise ValueError('Gold source checksum differs')
    source = json.loads(raw)
    rows = source_values(source)
    output.mkdir(parents=True, exist_ok=True)
    specification = dict(version='corrected_recorded_itemized_research_v1', prepared_at=datetime.now(timezone.utc).isoformat(),
                         source_sha256=sha(raw), analytical_integrity=source['release']['analytical_integrity'],
                         target=dict(name='net_sales', unit='PHP', grain='month', buyers='all',
                                     scope='corrected_retained_itemized_subset_not_complete_company_sales'),
                         source_completeness='unknown', training_authority='current_user_request_for_recorded_subset_research',
                         schedule=deepcopy(DEFAULT_SCHEDULE), criteria=deepcopy(CRITERIA),
                         configurations=deepcopy(BENCHMARKS + CHALLENGERS + EXTENDED_CHALLENGERS),
                         extension=dict(origin='2025-12', first_target='2026-01', last_target='2026-09', leads=list(range(1, 10))),
                         selection='development_only_saved_before_audit', seed=20260927, code_hashes=code_hashes(),
                         packages=package_versions(), observed_rows=rows, publication_approved=False,
                         limitations=['Revised source snapshot, no historical issue-time vintages.',
                                      'Previously inspected dates: retrospective evaluation, never an untouched holdout.',
                                      'Missing months remain null; signed values are retained; no product quantities inferred.',
                                      'Comparison is recorded itemized PHP, not complete company revenue or medicine demand.',
                                      'No external regressors fitted: their accepted source/join and issue-time gates remain open.',
                                      'Existing model adapters learn from origin-known history only; no global STL features.',
                                      'Source-dependent historical artifacts remain preserved and withheld from current serving.'])
    checksum = write(output/'registration.json', specification)
    (output/'registration.sha256').write_text(checksum+'\n')
    print(json.dumps(dict(status='PREPARED_NOT_FITTED', registration_sha256=checksum, methods=len(specification['configurations']))))


def run(source_path, output):
    raw = (output/'registration.json').read_bytes()
    if sha(raw) != (output/'registration.sha256').read_text().strip():
        raise ValueError('Registration checksum differs')
    plan = json.loads(raw)
    if code_hashes() != plan['code_hashes'] or package_versions() != plan['packages']:
        raise ValueError('Frozen implementation/runtime changed')
    if sha(source_path.read_bytes()) != plan['source_sha256']:
        raise ValueError('Frozen Gold source changed')
    if source_values(json.loads(source_path.read_bytes())) != plan['observed_rows']:
        raise ValueError('Source reconciliation changed')
    configs = plan['configurations']
    series = {month(r['period']): float(Decimal(r['value_php'])) for r in plan['observed_rows']
              if r['value_php'] is not None and r['period'] >= plan['schedule']['training_start']}
    first, last = month(plan['schedule']['training_start']), month('2026-09')
    if set(series) != set(range(first, last + 1)):
        raise ValueError('Frozen evaluation requires each recorded target month; no missing-month imputation')
    run_id = sha(raw)
    predictions, folds, captured = [], [], []

    def fit(config, origin, stage, leads):
        with warnings.catch_warnings(record=True) as observed:
            warnings.simplefilter('always')
            points = evaluate_fold(series, 'corrected_itemized_all_buyers_php', origin, config, run_id, [], stage, plan['seed'])
        captured.extend(dict(model_id=config['model_id'], origin=period(origin), stage=stage,
                             category=type(w.message).__name__, message=str(w.message)) for w in observed)
        points = [p for p in points if p['lead_months'] in leads]
        for point in points:
            point['scope'] = plan['target']['scope']
            # These are unsupported with five dependent development folds.
            assert all(b['lower'] is None and b['upper'] is None for b in point['intervals'])
        train = [dict(period=period(p), value=series[p]) for p in range(first, origin + 1)]
        folds.append(dict(model_id=config['model_id'], origin=period(origin), stage=stage,
                          training_start=period(first), training_end=period(origin), training_count=len(train),
                          training_sha256=digest(train), actual_leads=leads))
        predictions.extend(points)

    for config in configs:
        for origin in plan['schedule']['development_origins']:
            fit(config, month(origin), 'development', list(range(1, 13)))
    development = [p for p in predictions if p['stage'] == 'development']
    selected, reason, comparisons = select_model(development, configs)
    selection = dict(model_id=selected, reason=reason, criteria=plan['criteria'], stage='development_only',
                     frozen_before_audit=True, comparisons=comparisons)
    selection_sha = write(output/'selection-before-audit.json', selection)
    for config in configs:
        fit(config, month(plan['schedule']['audit_origin']), 'retrospective_audit', list(range(1, 13)))
        fit(config, month(plan['extension']['origin']), 'retrospective_extension_2026', list(range(1, 10)))
    assert sha((output/'selection-before-audit.json').read_bytes()) == selection_sha
    evaluations, paired = [], {}
    for stage, expected in [('development', 60), ('retrospective_audit', 12), ('retrospective_extension_2026', 9)]:
        points = [p for p in predictions if p['stage'] == stage]
        complete = []
        for config in configs:
            selected_points = [p for p in points if p['model_id'] == config['model_id']]
            assert len(selected_points) == expected
            pairs = [(p['actual'], p['prediction']) for p in selected_points if p['actual'] is not None and p['prediction'] is not None]
            if len(pairs) == expected:
                complete.append(config['model_id'])
            evaluations.append(dict(stage=stage, model_id=config['model_id'], expected_cases=expected,
                                    complete_for_comparison=len(pairs) == expected, metrics=score(pairs),
                                    missing_reasons=sorted({p['missing_reason'] for p in selected_points if p['missing_reason']})))
        paired[stage] = compare(points, complete)
        assert all(r['common']['n'] == expected for r in paired[stage].values())
    artifacts = dict(predictions=predictions, evaluations=evaluations, folds=folds, warnings=captured, comparisons=paired)
    hashes = {name: write(output/(name+'.json'), value) for name, value in artifacts.items()}
    result = dict(status='EVALUATED_RECORDED_ITEMIZED_SUBSET_UNPUBLISHED', completed_at=datetime.now(timezone.utc).isoformat(),
                  run_id=run_id, source_sha256=plan['source_sha256'], analytical_integrity=plan['analytical_integrity'],
                  target=plan['target'], selection=selection, selection_sha256=selection_sha, artifacts=hashes,
                  limitations=plan['limitations'], publication_approved=False, source_completeness='unknown')
    write(output/'result.json', result)
    print(json.dumps(dict(status=result['status'], selected=selected, methods=len(configs), predictions=len(predictions))))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--prepare', action='store_true')
    args = parser.parse_args()
    (prepare if args.prepare else run)(args.source, args.output)


if __name__ == '__main__':
    main()
