import unittest
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import numpy as np

from services.analytics_service.collaborative_recommender import (
    CollaborativeRecommender, evaluate_temporal_holdout, ranking_metrics,
)


def record(account, product, period="2026-03", **kwargs):
    return {"derived_account_key": account, "product": product, "period": period,
            "net_sales": 100, "order_id": account + product + period,
            "match_confidence": "exact_reference_match", "category": "Medical",
            "territory": "Bicol", "buyer_sector": "Private", **kwargs}


class RecommenderTests(unittest.TestCase):
    def setUp(self):
        self.rows = [record("a", "p1"), record("a", "p2"), record("b", "p2"),
                     record("b", "p3"), record("c", "p1"), record("c", "p3")]

    def fit(self, rows):
        return CollaborativeRecommender().fit(rows, origin_period="2026-03", dataset_id="d", policy_version="p")

    def test_known_ranking_metrics(self):
        result = ranking_metrics(["a", "b", "c"], {"a", "c"}, k=3)
        self.assertAlmostEqual(result["precision_at_k"], 2 / 3)
        self.assertEqual(result["recall_at_k"], 1)
        self.assertAlmostEqual(result["ndcg_at_k"], 1.5 / (1 + 1 / np.log2(3)))

    def test_future_mutations_cannot_change_fit_or_predictions(self):
        baseline = self.fit(self.rows)
        future = self.rows + [record("a", "new_future", "2026-04", net_sales=9999999),
                              record("future", "p1", "2026-12", net_sales=-100)]
        changed = self.fit(future)
        np.testing.assert_array_equal(baseline.user_factors, changed.user_factors)
        np.testing.assert_array_equal(baseline.item_factors, changed.item_factors)
        for model in ("global_popularity", "territory_popularity", "item_knn_cosine", "implicit_als"):
            self.assertEqual(baseline.recommend("a", model=model), changed.recommend("a", model=model))

    def test_nonmedical_internal_fallback_and_discontinued_excluded(self):
        rows = self.rows + [record("a", "supply", category="Non-Medical"),
                            record("a", "internal", buyer_sector="Internal"),
                            record("a", "old", "2025-02"),
                            record("channel", "ambiguous", match_confidence="area_channel_fallback")]
        model = self.fit(rows)
        self.assertEqual(model.products, ["p1", "p2", "p3"])
        self.assertEqual([r["product"] for r in model.recommend("a")], ["p3"])
        self.assertTrue(all(r["model"] == "territory_popularity" for r in model.recommend("new", territory="Bicol")))

    def test_holdout_denominator_includes_unknown_catalog(self):
        model = self.fit(self.rows)
        output = evaluate_temporal_holdout(model, [record("a", "p3", "2026-04"),
                                                   record("a", "future-only", "2026-05"),
                                                   record("b", "p2", "2026-05")],
                                           end_period="2026-09", k=1, bootstrap_runs=20)
        self.assertEqual(output["out_of_catalog_adoptions"], 1)
        self.assertEqual(output["accounts_without_unseen_adoption"], 1)
        self.assertEqual(output["leaderboard"][0]["recall_at_k"], .5)
        self.assertEqual(output["leaderboard"][0]["precision_at_k"], 1)
        self.assertFalse(output["operational_approval"])

    def test_empty_holdout_is_unavailable_not_zero(self):
        output = evaluate_temporal_holdout(self.fit(self.rows), [], end_period="2026-09", bootstrap_runs=2)
        self.assertIsNone(output["leaderboard"][0]["recall_at_k"])

    def test_unknown_territory_is_truthful_global_fallback_and_separate_cold_cohort(self):
        fitted = self.fit(self.rows)
        self.assertEqual(fitted.recommend('new', model='implicit_als')[0]['model'], 'global_popularity')
        output = evaluate_temporal_holdout(fitted, [record('new', 'p3', '2026-04', territory='FutureOnly')],
                                           end_period='2026-09', bootstrap_runs=2)
        cold = [r for r in output['cohort_leaderboards'] if r['cohort'] == 'cold_account_no_origin_metadata']
        self.assertTrue(all(r['evaluated_accounts'] == 1 for r in cold))
        self.assertNotIn('new', fitted.user_territory)

    def test_order_identity_is_required(self):
        with self.assertRaises(ValueError):
            self.fit([record("a", "p", order_id=None)])

    def test_offline_cli_evaluates_and_binds_input_hash(self):
        import hashlib
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            records, output = root / "records.json", root / "result.json"
            records.write_text(json.dumps(self.rows + [record("a", "p3", "2026-04")]), encoding="utf-8")
            result = subprocess.run([sys.executable, "-m", "services.analytics_service.collaborative_recommender",
                "--records", str(records), "--origin-period", "2026-03", "--end-period", "2026-09",
                "--dataset-id", "fixture", "--policy-version", "test", "--output", str(output)],
                capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stderr)
            artifact = json.loads(output.read_text(encoding="utf-8"))
            self.assertEqual(artifact["input_sha256"], hashlib.sha256(records.read_bytes()).hexdigest())
            self.assertEqual(len(artifact["leaderboard"]), 4)
            self.assertEqual(artifact["sample_recommendations"][0]["historical_neighbor_context"][0]["co_purchasing_account_count"], 1)


if __name__ == "__main__":
    unittest.main()
