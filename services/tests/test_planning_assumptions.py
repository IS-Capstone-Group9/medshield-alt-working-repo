import copy
import json
from pathlib import Path
import tempfile
import unittest
from services.analytics_service.planning_assumptions import load_register


class AssumptionTests(unittest.TestCase):
    def test_exact_plan_values_and_no_runtime_defaults(self):
        register = load_register()
        self.assertEqual(len(register['parameters']), 9)
        a1 = register['parameters'][0]
        self.assertEqual(a1['base_values'], [.25])
        self.assertEqual(a1['sensitivity_values'], [.15,.2,.25,.3,.35])
        self.assertFalse(register['runtime_defaults_enabled'])

    def test_provenance_and_approval_mutations_fail_closed(self):
        original = load_register()
        for mutate in [lambda r:r.update(runtime_defaults_enabled=True),
                       lambda r:r['derivations'].append(r['derivations'][0]),
                       lambda r:r['derivations'][0].update(evidence_label='Observed'),
                       lambda r:r.update(operational_use_approved=True),
                       lambda r:r['parameters'][0].update(base_values=[True])]:
            register = copy.deepcopy(original)
            mutate(register)
            with tempfile.TemporaryDirectory() as directory:
                path = Path(directory)/'register.json'
                path.write_text(json.dumps(register), encoding='utf-8')
                with self.assertRaises(ValueError):
                    load_register(path)


if __name__ == '__main__':
    unittest.main()
