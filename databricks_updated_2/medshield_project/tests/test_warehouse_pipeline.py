"""Offline contract tests for the staged upload pipeline and month-replacement release logic.

Expected values are hand-computed from the fixtures below (not from the code under test).
No Spark or Databricks is contacted; this does not prove a deployed Job.
"""
import copy
import sys
import unittest
from collections import Counter
from datetime import date
from decimal import Decimal
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT))
import controlled_sales_intake as intake  # noqa: E402
import warehouse_pipeline as wp  # noqa: E402

AS_OF = date(2026, 11, 30)
ID, SHA = "a" * 64, "b" * 64
CATEGORIES = {"PARACETAMOL 500MG": "medicine"}
HEADER = "AREA,DR NUMBER,DATE DELIVERED,PRODUCT,QTY,CP,TOTAL CP,DISC,NET CP,TP/UNIT,TOTAL TP,NET INCOME"
CLIENT = "\r\n".join([
    HEADER,
    "BICOL,DR-1001,2026-10-05,PARACETAMOL 500MG,10,5.00,50.00,0,50.00,3.00,30.00,20.00",      # net 50
    "BICOL,DR-1002,2026-10-06,PARACETAMOL 500MG,-2,5.00,-10.00,0,-10.00,3.00,-6.00,-4.00",   # signed return, net -10
    "LAGUNA,DR-1003,2026-10-07,AMOXICILLIN 500MG,0,5.00,0.00,0,0.00,3.00,0.00,0.00",         # observed zero
    "LAGUNA,DR-1004,2026-10-08,AMOXICILLIN 500MG,1,5.00,5.00,,,3.00,3.00,",                  # net unknown
    "LAGUNA,DR-1005,2026-12-15,AMOXICILLIN 500MG,1,5.00,5.00,0,5.00,3.00,3.00,2.00",         # after as_of
    "",
]).encode("utf-8")


def template(*records):
    return ("\n".join([",".join(intake.COLUMNS)] + list(records)) + "\n").encode("utf-8")


def run_stages(data, categories=CATEGORIES):
    fmt, bronze = wp.bronze_rows(data, ID, SHA, AS_OF)
    silver = wp.silver_rows(fmt, bronze, data, AS_OF)
    return fmt, bronze, silver, wp.build_gold(silver, categories, ID, SHA)


def fact(line, month, net, category="approved"):
    return dict(sales_line_id=line, calendar_month=month, net_sales=net, category_status=category)


class ClientExportTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.fmt, cls.bronze, cls.silver, cls.gold = run_stages(CLIENT)

    def test_layout_detected_and_every_physical_line_kept(self):
        self.assertEqual("client_export", self.fmt)
        self.assertEqual(7, len(self.bronze))  # header + 5 records + trailing blank line
        self.assertEqual(7, len(self.silver))

    def test_counts_reconcile_and_reasons_are_explicit(self):
        counts = wp.silver_counts(self.silver)
        self.assertEqual({"received": 7, "accepted": 3, "rejected": 2, "non_transaction": 2}, counts)
        reasons = {r["dr_number"]: r["issues"] for r in self.silver if r["quality_status"] == "REJECTED"}
        self.assertIn("MISSING_NET_SALES", reasons["DR-1004"])
        self.assertIn("FUTURE_DELIVERY_DATE", reasons["DR-1005"])

    def test_signed_return_and_observed_zero_are_preserved_not_dropped(self):
        nets = {r["dr_number"]: r["net_sales"] for r in self.silver if r["quality_status"] == "ACCEPTED"}
        self.assertEqual({"DR-1001": "50.000000", "DR-1002": "-10.000000", "DR-1003": "0.000000"}, nets)

    def test_missing_net_is_unknown_not_zero(self):
        row = next(r for r in self.silver if r["dr_number"] == "DR-1004")
        self.assertIsNone(row["net_sales"])

    def test_gold_totals_marts_and_unclassified_flag(self):
        self.assertEqual(Decimal("40.00"), self.gold["net_sales_total"])  # 50 - 10 + 0
        mart = {(m["calendar_month"], m["product_category"]): (m["record_count"], m["net_sales"]) for m in self.gold["mart_monthly"]}
        medicine = next(m for m in self.gold["mart_monthly"] if m["product_category"] == "medicine")
        self.assertEqual((2, "40.000000", "16.000000"), (medicine["margin_record_count"], medicine["margin_net_sales"], medicine["gross_margin"]))  # 20 - 4
        self.assertEqual({("2026-10", "medicine"): (2, "40.000000"), ("2026-10", "unclassified"): (1, "0.000000")}, mart)
        flagged = [f for f in self.gold["fact"] if f["category_status"] == "review_required"]
        self.assertEqual(["DR-1003"], [f["dr_number"] for f in flagged])
        self.assertTrue(all(f["candidate_only"] and not f["financial_release_approved"] and not f["forecast_eligible"] for f in self.gold["fact"]))

    def test_report_matches_gateway_contract_shape(self):
        result = wp.report_result(self.silver, self.gold)
        self.assertEqual("NEEDS_REVIEW", result["status"])
        self.assertEqual("40.00", result["net_sales_candidate"])
        self.assertEqual(1, result["counts"]["category_review"])
        report, artifacts = intake.report_artifacts(result, ID, SHA)
        self.assertTrue(report["candidate_only"] and not report["published"])
        self.assertIn("report.json", artifacts)

    def test_stages_are_deterministic_for_identical_bytes(self):
        again = run_stages(CLIENT)
        self.assertEqual(self.bronze, again[1])
        self.assertEqual(self.gold["fact"], again[3]["fact"])

    def test_held_summary_counts_unknown_net_without_adding_zero(self):
        held = wp.held_summary(self.silver)
        self.assertEqual(2, held["records"])
        self.assertEqual({"records": 1, "known_net_sales": "0.000000", "unknown_net_records": 1}, held["by_reason"]["MISSING_NET_SALES"])
        self.assertEqual({"records": 1, "known_net_sales": "5.000000", "unknown_net_records": 0}, held["by_reason"]["FUTURE_DELIVERY_DATE"])

    def test_non_cent_net_sales_rejected_rather_than_rounded(self):
        data = (HEADER + "\nBICOL,DR-9,2026-10-05,PARACETAMOL 500MG,1,10.005,10.005,0,10.005,3.00,3.00,7.005\n").encode()
        _, _, silver, _ = run_stages(data)
        self.assertIn("NET_SALES_NOT_CENT_PRECISION", next(r for r in silver if r["dr_number"] == "DR-9")["issues"])

    def test_contract_parent_label_is_held_for_financial_scope_review(self):
        data = (HEADER + "\nBICOL,DR-7,2026-10-05,PPDC #12 SUPPLIES,1,10.00,10.00,0,10.00,3.00,3.00,7.00\n").encode()
        _, _, silver, _ = run_stages(data)
        self.assertIn(wp.CONTRACT_REVIEW, next(r for r in silver if r["dr_number"] == "DR-7")["issues"])

    def test_exact_repeat_rows_are_held_for_review_not_collapsed(self):
        line = "BICOL,DR-5,2026-10-05,PARACETAMOL 500MG,1,10.00,10.00,0,10.00,3.00,3.00,7.00"
        _, _, silver, gold = run_stages((HEADER + "\n" + line + "\n" + line + "\n").encode())
        self.assertEqual(2, sum(r["quality_status"] == "REJECTED" for r in silver))
        self.assertEqual([], gold["fact"])


