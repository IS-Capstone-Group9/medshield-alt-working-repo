import math
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from services.analytics_service import volatility_intervals as vi


def fixture(n=65):
    return [(f'{2020+i//12:04}-{i%12+1:02}', float(100 + (i % 7) * 10)) for i in range(n)]


class VolatilityTests(unittest.TestCase):
    def test_rank_is_finite_sample_order_statistic(self):
        self.assertEqual(vi.quantile80(list(range(12))), 10)
        self.assertEqual(vi.quantile80(list(range(24))), 19)
        with self.assertRaises(ValueError):
            vi.quantile80([])

    def test_hand_solvable_scale_bounds_and_warmup(self):
        points = [dict(origin=p, target=p, prediction=100., actual=110.) for p, _ in fixture(20)]
        rows, full = vi.intervals(points)
        self.assertEqual(len(full), 8)
        self.assertEqual(len(rows), 2)
        self.assertEqual(rows[0]['scale'], 10.)
        self.assertEqual(rows[0]['quantile'], 1.)
        self.assertEqual(rows[0]['candidate'], [90., 110.])
        self.assertEqual(vi.metrics(rows, 'candidate')['coverage'], 1.)

    def test_floor_zero_negative_and_positive_prediction_eligibility(self):
        points = [dict(origin=p, target=p, prediction=1., actual=-9.) for p, _ in fixture(20)]
        rows, _ = vi.intervals(points)
        self.assertEqual(rows[0]['candidate'], [0., 11.])
        self.assertEqual(vi.metrics(rows, 'candidate')['hits'], 0)
        zeros = [dict(r, prediction=0.) for r in points]
        self.assertEqual(vi.intervals(zeros), ([], []))
        exact = [dict(r, prediction=1., actual=1.) for r in points]
        self.assertEqual(vi.intervals(exact)[0][0]['scale'], 1.)

    def test_future_mutation_and_delayed_maturity(self):
        history = fixture(90)
        original = vi.point_cases(history, 6, 'mean_6')
        rows, _ = vi.intervals(original)
        cut = rows[4]['origin']
        changed = [(p, v if p <= cut else v * 1000) for p, v in history]
        altered, _ = vi.intervals(vi.point_cases(changed, 6, 'mean_6'))
        for a, b in zip(rows, altered):
            if a['origin'] <= cut:
                for field in ('candidate', 'comparator', 'scale', 'quantile', 'calibration_n'):
                    self.assertEqual(a[field], b[field])
        # For lead 6, six errors first mature at case index 11; twelve
        # scaled scores first mature at index 28 (not index 18).
        self.assertEqual(rows[0]['origin'], original[28]['origin'])

    def test_calendar_and_reference_failures(self):
        with self.assertRaises(ValueError):
            vi.point_cases(fixture()[:30] + fixture()[31:], 1, 'mean_6')
        with self.assertRaises(ValueError):
            vi.point_cases(fixture(), 1, 'new_best_model')
        with self.assertRaises(ValueError):
            vi.intervals([dict(origin='2020-01', target='2020-02', prediction=1., actual=math.nan)])

    def test_source_duplicate_rejected(self):
        row = dict(area='A', period='2020-01', net_eligible_records=1, net_sales_php=1)
        with self.assertRaises(ValueError):
            vi.histories({'area_months': [row, row]})

    def test_guard_boundaries_and_missing_cell(self):
        def cells(coverage):
            return {str(i): {'candidate': dict(coverage=coverage, mean_width_php=1., mean_relative_width=1.)} for i in range(15)}
        for v in (.75, .85):
            self.assertTrue(vi.summary(cells(v), 'candidate')['meets_rule'])
        for v in (.74, .86):
            self.assertFalse(vi.summary(cells(v), 'candidate')['meets_rule'])
        sparse = cells(.8)
        sparse['0']['candidate'] = None
        self.assertFalse(vi.summary(sparse, 'candidate')['meets_rule'])
        under = cells(.8)
        for i in range(4):
            under[str(i)]['candidate']['coverage'] = .69
        self.assertFalse(vi.summary(under, 'candidate')['meets_rule'])

    def test_manifest_tamper_and_repeat_attempt_refused(self):
        path = Path(__file__).resolve().parents[2] / 'outputs/volatility_intervals_20261106/run.py'
        spec = importlib.util.spec_from_file_location('pd3_run_fixture', path)
        runner = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(runner)
        with tempfile.TemporaryDirectory() as directory:
            runner.ROOT = runner.OUT = Path(directory)
            input_path = runner.OUT / 'input.txt'
            input_path.write_text('fixed')
            runner.FILES = [input_path]
            runner.freeze()
            runner.check()
            (runner.OUT / 'attempt.json').write_text('{}')
            with self.assertRaisesRegex(ValueError, 'Attempt exists'):
                runner.run()
            input_path.write_text('changed')
            with self.assertRaisesRegex(ValueError, 'Changed frozen file'):
                runner.check()
            input_path.write_text('fixed')
            manifest = json.loads((runner.OUT / 'registration.json').read_text())
            manifest['cells'] = 14
            (runner.OUT / 'registration.json').write_text(json.dumps(manifest))
            with self.assertRaisesRegex(ValueError, 'Changed registration'):
                runner.check()


if __name__ == '__main__':
    unittest.main()
