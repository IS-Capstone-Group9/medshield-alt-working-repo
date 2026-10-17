from copy import deepcopy
import unittest
from services.analytics_service.current_gold_product_routes import adapt_current_gold
from services.analytics_service.product_approval_bridge import build_approval_bridge
from services.tests.test_current_gold_product_routes import fixture


class ApprovalBridgeTests(unittest.TestCase):
    def setUp(self):
        self.payload,self.release=fixture()
        for p in self.payload['products']:
            p['item_kinds']=['unknown']
        self.routes=adapt_current_gold(self.payload,self.release);self.routes['input_sha256']='inputhash'
        self.master=[dict(raw_product=p['source_labels'][0],product_category='medicine',category_status='approved',
                          identity_status='needs_review',item_kind_status='proposed',unit_status='needs_review',forecast_status='needs_review',
                          forecast_eligible='false',canonical_sku='',unit_of_measure='',item_kind='physical_product',
                          evidence_source='Recorded category-only evidence',reviewed_by='Recorded reviewer',reviewed_at='2026-10-08T09:00:00Z',
                          mapping_status='proposed',review_notes='Physical identity still pending') for p in self.payload['products']]

    def build(self,**kwargs):
        return build_approval_bridge(self.payload,self.routes,self.master,master_sha256='master',
                                     expected_release=self.release,input_sha256='inputhash',**kwargs)

    def test_preserves_independent_status_and_evidence_scope(self):
        p=self.build()['products'][0];d=p['decisions']
        self.assertEqual(d['category']['status'],'approved');self.assertEqual(d['item_kind']['status'],'proposed')
        self.assertEqual(d['unit']['status'],'needs_review');self.assertIsNone(d['unit']['reviewed_by'])
        self.assertIsNone(d['category']['effective_from']);self.assertFalse(p['quantity_model_eligible'])
        self.assertEqual(d['category']['evidence_scope'],'recorded_descriptive_category_review_only')

    def test_gold_unknown_projection_preserves_unapproved_master_proposal(self):
        p=self.build()['products'][0]
        self.assertEqual(p['source_effective_item_kind'],'unknown')
        self.assertEqual(p['recorded_master_item_kind'],'physical_product')
        self.assertEqual(p['decisions']['item_kind']['status'],'proposed')
        self.payload['products'][0]['item_kinds']=['physical_product']
        with self.assertRaises(ValueError):self.build()

    def test_preserves_null_negative_financial_and_no_mutation(self):
        before=deepcopy((self.payload,self.routes,self.master));result=self.build()
        self.assertEqual((result['review_products'],result['financial_products'],result['review_only_products']),(3,2,1))
        self.assertEqual([p['recorded_net_sales_php'] for p in result['products']],['100.25','-5.25',None])
        self.assertEqual(before,(self.payload,self.routes,self.master))

    def test_duplicate_missing_extra_master_alias_rejected(self):
        base=deepcopy(self.master)
        for changed in [base+[base[0]],base[:-1],base+[dict(base[0],raw_product='extra')]]:
            self.master=changed
            with self.assertRaises(ValueError):self.build()

    def test_wrong_master_release_or_input_hash_rejected(self):
        self.release['product_master_sha256']='new'
        with self.assertRaises(ValueError):self.build()
        self.release['product_master_sha256']='master';self.routes['input_sha256']='other'
        with self.assertRaises(ValueError):self.build()

    def test_ambiguous_and_conflicting_source_metadata_rejected(self):
        for field in ['source_labels','categories','identity_statuses','units']:
            before=deepcopy(self.payload);self.payload['products'][0][field]=['conflict']
            with self.assertRaises(ValueError):self.build()
            self.payload=before

    def test_category_approval_does_not_approve_identity_unit_or_forecast(self):
        for d in ['identity','unit','forecast','item_kind']:
            before=deepcopy(self.master);self.master[0][d+'_status']='approved'
            if d=='identity':self.payload['products'][0]['identity_statuses']=['approved']
            with self.assertRaises(ValueError):self.build()
            self.master=before;self.payload['products'][0]['identity_statuses']=['needs_review']

    def test_rejected_and_unknown_decisions_preserved(self):
        self.master[0]['unit_status']='rejected';self.master[0]['forecast_status']='unknown'
        d=self.build()['products'][0]['decisions'];self.assertEqual(d['unit']['status'],'rejected');self.assertEqual(d['forecast']['status'],'unknown')

    def test_unrecognized_status_and_missing_category_review_rejected(self):
        self.master[0]['unit_status']='maybe'
        with self.assertRaises(ValueError):self.build()
        self.master[0]['unit_status']='needs_review';self.master[0]['reviewed_by']=''
        with self.assertRaises(ValueError):self.build()

    def evidence(self,**updates):
        item=dict(product_key='Box',dimension='unit',status='needs_review',evidence_source='Scoped reference',reviewed_by='Actual reviewer',
                  reviewed_at='2026-10-17T12:00:00Z',effective_from='2021-01-01',effective_through='2025-12-31')
        item.update(updates);return item

    def test_scoped_review_dates_carried_without_upgrading_pending(self):
        d=self.build(decision_evidence=[self.evidence()])['products'][0]['decisions']['unit']
        self.assertEqual(d['effective_from'],'2021-01-01');self.assertEqual(d['status'],'needs_review')

    def test_actual_scoped_item_kind_approval_still_does_not_approve_model(self):
        self.master[0]['item_kind_status']='approved'
        self.payload['products'][0]['item_kinds']=['physical_product']
        result=self.build(decision_evidence=[self.evidence(dimension='item_kind',status='approved')])['products'][0]
        self.assertEqual(result['decisions']['item_kind']['status'],'approved')
        self.assertEqual(result['decisions']['unit']['status'],'needs_review')
        self.assertFalse(result['quantity_model_eligible']);self.assertFalse(result['activation_allowed'])

    def test_bad_evidence_intervals_reviewers_and_decision_conflicts_rejected(self):
        for change in [dict(effective_from='2027-01-01'),dict(reviewed_by=''),dict(reviewed_at='yesterday'),dict(status='approved'),dict(product_key='missing'),dict(dimension='all')]:
            with self.assertRaises(ValueError):self.build(decision_evidence=[self.evidence(**change)])
        with self.assertRaises(ValueError):self.build(decision_evidence=[self.evidence(),self.evidence()])

    def test_forged_forecast_flag_cannot_bypass_independent_statuses(self):
        self.master[0]['forecast_eligible']='true';self.payload['products'][0]['forecast_flags']=['true']
        with self.assertRaises(ValueError):self.build()

    def test_tampered_financial_values_or_partition_rejected(self):
        for field,value in [('recorded_net_sales_php','101.00'),('financial_eligible',False),('financial_rows',0)]:
            before=deepcopy(self.routes);self.routes['products'][0][field]=value
            with self.assertRaises(ValueError):self.build()
            self.routes=before


if __name__=='__main__':unittest.main()
