"""Original-source backtest integrity, time boundaries and independent approval gates."""
from contextlib import redirect_stdout
from copy import deepcopy
from decimal import Decimal
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from services.analytics_service.predictive import original_research as research
from services.analytics_service.predictive.contracts import month, period
from services.analytics_service.predictive.engine import evaluate_fold
from services.analytics_service.predictive.verify_original_research import independent_metrics, verify


def synthetic_source():
    gaps = {'2017-05', '2017-06', '2017-07', '2017-08', '2017-10',
            '2018-01', '2018-02', '2019-10', '2019-11', '2019-12'}
    months = [period(index) for index in range(month('2017-01'), month('2026-09') + 1)
              if period(index) not in gaps]
    fields = ['source_records', 'net_eligible_records', 'net_sales_php',
              'supported_gross_profit_php', 'matching_margin_revenue_php']
    totals = ['40171', '39286', '638015351.530000', '334666271.550000', '566954921.920000']
    monthly = []
    for index, name in enumerate(months):
        # Deliberate signed credit month and recorded zero month, distinct from an absent month.
        values = ['1', '1', '-1.000000' if index == 1 else '0.000000', '0.000000', '0.000000']
        if index == 0:
            values = ['40065', '39180', '638015352.530000', totals[3], totals[4]]
        monthly.append(dict(month=name, **dict(zip(fields, values))))
    annual = [dict(year=year, **{field: str(sum((Decimal(row[field]) for row in monthly
                                               if row['month'].startswith(year)), Decimal(0)))
                               for field in fields}) for year in sorted({name[:4] for name in months})]
    normalized = [[row['month'], row['source_records'], row['net_eligible_records'],
                   *[format(Decimal(row[field]), '.6f') for field in fields[2:]]] for row in monthly]
    monthly_hash = research.sha(json.dumps(normalized, separators=(',', ':')).encode())
    source = dict(batch_id=research.BATCH, dataset_id=research.DATASET,
                  policy_version='original_source_layers_v1_candidate_only', source_table=research.SOURCE_TABLE,
                  delta_version=0, receipt_sha256='d69414d3bb72c706bba30f24489074e4677f403277e18c64bb8d2e643b0012dd',
                  source_keys_sha256='da74cc50c67e22fd33928f5ca3faaebc3e21a6e1b76f7f169829bf6515d8c580',
                  contracts_excluded=True, financial_release_approved=False, unit_approval=False, forecast_approval=False)
    return dict(schema_version='original_itemized_forecast_input_v1', source='databricks', warehouse_writes=0,
                source_identity=source, monthly=monthly, annual=annual, monthly_logical_sha256=monthly_hash,
                contracts_excluded=True, model_publication_approved=False, financial_release_approved=False)


class OriginalResearchTests(unittest.TestCase):
    def setUp(self):
        self.data = synthetic_source()
        self.hash_patch = patch.object(research, 'MONTHLY_HASH', self.data['monthly_logical_sha256'])
        self.hash_patch.start()
        self.addCleanup(self.hash_patch.stop)

    def test_absent_month_zero_and_signed_credit_remain_distinct(self):
        rows = {row['period']: row['value_php'] for row in research.source_values(self.data)}
        self.assertEqual(len(rows), 117)
        self.assertIsNone(rows['2017-05'])
        self.assertEqual(Decimal(rows['2017-02']), Decimal('-1'))
        self.assertEqual(Decimal(rows['2017-03']), Decimal('0'))

    def test_annual_control_monthly_value_and_approval_changes_rejected(self):
        for mutate in [lambda data: data['annual'][0].update(net_sales_php='0'),
                       lambda data: data['monthly'][0].update(net_sales_php='1'),
                       lambda data: data['source_identity'].update(forecast_approval=True),
                       lambda data: data.update(contracts_excluded=False)]:
            with self.subTest(mutate=mutate):
                changed = deepcopy(self.data)
                mutate(changed)
                with self.assertRaises(ValueError):
                    research.source_values(changed)

    def test_origin_only_inputs_and_selection_precedes_audits(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            source, output = root / 'source.json', root / 'run'
            checksum = research.write_new(source, self.data)
            source.with_suffix('.sha256').write_text(checksum)
            calls = []

            def checked_fold(training, series_id, origin, config, run_id, residuals, stage, seed):
                self.assertEqual(max(training), origin)
                self.assertEqual(set(training), set(range(month('2020-01'), origin + 1)))
                if stage != 'development':
                    selection = json.loads((output / 'selection-before-audit.json').read_text())
                    self.assertTrue(selection['frozen_before_audit'])
                calls.append((config['model_id'], stage, origin))
                return evaluate_fold(training, series_id, origin, config, run_id, residuals, stage, seed)

            def fake_forecast(training, origin, leads, config, seed):
                self.assertLessEqual(max(training), origin)
                return {lead: training[origin] for lead in leads}, None

            with redirect_stdout(io.StringIO()), patch.object(research, 'evaluate_fold', checked_fold), \
                    patch('services.analytics_service.predictive.engine.forecast', fake_forecast):
                research.prepare(source, output)
                research.run(source, output)
            result = json.loads((output / 'evaluation.json').read_text())
            self.assertEqual(len(calls), 147)
            self.assertEqual(len(result['predictions']), 1701)
            self.assertEqual(len(result['evaluations']), 63)
            self.assertEqual(result['warehouse_writes'], 0)
            self.assertFalse(result['publication_approved'])
            self.assertEqual(result['future_forecasts_generated'], 0)
            self.assertTrue(all(point['actual'] == 0 for point in result['predictions']))
            self.assertTrue(all(all(band['lower'] is None and band['upper'] is None
                                    for band in point['intervals']) for point in result['predictions']))
            with redirect_stdout(io.StringIO()):
                verify(source, output)
            # Re-hashing a fabricated actual must not defeat source reconciliation.
            result['predictions'][0]['actual'] = 1
            raw = json.dumps(result).encode()
            (output / 'evaluation.json').write_bytes(raw)
            (output / 'evaluation.sha256').write_text(research.sha(raw))
            with self.assertRaises(AssertionError):
                verify(source, output)
            # A modified registration cannot silently change the schedule for a second fit.
            with (output / 'registration.json').open('ab') as handle:
                handle.write(b' ')
            with self.assertRaisesRegex(ValueError, 'Registration checksum'):
                research.run(source, output)

    def test_independent_metrics_preserve_signed_actuals_and_errors(self):
        values = independent_metrics([{'actual': -10, 'prediction': -5}, {'actual': 20, 'prediction': 10}])
        self.assertEqual(values['n'], 2)
        self.assertEqual(values['mae'], 7.5)
        self.assertEqual(values['bias'], -2.5)
        self.assertEqual(values['wape'], 50)
        self.assertAlmostEqual(values['rmse'], (62.5) ** .5)


if __name__ == '__main__':
    unittest.main()
