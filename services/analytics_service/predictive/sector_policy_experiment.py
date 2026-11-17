"""Registered annual sector-specific benchmark selection; offline research only."""
import argparse
import csv
from datetime import datetime, timezone
import hashlib
import json
import math
from pathlib import Path
import platform
import sys

from .contracts import digest, month, period
from .metrics import score

SCOPES = ('All', 'Government', 'Private', 'Internal')
SECTORS = SCOPES[1:]
MODELS = ('last_value', 'seasonal_naive', 'mean_3', 'mean_6')
WINDOWS = ('2017-01', '2020-01')
DEV_ORIGINS = ('2022-12', '2023-12')
AUDIT_ORIGIN = '2024-12'
MIN_SELECTION_CASES = 12
PROTOCOL = dict(version='annual-sector-policy-v1', target='monthly signed recorded net sales PHP',
    windows=list(WINDOWS), development_origins=list(DEV_ORIGINS), evaluation_origin=AUDIT_ORIGIN,
    actual_leads=list(range(1, 13)), methods=list(MODELS),
    selection='Minimum MAE on identical finite development origin/target/lead cases across all four methods; listed-order tie break',
    minimum_selection_cases=MIN_SELECTION_CASES, fallback='last_value when fewer than12 common monthly development cases',
    selection_cutoff='2024-12', aggregate='Sum Government/Private/Internal only when all predictions are available',
    comparison='Company last_value and direct company development-selected control on identical company keys, prefixes3/6/12',
    missing='No imputation; exact calendar requirements; keep signed values and nulls',
    history='Same cases for both windows; these four methods require at most12 preceding months, so older history may be unused',
    limits=['2025 already inspected; retrospective research, not an untouched final test',
            'Revised history does not establish historical issue-time/revision availability',
            'Buyer mappings remain proposed; PHP is not verified medicine quantity',
            'No trained adapter rule change, production selection, activation, interval or procurement claim'])


def timestamp():
    return datetime.now(timezone.utc).isoformat()


def require(condition, message):
    if not condition:
        raise ValueError(message)


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def write_json(path, value):
    with Path(path).open('x', encoding='utf-8') as handle:
        handle.write(json.dumps(value, indent=2, allow_nan=False) + '\n')


def validate_input(data):
    manifest = data.get('manifest', {})
    require(manifest.get('schema_version') == 'medshield.sector-policy-input.v1', 'Unsupported input schema')
    require((manifest.get('input_start'), manifest.get('input_end'), manifest.get('unit')) == ('2017-01', '2025-12', 'PHP'), 'Unexpected calendar/unit')
    require(manifest.get('source_release', {}).get('fact_delta_version') == 20, 'Expected bound fact20 source')
    series = {scope: {} for scope in SCOPES}
    for row in data.get('rows', []):
        scope, date, value = row.get('scope'), row.get('period'), row.get('value')
        require(scope in SCOPES, 'Unknown scope')
        date = month(date)
        require(month('2017-01') <= date <= month('2025-12'), 'Month outside input calendar')
        require(date not in series[scope], 'Duplicate month/scope key')
        require('value' in row and (value is None or not isinstance(value, bool) and isinstance(value, (int, float)) and math.isfinite(value)), 'Revenue must be finite or null')
        series[scope][date] = value
    calendar = set(range(month('2017-01'), month('2025-12') + 1))
    require(all(set(values) == calendar for values in series.values()), 'Every month/scope including nulls required')
    for date in calendar:
        actual = series['All'][date]
        present = [series[s][date] for s in SECTORS if series[s][date] is not None]
        require((actual is None and not present) or actual is not None and present and abs(actual-math.fsum(present)) <= .01000001, 'Company/observed-sector accounting mismatch')
    return series


def predict(values, origin, target, model, start):
    require(model in MODELS, 'Unknown method')
    require(1 <= target-origin <= 12, 'Only actual calendar leads1-12')
    if model == 'seasonal_naive':
        reference = target
        while reference > origin:
            reference -= 12
        required = [reference]
    else:
        width = {'last_value': 1, 'mean_3': 3, 'mean_6': 6}[model]
        required = list(range(origin-width+1, origin+1))
    missing = [date for date in required if date < start or values.get(date) is None]
    if missing:
        return None, [period(date) for date in required], 'Missing required calendar observations: '+','.join(period(d) for d in missing)
    require(all(date <= origin and math.isfinite(values[date]) for date in required), 'Nonfinite or future dependency')
    return math.fsum(values[date] for date in required)/len(required), [period(date) for date in required], None


def key(point):
    return point['origin_period'], point['target_period'], point['lead_months']


