from copy import deepcopy
import unittest

from services.analytics_service.product_analytics_policy import (
    route_product, route_population, screen_quantity_series,
)


def product(**changes):
    row = dict(product_key="one", source_label="Medicine (BOX)", category="medicine",
               category_status="approved", identity_status="needs_review", unit_status="needs_review",
               canonical_sku=None, current_unit_of_measure=None, current_forecast_eligible=False,
               eligible_net_sales_php="100.00", outer_presentation_clue="Box", records=3)
    row.update(changes)
    return row


def approved(**changes):
    row = product(identity_status="approved", unit_status="approved", canonical_sku="SKU-BOX",
                  current_unit_of_measure="Box", current_forecast_eligible=True,
                  item_kind="physical_product", item_kind_status="approved")
    row.update(changes)
    return row


def series(n=36, zero_every=None):
    rows = []
    for i in range(n):
        rows.append(dict(period=f"{2020+i//12:04d}-{i%12+1:02d}",
                         quantity=0 if zero_every and i % zero_every else 10,
                         coverage_approved=True))
    return rows


class ProductAnalyticsPolicyTests(unittest.TestCase):
    def screen(self, rows, **changes):
        args = dict(origin=rows[-1]["period"] if rows else "2022-12", coverage_approved=True,
                    quantity_evidence_approved=True)
        args.update(changes)
        return screen_quantity_series(rows, **args)

    def test_box_text_does_not_approve_unit_or_invent_conversion(self):
        result = route_product(product())
        self.assertEqual(result["quantity_model_status"], "blocked")
        self.assertIn("historical_sales_unit_not_approved", result["quantity_model_blockers"])
        self.assertIsNone(result["quantity_conversion"])
        self.assertFalse(result["clinical_or_urgency_inference_allowed"])

    def test_unknown_unit_still_retains_eligible_financial_reporting(self):
        result = route_product(product())
        self.assertIn("eligible_recorded_net_sales", result["descriptive_methods"])
        self.assertEqual(result["source_evidence"]["eligible_net_sales_php"], "100.00")
        self.assertEqual(result["identity_grain"], "unresolved_source_label")

    def test_adjusted_source_and_literal_clue_change_review_instructions_not_approval(self):
        result = route_product(product(adjusted_records=2))
        self.assertIn("literal presentation clue", result["next_action"])
        self.assertIn("independently verify adjusted-source", result["next_action"])
        self.assertEqual(result["quantity_model_status"], "blocked")
        unknown = route_product(product(category="unclassified", outer_presentation_clue=None))
        self.assertIn("Resolve underlying category", unknown["next_action"])
        self.assertNotEqual(unknown["next_action"], result["next_action"])

    def test_no_input_mutation_and_separate_presentations_not_merged(self):
        rows = [product(), product(product_key="two", source_label="Medicine (PIECE)")]
        before = deepcopy(rows)
        results = route_population(rows)
        self.assertEqual(rows, before)
        self.assertEqual(len(results), 2)
        self.assertEqual({r["product_key"] for r in results}, {"one", "two"})
        results[0]["source_evidence"]["records"] = 999
        self.assertEqual(rows, before)

    def test_duplicate_key_is_rejected_instead_of_double_counting(self):
        with self.assertRaises(ValueError):
            route_population([product(), product()])

    def test_positive_net_review_rank_keeps_negative_labels_visible(self):
        rows = [product(product_key="a", eligible_net_sales_php="-99"),
                product(product_key="b", eligible_net_sales_php="20"),
                product(product_key="c", eligible_net_sales_php="10")]
        results = route_population(rows)
        self.assertEqual([r["product_key"] for r in results], ["b", "c", "a"])
        self.assertEqual(results[-1]["source_evidence"]["eligible_net_sales_php"], "-99")

    def test_approved_unit_without_quantity_evidence_remains_blocked(self):
        result = route_product(approved(), observations=series(), origin="2022-12", coverage_approved=True)
        self.assertIn("historical_quantity_evidence_not_approved", result["quantity_model_blockers"])

    def test_service_never_enters_physical_forecast(self):
        result = route_product(approved(item_kind="service"), quantity_evidence_approved=True)
        self.assertIn("service_has_no_physical_replenishment_target", result["quantity_model_blockers"])

    def test_accepted_unclassified_bucket_is_not_resolved_medicine(self):
        result = route_product(approved(category="unclassified"), quantity_evidence_approved=True)
        self.assertIn("resolved_category_not_approved", result["quantity_model_blockers"])

    def test_missing_month_is_unknown_not_a_filled_zero(self):
        rows = series(); rows.pop(10)
        result = self.screen(rows)
        self.assertEqual(result["status"], "blocked")
        self.assertIn("missing_month_or_stale_origin", result["reasons"])
        self.assertIsNone(result["zero_share"])

    def test_explicit_observed_zero_is_allowed_but_not_unknown(self):
        rows = series(zero_every=2)
        result = self.screen(rows)
        self.assertEqual(result["zero_share"], 0.5)
        self.assertEqual(result["pattern"], "intermittent_observed_sales")
        self.assertIn("croston_sba", result["candidate_methods"])
        rows[0]["quantity"] = None
        self.assertIn("unknown_or_nonfinite_quantity", self.screen(rows)["reasons"])

    def test_all_zero_and_short_series_do_not_get_fitted_candidates(self):
        for rows, pattern in [(series(6), "short_history"),
                              ([dict(r, quantity=0) for r in series()], "all_observed_zero")]:
            result = self.screen(rows)
            self.assertEqual(result["pattern"], pattern)
            self.assertEqual(result["candidate_methods"], [])

    def test_post_origin_leak_and_duplicate_month_are_rejected(self):
        self.assertIn("post_origin_observation", self.screen(series(), origin="2022-11")["reasons"])
        rows = series(); rows.append(deepcopy(rows[-1]))
        self.assertIn("duplicate_month", self.screen(rows)["reasons"])

    def test_stale_series_at_later_origin_remains_blocked(self):
        self.assertIn("missing_month_or_stale_origin", self.screen(series(), origin="2023-01")["reasons"])

    def test_coverage_is_not_inferred_from_month_row_or_quantity(self):
        rows = series(); rows[3]["coverage_approved"] = False
        self.assertIn("monthly_coverage_not_approved", self.screen(rows)["reasons"])
        self.assertIn("monthly_coverage_not_approved", self.screen(series(), coverage_approved="true")["reasons"])

    def test_signed_nonfinite_boolean_quantities_do_not_become_demand(self):
        for value in [-1, float("nan"), float("inf"), True]:
            rows = series(); rows[4]["quantity"] = value
            self.assertEqual(self.screen(rows)["status"], "blocked")

    def test_bad_calendar_month_is_rejected(self):
        rows = series(); rows[0]["period"] = "2020-13"
        with self.assertRaises(ValueError):
            self.screen(rows)

    def test_regular_history_receives_comparison_candidates_not_a_winner(self):
        result = route_product(approved(), observations=series(), origin="2022-12",
                               coverage_approved=True, quantity_evidence_approved=True)
        self.assertEqual(result["quantity_model_status"], "candidate_comparison_design_required")
        self.assertIn("seasonal_naive_12", result["series_profile"]["candidate_methods"])
        self.assertFalse(result["series_profile"]["fit_performed"])
        self.assertFalse(result["publication_approved"])
        self.assertFalse(result["activation_allowed"])
        self.assertFalse(result["cross_product_quantity_total_allowed"])

    def test_two_years_do_not_qualify_for_seasonal_screening(self):
        result = self.screen(series(24))
        self.assertNotIn("seasonal_naive_12", result["candidate_methods"])
        self.assertIn("last_value", result["candidate_methods"])


if __name__ == "__main__":
    unittest.main()
