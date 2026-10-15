"""Registered exploratory SARIMA/ridge comparison; no release or publication."""
import argparse
from collections import Counter
import copy
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import subprocess
import warnings

from .contracts import digest
from .engine import CRITERIA, DEFAULT_SCHEDULE, package_versions, run
from .models import BENCHMARKS, CHALLENGERS, EXTENDED_CHALLENGERS


def protocol():
    return dict(
        version='1.0', status='exploratory_revised_recipe', promotion=False,
        target='company_month_net_sales_PHP', configurations=copy.deepcopy(
            BENCHMARKS + CHALLENGERS + EXTENDED_CHALLENGERS),
        schedule=copy.deepcopy(DEFAULT_SCHEDULE), criteria=copy.deepcopy(CRITERIA), seed=20260927,
        rationale='Bounded sales-only SARIMA and regularized lag candidates on the unchanged fixed-origin cohorts.',
        preprocessing=dict(
            ridge='Training-row feature centering and population-standard-deviation scaling; unpenalized intercept.',
            sarima='Divide origin-known observations by their population standard deviation, or absolute level for a constant series.',
            missing='No imputation; require all frozen eligible months.',
            surges='Preserve all signed observed values; no clipping, log transform or outlier removal.'),
        ridge_features=dict(origin_offsets=[0, 1, 2, 5, 11], rolling_windows=[3, 6, 12],
                            calendar=['target_month_sine', 'target_month_cosine'],
                            direct='Separate model per lead with training targets no later than its issue origin.',
                            recursive='One-step model feeds its predictions into future lag/rolling features.'),
        limitations=[
            'Extension was designed after the original retrospective 2025 audit was inspected.',
            'Selection uses development only, but 2025 remains a retrospective audit and cannot be an untouched final test.',
            'Any revised recipe requires later untouched accepted actuals before promotion.',
            'Historical issue-time availability is unverified because inputs are a revised snapshot.',
            '2020–2025 reporting completeness is inherited user attestation, not independent source verification.',
            'Company PHP revenue is not SKU quantity demand, disease causation or operational replenishment.',
            'Five development origins are dependent and provide too little per-lead support for empirical intervals.',
            'Leads 1–12 do not cover an October 2026–September 2027 display from a December 2025 origin.',
            'Existing comparison criteria are experimental; business error tolerance remains unset.',
            'SARIMA nonconvergence produces unavailable predictions rather than an accepted fitted result.'
        ])


def registration(raw_input):
    files = ['extended_experiment.py', 'contracts.py', 'models.py', 'metrics.py', 'engine.py']
    source_hashes = {name: hashlib.sha256(Path(__file__).with_name(name).read_bytes()).hexdigest()
                     for name in files}
    root = Path(__file__).resolve().parents[3]
    try:
        head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root, text=True).strip()
    except (OSError, subprocess.CalledProcessError):
        head = 'unavailable'
    identity = dict(protocol=protocol(), input_sha256=hashlib.sha256(raw_input).hexdigest(),
                    packages=package_versions(), code_identity=dict(git_head=head, code_sha256=source_hashes))
    return dict(identity=identity, experiment_id=digest(identity))


def evaluate(data, specification, code_identity=None):
    if specification != protocol():
        raise ValueError('Protocol differs from registered exploratory definition')
    with warnings.catch_warnings(record=True) as captured:
        warnings.simplefilter('always')
        result = run(data, schedule=specification['schedule'], configurations=specification['configurations'],
                     seed=specification['seed'], code_identity=code_identity)
    counts = Counter((warning.category.__name__, str(warning.message)) for warning in captured)
    result['warnings'] = [dict(category=category, message=message, count=count)
                          for (category, message), count in sorted(counts.items())]
    result['experiment_protocol'] = specification
    result['publication_approved'] = False
    if result['status'] != 'blocked':
        result['status'] = 'exploratory_evaluated_unpublished'
    result['limitations'].extend(specification['limitations'])
    if result['selection']:
        result['selection']['status'] = 'exploratory_candidate_only'
        result['selection']['audit_previously_inspected'] = True
    for card in result['model_cards']:
        card['status'] = 'exploratory_candidate_unpublished'
    return result


