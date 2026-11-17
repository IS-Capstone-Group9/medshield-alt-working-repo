import copy
import json
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from services.analytics_service.jobs.run_milp_frontier_and_hand_checks import validate_case,enumerate_case,solve_models,run,prepare_unit


def case():
    return dict(id='mixed_pack_capacity_hand_case',kind='ordinary',budget_cents=300,capacity_units=3,
        unit_label='synthetic compatible units',minimum_pct=0,items=[
        dict(product='A',demand=4,available=0,pack=2,pack_cost_cents=100,max_packs=2,score=100),
        dict(product='B',demand=3,available=0,pack=1,pack_cost_cents=100,max_packs=3,score=60)])


class MilpFrontierTests(unittest.TestCase):
    def test_capacity_hand_optimum_and_both_model_apis(self):
        c=case();validate_case(c);expected=enumerate_case(c)
        self.assertEqual(expected['packs'],[1,1]);self.assertEqual(expected['objective'],'7/16')
        for result in solve_models(c).values():self.assertEqual(result['packs'],[1,1]);self.assertEqual(result['objective'],'7/16')
        c['minimum_pct']=100
        self.assertEqual(enumerate_case(c)['status'],'infeasible')
        self.assertTrue(all(r['status']=='infeasible' for r in solve_models(c).values()))
    def test_rejects_unsupported_or_unbounded_inputs(self):
        for key,value in [('capacity_units',-1),('unit_label',''),('minimum_pct',True),('budget_cents',True)]:
            c=case();c[key]=value
            with self.subTest(key=key),self.assertRaises(ValueError):validate_case(c)
        c=case();c['items'][0]['max_packs']=100000;c['items'][1]['max_packs']=100000
        with self.assertRaisesRegex(ValueError,'million'):validate_case(c)
    def test_training_only_unit_assumptions_ignore_future_cost_and_quantity_changes(self):
        root=Path(__file__).resolve().parents[2]/'outputs/wp11_unit_planning_pilot_20261030/inherited'
        source=json.loads((root/'source.json').read_bytes());confirmation=json.loads((root/'user-confirmation.json').read_bytes())
        before=prepare_unit(source,confirmation);changed=copy.deepcopy(source)
        for r in changed['queries']['detail']['rows']:
            if r['date']>='2026-04-01':
                if r['acquisition_cost'] is not None:r['acquisition_cost']='900000'
                if r['recorded_quantity'] is not None:r['recorded_quantity']='999'
        after=prepare_unit(changed,confirmation)
        self.assertEqual(before['cases'],after['cases']);self.assertEqual(before['training_monthly_acquisition_basis_php'],after['training_monthly_acquisition_basis_php'])
        self.assertEqual(len(before['cases']),21)
    def test_actual_gateway_job_csv_provenance_and_overwrite_protection(self):
        payload=dict(schema_version='offline_budget_frontier_v1',evidence_kind='synthetic_fixture',dataset_id='synthetic_frontier_fixture',
            policy_version='bounded_capacity_frontier_v1',source_sha256='synthetic_fixture_only',scope='synthetic compatible units',cases=[case()],operational_approval=False)
        with TemporaryDirectory() as folder:
            output=Path(folder)/'run';result=run(payload,output)
            self.assertEqual(result['rows'][0]['weighted_fulfillment_pct'],43.75)
            self.assertTrue((output/'T9.3_budget_frontier_and_shadow_value.csv').exists());self.assertFalse(result['operational_approval'])
            with self.assertRaises(FileExistsError):run(payload,output)


if __name__=='__main__':unittest.main()