def benchmark_points(series, start, origins, stage):
    points = []
    for origin_string in origins:
        origin = month(origin_string)
        for lead in range(1, 13):
            for scope in SCOPES:
                for model in MODELS:
                    prediction, required, reason = predict(series[scope], origin, origin+lead, model, month(start))
                    points.append(dict(window_start=start, stage=stage, scope=scope, model_id=model,
                        origin_period=origin_string, target_period=period(origin+lead), lead_months=lead,
                        actual=series[scope].get(origin+lead), prediction=prediction, required_periods=required, reason=reason))
    return points


def select_methods(points, minimum=MIN_SELECTION_CASES):
    choices = {}
    for scope in SCOPES:
        indexes = {model: {} for model in MODELS}
        for point in points:
            require(point['stage'] == 'development' and point['target_period'] <= PROTOCOL['selection_cutoff'], 'Selection cannot inspect later/audit outcomes')
            if point['scope'] != scope or point['prediction'] is None or point['actual'] is None:
                continue
            model = point['model_id']
            require(key(point) not in indexes[model], 'Duplicate method evaluation key')
            indexes[model][key(point)] = point
        common = sorted(set.intersection(*(set(index) for index in indexes.values())))
        for case in common:
            require(len({indexes[model][case]['actual'] for model in MODELS}) == 1, 'Actuals differ on common key')
        scores = {model: score([(indexes[model][case]['actual'], indexes[model][case]['prediction']) for case in common]) for model in MODELS}
        method = min(MODELS, key=lambda model: (scores[model]['mae'], MODELS.index(model))) if len(common) >= minimum else 'last_value'
        choices[scope] = dict(selected_model=method, common_cases=len(common), common_keys=[list(k) for k in common],
                              scores=scores, fallback=len(common)<minimum,
                              reason='Insufficient common development support; retain last value' if len(common)<minimum else 'Lowest matched-case development MAE')
    return choices


def company_points(benchmarks, choices):
    lookup = {(key(point), point['scope'], point['model_id']): point for point in benchmarks}
    require(len(lookup) == len(benchmarks), 'Duplicate benchmark point')
    points = []
    for case in sorted({key(point) for point in benchmarks}):
        reference = lookup[case, 'All', 'last_value']
        direct = lookup[case, 'All', choices['All']['selected_model']]
        members = [lookup[case, scope, choices[scope]['selected_model']] for scope in SECTORS]
        prediction = math.fsum(p['prediction'] for p in members) if all(p['prediction'] is not None for p in members) else None
        for model, value, reason in [('direct_last_value', reference['prediction'], reference['reason']),
                                     ('direct_development_choice', direct['prediction'], direct['reason']),
                                     ('sector_policy', prediction, None if prediction is not None else 'Unavailable selected sector prediction')]:
            points.append({**{k:reference[k] for k in ('window_start','stage','origin_period','target_period','lead_months','actual')},
                           'scope':'All', 'model_id':model, 'prediction':value, 'reason':reason})
    return points


def comparisons(points):
    models = ('direct_last_value', 'direct_development_choice', 'sector_policy')
    result = {}
    for limit in (3, 6, 12):
        indexes = {model: {} for model in models}
        for point in points:
            model = point['model_id']
            if model not in indexes or point['lead_months'] > limit or point['actual'] is None or point['prediction'] is None:
                continue
            require(key(point) not in indexes[model], 'Duplicate company evaluation key')
            indexes[model][key(point)] = point
        common = sorted(set.intersection(*(set(index) for index in indexes.values())))
        for case in common:
            require(len({indexes[m][case]['actual'] for m in models})==1, 'Compared actuals differ')
        result[str(limit)] = dict(common_cases=len(common), common_keys=[list(k) for k in common],
            metrics={model: dict(native=score([(p['actual'],p['prediction']) for p in indexes[model].values()]),
                                 common=score([(indexes[model][k]['actual'],indexes[model][k]['prediction']) for k in common])) for model in models})
    return result


def identity(input_path):
    directory = Path(__file__).parent
    return dict(input_sha256=sha(input_path), code_sha256={name:sha(directory/name) for name in ('sector_policy_experiment.py','contracts.py','metrics.py')},
                protocol_sha256=digest(PROTOCOL), runtime=dict(executable=sys.executable, python=platform.python_version(), implementation=platform.python_implementation()))


def prepare(input_path, output):
    data = json.loads(Path(input_path).read_text(encoding='utf-8-sig'))
    validate_input(data)
    output = Path(output)
    require(not output.exists() or not any(output.iterdir()), 'Registration requires a new empty output directory')
    output.mkdir(parents=True, exist_ok=True)
    record = dict(status='registered', registered_at_utc=timestamp(), identity=identity(input_path), protocol=PROTOCOL, source_manifest=data['manifest'])
    write_json(output/'registration.json', record)
    return record


