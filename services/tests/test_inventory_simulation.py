import unittest
import numpy as np
import csv
import json
import subprocess
import sys
from pathlib import Path
from tempfile import TemporaryDirectory

from services.analytics_service.inventory_simulation import (
    disaggregate_monthly, monte_carlo_comparison, simulate_daily,
)


def inputs():
    return dict(initial_lots=[], lead_mean_days=1, lead_sd_days=0, shelf_life_days=10, seed=20261030)


class InventorySimulationTests(unittest.TestCase):
    def test_simulation_cli_roundtrip_explicit_provenance_and_failure_gates(self):
        from services.analytics_service.jobs.run_inventory_simulation import run
        root = Path(__file__).resolve().parents[2]
        payload = {'dataset_id': 'synthetic_test_only', 'policy_version': 'fixture_policy_v1',
                   'unit_scope': 'synthetic units', 'unit_review_status': 'synthetic_fixture',
                   'monthly_demand_evidence_label': 'Simulated', 'input_provenance': 'Synthetic hand-check fixture',
                   'scenario_register': str(root/'config/planning_assumptions.json'),
                   'assumption_ids': [f'A{index}' for index in range(1,8)],
                   'assumption_values': {'A1': .25, 'A2': 1500, 'A3': 1, 'A4': 0, 'A5': .95, 'A6': 10, 'A7': 1},
                   'monthly_demand': {'2020-01': 30, '2020-02': 40}, 'seed': 20261030, 'runs': 3,
                   'daily_disaggregation_concentration': 1,
                   'policies': [{'name': 'P1', 'reorder_point_units': 10, 'order_units': 30}],
                   'simulation_inputs': {key: value for key, value in inputs().items() if key != 'seed'}}
        payload['simulation_inputs']['burn_in_days'] = 0
        with TemporaryDirectory() as folder:
            source, output = Path(folder)/'input.json', Path(folder)/'result'
            source.write_text(json.dumps(payload), encoding='utf-8')
            process = subprocess.run([sys.executable, '-m', 'services.analytics_service.jobs.run_inventory_simulation',
                                      str(source), str(output)], cwd=root, text=True, capture_output=True)
            self.assertEqual(process.returncode, 0, process.stderr)
            result = json.loads((output/'results.json').read_text(encoding='utf-8'))
            self.assertEqual(result['status'], 'simulated_research_only')
            self.assertEqual(result['rows'][0]['policy_version'], 'fixture_policy_v1')
            self.assertEqual(len(result['scenario_register_sha256']), 64)
            self.assertEqual(result['scenario_register_policy_version'], 'sales_external_scenario_v1_candidate_only')
            self.assertEqual(len(result['source_sha256']), 64)
            with (output/'T11.1_policy_comparison_simulation_quantiles.csv').open(encoding='utf-8-sig', newline='') as handle:
                table = list(csv.DictReader(handle))
            self.assertEqual(float(table[0]['mean']), result['rows'][0]['mean'])
            self.assertEqual(table[0]['dataset_id'], result['dataset_id'])
            with self.assertRaises(ValueError):
                run(source, output)
            for key, invalid in [('runs', None), ('unit_review_status', 'reviewed'),
                                 ('monthly_demand', {'2020-01': 1, '2020-03': 1}),
                                 ('assumption_values', {'A1': .25})]:
                changed = {**payload, key: invalid}
                source.write_text(json.dumps(changed), encoding='utf-8')
                with self.subTest(key=key), self.assertRaises(ValueError):
                    run(source, Path(folder)/'invalid')
            observed = {**payload, 'monthly_demand_evidence_label': 'Observed', 'unit_review_status': 'reviewed'}
            source.write_text(json.dumps(observed), encoding='utf-8')
            with self.assertRaisesRegex(ValueError, 'unit_review_evidence_path'):
                run(source, Path(folder)/'observed')
            evidence = Path(folder)/'unit-review.md'
            evidence.write_text('Test-only unit review fixture; no company review established.', encoding='utf-8')
            observed['unit_review_evidence_path'] = 'unit-review.md'
            source.write_text(json.dumps(observed), encoding='utf-8')
            self.assertEqual(len(run(source, Path(folder)/'observed')['unit_review_evidence_sha256']), 64)

    def test_exact_fefo_lot_day_conservation_hand_path(self):
        config = inputs()
        config['initial_lots'] = [{'lot_id': 'late', 'units': 5, 'expiry_day': 9},
                                  {'lot_id': 'early', 'units': 4, 'expiry_day': 1}]
        result = simulate_daily([3, 2, 8], policy={'name': 'P1', 'reorder_point_units': 0, 'order_units': 0},
                                retain_ledger=True, **config)
        self.assertEqual(result['totals'], dict(initial=9, receipts=0, consumed=8, expired=1))
        self.assertEqual([row['lost_sales_units'] for row in result['daily']], [0, 0, 5])
        early_day0 = next(row for row in result['lot_ledger'] if row['day'] == 0 and row['lot_id'] == 'early')
        self.assertEqual(early_day0['consumed'], 3)
        self.assertAlmostEqual(result['wastage_pct'], 100/9)
        for row in result['lot_ledger'] + result['daily']:
            self.assertEqual(row['opening'] + row['receipts'] - row['consumed'] - row['expired'], row['closing'])

    def test_receipts_after_positive_lead_and_burn_in_boundary(self):
        result = simulate_daily([1, 1, 1, 1], policy={'name': 'P1', 'reorder_point_units': 0, 'order_units': 2},
                                burn_in_days=1, retain_ledger=True, **inputs())
        self.assertEqual([row['receipts'] for row in result['daily']], [0, 2, 0, 2])
        self.assertEqual(result['evaluation']['demand'], 3)
        self.assertEqual(result['evaluation']['consumed'], 3)
        self.assertEqual(result['evaluation']['receipts'], 4)
        self.assertEqual(result['unit_fill_rate_pct'], 100)

    def test_p2_requires_issue_time_confirmation_and_shelf_cap(self):
        policy = {'name': 'P2', 'reorder_point_units': [10]*3, 'order_units': [100]*3,
                  'mean_daily_demand': [2]*3, 'pack_size': 2, 'origin_available_confirmed': True}
        config = {**inputs(), 'shelf_life_days': 2}
        result = simulate_daily([0, 0, 0], policy=policy, retain_ledger=True, **config)
        self.assertEqual(result['daily'][0]['ordered_units'], 2)
        self.assertEqual(result['daily'][1]['receipts'], 2)
        policy['pack_size'] = 5
        self.assertEqual(simulate_daily([0]*3, policy=policy, retain_ledger=True, **config)['daily'][0]['ordered_units'], 0)
        policy['origin_available_confirmed'] = False
        with self.assertRaises(ValueError):
            simulate_daily([0]*3, policy=policy, **config)

    def test_observed_zero_separate_from_missing_and_monthly_totals_exact(self):
        path = disaggregate_monthly({'2020-01': 100, '2020-02': 0, '2020-03': 13}, seed=20261030)
        self.assertEqual(sum(path['demand'][:31]), 100)
        self.assertEqual(sum(path['demand'][31:60]), 0)
        self.assertEqual(sum(path['demand'][60:]), 13)
        self.assertEqual(path, disaggregate_monthly({'2020-01': 100, '2020-02': 0, '2020-03': 13}, seed=20261030))
        for invalid in ({'2020-01': 1, '2020-03': 1}, {'2020-01': None}, {'2020-01': 1.5}):
            with self.assertRaises(ValueError):
                disaggregate_monthly(invalid, seed=1)

    def test_future_demand_cannot_change_prior_orders(self):
        policy = {'name': 'P0', 'previous_month_units': 12}
        first = simulate_daily([1]*60, policy=policy, retain_ledger=True, **inputs())
        second = simulate_daily([1]*31 + [100]*29, policy=policy, retain_ledger=True, **inputs())
        self.assertEqual(first['daily'][:31], second['daily'][:31])

    def test_simulation_reproducible_and_common_paths_for_identical_policies(self):
        config = inputs()
        config.pop('seed')
        policies = [{'name': 'P0', 'previous_month_units': 30},
                    {'name': 'P1', 'reorder_point_units': 10, 'order_units': 30}]
        first = monte_carlo_comparison({'2020-01': 30, '2020-02': 40}, policies, runs=5, **config)
        self.assertEqual(first, monte_carlo_comparison({'2020-01': 30, '2020-02': 40}, policies, runs=5, **config))
        self.assertEqual(len(first['rows']), 8)
        self.assertTrue(all(row['evidence_label'] == 'Simulated' for row in first['rows']))
        path = disaggregate_monthly({'2020-01': 30}, seed=15)['demand']
        common = {**inputs(), 'shelf_life_days': 365, 'lead_sd_days': 2}
        fixed = simulate_daily(path, policy={'name': 'P1', 'reorder_point_units': 10, 'order_units': 30},
                               retain_ledger=True, **common)
        forecast = simulate_daily(path, policy={'name': 'P2', 'reorder_point_units': [10]*31,
                                                'order_units': [30]*31, 'mean_daily_demand': [1]*31,
                                                'pack_size': 1, 'origin_available_confirmed': True},
                                  retain_ledger=True, **common)
        self.assertEqual(fixed['daily'], forecast['daily'])
        self.assertEqual(fixed['lot_ledger'], forecast['lot_ledger'])

    def test_randomized_lot_and_day_conservation_with_expiry_and_incoming_stock(self):
        rng = np.random.default_rng(20261030)
        for run in range(25):
            config = {**inputs(), 'lead_mean_days': 4, 'lead_sd_days': 3,
                      'shelf_life_days': 8, 'seed': run,
                      'initial_lots': [{'lot_id': f'initial_{index}', 'units': int(rng.integers(0, 20)),
                                       'expiry_day': int(rng.integers(0, 12))} for index in range(4)]}
            result = simulate_daily(rng.integers(0, 10, size=60).tolist(),
                                    policy={'name': 'P1', 'reorder_point_units': 20, 'order_units': 30},
                                    retain_ledger=True, **config)
            for row in result['daily'] + result['lot_ledger']:
                self.assertEqual(row['opening'] + row['receipts'] - row['consumed'] - row['expired'], row['closing'])
            for row in result['daily']:
                self.assertEqual(row['demand'], row['consumed'] + row['lost_sales_units'])

    def test_invalid_inputs_and_zero_denominators(self):
        for changes in ({'lead_mean_days': None}, {'burn_in_days': 2}, {'initial_lots': None}):
            with self.assertRaises(ValueError):
                simulate_daily([0, 0], policy={'name': 'P1', 'reorder_point_units': 0, 'order_units': 0},
                               **{**inputs(), **changes})
        result = simulate_daily([0]*2, policy={'name': 'P1', 'reorder_point_units': 0, 'order_units': 0}, **inputs())
        self.assertIsNone(result['unit_fill_rate_pct'])
        self.assertIsNone(result['wastage_pct'])
        self.assertIsNone(result['annualized_turnover'])


if __name__ == '__main__':
    unittest.main()
