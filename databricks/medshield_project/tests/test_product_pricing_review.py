"""Business-semantic regressions: prices are observations, not product identifiers."""
import copy
from decimal import Decimal
import sys
from pathlib import Path
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from review_product_sales import assess_price, enrich, profiles, reconcile_warehouse, decimal
from review_catalog import financial_partition


def row(key="a", **changes):
    value = {"source_record_id": key, "canonical_group_id": "SKU:MASK-PIECE", "canonical_sku": "MASK-PIECE",
             "identity_status": "approved", "category_status": "approved", "normalized_product": "MASK PIECE",
             "product_raw": "Mask Piece", "item_kind": "physical_product", "unit_of_measure": "Piece",
             "packaging_unit": "Piece", "pack_count": "1", "contained_unit": "Piece", "calendar_year": "2025",
             "month_start": "2025-01-01", "date_delivered": "2025-01-15", "dr_number": "DR-1",
             "quantity": "1", "unit_selling_price": "20", "gross_sales": "20", "discount_amount": "0",
             "net_sales": "20", "total_acquisition_cost": "10", "gross_margin_amount": "10",
             "is_adjusted_source": "false", "transaction_evidence": "original_source_detail",
             "is_analysis_candidate": "true", "is_contract_label": "false",
             **{flag: "true" for flag in ("is_net_sales_eligible", "is_gross_sales_eligible", "is_gross_margin_eligible", "is_acquisition_cost_eligible", "is_quantity_observation_eligible")}}
    value.update(changes)
    return value


