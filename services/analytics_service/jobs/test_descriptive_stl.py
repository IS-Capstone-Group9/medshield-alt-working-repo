import unittest
from services.analytics_service.jobs.run_descriptive_stl import decompose


class DescriptiveSTLTest(unittest.TestCase):
    def rows(self, length=48):
        return [{"period": f"{2020 + i // 12}-{i % 12 + 1:02d}",
                 "revenue": 1000 + i * 10 + (i % 12) * 50} for i in range(length)]

    def test_components_reconstruct_source(self):
        result = decompose(self.rows())
        self.assertEqual(result["status"], "candidate")
        for row in result["segments"][0]["components"]:
            self.assertAlmostEqual(row["observed"], row["trend"] + row["seasonal"] + row["residual"], places=6)

    def test_missing_month_splits_series_and_is_never_zero_filled(self):
        rows = self.rows(60)
        rows[10]["revenue"] = None
        result = decompose(rows)
        self.assertEqual(result["unavailable_periods"], ["2020-11"])
        self.assertEqual(result["segments"][0]["start"], "2020-12")
        self.assertEqual(len(result["short_segment_periods"]), 10)

    def test_insufficient_history_and_duplicates(self):
        self.assertEqual(decompose(self.rows(12))["status"], "insufficient_contiguous_history")
        with self.assertRaises(ValueError):
            decompose(self.rows() + self.rows(1))


if __name__ == "__main__":
    unittest.main()
