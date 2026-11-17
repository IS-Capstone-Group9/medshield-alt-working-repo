import json
import unittest
from collections import defaultdict
from decimal import Decimal
from pathlib import Path

import numpy as np

from services.analytics_service import seasonality_diagnostics as sd

ROOT = Path(__file__).resolve().parents[2]
CAPTURE = ROOT / 'outputs/local_data_model_validation_20261105/source-area.json'


def months(start_year, count):
    return [sd.label(sd.month_id(f'{start_year}-01') + i) for i in range(count)]


class SeasonalityEvidenceTests(unittest.TestCase):
    def test_exactly_repeating_year_is_a_stable_pattern(self):
        profile = [100 + 50 * np.sin(2 * np.pi * m / 12) for m in range(12)]
        values = {p: profile[i % 12] for i, p in enumerate(months(2020, 72))}
        out = sd.seasonality_evidence(values, '2020-01', '2025-12')
        self.assertEqual(out['verdict'], 'stable_seasonal_pattern')
        self.assertGreater(out['variants']['protocol_raw_robust_w13']['seasonal_strength'], 0.99)
        self.assertAlmostEqual(out['month_pattern']['mean_between_year_spearman'], 1.0, places=9)

    def test_unrepeated_noise_is_not_called_stable(self):
        rng = np.random.default_rng(1)
        values = {p: float(v) for p, v in zip(months(2020, 72), rng.lognormal(15, 1.0, 72))}
        out = sd.seasonality_evidence(values, '2020-01', '2025-12')
        self.assertNotEqual(out['verdict'], 'stable_seasonal_pattern')
        self.assertLess(out['month_pattern']['mean_between_year_spearman'], sd.MIN_YEAR_CONSISTENCY)

    def test_gap_is_reported_and_never_filled(self):
        values = {p: 1.0 + i for i, p in enumerate(months(2020, 36))}
        values['2021-05'] = None
        out = sd.seasonality_evidence(values, '2020-01', '2022-12')
        self.assertEqual((out['status'], out['reason'], out['gaps']), ('unavailable', 'gap_in_window', ['2021-05']))
        del values['2021-05']
        self.assertEqual(sd.seasonality_evidence(values, '2020-01', '2022-12')['gaps'], ['2021-05'])

    def test_short_window_and_too_few_years(self):
        values = {p: 1.0 + i % 5 for i, p in enumerate(months(2020, 36))}
        self.assertEqual(sd.seasonality_evidence(values, '2020-01', '2020-12')['reason'], 'fewer_than_24_months')
        two_years = sd.seasonality_evidence(values, '2020-01', '2021-12')
        self.assertEqual(two_years['verdict'], 'inconclusive_too_few_full_years')

    def test_log_variant_unavailable_for_non_positive_values_without_hiding_protocol(self):
        rng = np.random.default_rng(2)
        values = {p: float(v) for p, v in zip(months(2020, 48), rng.normal(10, 3, 48))}
        values['2021-03'] = -5.0
        out = sd.seasonality_evidence(values, '2020-01', '2023-12')
        self.assertEqual(out['variants']['sensitivity_log_robust_w13'], {'status': 'unavailable', 'reason': 'non_positive_values'})
        self.assertEqual(out['variants']['protocol_raw_robust_w13']['status'], 'fitted')


class ThinMonthAuditTests(unittest.TestCase):
    def test_hand_solvable_missing_thin_and_boundary(self):
        records = {p: 100 for p in months(2019, 24)}
        records['2019-03'] = 5      # thin: 5 < 10
        records['2019-06'] = 10     # exactly the floor: not thin
        del records['2019-09']      # missing
        out = sd.thin_month_audit(records, '2019-01', '2020-12', '2019-01')
        self.assertEqual(out['floor_records'], 10.0)
        self.assertEqual(out['missing_months'], ['2019-09'])
        self.assertEqual(out['thin_months'], ['2019-03'])
        self.assertEqual([(a['base'], a['target']) for a in out['yoy_pairs_with_flagged_month']], [('2019-03', '2020-03'), ('2019-09', '2020-09')])

    def test_zero_is_missing_not_a_value_and_empty_reference_is_unavailable(self):
        self.assertEqual(sd.thin_month_audit({}, '2020-01', '2020-12', '2020-01')['status'], 'unavailable')
        out = sd.thin_month_audit({'2020-01': 0, '2020-02': 50}, '2020-01', '2020-02', '2020-01')
        self.assertEqual(out['missing_months'], ['2020-01'])


@unittest.skipUnless(CAPTURE.is_file(), 'retained capture not present')
class RetainedCaptureTests(unittest.TestCase):
    def test_company_series_matches_independent_5_nov_findings(self):
        rows = json.loads(CAPTURE.read_text(encoding='utf-8'))['area_months']
        net, records = defaultdict(Decimal), defaultdict(int)
        for r in rows:
            records[r['period']] += r['records']
            if r['net_sales_php'] is not None:
                net[r['period']] += Decimal(r['net_sales_php'])
        self.assertEqual(sum(net.values()), Decimal('638015351.53'))
        audit = sd.thin_month_audit(records, '2017-01', '2026-09', '2020-01')
        self.assertEqual(audit['missing_months'], ['2017-05', '2017-06', '2017-07', '2017-08', '2017-10', '2018-01', '2018-02', '2019-10', '2019-11', '2019-12'])
        self.assertEqual(audit['thin_months'], ['2017-09', '2017-11', '2017-12'])
        evidence = sd.seasonality_evidence({p: float(v) for p, v in net.items()}, '2020-01', '2026-09')
        self.assertEqual(evidence['verdict'], 'no_stable_seasonal_pattern')
        self.assertAlmostEqual(evidence['variants']['protocol_raw_robust_w13']['seasonal_strength'], 0.189, places=3)
        self.assertAlmostEqual(evidence['variants']['sensitivity_log_robust_w13']['seasonal_strength'], 0.311, places=3)
        self.assertAlmostEqual(evidence['month_pattern']['kruskal_p'], 0.307, places=3)


if __name__ == '__main__':
    unittest.main()