class SourceYearTests(unittest.TestCase):
    LINE = "BICOL,DR-{0},{1},PARACETAMOL 500MG,1,10.00,10.00,0,10.00,3.00,3.00,7.00"

    def file(self, *dates):
        return (HEADER + "\n" + "\n".join(self.LINE.format(i, d) for i, d in enumerate(dates, 1)) + "\n").encode()

    def statuses(self, data, as_of=AS_OF):
        fmt, bronze = wp.bronze_rows(data, ID, SHA, as_of)
        return {r["dr_number"]: r for r in wp.silver_rows(fmt, bronze, data, as_of) if r["dr_number"]}

    def test_older_file_is_accepted_not_rejected_as_before_scope(self):
        rows = self.statuses(self.file("2021-03-01", "2021-03-02"))
        self.assertEqual({"ACCEPTED"}, {r["quality_status"] for r in rows.values()})

    def test_december_file_processed_in_january_is_accepted(self):
        rows = self.statuses(self.file("2026-12-01", "2026-12-20"), date(2027, 1, 5))
        self.assertEqual({"ACCEPTED"}, {r["quality_status"] for r in rows.values()})

    def test_stray_earlier_row_is_held_and_does_not_widen_scope(self):
        rows = self.statuses(self.file("2026-02-01", "2026-02-02", "2026-02-03", "2025-11-30"))
        self.assertEqual("ACCEPTED", rows["DR-1"]["quality_status"])
        self.assertEqual(("REJECTED", ["REVIEW_DELIVERY_DATE_BEFORE_SCOPE"]), (rows["DR-4"]["quality_status"], rows["DR-4"]["issues"]))

    def test_stray_later_row_is_held(self):
        rows = self.statuses(self.file("2025-02-01", "2025-02-02", "2025-02-03", "2026-01-15"))
        self.assertEqual("ACCEPTED", rows["DR-1"]["quality_status"])
        self.assertEqual("REVIEW_FUTURE_DATED_SOURCE", rows["DR-4"]["disposition"])

    def test_year_tie_takes_the_later_year(self):
        assessed = [{"calendar_year": 2025}, {"calendar_year": 2026}, {"calendar_year": None}]
        self.assertEqual(2026, wp.source_year(assessed, AS_OF))

    def test_year_after_the_run_date_cannot_set_the_scope(self):
        assessed = [{"calendar_year": 2030}, {"calendar_year": 2030}, {"calendar_year": 2026}]
        self.assertEqual(2026, wp.source_year(assessed, AS_OF))


