import unittest
from copy import deepcopy
from datetime import date, datetime, timezone
from unittest.mock import patch

from services.data_pipeline import build_dashboard_snapshot, sales_summary
from services.shared_snapshot import normalize_snapshot
from services.analytics_service.jobs.run_descriptive import aggregate, abc_pareto, yoy_growth


def transaction(revenue, profit, cost, year=2025, quality="valid"):
    return dict(net_cost=revenue, net_income=profit, total_trade_price=cost,
                quantity=2, margin_pct=profit / revenue if revenue else 0,
                year=year, date_delivered=f"{year}-01-01", period=f"{year}-01",
                area="Quezon", product="A", dr_number="DR-1", quality_status=quality)


class MetricDefinitionsTests(unittest.TestCase):
    def test_annual_grouping_uses_delivery_year_not_stale_year_field(self):
        rows=[transaction(100,20,80,2017),transaction(200,40,160,2025),transaction(999,0,999,2047)]
        rows[0]['year']=2025
        snapshot=build_dashboard_snapshot(rows, today=date(2026,10,5))
        self.assertEqual([(r['year'],r['revenue']) for r in snapshot['year_summary']],[('2017',100),('2025',200)])
        self.assertEqual(snapshot['totals']['total_revenue'],300)

    def test_legacy_snapshot_outliers_do_not_enter_actual_series(self):
        result=normalize_snapshot({'monthly':[{'period':p,'revenue':1,'income':1} for p in ['2047-11','2025-12','2000-01','2017-01']],
                                   'year_summary':[{'year':y,'revenue':1,'income':1} for y in ['2000','2017','2025','2047']]}, today=date(2026,10,5))
        self.assertEqual([r['period'] for r in result['monthly']],['2017-01','2025-12'])
        self.assertEqual([r['year'] for r in result['year_summary']],['2017','2025'])

    def test_normalization_supports_later_actual_years_and_rejects_future_periods(self):
        def source():
            return {'monthly': [{'period':p,'revenue':1,'income':1} for p in
                                ['2017-01','2025-12','2026-10','2026-11','2027-01','2047-11','2026-13']],
                    'year_summary': [{'year':y,'revenue':1,'income':1} for y in ['2017','2025','2026','2027','2047']]}
        result=normalize_snapshot(source(), today=date(2026,10,5))
        self.assertEqual([r['period'] for r in result['monthly']],['2017-01','2025-12','2026-10'])
        self.assertEqual([r['year'] for r in result['year_summary']],['2017','2025','2026'])
        result=normalize_snapshot(source(), today=date(2027,1,1))
        self.assertEqual([r['year'] for r in result['year_summary']],['2017','2025','2026','2027'])
        self.assertEqual(result['monthly'][-1]['period'],'2027-01')

    def test_future_series_cannot_leave_undated_aggregates_contaminated(self):
        aggregates = {
            'totals': {'total_revenue': 1000},
            'by_area': [{'area': 'Quezon', 'revenue': 1000}],
            'top_products': [{'product': 'A', 'revenue': 1000}],
            'seasonality': [{'month': 'Nov', 'avg_revenue': 900}],
        }
        for key, aggregate in aggregates.items():
            with self.subTest(aggregate=key):
                source = {'monthly': [{'period': '2026-10', 'revenue': 100},
                                      {'period': '2026-11', 'revenue': 900}], key: aggregate}
                original = deepcopy(source)
                with self.assertRaisesRegex(ValueError, 'rebuild the snapshot from dated historical rows'):
                    normalize_snapshot(source, today=date(2026, 10, 5))
                self.assertEqual(source, original)

    def test_invalid_or_precoverage_periods_cannot_be_trimmed_from_aggregate_evidence(self):
        for series in [
            {'monthly': [{'period': '2026-13', 'revenue': 100}]},
            {'monthly': [{'period': '2016-12', 'revenue': 100}]},
            {'year_summary': [{'year': '2027', 'revenue': 100}]},
            {'year_summary': [{'year': 'invalid', 'revenue': 100}]},
        ]:
            with self.subTest(series=series):
                with self.assertRaisesRegex(ValueError, 'historical population cannot be verified'):
                    normalize_snapshot({**series, 'totals': {'total_revenue': 100}}, today=date(2026, 10, 5))

    def test_consistent_later_actual_snapshot_preserves_every_financial_partition(self):
        today = date(2026, 10, 5)
        snapshot = build_dashboard_snapshot([
            transaction(100, 20, 80, 2025),
            dict(transaction(200, 40, 160, 2026), date_delivered='2026-10-05'),
            dict(transaction(900, 180, 720, 2026), date_delivered='2026-11-01'),
        ], today=today)
        result = normalize_snapshot(snapshot, today=today)
        self.assertEqual([row['period'] for row in result['monthly']], ['2025-01', '2026-10'])
        self.assertEqual([row['year'] for row in result['year_summary']], ['2025', '2026'])
        self.assertEqual(result['totals']['total_revenue'], 300)
        for key in ['monthly', 'year_summary', 'by_area', 'top_products']:
            self.assertEqual(sum(row['revenue'] for row in result[key]), 300)
        self.assertEqual([(row['month'], row['avg_revenue']) for row in result['seasonality']],
                         [('Jan', 100), ('Oct', 200)])

    def test_default_calendar_uses_manila_even_before_utc_date_rollover(self):
        # This instant is October 1 in Manila while still September 30 in UTC.
        instant=datetime(2026,9,30,16,0,tzinfo=timezone.utc)
        def now(zone):
            self.assertEqual(str(zone),'Asia/Manila')
            return instant.astimezone(zone)
        with patch('services.shared_snapshot.datetime') as clock:
            clock.now.side_effect=now
            result=normalize_snapshot({'monthly':[{'period':'2026-10','revenue':1}]})
        self.assertEqual(result['monthly'][0]['period'],'2026-10')
        with patch('services.data_pipeline.datetime') as clock:
            clock.now.side_effect=now
            result=build_dashboard_snapshot([dict(transaction(100,20,80,2026),date_delivered='2026-10-01')])
        self.assertEqual(result['totals']['total_revenue'],100)

    def test_growth_exports_nominal_change_and_uses_prior_calendar_year(self):
        rows = [transaction(500, 100, 400, 2023), transaction(1000, 200, 800, 2024), transaction(1500, 300, 1200, 2025)]
        growth = yoy_growth(rows)
        self.assertEqual(growth[1]["revenue_yoy_change_pesos"], 500)
        self.assertEqual(growth[1]["revenue_yoy_growth"], 1)
        self.assertEqual(growth[2]["revenue_yoy_growth"], .5)
        self.assertEqual(yoy_growth([rows[0], rows[2]])[1]["revenue_yoy_growth"], "")
        self.assertEqual(yoy_growth([rows[0], rows[2]])[1]["revenue_yoy_change_pesos"], "")

    def test_zero_or_negative_baseline_retains_peso_delta_without_growth_rate(self):
        for prior in (0, -100):
            result = yoy_growth([transaction(prior, 0, 0, 2024), transaction(500, 100, 400, 2025)])[1]
            self.assertEqual(result["revenue_yoy_growth"], "")
            self.assertEqual(result["revenue_yoy_change_pesos"], 500 - prior)

    def test_summary_and_chart_source_use_weighted_margin(self):
        rows = [transaction(100, 50, 50), transaction(900, 90, 810),
                transaction(5000, 4000, 1000, quality="rejected")]
        with patch("services.data_pipeline._load_local_sales_payload", return_value={"rows": rows}):
            summary = sales_summary(year="2025")
        self.assertEqual(summary["gross_margin_rate"], .14)
        self.assertEqual(summary["financial_reconciliation"]["mismatched_rows"], 0)
        snapshot = build_dashboard_snapshot(rows)
        self.assertEqual(snapshot["totals"]["avg_margin"], .14)
        self.assertEqual(snapshot["year_summary"][0]["revenue"], 1000)
        self.assertEqual(snapshot["year_summary"][0]["income"], 140)
        self.assertEqual(aggregate(rows[:2], ("year",))[0]["gross_margin_rate"], .14)
        self.assertEqual(abc_pareto(rows[:2], "product", "product")[0]["revenue"], 1000)

    def test_reconciliation_does_not_overwrite_workbook_profit(self):
        rows = [transaction(100, 45, 60), transaction(100, 30, 65, year=2024)]
        with patch("services.data_pipeline._load_local_sales_payload", return_value={"rows": rows}):
            summary = sales_summary(year="2025")
        self.assertEqual(summary["sums"]["net_income"], 45)
        self.assertEqual(summary["financial_reconciliation"],
                         {"delta": 5, "checked_rows": 1, "mismatched_rows": 1})

    def test_summary_repairs_legacy_blank_net_cp_rows(self):
        row = transaction(0, 40, 60, 2019)
        row.update({
            "total_cost": 120,
            "discount": 20,
            "standardization_applied": ["net_cost: blank converted to 0"],
        })
        with patch("services.data_pipeline._load_local_sales_payload", return_value={"rows": [row]}):
            summary = sales_summary(year="2019")

        self.assertEqual(summary["sums"]["net_cost"], 100)
        self.assertEqual(summary["gross_margin_rate"], .4)
        self.assertEqual(summary["financial_reconciliation"]["mismatched_rows"], 0)

    def test_zero_revenue_is_unavailable_and_losses_are_preserved(self):
        for revenue, profit, expected in [(0, 20, None), (100, -20, -.2), (100, 120, 1.2)]:
            rows = [transaction(revenue, profit, 80)]
            self.assertEqual(build_dashboard_snapshot(rows)["totals"]["avg_margin"], expected)
            self.assertEqual(aggregate(rows, ("year",))[0]["gross_margin_rate"], expected)
            normalized = normalize_snapshot({"totals": {
                "total_revenue": revenue, "total_income": profit, "avg_margin": 999}})
            self.assertEqual(normalized["totals"]["avg_margin"], expected)
