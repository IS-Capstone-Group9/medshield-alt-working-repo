from copy import deepcopy
import json
from pathlib import Path
import unittest

from services.analytics_service import medicine_pilot_screen as screen

ROOT=Path(__file__).resolve().parents[2]
load=lambda path:json.loads((ROOT/path).read_bytes())


class MedicineScreenTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source=load('outputs/original_medicine_screen_20261027/source.json')
        cls.units=load('outputs/descriptive_closure_20261017/unit-review-decisions.json')
        cls.prices=load('outputs/pilot_evidence_step3_20261017/box-price-comparison.json')
        cls.prior=load('outputs/trivasc_box_forecast_20261025/results.json')
        cls.company=load('outputs/catalog_preparation/product_evidence/price_list_tables.json')

    def run_screen(self,source=None):
        return screen.screen(source or self.source,self.units,self.prices,self.prior,self.company)

    def test_month_order_tail_gaps_and_missing_last_month(self):
        jan=screen.month_id('2026-01')
        self.assertEqual(screen.month_text(jan-1),'2025-12')
        self.assertEqual(screen.tail_length({jan,jan+1,jan+3},jan+3),1)
        self.assertEqual(screen.tail_length({jan,jan+1},jan+3),0)
        self.assertEqual(screen.longest_run({jan,jan+1,jan+3}),2)
        self.assertEqual(screen.tail_length(set(range(jan,jan+24)),jan+23),24)
        self.assertEqual(screen.tail_length(set(range(jan,jan+23)),jan+23),0)
        with self.assertRaises(ValueError): screen.month_id('2026-13')

    def test_known_original_counts_and_no_automatic_unit_or_geography_approval(self):
        result=self.run_screen()
        self.assertEqual(result['medicine_controls']['records'],29700)
        self.assertEqual(result['medicine_labels'],2349)
        self.assertEqual(result['series_screened'],5252)
        self.assertEqual(result['current_history_review_candidates'],0)
        self.assertEqual(max(r['trailing_positive_quantity_months'] for r in result['series']),6)
        self.assertTrue(all(not r['operational_forecast_eligible'] for r in result['series']))
        self.assertTrue(all(r['geography_status']=='exact_recorded_area_unapproved' for r in result['series']))

    def test_reference_matching_does_not_transfer_old_unit_approval(self):
        result=self.run_screen()
        speeda=next(r for r in result['series'] if r['label']=='SPEEDA' and r['raw_area']=='GOVERNMENT')
        self.assertEqual(speeda['unit_evidence']['prior_review'],'hold_historical_unit_unresolved')
        self.assertFalse(speeda['unit_evidence']['quantity_conversion_allowed'])
        self.assertFalse(speeda['operational_forecast_eligible'])

    def test_trivasc_confirmation_reused_but_stale_and_short_variant_not_merged(self):
        trace=self.run_screen()['trivasc_trace']
        self.assertTrue(trace['historical_inference_reconciled'])
        self.assertEqual(trace['records'],165)
        self.assertEqual(trace['unknown_months_since_historical_pilot'],39)
        self.assertEqual(trace['separate_quezon_variant_records'],47)
        self.assertEqual(trace['hypothetical_identity_join_not_applied']['unknown_months_since_last_record'],29)
        self.assertFalse(trace['scope_extended'])
        self.assertFalse(trace['operational_unit_approval_added'])

    def test_count_partition_duplicate_month_label_and_controls_mutations_fail(self):
        for edit in [lambda s:s['queries']['medicine_months']['rows'][0].update(positive_quantity_records='999'),
                     lambda s:s['queries']['medicine_months']['rows'].append(deepcopy(s['queries']['medicine_months']['rows'][0])),
                     lambda s:s['queries']['medicine_months']['rows'][0].update(product_key='wrong'),
                     lambda s:s['queries']['medicine_controls']['rows'][0].update(net_sales='1')]:
            source=deepcopy(self.source);edit(source)
            with self.assertRaises(ValueError): self.run_screen(source)

    def test_source_identity_and_scope_changes_fail(self):
        for edit in [lambda s:s['release'].update(dataset_id='other'),lambda s:s.update(contracts_excluded=False),
                     lambda s:s.update(approvals_created=1)]:
            source=deepcopy(self.source);edit(source)
            with self.assertRaises(ValueError): self.run_screen(source)

    def test_old_price_or_file_proof_change_cannot_pass_current_inference(self):
        prices=deepcopy(self.prices);prices['sources'][0]['sha256']='changed'
        trace=screen.trivasc_trace(self.source['queries']['trivasc_detail']['rows'],prices,self.prior,'2026-09')
        self.assertFalse(trace['historical_inference_reconciled'])
        self.assertFalse(trace['operational_unit_approval_added'])

    def test_company_brand_lead_is_exact_and_never_a_quantity_multiplier(self):
        leads=screen.presentation_leads('BUPIRIGHT',self.company)
        self.assertEqual(leads[0]['printed_pack_count'],'1')
        self.assertEqual(leads[0]['evidence_id'],'PL2026-P2-T2-R7')
        self.assertEqual(screen.presentation_leads('BUPIRIGHT AMPULE',self.company),[])
        speeda=screen.presentation_leads('SPEEDA',self.company)
        self.assertEqual(speeda[0]['printed_pack_count'],'5')
        result=self.run_screen()
        row=next(r for r in result['series'] if r['label']=='SPEEDA' and r['raw_area']=='GOVERNMENT')
        self.assertFalse(row['operational_forecast_eligible'])
        self.assertEqual(result['history_threshold_sensitivity']['12'],0)


if __name__=='__main__':
    unittest.main()