class RealFileReplayTests(unittest.TestCase):
    """Real CSVs against eligible totals read from pinned Gold Delta 0 on 7 November 2026, grouped by delivery year."""
    GOLD = {2020: (3968, "53079522.63"), 2021: (3401, "77860206.26"), 2022: (3970, "63234990.04"), 2023: (4665, "62228966.85"),
            2024: (2707, "28468701.72"), 2025: (3787, "88570398.25"), 2026: (3322, "140199402.67")}
    STRAY_2025_IN_2026_FILE = (16, Decimal("220236.00"))

    @classmethod
    def setUpClass(cls):
        master = PROJECT.parent / "category_releases/category_b160d6aad4376d64/accepted_product_master.csv"
        cls.categories = intake.load_categories(master.read_bytes())
        cls.results = {}
        for year in cls.GOLD:
            data = (PROJECT.parent / f"medshield_project_csv/medshield_data_{year}.csv").read_bytes()
            fmt, bronze = wp.bronze_rows(data, ID, SHA, AS_OF)
            silver = wp.silver_rows(fmt, bronze, data, AS_OF)
            cls.results[year] = (silver, wp.build_gold(silver, cls.categories, ID, SHA))

    def test_each_file_reproduces_gold_after_the_known_stray_rows(self):
        for year, (records, net) in self.GOLD.items():
            with self.subTest(year=year):
                count, total = wp.silver_counts(self.results[year][0])["accepted"], self.results[year][1]["net_sales_total"]
                if year == 2025:  # these 16 rows are delivered in 2025 but held in the 2026 file
                    records, net = records - self.STRAY_2025_IN_2026_FILE[0], Decimal(net) - self.STRAY_2025_IN_2026_FILE[1]
                self.assertEqual((records, Decimal(net)), (count, total))

    MARGIN = {2020: (3391, "38653883.09", "27175018.68"), 2021: (3386, "77804247.26", "50420770.93"), 2022: (3838, "60493221.21", "40799049.06"),
              2023: (4526, "59822843.64", "33585582.48"), 2024: (2690, "28168260.40", "15938200.10"), 2026: (3071, "126694733.74", "63478877.11")}

    def test_margin_population_reproduces_gold_by_year(self):
        for year, (rows, net, margin) in self.MARGIN.items():
            with self.subTest(year=year):
                months = self.results[year][1]["mart_monthly"]
                self.assertEqual((rows, Decimal(net), Decimal(margin)), (sum(m["margin_record_count"] for m in months), sum(Decimal(m["margin_net_sales"]) for m in months), sum(Decimal(m["gross_margin"]) for m in months)))

    def test_area_mart_reconciles_to_fact_on_every_file(self):
        for year, (_, gold) in self.results.items():
            with self.subTest(year=year):
                self.assertEqual(gold["net_sales_total"], sum(Decimal(m["net_sales"]) for m in gold["mart_area_monthly"]))

    def test_stray_rows_stay_held_and_are_itemized(self):
        held = wp.held_summary(self.results[2026][0])["by_reason"]["REVIEW_DELIVERY_DATE_BEFORE_SCOPE"]
        self.assertEqual((16, 0), (held["records"], held["unknown_net_records"]))
        self.assertEqual(self.STRAY_2025_IN_2026_FILE[1], Decimal(held["known_net_sales"]))

    def test_every_real_file_can_now_reach_a_plan(self):
        for year, (silver, gold) in self.results.items():
            with self.subTest(year=year):
                months = sorted({f["calendar_month"] for f in gold["fact"]})
                rows, controls = wp.replace_months([], gold["fact"], months[0], months[-1], ID, SHA, wp.held_summary(silver))
                self.assertEqual(len(gold["fact"]), len(rows))
                self.assertIn("HELD_ROWS", {w["code"] for w in controls["warnings"]})
                with self.assertRaisesRegex(wp.PipelineError, "acknowledgement"):
                    wp.assert_approved_plan(controls["plan_sha256"], controls)

    def test_no_real_label_is_unmapped_and_unclassified_stays_flagged(self):
        flagged = 0
        for silver, gold in self.results.values():
            result = wp.report_result(silver, gold)
            self.assertEqual(0, result["counts"]["category_unmapped"])
            flagged += result["counts"]["category_review"]
        self.assertEqual(2384, flagged)


