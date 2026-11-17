import copy,json
from pathlib import Path
import unittest
import tempfile
from services.analytics_service.unit_planning_pilot import prepare_pilot

ROOT=Path(__file__).resolve().parents[2]


class UnitPlanningPilotTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        directory=ROOT/'outputs/wp11_unit_planning_pilot_20261030/inherited'
        cls.source=json.loads((directory/'source.json').read_bytes())
        cls.confirmation=json.loads((directory/'user-confirmation.json').read_bytes())

    def test_training_and_evaluation_are_disjoint_and_units_explicit(self):
        result=prepare_pilot(self.source,self.confirmation)
        self.assertEqual((len(result['training']),len(result['evaluation'])),(12,6))
        self.assertLess(max(result['training']),min(result['evaluation']))
        self.assertEqual(len(result['policies'][2]['order_units']),183)
        self.assertFalse(result['forecast_selected'])
        self.assertFalse(result['operational_approval'])

    def test_later_actual_and_cost_mutation_cannot_change_prior_policy(self):
        before=prepare_pilot(self.source,self.confirmation)
        source=copy.deepcopy(self.source)
        for row in source['queries']['detail']['rows']:
            if row['date']>='2026-07-01' and row['raw_area']=='HOSPITAL':
                if row['recorded_quantity'] is not None:row['recorded_quantity']=str(int(float(row['recorded_quantity']))*10)
                if row['acquisition_cost'] is not None:row['acquisition_cost']='999999'
        after=prepare_pilot(source,self.confirmation)
        self.assertEqual(before['fixed_scenario'],after['fixed_scenario'])
        self.assertEqual(before['policy_origins'][:4],after['policy_origins'][:4])
        self.assertEqual(before['simulation_inputs'],after['simulation_inputs'])

    def test_reject_unknown_grid_and_unit_confirmation(self):
        with self.assertRaises(ValueError):prepare_pilot(self.source,self.confirmation,shelf_days=0)
        with self.assertRaises(AssertionError):prepare_pilot(self.source,dict(self.confirmation,quantity_multiplier=10))

    def test_runner_roundtrip_and_overwrite_rejection(self):
        from services.analytics_service.jobs.run_unit_planning_pilot import run
        with tempfile.TemporaryDirectory() as directory:
            output=Path(directory)/'simulation';sensitivity=Path(directory)/'sensitivity'
            result=run(ROOT/'outputs/wp11_unit_planning_pilot_20261030/inherited',output,sensitivity,runs=1)
            self.assertEqual(len(result['rows']),108)
            self.assertTrue((sensitivity/'T8.1_eoq_rop_scenarios.csv').exists())
            ledger=json.loads((output/'sample-ledgers.json').read_bytes())
            self.assertEqual(len(ledger['rows']),3)
            with self.assertRaises(ValueError):run(ROOT/'outputs/wp11_unit_planning_pilot_20261030/inherited',output,sensitivity,runs=1)


if __name__=='__main__':unittest.main()
