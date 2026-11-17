"""Meaningful calendar and sensitivity boundaries for the authorized SO1 policy."""
import unittest
from datetime import date, timedelta
from decimal import Decimal

from services.analytics_service.jobs.run_so1_policy import (
    build_calendar, calendar_months, classify_day, compare_components, complete_segments,
    fit_daily, stress_values, summarize_year,
)


def calendar_row(day, value, assumed=False):
    return {"day": day, "source_value_php": None if assumed else value,
            "conditional_value_php": value, "assumed_zero": assumed}


class So1PolicyTests(unittest.TestCase):
    def test_partial_year_flags_both_missing_months_and_short_calendar(self):
        rows = [{"revenue_php": Decimal(1)} for _ in range(12)]
        self.assertFalse(summarize_year("COMPANY", 2025, rows)["partial_year"])
        rows[0]["revenue_php"] = None
        self.assertTrue(summarize_year("COMPANY", 2017, rows)["partial_year"])
        self.assertTrue(summarize_year("COMPANY", 2026, rows[3:])["partial_year"])

    def test_empty_date_keeps_original_blank_but_separate_assumed_zero(self):
        self.assertEqual(classify_day([], True), ("assumed_zero_no_recorded_transaction", None, Decimal(0)))

    def test_missing_month_and_ineligible_financial_record_never_zero_filled(self):
        self.assertEqual(classify_day([], False), ("unknown_whole_month", None, None))
        self.assertEqual(classify_day([{"revenue": None}], True), ("unknown_ineligible_revenue", None, None))

    def test_explicit_zero_and_negative_adjustment_keep_observed_identity(self):
        for value in (Decimal(0), Decimal(-60)):
            self.assertEqual(classify_day([{"revenue": value}], True), ("recorded_eligible_revenue", value, value))

    def test_leap_calendar_and_partial_year_end(self):
        rows = build_calendar("QUEZON", {}, {"2024-02": Decimal(50)}, date(2024, 2, 1), date(2024, 3, 31))
        self.assertEqual(len(rows), 60)
        self.assertEqual(sum(row["assumed_zero"] for row in rows), 29)
        self.assertEqual(sum(row["conditional_value_php"] is None for row in rows), 31)
        self.assertEqual(rows[-1]["day"], "2024-03-31")
        self.assertEqual(list(calendar_months(date(2025, 12, 1), date(2026, 2, 28))), ["2025-12", "2026-01", "2026-02"])

    def test_unknown_date_splits_instead_of_compressing_calendar(self):
        rows = [calendar_row((date(2021, 1, 1) + timedelta(days=i)).isoformat(), Decimal(0)) for i in range(90)]
        rows[45]["conditional_value_php"] = None
        segments, skipped = complete_segments(rows, minimum_months=2)
        self.assertEqual(segments, [])
        self.assertEqual(len(skipped), 2)
        rows.pop(45)
        with self.assertRaisesRegex(ValueError, "consecutive"):
            complete_segments(rows, minimum_months=2)

    def test_full_month_trimming_does_not_fit_partial_edges(self):
        rows = [calendar_row((date(2021, 1, 2) + timedelta(days=i)).isoformat(), Decimal(0)) for i in range(90)]
        segments, _ = complete_segments(rows, minimum_months=2)
        self.assertEqual(segments[0][0]["day"], "2021-02-01")
        self.assertEqual(segments[0][-1]["day"], "2021-03-31")

    def test_stress_changes_only_assumed_dates_preserving_signed_observations(self):
        rows = [calendar_row("2021-01-04", Decimal(100)), calendar_row("2021-01-05", Decimal(-5)),
                calendar_row("2021-01-11", Decimal(0), True), calendar_row("2021-01-12", Decimal(0), True),
                calendar_row("2021-01-13", Decimal(0))]
        self.assertEqual(stress_values(rows), [Decimal(100), Decimal(-5), Decimal(10), Decimal(10), Decimal(0)])
        self.assertIsNone(rows[2]["source_value_php"])
        self.assertEqual(rows[2]["conditional_value_php"], Decimal(0))

    def test_unknown_and_short_daily_series_rejected(self):
        with self.assertRaisesRegex(ValueError, "Unknown"):
            stress_values([calendar_row("2021-01-01", None)])
        with self.assertRaisesRegex(ValueError, "three finite annual cycles"):
            fit_daily([calendar_row("2021-01-01", Decimal(0))], [Decimal(0)])

    def test_component_comparison_uses_same_months_and_circular_peak_distance(self):
        rows = [{"period": f"{year}-{month:02d}", "trend": 100.0,
                 "seasonal": 10.0 if month == 12 else 0.0} for year in (2021, 2022, 2023) for month in range(1, 13)]
        other = [{**row, "trend": 120.0, "seasonal": 10.0 if row["period"].endswith("-01") else 0.0} for row in rows]
        result = compare_components(rows, other, scale=100)
        self.assertEqual(result["normalized_trend_mae_pct"], 20)
        self.assertEqual(result["circular_peak_shift_months"], 1)
        self.assertIn("trend_level_sensitive", result["material_flags"])
        self.assertNotIn("seasonal_peak_changes", result["material_flags"])
        with self.assertRaisesRegex(ValueError, "identical"):
            compare_components(rows, other[1:], scale=100)


if __name__ == "__main__":
    unittest.main()
