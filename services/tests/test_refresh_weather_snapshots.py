import json
import tempfile
import unittest
from datetime import date, datetime
from pathlib import Path

from services.analytics_service.jobs import refresh_weather_snapshots as job


def nasa_payload():
    days = {f'202602{d:02d}': 2.0 for d in range(1, 29)}
    days['20260215'] = -999.0
    p = {code: dict(days) for code in job.NASA_PARAMS}
    return {'properties': {'parameter': p}}


def meteo_payload():
    t = [f'2026-02-{d:02d}' for d in range(1, 11)]
    daily = {'time': t, **{code: [1.5] * 10 for code in job.OPEN_METEO_PARAMS}}
    return {'daily': daily}


class RefreshWeatherSnapshotsTest(unittest.TestCase):
    def test_nasa_fill_value_is_missing_not_zero(self):
        days = job.parse_nasa(nasa_payload())
        self.assertIsNone(days['2026-02-15']['rainfall_mm'])
        month = job.monthly(days)[0]
        self.assertEqual(month['rainfall_mm_days'], 27)
        self.assertAlmostEqual(month['rainfall_mm'], 54.0)
        self.assertTrue(month['is_complete_month'])

    def test_partial_month_is_flagged(self):
        month = job.monthly(job.parse_open_meteo(meteo_payload()))[0]
        self.assertFalse(month['is_complete_month'])
        self.assertEqual(month['expected_days'], 28)

    def test_snapshot_is_append_only_and_errors_do_not_stop_other_provider(self):
        def fake_fetch(url):
            if 'power.larc' in url:
                raise RuntimeError('blocked')
            payload = meteo_payload()
            return payload, json.dumps(payload).encode()
        now = datetime(2026, 11, 7, 9, tzinfo=job.MANILA)
        with tempfile.TemporaryDirectory() as tmp:
            folder = job.run(date(2026, 2, 1), date(2026, 2, 10), ['Quezon'], Path(tmp), fetch=fake_fetch, now=now)
            manifest = json.loads((folder / 'manifest.json').read_text())
            self.assertEqual(manifest['status'], 'PARTIAL')
            self.assertFalse(manifest['join_ready'])
            self.assertEqual(manifest['evidence_class'], 'provider_proxy_not_observation')
            self.assertEqual(len(manifest['errors']), 1)
            with self.assertRaises(FileExistsError):
                job.run(date(2026, 2, 1), date(2026, 2, 10), ['Quezon'], Path(tmp), fetch=fake_fetch, now=now)


if __name__ == '__main__':
    unittest.main()
