import unittest

from services.analytics_service.jobs import evaluate_weather_providers as weather


class WeatherReliabilityTests(unittest.TestCase):
    def test_sentinels_trace_and_midpoint(self):
        result = weather.parse_pagasa_row({"RAINFALL": "-1", "TMAX": "32", "TMIN": "24", "RH": "-999"})
        self.assertEqual(result["rainfall_mm"], 0)
        self.assertTrue(result["trace_rainfall"])
        self.assertEqual(result["temperature_c"], 28)
        self.assertIsNone(result["humidity_pct"])
        for raw in ("-999", "-9999", "NaN", "inf", "invalid", None, True):
            self.assertIsNone(weather.valid_number(raw, "rainfall_mm"))
        self.assertIsNone(weather.valid_number(101, "humidity_pct"))
        self.assertIsNone(weather.valid_number(-1, "rainfall_mm"))

    def test_hand_solved_errors_and_agreement(self):
        # Errors 2, -4, 0: MAE=2, RMSE=sqrt(20/3), bias=-2/3, agreement=2/3.
        result = weather.error_metrics([(10, 12), (20, 16), (30, 30)], lambda observed: 2)
        self.assertEqual(result["paired_count"], 3)
        self.assertEqual(result["agreeing_count"], 2)
        self.assertAlmostEqual(result["agreement_pct"], 66.6667)
        self.assertEqual(result["mae"], 2)
        self.assertAlmostEqual(result["rmse"], (20 / 3) ** 0.5, places=6)
        self.assertAlmostEqual(result["bias"], -2 / 3, places=6)
        self.assertIsNone(weather.error_metrics([])["mae"])
        self.assertIsNone(weather.percentage(0, 0))

    def test_rain_absolute_relative_tolerance_and_zero(self):
        result = weather.error_metrics([(0, 25), (100, 126), (500, 600)], weather.rain_tolerance)
        self.assertEqual(result["agreeing_count"], 2)
        self.assertEqual(result["agreement_pct"], 66.6667)

    def test_missing_day_prevents_monthly_zero_fill(self):
        from datetime import date
        dates = weather.date_range(date(2024, 2, 1), date(2024, 2, 29))
        reference = {day: {"rainfall_mm": 1} for day in dates}
        provider = {day: {"rainfall_mm": 2} for day in dates}
        paired, excluded = weather.complete_rain_months(reference, provider, dates)
        self.assertEqual(paired, [("2024-02", 29, 58)])
        self.assertEqual(excluded, 0)
        provider[dates[-1]]["rainfall_mm"] = None
        paired, excluded = weather.complete_rain_months(reference, provider, dates)
        self.assertEqual(paired, [])
        self.assertEqual(excluded, 1)

    def test_partial_calendar_window_is_not_complete_month(self):
        from datetime import date
        dates = weather.date_range(date(2024, 1, 2), date(2024, 1, 31))
        series = {day: {"rainfall_mm": 0} for day in dates}
        self.assertEqual(weather.complete_rain_months(series, series, dates), ([], 1))

    def test_missing_and_zero_remain_distinct_in_coverage(self):
        ref = {"2024-01-01": {"temperature_c": 10}, "2024-01-02": {"temperature_c": 12}}
        provider = {"2024-01-01": {"temperature_c": 0}}
        result = weather.measure_summary(ref, provider, ["2024-01-01", "2024-01-02"], False)
        self.assertEqual(result["temperature_c"]["coverage_pct"], 50)
        self.assertEqual(result["temperature_c"]["paired_coverage_pct"], 50)
        self.assertEqual(result["temperature_c"]["daily_errors"]["paired_count"], 1)
        self.assertIsNone(result["rainfall_mm"]["coverage_pct"])

    def test_seamless_requests_supported_rain_with_explicit_model(self):
        from datetime import date
        station = {"latitude": 14, "longitude": 121, "elevation_m": 10}
        url = weather.provider_url("open_meteo_era5_seamless", station, date(2023, 1, 1), date(2024, 12, 31))
        self.assertIn("precipitation_sum", url)
        self.assertIn("era5_seamless", url)
        self.assertIn("Asia%2FManila", url)

    def test_provider_unit_and_timezone_validation(self):
        payload = {"timezone": "Asia/Manila", "utc_offset_seconds": 28800,
                   "daily": {"time": ["2023-01-01"], "temperature_2m_mean": [28], "relative_humidity_2m_mean": [None], "precipitation_sum": [0]},
                   "daily_units": {"temperature_2m_mean": "°C", "relative_humidity_2m_mean": "%", "precipitation_sum": "mm"}}
        rows, _ = weather.parse_provider("open_meteo_era5_seamless", payload)
        self.assertEqual(rows["2023-01-01"]["temperature_c"], 28)
        self.assertIsNone(rows["2023-01-01"]["humidity_pct"])
        payload["daily_units"]["temperature_2m_mean"] = "°F"
        with self.assertRaisesRegex(ValueError, "unit"):
            weather.parse_provider("open_meteo_era5_seamless", payload)


if __name__ == "__main__":
    unittest.main()
