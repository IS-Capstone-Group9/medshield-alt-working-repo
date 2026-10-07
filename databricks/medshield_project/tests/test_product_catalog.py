import csv
import hashlib
import importlib.util
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import product_catalog as c
from review_catalog import enrich, financial_partition


def approved(label="EXAMPLE BOX 10", **overrides):
    row = dict.fromkeys(c.FIELDS, "N/A")
    row.update(raw_product=label, representative_raw_product=label, canonical_sku="SKU-001",
               canonical_title="Example box of 10", product_category="medicine", item_kind="physical_product",
               unit_of_measure="Box", packaging_unit="Box", pack_count="10", contained_unit="Piece",
               brand="Example", strength="10MG", forecast_eligible="false", evidence_source="test receipt",
               reviewed_by="test reviewer", reviewed_at="2026-09-27")
    for field in c.FIELDS:
        if field.endswith("status"):
            row[field] = "approved"
    row.update(overrides)
    return row


class CatalogTests(unittest.TestCase):
    def test_literal_concentrations_and_capacity(self):
        a = c.proposal_attributes("HYCLENS 0.2% WOUND SPRAY 60ML")
        b = c.proposal_attributes("HYCLENS WOUND SPRAY 2% 60ML")
        self.assertNotEqual(a["concentration"], b["concentration"])
        self.assertEqual(a["container_size"], "60ML")
        values = [c.proposal_attributes(t)["concentration"] for t in
                  ("EVAPROST 125MCG/ML", "EVAPROST 125MCG/0.5ML", "EVAPROST 250MCG/ML")]
        self.assertEqual(len(set(values)), 3)
        syringe = c.proposal_attributes("SYRINGE 10CC 100'S")
        self.assertEqual(syringe["container_size"], "10CC")
        self.assertEqual(syringe["pack_count"], "100")
        self.assertEqual(c.proposal_attributes("SYRINGE 10CC")["pack_count"], "")

    def test_unknown_is_not_wildcard_and_no_brand_model_or_package_merge(self):
        for field, value in (("strength", ""), ("strength", "20MG"), ("brand", "CHRISTINE"),
                             ("model", "IM70"), ("packaging_unit", "Piece"), ("pack_count", "50"),
                             ("packaging_unit", "Unknown"), ("bundle_specification", "different contents")):
            a, b = approved(), approved(**{field: value})
            self.assertFalse(c.compatibility(a,b)["compatible"], field)
            b["raw_product"] = "SECOND"
            with self.assertRaises(ValueError, msg=field):
                c.validate_master([a,b])

    def test_alias_ids_and_duplicate_representative_are_order_independent(self):
        a = approved()
        b = approved("EXAMPLE-BOX 10", representative_raw_product=a["raw_product"])
        for rows in ([a,b], [b,a]):
            master = c.validate_master(rows)
            self.assertEqual(c.resolve(b["raw_product"], "raw-b", master)["canonical_group_id"], "SKU:SKU-001")
            self.assertTrue(c.interchange(b["raw_product"], "raw-b", master)["is_duplicate"])
            self.assertFalse(c.interchange(a["raw_product"], "raw-a", master)["is_duplicate"])
            self.assertEqual(c.resolve("NEW #5 CHRISTINE", "new", master)["canonical_group_id"], "RAW:new")

    def test_category_approval_does_not_approve_identity_unit_or_forecast(self):
        row = approved(identity_status="needs_review", unit_status="needs_review", forecast_status="needs_review")
        master = c.validate_master([row])
        value = c.resolve(row["raw_product"], "raw", master)
        self.assertEqual(value["display_category"], "Medical")
        self.assertEqual(value["canonical_group_id"], "RAW:raw")
        self.assertIsNone(value["unit_of_measure"])
        self.assertFalse(value["forecast_eligible"])
        row["forecast_eligible"] = "true"
        with self.assertRaises(ValueError):
            c.validate_master([row])

    def test_medical_equipment_and_services_are_independent(self):
        device = approved("F6 FETAL MONITOR SINGLE", product_category="medical_equipment")
        service = approved("F6 REPAIR", product_category="medical_equipment", item_kind="service")
        self.assertEqual(c.resolve(device["raw_product"],"d",c.validate_master([device]))["display_category"], "Medical")
        mapped = c.resolve(service["raw_product"],"s",c.validate_master([service]))
        self.assertEqual(mapped["display_category"], "Medical")
        self.assertEqual(mapped["item_kind"], "service")
        self.assertFalse(mapped["forecast_eligible"])
        self.assertEqual(c.proposal_attributes("GUEDEL AIRWAY #5 (ORMED)")["item_kind"], "unknown")

    def test_ambiguous_joins_and_unsubstantiated_approvals_rejected(self):
        row = approved()
        for rows in ([row,row], [approved(evidence_source="")], [approved(representative_raw_product="MISSING")]):
            with self.assertRaises(ValueError):
                c.validate_master(rows)

    def test_import_cannot_grant_approval_or_delete_records(self):
        rows = c.import_proposals([{"raw_title":"Example", "canonical_title":"Clean", "category":"Medical",
                                    "canonical_group_id":"SKU:001", "identity_status":"approved", "is_duplicate":True}])
        self.assertEqual(rows[0]["identity_status"], "proposed")
        self.assertEqual(c.interchange("Example","key",c.validate_master(rows))["canonical_group_id"], "RAW:key")
        self.assertFalse(c.interchange("Example","key",c.validate_master(rows))["is_duplicate"])

    def test_financial_values_eligibility_and_provenance_survive_resolution(self):
        base = dict(product_raw="EXAMPLE BOX 10", normalized_product="EXAMPLE BOX 10", product_key="raw",
                    month_start="2025-01-01", calendar_year="2025", quantity="10", is_adjusted_source="true",
                    net_sales="100.123456", gross_sales="110.123456", gross_margin_amount="10.000000",
                    total_acquisition_cost="90.123456", is_net_sales_eligible="true", is_gross_sales_eligible="true",
                    is_gross_margin_eligible="true", is_acquisition_cost_eligible="true")
        facts = [{**base,"source_record_id":"1"},{**base,"source_record_id":"2","net_sales":"-10.010001"},
                 {**base,"source_record_id":"3","normalized_product":"New unknown","product_key":"new","month_start":"2024-12-01"}]
        mapped = enrich(facts, c.validate_master([approved()]))
        self.assertEqual(financial_partition(facts), financial_partition(mapped))
        self.assertEqual(len(mapped), len(facts))
        self.assertEqual(mapped[0]["transaction_evidence"], "adjusted_estimated_source")
        self.assertEqual(mapped[2]["canonical_group_id"], "RAW:new")
        self.assertTrue(all(not r["forecast_eligible"] for r in mapped))
        with self.assertRaises(ValueError):
            enrich([facts[0],facts[0]],{})

    def test_preparation_master_and_deployed_copy_identical_and_valid(self):
        source = ROOT / "references/product_master_review.csv"
        copy = ROOT.parent / "medshield_reference_csv/medshield_reference_csv/product_master_review.csv"
        self.assertEqual(source.read_bytes(), copy.read_bytes())
        with source.open(encoding="utf-8-sig", newline="") as stream:
            reader = csv.DictReader(stream)
            self.assertEqual(tuple(reader.fieldnames), c.FIELDS)
            rows = list(reader)
        self.assertTrue(rows)
        self.assertEqual(len(c.validate_master(rows)), len(rows))

    def test_transaction_verification_is_separate_and_source_bound(self):
        source = dict(source_record_id="record", source_file_sha256="a"*64, is_adjusted_source=True)
        review = dict(source_record_id="record", source_file_sha256="a"*64, verification_status="approved",
                      verified_detail_scope="product_identity_and_quantity", evidence_source="signed receipt",
                      reviewed_by="test reviewer", reviewed_at="2026-09-27")
        self.assertEqual(c.transaction_evidence(source,{})[0], "adjusted_estimated_source")
        reviews = c.validate_transaction_evidence([review])
        self.assertEqual(c.transaction_evidence(source,reviews)[0], "independently_verified_detail")
        self.assertIn("signed receipt",c.transaction_evidence(source,reviews)[1])
        self.assertTrue(source["is_adjusted_source"])
        with self.assertRaises(ValueError):
            c.transaction_evidence({**source,"source_file_sha256":"b"*64},reviews)
        with self.assertRaises(ValueError):
            c.validate_transaction_evidence([review,review])

    def test_gold_helper_hash_and_evidence_guard(self):
        text = (ROOT/"03_sales_gold.py").read_text(encoding="utf-8")
        self.assertIn(hashlib.sha256((ROOT/"product_catalog.py").read_bytes()).hexdigest(),text)
        guard = text.split('.withColumn("is_approved_medical_demand_eligible",',1)[1].split('.withColumn(',1)[0]
        self.assertIn('F.col("transaction_evidence").isin("original_source_detail", "independently_verified_detail")', guard)
        self.assertIn('F.col("item_kind") == "physical_product"',guard)


if __name__ == "__main__":
    unittest.main()
