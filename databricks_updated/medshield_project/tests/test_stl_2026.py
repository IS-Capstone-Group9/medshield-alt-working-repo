"""Exercise the actual new notebook's pure helpers without executing Spark cells."""
import ast
from copy import deepcopy
import hashlib
import json
import math
from pathlib import Path
import re
import unittest

try:
    import numpy as np
    import statsmodels
    from statsmodels.tsa.seasonal import STL
except ImportError:
    np = statsmodels = STL = None

PROJECT = Path(__file__).resolve().parents[1]
ROOT = PROJECT.parents[1]


@unittest.skipIf(STL is None, 'Use the existing .venv-predictive environment for numerical STL checks')
class IsolatedStlTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        path = PROJECT / '06_sales_stl_2026.py'
        tree = ast.parse(path.read_text(encoding='utf-8'))
        constants = {'SOURCE_POLICY','POPULATION_VERSION','NON_PRODUCT_LABEL','OBSERVED_FACT','IDENTITY_FIELDS'}
        nodes = [n for n in tree.body if isinstance(n, ast.FunctionDef)
                 or isinstance(n, ast.Assign) and any(isinstance(t, ast.Name) and t.id in constants for t in n.targets)]
        cls.api = {'np':np,'statsmodels':statsmodels,'STL':STL,'math':math,'re':re,'hashlib':hashlib,'json':json}
        exec(compile(ast.Module(body=nodes,type_ignores=[]),str(path),'exec'),cls.api)

    def identity(self):
        return dict(dataset_id='a'*64,policy_version=self.api['SOURCE_POLICY'],area_mapping_sha256='b'*64,
                    product_master_sha256='c'*64,transaction_evidence_sha256='d'*64,catalog_helper_sha256='e'*64)

    def source(self, start=2020, years=4):
        return [{'period':f'{y}-{m:02d}','revenue':100+2*((y-start)*12+m-1)+10*math.sin((m-1)*2*math.pi/12)}
                for y in range(start,start+years) for m in range(1,13)]

    def test_known_season_trend_and_reconstruction(self):
        result=self.api['decompose'](self.source())
        self.assertEqual(result['period'],12)
        self.assertEqual(result['missing_policy'],'no_imputation_split_at_gaps')
        self.assertEqual(len(result['segments']),1)
        segment=result['segments'][0]
        self.assertEqual(segment['months'],48)
        self.assertLess(segment['max_reconstruction_error'],1e-6)
        for i,row in enumerate(segment['components']):
            self.assertAlmostEqual(row['trend'],100+2*i,places=5)
            self.assertAlmostEqual(row['seasonal'],10*math.sin((i%12)*2*math.pi/12),places=5)

    def test_gap_is_not_imputed_and_short_segments_remain_unavailable(self):
        rows=self.source(years=7)
        missing=next(r for r in rows if r['period']=='2023-01')
        missing['revenue']=None
        result=self.api['decompose'](rows)
        self.assertEqual([(s['start'],s['end'],s['months']) for s in result['segments']],
                         [('2020-01','2022-12',36),('2023-02','2026-12',47)])
        self.assertIn('2023-01',result['unavailable_periods'])
        self.assertFalse(any(c['period']=='2023-01' for s in result['segments'] for c in s['components']))
        self.assertEqual(self.api['decompose'](self.source(years=2))['status'],'insufficient_contiguous_history')

    def test_invalid_or_duplicate_months_and_nonfinite_values_fail(self):
        for bad in ['2020-13','2020-00','2020-1','2020-01-01']:
            with self.subTest(bad=bad),self.assertRaises(ValueError):self.api['month_index'](bad)
        for bad in [float('nan'),float('inf'),True]:
            with self.subTest(bad=bad),self.assertRaises(ValueError):self.api['decompose']([{'period':'2020-01','revenue':bad}])
        with self.assertRaisesRegex(ValueError,'Duplicate'):self.api['decompose'](self.source()+[self.source()[0]])

    def test_payload_is_same_input_bound_and_keeps_candidate_status(self):
        source='workspace.medshield_gold_source_20261022.sales_restart_fact_candidate'
        payload=self.api['build_stl_records'](self.source(),self.identity(),0,source)
        self.assertEqual(payload['output_table'],'workspace.medshield_gold_source_20261022.sales_restart_stl_candidate')
        self.assertEqual(hashlib.sha256(payload['input_material_json'].encode()).hexdigest(),payload['input_sha256'])
        material=json.loads(payload['input_material_json'])
        self.assertEqual(material['rows'],payload['input_rows'])
        self.assertEqual(material['parameters'],payload['parameters'])
        self.assertEqual({r['publication_status'] for r in payload['records']},{'CANDIDATE_PENDING_BUSINESS_REVIEW'})
        self.assertEqual({r['input_sha256'] for r in payload['records']},{payload['input_sha256']})
        changed=self.source();changed[0]['revenue']+=1
        self.assertNotEqual(payload['input_sha256'],self.api['build_stl_records'](changed,self.identity(),0,source)['input_sha256'])
        for version in [True,0.0,1,'0']:
            with self.subTest(version=version),self.assertRaises(ValueError):self.api['build_stl_records'](self.source(),self.identity(),version,source)

    def test_source_descriptor_rejects_other_dataset_references_and_output(self):
        identity=self.identity()
        target='workspace.medshield_gold_source_20261022.sales_restart_stl_candidate'
        contract=dict(schema_version=1,mode='isolated_source_rebuild_candidate',batch='source_20261022',
                      dataset_id=identity['dataset_id'],target_schemas={'gold':'workspace.medshield_gold_source_20261022'},
                      reference_hashes={k:v for k,v in identity.items() if k.endswith('sha256')})
        expected='workspace.medshield_gold_source_20261022.sales_restart_fact_candidate'
        self.assertEqual(self.api['validate_stl_source'](contract,identity,0,target),expected)
        for bad in [{**identity,'dataset_id':'f'*64},{**identity,'area_mapping_sha256':'f'*64},
                    {**identity,'policy_version':'sales_restart_gold_v7_independent_catalog'}]:
            with self.subTest(bad=bad),self.assertRaises(ValueError):self.api['validate_stl_source'](contract,bad,0,target)
        with self.assertRaises(ValueError):self.api['validate_stl_source'](contract,identity,0,'workspace.medshield_gold.sales_restart_stl_candidate')

    def test_notebook_and_gateway_share_exact_reporting_predicate(self):
        dashboard=(ROOT/'backend/src/databricksDashboard.ts').read_text(encoding='utf-8')
        label=re.search(r'const NON_PRODUCT_LABEL = `([^`]+)`',dashboard).group(1)
        self.assertEqual(self.api['OBSERVED_FACT'],'is_analysis_candidate = TRUE AND NOT '+label)


if __name__=='__main__':
    unittest.main()
