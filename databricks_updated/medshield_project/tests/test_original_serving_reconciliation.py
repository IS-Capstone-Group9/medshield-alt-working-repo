"""Prove multiset/source/finance boundaries without asserting live reconciliation."""
from copy import deepcopy
from datetime import date
from decimal import Decimal
import importlib.util
from pathlib import Path
import unittest

PROJECT = Path(__file__).resolve().parents[1]


def load(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


core = load(PROJECT / 'original_serving_reconciliation.py', 'original_reconcile_test')


def observation(identity, year=2024, product='ITEM', candidate=True, amount='100'):
    return dict(source_record_id=identity, source_workbook=f'medshield_data_{year}.csv',
                data_source_year=year, date_delivered=date(year, 1, 1), area='AREA', product=product,
                dr_number='DR 1', quantity=Decimal('1'), quantity_primary_candidate=Decimal('1'),
                quantity_secondary_candidate=None, unit_selling_price=Decimal(amount),
                gross_sales=Decimal(amount), discount_amount=Decimal(0), net_sales=Decimal(amount),
                unit_acquisition_cost=Decimal(50), total_acquisition_cost=Decimal(50),
                gross_margin_amount=Decimal(amount)-Decimal(50), discount_rate=Decimal(0),
                is_analysis_candidate=candidate, disposition='KEEP' if candidate else 'REVIEW_POSSIBLE_DUPLICATE',
                quality_rule_codes=[], is_net_sales_eligible=True, is_contract_label=False)


is_contract = lambda label: label == 'CONTRACT'


class ReconciliationTests(unittest.TestCase):
    def test_contract_bridge_is_reported_without_allocating_or_approving(self):
        original = [observation('a'), observation('b', product='OTHER', amount='20'),
                    observation('c', product='CONTRACT', amount='200')]
        served = [observation('different-source-hash-key')]
        result = core.reconcile_rows(original, served, is_contract)
        self.assertEqual(1, result['exact_original_candidate_matches'])
        self.assertEqual(1, result['original_itemized_candidates_not_in_serving'])
        self.assertEqual('120', result['original_itemized_technical_net_php'])
        self.assertEqual('200', result['original_contract_technical_net_php'])
        self.assertEqual('20', result['itemized_technical_minus_serving_net_php'])
        self.assertIsNone(result['contract_quantity'])
        self.assertEqual(0, result['approvals_added'])
        self.assertEqual(0, result['warehouse_writes'])

    def test_repeated_observations_are_consumed_only_once_each(self):
        original = [observation('a'), observation('b')]
        result = core.reconcile_rows(original, [observation('x'), observation('y'), observation('z')], is_contract)
        self.assertEqual(2, result['exact_original_candidate_matches'])
        self.assertEqual(1, result['unmatched_serving_records'])
        self.assertEqual(0, result['original_itemized_candidates_not_in_serving'])

    def test_non_candidate_matches_remain_separate_from_clean_candidates(self):
        result = core.reconcile_rows([observation('a', candidate=False)], [observation('x')], is_contract)
        self.assertEqual(0, result['exact_original_candidate_matches'])
        self.assertEqual(1, result['serving_matches_original_non_candidate'])
        self.assertEqual({'REVIEW_POSSIBLE_DUPLICATE': 1}, result['matched_noncandidate_dispositions'])

    def test_cross_file_null_and_zero_cannot_be_treated_as_same_evidence(self):
        a, b = observation('a'), observation('b')
        b['source_workbook'] = 'medshield_data_2025.csv'
        self.assertNotEqual(core.signature(a), core.signature(b))
        b = deepcopy(a)
        b['quantity_secondary_candidate'] = Decimal(0)
        self.assertNotEqual(core.signature(a), core.signature(b))

    def test_decimal_formatting_and_margin_ratio_do_not_create_false_differences(self):
        a, b = observation('a'), observation('b')
        b['net_sales'] = Decimal('100.000000')
        a['margin_pct'], b['margin_pct'] = Decimal('0.5'), Decimal('0.5000001')
        self.assertEqual(core.signature(a), core.signature(b))

    def test_eligibility_difference_is_visible_despite_equal_recorded_amounts(self):
        original = observation('a')
        original['quality_rule_codes'] = ['NET_VALUE_FORMULA_MISMATCH']
        result = core.reconcile_rows([original], [observation('b')], is_contract)
        self.assertEqual(1, result['matched_technical_vs_serving_eligibility_differences'])
        self.assertEqual('-100', result['itemized_technical_minus_serving_net_php'])

    def test_duplicate_source_keys_and_contracts_in_serving_are_rejected(self):
        with self.assertRaisesRegex(ValueError, 'Duplicate original'):
            core.reconcile_rows([observation('a'), observation('a')], [], is_contract)
        served = observation('b')
        served['is_contract_label'] = True
        with self.assertRaisesRegex(ValueError, 'Unexpected contract'):
            core.reconcile_rows([], [served], is_contract)

    def test_generated_notebook_matches_pure_source_and_delivery(self):
        renderer = load(PROJECT / 'render_original_serving_reconciliation.py', 'original_reconcile_renderer')
        generated = PROJECT / 'maintenance/20261026_reconcile_original_vs_serving.py'
        self.assertEqual(renderer.render(), generated.read_text(encoding='utf-8'))
        delivery = PROJECT.parents[1] / 'databricks_updated_2/medshield_project/maintenance' / generated.name
        self.assertEqual(generated.read_bytes(), delivery.read_bytes())

    def test_real_originals_are_assessed_together_with_no_external_helpers(self):
        notebook = load(PROJECT / 'maintenance/20261026_reconcile_original_vs_serving.py', 'real_original_reconcile')
        assessed, manifest, dataset, contract_detector = notebook.assess_uploaded_originals(PROJECT.parent / 'medshield_project_csv')
        result = notebook.reconcile_rows(assessed, [], contract_detector)
        self.assertEqual(10, len(manifest))
        self.assertEqual(62065, result['original_physical_lines'])
        self.assertEqual(40171, result['original_itemized_candidates'])
        self.assertEqual(352, result['original_contract_candidates'])
        self.assertEqual(Decimal('118330249.95'), Decimal(result['original_contract_technical_net_php']))
        self.assertEqual(Decimal('638015351.53'), Decimal(result['original_itemized_technical_net_php']))
        self.assertEqual(40171, result['original_itemized_candidates_not_in_serving'])
        self.assertEqual(0, result['serving_records'])  # Explicit empty fixture, not live evidence.


if __name__ == '__main__':
    unittest.main()
