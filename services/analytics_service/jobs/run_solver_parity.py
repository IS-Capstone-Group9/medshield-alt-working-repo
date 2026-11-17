"""Execute synthetic WP9 proof cases against actual TS and two MILP model APIs.

The Python models use explicit per-product feasible pack options. Dated expiry
is incorporated in those domains, never silently omitted from an ordinary LP.
This is solver verification on synthetic assumptions, not a company allocation.
"""
from __future__ import annotations

import argparse
import csv
from datetime import date, timedelta
from fractions import Fraction
import hashlib
from itertools import product
import json
from math import ceil, prod, lcm
from pathlib import Path
import platform
import subprocess
import sys

import numpy as np
import scipy
from scipy.optimize import Bounds, LinearConstraint, milp

ROOT = Path(__file__).resolve().parents[3]
FIXTURES = ROOT / 'config/solver_proof_cases.json'


def candidate_options(case):
    """Integer arithmetic domain independent of gateway FEFO implementation."""
    groups = []
    for item in case['items']:
        choices = []
        required = ceil(Fraction(item['demand']) * Fraction(str(case['minimum_pct'])) / 100)
        for packs in range(item['max_packs'] + 1):
            expired = 0
            if case['kind'] == 'dated':
                if item['available'] != 0 or sum(case['daily_demand']) != item['demand']:
                    raise ValueError('Dated proof domain requires zero initial stock and matching explicit demand')
                remaining, fulfilled = packs * item['pack'], 0
                for index, demand in enumerate(case['daily_demand']):
                    day = date.fromisoformat(case['as_of']) + timedelta(days=index)
                    if day >= date.fromisoformat(case['arrival']) and day >= date.fromisoformat(case['expiry']):
                        expired += remaining
                        remaining = 0
                    if date.fromisoformat(case['arrival']) <= day < date.fromisoformat(case['expiry']):
                        take = min(demand, remaining)
                        fulfilled += take
                        remaining -= take
                if expired > case['maximum_expired_units']:
                    continue
            else:
                fulfilled = min(item['demand'], item['available'] + packs * item['pack'])
            if fulfilled < required:
                continue
            choices.append({'packs': packs, 'cost_cents': packs * item['pack_cost_cents'],
                            'fulfilled': fulfilled, 'expired': expired,
                            'score': Fraction(item['score'] * fulfilled, item['demand'])})
        groups.append(choices)
    return groups


def exhaustive_expected(case):
    weight = sum(item['score'] for item in case['items'])
    feasible = [(sum((option['score'] for option in options), Fraction()) / weight,
                 tuple(option['packs'] for option in options))
                for options in product(*candidate_options(case))
                if sum(option['cost_cents'] for option in options) <= case['budget_cents']]
    if not feasible:
        return {'status': 'infeasible', 'packs': None, 'objective': None, 'unique_optimum': True}
    best = max(objective for objective, _ in feasible)
    optima = [packs for objective, packs in feasible if objective == best]
    if len(optima) != 1:
        raise ValueError('Proof fixture must have a unique primary optimum; no undocumented tie-break')
    return {'status': 'optimal', 'packs': list(optima[0]), 'objective': str(best), 'unique_optimum': True}


def solve_models(case):
    groups = candidate_options(case)
    if any(not group for group in groups):
        return {'scipy': {'status': 'infeasible', 'packs': None, 'objective': None},
                'pulp': {'status': 'infeasible', 'packs': None, 'objective': None}}
    flat = [(index, option) for index, group in enumerate(groups) for option in group]
    scale = lcm(*(option['score'].denominator for _, option in flat))
    coefficients = np.array([int(option['score'] * scale) for _, option in flat], dtype=float)
    constraints = np.zeros((len(groups)+1, len(flat)))
    for position, (index, option) in enumerate(flat):
        constraints[index, position] = 1
        constraints[-1, position] = option['cost_cents']
    bound = np.array([1]*len(groups) + [case['budget_cents']])
    lower = np.array([1]*len(groups) + [-np.inf])
    scipy_result = milp(-coefficients, integrality=np.ones(len(flat)), bounds=Bounds(0, 1),
                        constraints=LinearConstraint(constraints, lower, bound),
                        options={'mip_rel_gap': 0, 'time_limit': 30})

    def selected(values):
        selected_options = [(index, option) for value, (index, option) in zip(values, flat) if value > .5]
        if len(selected_options) != len(groups) or len({index for index, _ in selected_options}) != len(groups):
            raise AssertionError('Solver did not choose exactly one feasible option per product')
        if sum(option['cost_cents'] for _, option in selected_options) > case['budget_cents']:
            raise AssertionError('Solver violated integer-cent budget')
        return {'status': 'optimal', 'packs': [option['packs'] for _, option in selected_options],
                'objective': str(sum((option['score'] for _, option in selected_options), Fraction()) / sum(item['score'] for item in case['items']))}

    scipy_output = selected(scipy_result.x) if scipy_result.status == 0 else {'status': 'infeasible' if scipy_result.status == 2 else 'not_solved', 'packs': None, 'objective': None}
    try:
        import pulp
        solver = pulp.HiGHS(msg=False, gapRel=0, timeLimit=30)
        if not solver.available():
            raise RuntimeError('PuLP HiGHS backend is unavailable')
        problem = pulp.LpProblem('synthetic_weighted_fill', pulp.LpMaximize)
        variables = [pulp.LpVariable(f'option_{index}', cat='Binary') for index in range(len(flat))]
        problem += pulp.lpSum(int(coefficients[index]) * variable for index, variable in enumerate(variables))
        for group in range(len(groups)):
            problem += pulp.lpSum(variables[position] for position, (index, _) in enumerate(flat) if index == group) == 1
        problem += pulp.lpSum(option['cost_cents'] * variables[position] for position, (_, option) in enumerate(flat)) <= case['budget_cents']
        problem.solve(solver)
        status = pulp.LpStatus[problem.status]
        pulp_output = selected([pulp.value(variable) for variable in variables]) if status == 'Optimal' else {'status': 'infeasible' if status == 'Infeasible' else 'not_solved', 'packs': None, 'objective': None}
    except ImportError as exc:
        pulp_output = {'status': 'unavailable', 'reason': str(exc), 'packs': None, 'objective': None}
    return {'scipy': scipy_output, 'pulp': pulp_output}


