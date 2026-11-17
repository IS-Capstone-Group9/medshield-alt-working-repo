from copy import deepcopy
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from services.analytics_service import abc_evaluation as evaluation
from services.analytics_service import abc_protocol as contract

ROOT = Path(__file__).resolve().parents[2]
PROTOCOL = ROOT / 'outputs/original_abc_protocol_20261027/protocol.json'
SOURCE = ROOT / 'outputs/original_so2_20261027/source.json'


class AbcEvaluationTests(unittest.TestCase):
    def scores(self, baseline=.3, a_recall=.4):
        return {name: dict(stage='development_validation', macro_f1=baseline, a_recall=a_recall)
                for name in evaluation.MODELS}

    def test_hand_confusion_precision_recall_f1_and_balanced_accuracy(self):
        m = evaluation.metrics(['A', 'A', 'B', 'C'], ['A', 'B', 'B', 'C'])
        self.assertEqual(m['confusion_matrix'], [[1,1,0], [0,1,0], [0,0,1]])
        self.assertAlmostEqual(m['macro_f1'], 7/9)
        self.assertAlmostEqual(m['balanced_accuracy'], 5/6)
        self.assertEqual(m['accuracy'], .75)

    def test_undefined_metrics_are_null_and_invalid_lengths_classes_fail(self):
        m = evaluation.metrics(['A'], ['C'])
        self.assertIsNone(m['per_class']['A']['precision'])
        self.assertIsNone(m['per_class']['C']['recall'])
        self.assertEqual(m['per_class']['A']['f1'], 0)
        self.assertIsNone(evaluation.metrics([], [])['macro_f1'])
        for actual, predicted in [(['A'], []), (['A'], ['unknown'])]:
            with self.assertRaises(ValueError):
                evaluation.metrics(actual, predicted)

    def test_validation_gain_and_a_recall_guard(self):
        scores = self.scores()
        scores['prior_abc']['macro_f1'] = .4
        scores['xgb_depth_2'].update(macro_f1=.9, a_recall=.39)
        scores['xgb_depth_3'].update(macro_f1=.419, a_recall=.5)
        self.assertEqual(evaluation.select_validation(scores)['model_id'], 'prior_abc')
        scores['xgb_depth_3']['macro_f1'] = .42
        self.assertEqual(evaluation.select_validation(scores)['model_id'], 'xgb_depth_3')

    def test_ties_prefer_baseline_then_shallower_model_and_audit_selection_is_rejected(self):
        scores = self.scores()
        self.assertEqual(evaluation.select_validation(scores)['model_id'], 'majority')
        scores['xgb_depth_2']['macro_f1'] = scores['xgb_depth_3']['macro_f1'] = .5
        self.assertEqual(evaluation.select_validation(scores)['model_id'], 'xgb_depth_2')
        scores['majority']['stage'] = 'retrospective_test_2025'
        with self.assertRaises(ValueError):
            evaluation.select_validation(scores)

    def test_training_only_medians_and_all_feature_missing_indicators(self):
        def row(key, value):
            return dict(product_key=key, target_year=2021,
                        features={name: value for name in contract.FEATURES})
        train = [row('a', 10), row('b', 20), row('c', None)]
        processor = evaluation.fit_preprocessor(train)
        self.assertEqual(processor['medians'], [15.]*6)
        transformed = evaluation.transform([row('d', None), row('e', 999999)], processor)
        self.assertEqual(list(transformed[0]), [15.]*6 + [1.]*6)
        self.assertEqual(processor['medians'], [15.]*6)
        with self.assertRaises(ValueError):
            evaluation.fit_preprocessor([row('unsupported', None)])

    def test_majority_and_persistence_fallback_use_training_labels_only(self):
        training = [dict(target_abc=c) for c in ['A','B','C']]
        self.assertEqual(evaluation.majority(training), 'A')
        protocol = json.loads(PROTOCOL.read_bytes())
        rows = evaluation.stage_rows(protocol, 'development_validation')[:3]
        rows = deepcopy(rows)
        for r, prior in zip(rows, [None, 'Unclassified', 'B']):
            r['prior_abc_baseline'] = prior
        predictions = evaluation.predict_cases(rows, 'prior_abc', 'C')
        self.assertEqual([r['predicted'] for r in predictions], ['C','C','B'])

    def test_changed_registration_fails_before_any_fit(self):
        protocol = evaluation.load_protocol(PROTOCOL, SOURCE)
        registered = evaluation.registration(protocol)
        registered['runner_sha256'] = 'changed'
        with tempfile.TemporaryDirectory() as directory, patch('xgboost.XGBClassifier.fit') as fit:
            with self.assertRaisesRegex(ValueError, 'Registration/code/environment changed'):
                evaluation.execute(protocol, Path(directory), registered)
            fit.assert_not_called()

    def test_existing_results_refuse_refit_and_mutated_source_is_rejected(self):
        protocol = evaluation.load_protocol(PROTOCOL, SOURCE)
        registered = evaluation.registration(protocol)
        with tempfile.TemporaryDirectory() as directory, patch('xgboost.XGBClassifier.fit') as fit:
            directory = Path(directory)
            (directory / 'results.json').write_text('{}')
            with self.assertRaisesRegex(ValueError, 'Results already exist'):
                evaluation.execute(protocol, directory, registered)
            fit.assert_not_called()
            (directory / 'source.json').write_text('{}')
            with self.assertRaisesRegex(ValueError, 'Source receipt changed'):
                evaluation.load_protocol(PROTOCOL, directory / 'source.json')


if __name__ == '__main__':
    unittest.main()
