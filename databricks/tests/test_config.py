import unittest

from medshield_etl.config import PipelineConfig


class PipelineConfigTests(unittest.TestCase):
    def test_default_volume_and_input_paths(self) -> None:
        config = PipelineConfig()
        self.assertEqual(config.volume_name, "workspace.medshield_bronze.raw_files")
        self.assertEqual(
            config.input_directory,
            "/Volumes/workspace/medshield_bronze/raw_files/sales",
        )
        self.assertTrue(config.input_glob.endswith("/medshield_data_*.csv"))
        self.assertEqual(config.expected_years, set(range(2017, 2026)))

    def test_catalog_identifier_rejects_unsafe_values(self) -> None:
        unsafe_values = ("workspace; DROP SCHEMA x", "workspace-name", "../workspace")
        for catalog in unsafe_values:
            with self.subTest(catalog=catalog), self.assertRaises(ValueError):
                PipelineConfig(catalog=catalog)

    def test_invalid_year_range_is_rejected(self) -> None:
        with self.assertRaises(ValueError):
            PipelineConfig(year_min=2025, year_max=2017)

    def test_negative_financial_tolerance_is_rejected(self) -> None:
        with self.assertRaises(ValueError):
            PipelineConfig(financial_tolerance=-0.01)


if __name__ == "__main__":
    unittest.main()
