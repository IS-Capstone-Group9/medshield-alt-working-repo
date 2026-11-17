import copy
import math
import json
import csv
from statistics import NormalDist
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from services.analytics_service.planning_research import (
    ahp_weights, budget_frontier, eoq_rop_scenario, eoq_sensitivity, ranking_sensitivity,
)


def policy_inputs():
    return dict(annual_demand=3650, acquisition_cost=100, order_cost=500,
                holding_fraction=.25, pack_size=10, lead_days=14,
                daily_demand_sd=3, lead_sd_days=2, service_z=1.645, shelf_life_days=365)


class PlanningResearchTests(unittest.TestCase):
    def test_register_ranges_explicit_z_conversion_no_silent_override(self):
        from services.analytics_service.jobs.run_eoq_rop_sensitivity import selected_register_grid
        register = Path(__file__).resolve().parents[2]/'config/planning_assumptions.json'
        payload = {'scenario_register': str(register), 'register_range_ids': ['A1', 'A5'],
                   'base_inputs': {**policy_inputs(), 'holding_fraction': .35}, 'ranges': {}}
        base, ranges, binding = selected_register_grid(payload, register)
        self.assertEqual(base['holding_fraction'], .35)
        self.assertEqual(ranges['holding_fraction'], [.15, .20, .25, .30, .35])
        self.assertAlmostEqual(ranges['service_z'][1], NormalDist().inv_cdf(.95))
        self.assertEqual(len(binding['scenario_register_sha256']), 64)
        payload['ranges'] = {'holding_fraction': [.1]}
        with self.assertRaises(ValueError):
            selected_register_grid(payload, register)
        payload['ranges'] = {}
        payload['register_range_ids'] = ['A6']
        payload['base_inputs'].pop('shelf_life_days')
        with self.assertRaisesRegex(ValueError, 'multiple base values'):
            selected_register_grid(payload, register)
        with TemporaryDirectory() as folder:
            invalid = json.loads(register.read_text(encoding='utf-8'))
            invalid['runtime_defaults_enabled'] = True
            bad = Path(folder)/'invalid.json'
            bad.write_text(json.dumps(invalid), encoding='utf-8')
            with self.assertRaises(ValueError):
                selected_register_grid({'scenario_register': str(bad)}, bad)

    def test_job_requires_identity_retains_source_policy_and_protects_evidence(self):
        from services.analytics_service.jobs.run_eoq_rop_sensitivity import run
        payload = dict(dataset_id='synthetic_hand_case', policy_version='fixture_policy', unit_scope='fixture units',
                       input_provenance='All values are synthetic scenario inputs', assumption_ids=['A1','A2','A3','A4','A5','A6'],
                       base_inputs=policy_inputs(), ranges={'lead_days': [7, 14]})
        with TemporaryDirectory() as folder:
            source, output = Path(folder)/'input.json', Path(folder)/'result'
            source.write_text(json.dumps(payload), encoding='utf-8')
            result = run(source, output)
            self.assertEqual(len(result['rows']), 2)
            self.assertEqual(result['rows'][0]['dataset_id'], 'synthetic_hand_case')
            self.assertEqual(result['rows'][0]['policy_version'], 'fixture_policy')
            self.assertEqual(len(result['source_sha256']), 64)
            with (output/'T8.1_eoq_rop_product_scenarios.csv').open(encoding='utf-8-sig', newline='') as handle:
                table = list(csv.DictReader(handle))
            self.assertEqual(table[0]['reorder_point_units'], str(result['rows'][0]['reorder_point_units']))
            with self.assertRaises(ValueError):
                run(source, output)
            del payload['dataset_id']
            source.write_text(json.dumps(payload), encoding='utf-8')
            with self.assertRaises(ValueError):
                run(source, Path(folder)/'invalid')

    def test_eoq_rop_hand_calculation_and_pack_optimum(self):
        result = eoq_rop_scenario(**policy_inputs())
        # H = 25; continuous sqrt(146000) = 382.099..., candidates 380,390.
        self.assertAlmostEqual(result['continuous_eoq'], math.sqrt(146000))
        self.assertEqual(result['order_units'], 380)
        self.assertAlmostEqual(result['annual_ordering_cycle_holding_cost'], 3650/380*500 + 380/2*25)
        # variance = 14*9 + 10^2*4 = 526; ceil(1.645 sqrt(526)) = 38.
        self.assertEqual(result['safety_stock_units'], 38)
        self.assertEqual(result['reorder_point_units'], 178)
        self.assertFalse(result['eoq_lot_exceeds_gross_shelf_capacity'])
        changed = policy_inputs()
        changed['shelf_life_days'] = 14
        self.assertTrue(eoq_rop_scenario(**changed)['eoq_lot_exceeds_gross_shelf_capacity'])

    def test_missing_boolean_nan_fractional_pack_rejected(self):
        for field, value in [('daily_demand_sd', None), ('lead_days', True),
                             ('service_z', float('nan')), ('pack_size', 1.5),
                             ('annual_demand', 0), ('order_cost', '500')]:
            changed = {**policy_inputs(), field: value}
            with self.subTest(field=field), self.assertRaises(ValueError):
                eoq_rop_scenario(**changed)

    def test_sensitivity_preserves_base_and_changes_exact_grid(self):
        base = policy_inputs()
        snapshot = copy.deepcopy(base)
        rows = eoq_sensitivity(base, {'holding_fraction': [.15, .35], 'lead_days': [7, 30]})
        self.assertEqual(base, snapshot)
        self.assertEqual(len(rows), 4)
        self.assertEqual({row['inputs']['lead_days'] for row in rows}, {7, 30})
        self.assertTrue(all(row['operational_approval'] is False for row in rows))

    def test_consistent_ahp_known_ratios_and_inconsistent_rejection(self):
        result = ahp_weights([[1, 2, 4], [.5, 1, 2], [.25, .5, 1]])
        for observed, expected in zip(result['weights'], [4/7, 2/7, 1/7]):
            self.assertAlmostEqual(observed, expected)
        self.assertAlmostEqual(result['consistency_ratio'], 0)
        for invalid in ([[1, 9, 1/9], [1/9, 1, 9], [9, 1/9, 1]],
                        [[1, 2, 1], [1, 1, 1], [1, 1, 1]],
                        [[True]*3]*3):
            with self.assertRaises(ValueError):
                ahp_weights(invalid)

    def test_rank_sensitivity_preserves_ties_and_constant_is_unavailable(self):
        rows = ranking_sensitivity([[100, 100, 100], [50, 50, 50], [0, 0, 0]], [4, 2, 1], top_k=2)
        self.assertEqual(len(rows), 31)
        self.assertTrue(all(abs(row['spearman_rho']-1) < 1e-12 for row in rows))
        self.assertTrue(all(row['top_k_overlap_pct'] == 100 for row in rows))
        self.assertTrue(all(row['spearman_rho'] is None for row in ranking_sensitivity([[1]*3]*2, [1]*3)))
        with self.assertRaises(ValueError):
            ranking_sensitivity([[100, None, 0], [0, 0, 0]], [1]*3)

    def test_budget_frontier_hand_case_and_unmodified_inputs(self):
        shortlist = {'source': {'checksum': 'fixture'}, 'scope': {'sector': 'Unknown', 'territory': 'Quezon'},
                     'products': [{'product': 'A'}]}
        body = {'scope': shortlist['scope'], 'checksum': 'fixture', 'acknowledged': True,
                'horizon': 1, 'budget': 0, 'minimum_pct': 0,
                'items': [dict(product='A', demand=10, stock=0, reserve=0, pack=2, pack_cost=10, max_packs=5)]}
        original = copy.deepcopy(body)
        rows = budget_frontier(body, shortlist, [0, 10, 25, 50])
        self.assertEqual([row['mean_fulfillment_pct'] for row in rows], [0, 20, 40, 100])
        self.assertEqual([row['spent'] for row in rows], [0, 10, 20, 50])
        self.assertAlmostEqual(rows[1]['discrete_gain_pct_per_php_10000'], 20000)
        self.assertEqual(body, original)
        body['minimum_pct'] = 100
        self.assertIsNone(budget_frontier(body, shortlist, [0, 50])[1]['discrete_gain_pct_per_php_10000'])


if __name__ == '__main__':
    unittest.main()
