"""Source-bound retrospective 2026 extension; fitting and publication stay gated."""
import argparse
from copy import deepcopy
import hashlib
import json
from pathlib import Path
import re

from . import engine
from .contracts import digest, eligible, month, period, validate_input
from .metrics import compare, score

RUNNER_VERSION = 'recorded_company_php_2026_extension_v1'
EXTENSION_STAGE = 'retrospective_extension_2026'


def checked_json(path):
    """Verify raw artifact bytes before interpreting their identity or decisions."""
    raw = path.read_bytes()
    checksum = hashlib.sha256(raw).hexdigest()
    if path.with_suffix('.sha256').read_text(encoding='utf-8').strip() != checksum:
        raise ValueError(f'Frozen artifact checksum mismatch: {path.name}')
    return json.loads(raw.decode('utf-8-sig')), checksum


def validate_plan(data, plan, input_sha256, plan_sha256):
    for value in (input_sha256, plan_sha256):
        if not isinstance(value, str) or not re.fullmatch(r'[a-f0-9]{64}', value):
            raise ValueError('Input and plan SHA-256 identities are required')
    if plan.get('schema_version') != 1 or plan.get('status') != 'prepared_not_executed_not_approval':
        raise ValueError('An explicit prepared evaluation plan is required')
    if plan.get('publication_approved') is not False:
        raise ValueError('An evaluation plan cannot grant publication approval')
    manifest = data['manifest']
    for key in ('dataset_id', 'fact_delta_version', 'source_table'):
        if plan.get(key) != manifest.get(key):
            raise ValueError(f'Plan {key} differs from frozen input')
    if (isinstance(plan['fact_delta_version'], bool) or not isinstance(plan['fact_delta_version'], int)
            or plan['fact_delta_version'] < 0):
        raise ValueError('Plan fact version must be a nonnegative integer')
    if not re.fullmatch(r'workspace\.medshield_gold_source_\d{8}\.sales_restart_fact_candidate', plan['source_table']):
        raise ValueError('The extension requires its isolated source table')
    if plan.get('frozen_input_sha256') != input_sha256:
        raise ValueError('Plan frozen input checksum mismatch')
    if plan.get('descriptive_receipt_sha256') != manifest.get('source_checksum'):
        raise ValueError('Plan descriptive receipt checksum mismatch')
    if plan.get('target') != dict(name='net_sales', unit='PHP', scope='company', grain='company_month'):
        raise ValueError('The extension permits company monthly net-sales PHP only')
    schedule = plan.get('schedule', {})
    engine.validate_schedule(schedule)
    if (schedule.get('training_start') != '2020-01' or schedule.get('audit_origin') != '2024-12'
            or schedule.get('audit_end') != '2025-12' or schedule.get('audit_label') != 'retrospective_audit'):
        raise ValueError('Preserve the twelve-month 2025 retrospective audit')
    extension = plan.get('retrospective_extension', {})
    expected = dict(origin='2025-12', first_target='2026-01', last_observed_target='2026-09',
                    observed_months=9, selection_allowed=False, untouched_holdout=False,
                    target_after_2026_09='unknown_not_zero')
    if any(extension.get(key) != value for key, value in expected.items()):
        raise ValueError('The frozen extension must retain nine retrospective 2026 targets and no selection')
    configs = plan.get('candidate_grid')
    if (not isinstance(configs, list) or not configs or any(not isinstance(c, dict) or not isinstance(c.get('model_id'), str) for c in configs)
            or len({c['model_id'] for c in configs}) != len(configs)):
        raise ValueError('A nonempty frozen grid with unique model identities is required')
    if plan.get('experimental_selection_criteria') != engine.CRITERIA:
        raise ValueError('Plan selection criteria differ from the existing engine')
    return deepcopy(schedule), deepcopy(configs)


