"""Registered annual research projections from evaluated recipes; no approval or re-selection."""
import argparse
from collections import Counter
import copy
from datetime import date, datetime, timedelta, timezone
import hashlib
import json
import math
from pathlib import Path
import re
import subprocess
import sys
import warnings

from .contracts import digest, eligible, month, period, validate_input
from .engine import package_versions
from .models import BENCHMARKS, CHALLENGERS, EXTENDED_CHALLENGERS, forecast

MANILA = timezone(timedelta(hours=8), 'Asia/Manila')
LEADS = list(range(1, 13))
INHERITED_FILES = {'contracts.py', 'models.py', 'metrics.py', 'engine.py', 'extended_experiment.py'}
INTERVAL_REASON = 'Five dependent development errors per lead; insufficient supported calibration; no new interval fit.'


def require(condition, message):
    if not condition:
        raise ValueError(message)


def raw_hash(raw):
    return hashlib.sha256(raw).hexdigest()


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        require(key not in result, f'Duplicate JSON field: {key}')
        result[key] = value
    return result


def read_json(raw):
    def invalid_constant(value):
        raise ValueError(f'Nonfinite JSON constant: {value}')
    result = json.loads(raw.decode('utf-8-sig'), object_pairs_hook=unique_object, parse_constant=invalid_constant)
    digest(result)  # Also rejects overflowing exponent forms such as 1e999.
    return result


def encode(value):
    return (json.dumps(value, indent=2, sort_keys=True, ensure_ascii=False, allow_nan=False) + '\n').encode('utf-8')


def verified_bytes(path, declared):
    require(isinstance(declared, str) and bool(re.fullmatch('[a-f0-9]{64}', declared)), 'Invalid declared SHA-256')
    raw = path.read_bytes()
    require(raw_hash(raw) == declared, f'Byte checksum mismatch: {path.name}')
    return raw


def parse_as_of(value):
    require(isinstance(value, str) and bool(re.fullmatch(r'\d{4}-\d{2}-\d{2}', value)), 'As-of must be a Manila ISO date')
    return date.fromisoformat(value)


def training_data(data, comparison, as_of):
    blockers = validate_input(data)
    require(not blockers, 'Frozen input is not approved for training: ' + '; '.join(blockers))
    schedule = comparison['identity']['schedule']
    start, origin = month(schedule['training_start']), month(schedule['audit_end'])
    require((schedule['training_start'], schedule['audit_end']) == ('2020-01', '2025-12'),
            'This inherited annual recipe requires January 2020–December 2025 cutoff')
    require(month(as_of[:7]) > origin, 'As-of reference must be after the training cutoff')
    rows = [row for row in data['rows'] if start <= month(row['period']) <= origin]
    require(len(rows) == 72 and all(eligible(row) for row in rows), 'Require all 72 contiguous eligible training months; no gap imputation')
    require(len({row['series_id'] for row in rows}) == 1, 'Require exactly one company series')
    values = {month(row['period']): row['target_value'] for row in rows}
    require(set(values) == set(range(start, origin + 1)), 'Training calendar contains a gap')
    training = [dict(period=period(number), value=values[number]) for number in range(start, origin + 1)]
    return rows[0]['series_id'], values, dict(training_start=period(start), data_cutoff_period=period(origin),
        training_count=len(training), training_hash=digest(training), values=training,
        availability='revised_snapshot_training_only_user_attestation_no_historical_vintages',
        supplied_future_row_count=sum(month(row['period']) > origin for row in data['rows']),
        target='company_month_net_sales_PHP', forecast_leads=LEADS,
        target_periods=[period(origin + lead) for lead in LEADS])


