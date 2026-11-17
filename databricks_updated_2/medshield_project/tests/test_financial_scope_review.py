"""Financial denominators, partition integrity and conservative overlap screening."""
import ast
from copy import deepcopy
from datetime import date
from decimal import Decimal
import importlib.util
import json
from pathlib import Path
import unittest

PROJECT = Path(__file__).resolve().parents[1]


def load(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


review = load(PROJECT / 'financial_scope_review.py', 'financial_scope_test')


def row(identity, net='100', contract=False, cost=None):
    net = Decimal(net)
    cost = Decimal(cost) if cost is not None else None
    return dict(source_record_id=identity, source_workbook='medshield_data_2024.csv',
                date_delivered=date(2024, 1, 1), area=None if contract else 'AREA',
                dr_number=None if contract else 'DR 1', normalized_product=None if contract else 'ITEM',
                record_kind='contract_summary' if contract else 'itemized_sale',
                recorded_quantity=None if contract else Decimal(1), physical_quantity=None,
                gross_sales=net, discount_amount=Decimal(0), net_sales=net, acquisition_cost=cost,
                gross_margin_amount=None if cost is None else net-cost,
                is_net_sales_technically_eligible=True,
                is_acquisition_cost_technically_eligible=cost is not None,
                is_gross_margin_technically_eligible=cost is not None,
                forecast_eligible=False, source_unit_approved=False, financial_release_approved=False,
                quality_rule_codes_json='[]')


def ledger(rows, dr='DR 1'):
    return [dict(source_record_id=item['source_record_id'], source_workbook=item['source_workbook'],
                 date_delivered=item['date_delivered'], area='AREA', dr_number=dr,
                 is_analysis_candidate=True) for item in rows]


class FinancialScopeTests(unittest.TestCase):
    def test_positive_share_and_signed_returns_are_distinct(self):
        items = [row('a', cost='60'), row('b', net='-50', cost='-30')]
        contracts = [row('c', net='200', contract=True)]
        result = review.financial_scope_report(items, contracts, items+contracts, ledger(items+contracts))
        self.assertEqual('250', result['controls']['financial']['signed_net_php'])
        self.assertEqual('300', result['controls']['financial']['positive_net_php'])
        self.assertEqual('-50', result['controls']['financial']['signed_negative_net_php'])
        self.assertEqual('33.33', result['candidate_itemized_positive_value_share_pct'])
        self.assertEqual('40.00', result['margin_same_population']['reported_margin_pct'])
        self.assertFalse(result['publication_ready'])

    def test_zero_positive_denominator_is_unavailable(self):
        items = [row('a', net='-5')]
        result = review.financial_scope_report(items, [], items, ledger(items))
        self.assertIsNone(result['candidate_itemized_positive_value_share_pct'])
        self.assertIsNone(result['margin_same_population']['reported_margin_pct'])

    def test_equal_document_and_amount_is_only_a_possible_match(self):
        items, contracts = [row('a')], [row('c', contract=True)]
        result = review.financial_scope_report(items, contracts, items+contracts, ledger(items+contracts))
        self.assertEqual(1, result['contract_document_screen']['shared_candidate_document_and_net_amount_match'])
        self.assertEqual('c', result['contract_review_case_refs'][0]['source_record_id'])
        self.assertNotIn('dr_number', result['contract_review_case_refs'][0])
        self.assertEqual('NOT_ESTABLISHED_BY_AUTOMATED_SCREEN', result['contract_overlap_clearance'])
        self.assertEqual(1, result['contracts_requiring_supported_financial_scope_disposition'])

    def test_missing_or_unmatched_document_fields_do_not_clear_contracts(self):
        items, contracts = [row('a')], [row('c', contract=True), row('d', contract=True)]
        evidence = ledger(items+contracts)
        evidence[1]['dr_number'] = None
        evidence[2]['dr_number'] = 'OTHER DR'
        result = review.financial_scope_report(items, contracts, items+contracts, evidence)
        self.assertEqual(1, result['contract_document_screen']['missing_candidate_document_fields'])
        self.assertEqual(1, result['contract_document_screen']['no_itemized_rows_with_same_candidate_document_key'])
        self.assertFalse(result['business_financial_release_approved'])

    def test_repeated_business_observations_are_reported_and_preserved(self):
        items = [row('a'), row('b')]
        result = review.financial_scope_report(items, [], items, ledger(items))
        self.assertEqual(2, result['controls']['itemized']['records'])
        self.assertEqual(1, result['possible_repeated_itemized_groups'])
        self.assertEqual(1, result['possible_repeated_itemized_occurrences_beyond_first'])

    def test_missing_partition_or_changed_financial_values_fail(self):
        items, contracts = [row('a')], [row('c', contract=True)]
        with self.assertRaisesRegex(ValueError, 'population'):
            review.financial_scope_report(items, contracts, items, ledger(items+contracts))
        combined = deepcopy(items+contracts)
        combined[0]['net_sales'] = Decimal(999)
        with self.assertRaisesRegex(ValueError, 'row values'):
            review.financial_scope_report(items, contracts, combined, ledger(items+contracts))

    def test_margin_population_and_independent_approvals_fail_closed(self):
        item = row('a', cost='60')
        item['is_acquisition_cost_technically_eligible'] = False
        with self.assertRaisesRegex(ValueError, 'Margin numerator'):
            review.financial_scope_report([item], [], [item], ledger([item]))
        item = row('a')
        item['forecast_eligible'] = True
        with self.assertRaisesRegex(ValueError, 'approval'):
            review.financial_scope_report([item], [], [item], ledger([item]))

    def test_generated_notebook_is_read_only_and_separated_into_cells(self):
        renderer = load(PROJECT / 'render_financial_scope_review.py', 'financial_review_renderer')
        source = renderer.render()
        self.assertEqual(source, (PROJECT / 'maintenance/20261026_review_original_financial_scope.py').read_text(encoding='utf-8'))
        cells = source.split('# COMMAND ----------')
        self.assertGreaterEqual(len(cells), 8)
        for cell in cells:
            compile(cell, 'financial-review-cell', 'exec')
        tree = ast.parse(source)
        self.assertFalse(any(isinstance(node, ast.Attribute) and node.attr in
                             {'write','writeTo','saveAsTable','write_bytes','write_text','unlink'} for node in ast.walk(tree)))
        self.assertIn("option('versionAsOf', 0)", source)

    def test_real_original_source_gold_preflight_reconciles(self):
        pipeline = load(PROJECT / 'original_source_20261026/03_original_sales_gold_20261026.py', 'financial_review_real_pipeline')
        bundle = pipeline.original_bundle(PROJECT.parent / 'medshield_project_csv')
        assessed = pipeline.assess_bundle(bundle['raw'])
        package = PROJECT.parent / 'category_releases/category_b160d6aad4376d64/category_acceptance.json'
        receipt = json.loads(package.read_text(encoding='utf-8'))
        gold = pipeline.gold_candidates(assessed, receipt, bundle['files'])
        report = review.financial_scope_report(gold['itemized'], gold['contracts'], gold['financial'], assessed)
        self.assertEqual(40523, report['controls']['financial']['records'])
        self.assertEqual(885, report['controls']['financial']['ineligible_records'])
        self.assertEqual(Decimal('756345601.48'), Decimal(report['controls']['financial']['signed_net_php']))
        self.assertEqual(352, sum(report['contract_document_screen'].values()))
        self.assertFalse(report['publication_ready'])
        type(self).full_preflight_report = report


if __name__ == '__main__':
    unittest.main()