class WarehouseModelTests(unittest.TestCase):
    REGIONS = wp.load_regions((PROJECT / "references/regional_delivery_mapping_4c5f44013464395e.json").read_bytes())

    def gold(self, *records):
        data = template(*records)
        fmt, bronze = wp.bronze_rows(data, ID, SHA, AS_OF)
        return wp.build_gold(wp.silver_rows(fmt, bronze, data, AS_OF), {"MEDICINE": "medicine"}, ID, SHA, self.REGIONS)

    def test_confirmed_mapping_is_pinned_and_tampering_fails(self):
        self.assertEqual(9, len(self.REGIONS))
        with self.assertRaisesRegex(wp.PipelineError, "hash mismatch"):
            wp.load_regions(b"{}")

    def test_territory_ids_match_the_external_signal_keys(self):
        ids = {v["territory_id"] for v in self.REGIONS.values()}
        self.assertLessEqual({"PH-PROVINCE-BATANGAS", "PH-PROVINCE-QUEZON", "PH-PROVINCE-CAMARINES-NORTE", "PH-PROVINCE-CAMARINES-SUR", "PH-PROVINCE-MARINDUQUE", "PH-PROVINCE-LAGUNA", "PH-PROVINCE-CAVITE"}, ids)
        self.assertEqual(self.REGIONS["CAVITE"]["territory_id"], self.REGIONS["LOWER CAVITE"]["territory_id"])

    def test_unconfirmed_areas_stay_unallocated_without_inference(self):
        areas = {a["area"]: a for a in self.gold("r1,2026-10-01,D1,Medicine,Batangas,1,10.00,2.00", "r2,2026-10-01,D2,Medicine,Government,1,10.00,2.00",
                                                 "r3,2026-10-01,D3,Medicine,Bicol,1,10.00,2.00")["dim_area"]}
        self.assertEqual(("confirmed_delivery_area", "PH-PROVINCE-BATANGAS", "CALABARZON"), (areas["BATANGAS"]["delivery_status"], areas["BATANGAS"]["territory_id"], areas["BATANGAS"]["region"]))
        for label in ("GOVERNMENT", "BICOL"):  # BICOL names a region but is not a confirmed label
            self.assertEqual(("unallocated", None, None), (areas[label]["delivery_status"], areas[label]["territory_id"], areas[label]["province"]))
        self.assertFalse(any(a["is_external_join_ready"] for a in areas.values()))

    def test_calendar_is_complete_and_a_month_without_sales_is_visible(self):
        days = self.gold("r1,2026-01-15,D1,Medicine,Bicol,1,10.00,2.00", "r2,2026-03-02,D2,Medicine,Bicol,1,10.00,2.00")["dim_date"]
        self.assertEqual(31 + 28 + 31, len(days))
        self.assertEqual(("2026-01-01", "2026-03-31"), (days[0]["date"], days[-1]["date"]))
        self.assertEqual(2, sum(d["has_sales"] for d in days))
        self.assertFalse(any(d["has_sales"] for d in days if d["calendar_month"] == "2026-02"))

    def test_margin_uses_one_population_and_blank_stays_unknown(self):
        gold = self.gold("r1,2026-10-01,D1,Medicine,Batangas,1,100.00,40.00", "r2,2026-10-02,D2,Medicine,Batangas,1,60.00,")
        cell = gold["mart_area_monthly"][0]
        self.assertEqual((2, "160.000000", 1, "100.000000", "40.000000"), (cell["record_count"], cell["net_sales"], cell["margin_record_count"], cell["margin_net_sales"], cell["gross_margin"]))
        self.assertEqual("PH-PROVINCE-BATANGAS", cell["territory_id"])

    def test_empty_candidate_builds_no_calendar(self):
        self.assertEqual([], wp.derive_dimensions([])["dim_date"])


def gold_row(record, net="100.00", cost="60.00", margin="40.00", eligible=True, category="medicine", area="BATANGAS", dr="DR-1", day=date(2026, 10, 1), margin_ok=True):
    money = lambda value: None if value is None else Decimal(value)
    return dict(source_record_id=record, dataset_id=wp.SEED_DATASET_ID, record_kind="itemized_sale", date_delivered=day, area=area, dr_number=dr, normalized_product="MEDICINE",
                product_key="k" * 64, product_category=category, recorded_quantity=Decimal("2"), gross_sales=money(net), discount_amount=Decimal(0), net_sales=money(net),
                acquisition_cost=money(cost), gross_margin_amount=money(margin), is_net_sales_technically_eligible=eligible, is_gross_margin_technically_eligible=margin_ok)


class SeedTests(unittest.TestCase):
    EXPECTED = {"records": 3, "eligible_records": 2, "eligible_net": Decimal("150.00"), "margin_records": 1, "margin_net": Decimal("100.00"), "gross_margin": Decimal("40.00")}
    ROWS = [gold_row("s1"), gold_row("s2", net="50.00", cost=None, margin=None, category="unclassified", margin_ok=False),
            gold_row("s3", net=None, cost="9.00", margin="-9.00", eligible=False, margin_ok=False)]

    def test_eligible_rows_become_facts_and_the_rest_are_held(self):
        facts, held = wp.seed_facts(self.ROWS, expected=self.EXPECTED)
        self.assertEqual(["s1", "s2"], [f["source_record_id"] for f in facts])
        self.assertEqual({"records": 1, "by_reason": {"MISSING_NET_SALES": {"records": 1, "known_net_sales": "0.000000", "unknown_net_records": 1}}}, held)
        self.assertEqual(["approved", "approved_unclassified"], [f["category_status"] for f in facts])
        self.assertEqual([True, False], [f["is_margin_eligible"] for f in facts])

    def test_any_control_difference_stops_the_seed(self):
        with self.assertRaisesRegex(wp.PipelineError, "pinned baseline"):
            wp.seed_facts(self.ROWS, expected={**self.EXPECTED, "eligible_net": Decimal("150.01")})
        with self.assertRaisesRegex(wp.PipelineError, "pinned baseline"):
            wp.seed_facts(self.ROWS[:2], expected=self.EXPECTED)

    def test_other_datasets_and_contract_rows_are_refused(self):
        with self.assertRaisesRegex(wp.PipelineError, "pinned itemized"):
            wp.seed_facts([{**self.ROWS[0], "record_kind": "contract_summary"}], expected=self.EXPECTED)
        with self.assertRaisesRegex(wp.PipelineError, "pinned itemized"):
            wp.seed_facts([{**self.ROWS[0], "dataset_id": "x"}], expected=self.EXPECTED)

    def test_seeded_and_uploaded_copies_of_a_line_share_a_key(self):
        data = template("r1,2026-10-01,DR-1,Medicine,Batangas,2,100.00,40.00")
        fmt, bronze = wp.bronze_rows(data, ID, SHA, AS_OF)
        uploaded = wp.silver_rows(fmt, bronze, data, AS_OF)[0]
        line = {name: uploaded[name] for name in ("delivery_date", "area", "dr_number", "product", *wp.MEASURES)}
        one, two = wp.line_key(Counter(), line), wp.line_key(Counter(), dict(line))
        self.assertEqual(one, two)
        seen = Counter()
        self.assertNotEqual(wp.line_key(seen, line), wp.line_key(seen, line))  # a repeat in one load stays distinct

    def test_seed_replaces_synthetic_rows_only(self):
        facts, held = wp.seed_facts(self.ROWS, expected=self.EXPECTED)
        synthetic = [{"sales_line_id": "t", "calendar_month": "2030-01", "net_sales": "5.000000", "dr_number": "DR-SYNTH-1"}]
        rows, controls = wp.seed_replacement(synthetic, facts, held)
        self.assertEqual(2, len(rows))
        self.assertNotIn("t", {r["sales_line_id"] for r in rows})
        self.assertEqual(["HELD_ROWS", "UNCLASSIFIED_ROWS", "SYNTHETIC_ROWS_REMOVED"], [w["code"] for w in controls["warnings"]])
        with self.assertRaisesRegex(wp.PipelineError, "real rows"):
            wp.seed_replacement(synthetic + [{"sales_line_id": "r", "calendar_month": "2026-01", "net_sales": "1.000000", "dr_number": "DR-1"}], facts, held)


