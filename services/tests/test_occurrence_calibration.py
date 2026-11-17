"""Hand calibrations and strict completed-error availability controls."""
from copy import deepcopy
import json
from pathlib import Path
import tempfile
import unittest

from services.analytics_service.predictive import occurrence_calibration as model
from services.analytics_service.jobs import run_occurrence_calibration as runner


class OccurrenceCalibrationTests(unittest.TestCase):
    def fixture(self):
        company={p:100. for p in range(30)}
        cache=[dict(origin=p,target=p+1,actual=100.,prediction=80.) for p in range(12,29)]
        return company,cache

    def test_hand_mean_median_and_ratio(self):
        company,cache=self.fixture()
        for config in model.CONFIGS:
            prediction,trace=model.predict(company,cache,24,config)
            self.assertAlmostEqual(100.,prediction)
            self.assertEqual(24,trace['max_completed_target'])
            self.assertEqual(12,len(trace['inner']))

    def test_current_and_future_actuals_cannot_change_correction(self):
        company,cache=self.fixture()
        changed=deepcopy(cache)
        for row in changed:
            if row['target']>24:row['actual']=1e20
            if row['origin']>24:row['prediction']=-1e20
        for config in model.CONFIGS:self.assertEqual(model.predict(company,cache,24,config),model.predict(company,changed,24,config))

    def test_additive_cap_and_ratio_bounds(self):
        company,cache=self.fixture()
        for row in cache:row['prediction']=1.
        for config in model.CONFIGS[:2]:
            value,trace=model.predict(company,cache,24,config)
            self.assertEqual(51.,value);self.assertEqual(50.,trace['correction'])
        value,trace=model.predict(company,cache,24,model.CONFIGS[2])
        self.assertEqual(2.,value);self.assertEqual(2.,trace['factor'])

    def test_missing_duplicate_or_uncompleted_history_rejects(self):
        company,cache=self.fixture()
        for broken in [[r for r in cache if r['target']!=20],cache+[cache[2]]]:
            with self.assertRaisesRegex(ValueError,'completed'):model.predict(company,broken,24,model.CONFIGS[0])
        company.pop(20)
        with self.assertRaisesRegex(ValueError,'months'):model.predict(company,cache,24,model.CONFIGS[0])

    def test_signed_targets_no_clipping_and_currency_scaling(self):
        company,cache=self.fixture()
        for config in model.CONFIGS:
            a,_=model.predict(company,cache,24,config)
            scaled=[dict(r,actual=r['actual']*1000,prediction=r['prediction']*1000) for r in cache]
            b,_=model.predict({p:v*1000 for p,v in company.items()},scaled,24,config)
            self.assertAlmostEqual(a*1000,b)
        negative_company={p:-100. for p in company}
        signed=[dict(r,actual=-100.,prediction=-80.) for r in cache]
        self.assertEqual(-100.,model.predict(negative_company,signed,24,model.CONFIGS[0])[0])
        with self.assertRaisesRegex(ValueError,'denominator'):model.predict(negative_company,signed,24,model.CONFIGS[2])

    def test_nonfinite_and_actual_source_mismatch(self):
        company,cache=self.fixture();broken=deepcopy(cache);broken[2]['prediction']=float('nan')
        with self.assertRaisesRegex(ValueError,'Nonfinite'):model.predict(company,broken,24,model.CONFIGS[0])
        broken=deepcopy(cache);broken[2]['actual']=99.
        with self.assertRaisesRegex(ValueError,'mismatch'):model.predict(company,broken,24,model.CONFIGS[0])

    def test_drift_and_partial_cache_refuse_overwrite(self):
        root=Path(__file__).resolve().parents[2]
        source=root/'outputs/wp4_forecast_tournament_20261030/source.json';panel=root/'outputs/product_occurrence_20261101/source.json'
        reference=root/'outputs/wp4_new_tournament_20261030/results.json'
        if not panel.exists():self.skipTest('Retained panel absent')
        with tempfile.TemporaryDirectory() as tmp:
            out=Path(tmp)/'study';runner.run(source,panel,reference,out,'register')
            (out/'cache.json').write_text('[]',encoding='utf-8')
            with self.assertRaisesRegex(ValueError,'overwrite'):runner.run(source,panel,reference,out,'execute')
            (out/'cache.json').unlink();p=out/'registration.json';reg=json.loads(p.read_bytes());reg['specification']['python']='changed'
            p.write_text(json.dumps(reg),encoding='utf-8')
            with self.assertRaisesRegex(ValueError,'drift'):runner.run(source,panel,reference,out,'execute')


if __name__=='__main__':unittest.main()
