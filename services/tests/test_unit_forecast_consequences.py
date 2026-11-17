import json,unittest
from pathlib import Path
from decimal import Decimal
from services.analytics_service.jobs.report_unit_forecast_consequences import report

ROOT=Path(__file__).resolve().parents[2]


class ConsequenceTests(unittest.TestCase):
    def test_formula_and_constant_reference_basis(self):
        source=ROOT/'outputs/wp11_unit_planning_pilot_20261030/inherited'
        candidate=json.loads((source/'unit-candidate.json').read_bytes())
        protocol=json.loads((source/'baseline-protocol.json').read_bytes())
        pilot=json.loads((ROOT/'outputs/wp11_unit_planning_pilot_20261030/execution/pilot.json').read_bytes())
        result=report(candidate,protocol,pilot)
        self.assertEqual(len(result['rows']),8)
        self.assertIsNone(result['selected_method'])
        for row in result['rows']:
            mae=Decimal(row['mae_ampoules'])
            self.assertEqual(Decimal(row['mae_acquisition_value_php']),mae*Decimal('165.18'))
            daily=(Decimal(461)/12)/Decimal('30.44')
            self.assertEqual(Decimal(row['mae_equivalent_training_mean_demand_days']),mae/daily)
        with self.assertRaises(ValueError):report(candidate,protocol,dict(pilot,dataset_id='other'))


if __name__=='__main__':unittest.main()