def sale(month, net, area="BATANGAS", category="medicine"):
    return dict(calendar_month=month, net_sales=net, area=area, product_category=category, is_margin_eligible=False, gross_margin_amount=None)


class DerivedMartTests(unittest.TestCase):
    FACTS = [sale("2024-01", "100.00"), sale("2024-02", "50.00"), sale("2025-01", "150.00"), sale("2025-03", "40.00", area="GOVERNMENT")]
    REGIONS = {"BATANGAS": {"territory_id": "PH-PROVINCE-BATANGAS"}}

    def test_yoy_compares_only_months_present_in_both_years(self):
        (row,) = wp.mart_yoy(self.FACTS)  # 2025 has Jan and Mar; 2024 has Jan and Feb; only January is shared
        self.assertEqual((2025, 1, "01", "150.000000", "100.000000", "50.00"), (row["year"], row["compared_months"], row["months_list"], row["net_sales"], row["previous_net_sales"], row["change_pct"]))

    def test_yoy_with_zero_base_has_no_percentage(self):
        (row,) = wp.mart_yoy([sale("2024-01", "0.00"), sale("2025-01", "10.00")])
        self.assertIsNone(row["change_pct"])

    def test_seasonal_averages_only_observed_years(self):
        january = wp.mart_seasonal(self.FACTS)[0]
        self.assertEqual((1, 2, "125.000000"), (january["month_of_year"], january["years_observed"], january["average_net_sales"]))
        self.assertEqual([1, 2, 3], [r["month_of_year"] for r in wp.mart_seasonal(self.FACTS)])  # no row is invented for empty months

    def test_yearly_counts_months_with_sales(self):
        rows = {(r["year"], r["product_category"]): r for r in wp.mart_yearly(self.FACTS)}
        self.assertEqual((2, "150.000000"), (rows[(2024, "medicine")]["months_with_sales"], rows[(2024, "medicine")]["net_sales"]))

    def test_territory_mart_excludes_unallocated_and_reconciles(self):
        rows = wp.mart_territory_monthly(self.FACTS, self.REGIONS)
        self.assertEqual(3, len(rows))
        self.assertEqual(Decimal("300.00"), sum(Decimal(r["net_sales"]) for r in rows))  # the 40.00 GOVERNMENT row is not located

    def test_signals_keep_join_flags_and_refuse_duplicates(self):
        row = dict(territory_id="PH-PROVINCE-BATANGAS", period="2024-01", signal_family="DISEASE", signal="Dengue", signal_value=Decimal("12"), unit="cases", source="DOH",
                   station_name=None, observation_status="OBSERVED", mapping_status="pending", is_external_join_ready=False)
        (snap,) = wp.signal_snapshot([row, dict(row, territory_id=None)])
        self.assertEqual(("2024-01", False, "12.000000"), (snap["calendar_month"], snap["is_external_join_ready"], snap["signal_value"]))
        with self.assertRaisesRegex(wp.PipelineError, "Duplicate external signal"):
            wp.signal_snapshot([row, row])

    def test_derived_marts_reconcile(self):
        marts = wp.derived_marts(self.FACTS, self.REGIONS, [])
        self.assertEqual(Decimal("340.00"), sum(Decimal(r["net_sales"]) for r in marts["mart_yearly"]))


