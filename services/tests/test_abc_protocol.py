from copy import deepcopy
from contextlib import redirect_stdout
from decimal import Decimal
import io
import json
from pathlib import Path
import unittest
import tempfile
from unittest.mock import patch

from services.analytics_service import abc_protocol as abc

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'outputs/original_so2_20261027/source.json'


def observation(net=100, months=3, eligible=2):
    return dict(records=2, eligible=eligible, net=Decimal(net), positive=Decimal(max(net, 0)),
                negative=Decimal(min(net, 0)), months=months, provenance={'ORIGINAL_SOURCE_EXPORT'})


class AbcProtocolTests(unittest.TestCase):
    def test_exact_thresholds_crossings_returns_ties_and_empty(self):
        labels = {key: key for key in 'abcd'}
        amounts = dict(zip('abcd', map(Decimal, ['80', '15', '5', '0'])))
        self.assertEqual(list(abc.abc_labels(amounts, labels).values()), ['A', 'B', 'C', 'Unclassified'])
        self.assertEqual(abc.abc_labels({'a': Decimal(90), 'b': Decimal(10)}, labels), {'a': 'A', 'b': 'B'})
        self.assertEqual(list(abc.abc_labels({'b': Decimal(50), 'a': Decimal(50)}, labels)), ['a', 'b'])
        self.assertEqual(abc.abc_labels({}, {}), {})

    def test_current_or_later_outcomes_cannot_change_prior_features(self):
        labels = {'x': 'X', 'y': 'Y'}
        annual = {(2023, 'x'): observation(123), (2024, 'x'): observation(5), (2024, 'y'): observation(50)}
        first = next(r for r in abc.build_records(labels, annual) if r['product_key'] == 'x' and r['target_year'] == 2024)
        annual[(2024, 'x')] = observation(99999999)
        annual[(2026, 'x')] = observation(99999999)
        changed = next(r for r in abc.build_records(labels, annual) if r['product_key'] == 'x' and r['target_year'] == 2024)
        self.assertEqual(first['features'], changed['features'])
        self.assertEqual(changed['feature_cutoff'], '2023-12-31')

    def test_no_history_is_null_not_zero_and_ineligible_support_stays_distinct(self):
        labels = {'x': 'X'}
        row = abc.build_records(labels, {(2024, 'x'): observation()})[0]
        self.assertEqual(row['cohort'], 'no_prior_observation')
        self.assertIsNone(row['features']['prior_net_sales_php'])
        self.assertIsNone(row['features']['prior_observed_months'])
        rows = abc.build_records(labels, {(2023, 'x'): observation(0, eligible=0), (2024, 'x'): observation()})
        row = next(r for r in rows if r['target_year'] == 2024)
        self.assertEqual(row['cohort'], 'prior_ineligible_only')
        self.assertEqual(row['features']['prior_eligible_records'], 0)
        self.assertIsNone(row['features']['prior_net_sales_php'])

    def test_low_history_boundary_is_observed_months_not_stock_turnover(self):
        for months, expected in [(6, 'low_history_1_to_6_observed_months'), (7, 'more_than_6_observed_months')]:
            rows = abc.build_records({'x': 'X'}, {(2023, 'x'): observation(months=months), (2024, 'x'): observation()})
            self.assertEqual(next(r for r in rows if r['target_year'] == 2024)['cohort'], expected)

    def test_validator_rejects_leaky_fields_dates_duplicate_and_partition_mutations(self):
        rows = abc.build_records({'x': 'X'}, {(2023, 'x'): observation(), (2024, 'x'): observation()})
        edits = [lambda r: r[0]['features'].update(target_revenue=999),
                 lambda r: r[0].update(feature_year=r[0]['target_year']),
                 lambda r: r[0].update(feature_cutoff='2026-12-31'),
                 lambda r: r[0].update(partition='invalid'),
                 lambda r: r.append(deepcopy(r[0]))]
        for edit in edits:
            changed = deepcopy(rows)
            edit(changed)
            with self.assertRaises(ValueError):
                abc.validate_records(changed)

    def test_actual_source_stage_classes_and_label_isolation(self):
        records, support = abc.prepare(json.loads(SOURCE.read_bytes()))
        self.assertEqual(len(records), 6233)
        self.assertEqual(support['retrospective_test_2025']['samples'], 140)
        groups = {part: {r['product_key'] for r in records if r['partition'] == part}
                  for part in ['train', 'validation', 'test']}
        self.assertFalse(groups['train'] & groups['test'])
        self.assertFalse(groups['train'] & groups['validation'])
        self.assertFalse(groups['validation'] & groups['test'])
        for stage in support.values():
            self.assertTrue(all(stage['classes'][c] > 0 for c in abc.CLASSES))

    def test_source_identity_scope_version_and_sql_mutations_fail(self):
        source = json.loads(SOURCE.read_bytes())
        for edit in [lambda s: s['release'].update(dataset_id='other'),
                     lambda s: s.update(contracts_excluded=False),
                     lambda s: s.update(source_latest_version_after='1'),
                     lambda s: s['queries']['products'].update(sql='SELECT 1')]:
            changed = deepcopy(source)
            edit(changed)
            with self.assertRaises(ValueError):
                abc.prepare(changed)

    def test_actual_2025_provenance_overlap_does_not_double_count_feature_months(self):
        source = json.loads(SOURCE.read_bytes())
        _, annual = abc.annual_observations(source)
        rows = source['queries']['comparison_months']['rows']
        keys = {(2025, r['product_key']) for r in rows if r['month'].startswith('2025')}
        for key in keys:
            expected = {r['month'] for r in rows if r['product_key'] == key[1] and r['month'].startswith('2025')}
            self.assertEqual(annual[key]['months'], len(expected))

    def test_cli_identical_retry_preserves_freeze_and_differing_bytes_are_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            argv = ['abc_protocol', '--source', str(SOURCE), '--output', directory]
            with patch('sys.argv', argv), redirect_stdout(io.StringIO()):
                abc.main()
                before = (Path(directory) / 'protocol.json').read_bytes()
                abc.main()
                self.assertEqual(before, (Path(directory) / 'protocol.json').read_bytes())
                (Path(directory) / 'protocol.json').write_bytes(b'changed')
                with self.assertRaisesRegex(ValueError, 'Frozen protocol exists'):
                    abc.main()


if __name__ == '__main__':
    unittest.main()
