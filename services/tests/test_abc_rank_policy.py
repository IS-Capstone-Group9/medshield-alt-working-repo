import unittest
from decimal import Decimal

from services.analytics_service import abc_rank_policy as ar

D = Decimal


class AbcRankPolicyTests(unittest.TestCase):
    def test_labels_hand_example(self):
        # total 100: x=60 (before 0 -> A), y=25 (before 60 -> A, crossing 80), z=10 (before 85 -> B), w=5 (before 95 -> C), v=0 unclassified
        out = ar.abc_labels({'x': D(60), 'y': D(25), 'z': D(10), 'w': D(5), 'v': D(0)})
        self.assertEqual(out, {'x': 'A', 'y': 'A', 'z': 'B', 'w': 'C', 'v': 'Unclassified'})

    def test_persistence_and_missing_prior_falls_back_to_c(self):
        annual = {2020: {'a': D(90), 'b': D(10)}, 2021: {'a': D(5), 'b': D(95), 'new': D(1)}}
        pred = ar.predict('B0', annual, 2022, ['a', 'b', 'new', 'unseen'])
        self.assertEqual(pred['b'], 'A')
        self.assertEqual(pred['new'], 'C')
        self.assertEqual(pred['unseen'], 'C')

    def test_inputs_never_use_target_or_later_years(self):
        base = {2019: {'a': D(80), 'b': D(20)}, 2020: {'a': D(70), 'b': D(30)}, 2021: {'a': D(60), 'b': D(40)}}
        later = {**base, 2022: {'a': D(1), 'b': D(10 ** 9)}, 2023: {'a': D(10 ** 9), 'b': D(1)}}
        for policy in ('B0', 'R1', 'R2', 'R3'):
            self.assertEqual(ar.predict(policy, base, 2022, ['a', 'b']), ar.predict(policy, later, 2022, ['a', 'b']))

    def test_smoothing_can_differ_from_persistence(self):
        annual = {2019: {'a': D(100), 'b': D(1)}, 2020: {'a': D(100), 'b': D(1)}, 2021: {'a': D(1), 'b': D(100)}}
        self.assertEqual(ar.predict('B0', annual, 2022, ['a', 'b'])['b'], 'A')
        self.assertEqual(ar.predict('R2', annual, 2022, ['a', 'b'])['a'], 'A')

    def test_metrics_hand_example(self):
        actual = ['A', 'A', 'B', 'C']
        pred = ['A', 'B', 'B', 'C']
        self.assertAlmostEqual(ar.a_recall(actual, pred), 0.5)
        self.assertAlmostEqual(ar.accuracy(actual, pred), 0.75)
        # F1: A tp1 fp0 fn1 -> 2/3; B tp1 fp1 fn0 -> 2/3; C -> 1
        self.assertAlmostEqual(ar.macro_f1(actual, pred), (2 / 3 + 2 / 3 + 1) / 3)
        self.assertIsNone(ar.a_recall(['B'], ['B']))

    def test_bootstrap_seeded_and_zero_for_identical_policies(self):
        rows = [(f'k{i}', 'ABC'[i % 3], {'x': 'ABC'[i % 3], 'y': 'ABC'[i % 3]}) for i in range(30)]
        self.assertEqual(ar.cluster_bootstrap_f1_diff(rows, 'x', 'y', draws=100), (0.0, 0.0))


if __name__ == '__main__':
    unittest.main()
