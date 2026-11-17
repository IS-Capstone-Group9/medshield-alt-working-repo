import unittest

from services.analytics_service import tender_snapshots as ts


class TenderSnapshotsTests(unittest.TestCase):
    def test_missing_archive_fails_closed(self):
        with self.assertRaisesRegex(ValueError, 'MISSING_ORDER_ARCHIVE'):
            ts.validate_tender_snapshot([], {}, source_dataset_id='s1', policy_version='p1', as_of_date='2026-11-17')

    def test_issue_time_cutoff_and_approved_entity_gating(self):
        entity_map = {
            'QUEZON MEDICAL CENTER': {'mapping_status': 'approved', 'channel': 'HOSPITAL', 'territory_id': 'PH-PROVINCE-QUEZON'},
            'UNREVIEWED CLINIC': {'mapping_status': 'pending', 'channel': 'PRIVATE', 'territory_id': None},
        }
        records = [
            {'notice_id': 'N1', 'procuring_entity': 'Quezon Medical Center', 'available_on': '2026-11-01',
             'expected_delivery_month': '2026-12', 'status': 'awarded', 'php_value': 250000.0},
            {'notice_id': 'N2', 'procuring_entity': 'Quezon Medical Center', 'available_on': '2026-11-10',
             'expected_delivery_month': '2026-12', 'status': 'open', 'php_value': 90000.0},
            {'notice_id': 'N3', 'procuring_entity': 'Quezon Medical Center', 'available_on': '2026-11-02',
             'expected_delivery_month': '2026-12', 'status': 'cancelled', 'php_value': 500000.0},
            {'notice_id': 'N4', 'procuring_entity': 'Unreviewed Clinic', 'available_on': '2026-11-01',
             'expected_delivery_month': '2026-12', 'status': 'awarded', 'php_value': 120000.0},
        ]
        snap = ts.validate_tender_snapshot(records, entity_map, source_dataset_id='philgeps_sample',
                                           policy_version='v1', as_of_date='2026-11-15')
        self.assertEqual(4, snap['record_count'])
        self.assertEqual(1, snap['unmapped_pending_count'])

        # At issue_date=2026-11-03, N2 (available 2026-11-10) must NOT leak, N3 (cancelled) and N4 (unmapped) excluded
        feat = ts.tender_features_at_origin(snap, origin_period='2026-10', target_period='2026-12', issue_date='2026-11-03')
        self.assertEqual(250000.0, feat['approved_tender_php'])
        self.assertEqual(1, feat['approved_notice_count'])
        self.assertEqual(1, feat['unmapped_excluded_count'])
        self.assertFalse(feat['publication_approved'])


if __name__ == '__main__':
    unittest.main()