class SignalIndexTests(unittest.TestCase):
    POP = {("PH-PROVINCE-BATANGAS", 2024): (Decimal("2994795"), "census_count")}
    REGIONS = wp.load_regions((PROJECT / "references/regional_delivery_mapping_4c5f44013464395e.json").read_bytes())

    def raw(self, **fields):
        base = dict(territory_id="PH-PROVINCE-BATANGAS", period="2024-07", signal_family="DISEASE", signal="Dengue", signal_value=Decimal("359"), unit="cases",
                    source="DOH", station_name=None, observation_status="OBSERVED", mapping_status="pending", is_external_join_ready=False)
        base.update(fields)
        return base

    def test_population_reference_is_pinned_and_covers_all_territories(self):
        population = wp.load_population((PROJECT / "references/territory_population_2017_2026.csv").read_bytes())
        self.assertEqual(80, len(population))  # 8 territories x 2017-2026
        self.assertEqual((Decimal("2994795"), "census_count"), population[("PH-PROVINCE-BATANGAS", 2024)])
        with self.assertRaisesRegex(wp.PipelineError, "hash mismatch"):
            wp.load_population(b"x")

    def test_dii_is_cases_per_100k(self):
        (row,) = wp.dii_rows(wp.signal_snapshot([self.raw()]), self.POP)
        self.assertEqual(("11.987465", "DISEASE_INTENSITY", False), (row["signal_value"], row["signal_family"], row["is_external_join_ready"]))  # 359 / 2,994,795 x 100,000
        self.assertEqual([], wp.dii_rows(wp.signal_snapshot([self.raw(period="2030-01")]), self.POP))  # no population, no invented value

    def test_only_approved_stations_become_join_ready(self):
        rows = wp.apply_station_decision(wp.signal_snapshot([self.raw(signal_family="WEATHER", signal="RAINFALL_TOTAL_MM", source="PAGASA", station_name="Ambulong", signal_value=Decimal("120")),
                                                             self.raw(territory_id="PH-PROVINCE-QUEZON", signal_family="WEATHER", signal="RAINFALL_TOTAL_MM", source="PAGASA", station_name="Alabat", signal_value=Decimal("90")),
                                                             self.raw()]))
        self.assertEqual([("Ambulong", True), (None, False)], [(r["station_name"], r["is_external_join_ready"]) for r in rows])

    def test_rsi_maps_named_territories_and_skips_unmapped(self):
        rows = wp.rsi_rows([dict(territory="Batangas", period_start="2024-03-01", rainfall_severity_proxy=Decimal("0.4412")),
                            dict(territory="Metro Manila", period_start="2024-03-01", rainfall_severity_proxy=Decimal("0.5"))], self.REGIONS)
        self.assertEqual([("PH-PROVINCE-BATANGAS", "2024-03", "0.441200", True)], [(r["territory_id"], r["calendar_month"], r["signal_value"], r["is_external_join_ready"]) for r in rows])


class CategoryParityTests(unittest.TestCase):
    ROW = template("r1,2026-10-01,DR-1,Mystery,Bicol,1,10.00,2.00")

    def test_same_row_needs_review_in_both_code_paths(self):
        categories = {"MYSTERY": "unclassified"}
        fmt, bronze = wp.bronze_rows(self.ROW, ID, SHA, AS_OF)
        silver = wp.silver_rows(fmt, bronze, self.ROW, AS_OF)
        gold = wp.build_gold(silver, categories, ID, SHA)
        new, old = wp.report_result(silver, gold), intake.assess(self.ROW, categories)
        self.assertEqual((old["status"], old["counts"]["category_review"]), (new["status"], new["counts"]["category_review"]))
        self.assertEqual("approved_unclassified", gold["fact"][0]["category_status"])
        self.assertEqual(0, new["counts"]["category_unmapped"])

    def test_unmapped_blocks_but_recorded_unclassified_warns(self):
        row = fact("n1", "2026-10", "10.000000", "approved_unclassified")
        _, controls = wp.replace_months([], [row], "2026-10", "2026-10", ID, SHA)
        self.assertEqual([{"code": "UNCLASSIFIED_ROWS", "records": 1, "net_sales": "10.000000"}], controls["warnings"])
        with self.assertRaisesRegex(wp.PipelineError, "Category review"):
            wp.replace_months([], [fact("n1", "2026-10", "10.000000", "review_required")], "2026-10", "2026-10", ID, SHA)


