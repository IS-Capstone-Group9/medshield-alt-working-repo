from __future__ import annotations

import unittest
import tempfile
import json
from datetime import date
from pathlib import Path
from unittest.mock import patch

from services import data_pipeline
from services.data_pipeline import (
    SourceRow,
    _alert_level,
    _normalize_headers,
    _read_csv,
    _severity_index,
    clean_sales_rows,
    weather_effects,
)


class SalesCleaningTests(unittest.TestCase):
    def test_percent_header_maps_to_margin_column(self):
        self.assertEqual(_normalize_headers(["Net Income", "%"]), ["net_income", "margin_pct"])

    def test_csv_preamble_is_skipped(self):
        csv_bytes = (
            "MedShield Sales Report\n"
            "Reporting Period,2025\n\n\n\n"
            "Area,DR Number,Date Delivered,Product,Qty,CP,Total CP,Disc,Net CP,TP/UNIT,TOTAL TP,Net Income,%\n"
            "Quezon,DR-1,2025-01-01,ITEM A,2,10,20,0,20,5,10,10,50%\n"
        ).encode()
        rows, stage, headers = _read_csv(csv_bytes, "sales.csv")
        self.assertEqual(stage, "raw_tabular")
        self.assertEqual(len(rows), 1)
        self.assertEqual(len(set(headers) & {
            "area", "dr_number", "date_delivered", "product", "quantity",
            "unit_cost", "total_cost", "discount", "net_cost",
            "trade_price_unit", "total_trade_price", "net_income", "margin_pct",
        }), 13)

    def test_exact_duplicates_are_retained_and_flagged(self):
        source_rows = [
            SourceRow(
                workbook="sales.csv",
                sheet="2025",
                row_number=row_number,
                raw={
                    "area": "Quezon",
                    "dr_number": "DR-1",
                    "date_delivered": "2025-01-01",
                    "product": "Item A",
                    "quantity": "2",
                    "net_cost": "20",
                    "net_income": "10",
                },
            )
            for row_number in (2, 3)
        ]
        rows, summary, _ = clean_sales_rows(source_rows, "raw_tabular")
        self.assertEqual(summary["rows_accepted"], 2)
        self.assertEqual(summary["duplicate_rows"], 1)
        self.assertEqual(rows[1]["quality_status"], "warning")

    def test_raw_row_is_standardized_and_margin_is_derived(self) -> None:
        rows, summary, _ = clean_sales_rows(
            [
                SourceRow(
                    workbook="Sales Report.xlsx",
                    sheet="2025",
                    row_number=7,
                    raw={
                        "area": " cam norte ",
                        "dr_number": " dr 001 ",
                        "date_delivered": date(2025, 1, 2),
                        "product": " test product ",
                        "quantity": "2",
                        "unit_cost": "100",
                        "total_cost": "200",
                        "discount": "",
                        "net_cost": "200",
                        "trade_price_unit": "60",
                        "total_trade_price": "120",
                        "net_income": "80",
                        "margin_pct": "",
                    },
                )
            ],
            "raw_medshield",
        )

        self.assertEqual(rows[0]["area"], "Camarines Norte")
        self.assertEqual(rows[0]["dr_number"], "DR-001")
        self.assertEqual(rows[0]["product"], "TEST PRODUCT")
        self.assertEqual(rows[0]["margin_pct"], 0.4)
        self.assertEqual(rows[0]["quality_status"], "valid")
        self.assertEqual(summary["rows_accepted"], 1)

    def test_dr_number_variants_are_standardized(self) -> None:
        rows, summary, _ = clean_sales_rows(
            [
                SourceRow(
                    workbook="sales.csv",
                    sheet="2025",
                    row_number=2,
                    raw={
                        "area": "Quezon",
                        "dr_number": " DR No. 2025 - 0007 ",
                        "date_delivered": "2025-01-01",
                        "product": "Item A",
                    },
                )
            ],
            "raw_tabular",
        )
        self.assertEqual(rows[0]["dr_number"], "DR-2025-0007")
        self.assertEqual(summary["rows_accepted"], 1)

    def test_year_upload_replaces_only_matching_year_in_local_history(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            processed = root / "processed"
            uploads = root / "uploads"
            patches = [
                patch.object(data_pipeline, "DATA_DIR", root),
                patch.object(data_pipeline, "UPLOAD_DIR", uploads),
                patch.object(data_pipeline, "PROCESSED_DIR", processed),
                patch.object(data_pipeline, "SALES_DATASET_PATH", processed / "sales_transactions.json.gz"),
                patch.object(data_pipeline, "SALES_STATUS_PATH", processed / "sales_dataset_status.json"),
                patch.object(data_pipeline, "SALES_SNAPSHOT_PATH", processed / "dashboard_sales_snapshot.json"),
            ]
            for item in patches:
                item.start()
            self.addCleanup(lambda: [item.stop() for item in reversed(patches)])

            rows_2023, summary_2023, _ = clean_sales_rows(
                [
                    SourceRow("2023.csv", "2023", 2, {
                        "area": "Quezon",
                        "dr_number": "1",
                        "date_delivered": "2023-01-01",
                        "product": "Item A",
                        "quantity": "1",
                        "net_cost": "100",
                    })
                ],
                "raw_tabular",
            )
            data_pipeline._write_local_sales_dataset(rows_2023, summary_2023, "2023.csv", "hash-2023")

            rows_2025, summary_2025, _ = clean_sales_rows(
                [
                    SourceRow("2025.csv", "2025", 2, {
                        "area": "Quezon",
                        "dr_number": "2",
                        "date_delivered": "2025-01-01",
                        "product": "Item B",
                        "quantity": "1",
                        "net_cost": "200",
                    })
                ],
                "raw_tabular",
            )
            result = data_pipeline._write_local_sales_dataset(rows_2025, summary_2025, "2025.csv", "hash-2025")
            payload = data_pipeline._load_existing_sales_payload()

            self.assertEqual(result["merge_strategy"], "replaced_uploaded_years")
            self.assertEqual(result["years_replaced"], ["2025"])
            self.assertEqual(sorted({row["year"] for row in payload["rows"]}), [2023, 2025])
            self.assertEqual(payload["metadata"]["quality_summary"]["sku_count"], 2)

    def test_missing_required_fields_are_rejected(self) -> None:
        rows, summary, _ = clean_sales_rows(
            [
                SourceRow(
                    workbook="bad.csv",
                    sheet="CSV",
                    row_number=2,
                    raw={"area": "", "date_delivered": "bad", "product": ""},
                )
            ],
            "raw_tabular",
        )
        self.assertEqual(rows[0]["quality_status"], "rejected")
        self.assertEqual(summary["rows_rejected"], 1)


class WeatherSeverityTests(unittest.TestCase):
    def test_severity_and_alert_thresholds_are_bounded(self) -> None:
        severity = _severity_index(600, 25, 80, 35)
        self.assertEqual(severity, 0.98)
        self.assertEqual(_alert_level(severity), "critical")
        self.assertEqual(_alert_level(0.65), "watch")
        self.assertEqual(_alert_level(0.85), "warning")

    def test_daily_weather_effects_match_daily_sales(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            processed = root / "processed"
            uploads = root / "uploads"
            patches = [
                patch.object(data_pipeline, "DATA_DIR", root),
                patch.object(data_pipeline, "UPLOAD_DIR", uploads),
                patch.object(data_pipeline, "PROCESSED_DIR", processed),
                patch.object(data_pipeline, "SALES_DATASET_PATH", processed / "sales_transactions.json.gz"),
                patch.object(data_pipeline, "SALES_STATUS_PATH", processed / "sales_dataset_status.json"),
                patch.object(data_pipeline, "SALES_SNAPSHOT_PATH", processed / "dashboard_sales_snapshot.json"),
                patch.object(data_pipeline, "WEATHER_DATASET_PATH", processed / "weather_signals.json"),
            ]
            for item in patches:
                item.start()
            self.addCleanup(lambda: [item.stop() for item in reversed(patches)])

            rows, summary, _ = clean_sales_rows(
                [
                    SourceRow("sales.csv", "2025", 2, {
                        "area": "Quezon",
                        "dr_number": "1",
                        "date_delivered": "2025-01-02",
                        "product": "Item A",
                        "net_cost": "150",
                    })
                ],
                "raw_tabular",
            )
            data_pipeline._write_local_sales_dataset(rows, summary, "sales.csv", "hash")
            processed.mkdir(parents=True, exist_ok=True)
            data_pipeline.WEATHER_DATASET_PATH.write_text(json.dumps({
                "metadata": {
                    "provider": "nasa_power",
                    "period_start": "2025-01-01",
                    "period_end": "2025-01-02",
                    "areas": ["Quezon"],
                },
                "daily_rows": [
                    {
                        "date": "2025-01-02",
                        "period": "2025-01-02",
                        "area": "Quezon",
                        "provider": "nasa_power",
                        "rainfall_mm": 12,
                        "rainy_day": True,
                        "temperature_c": 27,
                        "relative_humidity_pct": 80,
                        "wind_speed_kph": 15,
                        "rainfall_severity_proxy": 0.12,
                        "weather_alert_level": "normal",
                        "high_wind_watch": False,
                        "weather_adjustment_factor": 1.024,
                    }
                ],
                "rows": [],
            }), encoding="utf-8")

            result = weather_effects(year="2025", area="Quezon", grain="daily")
            self.assertEqual(result["metadata"]["grain"], "daily")
            self.assertEqual(result["metadata"]["sales_matched_rows"], 1)
            self.assertEqual(result["rows"][0]["sales_revenue"], 150)


if __name__ == "__main__":
    unittest.main()
