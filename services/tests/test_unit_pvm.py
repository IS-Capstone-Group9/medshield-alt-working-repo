import copy,json,unittest
from decimal import Decimal
from pathlib import Path
from services.analytics_service.jobs.report_unit_pvm import report

ROOT=Path(__file__).resolve().parents[2]

class UnitPvmTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        d=ROOT/'outputs/wp11_unit_planning_pilot_20261030/inherited'
        cls.source=json.loads((d/'source.json').read_bytes());cls.confirmation=json.loads((d/'user-confirmation.json').read_bytes())
    def test_actual_scoped_bridge_and_ledger_population(self):
        result=report(self.source,self.confirmation);s=result['summary']
        self.assertLess(abs(sum(Decimal(s[k]) for k in ('volume_effect','price_effect','interaction_effect','adjustment_change'))-Decimal(s['delta_eligible_net'])),Decimal('.00000001'))
        self.assertEqual(len(result['ledger']),s['base_records']+s['target_records'])
        self.assertEqual(len({r['source_record_id'] for r in result['ledger']}),len(result['ledger']))
        self.assertFalse(s['company_revenue_reconciled']);self.assertFalse(s['causal_attribution'])
    def test_source_unit_confirmation_mismatch_is_rejected(self):
        with self.assertRaises(AssertionError):report(self.source,dict(self.confirmation,applied_raw_area='OTHER'))
    def test_outside_cohort_change_cannot_enter_scoped_bridge(self):
        before=report(self.source,self.confirmation)
        changed=copy.deepcopy(self.source)
        for row in changed['queries']['detail']['rows']:
            if row['raw_area']!='HOSPITAL' and row['net_sales'] is not None:row['net_sales']='999999999'
        self.assertEqual(before['summary'],report(changed,self.confirmation)['summary'])
    def test_signed_adjustment_is_a_separate_reconciling_bucket(self):
        changed=copy.deepcopy(self.source)
        template=next(r for r in changed['queries']['detail']['rows'] if r['normalized_product']=='BUPIRIGHT' and r['raw_area']=='HOSPITAL' and r['date']>='2026-04-01')
        changed['queries']['detail']['rows'].append(dict(template,source_record_id='isolated_adjustment_fixture',date='2026-05-01',recorded_quantity='-1',net_sales='-100',is_net_sales_technically_eligible='true'))
        result=report(changed,self.confirmation)
        self.assertEqual(result['summary']['adjustment_change'],'-100')
        self.assertEqual(Decimal(result['summary']['delta_eligible_net']),Decimal('2350'))
        self.assertEqual(sum(r['bucket']=='Adjustment_Only' for r in result['ledger']),1)

if __name__=='__main__':unittest.main()
