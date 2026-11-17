import unittest
from services.analytics_service.predictive.surge_investigation import contributions, as_of_events


class SurgeTests(unittest.TestCase):
    def test_signed_contributions_conserve_and_keep_negative_records(self):
        history = [f'2023-{m:02}' for m in range(1, 7)]
        rows = [dict(date_delivered=m+'-01', product='A', net_sales='6', is_net_sales_technically_eligible=True) for m in history]
        rows += [dict(date_delivered='2023-07-01', product='A', net_sales='20', is_net_sales_technically_eligible=True),
                 dict(date_delivered='2023-07-02', product='B', net_sales='-2', is_net_sales_technically_eligible=True),
                 dict(date_delivered='2023-07-03', product='C', net_sales='999', is_net_sales_technically_eligible=False)]
        result = contributions(rows, history, '2023-07', 'product')
        self.assertEqual([r['surge_contribution_php'] for r in result], ['14', '-2'])
        self.assertEqual(sum(float(r['surge_contribution_php']) for r in result), 18-6)

    def event(self, **updates):
        result = dict(event_id='anonymous-1', revision=1, known_at='2026-10-20T09:00:00+08:00',
                      captured_at='2026-10-20T10:00:00+08:00', planned_month='2026-12',
                      population_scope='itemized', evidence_kind='confirmed_order', source_evidence_id='fixture',
                      custody_verified=True, linkage_verified=True, status='confirmed', net_sales_basis_php='10')
        return dict(result, **updates)

    def test_future_revision_cannot_change_prior_issue(self):
        original = self.event()
        cancellation = self.event(revision=2, known_at='2026-11-05T10:00:00+08:00', captured_at='2026-11-05T11:00:00+08:00',status='cancelled')
        self.assertEqual(as_of_events([original, cancellation], '2026-11-01T00:00:00+08:00', 'itemized'), [original])
        self.assertEqual(as_of_events([original, cancellation], '2026-11-06T00:00:00+08:00', 'itemized'), [])

    def test_backfilled_capture_is_not_historical_availability(self):
        self.assertEqual(as_of_events([self.event(captured_at='2026-11-02T00:00:00+08:00')], '2026-11-01T00:00:00+08:00', 'itemized'), [])

    def test_unverified_incompatible_duplicate_and_invalid_events_fail(self):
        for update in [dict(custody_verified=False),dict(custody_verified='true'),dict(linkage_verified=False),dict(population_scope='contracts'),dict(evidence_kind='delivery'),dict(net_sales_basis_php='NaN'),dict(net_sales_basis_php=10.1),dict(known_at='2026-10-20T09:00:00'),dict(planned_month='2026-13')]:
            with self.assertRaises(ValueError):
                as_of_events([self.event(**update)], '2026-11-01T00:00:00+08:00', 'itemized')
        with self.assertRaises(ValueError):
            as_of_events([self.event(),self.event()], '2026-11-01T00:00:00+08:00', 'itemized')