def comparison_contract(comparison):
    require(comparison.get('status') == 'exploratory_evaluated_unpublished', 'Require retained exploratory comparison')
    require(comparison.get('publication_approved') is False, 'Comparison is not the inherited unpublished experiment')
    identity = comparison['identity']
    configs = identity['configurations']
    require(len(configs) == 21 and len({config['model_id'] for config in configs}) == 21,
            'Require exactly 21 unique inherited model identities')
    require(configs == BENCHMARKS + CHALLENGERS + EXTENDED_CHALLENGERS,
            'Inherited configurations differ from evaluated adapter recipes')
    require(isinstance(identity['seed'], int) and not isinstance(identity['seed'], bool), 'Seed must be an integer')
    selection = comparison['selection']
    require(selection['stage'] == 'development_only' and selection['audit_previously_inspected'] is True
            and selection['model_id'] == 'last_value', 'Require inherited last-value development selection and retrospective audit label')
    evaluations = comparison['evaluations']
    require(len(evaluations) == 21 and {entry['model_id'] for entry in evaluations} == {config['model_id'] for config in configs},
            'Comparison evaluation/model identities differ')
    require(comparison['experiment_protocol']['configurations'] == configs, 'Comparison configurations differ from registered protocol')
    require(comparison['experiment_protocol']['seed'] == identity['seed'], 'Comparison seed differs from registered protocol')
    return configs


def load_sources(input_path, comparison_path):
    input_path, comparison_path = input_path.resolve(), comparison_path.resolve()
    sidecar = input_path.with_suffix('.sha256')
    input_raw = verified_bytes(input_path, sidecar.read_text(encoding='utf-8').strip())
    hash_map_path = comparison_path.parent / 'artifact-hashes.json'
    hash_map_raw = hash_map_path.read_bytes()
    declared = read_json(hash_map_raw)
    required = {'run.json', 'predictions.json', 'evaluations.json', 'model-cards.json', 'input-manifest.json',
                'folds.json', 'warnings.json', 'coverage.json', 'RESULTS.md', '../protocol.json'}
    require(set(declared) == required and comparison_path.name == 'run.json', 'Incomplete inherited comparison artifact map')
    artifacts, receipts = {}, []
    for name, checksum in sorted(declared.items()):
        path = (comparison_path.parent / name).resolve()
        require(path.is_relative_to(comparison_path.parent.parent), 'Comparison artifact path escapes experiment directory')
        raw = verified_bytes(path, checksum)
        artifacts[name] = raw
        receipts.append(dict(path=str(path), sha256=checksum, bytes=len(raw)))
    data, comparison = read_json(input_raw), read_json(artifacts['run.json'])
    comparison_contract(comparison)
    require(data['manifest'] == comparison['manifest'] and digest(data) == comparison['identity']['input_hash'],
            'Frozen input differs from evaluated comparison')
    protocol = read_json(artifacts['../protocol.json'])
    require(protocol['identity']['input_sha256'] == raw_hash(input_raw), 'Comparison protocol raw-input identity differs')
    require(protocol['identity']['protocol'] == comparison['experiment_protocol'], 'Inherited registered protocol differs')
    for name, field in [('predictions.json', 'predictions'), ('evaluations.json', 'evaluations'),
                        ('model-cards.json', 'model_cards'), ('folds.json', 'folds'), ('warnings.json', 'warnings'),
                        ('input-manifest.json', 'manifest')]:
        require(read_json(artifacts[name]) == comparison[field], f'Comparison standalone {field} differs from run')
    receipt = dict(input_path=str(input_path), input_sha256=raw_hash(input_raw), input_sidecar_sha256=raw_hash(sidecar.read_bytes()),
                   comparison_path=str(comparison_path), comparison_sha256=raw_hash(artifacts['run.json']),
                   comparison_artifact_map_sha256=raw_hash(hash_map_raw), verified_comparison_artifacts=receipts)
    return data, comparison, receipt


def code_identity(comparison):
    inherited = comparison['identity']['code_identity']['code_sha256']
    require(set(inherited) == INHERITED_FILES, 'Unknown inherited adapter-code scope')
    current = {name: raw_hash(Path(__file__).with_name(name).read_bytes()) for name in sorted(INHERITED_FILES)}
    require(current == inherited, 'Evaluated adapter code changed; this is not the inherited recipe')
    current['annual_projection.py'] = raw_hash(Path(__file__).read_bytes())
    root = Path(__file__).resolve().parents[3]
    try:
        head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root, text=True).strip()
    except (OSError, subprocess.CalledProcessError):
        head = 'unavailable'
    return dict(git_head=head, code_sha256=current, inherited_adapter_code_sha256=inherited)