class PricingReviewTests(unittest.TestCase):
    def test_negotiation_not_inferred_and_discount_not_applied_twice(self):
        original = [row(), row("b", quantity="100", unit_selling_price="15", gross_sales="1500",
                              discount_amount="100", net_sales="1400", total_acquisition_cost="1000", gross_margin_amount="400")]
        saved = copy.deepcopy(original)
        output = enrich(original)
        group = profiles(output)
        self.assertEqual(original, saved)
        self.assertEqual(len(group), 1)
        self.assertEqual(len(group[0]["reported_cp_positive_original_candidates"]), 2)
        low_price = group[0]["positive_original_cp_context"][0]
        self.assertEqual(low_price["recorded_cp"], "15")
        self.assertEqual(low_price["min_reported_quantity"], "100")
        self.assertEqual(low_price["year_record_counts"], {"2025": 1})
        self.assertEqual(output[1]["unit_selling_price"], "15")
        self.assertEqual(output[1]["pricing_review"]["effective_net_unit_price"], "14")
        self.assertEqual(output[1]["pricing_review"]["price_reason"], "unknown")
        self.assertEqual(output[1]["pricing_review"]["customer_price_analysis"], "unavailable_no_verified_account_id")
        self.assertEqual(financial_partition(original), financial_partition(output))

    def test_box_and_piece_stay_separate_even_at_same_price(self):
        rows = enrich([row(), row("b", canonical_group_id="SKU:MASK-BOX50", packaging_unit="Box", pack_count="50")])
        self.assertEqual(len(profiles(rows)), 2)

    def test_missing_and_recorded_zero_have_different_warnings(self):
        missing = assess_price(row(unit_selling_price=None, quantity=None, net_sales=None))
        zero = assess_price(row(unit_selling_price="0", quantity="0", net_sales="0", gross_sales="0"))
        self.assertIn("MISSING_UNIT_SELLING_PRICE", missing["warnings"])
        self.assertIn("ZERO_REPORTED_UNIT_SELLING_PRICE", zero["warnings"])
        self.assertNotIn("MISSING_UNIT_SELLING_PRICE", zero["warnings"])
        self.assertIsNone(missing["effective_net_unit_price"])
        self.assertIsNone(zero["effective_net_unit_price"])
        self.assertEqual(zero["numeric_states"]["discount_amount"], "zero")
        self.assertNotIn("ZERO_REPORTED_DISCOUNT_AMOUNT", zero["warnings"])

    def test_signed_returns_reconcile_but_not_positive_price_candidates(self):
        rows = enrich([row(), row("r", quantity="-1", net_sales="-20", gross_sales="-20", gross_margin_amount="-10", total_acquisition_cost="-10")])
        group = profiles(rows)[0]
        self.assertEqual(group["eligible_net_sales"], "0")
        self.assertEqual(group["signed_returns_value"], "-20")
        self.assertEqual(group["reported_cp_positive_original_candidates"], [{"recorded_cp": "20", "records": 1}])

    def test_adjusted_even_independently_verified_quantity_does_not_verify_price(self):
        result = assess_price(row(is_adjusted_source="true", transaction_evidence="independently_verified_detail"))
        self.assertFalse(result["recorded_cp_positive_original_candidate"])
        self.assertIsNone(result["effective_net_unit_price"])
        self.assertIn("IDENTITY_QUANTITY_EVIDENCE_DOES_NOT_VERIFY_PRICE", result["warnings"])

    def test_unknown_unit_preserves_literal_cp_but_blocks_unit_comparison(self):
        result = assess_price(row(identity_status="needs_review", unit_of_measure=None, packaging_unit="", pack_count=""))
        self.assertTrue(result["recorded_cp_positive_original_candidate"])
        self.assertFalse(result["verified_unit_price_comparison_eligible"])
        self.assertIsNone(result["effective_net_unit_price"])

    def test_low_trust_and_backfill_retain_reported_cp_but_cannot_compare(self):
        for changes in ({"calendar_year": "2017"}, {"calendar_year": "2021", "is_low_trust_2017": "true"},
                        {"calendar_year": "2021", "is_historical_backfill_candidate": "true"},
                        {"discount_amount": None}, {"date_delivered": None}):
            result = assess_price(row(**changes))
            self.assertTrue(result["recorded_cp_positive_original_candidate"])
            self.assertFalse(result["verified_unit_price_comparison_eligible"])
            self.assertIsNone(result["effective_net_unit_price"])

    def test_mismatch_flags_without_replacing_values_and_matches_silver_tolerance(self):
        source = row(gross_sales="19.97", net_sales="19.97")
        result = assess_price(source)
        self.assertIn("REVIEW_QTY_CP_GROSS_MISMATCH", result["warnings"])
        self.assertFalse(result["recorded_cp_positive_original_candidate"])
        self.assertEqual(source["gross_sales"], "19.97")
        self.assertNotIn("REVIEW_QTY_CP_GROSS_MISMATCH", assess_price(row(gross_sales="19.98", net_sales="19.98"))["warnings"])

    def test_nonfinite_or_repeated_identity_fails_closed(self):
        with self.assertRaises(ValueError):
            decimal("NaN")
        with self.assertRaises(ValueError):
            enrich([row(), row()])
        with self.assertRaises(ValueError):
            enrich([row(source_record_id=None)])

    def test_warehouse_exact_finance_and_missing_period_must_reconcile(self):
        source = [row(), row("b", calendar_year="2026", month_start="2026-01-01", net_sales=None, is_net_sales_eligible="false")]
        warehouse = [{"calendar_year": year, "month_start": month, "records": "1", "net_sales": net,
                      "gross_sales": "20", "gross_margin_amount": "10", "total_acquisition_cost": "10"}
                     for year, month, net in (("2025", "2025-01-01", "20"), ("2026", "2026-01-01", None))]
        self.assertEqual(reconcile_warehouse(source, warehouse), financial_partition(source))
        with self.assertRaises(ValueError):
            reconcile_warehouse(source, warehouse[:1])
        warehouse[0]["net_sales"] = "20.01"
        with self.assertRaises(ValueError):
            reconcile_warehouse(source, warehouse)


if __name__ == "__main__":
    unittest.main()
