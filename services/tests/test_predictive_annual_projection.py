"""Annual projection boundaries; synthetic tests establish contracts, never sales accuracy."""
import copy
from datetime import datetime, timedelta, timezone
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import warnings

from services.analytics_service.predictive import annual_projection as annual
from services.analytics_service.predictive.contracts import digest, month
from services.analytics_service.predictive.engine import DEFAULT_SCHEDULE, package_versions
from services.analytics_service.predictive.extended_experiment import protocol
from services.tests.test_predictive import fixture


def comparison_fixture(data):
    specification = protocol()
    configs = specification['configurations']
    evaluations = [dict(model_id=config['model_id'], development_scored=dict(n=60, wape=80.),
                        audit=dict(n=12, wape=40.)) for config in configs]
    return dict(schema_version='1.0', run_id='fixture_comparison', status='exploratory_evaluated_unpublished',
        publication_approved=False, manifest=copy.deepcopy(data['manifest']), predictions=[], evaluations=evaluations,
        model_cards=[], folds=[], warnings=[], limitations=['Fixture only'], experiment_protocol=specification,
        identity=dict(input_hash=digest(data), seed=20260927, packages=package_versions(), configurations=configs,
            schedule=copy.deepcopy(DEFAULT_SCHEDULE), code_identity=dict(code_sha256={
                name: annual.raw_hash(Path(annual.__file__).with_name(name).read_bytes()) for name in annual.INHERITED_FILES})),
        selection=dict(model_id='last_value', stage='development_only', audit_previously_inspected=True,
                       status='exploratory_candidate_only', reason='Inherited fixture benchmark'))


def record_fixture(data, comparison, as_of='2026-10-10'):
    return annual.registration(data, comparison, dict(source='fixture_only'), as_of)


def write_fixture(root, data=None):
    data = data or fixture()
    comparison = comparison_fixture(data)
    frozen = root / 'input.json'
    frozen.write_bytes(annual.encode(data))
    frozen.with_suffix('.sha256').write_text(annual.raw_hash(frozen.read_bytes()), encoding='utf-8')
    experiment = root / 'comparison'
    output = experiment / 'fixture-run'
    output.mkdir(parents=True)
    (experiment / 'protocol.json').write_bytes(annual.encode(dict(identity=dict(
        input_sha256=annual.raw_hash(frozen.read_bytes()), protocol=comparison['experiment_protocol']))))
    artifacts = {'run.json': comparison, 'predictions.json': comparison['predictions'],
        'evaluations.json': comparison['evaluations'], 'model-cards.json': comparison['model_cards'],
        'input-manifest.json': comparison['manifest'], 'folds.json': [], 'warnings.json': [], 'coverage.json': dict(rows=72)}
    hashes = {'../protocol.json': annual.raw_hash((experiment / 'protocol.json').read_bytes())}
    for name, value in artifacts.items():
        raw = annual.encode(value)
        (output / name).write_bytes(raw)
        hashes[name] = annual.raw_hash(raw)
    (output / 'RESULTS.md').write_text('Fixture results only', encoding='utf-8')
    hashes['RESULTS.md'] = annual.raw_hash((output / 'RESULTS.md').read_bytes())
    (output / 'artifact-hashes.json').write_bytes(annual.encode(hashes))
    return frozen, output / 'run.json', comparison