def registration(data, comparison, source_receipt, as_of):
    parse_as_of(as_of)
    configs = comparison_contract(comparison)
    _, _, training = training_data(data, comparison, as_of)
    packages = package_versions()
    require(packages == comparison['identity']['packages'], 'Evaluated package environment changed')
    identity = dict(version='1.0', purpose='annual_projection_research_only', publication_approved=False,
        adopted_planning_constraint='annual_sales_release_availability; actual annual release date not supplied',
        as_of_manila=as_of, as_of_semantics='reference_date_not_historical_issue_time',
        input_hash=digest(data), source_receipt=source_receipt, configurations=copy.deepcopy(configs),
        seed=comparison['identity']['seed'], packages=packages, code_identity=code_identity(comparison),
        training=training, inherited_comparison_run_id=comparison['run_id'], inherited_selection=copy.deepcopy(comparison['selection']),
        inherited_evaluations_sha256=digest(comparison['evaluations']),
        intervals='Null; no new calibration; five dependent development errors per lead insufficient',
        failed_recipe='All twelve leads unavailable on missing/nonfinite/failed output or ConvergenceWarning; no clipping or imputation')
    return dict(identity=identity, projection_id=digest(identity))


def period_status(target_period, as_of):
    if month(target_period) < month(as_of[:7]):
        return 'elapsed_no_actual'
    return 'current_month_no_actual' if target_period == as_of[:7] else 'future_no_actual'


