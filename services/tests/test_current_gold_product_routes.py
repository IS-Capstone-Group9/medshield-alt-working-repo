from copy import deepcopy
import unittest
from services.analytics_service.current_gold_product_routes import adapt_current_gold


def fixture():
    release = dict(dataset_id="data", policy_version="policy", product_master_sha256="master", area_mapping_sha256="area", fact_delta_version=20)
    def row(key, count, amount):
        return dict(product_key=key, records="2", financial_rows=str(count), adjusted_records="1",
                    net_sales_php=amount, source_labels=[key], categories=["medicine"], category_statuses=["approved"],
                    identity_statuses=["needs_review"], canonical_skus=[], units=[], item_kinds=[], forecast_flags=["false"])
    payload = dict(schema_version="current-gold-product-input.v1", source_release=release,
                   source_release_after=deepcopy(release), products=[row("Box", 2, "100.25"), row("Piece", 1, "-5.25"), row("Unknown", 0, None)],
                   totals=dict(records="6", product_keys="3", financial_product_keys="2", net_sales_php="95.00"))
    return payload, release


class CurrentGoldRoutesTests(unittest.TestCase):
    def test_distinct_populations_exact_money_and_null_ineligible(self):
        payload, release = fixture(); result = adapt_current_gold(payload, release)
        self.assertEqual((result['review_products'], result['financial_products'], result['review_only_products']), (3, 2, 1))
        self.assertEqual(result['eligible_net_sales_php'], '95.00')
        rows={p['product_key']:p for p in result['products']}
        self.assertEqual(rows['Piece']['recorded_net_sales_php'],'-5.25')
        self.assertIsNone(rows['Unknown']['recorded_net_sales_php'])
        self.assertIsNone(rows['Unknown']['source_evidence']['eligible_net_sales_php'])
        self.assertNotIn('eligible_recorded_net_sales',rows['Unknown']['descriptive_methods'])

    def test_no_mutation_or_presentation_merge(self):
        payload, release = fixture(); before = deepcopy(payload)
        result = adapt_current_gold(payload, release)
        self.assertEqual(payload,before);self.assertEqual({p['product_key'] for p in result['products']},{'Box','Piece','Unknown'})

    def test_missing_reviews_cannot_be_inferred_from_category_or_forecast_flag(self):
        payload, release=fixture();payload['products'][0].update(canonical_skus=['sku'],units=['Box'],identity_statuses=['approved'],item_kinds=['physical_product'],forecast_flags=['true'])
        result=adapt_current_gold(payload,release)
        self.assertTrue(all(p['quantity_model_status']=='blocked' and not p['publication_approved'] for p in result['products']))
        row=next(p for p in result['products'] if p['product_key']=='Box')
        self.assertIn('historical_sales_unit_not_approved',row['quantity_model_blockers'])
        self.assertIn('physical_item_kind_not_approved',row['quantity_model_blockers'])

    def test_mismatched_or_missing_release_rejected(self):
        for target in ['source_release_after','source_release']:
            payload,release=fixture();payload[target]=dict(release,fact_delta_version=21)
            with self.assertRaises(ValueError):adapt_current_gold(payload,release)

    def test_duplicate_keys_rejected(self):
        payload,release=fixture();payload['products'][1]['product_key']='Box'
        with self.assertRaises(ValueError):adapt_current_gold(payload,release)

    def test_ambiguous_metadata_rejected_instead_of_max_selection(self):
        for field in ['categories','units','canonical_skus','identity_statuses','source_labels','forecast_flags']:
            payload,release=fixture();payload['products'][0][field]=['a','b']
            with self.assertRaises(ValueError):adapt_current_gold(payload,release)

    def test_financial_reconciliation_mismatch_rejected(self):
        for field,value in [('records','7'),('product_keys','4'),('financial_product_keys','3'),('net_sales_php','96')]:
            payload,release=fixture();payload['totals'][field]=value
            with self.assertRaises(ValueError):adapt_current_gold(payload,release)

    def test_invalid_and_nonfinite_money_rejected(self):
        for value in [None,'NaN','Infinity','oops',True]:
            payload,release=fixture();payload['products'][0]['net_sales_php']=value
            with self.assertRaises(ValueError):adapt_current_gold(payload,release)

    def test_invalid_counts_and_ineligible_zero_rejected(self):
        for field,value in [('records','0'),('financial_rows','3'),('adjusted_records','3'),('records',True),('records','2.0')]:
            payload,release=fixture();payload['products'][0][field]=value
            with self.assertRaises(ValueError):adapt_current_gold(payload,release)
        payload,release=fixture();payload['products'][2]['net_sales_php']='0'
        with self.assertRaises(ValueError):adapt_current_gold(payload,release)

    def test_unversioned_review_bridge_fields_rejected(self):
        payload,release=fixture();payload['products'][0]['unit_status']='approved'
        with self.assertRaises(ValueError):adapt_current_gold(payload,release)


if __name__=='__main__':unittest.main()
