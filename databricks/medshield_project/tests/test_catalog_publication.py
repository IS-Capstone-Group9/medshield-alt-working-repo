import copy
import csv
import json
from pathlib import Path
import sys
import unittest

PROJECT = Path(__file__).resolve().parents[1]
ROOT = PROJECT.parents[1]
sys.path.insert(0, str(PROJECT))
from catalog_publication import (validate_contract, validate_draft_rows, validate_package_contract,
    validate_publication_rows, validate_category_acceptance, validate_category_rows,
    expected_category_metadata, validate_category_transition_rows, CATEGORY_MUTABLE_FIELDS)


class DraftPublicationTests(unittest.TestCase):
    def setUp(self):
        self.contract = json.loads((PROJECT / "references/catalog_publication.json").read_text(encoding="utf-8"))

    def test_exact_local_artifacts_and_complete_source_receipt(self):
        receipt = validate_package_contract(ROOT, self.contract)
        self.assertTrue(receipt.is_file())
        self.assertEqual(self.contract["baseline_fact_version"], 19)
        self.assertEqual(len(self.contract["immutable_fields"]), 137 if self.contract['mode']=='category_acceptance_only' else 140)

    def test_financial_lineage_quality_and_quantity_cannot_be_made_mutable(self):
        for field in ("unit_selling_price", "margin_pct", "raw_csv_line", "quantity_secondary_raw", "quality_rule_codes", "source_file_sha256"):
            with self.subTest(field=field):
                contract = copy.deepcopy(self.contract)
                contract["immutable_fields"].remove(field)
                contract["mutable_fields"].append(field)
                with self.assertRaises(ValueError):
                    validate_contract(contract)

    def test_missing_field_is_rejected_by_receipt_schema(self):
        contract = copy.deepcopy(self.contract)
        contract["predecessor_columns"].remove("discount_rate")
        contract["immutable_fields"].remove("discount_rate")
        with self.assertRaises(ValueError):
            validate_package_contract(ROOT, contract)

    def test_added_field_is_rejected_by_receipt_schema(self):
        contract = copy.deepcopy(self.contract)
        contract["predecessor_columns"].append("unexpected_sales_adjustment")
        contract["immutable_fields"].append("unexpected_sales_adjustment")
        with self.assertRaises(ValueError):
            validate_package_contract(ROOT, contract)

    def test_source_receipt_and_product_bytes_are_bound(self):
        for key in ("source_receipt_sha256", "product_master_sha256"):
            with self.subTest(key=key):
                contract = copy.deepcopy(self.contract)
                if key == "source_receipt_sha256":
                    contract[key] = "0" * 64
                else:
                    contract["proposed"][key] = "0" * 64
                with self.assertRaises(ValueError):
                    validate_package_contract(ROOT, contract)

    def test_predecessor_and_nonmaster_changes_are_rejected(self):
        contract = copy.deepcopy(self.contract)
        contract["baseline_fact_version"] = 16
        with self.assertRaises(ValueError):
            validate_contract(contract)
        contract = copy.deepcopy(self.contract)
        contract["proposed"]["transaction_evidence_sha256"] = "0" * 64
        with self.assertRaises(ValueError):
            validate_contract(contract)

    def test_draft_cannot_approve_independent_decisions_or_forecasts(self):
        for field in ("category_status", "identity_status", "unit_status", "item_kind_status", "mapping_status", "forecast_status"):
            with self.subTest(field=field):
                with self.assertRaises(ValueError):
                    validate_draft_rows([{field: "approved", "forecast_eligible": "false"}])
        with self.assertRaises(ValueError):
            validate_draft_rows([{"forecast_eligible": "true"}])

    def test_canonical_master_matches_its_explicit_publication_mode(self):
        with (PROJECT / "references/product_master_review.csv").open(encoding="utf-8-sig", newline="") as source:
            rows = list(csv.DictReader(source))
        acceptance=json.loads((ROOT/self.contract['category_acceptance_path']).read_text(encoding='utf-8')) if self.contract['mode']=='category_acceptance_only' else None
        validate_publication_rows(rows,self.contract,acceptance)
        self.assertEqual(len(rows), 4561)


