import copy
import unittest
from services.analytics_service.jobs.report_anomaly_ledgers import report


class AnomalyLedgerTests(unittest.TestCase):
    def source(self):
        def row(sid,dr,net,area='CAVITE',eligible='true'):
            return dict(source_record_id=sid,date_delivered='2026-06-01',area=area,dr_number=dr,
                        net_sales=net,net_eligible=eligible,source_file_sha256='a'*64,source_row_number=sid)
        rows=[row('1','DR1','100'),row('2','DR1','-20'),row('3','DR1','50','LAGUNA'),
              row('4',None,'-10'),row('5',None,'5'),row('6','bad',None,eligible='false')]
        return dict(status='PASS_READ_ONLY_GOLD_REGIONAL_ANOMALY_LEDGERS',warehouse_writes=0,
                    source=dict(fact_version=0),periods=['2026-06'],checked_at='fixture',anomaly_report_sha256='fixture',
                    captures=[dict(period='2026-06',region='CALABARZON',rows=rows,
                                   expected=dict(records=6,net_eligible_records=5,net_sales_php='125'))])
    def test_signed_totals_exact_dr_grouping_and_missing_dr_isolation(self):
        result=report(self.source());c=result['controls'][0]
        self.assertEqual(c['eligible_net_sales'],'125');self.assertEqual(c['negative_eligible_net_sales'],'-30')
        self.assertEqual(c['raw_dr_groups'],4);self.assertEqual(c['missing_dr_records'],2)
        self.assertEqual(result['top5_groups'][0]['eligible_net_sales'],'80')
        self.assertIsNone(result['ledger'][-1]['eligible_net_sales'])
        self.assertFalse(result['causal_attribution']);self.assertFalse(result['customer_identity_verified'])
    def test_rejects_bad_controls_duplicates_dates_and_unknown_eligibility(self):
        for change in ('control','duplicate','date','flag'):
            source=copy.deepcopy(self.source());capture=source['captures'][0]
            if change=='control':capture['expected']['net_sales_php']='124'
            if change=='duplicate':capture['rows'][1]['source_record_id']='1'
            if change=='date':capture['rows'][0]['date_delivered']='2026-05-01'
            if change=='flag':capture['rows'][0]['net_eligible']='unknown'
            with self.subTest(change=change),self.assertRaises(ValueError):report(source)


if __name__=='__main__':unittest.main()
