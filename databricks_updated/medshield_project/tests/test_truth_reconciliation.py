import importlib.util
from pathlib import Path
from decimal import Decimal
import unittest

path=Path(__file__).resolve().parents[1]/'truth_reconciliation.py'
spec=importlib.util.spec_from_file_location('truth',path)
truth=importlib.util.module_from_spec(spec); spec.loader.exec_module(truth)

def row(key,product='MEDICINE 10MG',quantity='10',margin='.33'):
    return dict(source_record_id=key,source_workbook='medshield_data_2025.csv',source_row_number=1,
                is_analysis_candidate=True,product=product,quantity=Decimal(quantity),
                date_delivered='2025-01-01',area='QUEZON',dr_number='DR1',net_sales=Decimal('100'),
                gross_margin_amount=Decimal('33'),margin_pct=Decimal(margin))

class TruthTests(unittest.TestCase):
    def test_original_itemized_is_retained_without_physical_unit_inference(self):
        self.assertEqual(truth.match_originals([row('original')],[row('old')]),[])
    def test_changed_product_quantity_or_money_is_excluded(self):
        for field,value in [('product','MADE UP MEDICINE'),('quantity',Decimal('20')),('net_sales',Decimal('200'))]:
            changed=row('old'); changed[field]=value
            self.assertEqual(len(truth.match_originals([row('original')],[changed])),1)
    def test_contract_is_not_an_itemized_product(self):
        self.assertEqual(len(truth.match_originals([row('original','PAGBILAO # 100')],[row('old','PAGBILAO # 100')])),1)
    def test_multiset_prevents_extra_identical_children(self):
        excluded=truth.match_originals([row('original')],[row('one'),row('two')])
        self.assertEqual([r['source_record_id'] for r in excluded],['two'])
    def test_rejected_original_cannot_license_adjusted_observation(self):
        original=row('original'); original['is_analysis_candidate']=False
        self.assertEqual(len(truth.match_originals([original],[row('old')])),1)
    def test_displayed_margin_rounding_does_not_change_source_amounts(self):
        self.assertEqual(truth.match_originals([row('original',margin='.33')],[row('old',margin='.3300001')]),[])
    def test_hashtag_size_is_not_a_contract(self):
        self.assertFalse(truth.CONTRACT.search('SURGICAL BLADE # 10'))
        self.assertTrue(truth.CONTRACT.search('QMC # 1000'))

if __name__=='__main__': unittest.main()