class TemplateTests(unittest.TestCase):
    ROWS = ("r1,2026-10-01,DR-1,Medicine,Bicol,2,100.00,20.00", "r2,2026-10-01,DR-1,Medicine,Bicol,2,100.00,20.00",
            "r3,2026-10-02,DR-2,Medicine,Bicol,-1,-30.00,", "r4,2026-10-03,DR-3,Medicine,Bicol,0,0.00,0.00")

    def test_repeated_transactions_stay_distinct_and_blank_profit_stays_unknown(self):
        fmt, bronze, silver, gold = run_stages(template(*self.ROWS), {"MEDICINE": "medicine"})
        self.assertEqual("template", fmt)
        self.assertEqual(5, len(bronze))  # header evidence + four records
        self.assertEqual(4, len(silver))
        self.assertEqual(4, len(gold["fact"]))
        self.assertEqual(4, len({f["sales_line_id"] for f in gold["fact"]}))
        self.assertEqual(Decimal("170.00"), gold["net_sales_total"])  # 100 + 100 - 30 + 0
        returned = next(f for f in gold["fact"] if f["dr_number"] == "DR-2")
        self.assertEqual("-30.000000", returned["net_sales"])
        self.assertIsNone(returned["gross_margin_amount"])

    def test_line_key_ignores_file_local_reference_and_row_order(self):
        a = run_stages(template(*self.ROWS), {"MEDICINE": "medicine"})[3]["fact"]
        shuffled = template("x9,2026-10-03,DR-3,Medicine,Bicol,0,0.00,0.00", "x8,2026-10-02,DR-2,Medicine,Bicol,-1,-30.00,",
                            "x7,2026-10-01,DR-1,Medicine,Bicol,2,100.00,20.00", "x6,2026-10-01,DR-1,Medicine,Bicol,2,100.00,20.00")
        b = run_stages(shuffled, {"MEDICINE": "medicine"})[3]["fact"]
        self.assertEqual({f["sales_line_id"] for f in a}, {f["sales_line_id"] for f in b})

    def test_duplicate_file_references_are_rejected(self):
        _, _, silver, _ = run_stages(template(self.ROWS[0], self.ROWS[0]))
        self.assertEqual(2, sum(r["quality_status"] == "REJECTED" for r in silver))

    def test_malformed_csv_and_bad_encoding_fail_before_any_row(self):
        with self.assertRaises(wp.PipelineError):
            wp.bronze_rows(b'a,"b\n', ID, SHA, AS_OF)
        with self.assertRaises(wp.PipelineError):
            wp.bronze_rows(b"\xff\xfe\x00", ID, SHA, AS_OF)
        with self.assertRaises(wp.PipelineError):
            wp.bronze_rows(b"", ID, SHA, AS_OF)


class ReplaceMonthsTests(unittest.TestCase):
    BASE = [fact("s1", "2026-09", "100.000000"), fact("s2", "2026-09", "50.000000"), fact("o1", "2026-10", "70.000000")]
    CANDIDATE = [fact("n1", "2026-10", "30.000000"), fact("n2", "2026-10", "20.000000")]

    def replace(self, base=None, candidate=None, first="2026-10", last="2026-10"):
        return wp.replace_months(self.BASE if base is None else base, self.CANDIDATE if candidate is None else candidate, first, last, ID, SHA)

    def test_hand_computed_replacement_keeps_other_months_untouched(self):
        rows, c = self.replace()
        self.assertEqual({"records": 3, "net_sales": "220.000000"}, c["before"])
        self.assertEqual({"records": 1, "net_sales": "70.000000"}, c["removed"])
        self.assertEqual({"records": 2, "net_sales": "50.000000"}, c["added"])
        self.assertEqual({"records": 4, "net_sales": "200.000000"}, c["after"])  # 150 kept + 50 added
        self.assertEqual({"s1", "s2", "n1", "n2"}, {r["sales_line_id"] for r in rows})
        sep = next(m for m in c["months"] if m["calendar_month"] == "2026-09")
        self.assertEqual(sep["before"], sep["after"])

    def test_plan_hash_is_deterministic_and_changes_with_content(self):
        self.assertEqual(self.replace()[1]["plan_sha256"], self.replace()[1]["plan_sha256"])
        changed = [fact("n1", "2026-10", "31.000000"), self.CANDIDATE[1]]
        self.assertNotEqual(self.replace()[1]["plan_sha256"], self.replace(candidate=changed)[1]["plan_sha256"])

    def test_first_release_from_empty_base(self):
        rows, c = self.replace(base=[])
        self.assertEqual(2, len(rows))
        self.assertEqual({"records": 0, "net_sales": "0.000000"}, c["before"])  # empty control sum is additive zero

    def test_window_spanning_months_with_no_prior_rows_is_allowed(self):
        _, c = self.replace(first="2026-10", last="2026-11")
        self.assertEqual("2026-11", c["declared_last_month"])

    def test_failure_cases_fail_closed(self):
        with self.assertRaisesRegex(wp.PipelineError, "outside the declared"):
            self.replace(candidate=[fact("n1", "2026-11", "1.000000")])
        with self.assertRaisesRegex(wp.PipelineError, "Empty candidate"):
            self.replace(candidate=[])
        with self.assertRaisesRegex(wp.PipelineError, "Category review"):
            self.replace(candidate=[fact("n1", "2026-10", "1.000000", "review_required")])
        with self.assertRaisesRegex(wp.PipelineError, "key conflict"):
            self.replace(candidate=[fact("s1", "2026-10", "1.000000")])  # collides with a retained September line
        with self.assertRaisesRegex(wp.PipelineError, "follows"):
            self.replace(first="2026-11", last="2026-10")
        with self.assertRaisesRegex(wp.PipelineError, "YYYY-MM"):
            self.replace(first="2026-13")
        with self.assertRaisesRegex(wp.PipelineError, "exceeds"):
            wp.month_window("1900-01", "2100-12")

    def test_declared_month_with_rows_but_none_in_the_file_is_refused(self):
        with self.assertRaisesRegex(wp.PipelineError, "none in this file: 2026-09"):
            self.replace(first="2026-09", last="2026-10")

    def test_month_shrink_warning_threshold(self):
        base = [fact(f"b{i}", "2026-10", "10.000000") for i in range(10)]  # 10 rows, 100.00
        def warned(kept, each="10.000000"):
            _, controls = wp.replace_months(base, [fact(f"n{i}", "2026-10", each) for i in range(kept)], "2026-10", "2026-10", ID, SHA)
            return [w["code"] for w in controls["warnings"]]
        self.assertEqual([], warned(8))  # exactly 20% lower is allowed
        self.assertEqual(["MONTH_SHRINK"], warned(7))
        self.assertEqual(["MONTH_SHRINK"], warned(10, "7.000000"))  # same rows, 30% less net

    def test_held_rows_are_bound_into_the_plan_hash(self):
        held = {"records": 1, "by_reason": {"X": {"records": 1, "known_net_sales": "5.000000", "unknown_net_records": 0}}}
        one = self.replace(base=[])[1]
        two = wp.replace_months([], self.CANDIDATE, "2026-10", "2026-10", ID, SHA, held)[1]
        self.assertNotEqual(one["plan_sha256"], two["plan_sha256"])
        self.assertEqual("HELD_ROWS", two["warnings"][0]["code"])

    def test_warnings_need_explicit_acknowledgement_after_the_hash(self):
        _, controls = self.replace()  # 70.00 replaced by 50.00 is a shrinking month
        with self.assertRaisesRegex(wp.PipelineError, "acknowledgement: MONTH_SHRINK"):
            wp.assert_approved_plan(controls["plan_sha256"], controls)
        wp.assert_approved_plan(controls["plan_sha256"], controls, True)
        with self.assertRaisesRegex(wp.PipelineError, "approved plan"):
            wp.assert_approved_plan("0" * 64, controls, True)  # acknowledging never replaces the hash

    def test_inputs_are_not_mutated(self):
        base, candidate = copy.deepcopy(self.BASE), copy.deepcopy(self.CANDIDATE)
        self.replace(base=base, candidate=candidate)
        self.assertEqual(self.BASE, base)
        self.assertEqual(self.CANDIDATE, candidate)

    def test_unapproved_or_stale_plan_hash_blocks_promotion(self):
        _, controls = self.replace()
        wp.assert_approved_plan(controls["plan_sha256"], controls, True)  # matching approval passes
        for approved in ("", "0" * 64, None, controls["plan_sha256"].upper()):
            with self.assertRaisesRegex(wp.PipelineError, "approved plan"):
                wp.assert_approved_plan(approved, controls)

    def test_release_identity_depends_on_base_ingestion_and_plan(self):
        one = wp.release_identity("base1", ID, "p" * 64)
        self.assertEqual(one, wp.release_identity("base1", ID, "p" * 64))
        self.assertNotEqual(one, wp.release_identity("base2", ID, "p" * 64))
        self.assertNotEqual(one, wp.release_identity("base1", ID, "q" * 64))


