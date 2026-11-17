"""Compare two fixed calendar-scaled sales forecasts on retained PHP cases."""

import argparse
import calendar
from datetime import datetime, timedelta, timezone
import json
import math
from pathlib import Path
import platform

from .. import abc_evaluation as evidence
from ..predictive import contracts, metrics
from . import run_stable_ets_review as retained

ROOT = Path(__file__).resolve().parents[3]
SOURCE = ROOT / 'outputs/wp4_forecast_tournament_20261030/source.json'
REFERENCE = ROOT / 'outputs/wp4_new_tournament_20261030/results.json'
STAGES = ('development', 'retrospective_audit', 'inspected_extension')
BASELINES = ('last_value', 'mean_3', 'mean_6', 'seasonal_naive')
CANDIDATES = ('calendar_day_rate6', 'weekday_rate6')


def exposure(label):
    year, number = map(int, label.split('-'))
    first, days = calendar.monthrange(year, number)
    weekdays = sum((first + offset) % 7 < 5 for offset in range(days))
    return days, weekdays


def predictions(history, origin):
    months = [contracts.period(p) for p in range(origin - 5, origin + 1)]
    if any(month not in history or not math.isfinite(history[month]) for month in months):
        raise ValueError('Six consecutive observed months required')
    totals = tuple(map(sum, zip(*(exposure(month) for month in months))))
    target = exposure(contracts.period(origin + 1))
    volume = math.fsum(history[month] for month in months)
    return {model: volume * target[index] / totals[index] for index, model in enumerate(CANDIDATES)}


def stamp():
    return datetime.now(timezone(timedelta(hours=8))).isoformat()


def specification():
    files = [SOURCE, REFERENCE, Path(__file__), Path(contracts.__file__), Path(metrics.__file__),
             Path(retained.__file__), Path(evidence.__file__)]
    return dict(schema='company_PHP_calendar_exposure_v1',
                hashes={path.relative_to(ROOT).as_posix(): retained.sha(path) for path in files},
                python=platform.python_version(), lead=1,
                target='signed original itemized PHP sales excluding Contracts',
                recipe='Sum of six previous observed monthly net values divided by their total day exposure, '
                       'multiplied by next month exposure. Weekdays are Monday to Friday with no holiday adjustment.',
                candidates=list(CANDIDATES), baselines=list(BASELINES),
                development_guard='At least 5% lower MAE than best complete baseline and absolute normalized bias <=5%.',
                inspected_retrospective=True, publication_approved=False)


def write(path, value):
    with path.open('xb') as stream:
        stream.write(evidence.encoded(value))


def execute(output):
    source, reference = (json.loads(path.read_bytes()) for path in (SOURCE, REFERENCE))
    series = retained.validate_source(source, reference, retained.sha(SOURCE))
    if max(series) != contracts.month('2026-09') or not source['contracts_excluded']:
        raise ValueError('Unexpected source period or population')
    dated = {contracts.period(month): value for month, value in series.items()}
    points, scores = [], []
    for stage, expected in zip(STAGES, (19, 7, 4)):
        origins = reference['protocol'][stage + '_origins']
        if len(origins) != expected or len(set(origins)) != expected:
            raise ValueError('Changed origin cohort')
        old = {}
        for point in reference['predictions']:
            if point['stage'] == stage and point['lead_months'] == 1 and point['model_id'] in BASELINES:
                key = (point['origin_period'], point['model_id'])
                if key in old:
                    raise ValueError('Duplicate retained case')
                old[key] = point
        for label in origins:
            origin = contracts.month(label)
            target = contracts.period(origin + 1)
            actual = dated[target]
            recent = [series[month] for month in range(origin - 5, origin + 1)]
            vector = dict(zip(BASELINES, (recent[-1], sum(recent[-3:]) / 3, sum(recent) / 6, series[origin - 11])))
            for model, expected_prediction in vector.items():
                point = old.pop((label, model))
                if (point['target_period'] != target or point['actual'] != actual or
                        not math.isclose(point['prediction'], expected_prediction, abs_tol=1e-6, rel_tol=1e-12)):
                    raise ValueError('Retained baseline identity or value mismatch')
            vector.update(predictions(dated, origin))
            for model, prediction in vector.items():
                points.append(dict(stage=stage, origin=label, target=target, model=model, actual=actual, prediction=prediction))
        if old:
            raise ValueError('Unexpected retained cases')
        summaries = {}
        for model in (*BASELINES, *CANDIDATES):
            rows = [row for row in points if row['stage'] == stage and row['model'] == model]
            score = metrics.score([(row['actual'], row['prediction']) for row in rows])
            summaries[model] = score
            scores.append(dict(stage=stage, model=model, **score))
        if stage == 'development':
            comparator = min(BASELINES, key=lambda model: summaries[model]['mae'])
            base = summaries[comparator]['mae']
            candidates = {}
            for model in CANDIDATES:
                score = summaries[model]
                candidates[model] = (base > 0 and score['mae'] <= .95 * base and
                                     score['normalized_bias'] is not None and abs(score['normalized_bias']) <= 5)
            write(output / 'development.json', dict(comparator=comparator, passed=candidates))
    write(output / 'results.json', dict(finished_at=stamp(), series=source['source_identity'],
        registration_sha256=retained.sha(output / 'registration.json'), points=points, scores=scores,
        prospective_accuracy_measured=False, warehouse_writes=0))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=('register', 'execute'))
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    spec = specification()
    registration = args.output / 'registration.json'
    if args.action == 'register':
        args.output.mkdir(parents=True, exist_ok=False)
        write(registration, dict(registered_at=stamp(), specification=spec))
    else:
        if json.loads(registration.read_bytes())['specification'] != spec:
            raise ValueError('Registered input or code changed')
        write(args.output / 'started.json', dict(started_at=stamp(), registration_sha256=retained.sha(registration)))
        execute(args.output)


if __name__ == '__main__':
    main()
