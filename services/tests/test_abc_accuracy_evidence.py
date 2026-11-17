from copy import deepcopy
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from services.analytics_service import abc_accuracy_evidence as evidence
from services.analytics_service import abc_evaluation as original


class AbcAccuracyEvidenceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.protocol = original.load_protocol(evidence.PROTOCOL, evidence.SOURCE)
        cls.train = original.stage_rows(cls.protocol, 'development_train')
        cls.validation = original.stage_rows(cls.protocol, 'development_validation')

    def test_hand_smoothed_parent_cell_and_class_weights(self):
        rows = deepcopy(self.train[:3])
        for row, target in zip(rows, 'ABC'):
            row['target_abc'] = target
            row['prior_abc_baseline'] = 'A'
        model = evidence.fit_transition(rows, 2023)
        guess, posterior, weighted = evidence.predict_one(rows[0], model)
        self.assertAlmostEqual(sum(posterior.values()), 1.)
        counts = {c: sum(r['target_abc'] == c and r['cohort'] == rows[0]['cohort'] for r in rows) for c in 'ABC'}
        for c in 'ABC':
            self.assertAlmostEqual(posterior[c], (counts[c]+10/3)/(sum(counts.values())+10))
            self.assertEqual(weighted[c], posterior[c])
        self.assertEqual(guess, max('ABC', key=lambda c: weighted[c]))

    def test_future_target_label_and_unconsumed_amounts_do_not_change_prediction(self):
        model = evidence.fit_transition(self.train, 2023)
        row = deepcopy(self.validation[0])
        before = evidence.predict_one(row, model)
        row['target_abc'] = 'C' if row['target_abc'] != 'C' else 'A'
        row['recorded_label'] = 'Future label must not enter predictors'
        row['features']['prior_net_sales_php'] = '9999999999'
        row['features']['prior_positive_sales_php'] = '9999999999'
        self.assertEqual(before, evidence.predict_one(row, model))

    def test_later_year_wrong_partition_and_duplicate_training_reject(self):
        for change in ('year', 'partition', 'duplicate'):
            rows = deepcopy(self.train)
            if change == 'year':
                rows[0].update(target_year=2025, feature_year=2024, feature_cutoff='2024-12-31')
            elif change == 'partition':
                rows[0]['partition'] = 'test'
            else:
                rows.append(deepcopy(rows[0]))
            with self.assertRaises(ValueError):
                evidence.fit_transition(rows, 2023)

    def test_missing_history_is_not_zero_or_fabricated_support(self):
        row = deepcopy(next(r for r in self.validation if r['cohort'] == 'no_prior_observation'))
        self.assertEqual(evidence.predictor_key(row)[1], 'no_prior_observation')
        row['features']['prior_net_sales_php'] = '0'
        with self.assertRaises(ValueError):
            evidence.predictor_key(row)

    def test_issue_cutoff_feature_allowlist_and_cohort_fail(self):
        for key in ('cutoff', 'cohort', 'allowlist'):
            row = deepcopy(self.validation[0])
            if key == 'cutoff': row['feature_year'] = row['target_year']
            elif key == 'cohort': row['cohort'] = 'fabricated'
            else: row['features']['target_revenue'] = 1
            with self.assertRaises(ValueError): evidence.predictor_key(row)

    def test_research_gate_rejects_future_scores_and_a_recall_regression(self):
        scores = {k: dict(stage='development_validation', macro_f1=.4, a_recall=.5)
                  for k in ('majority', 'prior_abc', evidence.MODEL_ID)}
        scores[evidence.MODEL_ID].update(macro_f1=.7, a_recall=.49)
        self.assertFalse(evidence.research_gate(scores)['eligible_research_candidate'])
        scores[evidence.MODEL_ID]['a_recall'] = .5
        self.assertTrue(evidence.research_gate(scores)['eligible_research_candidate'])
        scores[evidence.MODEL_ID]['stage'] = 'retrospective_test_2025'
        with self.assertRaises(ValueError): evidence.research_gate(scores)

    def test_wilson_boundary_and_null_support(self):
        self.assertIsNone(evidence.wilson(0, 0))
        self.assertAlmostEqual(evidence.wilson(0, 10)[1], .2775327998628892)
        self.assertAlmostEqual(evidence.wilson(10, 10)[0], .7224672001371108)

    def test_bootstrap_pair_mismatch_rejects_and_identical_cases_have_zero_delta(self):
        cases = original.predict_cases(self.validation[:5], 'prior_abc', 'C')
        with patch.object(evidence, 'BOOTSTRAP_REPLICATES', 20):
            result = evidence.conditional_bootstrap(cases, cases, 'development_validation')
        for row in result['intervals'].values():
            if row['percentile_95_interval'] is not None: self.assertEqual(row['percentile_95_interval'], [0., 0.])
        altered = deepcopy(cases)
        altered[0]['product_key'] = 'different'
        with self.assertRaises(ValueError): evidence.conditional_bootstrap(cases, altered, 'development_validation')

    def test_changed_registration_and_partial_output_fail_before_fit(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory)
            registered = evidence.declaration(self.protocol)
            registered['shrinkage'] = 99
            evidence.write_new(output/'registration.json', registered)
            with patch.object(evidence, 'fit_transition') as fit:
                with self.assertRaises(ValueError): evidence.execute(output)
                fit.assert_not_called()
            (output/'registration.json').unlink()
            evidence.write_new(output/'registration.json', evidence.declaration(self.protocol))
            evidence.write_new(output/'started.json', {})
            with patch.object(evidence, 'fit_transition') as fit:
                with self.assertRaises(ValueError): evidence.execute(output)
                fit.assert_not_called()

    def test_exclusive_artifact_write_preserves_original_bytes(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory)/'artifact.json'
            evidence.write_new(path, {'first': True})
            before = path.read_bytes()
            with self.assertRaises(FileExistsError): evidence.write_new(path, {'second': True})
            self.assertEqual(path.read_bytes(), before)


if __name__ == '__main__':
    unittest.main()
