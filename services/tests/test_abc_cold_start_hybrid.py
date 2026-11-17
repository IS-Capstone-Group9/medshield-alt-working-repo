import unittest

from services.analytics_service import abc_cold_start_hybrid as m6


class AbcColdStartHybridTests(unittest.TestCase):
    def test_fit_category_priors_and_cold_start_routing(self):
        train = [
            {'product_category': 'anti-infectives', 'target_abc': 'A'},
            {'product_category': 'anti-infectives', 'target_abc': 'A'},
            {'product_category': 'anti-infectives', 'target_abc': 'B'},
            {'product_category': 'vitamins', 'target_abc': 'C'},
            {'product_category': 'vitamins', 'target_abc': 'C'},
        ]
        priors, majority = m6.fit_category_priors(train)
        self.assertEqual({'anti-infectives': 'A', 'vitamins': 'C'}, priors)
        self.assertEqual('A', majority)

        eval_rows = [
            {'product_family': 'F1', 'cohort': 'more_than_6_observed_months', 'product_category': 'anti-infectives', 'prior_abc': 'B', 'target_abc': 'B'},
            {'product_family': 'F2', 'cohort': 'no_prior_observation', 'product_category': 'anti-infectives', 'prior_abc': None, 'target_abc': 'A'},
            {'product_family': 'F3', 'cohort': 'prior_ineligible_only', 'product_category': 'vitamins', 'prior_abc': None, 'target_abc': 'C'},
            {'product_family': 'F4', 'cohort': 'more_than_6_observed_months', 'product_category': 'vitamins', 'prior_abc': 'C', 'target_abc': 'C'},
        ]
        preds = m6.predict_abc_hybrid(eval_rows, priors, majority)
        self.assertEqual(['B', 'A', 'C', 'C'], preds)
        report = m6.evaluate_abc_hybrid(eval_rows, priors, majority, draws=200)
        self.assertEqual(1.0, report['cold_start_hybrid']['macro_f1'])
        self.assertFalse(report['publication_approved'])
        self.assertIsNotNone(report['macro_f1_diff_vs_prior_ci95'])


if __name__ == '__main__':
    unittest.main()