class AnnualProjectionTests(unittest.TestCase):
    def setUp(self):
        self.data = fixture()
        self.comparison = comparison_fixture(self.data)

    def project(self, data=None, predictor=None, generated='2026-10-10T03:04:05+00:00'):
        data = data or self.data
        comparison = comparison_fixture(data)
        record = record_fixture(data, comparison)
        predictor = predictor or (lambda series, origin, leads, config, seed: ({lead: series[origin] for lead in leads}, None))
        with patch.object(annual, 'forecast', side_effect=predictor):
            return annual.project(data, comparison, record, generated)

    def test_all_21_configs_called_once_with_only_exact_origin_training(self):
        data = copy.deepcopy(self.data)
        future = copy.deepcopy(data['rows'][-1])
        future.update(period='2026-01', target_value=1e15)
        data['rows'].append(future)
        earlier = copy.deepcopy(data['rows'][0])
        earlier.update(period='2019-12', target_value=-1e15)
        data['rows'].append(earlier)
        calls = []

        def predictor(series, origin, leads, config, seed):
            self.assertEqual(set(series), set(range(month('2020-01'), month('2025-12') + 1)))
            self.assertEqual(origin, month('2025-12'))
            self.assertEqual(leads, list(range(1, 13)))
            self.assertEqual(seed, self.comparison['identity']['seed'])
            calls.append(config)
            return {lead: -7. for lead in leads}, None

        result = self.project(data, predictor)
        self.assertEqual(calls, self.comparison['identity']['configurations'])
        self.assertEqual(len(result['projection_points']), 252)
        self.assertEqual(result['training']['supplied_future_row_count'], 1)
        self.assertTrue(all(point['actual'] is None and point['prediction'] == -7. for point in result['projection_points']))

    def test_training_approval_never_transfers_publication_and_audit_is_inherited(self):
        self.data['manifest']['publication_approved'] = True
        result = self.project()
        self.assertFalse(result['publication_approved'])
        self.assertEqual(result['inherited_selection']['model_id'], 'last_value')
        self.assertEqual(result['inherited_evaluations'], comparison_fixture(self.data)['evaluations'])
        self.assertTrue(all(card['publication_approved'] is False for card in result['model_cards']))
        self.assertTrue(all(point['publication_approved'] is False for point in result['projection_points']))
        self.assertTrue(all(band['lower'] is None and band['upper'] is None for point in result['projection_points'] for band in point['intervals']))

    def test_gap_partial_coverage_missing_origin_and_multiple_series_rejected_before_fit(self):
        cases = []
        gap = copy.deepcopy(self.data)
        gap['rows'].pop(20)
        cases.append(gap)
        partial = copy.deepcopy(self.data)
        partial['rows'][20].update(coverage_status='unknown', eligible_for_evaluation=False)
        cases.append(partial)
        origin = copy.deepcopy(self.data)
        origin['rows'].pop()
        cases.append(origin)
        other = copy.deepcopy(self.data)
        other['rows'][20]['series_id'] = 'other_company'
        cases.append(other)
        with patch.object(annual, 'forecast') as adapter:
            for data in cases:
                with self.subTest(case=len(data['rows'])), self.assertRaises(ValueError):
                    record_fixture(data, comparison_fixture(data))
            adapter.assert_not_called()

    def test_partial_nonfinite_failure_and_convergence_warning_null_whole_recipe(self):
        predictors = [lambda *args: ({1: 4.}, None),
            lambda *args: ({lead: float('nan') if lead == 2 else 4. for lead in annual.LEADS}, None),
            lambda *args: ({lead: 4. for lead in annual.LEADS}, 'Optimizer did not converge')]
        for predictor in predictors:
            result = self.project(predictor=predictor)
            self.assertTrue(all(point['prediction'] is None and point['missing_reason'] for point in result['projection_points']))
            self.assertTrue(all(card['available_point_count'] == 0 for card in result['model_cards']))

        def raises(*args):
            raise RuntimeError('Linear solve failed')
        result = self.project(predictor=raises)
        self.assertTrue(all('RuntimeError' in card['unavailable_reason'] for card in result['model_cards']))

        class ConvergenceWarning(UserWarning):
            pass

        def warning(*args):
            warnings.warn('Optimizer exhausted iterations', ConvergenceWarning)
            return {lead: 4. for lead in annual.LEADS}, None
        result = self.project(predictor=warning)
        self.assertEqual(len(result['warnings']), 21)
        self.assertTrue(all(card['available_point_count'] == 0 for card in result['model_cards']))

    def test_duplicate_model_id_nonfinite_json_and_duplicate_json_field_rejected(self):
        duplicate = copy.deepcopy(self.comparison)
        duplicate['identity']['configurations'][1] = duplicate['identity']['configurations'][0]
        with self.assertRaisesRegex(ValueError, 'unique inherited'):
            annual.comparison_contract(duplicate)
        unknown = copy.deepcopy(self.comparison)
        unknown['identity']['configurations'][-1]['family'] = 'unknown'
        with self.assertRaisesRegex(ValueError, 'differ from evaluated adapter'):
            annual.comparison_contract(unknown)
        for raw in (b'{"value":NaN}', b'{"value":Infinity}', b'{"value":1e999}', b'{"value":1,"value":2}'):
            with self.subTest(raw=raw), self.assertRaises(ValueError):
                annual.read_json(raw)

    def test_unsupported_target_lost_training_approval_origin_and_horizon_rejected(self):
        for field, value in [('target_name', 'quantity'), ('unit', 'units'), ('grain', 'sku_month'), ('scope', 'sku')]:
            data = copy.deepcopy(self.data)
            data['rows'][0][field] = value
            with self.subTest(field=field), self.assertRaisesRegex(ValueError, 'company monthly net-sales'):
                record_fixture(data, comparison_fixture(data))
        for field in ('training_approved', 'reconciliation_passed'):
            data = copy.deepcopy(self.data)
            data['manifest'][field] = False
            with self.subTest(field=field), self.assertRaisesRegex(ValueError, 'not approved for training'):
                record_fixture(data, comparison_fixture(data))
        altered = copy.deepcopy(self.comparison)
        altered['identity']['schedule']['audit_end'] = '2026-01'
        with self.assertRaisesRegex(ValueError, 'December 2025 cutoff'):
            record_fixture(self.data, altered)
        record = record_fixture(self.data, self.comparison)
        record['identity']['training']['forecast_leads'] = [1, 13]
        record['projection_id'] = digest(record['identity'])
        with self.assertRaisesRegex(ValueError, 'Training identity differs'):
            annual.project(self.data, self.comparison, record, '2026-10-10T00:00:00+00:00')

    def test_malformed_adapter_returns_are_coherently_unavailable(self):
        for predictor in (lambda *args: (None, None), lambda *args: None,
                          lambda *args: ({True: 4., **{lead: 4. for lead in range(2, 13)}}, None)):
            result = self.project(predictor=predictor)
            self.assertTrue(all(point['prediction'] is None and point['missing_reason'] for point in result['projection_points']))

    def test_as_of_generation_time_and_true_leads_are_distinct(self):
        result = self.project(generated='2026-10-09T23:30:00+00:00')
        self.assertEqual(result['generated_on_manila'], '2026-10-10')
        self.assertEqual(result['as_of_manila'], '2026-10-10')
        self.assertEqual(result['as_of_semantics'], 'reference_date_not_historical_issue_time')
        points = result['projection_points'][:12]
        self.assertEqual([point['target_period'] for point in points], [f'2026-{number:02d}' for number in range(1, 13)])
        self.assertEqual([point['lead_months'] for point in points], list(range(1, 13)))
        self.assertEqual([point['period_status'] for point in points], ['elapsed_no_actual'] * 9 + ['current_month_no_actual'] + ['future_no_actual'] * 2)
        self.assertTrue(all(point['origin_period'] == '2025-12' and point['actual'] is None for point in points))
        for value in ('2026-13-01', '2026-10', '2025-12-31'):
            with self.subTest(value=value), self.assertRaises(ValueError):
                record_fixture(self.data, self.comparison, value)
        with self.assertRaisesRegex(ValueError, 'actual UTC'):
            self.project(generated='2025-12-31T23:00:00')

    def test_checksum_failure_input_comparison_and_path_scope(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            frozen, comparison_path, _ = write_fixture(root)
            raw = frozen.read_bytes()
            frozen.write_bytes(raw + b' ')
            with self.assertRaisesRegex(ValueError, 'Byte checksum'):
                annual.load_sources(frozen, comparison_path)
            frozen.write_bytes(raw)
            comparison_path.write_bytes(comparison_path.read_bytes() + b' ')
            with self.assertRaisesRegex(ValueError, 'Byte checksum'):
                annual.load_sources(frozen, comparison_path)
            comparison_path.parent.joinpath('artifact-hashes.json').write_text('{"../../escape.json":"' + 'a' * 64 + '"}')
            with self.assertRaisesRegex(ValueError, 'Incomplete inherited'):
                annual.load_sources(frozen, comparison_path)

    def test_cli_prepare_without_fit_drift_guard_and_no_overwrite_or_release(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            frozen, comparison_path, _ = write_fixture(root)
            output = root / 'projection'
            args = ['annual_projection', '--input', str(frozen), '--comparison', str(comparison_path),
                    '--output', str(output), '--as-of', '2026-10-10']
            with patch('sys.argv', args + ['--prepare']), patch.object(annual, 'forecast') as adapter:
                annual.main()
                adapter.assert_not_called()
            record = annual.read_json((output / 'protocol.json').read_bytes())
            changed = copy.deepcopy(record)
            changed['identity']['seed'] += 1
            (output / 'protocol.json').write_bytes(annual.encode(changed))
            with patch('sys.argv', args), self.assertRaisesRegex(ValueError, 'changed since registration'):
                annual.main()
            (output / 'protocol.json').write_bytes(annual.encode(record))
            def predictor(series, origin, leads, config, seed):
                return {lead: series[origin] for lead in leads}, None
            with patch('sys.argv', args), patch.object(annual, 'forecast', side_effect=predictor) as adapter:
                annual.main()
                self.assertEqual(adapter.call_count, 21)
            run_path = next(output.glob('*/run.json'))
            result = annual.read_json(run_path.read_bytes())
            self.assertEqual(len(result['projection_points']), 252)
            self.assertFalse(list(output.rglob('release-draft.json')))
            self.assertFalse(list(output.rglob('*.csv')))
            with patch('sys.argv', args), self.assertRaisesRegex(ValueError, 'already exists'):
                annual.main()
            with patch('sys.argv', args + ['--prepare']), self.assertRaisesRegex(ValueError, 'already exists'):
                annual.main()

    def test_evaluated_environment_adapter_and_registration_identity_must_match(self):
        changed = copy.deepcopy(self.comparison)
        changed['identity']['packages']['numpy'] = 'different'
        with self.assertRaisesRegex(ValueError, 'package environment changed'):
            record_fixture(self.data, changed)
        changed = copy.deepcopy(self.comparison)
        changed['identity']['code_identity']['code_sha256']['models.py'] = 'a' * 64
        with self.assertRaisesRegex(ValueError, 'adapter code changed'):
            record_fixture(self.data, changed)
        record = record_fixture(self.data, self.comparison)
        record['identity']['training']['training_count'] = 71
        with self.assertRaisesRegex(ValueError, 'registration identity mismatch'):
            annual.project(self.data, self.comparison, record, '2026-10-10T00:00:00+00:00')


if __name__ == '__main__':
    unittest.main()
