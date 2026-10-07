import hashlib
import json
import tempfile
import unittest
from pathlib import Path
from services.analytics_service.predictive.prepare_coverage import prepare


class CoverageReviewTests(unittest.TestCase):
    def test_draft_is_unsigned_and_preserves_missing_zero(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / 'input.json'
            source.write_text(json.dumps({'manifest': {'dataset_id': 'fixture', 'fact_delta_version': 1, 'source_checksum': 'source'}, 'rows': [
                {'period': '2025-01', 'target_value_decimal': '0.00', 'source_count': 1, 'value_status': 'recorded_zero'},
                {'period': '2025-02', 'target_value_decimal': None, 'value_status': 'missing'}]}))
            source.with_suffix('.sha256').write_text(hashlib.sha256(source.read_bytes()).hexdigest())
            output = prepare(source, root / 'review')
            result = json.loads(output.read_text())
            self.assertFalse(result['training_approved'])
            self.assertFalse(result['publication_approved'])
            self.assertEqual(result['reviewer'], '')
            self.assertEqual(result['periods']['2025-01']['coverage_status'], 'unknown')
            self.assertIn('Unavailable', (root / 'review' / 'REVIEW.md').read_text())
            with self.assertRaises(FileExistsError):
                prepare(source, root / 'review')
            source.write_text('{}')
            with self.assertRaisesRegex(ValueError, 'checksum'):
                prepare(source, root / 'other')
