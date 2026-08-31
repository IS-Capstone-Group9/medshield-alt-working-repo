import csv
import re
import unittest
from pathlib import Path

from medshield_etl.contracts import SOURCE_LAYOUTS


class LocalSourceContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.source_dir = (
            Path(__file__).resolve().parents[2] / "data" / "medshield" / "dataset_csv"
        )
        if not cls.source_dir.exists():
            raise unittest.SkipTest("Repository source CSV directory is not available")

    def test_expected_yearly_files_and_headers_are_present(self) -> None:
        paths = sorted(self.source_dir.glob("medshield_data_*.csv"))
        years = {int(path.stem.rsplit("_", 1)[-1]) for path in paths}
        self.assertEqual(years, set(range(2017, 2026)))

        for path in paths:
            year = int(path.stem.rsplit("_", 1)[-1])
            with self.subTest(year=year), path.open(
                "r", encoding="utf-8-sig", newline=""
            ) as handle:
                rows = list(csv.reader(handle))
                header_index = next(
                    index
                    for index, row in enumerate(rows[:20])
                    if self._is_transaction_header(row)
                )
                product_position = SOURCE_LAYOUTS[year]["product_raw"]
                self.assertIsNotNone(product_position)
                product_position = int(product_position)
                first_transaction = next(
                    row
                    for row in rows[header_index + 1 :]
                    if len(row) > product_position and row[product_position].strip()
                )
                self.assertGreaterEqual(
                    len(first_transaction),
                    max(position for position in SOURCE_LAYOUTS[year].values() if position is not None)
                    + 1,
                )

    @staticmethod
    def _is_transaction_header(row: list[str]) -> bool:
        normalized = re.sub(r"[^a-z]", "", "".join(row).lower())
        return (
            "product" in normalized
            and "date" in normalized
            and ("qty" in normalized or "grosssales" in normalized)
        )


if __name__ == "__main__":
    unittest.main()
