import unittest

from medshield_etl.contracts import (
    BUSINESS_COLUMNS,
    CANONICAL_COLUMNS,
    QUALITY_AND_LINEAGE_COLUMNS,
    SOURCE_LAYOUTS,
)


class DatasetContractTests(unittest.TestCase):
    def test_canonical_schema_has_28_unique_columns(self) -> None:
        self.assertEqual(len(BUSINESS_COLUMNS), 14)
        self.assertEqual(len(QUALITY_AND_LINEAGE_COLUMNS), 14)
        self.assertEqual(len(CANONICAL_COLUMNS), 28)
        self.assertEqual(len(set(CANONICAL_COLUMNS)), 28)

    def test_every_expected_source_year_has_a_layout(self) -> None:
        self.assertEqual(set(SOURCE_LAYOUTS), set(range(2017, 2026)))

    def test_2019_gross_and_net_contract_values_remain_distinct(self) -> None:
        layout = SOURCE_LAYOUTS[2019]
        self.assertEqual(layout["gross_contract_value_raw"], 6)
        self.assertEqual(layout["net_contract_value_raw"], 8)
        self.assertNotEqual(
            layout["gross_contract_value_raw"], layout["net_contract_value_raw"]
        )

    def test_2017_preserves_both_quantity_candidates(self) -> None:
        layout = SOURCE_LAYOUTS[2017]
        self.assertEqual(layout["quantity_primary_raw"], 4)
        self.assertEqual(layout["quantity_secondary_raw"], 9)

    def test_2020_has_no_source_margin_percentage(self) -> None:
        self.assertIsNone(SOURCE_LAYOUTS[2020]["gross_margin_pct_raw"])
        self.assertEqual(SOURCE_LAYOUTS[2021]["gross_margin_pct_raw"], 12)


if __name__ == "__main__":
    unittest.main()
