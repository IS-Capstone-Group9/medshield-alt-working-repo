"""Registered rate-follow-up: known arithmetic and issue-time isolation."""
from copy import deepcopy
import json
from pathlib import Path
import tempfile
import unittest

from services.analytics_service.predictive import occurrence_rates as model
from services.analytics_service.jobs import run_occurrence_rates as runner
from services.analytics_service.jobs.run_online_ensemble import choose


class OccurrenceRateTests(unittest.TestCase):
    def test_four_hand_state_updates_and_financial_exposure(self):
        for config,expected in zip(model.CONFIGS,(65.65,75.75,67.6,78.)):
            state=model.state([0.,100.,0.,200.],config)
            self.assertAlmostEqual(expected,state['prediction'])
            self.assertAlmostEqual(10.,model.state([0.]*9+[100.],config)['prediction'])

    def test_zero_histories_rate_specific_decay_and_invalid_values(self):
        for config in model.CONFIGS:
            self.assertEqual(0.,model.state([0.]*24,config)['prediction'])
            self.assertAlmostEqual(100*(1-config['beta'])**2,model.state([100.,0.,0.],config)['prediction'])
            for bad in (-1.,True,float('inf'),float('nan')):
                with self.assertRaises(ValueError):model.state([bad],config)

    def test_origin_isolation_and_unknown_future_vocabulary(self):
        company={p:100. for p in range(30)};negative={p:-10. for p in company};products={'A':{2:100.,20:200.}}
        for config in model.CONFIGS:
            expected=model.predict(company,products,negative,23,config)
            future=deepcopy(products);future['A'][29]=1e9;future['future']={29:1e10}
            self.assertEqual(expected,model.predict(company,future,negative,23,config))

    def test_signed_correction_and_empty_financial_cells(self):
        company={p:100. for p in range(24)};negative={p:-7. for p in company}
        for config in model.CONFIGS:
            pred,trace=model.predict(company,{'A':{23:240.}},negative,23,config)
            self.assertAlmostEqual(3.,pred)
            self.assertEqual(-7.,trace['negative_correction_prediction'])
        company.pop(10)
        with self.assertRaisesRegex(ValueError,'calendar'):model.predict(company,{},negative,23,model.CONFIGS[0])

    def test_currency_scaling(self):
        company={p:100. for p in range(24)};negative={p:-2. for p in company};products={'A':{0:100.,15:200.}}
        for config in model.CONFIGS:
            a,_=model.predict(company,products,negative,23,config)
            b,_=model.predict({p:v*100 for p,v in company.items()},{'A':{p:v*100 for p,v in products['A'].items()}},
                {p:v*100 for p,v in negative.items()},23,config)
            self.assertAlmostEqual(a*100,b)

    def test_five_percent_guard_does_not_accept_near_miss_or_excess_bias(self):
        rows=[dict(stage='development',model_id=name,failed=0,n=19,mae=100.,wape=70.,normalized_bias=0.)
            for name in ('last_value','seasonal_naive','mean_3','mean_6')]
        candidate=dict(rows[0],model_id=model.CONFIGS[0]['model_id'],mae=95.01,wape=66.5)
        self.assertFalse(choose(rows+[candidate])['candidate_passes_guard'])
        candidate['mae']=95.
        self.assertTrue(choose(rows+[candidate])['candidate_passes_guard'])
        candidate['normalized_bias']=5.01
        self.assertFalse(choose(rows+[candidate])['candidate_passes_guard'])
        with self.assertRaisesRegex(ValueError,'Development'):
            choose([dict(r,stage='retrospective_audit') for r in rows])

    def test_registration_drift_and_partial_output_refuse_execution(self):
        root=Path(__file__).resolve().parents[2]
        source=root/'outputs/wp4_forecast_tournament_20261030/source.json'
        panel=root/'outputs/product_occurrence_20261101/source.json'
        reference=root/'outputs/wp4_new_tournament_20261030/results.json'
        if not panel.exists():self.skipTest('Source reconstruction absent')
        with tempfile.TemporaryDirectory() as tmp:
            out=Path(tmp)/'study';runner.run(source,panel,reference,out,'register')
            (out/'development.json').write_text('{}',encoding='utf-8')
            with self.assertRaisesRegex(ValueError,'overwrite'):runner.run(source,panel,reference,out,'execute')
            (out/'development.json').unlink()
            p=out/'registration.json';reg=json.loads(p.read_bytes());reg['specification']['python']='changed'
            p.write_text(json.dumps(reg),encoding='utf-8')
            with self.assertRaisesRegex(ValueError,'drift'):runner.run(source,panel,reference,out,'execute')


if __name__=='__main__':unittest.main()