def run(data, plan, *, input_sha256, plan_sha256, code_identity, seed=20260927):
    """Run only a reviewed input; extension scores never change engine selection.

    The CLI checks artifact bytes. API callers must supply the checked raw hashes,
    rather than hashes of a reserialized representation.
    """
    blockers = validate_input(data)
    schedule, configs = validate_plan(data, plan, input_sha256, plan_sha256)
    identity = dict(runner_version=RUNNER_VERSION, frozen_input_sha256=input_sha256,
                    input_data_hash=digest(data), plan_sha256=plan_sha256,
                    plan_data_hash=digest(plan), code_identity=code_identity, seed=seed)
    result = dict(schema_version=1, extension_run_id=digest(identity), status='blocked', identity=identity,
                  dataset_id=data['manifest']['dataset_id'], source_table=data['manifest']['source_table'],
                  fact_delta_version=data['manifest']['fact_delta_version'], blockers=sorted(set(blockers)),
                  base_run=None, predictions=[], evaluations=[], comparisons={}, comparison_models=[], selection=None,
                  selection_sha256=None, selection_unchanged=None, publication_approved=False,
                  limitations=['Retrospective revised-snapshot evaluation; no historical issue-time vintages are established.',
                               'The nine observed 2026 targets do not form a twelve-month audit or an untouched holdout.',
                               'Extension scores cannot select, replace or publish a model.',
                               'Company PHP forecasts do not establish medicine demand, disease effects or procurement actions.'])
    if blockers:
        return result
    first, last = month(schedule['training_start']), month('2026-09')
    selected_rows = [r for r in data['rows'] if first <= month(r['period']) <= last]
    series_ids = {r['series_id'] for r in selected_rows}
    values = {month(r['period']): r['target_value'] for r in selected_rows if eligible(r)}
    if len(series_ids) != 1 or set(values) != set(range(first, last + 1)):
        result['blockers'] = ['Complete accepted 2020-01 through 2026-09 coverage is required before fitting']
        return result
    if any(eligible(r) and month(r['period']) > last for r in data['rows']):
        result['blockers'] = ['Accepted observations after the frozen 2026-09 cutoff require a new plan']
        return result
    base = engine.run(data, schedule=schedule, configurations=configs, code_identity=code_identity, seed=seed)
    result['base_run'] = base
    if base['status'] != 'evaluated_unpublished':
        result['blockers'] = list(base['blockers'])
        return result
    selection = deepcopy(base['selection'])
    selection_hash = digest(selection)
    result.update(selection=selection, selection_sha256=selection_hash)
    origin = month('2025-12')
    series_id = next(iter(series_ids))
    for config in configs:
        residuals = [p for p in base['predictions'] if p['model_id'] == config['model_id']
                     and month(p['target_period']) <= origin and p['stage'] != 'future']
        points = engine.evaluate_fold(values, series_id, origin, config, result['extension_run_id'],
                                      residuals, EXTENSION_STAGE, seed)
        points = [p for p in points if 1 <= p['lead_months'] <= 9]
        if len(points) != 9 or {p['target_period'] for p in points} != {period(origin + lead) for lead in range(1, 10)}:
            raise ValueError('Extension evaluation changed its nine target cases')
        result['predictions'].extend(points)
        pairs = [(p['actual'], p['prediction']) for p in points if p['actual'] is not None and p['prediction'] is not None]
        complete = len(pairs) == 9
        result['evaluations'].append(dict(model_id=config['model_id'], metrics=score(pairs),
                                         expected_cases=9, complete_for_comparison=complete,
                                         missing_reasons=sorted({p['missing_reason'] for p in points if p['missing_reason']}),
                                         by_actual_lead=engine.grouped_metrics(points, 'lead_months')))
        if complete:
            result['comparison_models'].append(config['model_id'])
    comparisons = compare(result['predictions'], result['comparison_models'])
    if any(value['common']['n'] != 9 for value in comparisons.values()):
        raise ValueError('Comparable models must use all nine identical extension cases')
    result['comparisons'] = comparisons
    result['training_origin'] = '2025-12'
    result['training_count'] = origin - first + 1
    result['training_sha256'] = digest([dict(period=period(p), value=values[p]) for p in range(first, origin + 1)])
    if digest(base['selection']) != selection_hash:
        raise ValueError('Extension evaluation changed the base model selection')
    if any(p.get('actual') is not None for p in base['predictions'] if p['stage'] == 'future'):
        raise ValueError('Future prediction points must not contain actuals')
    result['selection_unchanged'] = True
    result['status'] = 'evaluated_unpublished'
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', type=Path, required=True)
    parser.add_argument('--plan', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    if args.output.exists():
        raise FileExistsError('Preserve existing extension artifacts; choose a new output directory')
    data, input_hash = checked_json(args.input)
    plan, plan_hash = checked_json(args.plan)
    from .__main__ import code_identity
    result = run(data, plan, input_sha256=input_hash, plan_sha256=plan_hash, code_identity=code_identity())
    output = args.output / result['extension_run_id']
    output.mkdir(parents=True, exist_ok=False)
    artifacts = {'extension-run.json': result, 'input-manifest.json': data['manifest'],
                 'evaluation-plan.json': plan, 'predictions.json': result['predictions'],
                 'evaluations.json': result['evaluations']}
    hashes = {}
    for name, value in artifacts.items():
        raw = (json.dumps(value, indent=2, sort_keys=True, allow_nan=False) + '\n').encode()
        (output / name).write_bytes(raw)
        hashes[name] = hashlib.sha256(raw).hexdigest()
    (output / 'artifact-hashes.json').write_text(json.dumps(hashes, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(dict(status=result['status'], output=str(output), blockers=result['blockers'],
                          extension_points=len(result['predictions']), publication_approved=False)))


if __name__ == '__main__':
    main()
