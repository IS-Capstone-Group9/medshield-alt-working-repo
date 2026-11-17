from contextlib import redirect_stdout
from copy import deepcopy
import io
import csv
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from services.analytics_service.predictive import original_rolling as rolling
from services.analytics_service.predictive.contracts import month
from services.analytics_service.predictive.verify_original_rolling import verify

ROOT = Path(__file__).resolve().parents[2]
PROTOCOL = ROOT / 'outputs/original_forecast_diagnosis_20261027/analysis/next-experiment-protocol.json'
SOURCE = ROOT / 'outputs/original_forecast_evaluation_20261027/input/source.json'
LIVE = ROOT / 'outputs/original_rolling_evaluation_20261027/live-source/source.json'


class OriginalRollingTests(unittest.TestCase):
    def test_registered_case_dates_and_audit_origin_guard_reject_mutation(self):
        protocol = json.loads(PROTOCOL.read_bytes())
        rolling.validate_protocol(protocol)
        for edit in [lambda p: p['cases'][0].update(origin_period='2023-03'),
                     lambda p: p['cases'].pop(), lambda p: p.update(horizons=[1, 12]),
                     lambda p: p.update(operational_publication_approved=True)]:
            changed = deepcopy(protocol); edit(changed)
            with self.assertRaises(ValueError):
                rolling.validate_protocol(changed)

    def selection_points(self, secondary=102):
        return [dict(stage='development', model_id=model, lead_months=lead, prediction=prediction, actual=100)
                for model in ('last_value', 'ets_none') for lead in (1, 3)
                for prediction in ([110 if model == 'last_value' else 102 if lead == 1 else secondary] * 20)]

    def test_primary_gain_cannot_override_secondary_guard_or_missing_cases(self):
        configs = [{'model_id': 'last_value'}, {'model_id': 'ets_none'}]
        selected = rolling.select_development(self.selection_points(), configs)
        self.assertEqual(selected['model_id'], 'ets_none')
        self.assertEqual(rolling.select_development(self.selection_points(secondary=150), configs)['model_id'], 'last_value')
        incomplete = self.selection_points(); incomplete[-1]['prediction'] = None
        result = rolling.select_development(incomplete, configs)
        self.assertEqual(result['model_id'], 'last_value')
        self.assertFalse(result['assessments'][0]['complete_at_both_leads'])
        contaminated = self.selection_points(); contaminated[0]['stage'] = 'retrospective_audit_2025'
        with self.assertRaisesRegex(ValueError, 'development cases only'):
            rolling.select_development(contaminated, configs)

    def test_frozen_registration_rejects_adapter_drift_before_any_fit(self):
        protocol = json.loads(PROTOCOL.read_bytes())
        changed = dict(protocol['existing_adapter_code_hashes'], **{'engine.py': '0' * 64})
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / 'not-created'
            with patch.object(rolling, 'code_hashes', return_value=changed), patch.object(rolling, 'forecast') as forecast:
                with self.assertRaisesRegex(ValueError, 'source/code identity differs'):
                    rolling.prepare(PROTOCOL, SOURCE, LIVE, output)
                forecast.assert_not_called()
            self.assertFalse(output.exists())

    def test_mocked_schedule_isolates_origin_inputs_freezes_before_audits_and_reuses_only_identical_fits(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory)
            calls = []

            def fake_forecast(training, origin, leads, config, seed):
                self.assertEqual(max(training), origin)
                self.assertEqual(set(training), set(range(month('2020-01'), origin + 1)))
                self.assertEqual(leads, [1, 3])
                if origin >= month('2024-10'):
                    self.assertTrue((output / 'selection-before-audits.json').is_file())
                key = config['model_id'], origin
                self.assertNotIn(key, calls)
                calls.append(key)
                if key == ('sarima_airline', month('2023-04')):
                    return {}, 'optimizer_failed_explicit_test'
                return {lead: training[origin] for lead in leads}, None

            # This is a scheduling/failure/cache test with fake forecasts, not a new
            # execution of the historical registered adapters. Exercise the exact
            # frozen guard separately above; register the ACTUAL current runner
            # identity so run/readback verification still detects code drift.
            frozen_adapters = json.loads(PROTOCOL.read_bytes())['existing_adapter_code_hashes']
            current_runner = rolling.runner_hashes()
            with patch.object(rolling, 'forecast', fake_forecast), \
                    patch.object(rolling, 'code_hashes', return_value=frozen_adapters), \
                    patch.object(rolling, 'runner_hashes', return_value=current_runner), \
                    redirect_stdout(io.StringIO()):
                rolling.prepare(PROTOCOL, SOURCE, LIVE, output)
                rolling.run(SOURCE, LIVE, output)
            report = json.loads((output / 'evaluation.json').read_bytes())
            protocol = json.loads(PROTOCOL.read_bytes())
            expected = {(config['model_id'], month(row['origin_period']))
                        for config in protocol['configurations'] for row in protocol['cases']}
            self.assertEqual(set(calls), expected)
            self.assertEqual(len(calls), 945)
            self.assertEqual(len(report['predictions']), 1722)
            self.assertEqual(len(report['metrics']), 126)
            self.assertEqual(len(report['fit_uses']), 987)
            self.assertEqual(sum(row['fit_reused'] for row in report['fit_uses']), 42)
            failures = [row for row in report['predictions'] if row['prediction'] is None]
            self.assertEqual(len(failures), 2)
            self.assertTrue(all(row['missing_reason'] == 'optimizer_failed_explicit_test' for row in failures))
            self.assertFalse(report['publication_approved'])
            self.assertEqual(report['warehouse_writes'], 0)
            self.assertEqual(report['future_forecasts_generated'], 0)
            with redirect_stdout(io.StringIO()):
                verify(SOURCE, LIVE, output)
            with (output / 'predictions.csv').open(encoding='utf-8', newline='') as handle:
                exported = list(csv.DictReader(handle))
            self.assertEqual(len(exported), 1722)
            self.assertEqual(exported[0]['contracts_excluded'], 'True')
            self.assertEqual(exported[0]['publication_approved'], 'False')
            self.assertEqual(exported[0]['protocol_sha256'], rolling.PROTOCOL_SHA256)
            # A newly checksummed fabricated actual still cannot pass source validation.
            report['predictions'][0]['actual'] += 1
            altered = json.dumps(report).encode('utf-8')
            (output / 'evaluation.json').write_bytes(altered)
            (output / 'evaluation.sha256').write_text(rolling.sha(altered))
            with self.assertRaises(AssertionError):
                verify(SOURCE, LIVE, output)
            # Saved plan tampering is refused before another fit.
            with (output / 'execution-registration.json').open('ab') as handle:
                handle.write(b' ')
            with self.assertRaisesRegex(ValueError, 'registration checksum'):
                rolling.run(SOURCE, LIVE, output)


if __name__ == '__main__':
    unittest.main()
