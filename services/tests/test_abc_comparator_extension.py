from pathlib import Path
import json,tempfile,unittest
from services.analytics_service import abc_comparator_extension as extension
from services.analytics_service import abc_evaluation as original
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'outputs/so2_closeout_20261102'
class ComparatorExtensionTests(unittest.TestCase):
 def test_declared_original_recipe_and_selection_preserved(self):
  protocol=original.load_protocol(extension.PROTOCOL,extension.SOURCE)
  self.assertEqual(extension.declaration(protocol),json.loads((OUT/'declaration.json').read_bytes()))
  result=json.loads((OUT/'results.json').read_bytes());self.assertEqual(result['inherited_selection']['model_id'],'prior_abc');self.assertFalse(result['runtime_changed']);self.assertEqual(result['models_trained'],2)
 def test_duplicate_execution_cannot_overwrite(self):
  with self.assertRaises(Exception):extension.execute(OUT)
 def test_changed_declaration_fails_before_fit(self):
  with tempfile.TemporaryDirectory() as directory:
   path=Path(directory);declaration=json.loads((OUT/'declaration.json').read_bytes());declaration['configs'][0]['max_depth']=99;(path/'declaration.json').write_text(json.dumps(declaration))
   with self.assertRaises(Exception):extension.execute(path)
   self.assertFalse((path/'preprocessing.json').exists())
 def test_saved_model_reload_predictions_and_probabilities(self):
  from xgboost import XGBClassifier
  protocol=original.load_protocol(extension.PROTOCOL,extension.SOURCE);pre=json.loads((OUT/'preprocessing.json').read_bytes())['training'];cases=json.loads((OUT/'predictions.json').read_bytes())
  for model_id in original.MODELS[2:]:
   model=XGBClassifier();model.load_model(OUT/(model_id+'_refit.json'))
   for stage in ['retrospective_test_2025','partial_2026_extension']:
    actual=original.predict_cases(original.stage_rows(protocol,stage),model_id,'C',model,pre);expected=[r for r in cases if r['stage']==stage and r['model_id']==model_id]
    self.assertEqual(actual,expected)
if __name__=='__main__':unittest.main()