def report(result):
    lines = ['# Registered extended predictive experiment', '',
             f'Run: `{result["run_id"]}`. Status: `{result["status"]}`.',
             'Company monthly recorded net sales, PHP; same five development origins, leads 1–12, 2025 retrospective audit.',
             'The original 15 configurations are retained and six exploratory candidates are added.', '',
             '| Model | Dev n | Dev WAPE % | Dev bias % | Audit n | Audit WAPE % | Audit MAE PHP |',
             '|---|---:|---:|---:|---:|---:|---:|']
    def fmt(value):
        return 'unavailable' if value is None else f'{value:,.6f}'
    for evaluation in result['evaluations']:
        development, audit = evaluation['development_scored'], evaluation['audit']
        lines.append(f'| {evaluation["model_id"]} | {development["n"]} | {fmt(development["wape"])} | '
                     f'{fmt(development["normalized_bias"])} | {audit["n"]} | {fmt(audit["wape"])} | {fmt(audit["mae"])} |')
    lines += ['', 'Selection: ' + json.dumps(result['selection'], sort_keys=True), '', '## Limitations', '']
    lines.extend('- ' + item for item in result['experiment_protocol']['limitations'])
    lines += ['', '## Numerical/model warnings', '']
    lines.extend('- ' + json.dumps(item, sort_keys=True) for item in result['warnings'])
    lines += ['', '## Unavailable candidates', '']
    lines.extend('- ' + card['model_id'] + ': ' + '; '.join(card['unsupported_reasons'])
                 for card in result['model_cards'] if card['unsupported_reasons'])
    lines += ['', 'Primary method documentation: [statsmodels SARIMAX](https://www.statsmodels.org/stable/generated/statsmodels.tsa.statespace.sarimax.SARIMAX.html), '
              '[maximum likelihood fitting](https://www.statsmodels.org/stable/generated/statsmodels.tsa.statespace.sarimax.SARIMAX.fit.html), '
              '[ridge objective](https://scikit-learn.org/stable/modules/generated/sklearn.linear_model.Ridge.html).',
              'These describe methods; the grid, origin-local transform, minimum examples and nonconvergence policy are project choices.', '']
    return '\n'.join(lines)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--prepare', action='store_true')
    args = parser.parse_args()
    raw = args.input.read_bytes()
    if hashlib.sha256(raw).hexdigest() != args.input.with_suffix('.sha256').read_text().strip():
        raise ValueError('Frozen input byte checksum mismatch')
    record = registration(raw)
    path = args.output / 'protocol.json'
    if args.prepare:
        args.output.mkdir(parents=True, exist_ok=True)
        record['registered_at'] = datetime.now(timezone.utc).isoformat()
        with path.open('x', encoding='utf-8') as handle:
            json.dump(record, handle, indent=2, sort_keys=True, allow_nan=False)
        print(json.dumps(dict(status='registered_not_evaluated', experiment_id=record['experiment_id'], output=str(path))))
        return
    registered = json.loads(path.read_text(encoding='utf-8'))
    if ({key: registered.get(key) for key in ('identity', 'experiment_id')} != record
            or set(registered) != {'identity', 'experiment_id', 'registered_at'}):
        raise ValueError('Input, model code, environment or protocol changed since registration')
    datetime.fromisoformat(registered['registered_at'])
    if (args.output / 'artifact-hashes.json').exists() or any(args.output.glob('*/run.json')):
        raise ValueError('An evaluation already exists; use a new experiment directory')
    started_at = datetime.now(timezone.utc).isoformat()
    result = evaluate(json.loads(raw.decode('utf-8-sig')), record['identity']['protocol'], record['identity']['code_identity'])
    result['experiment_id'] = record['experiment_id']
    result['registered_at'] = registered['registered_at']
    result['evaluation_started_at'] = started_at
    result['evaluation_finished_at'] = datetime.now(timezone.utc).isoformat()
    output = args.output / result['run_id']
    output.mkdir(exist_ok=False)
    artifacts = {'run.json': result, 'input-manifest.json': result['manifest'], 'folds.json': result['folds'],
                 'predictions.json': result['predictions'], 'evaluations.json': result['evaluations'],
                 'model-cards.json': result['model_cards'], 'warnings.json': result['warnings'],
                 'coverage.json': dict(rows=len(json.loads(raw.decode('utf-8-sig'))['rows']), blockers=result['blockers'])}
    hashes = {'../protocol.json': hashlib.sha256(path.read_bytes()).hexdigest()}
    for name, content in artifacts.items():
        encoded = (json.dumps(content, indent=2, sort_keys=True, allow_nan=False) + '\n').encode('utf-8')
        (output / name).write_bytes(encoded)
        hashes[name] = hashlib.sha256(encoded).hexdigest()
    (output / 'RESULTS.md').write_text(report(result), encoding='utf-8')
    hashes['RESULTS.md'] = hashlib.sha256((output / 'RESULTS.md').read_bytes()).hexdigest()
    (output / 'artifact-hashes.json').write_text(json.dumps(hashes, indent=2, sort_keys=True) + '\n', encoding='utf-8')
    # Deliberately no release draft: this extension cannot enter publication by itself.
    print(json.dumps(dict(status=result['status'], run_id=result['run_id'], experiment_id=record['experiment_id'],
                          output=str(output), blockers=result['blockers'], selection=result['selection'])))


if __name__ == '__main__':
    main()
