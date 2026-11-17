import copy
import json
from pathlib import Path
import unittest

from services.analytics_service.bupiright_lineage import analyze, history, rounded_price
from services.analytics_service.bupiright_unit_candidate import prepare
from services.analytics_service.bupiright_baselines import evaluate

ROOT=Path(__file__).resolve().parents[2]


class LineageTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        def load(path):return json.loads((ROOT/path).read_text(encoding='utf-8'))
        cls.source=load('outputs/bupiright_lineage_20261027/source.json')
        cls.prior=load('outputs/original_medicine_screen_20261027/source.json')
        cls.tables=load('outputs/catalog_preparation/product_evidence/price_list_tables.json')
        cls.confirmation=load('outputs/bupiright_lineage_20261027/user-confirmation.json')
        cls.protocol=load('outputs/bupiright_lineage_20261027/baseline-protocol.json')

    def run_review(self,source=None,prior=None):
        return analyze(source or self.source,prior or self.prior,self.tables)

    def test_current_capture_conserves_and_does_not_approve(self):
        result=self.run_review()
        self.assertEqual(result['source_records'],405)
        self.assertEqual(result['controls_checked'],53)
        self.assertEqual(result['monthly_groups_checked'],203)
        self.assertEqual(result['proposed_recent_pair']['presence_only']['positive_tail_at_cutoff'],18)
        self.assertEqual(result['units_approved'],0)
        self.assertTrue(all(not p['approved'] and p['unit_multiplier'] is None for p in result['proposals']))

    def test_price_rounding_and_missing_signed_quantity(self):
        self.assertEqual(rounded_price('10.005','1'),'10.01')
        self.assertEqual(rounded_price('-10.005','1'),'-10.01')
        self.assertIsNone(rounded_price('5','-1'))
        self.assertIsNone(rounded_price('5','0'))
        self.assertIsNone(rounded_price(None,'1'))

    def test_gap_never_becomes_zero_presence(self):
        rows=[dict(date=d,recorded_quantity=q) for d,q in [('2026-07-01','1'),('2026-08-01','0'),('2026-09-01','2')]]
        self.assertEqual(history(rows)['positive_tail_at_cutoff'],1)

    def test_control_mutation_rejected(self):
        source=copy.deepcopy(self.source);source['queries']['controls']['rows'][0]['records']='999'
        with self.assertRaises(AssertionError):self.run_review(source)

    def test_approval_transfer_rejected(self):
        source=copy.deepcopy(self.source);source['queries']['detail']['rows'][0]['source_unit_approved']='true'
        with self.assertRaises(AssertionError):self.run_review(source)

    def test_duplicate_and_product_key_rejected(self):
        for field in ['source_record_id','product_key']:
            source=copy.deepcopy(self.source)
            source['queries']['detail']['rows'][0][field]=source['queries']['detail']['rows'][1][field]
            if field=='product_key':source['queries']['detail']['rows'][0][field]='bad'
            with self.assertRaises(AssertionError):self.run_review(source)

    def test_wrong_source_rejected(self):
        source=copy.deepcopy(self.source);source['release']['dataset_id']='other'
        with self.assertRaises(AssertionError):self.run_review(source)

    def test_catalogue_is_presentation_lead_not_price_confirmation(self):
        result=self.run_review()
        self.assertEqual(result['reference_evidence']['reference_price_compatible_records'],0)
        matches=[r['label'] for r in result['labels'] if r['presentation_leads']]
        self.assertEqual(matches,['BUPIRIGHT'])
        self.assertFalse(result['proposed_recent_pair']['approved'])

    def test_confirmed_scope_conserves_without_global_approval(self):
        result=prepare(self.source,self.confirmation)
        self.assertEqual(result['source_records'],50)
        self.assertEqual(result['monthly_records'],35)
        self.assertEqual(result['total_recorded_ampoules'],'1526.000000')
        self.assertEqual(len(result['research_window']),18)
        self.assertFalse(result['global_product_master_changed'])
        self.assertFalse(result['model_publication_approved'])
        self.assertEqual(result['unreviewed_source_records'],13)

    def test_missing_confirmation_or_wrong_multiplier_rejected(self):
        for key,value in [('same_4ml_product_confirmed',False),('quantity_multiplier',5),('applied_raw_area','QUEZON')]:
            confirmation=copy.deepcopy(self.confirmation);confirmation[key]=value
            with self.assertRaises(AssertionError):prepare(self.source,confirmation)

    def test_fractional_unit_not_silently_accepted(self):
        source=copy.deepcopy(self.source)
        for row in source['queries']['detail']['rows']:
            if row['normalized_product']=='BUPIRIGHT' and row['raw_area']=='HOSPITAL':
                row['recorded_quantity']='1.5';break
        with self.assertRaises(AssertionError):prepare(source,self.confirmation)

    def test_frozen_baseline_cases_no_method_selected(self):
        result=evaluate(prepare(self.source,self.confirmation),self.protocol)
        self.assertEqual(len(result['cases']),40)
        self.assertEqual([r['cases'] for r in result['metrics']],[6]*4+[4]*4)
        self.assertIsNone(result['selected_method'])
        self.assertFalse(result['future_predictions_generated'])

    def test_future_observation_cannot_change_earlier_prediction(self):
        candidate=prepare(self.source,self.confirmation)
        expected=evaluate(candidate,self.protocol)
        changed=copy.deepcopy(candidate)
        for row in changed['research_window'][12:]:row['net_recorded_ampoules']='1000000'
        actual=evaluate(changed,self.protocol)
        for a,b in zip(expected['cases'],actual['cases']):
            if a['origin']=='2026-03':self.assertEqual(a['predicted_ampoules'],b['predicted_ampoules'])

    def test_baseline_refuses_gap_or_unregistered_lead(self):
        candidate=prepare(self.source,self.confirmation)
        candidate['research_window'][0]['month']='2025-03'
        with self.assertRaises(AssertionError):evaluate(candidate,self.protocol)
        protocol=copy.deepcopy(self.protocol);protocol['actual_calendar_leads']=[6]
        with self.assertRaises(AssertionError):evaluate(prepare(self.source,self.confirmation),protocol)


if __name__=='__main__':unittest.main()
