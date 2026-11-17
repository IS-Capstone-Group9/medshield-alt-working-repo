from pathlib import Path
import hashlib
import tempfile
import unittest
from services.analytics_service.jobs.package_abc_research import package

ROOT=Path(__file__).resolve().parents[2]
INHERITED=ROOT/'outputs/wp6_abc_classifier_evaluation_20261030/inherited'
SOURCE=ROOT/'outputs/original_so2_20261027/source.json'

class AbcPackagingTests(unittest.TestCase):
    def test_retained_membership_and_unavailable_probability_contract(self):
        p=package(INHERITED,SOURCE)
        self.assertEqual((len(p['cases']),len(p['members']),len(p['scores'])),(1032,433,40))
        self.assertFalse(p['activation_allowed'])
        self.assertEqual(p['model_fits_this_packaging'],0)
        self.assertEqual(p['source_checks']['product_years']['rows'],8872)
        self.assertEqual(p['selection']['model_id'],'prior_abc')

    def test_changed_source_rejected_without_writing_or_fitting(self):
        with tempfile.TemporaryDirectory() as directory:
            source=Path(directory)/'source.json'
            source.write_bytes(SOURCE.read_bytes()+b' ')
            with self.assertRaises(AssertionError):package(INHERITED,source)
        self.assertEqual(hashlib.sha256(SOURCE.read_bytes()).hexdigest(),'9c48b9da2353d184420f1c5dea0713b7360d09130520e44d87384ef88f531673')

if __name__=='__main__':unittest.main()