def run(input_path, output):
    output = Path(output)
    registration = json.loads((output/'registration.json').read_text())
    require(registration['identity']==identity(input_path) and registration['protocol']==PROTOCOL, 'Registration identity drift; use a new registration')
    require(set(p.name for p in output.iterdir())=={'registration.json'}, 'Execution requires an unused registered output directory')
    data = json.loads(Path(input_path).read_text(encoding='utf-8-sig'))
    require(data['manifest']==registration['source_manifest'], 'Source manifest drift')
    series = validate_input(data)
    development = {start:benchmark_points(series,start,DEV_ORIGINS,'development') for start in WINDOWS}
    choices = {start:select_methods(points) for start,points in development.items()}
    write_json(output/'development.json', development)
    frozen = dict(frozen_at_utc=timestamp(), selection_cutoff=PROTOCOL['selection_cutoff'], choices=choices,
                  source_registration_sha256=sha(output/'registration.json'), audit_already_inspected=True, publication_approved=False)
    write_json(output/'selection.json', frozen)
    # No evaluation scores are computed before this on-disk selection freeze.
    audit_started = timestamp()
    retrospective = {start:benchmark_points(series,start,(AUDIT_ORIGIN,),'inspected_retrospective') for start in WINDOWS}
    company = {start:company_points(points,choices[start]) for start,points in retrospective.items()}
    all_benchmarks = {start:development[start]+retrospective[start] for start in WINDOWS}
    wide = {(p['stage'],p['scope'],p['model_id'],key(p)):p for p in all_benchmarks[WINDOWS[0]]}
    narrow = {(p['stage'],p['scope'],p['model_id'],key(p)):p for p in all_benchmarks[WINDOWS[1]]}
    differences = [str(k) for k in wide if (wide[k]['prediction'],wide[k]['required_periods'],wide[k]['reason']) != (narrow[k]['prediction'],narrow[k]['required_periods'],narrow[k]['reason'])]
    result = dict(status='completed_research_only', generated_at_utc=timestamp(), audit_started_at_utc=audit_started,
                  selection_sha256=sha(output/'selection.json'), registration_sha256=sha(output/'registration.json'),
                  comparisons={start:comparisons(points) for start,points in company.items()},
                  history_comparison=dict(matched_benchmark_keys=len(wide), differences=len(differences),
                      selected_methods_identical=choices[WINDOWS[0]]==choices[WINDOWS[1]],
                      explanation='All registered dependencies fall in2022 or later; pre2020 history does not enter these four formulas on this evaluation schedule'),
                  retrospective_benchmarks=retrospective, company_predictions=company, limits=PROTOCOL['limits'])
    require(set(wide)==set(narrow), 'History comparison has mismatched keys')
    write_json(output/'results.json', result)
    with (output/'PREDICTIONS.csv').open('x',encoding='utf-8',newline='') as handle:
        fields=('window_start','stage','scope','model_id','origin_period','target_period','lead_months','actual','prediction','reason')
        writer=csv.DictWriter(handle,fieldnames=fields,extrasaction='ignore')
        writer.writeheader()
        for start in WINDOWS:
            writer.writerows(all_benchmarks[start]+company[start])
    lines=['# Registered annual sector-specific experiment', '', 'Retrospective research only;2025 was already inspected.', '',
           '| Window | Scope | Frozen method | Common development cases | Fallback |','|---|---|---|---:|---|']
    for start in WINDOWS:
        for scope,choice in choices[start].items():
            lines.append(f"| {start} | {scope} | {choice['selected_model']} | {choice['common_cases']} | {choice['fallback']} |")
    lines+=['','| Window | Prefix months | Method | Common cases | MAE PHP | WAPE % | Bias PHP |','|---|---:|---|---:|---:|---:|---:|']
    for start,groups in result['comparisons'].items():
        for limit,group in groups.items():
            for model,metrics in group['metrics'].items():
                m=metrics['common']
                lines.append(f"| {start} | {limit} | {model} | {m['n']} | {m['mae']} | {m['wape']} | {m['bias']} |")
    lines+=['',json.dumps(result['history_comparison']), '', 'No production selection or forecast activation. The technical12-case rule is not a business tolerance.']
    with (output/'RESULTS.md').open('x',encoding='utf-8') as handle:
        handle.write('\n'.join(lines)+'\n')
    return result


if __name__ == '__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input',type=Path,required=True)
    parser.add_argument('--output',type=Path,required=True)
    parser.add_argument('--prepare',action='store_true')
    args=parser.parse_args()
    if args.prepare:
        record=prepare(args.input,args.output)
        print(json.dumps(dict(status=record['status'],registered_at_utc=record['registered_at_utc'])))
    else:
        result=run(args.input,args.output)
        print(json.dumps(dict(status=result['status'],history_comparison=result['history_comparison'],comparisons=result['comparisons'])))