def run(output_dir, fixtures=FIXTURES):
    source, output = Path(fixtures), Path(output_dir)
    payload = json.loads(source.read_text(encoding='utf-8'))
    if payload['schema_version'] != 'synthetic_solver_proof_cases_v1' or payload['dataset_id'] != 'synthetic_fixture_only' or payload['operational_approval'] is not False:
        raise ValueError('Only explicit synthetic proof fixtures are supported')
    if output.exists() and any(output.iterdir()):
        raise ValueError('Output directory must be empty to preserve prior evidence')
    output.mkdir(parents=True, exist_ok=True)
    ts_result = output / 'typescript-results.json'
    executable = ROOT/'backend/node_modules/.bin/tsx.cmd'
    process = subprocess.run([str(executable), str(ROOT/'backend/scripts/check-solver-proof-cases.ts'), str(source.resolve()), str(ts_result.resolve())],
                             cwd=ROOT, capture_output=True, text=True, check=True)
    ts_rows = {row['id']: row for row in json.loads(ts_result.read_text(encoding='utf-8'))['rows']}
    rows = []
    for case in payload['cases']:
        expected = exhaustive_expected(case)
        assert expected['packs'] == case['hand_expected_packs']
        assert expected['objective'] == case['hand_expected_objective']
        models = solve_models(case)
        ts = ts_rows[case['id']]
        ts['objective'] = str(Fraction(int(ts['objective_numerator']), int(ts['objective_denominator']))) if ts['objective_numerator'] is not None else None
        assert ts['proof_status'] in {'optimal', 'infeasible'}
        for name, result in {'typescript': ts, **models}.items():
            assert result['status'] == expected['status'], (case['id'], name, result)
            assert result['packs'] == expected['packs'], (case['id'], name, result)
            assert result['objective'] == expected['objective'], (case['id'], name, result)
        if case['kind'] == 'dated':
            assert ts['options'][0][2]['feasible'] is False
            assert ts['options'][0][2]['expired'] == 2
        rows.append({'case_id': case['id'], 'kind': case['kind'], 'dataset_id': payload['dataset_id'],
                     'policy_version': payload['policy_version'], 'evidence_label': 'Simulated',
                     'assumption_ids': payload['assumption_ids'], 'oracle': expected,
                     'typescript': ts, **models, 'operational_approval': False})
    import pulp
    import highspy
    paths = [source, Path(__file__).resolve(), ROOT/'backend/scripts/check-solver-proof-cases.ts'] + [ROOT/'backend/src'/name for name in
             ('planningScenario.ts', 'weightedPlanning.ts', 'planningInputs.ts', 'inventoryPolicyScenario.ts', 'inventoryFeasibility.ts', 'forecastEvidence.ts', 'datedPlanSelection.ts', 'datedPlanReview.ts')]
    metadata = {'dataset_id': payload['dataset_id'], 'policy_version': payload['policy_version'],
                'evidence_label': 'Simulated', 'assumption_ids': payload['assumption_ids'], 'operational_approval': False}
    result = {**metadata, 'status': 'synthetic_three_model_parity_pass', 'rows': rows,
              'source_sha256': hashlib.sha256(source.read_bytes()).hexdigest(),
              'code_sha256': {str(path.resolve().relative_to(ROOT)): hashlib.sha256(path.read_bytes()).hexdigest() for path in paths},
              'environment': {'python': platform.python_version(), 'numpy': np.__version__, 'scipy': scipy.__version__,
                              'pulp': pulp.__version__, 'highspy': highspy.Highs().version()},
              'limitations': ['Synthetic fixtures only; no company allocation, operational inputs or procurement approval',
                              'SciPy and PuLP use separate model APIs but both run HiGHS-family engines; not three unrelated algorithms',
                              'Dated proof uses explicit feasible pack-option domains and compares actual gateway FEFO option reviews',
                              'Unique primary optima chosen; ordinary gateway solver does not promise secondary minimum spend']}
    (output/'results.json').write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    with (output/'T9.2_five_hand_solvable_proof_cases.csv').open('w', encoding='utf-8-sig', newline='') as handle:
        table = [{**metadata, 'assumption_ids': ';'.join(metadata['assumption_ids']), 'case_id': row['case_id'],
                  'kind': row['kind'], 'status': row['oracle']['status'], 'optimal_packs': json.dumps(row['oracle']['packs']),
                  'objective': row['oracle']['objective'], 'unique_optimum': True, 'typescript': row['typescript']['status'],
                  'scipy': row['scipy']['status'], 'pulp_highs': row['pulp']['status']} for row in rows]
        writer = csv.DictWriter(handle, fieldnames=list(table[0])); writer.writeheader(); writer.writerows(table)
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('output_dir', type=Path)
    parser.add_argument('--fixtures', type=Path, default=FIXTURES)
    args = parser.parse_args()
    result = run(args.output_dir, args.fixtures)
    print(json.dumps({'status': result['status'], 'cases': len(result['rows'])}))


if __name__ == '__main__':
    main()