def project(data, comparison, record, generated_at):
    generated = datetime.fromisoformat(generated_at)
    require(generated.tzinfo is not None and generated.utcoffset() == timedelta(0), 'Generation timestamp must be actual UTC')
    identity = record['identity']
    require(record['projection_id'] == digest(identity), 'Projection registration identity mismatch')
    require(identity['configurations'] == comparison_contract(comparison), 'Registered recipe configurations differ')
    series_id, training, training_record = training_data(data, comparison, identity['as_of_manila'])
    require(training_record == identity['training'], 'Training identity differs from registration')
    origin = month(training_record['data_cutoff_period'])
    evaluations = {entry['model_id']: entry for entry in comparison['evaluations']}
    result = dict(schema_version='1.0', projection_id=record['projection_id'], status='annual_projection_research_unpublished',
        publication_approved=False, generated_at=generated_at, generated_on_manila=generated.astimezone(MANILA).date().isoformat(),
        as_of_manila=identity['as_of_manila'], as_of_semantics=identity['as_of_semantics'],
        identity=identity, source_manifest=copy.deepcopy(data['manifest']), training=training_record,
        inherited_selection=copy.deepcopy(comparison['selection']), inherited_evaluations=copy.deepcopy(comparison['evaluations']),
        inherited_comparison_run_id=comparison['run_id'], projection_points=[], model_cards=[], warnings=[],
        limitations=copy.deepcopy(comparison['limitations']) + [
            'Annual availability is an adopted planning constraint; the source owner has not supplied an annual release date.',
            'Generated now from an October 2026-extracted revised snapshot; never a forecast issued in December 2025 or January 2026.',
            'Elapsed/current/future 2026 periods have no accepted actuals in this frozen input; points are unverified research projections.',
            'No recipe tuning, re-selection, new backtest, calibration, approval, release draft, warehouse storage or pointer write.',
            'Inherited development and 2025 audit errors do not measure these generated 2026 projections.',
            'No operational use, quantity demand, disease causation or procurement outcome is established.'])
    for config in identity['configurations']:
        reason = None
        with warnings.catch_warnings(record=True) as captured:
            warnings.simplefilter('always')
            try:
                predictions, reason = forecast(dict(training), origin, LEADS[:], copy.deepcopy(config), identity['seed'])
                if reason or set(predictions) != set(LEADS) or any(isinstance(lead, bool) or not isinstance(lead, int) for lead in predictions):
                    reason = reason or 'Incomplete twelve-lead adapter output; coherent annual recipe unavailable'
                elif any(isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value)
                         for value in predictions.values()):
                    reason = 'Nonfinite or invalid adapter value; coherent annual recipe unavailable'
            except Exception as exc:
                predictions, reason = {}, f'{type(exc).__name__}: {exc}'
        warning_counts = Counter((warning.category.__name__, str(warning.message)) for warning in captured)
        model_warnings = [dict(model_id=config['model_id'], category=category, message=message, count=count)
                          for (category, message), count in sorted(warning_counts.items())]
        result['warnings'].extend(model_warnings)
        if any(warning['category'] == 'ConvergenceWarning' for warning in model_warnings):
            reason = reason or 'Optimizer convergence warning; coherent annual recipe unavailable'
        available = reason is None
        for lead in LEADS:
            target = period(origin + lead)
            result['projection_points'].append(dict(projection_id=record['projection_id'], model_id=config['model_id'],
                series_id=series_id, target_name='net_sales', scope='company', unit='PHP',
                origin_period=period(origin), data_cutoff_period=period(origin), target_period=target, lead_months=lead,
                prediction=float(predictions[lead]) if available else None, actual=None,
                generated_at=generated_at, as_of_manila=identity['as_of_manila'],
                period_status=period_status(target, identity['as_of_manila']), stage='annual_research_projection',
                status='research_candidate_unpublished' if available else 'research_candidate_unavailable',
                publication_approved=False, selected_by_inherited_comparison=config['model_id'] == comparison['selection']['model_id'],
                missing_reason=reason, intervals=[dict(level=level, lower=None, upper=None, sample_count=5,
                    method='not_calibrated', reason=INTERVAL_REASON) for level in (.8, .95)]))
        result['model_cards'].append(dict(model_id=config['model_id'], configuration=copy.deepcopy(config),
            status='research_candidate_unpublished' if available else 'research_candidate_unavailable',
            publication_approved=False, selected_by_inherited_comparison=config['model_id'] == comparison['selection']['model_id'],
            training_count=len(training), data_cutoff_period=period(origin), forecast_leads=LEADS,
            available_point_count=12 if available else 0, unavailable_reason=reason, warnings=model_warnings,
            inherited_comparison_metrics=copy.deepcopy(evaluations[config['model_id']]),
            inherited_metrics_label='existing development and previously inspected 2025 retrospective audit; no 2026 accuracy measured'))
    return result


