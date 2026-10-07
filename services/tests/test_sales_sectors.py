import unittest
from services.analytics_service.sales_sectors import build_sectors


class SectorTests(unittest.TestCase):
    def test_actual_years_are_2017_through_2025_without_flags(self):
        rows=[{**self.row('Government'), 'date_delivered': p+'-01'} for p in ['2016-12','2017-01','2025-12','2026-01']]
        result=build_sectors(rows, [], {}, 'test')
        self.assertEqual([r['period'] for r in result['rows']],['2017-01','2025-12'])
        self.assertEqual(result['source']['included_rows'],2)

    def row(self, area, revenue=100, quantity=10, **kw):
        return dict(area=area, net_cost=revenue, quantity=quantity, product='A', date_delivered='2025-01-01', quality_status='valid', **kw)

    def test_owner_rules_classify_channels_but_keep_unmapped_geography_unknown(self):
        result = build_sectors([self.row('Government'), self.row('Hospital'), self.row('Quezon', area_type='territory')], [], {}, 'test')
        self.assertEqual({r['date'] for r in result['rows']}, {'2025-01-01'})
        self.assertEqual(sum(r['revenue'] for r in result['rows']), 300)
        self.assertEqual(sum(r['quantity'] for r in result['rows']), 30)
        self.assertEqual({r['sector'] for r in result['rows']}, {'Government', 'Private', 'Unknown'})
        self.assertEqual(next(r for r in result['rows'] if r['channel']=='Hospital')['sector'], 'Private')

    def test_approved_private_channels_are_distinct_and_bad_rows_excluded(self):
        mappings=[dict(raw_area=a, buyer_sector='Private', customer_channel=a, territory='Quezon', mapping_status='approved') for a in ('Hospital', 'Pharma')]
        rows=[self.row('Hospital'), self.row('Pharma', 200, 40), self.row('Government', duplicate=True), self.row('Government', estimated=True), self.row('Government', float('nan'))]
        result=build_sectors(rows, mappings, {}, 'test')
        self.assertEqual(len(result['rows']), 2)
        self.assertEqual({r['channel'] for r in result['rows']}, {'Hospital','Pharma'})
        self.assertEqual({r['sector'] for r in result['rows']}, {'Private'})
        self.assertEqual(result['source']['included_rows'], 2)
        self.assertEqual(sum(result['source']['excluded'].values()), 3)

    def test_conflicting_approved_mapping_fails(self):
        item=dict(raw_area='Hospital', buyer_sector='Private', mapping_status='approved')
        with self.assertRaises(ValueError):
            build_sectors([], [item,item], {}, 'test')

    def test_geographic_source_type_uses_approved_mapping_without_inventing_ownership(self):
        mappings=[dict(raw_area='Quezon',territory='Quezon',area_type='territory',mapping_status='approved'),
                  dict(raw_area='Lower Cavite',territory='Cavite',area_type='territory',mapping_status='needs_review')]
        result=build_sectors([self.row('Quezon',area_type='geographic'),self.row('Lower Cavite',area_type='geographic')],[],{},'test',mappings)
        self.assertEqual({r['territory'] for r in result['rows']},{'Quezon','Unassigned geography'})
        self.assertEqual({r['sector'] for r in result['rows']},{'Private','Unknown'})

    def test_proposed_mapping_cannot_create_private_sales(self):
        result=build_sectors([self.row('Hospital')], [dict(raw_area='Hospital',buyer_sector='Private',mapping_status='proposed')], {}, 'test')
        self.assertEqual(result['rows'][0]['sector'],'Private')

    def test_explicit_lgu_and_internal_labels_take_precedence(self):
        rows = [self.row('Quezon Provincial Government'), self.row('City Government of Naga'), self.row('Admin')]
        result = build_sectors(rows, [], {}, 'test')
        self.assertEqual({r['sector'] for r in result['rows']}, {'Government', 'Internal'})

    def test_exact_pagbilao_reference_is_traceable_as_quezon_lgu(self):
        mappings = [dict(
            raw_area='Pagbilao',
            buyer_sector='Government',
            customer_channel='LGU',
            territory='Quezon',
            mapping_status='approved',
            review_notes='Exact reference-backed LGU mapping from docs/MAPPED_CLIENT_REFERENCE.md record CLI-0340.',
        )]
        result = build_sectors([self.row('Pagbilao')], mappings, {}, 'test')
        row = result['rows'][0]
        self.assertEqual((row['sector'], row['channel'], row['territory']), ('Government', 'LGU', 'Quezon'))
        self.assertIn('CLI-0340', row['basis'])


if __name__ == '__main__':
    unittest.main()
