"""Execute Gold's actual provisional guard with independently specified fixtures.

The small frame adapter evaluates this guard's column predicate only; it is not
Spark integration. It detects the notebook's choice of current vs original scope.
"""
import ast
from pathlib import Path
import unittest

GOLD=Path(__file__).resolve().parents[1]/'03_sales_gold.py'


class Column:
    def __init__(self,evaluate):self.evaluate=evaluate
    def __or__(self,other):return Column(lambda row:self.evaluate(row) or other.evaluate(row))
    def __ne__(self,value):return Column(lambda row:row[self.name]!=value)
    def __le__(self,value):return Column(lambda row:row[self.name]<=value)


class Functions:
    @staticmethod
    def col(name):
        column=Column(lambda row:row[name]);column.name=name;return column


class Frame:
    def __init__(self,rows):self.rows=rows
    def filter(self,predicate):
        if isinstance(predicate,str):
            if predicate!='is_provisional_product_demand_eligible = true':raise ValueError(predicate)
            return Frame([r for r in self.rows if r['is_provisional_product_demand_eligible'] is True])
        return Frame([r for r in self.rows if predicate.evaluate(r)])
    def count(self):return len(self.rows)


def run_guard(previous,current,category_decisions):
    tree=ast.parse(GOLD.read_text(encoding='utf-8'))
    nodes=[]
    for node in tree.body:
        if isinstance(node,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='provisional_demand_guard' for t in node.targets):
            nodes.append(node)
        elif isinstance(node,ast.Assert):
            expression=ast.unparse(node.test)
            if 'is_provisional_product_demand_eligible = true' in expression:
                nodes.append(node)
    assert any(isinstance(n,ast.Assert) for n in nodes),'Notebook provisional assertion is missing'
    exec(compile(ast.Module(body=nodes,type_ignores=[]),str(GOLD),'exec'),
         {'F':Functions,'fact':Frame(current),'catalog_base':Frame(previous),'category_decisions':category_decisions})


def source(**changes):
    row={'is_provisional_product_demand_eligible':True,'product_scope_status':'PRODUCT_MASTER_PENDING',
         'is_low_trust_2017':False,'is_historical_backfill_candidate':False,'quantity':3}
    return {**row,**changes}


class GoldProvisionalGuardTests(unittest.TestCase):
    def test_category_acceptance_preserves_existing_true_gate_for_changed_reporting_scope(self):
        previous=source()
        for scope in ('MEDICINE_APPROVED','MEDICAL_SUPPLY_APPROVED','MEDICAL_EQUIPMENT_APPROVED','NON_MEDICAL_APPROVED','UNCLASSIFIED_APPROVED'):
            with self.subTest(scope=scope):
                run_guard([previous],[{**previous,'product_scope_status':scope}],{'reviewed':True})

    def test_ordinary_draft_scope_cannot_bypass_pending_requirement(self):
        for scope in ('MEDICINE_APPROVED','UNCLASSIFIED_APPROVED','CONTRACT_LABEL_CANDIDATE','HASHTAG_LABEL_REQUIRES_REVIEW'):
            with self.subTest(scope=scope),self.assertRaises(AssertionError):
                current=source(product_scope_status=scope)
                run_guard([source()],[current],None)

    def test_ordinary_guard_uses_current_pending_scope_rather_than_predecessor(self):
        previous=source(product_scope_status='CONTRACT_LABEL_CANDIDATE')
        run_guard([previous],[source()],None)

    def test_ineligible_predecessor_is_rejected_even_when_current_reporting_scope_is_accepted(self):
        for invalid in ({'product_scope_status':'CONTRACT_LABEL_CANDIDATE'},
                        {'product_scope_status':'HASHTAG_LABEL_REQUIRES_REVIEW'},
                        {'product_scope_status':'UNCLASSIFIED_APPROVED'},
                        {'is_low_trust_2017':True},{'is_historical_backfill_candidate':True},
                        {'quantity':0},{'quantity':-1}):
            with self.subTest(invalid=invalid),self.assertRaises(AssertionError):
                previous=source(**invalid)
                run_guard([previous],[{**previous,'product_scope_status':'MEDICINE_APPROVED'}],{'reviewed':True})

    def test_false_gate_stays_outside_provisional_population_in_both_modes(self):
        previous=source(is_provisional_product_demand_eligible=False,quantity=-1,product_scope_status='CONTRACT_LABEL_CANDIDATE')
        for decisions in (None,{'reviewed':True}):
            with self.subTest(decisions=decisions):run_guard([previous],[previous],decisions)


if __name__=='__main__':unittest.main()