class CategoryOnlyPublicationTests(unittest.TestCase):
    def setUp(self):
        self.contract=json.loads((PROJECT/'references/catalog_publication.json').read_text(encoding='utf-8'))
        if self.contract['mode']!='category_acceptance_only':
            self.skipTest('Category acceptance package not prepared yet')
        self.receipt=json.loads((ROOT/self.contract['category_acceptance_path']).read_text(encoding='utf-8'))
        with (PROJECT/'references/product_master_review.csv').open(encoding='utf-8-sig',newline='') as f:
            self.rows=list(csv.DictReader(f))

    def test_receipt_exactly_covers_accepted_reporting_population(self):
        decisions=validate_category_rows(self.rows,self.receipt,self.contract)
        self.assertEqual(len(decisions),4561)
        self.assertTrue(any(d['decision']=='accepted_unclassified' for d in decisions.values()))

    def test_missing_duplicate_or_changed_category_decision_rejected(self):
        for mutation in ('missing','duplicate','wrong_category','label'):
            receipt=copy.deepcopy(self.receipt)
            if mutation=='missing':receipt['decisions'].pop()
            elif mutation=='duplicate':receipt['decisions'].append(receipt['decisions'][0])
            elif mutation=='wrong_category':receipt['decisions'][0]['product_category']='non_medical'
            else:receipt['decisions'][0]['normalized_product']='OTHER LABEL'
            with self.subTest(mutation=mutation),self.assertRaises(ValueError):
                validate_category_rows(self.rows,receipt,self.contract)

    def test_user_directed_record_cannot_fabricate_ceo_or_model_approval(self):
        for field in ('ceo_signed_off','business_release_approval','forecast_approval','sku_or_unit_approval'):
            receipt=copy.deepcopy(self.receipt);receipt[field]=True
            with self.subTest(field=field),self.assertRaises(ValueError):
                validate_category_acceptance(receipt,self.contract)
        receipt=copy.deepcopy(self.receipt);receipt['decisions'][0]['reviewed_by']='Unknown reviewer'
        with self.assertRaises(ValueError):validate_category_acceptance(receipt,self.contract)
        receipt=copy.deepcopy(self.receipt);receipt.pop('sku_or_unit_approval')
        with self.assertRaises(ValueError):validate_category_acceptance(receipt,self.contract)

    def test_category_acceptance_cannot_approve_independent_master_dimensions(self):
        for field,value in [('canonical_sku','FAKE-SKU'),('identity_status','approved'),('item_kind_status','approved'),('unit_status','approved'),('forecast_status','approved'),('mapping_status','approved'),('forecast_eligible','true')]:
            rows=copy.deepcopy(self.rows);rows[0][field]=value
            with self.subTest(field=field),self.assertRaises(ValueError):
                validate_category_rows(rows,self.receipt,self.contract)

    def test_fixed_mutable_set_excludes_every_quantity_and_financial_gate(self):
        self.assertEqual(set(self.contract['mutable_fields']),CATEGORY_MUTABLE_FIELDS)
        for field in ('quantity','net_sales','is_net_sales_eligible','is_product_ranking_candidate','is_positive_delivery_quantity_eligible','is_provisional_product_demand_eligible','forecast_eligible','canonical_sku'):
            contract=copy.deepcopy(self.contract);contract['mutable_fields'].append(field);contract['immutable_fields'].remove(field)
            with self.subTest(field=field),self.assertRaises(ValueError):validate_contract(contract)

    def test_exact_transition_oracle_preserves_transaction_values_and_gates(self):
        receipt=copy.deepcopy(self.receipt);receipt['decisions']=receipt['decisions'][:1]
        decision=receipt['decisions'][0]
        before={f:None for f in self.contract['predecessor_columns']}
        before.update(source_record_id='source1',normalized_product=decision['normalized_product'],product_scope_status='PRODUCT_MASTER_PENDING',is_contract_label=False,quantity='3',net_sales='120.00',is_product_ranking_candidate=True,is_positive_delivery_quantity_eligible=True,is_provisional_product_demand_eligible=True)
        after={**before,**expected_category_metadata(before,decision),'product_master_sha256':self.contract['proposed']['product_master_sha256'],'gold_published_at':'2026-10-08T10:00:00Z'}
        validate_category_transition_rows([before],[after],receipt,self.contract)
        for field,value in [('quantity','4'),('net_sales','121.00'),('is_provisional_product_demand_eligible',False),('product_category','bogus')]:
            changed={**after,field:value}
            with self.subTest(field=field),self.assertRaises(ValueError):validate_category_transition_rows([before],[changed],receipt,self.contract)

    def test_unclassified_and_contract_reporting_scopes_do_not_assert_physical_identity(self):
        decision=copy.deepcopy(self.receipt['decisions'][0]);decision.update(product_category='unclassified',decision='accepted_unclassified')
        predecessor={'normalized_product':decision['normalized_product'],'product_scope_status':'PRODUCT_MASTER_PENDING','is_contract_label':False}
        self.assertEqual(expected_category_metadata(predecessor,decision)['display_category'],'Unclassified')
        self.assertEqual(expected_category_metadata(predecessor,decision)['product_scope_status'],'UNCLASSIFIED_APPROVED')
        predecessor.update(product_scope_status='CONTRACT_LABEL_CANDIDATE',is_contract_label=True)
        self.assertEqual(expected_category_metadata(predecessor,decision)['product_scope_status'],'CONTRACT_LABEL_CANDIDATE')


if __name__ == "__main__":
    unittest.main()