class Phase1ExtensionsTests(unittest.TestCase):
    def test_validate_psgc_codes_accepts_valid_and_fails_closed_on_invalid(self):
        regions = {
            "BATANGAS": {"province": "Batangas", "region": "CALABARZON", "province_psgc_code": "0401000000", "territory_id": "PH-PROVINCE-BATANGAS"},
            "QUEZON": {"province": "Quezon", "region": "CALABARZON", "province_psgc_code": "0405600000", "territory_id": "PH-PROVINCE-QUEZON"},
        }
        psgc_ref = [
            {"psgc_code": "0401000000", "name": "Batangas", "geographic_level": "Prov"},
            {"psgc_code": "0405600000", "name": "Quezon", "geographic_level": "Prov"},
        ]
        self.assertEqual({"BATANGAS": "0401000000", "QUEZON": "0405600000"}, wp.validate_psgc_codes(regions, psgc_ref))
        with self.assertRaisesRegex(wp.PipelineError, "Invalid PSGC code"):
            wp.validate_psgc_codes({"BAD": {"province_psgc_code": "ABC"}})
        with self.assertRaisesRegex(wp.PipelineError, "missing from reference"):
            wp.validate_psgc_codes(regions, [{"psgc_code": "0401000000", "geographic_level": "Prov"}])

    def test_build_contract_facts_isolates_contract_parents_without_mutating_itemized(self):
        rows = [
            {"source_record_id": "r1", "quality_status": "REJECTED", "issues": [wp.CONTRACT_REVIEW],
             "delivery_date": "2026-09-15", "area": "GOVERNMENT", "dr_number": "DR-C1", "product": "CONTRACT 2026",
             "quantity": "1.000000", "gross_sales": "500000.000000", "discount_amount": "0.000000",
             "net_sales": "500000.000000", "total_acquisition_cost": "300000.000000", "gross_margin_amount": "200000.000000",
             "is_margin_eligible": True},
            {"source_record_id": "r2", "quality_status": "ACCEPTED", "issues": [],
             "delivery_date": "2026-09-15", "area": "QUEZON", "dr_number": "DR-I1", "product": "BUPIRIGHT",
             "quantity": "10.000000", "gross_sales": "1000.000000", "discount_amount": "0.000000",
             "net_sales": "1000.000000", "total_acquisition_cost": "600.000000", "gross_margin_amount": "400.000000",
             "is_margin_eligible": True},
        ]
        out = wp.build_contract_facts(rows, ID)
        self.assertEqual(1, out["record_count"])
        self.assertEqual(Decimal("500000.000000"), out["net_sales_total"])
        self.assertEqual("contract_parent_unreconciled", out["contract_fact"][0]["financial_scope"])
        self.assertTrue(out["contract_fact"][0]["candidate_only"])


if __name__ == "__main__":
    unittest.main()
