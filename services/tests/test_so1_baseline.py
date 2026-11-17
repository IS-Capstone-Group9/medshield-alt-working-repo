"""SO1's financial, calendar and geographic failure boundaries."""
import unittest
from decimal import Decimal

from services.analytics_service.jobs.run_so1_baseline import amount, matched_yoy, nullable_sum, summarize


class So1BaselineTests(unittest.TestCase):
    def source_fixture(self):
        daily, monthly, annual = [], [], []
        for year in range(2021, 2026):
            for label, value in (("QUEZON", "100.00"), ("GOVERNMENT", "300.00")):
                daily.append({"day": f"{year}-01-01", "normalized_area": label, "is_adjusted_source": "false",
                              "records": "1", "eligible_records": "1", "revenue": value})
                monthly.append({"month": f"{year}-01-01", "normalized_area": label,
                                "records": "1", "eligible_records": "1", "revenue": value})
            annual.append({"year": str(year), "records": "2", "eligible_records": "2", "revenue": "400.00"})
        mapping = [{"normalized_area": "QUEZON", "proposed_area_type": "territory",
                    "is_geographic_territory_approved": "true", "area_evidence_status": "LEGACY_APPROVAL_NOT_REVALIDATED"},
                   {"normalized_area": "GOVERNMENT", "proposed_area_type": "customer_type",
                    "is_geographic_territory_approved": "false", "area_evidence_status": "PROPOSED_NOT_OWNER_APPROVED"}]
        return {"schema_version": 1, "source": "databricks", "status": "read_only_so1_evidence_not_objective_acceptance",
                "study_start": "2021-01-01", "study_end": "2025-12-31",
                "queries": {"daily": {"rows": daily}, "monthly_control": {"rows": monthly},
                            "annual_control": {"rows": annual}, "mapping": {"rows": mapping}}}

    def test_unallocated_revenue_missing_months_and_legacy_status_preserved(self):
        result, _ = summarize(self.source_fixture())
        self.assertEqual(result["total_php"], Decimal(2000))
        buckets = {row["status"]: row for row in result["geographic_coverage"]}
        self.assertEqual(buckets["geographically_unallocated_channel_or_business_line"]["revenue"], Decimal(1500))
        self.assertEqual(buckets["legacy_geographic_mapping_not_revalidated"]["revenue"], Decimal(500))
        february = next(row for row in result["monthly"] if row["area"] == "QUEZON" and row["period"] == "2024-02")
        self.assertIsNone(february["revenue"])
        self.assertEqual(february["days_without_eligible_records"], 29)
        self.assertEqual(result["calendar_days"], 1826)
        self.assertEqual(result["monthly_territory_label_stl"]["QUEZON"]["segments"], [])
        self.assertEqual(result["daily_stl_status"], "blocked_unknown_daily_observation_calendar")

    def test_daily_monthly_disagreement_fails(self):
        receipt = self.source_fixture()
        receipt["queries"]["monthly_control"]["rows"][0]["revenue"] = "101.00"
        with self.assertRaisesRegex(ValueError, "daily/monthly"):
            summarize(receipt)

    def test_duplicate_daily_stratum_fails_instead_of_double_counting(self):
        receipt = self.source_fixture()
        receipt["queries"]["daily"]["rows"].append(dict(receipt["queries"]["daily"]["rows"][0]))
        with self.assertRaisesRegex(ValueError, "unique date/area/provenance"):
            summarize(receipt)

    def test_yoy_matches_months_instead_of_unequal_year_totals(self):
        result = matched_yoy({"2021-01": Decimal(100), "2021-02": Decimal(1000),
                              "2022-01": Decimal(150), "2022-02": None}, 2021, 2022)
        self.assertEqual(result["common_months"], [1])
        self.assertEqual(result["change_php"], Decimal(50))
        self.assertEqual(result["growth_pct"], Decimal(50))
        self.assertEqual(result["comparison_status"], "matched_recorded_subset")

    def test_recorded_zero_is_observed_but_zero_growth_denominator_unavailable(self):
        result = matched_yoy({"2021-01": Decimal(0), "2022-01": Decimal(20)}, 2021, 2022)
        self.assertEqual(result["common_months"], [1])
        self.assertEqual(result["change_php"], Decimal(20))
        self.assertIsNone(result["growth_pct"])

    def test_negative_baseline_does_not_invent_growth_rate(self):
        result = matched_yoy({"2021-01": Decimal(-10), "2022-01": Decimal(20)}, 2021, 2022)
        self.assertEqual(result["change_php"], Decimal(30))
        self.assertIsNone(result["growth_pct"])

    def test_no_overlap_stays_unavailable(self):
        result = matched_yoy({"2021-01": Decimal(100), "2022-02": Decimal(150)}, 2021, 2022)
        self.assertIsNone(result["base_php"])
        self.assertIsNone(result["change_php"])
        self.assertEqual(result["comparison_status"], "unavailable")

    def test_unknown_and_zero_do_not_collapse(self):
        self.assertIsNone(nullable_sum([None, None]))
        self.assertEqual(nullable_sum([None, Decimal(0)]), Decimal(0))
        self.assertEqual(nullable_sum([Decimal("0.1"), Decimal("0.2")]), Decimal("0.3"))

    def test_nonfinite_values_rejected(self):
        for value in ("NaN", "Infinity", "-Infinity"):
            with self.assertRaises(ValueError):
                amount(value)

    def test_conflicting_mapping_cannot_multiply_sales(self):
        receipt = {"schema_version": 1, "source": "databricks",
                   "status": "read_only_so1_evidence_not_objective_acceptance",
                   "study_start": "2021-01-01", "study_end": "2025-12-31",
                   "queries": {"mapping": {"rows": [{"normalized_area": "QUEZON"}, {"normalized_area": "QUEZON"}]}}}
        with self.assertRaisesRegex(ValueError, "one-to-one"):
            summarize(receipt)


if __name__ == "__main__":
    unittest.main()