def report(result):
    statuses = Counter(point['period_status'] for point in result['projection_points']
                       if point['selected_by_inherited_comparison'])
    lines = [f"# Annual research projection — generated {result['generated_on_manila']}", '',
        f"Projection `{result['projection_id']}`; `{result['status']}`; publication approved: **false**.", '',
        f"Generated at `{result['generated_at']}`. Manila reference date: `{result['as_of_manila']}`. "
        'These timestamps do not backdate issuance to the December 2025 data cutoff.', '',
        'All 21 inherited recipes were called once with the same 72 eligible January 2020–December 2025 values. '
        'Targets are company monthly recorded net sales in PHP, January–December 2026, true calendar leads 1–12. '
        f"All actuals and interval bounds are null. Period states: {statuses['elapsed_no_actual']} elapsed, "
        f"{statuses['current_month_no_actual']} current, {statuses['future_no_actual']} future months without accepted actuals here.", '',
        'The inherited development-only selection remains `last_value`; no challenger qualified in the retained comparison. '
        'There was no tuning, re-selection or additional accuracy evaluation. Annual sales-release availability is the adopted '
        'planning constraint; an actual source-release date has not been supplied.', '',
        '| Recipe | Available leads | Status | Unavailable reason |', '| --- | ---: | --- | --- |']
    for card in result['model_cards']:
        lines.append(f"| {card['model_id']} | {card['available_point_count']} | {card['status']} | {card['unavailable_reason'] or '—'} |")
    lines += ['', '## Inherited selected recipe', '', '| Period / lead | Candidate PHP | Period state |', '| --- | ---: | --- |']
    for point in result['projection_points']:
        if point['selected_by_inherited_comparison']:
            value = 'unavailable' if point['prediction'] is None else f"{point['prediction']:,.2f}"
            lines.append(f"| {point['target_period']} / {point['lead_months']} | {value} | {point['period_status']} |")
    lines += ['', '## Model warnings', '']
    lines.extend('- ' + json.dumps(warning, ensure_ascii=False, sort_keys=True) for warning in result['warnings'])
    if not result['warnings']:
        lines.append('No Python model warnings captured.')
    lines += ['', '## Limits', '']
    lines.extend('- ' + limitation for limitation in result['limitations'])
    lines += ['', 'Source hashes, evaluated adapter code hashes, current projection code, package versions, inherited '
        'configurations/seed/selection, exact training values and command are bound in the registered identity and run. '
        'No model-release draft or activation artifact is emitted.', '']
    return '\n'.join(lines)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', type=Path, required=True)
    parser.add_argument('--comparison', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--as-of', required=True, help='Manila reference date; never a backdated issue time')
    parser.add_argument('--prepare', action='store_true')
    args = parser.parse_args()
    data, comparison, sources = load_sources(args.input, args.comparison)
    record = registration(data, comparison, sources, args.as_of)
    protocol_path = args.output / 'protocol.json'
    if args.prepare:
        require(not args.output.exists(), 'Registration output already exists; use a new directory')
        args.output.mkdir(parents=True, exist_ok=False)
        registered = dict(record, registered_at=datetime.now(timezone.utc).isoformat(),
                          prepare_command=subprocess.list2cmdline(sys.orig_argv))
        protocol_path.write_bytes(encode(registered))
        print(json.dumps(dict(status='registered_not_fitted', projection_id=record['projection_id'], output=str(protocol_path))))
        return
    registered = read_json(protocol_path.read_bytes())
    require(set(registered) == {'identity', 'projection_id', 'registered_at', 'prepare_command'}
            and {key: registered[key] for key in ('identity', 'projection_id')} == record,
            'Input, comparison, code, packages or as-of changed since registration')
    registered_at = datetime.fromisoformat(registered['registered_at'])
    require(registered_at.tzinfo is not None, 'Registration timestamp must include timezone')
    output = args.output / record['projection_id']
    require(not output.exists() and not any(args.output.glob('*/run.json')), 'A projection already exists; no overwrite permitted')
    generated_at = datetime.now(timezone.utc).isoformat()
    require(datetime.fromisoformat(generated_at) >= registered_at, 'Generation cannot predate registration')
    result = project(data, comparison, record, generated_at)
    result.update(registered_at=registered['registered_at'], prepare_command=registered['prepare_command'],
                  execution_command=subprocess.list2cmdline(sys.orig_argv), finished_at=datetime.now(timezone.utc).isoformat())
    output.mkdir(exist_ok=False)
    artifacts = {'run.json': result, 'projections.json': result['projection_points'], 'model-cards.json': result['model_cards'],
        'input-manifest.json': result['source_manifest'], 'training.json': result['training'],
        'inherited-evaluations.json': result['inherited_evaluations'], 'warnings.json': result['warnings']}
    hashes = {'../protocol.json': raw_hash(protocol_path.read_bytes())}
    for name, value in artifacts.items():
        raw = encode(value)
        (output / name).write_bytes(raw)
        hashes[name] = raw_hash(raw)
    raw = report(result).encode('utf-8')
    (output / 'RESULTS.md').write_bytes(raw)
    hashes['RESULTS.md'] = raw_hash(raw)
    (output / 'artifact-hashes.json').write_bytes(encode(hashes))
    print(json.dumps(dict(status=result['status'], projection_id=record['projection_id'], output=str(output),
        model_count=len(result['model_cards']), points=len(result['projection_points']),
        available_models=sum(card['available_point_count'] == 12 for card in result['model_cards']),
        publication_approved=False, inherited_selected_model=result['inherited_selection']['model_id'])))


if __name__ == '__main__':
    main()
