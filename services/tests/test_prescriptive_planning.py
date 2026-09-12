import itertools
import unittest
from unittest.mock import patch
from datetime import date
from services.analytics_service.prescriptive_planning import build_shortlist, solve_plan
from services.analytics_service.app import app


def planning_fixture():
    shortlist={'source':{'checksum':'fixture','file':'controlled fixture','excluded':{}},'scope':{'sector':'Unknown','territory':'Quezon'},
               'products':[{'product':p,'revenue':100,'quantity':100,'observed_months':12,'revenue_share_pct':40} for p in ('A','B')],
               'territories':['Quezon'],'period_start':'2025-01','period_end':'2025-12','months_stale':8,'eligible_products':10,'excluded_nonpositive_products':0,'shortlist_share_pct':80}
    body={'scope':shortlist['scope'],'checksum':'fixture','acknowledged':True,'horizon':3,'budget':100,'minimum_pct':0,
          'items':[dict(product='A',demand=10,stock=0,reserve=0,pack=3,pack_cost=20,max_packs=4),dict(product='B',demand=20,stock=5,reserve=2,pack=5,pack_cost=30,max_packs=4)]}
    return shortlist,body


class PlanningTests(unittest.TestCase):
    def test_integer_solution_matches_exhaustive_service_then_cost_optimum(self):
        shortlist,body=planning_fixture()
        result=solve_plan(body,shortlist)
        options=[]
        for a,b in itertools.product(range(5),repeat=2):
            spend=a*20+b*30
            if spend<=100:options.append((min(10,a*3)/10+min(20,3+b*5)/20,-spend))
        expected=max(options)
        self.assertEqual(result['status'],'optimal_scenario')
        self.assertAlmostEqual(result['mean_fulfillment_pct']/50,expected[0])
        self.assertEqual(result['spent'],-expected[1])
        for row in result['rows']:
            self.assertGreaterEqual(row['ending_stock'],row['reserve'])
            self.assertEqual(row['purchase_units'],row['purchase_packs']*row['pack'])

    def test_minimum_service_infeasible_budget_and_supplier_caps(self):
        shortlist,body=planning_fixture();body['minimum_pct']=100
        self.assertEqual(solve_plan(body,shortlist)['status'],'infeasible')
        body['budget']=1000;body['items'][0]['max_packs']=0
        self.assertIn('supplier limit',solve_plan(body,shortlist)['conflicts'][0])

    def test_surplus_stock_avoids_unnecessary_purchases(self):
        shortlist,body=planning_fixture();body['budget']=0
        for r in body['items']:r['stock']=100
        result=solve_plan(body,shortlist)
        self.assertEqual(result['mean_fulfillment_pct'],100)
        self.assertEqual(result['spent'],0)

    def test_missing_invalid_and_stale_inputs_fail(self):
        for field,value in [('demand',''),('pack',1.5),('stock',-1),('pack_cost',float('nan')),('pack_cost',1.001)]:
            shortlist,body=planning_fixture();body['items'][0][field]=value
            with self.assertRaises(ValueError):solve_plan(body,shortlist)
        shortlist,body=planning_fixture();body['checksum']='stale'
        with self.assertRaises(ValueError):solve_plan(body,shortlist)

    def test_shortlist_top_twenty_percent_capped_five_is_not_eighty_percent_claim(self):
        payload={'source':{'checksum':'x'},'rows':[dict(product=str(i),period='2025-12',sector='Unknown',territory='Quezon',revenue=100-i,quantity=10) for i in range(30)]}
        payload['rows'].append(dict(product='old',period='2023-01',sector='Unknown',territory='Quezon',revenue=1e6,quantity=1))
        d=build_shortlist(payload,today=date(2026,9,12))
        self.assertEqual(len(d['products']),5)
        self.assertEqual(d['eligible_products'],30)
        self.assertLess(d['shortlist_share_pct'],80)
        self.assertEqual(build_shortlist(payload,sector='Private')['products'],[])

    def test_endpoint_solves_reviewed_inputs_and_rejects_stale_or_missing_values(self):
        shortlist,body=planning_fixture()
        with patch('services.analytics_service.app.load_shortlist',return_value=shortlist):
            result=app.test_client().post('/sales/planning-solve',json=body)
            self.assertEqual(result.status_code,200)
            self.assertEqual(result.get_json()['status'],'optimal_scenario')
            body['items'][0]['stock']=''
            result=app.test_client().post('/sales/planning-solve',json=body)
            self.assertEqual(result.status_code,422)
            self.assertIn('required',result.get_json()['error'])

    def test_zero_budget_keeps_protected_stock_and_reports_unmet(self):
        shortlist,body=planning_fixture();body['budget']=0
        result=solve_plan(body,shortlist)
        self.assertEqual(result['spent'],0)
        self.assertEqual(result['rows'][1]['fulfilled'],3)
        self.assertEqual(result['rows'][1]['ending_stock'],2)
        self.assertEqual(result['rows'][0]['unmet'],10)


if __name__=='__main__':unittest.main()
