"""Hand state updates, origin isolation, signed accounting and study safety."""
from copy import deepcopy
import json
from pathlib import Path
import tempfile
import unittest

from services.analytics_service.predictive import occurrence_initialization as model
from services.analytics_service.jobs import run_occurrence_initialization as runner
from services.analytics_service.jobs.run_online_ensemble import choose


class OccurrenceInitializationTests(unittest.TestCase):
    def test_hand_occurrence_probability_size_and_interval(self):
        tsb=model.state([0.,100.,0.,200.],model.CONFIGS[0])
        self.assertAlmostEqual(110.,tsb['size'])
        self.assertAlmostEqual(.505,tsb['probability'])
        self.assertAlmostEqual(55.55,tsb['prediction'])
        sba=model.state([0.,100.,0.,200.],model.CONFIGS[2])
        self.assertAlmostEqual(2.,sba['interval'])
        self.assertAlmostEqual(52.25,sba['prediction'])

    def test_explicit_start_all_zero_and_decay(self):
        for config in model.CONFIGS:self.assertEqual(0.,model.state([0.]*20,config)['prediction'])
        self.assertAlmostEqual(81.,model.state([100.,0.,0.],model.CONFIGS[0])['prediction'])
        self.assertAlmostEqual(95.,model.state([100.,0.,0.],model.CONFIGS[2])['prediction'])
        # Financial pre-positive empty sets initialize exposure; no inventory fact is inferred.
        self.assertAlmostEqual(model.state([0.]*10+[100.],model.CONFIGS[0])['prediction'],100./11)

    def test_nonfinite_negative_positive_component_rejected(self):
        for value in (-1.,float('nan'),float('inf'),True):
            with self.assertRaises(ValueError):model.state([value],model.CONFIGS[0])

    def test_future_only_labels_and_mutation_do_not_change_origin(self):
        company={p:100. for p in range(30)};negative={p:-10. for p in company}
        products={'old':{p:110. for p in company}}
        for config in model.CONFIGS:
            expected=model.predict(company,products,negative,23,config)
            changed=deepcopy(products);changed['future']={29:1e9};changed['old'][29]=1e9
            self.assertEqual(expected,model.predict(company,changed,negative,23,config))
            self.assertEqual(['old'],[r['product_key'] for r in expected[1]['products']])

    def test_empty_financial_cells_and_signed_correction(self):
        company={p:0. for p in range(24)};negative={p:-5. for p in company}
        pred,trace=model.predict(company,{'seen':{0:100.}},negative,23,model.CONFIGS[0])
        self.assertAlmostEqual(100.*.9**23-5,pred)
        self.assertEqual(-5.,trace['negative_correction_prediction'])
        company.pop(10)
        with self.assertRaisesRegex(ValueError,'calendar'):model.predict(company,{},negative,23,model.CONFIGS[0])

    def test_currency_scaling(self):
        company={p:100. for p in range(24)};negative={p:-5. for p in company};products={'A':{0:100.,10:200.}}
        for config in model.CONFIGS:
            a,_=model.predict(company,products,negative,23,config)
            b,_=model.predict({p:v*1000 for p,v in company.items()},{'A':{p:v*1000 for p,v in products['A'].items()}},
                {p:v*1000 for p,v in negative.items()},23,config)
            self.assertAlmostEqual(a*1000,b)

    def test_guard_remains_strongest_baseline_and_bias_limited(self):
        rows=[dict(stage='development',model_id=name,failed=0,n=19,mae=100.,wape=70.,normalized_bias=0.)
              for name in ('last_value','seasonal_naive','mean_3','mean_6')]
        candidate=dict(rows[0],model_id=model.CONFIGS[0]['model_id'],mae=80.,wape=56.,normalized_bias=-6.)
        self.assertFalse(choose(rows+[candidate])['candidate_passes_guard'])
        candidate['normalized_bias']=-5.
        self.assertTrue(choose(rows+[candidate])['candidate_passes_guard'])
        candidate['failed']=1
        self.assertFalse(choose(rows+[candidate])['candidate_passes_guard'])

    def test_drift_partial_output_and_source_calendar_fail(self):
        root=Path(__file__).resolve().parents[2]
        source=root/'outputs/wp4_forecast_tournament_20261030/source.json'
        panel=root/'outputs/product_occurrence_20261101/source.json'
        reference=root/'outputs/wp4_new_tournament_20261030/results.json'
        if not panel.exists():self.skipTest('Retained source reconstruction absent')
        s,p,r=[json.loads(f.read_bytes()) for f in (source,panel,reference)]
        broken=deepcopy(p);broken['company_controls'].pop()
        with self.assertRaisesRegex(ValueError,'calendar'):runner.load_panel(s,broken,r,runner.sha(source))
        with tempfile.TemporaryDirectory() as tmp:
            out=Path(tmp)/'study';runner.run(source,panel,reference,out,'register')
            (out/'development.json').write_text('{}',encoding='utf-8')
            with self.assertRaisesRegex(ValueError,'overwrite'):runner.run(source,panel,reference,out,'execute')
            (out/'development.json').unlink()
            reg=json.loads((out/'registration.json').read_bytes());reg['specification']['python']='changed'
            (out/'registration.json').write_text(json.dumps(reg),encoding='utf-8')
            with self.assertRaisesRegex(ValueError,'drift'):runner.run(source,panel,reference,out,'execute')


if __name__=='__main__':unittest.main()
