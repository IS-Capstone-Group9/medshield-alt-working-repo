"""Financial conservation, issue-time isolation and guarded research decisions."""
from copy import deepcopy
import json
from pathlib import Path
import tempfile
import unittest

from services.analytics_service.predictive import category_alternatives as model
from services.analytics_service.predictive.contracts import month, period
from services.analytics_service.jobs import run_category_alternatives as runner


class CategoryAlternativeTests(unittest.TestCase):
    def test_hand_medians_signed_residual_and_linear_control(self):
        company={p:100. for p in range(36)}
        a={p:10. for p in range(36)}
        a[35]=70.
        # Residual B is 90 except the last observed month, where it is 30.
        value,trace=model.predict(company,{'A':a},35,'category_median_6')
        self.assertEqual(100.,value)
        self.assertEqual([10.,90.],[r['prediction'] for r in trace['groups']])
        for recipe in (*model.RECIPES,model.CONTROL):
            pred,_=model.predict({p:-v for p,v in company.items()},{'A':{p:-v for p,v in a.items()}},35,recipe)
            if recipe!= 'category_adaptive_12':self.assertEqual(-100.,pred)
        control,_=model.predict(company,{'A':a},35,model.CONTROL)
        self.assertAlmostEqual(100.,control)

    def test_future_mutation_does_not_change_forecast_or_groups(self):
        company={p:float(p+10) for p in range(40)}
        categories={'A':{p:float(p) for p in range(40)}}
        for recipe in (*model.RECIPES,model.CONTROL):
            expected=model.predict(company,categories,35,recipe)
            mutated=deepcopy(categories)
            mutated['future-only']={39:1e20}
            mutated['A'][39]=-1e20
            company2=dict(company);company2[39]=1e20
            self.assertEqual(expected,model.predict(company2,mutated,35,recipe))

    def test_missing_category_stays_residual_missing_company_rejects(self):
        company={p:100. for p in range(36)}
        categories={'sparse':{p:20. for p in range(36) if p!=20}}
        pred,trace=model.predict(company,categories,35,'category_median_6')
        self.assertEqual(100.,pred)
        self.assertEqual([],trace['admitted_categories'])
        company.pop(20)
        with self.assertRaisesRegex(ValueError,'contiguous'):
            model.predict(company,categories,35,'category_median_6')

    def test_adaptive_constant_forecasts_and_inner_cutoff(self):
        company={p:100. for p in range(36)}
        value,trace=model.predict(company,{'A':{p:20. for p in company}},35,'category_adaptive_12')
        self.assertEqual(100.,value)
        for group in trace['groups']:
            self.assertEqual('last_value',group['selected_model'])
            self.assertEqual(12,len(group['inner']))
            self.assertTrue(all(r['origin']+1==r['target']<=35 for r in group['inner']))

    def test_scale_equivariance_and_no_clipping(self):
        company={p:float(100+p%7*13) for p in range(36)}
        categories={'A':{p:float(-20-p%3) for p in company}}
        for recipe in (*model.RECIPES,model.CONTROL):
            value,_=model.predict(company,categories,35,recipe)
            scaled,_=model.predict({p:v*1000 for p,v in company.items()},
                {'A':{p:v*1000 for p,v in categories['A'].items()}},35,recipe)
            self.assertAlmostEqual(value*1000,scaled)

    def test_decimal_conservation_duplicate_and_unavailable_category(self):
        p=month('2020-01')
        source=dict(source_identity={'dataset_id':'fixture'},monthly=[dict(month=period(p),source_records=2,
            net_eligible_records=1,net_sales_php='0.10')])
        capture=dict(source_identity=source['source_identity'],contracts_excluded=True,rows=[
            dict(month=period(p),product_category='A',records=1,eligible_records=1,net_sales_php='0.10'),
            dict(month=period(p),product_category='B',records=1,eligible_records=0,net_sales_php=None)])
        company,categories=model.reconcile(capture,source)
        self.assertEqual({p:.1},company)
        self.assertNotIn('B',categories)
        changed=deepcopy(capture);changed['rows'].append(changed['rows'][0])
        with self.assertRaisesRegex(ValueError,'Duplicate'):model.reconcile(changed,source)
        changed=deepcopy(capture);changed['rows'][0]['net_sales_php']='0.11'
        with self.assertRaisesRegex(ValueError,'conservation'):model.reconcile(changed,source)
        changed=deepcopy(capture);changed['rows'][1]['net_sales_php']='0'
        with self.assertRaisesRegex(ValueError,'Unavailable'):model.reconcile(changed,source)

    def test_selection_rejects_bias_missing_cohort_and_audit(self):
        rows=[dict(stage='development',model_id=name,failed=0,n=19,expected_n=19,
            mae=100.,normalized_bias=0.,wape=70.) for name in model.BASELINES]
        challenger=dict(rows[0],model_id=model.RECIPES[0],mae=90.,normalized_bias=6.,wape=63.)
        self.assertFalse(model.choose(rows+[challenger])['candidate_passes_guard'])
        challenger['normalized_bias']=5.
        self.assertTrue(model.choose(rows+[challenger])['candidate_passes_guard'])
        self.assertFalse(model.choose(rows+[challenger])['below10_with_guard'])
        challenger['failed']=1
        self.assertFalse(model.choose(rows+[challenger])['candidate_passes_guard'])
        challenger['failed']=0;challenger['n']=18
        self.assertFalse(model.choose(rows+[challenger])['candidate_passes_guard'])
        with self.assertRaisesRegex(ValueError,'development'):
            model.choose([dict(r,stage='retrospective_audit') for r in rows])

    def test_scenarios_are_assumptions_not_intervals_or_orders(self):
        scenario=model.scenarios(100.)
        self.assertEqual([75.,100.,125.],[scenario[k] for k in ['low_php','base_php','high_php']])
        negative=model.scenarios(-100.)
        self.assertEqual([-125.,-100.,-75.],[negative[k] for k in ['low_php','base_php','high_php']])
        self.assertIsNone(scenario['probability_coverage'])
        self.assertFalse(scenario['procurement_execution_approved'])
        with self.assertRaises(ValueError):model.scenarios(float('nan'))

    def test_registration_drift_and_executed_study_refuse_overwrite(self):
        root=Path(__file__).resolve().parents[2]
        source=root/'outputs/wp4_forecast_tournament_20261030/source.json'
        categories=root/'outputs/forecast_alternatives_20261101/source/categories-offline.json'
        reference=root/'outputs/wp4_new_tournament_20261030/results.json'
        if not categories.exists():self.skipTest('Source reconstruction not present')
        with tempfile.TemporaryDirectory() as tmp:
            out=Path(tmp)/'study'
            runner.run(source,categories,reference,out,'register')
            (out/'development.json').write_text('{}',encoding='utf-8')
            with self.assertRaisesRegex(ValueError,'overwrite'):
                runner.run(source,categories,reference,out,'execute')
            (out/'development.json').unlink()
            path=out/'registration.json';reg=json.loads(path.read_bytes())
            reg['specification']['python']='changed';path.write_text(json.dumps(reg),encoding='utf-8')
            with self.assertRaisesRegex(ValueError,'drift'):
                runner.run(source,categories,reference,out,'execute')


if __name__=='__main__':
    unittest.main()
